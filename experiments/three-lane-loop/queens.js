"use strict";
// 8-Queens, the Stable way — v3, the honest instrument.
//
// HISTORY, kept on purpose (the two-bug story IS the result):
//   v1 reported a 99.9% improvement for the "negative space" strategy. Broken: the safety
//      check assumed rows fill top-to-bottom, and the out-of-order search silently skipped
//      conflicts. Caught by a sanity check — 8 node-visits cannot enumerate 92 solutions.
//   v2 reported 91%. Also broken, more quietly: it counted the naive strategy's FAILED
//      attempts but only the artistic strategy's pre-filtered successes — apples vs oranges.
//      Survived the sanity check because it wasn't absurd, and was caught only by an
//      INDEPENDENT recount with its own code. One instrument lies plausibly; a second,
//      independent witness catches it. That lesson is the entire project this comes from.
//   v3 counts the SAME events for every strategy, pins every published number as a
//      self-check, and prints FAIL if any of them drifts. No randomness, no clock.
//
// What is measured: four readings of Shoshana Cox's rule "when you maximize negative
// space, you minimize surprise" (How To Put 8 Queens On A Chessboard, disesdi.substack.com):
//   naive  — fixed row order, columns left to right (the unguided baseline; still backtracks)
//   MRV    — commit the row with the FEWEST safe squares first (act where the void is densest)
//   LCV    — fixed row order, try the column that kills the FEWEST squares first
//            (preserve the most freedom for everyone else)
//   greedy — her rule taken literally: always take the safe square with the most void
//            around it, never undo. (Verified below: it stalls at 5 queens —
//            taste can order a search; only retraction can finish one.)

const N = 8;
let PRIMITIVE = 0;   // same-metric cost: every queen-vs-queen conflict test, all strategies

function conflicts(qs, r, c){
  for (const [qr, qc] of qs){
    PRIMITIVE++;
    if (qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c)) return true;
  }
  return false;
}

// --- strategy: naive backtracking (fixed row order, columns L->R) ------------------------
function solveNaive(stopAtFirst){
  let committed = 0, solutions = 0, first = null;
  const qs = [];
  let stop = false;
  (function place(r){
    if (stop) return;
    if (r === N){ solutions++; if (!first) first = qs.map(q => q[1]); if (stopAtFirst) stop = true; return; }
    for (let c = 0; c < N; c++){
      if (stop) return;
      if (!conflicts(qs, r, c)){
        committed++;                      // SAME event counted in every strategy
        qs.push([r, c]); place(r + 1); if (!stop) qs.pop();
      }
    }
  })(0);
  return { committed, solutions, first };
}

// --- strategy: MRV ("act where the void is densest": most-constrained row first) ---------
function solveMRV(stopAtFirst){
  let committed = 0, solutions = 0;
  const qs = [];
  const rowUsed = new Array(N).fill(false);
  let stop = false;
  function safeCols(r){
    const out = [];
    for (let c = 0; c < N; c++) if (!conflicts(qs, r, c)) out.push(c);
    return out;
  }
  (function step(depth){
    if (stop) return;
    if (depth === N){ solutions++; if (stopAtFirst) stop = true; return; }
    let bestRow = -1, bestOpts = null;
    for (let r = 0; r < N; r++){
      if (rowUsed[r]) continue;
      const opts = safeCols(r);
      if (bestRow === -1 || opts.length < bestOpts.length){ bestRow = r; bestOpts = opts; }
    }
    if (bestOpts.length === 0) return;
    for (const c of bestOpts){
      if (stop) return;
      committed++;
      qs.push([bestRow, c]); rowUsed[bestRow] = true;
      step(depth + 1);
      if (!stop){ qs.pop(); rowUsed[bestRow] = false; }
    }
  })(0);
  return { committed, solutions };
}

// --- strategy: LCV (fixed rows; columns ordered by FEWEST newly-killed squares) ----------
function deadCount(qs){
  let d = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
    if (qs.some(([qr, qc]) => qr === r && qc === c)) { d++; continue; }
    if (qs.some(([qr, qc]) => { PRIMITIVE++; return qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c); })) d++;
  }
  return d;
}
function solveLCV(){
  let committed = 0, first = null;
  const qs = [];
  (function place(r){
    if (first) return;
    if (r === N){ first = qs.map(q => q[1]); return; }
    const safe = [];
    for (let c = 0; c < N; c++) if (!conflicts(qs, r, c)) safe.push(c);
    const ordered = safe
      .map(c => { qs.push([r, c]); const d = deadCount(qs); qs.pop(); return { c, d }; })
      .sort((a, b) => a.d - b.d || a.c - b.c);
    for (const o of ordered){
      if (first) return;
      committed++;
      qs.push([r, o.c]); place(r + 1); if (!first) qs.pop();
    }
  })(0);
  return { committed, first };
}

// --- strategy: her rule, literal — greedy max-local-void, NO backtracking ----------------
function greedyLiteral(){
  const qs = [];
  for (let k = 0; k < N; k++){
    let best = null;
    for (let r = 0; r < N; r++){
      if (qs.some(([qr]) => qr === r)) continue;
      for (let c = 0; c < N; c++){
        if (conflicts(qs, r, c)) continue;
        let voidN = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++){
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= N || cc < 0 || cc >= N){ voidN++; continue; }
          if (qs.some(([qr, qc]) => qr === rr && qc === cc) || conflicts(qs, rr, cc)) voidN++;
        }
        if (!best || voidN > best.voidN) best = { r, c, voidN };
      }
    }
    if (!best) return { placed: qs.length, finished: false };
    qs.push([best.r, best.c]);
  }
  return { placed: qs.length, finished: true };
}

// --- ground truth + symmetry: D4 ACTS on the solution set --------------------------------
function allSolutions(){
  const sols = [], qs = [];
  (function place(r){
    if (r === N){ sols.push(qs.map(q => q[1])); return; }
    for (let c = 0; c < N; c++) if (!conflicts(qs, r, c)){ qs.push([r, c]); place(r + 1); qs.pop(); }
  })(0);
  return sols;
}
const rot90 = s => { const t = new Array(N); for (let r = 0; r < N; r++) t[s[r]] = N - 1 - r; return t; };
const reflect = s => s.map(c => N - 1 - c);
const key = s => s.join(",");
function orbits(sols){
  const seen = new Set(), out = [];
  for (const s of sols){
    if (seen.has(key(s))) continue;
    const orbit = new Set();
    let cur = s;
    for (let i = 0; i < 4; i++){ orbit.add(key(cur)); orbit.add(key(reflect(cur))); cur = rot90(cur); }
    orbit.forEach(k => seen.add(k));
    out.push({ rep: s, size: orbit.size });
  }
  return out;
}
function legal(s){
  for (let r = 0; r < N; r++) for (let q = r + 1; q < N; q++){
    if (s[r] === s[q] || Math.abs(s[r] - s[q]) === Math.abs(r - q)) return false;
  }
  return true;
}
const render = s => s.map(cq => [...Array(N)].map((_, c) => c === cq ? " Q" : " .").join("")).join("\n");

// --- run everything, then hold every published number against its pinned witness ---------
let checks = 0, passes = 0; const fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

const sols = allSolutions();
const orbs = orbits(sols);

PRIMITIVE = 0; const naiveFull = solveNaive(false); const naiveFullChecks = PRIMITIVE;
PRIMITIVE = 0; const mrvFull   = solveMRV(false);   const mrvFullChecks   = PRIMITIVE;
PRIMITIVE = 0; const naive1    = solveNaive(true);
PRIMITIVE = 0; const mrv1      = solveMRV(true);
PRIMITIVE = 0; const lcv       = solveLCV();
const greedy = greedyLiteral();

console.log("=== 8-Queens by structure — v3, same-metric, self-witnessing ===");
console.log("");
console.log("solutions: " + sols.length + "   fundamental orbits under the board's symmetry group (D4): " + orbs.length);
console.log("  The symmetry group ACTS on the 92 solutions; there are 12 orbits — 11 of size 8");
console.log("  and one of size 4 (the 180-degree-symmetric solution). 12 representatives stand");
console.log("  for all 92: one witness per family, never the whole space.");
console.log("");
console.log("same-metric comparison (identical events counted for every strategy):");
console.log("                          committed placements     primitive conflict checks");
console.log("naive, full enumeration:  " + String(naiveFull.committed).padEnd(24) + naiveFullChecks);
console.log("MRV,   full enumeration:  " + String(mrvFull.committed).padEnd(24) + mrvFullChecks);
const shrink = ((1 - mrvFull.committed / naiveFull.committed) * 100).toFixed(1);
const costUp = ((mrvFullChecks / naiveFullChecks - 1) * 100).toFixed(0);
console.log("");
console.log("The honest trade: the void-guided ordering shrinks the search tree by " + shrink + "%");
console.log("while paying ~" + costUp + "% MORE primitive checking to choose each step (at this board size).");
console.log("first solution, committed: naive " + naive1.committed + "  |  MRV " + mrv1.committed + "  |  LCV " + lcv.committed);
console.log("her rule LITERAL (greedy max-void, no undo): placed " + greedy.placed + " of 8 — " + (greedy.finished ? "finished" : "STALLED"));
console.log("  Taste orders the search. Only retraction finishes it.");
console.log("");
console.log("one canonical solution (orbit representative):");
console.log(render(orbs[0].rep));
console.log("");

// pinned witnesses — every number printed above is asserted here; drift = FAIL
check("92 solutions", sols.length === 92);
check("all solutions unique", new Set(sols.map(key)).size === 92);
check("all solutions legal (independent pairwise check)", sols.every(legal));
check("12 orbits", orbs.length === 12);
check("orbit sizes 11x8 + 1x4", orbs.filter(o => o.size === 8).length === 11 && orbs.filter(o => o.size === 4).length === 1);
check("naive full committed = 2056", naiveFull.committed === 2056, String(naiveFull.committed));
check("MRV full committed = 1360", mrvFull.committed === 1360, String(mrvFull.committed));
check("tree shrinkage = 33.9%", shrink === "33.9", shrink);
check("MRV pays MORE primitive checks than naive (the disclosed cost)", mrvFullChecks > naiveFullChecks, mrvFullChecks + " vs " + naiveFullChecks);
check("both enumerate all 92 (ordering changes cost, never answers)", naiveFull.solutions === 92 && mrvFull.solutions === 92);
check("first-solution committed: naive 113", naive1.committed === 113, String(naive1.committed));
check("first-solution committed: MRV 75", mrv1.committed === 75, String(mrv1.committed));
check("first-solution committed: LCV 55 (a sibling reading BEATS MRV)", lcv.committed === 55, String(lcv.committed));
check("LCV first solution is legal", legal(lcv.first));
check("greedy literal stalls at exactly 5", greedy.placed === 5 && !greedy.finished, greedy.placed + " " + greedy.finished);

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " witness break(s):");
  fails.forEach(f => console.log("  x " + f));
  process.exit(1);
}
console.log("GREEN — every published number is held by its own pinned witness; same metric, every strategy.");
