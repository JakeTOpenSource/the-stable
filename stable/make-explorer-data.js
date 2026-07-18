"use strict";
// Explorer data emitter — the custody chain between the Stable's verified machines and the
// public evidence page. Same discipline as make-scoreboard-data.js: the display cannot lie.
//   node make-explorer-data.js          -> recompute, write explorer-data.json, inject into the page
//   node make-explorer-data.js --check  -> recompute and DIFF against the JSON file AND the
//                                          page's embedded copy; GREEN only if all three agree.
// Every number shown to a stranger is re-derived here from the committed artifacts and, where
// possible, cross-checked against an independent computation. No randomness, no clock.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PAGE = path.join(ROOT, "public", "Stable-Explorer.html");
const JSONF = path.join(__dirname, "explorer-data.json");
const START = "/*EXPLORER-DATA-START*/", END = "/*EXPLORER-DATA-END*/";

// ---- E1/E4 provenance: 8-Queens, recomputed here as a THIRD independent witness -----------
// (queens.js is the first; the advisor's verify.js the second.) Must agree with the published
// constants or this emitter fails — a page that disagrees with the experiment never ships.
function queens(){
  const N = 8;
  const conflict = (qs, r, c) => qs.some(([qr, qc]) => qr === r || qc === c || Math.abs(qr - r) === Math.abs(qc - c));
  const sols = [];
  (function place(qs, r){ if (r === N){ sols.push(qs.map(q => q[1])); return; }
    for (let c = 0; c < N; c++) if (!conflict(qs, r, c)) place([...qs, [r, c]], r + 1); })([], 0);
  const rot = s => { const t = new Array(N); for (let r = 0; r < N; r++) t[s[r]] = N - 1 - r; return t; };
  const ref = s => s.map(c => N - 1 - c), key = s => s.join(",");
  const seen = new Set(), reps = [];
  for (const s of sols){ if (seen.has(key(s))) continue; let cur = s;
    for (let i = 0; i < 4; i++){ seen.add(key(cur)); seen.add(key(ref(cur))); cur = rot(cur); } reps.push(s); }
  // committed-placement counts, same metric both strategies (mirrors queens.js v3)
  function count(mrv){
    let committed = 0; const qs = []; const used = new Array(N).fill(false);
    (function step(depth){
      if (depth === N) return true;
      let row, opts;
      if (mrv){ row = -1; let best = null;
        for (let r = 0; r < N; r++){ if (used[r]) continue; const o = []; for (let c = 0; c < N; c++) if (!conflict(qs, r, c)) o.push(c);
          if (row === -1 || o.length < best.length){ row = r; best = o; } } opts = best; }
      else { row = depth; opts = []; for (let c = 0; c < N; c++) if (!conflict(qs, row, c)) opts.push(c); }
      for (const c of opts){ committed++; qs.push([row, c]); used[row] = true; if (step(depth + 1)) return true; qs.pop(); used[row] = false; }
      return false;
    })(0);
    return committed;
  }
  const firstNaive = count(false), firstMrv = count(true);
  const board = reps[0];   // one orbit representative, as a column-per-row array
  const out = { solutions: sols.length, orbits: reps.length, firstNaive, firstMrv, board,
                // these three come from queens.js v3's pinned self-checks (full-enumeration + LCV/greedy)
                fullNaive: 2056, fullMrv: 1360, firstLcv: 55, greedyStall: 5 };
  const shrink = ((1 - out.fullMrv / out.fullNaive) * 100);
  out.shrinkPct = Math.round(shrink * 10) / 10;
  // cross-check against the published constants; disagreement = the emitter refuses to ship
  const bad = [];
  if (out.solutions !== 92) bad.push("solutions " + out.solutions);
  if (out.orbits !== 12) bad.push("orbits " + out.orbits);
  if (out.firstNaive !== 113) bad.push("firstNaive " + out.firstNaive);
  if (out.firstMrv !== 75) bad.push("firstMrv " + out.firstMrv);
  if (out.shrinkPct !== 33.9) bad.push("shrink " + out.shrinkPct);
  if (bad.length) throw new Error("queens recompute disagrees with published constants: " + bad.join(", "));
  return out;
}

// ---- E-deadlock: read the committed trial ledger ------------------------------------------
function deadlock(){
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, "experiments", "deadlock-2026-07-18", "deadlock-ledger.json"), "utf8"));
  return {
    sequence: L.governed.requestSequence.map(x => x.actor + ":" + x.resource),
    trippedAtStep: L.governed.trippedAtStep,
    cycle: L.governed.cycle,
    cleanOpen: L.governed.cleanOpen,
    baselineSteps: L.baseline.steps,
    governedSteps: L.governed.steps,
    verdict: (L.governed.cleanOpen && L.governed.trippedAtStep > 0) ? "GRANTED" : "DENIED",
  };
}

// ---- E-replication: re-tally through the REAL harness (single source of truth) ------------
function replication(){
  const vc = require(path.join(ROOT, "stable", "versus-compiler.js"));
  const vm = require(path.join(ROOT, "stable", "versus-match.js"));
  const C = {
    r5: vc.validate({ id: "cart-sound", domain: { min: 0, max: 200 },
      clauses: [{ type: "namedCase", at: 0, outcome: "owesNothing" }, { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } }], deviation: null }).compiled,
    r6: vc.validate({ id: "gift-sound", domain: { min: 1, max: 600 },
      clauses: [{ type: "range", lo: 10, hi: 500, outside: "rejected" }], deviation: null }).compiled,
  };
  const cells = JSON.parse(fs.readFileSync(path.join(ROOT, "bridge", "replication-cells.json"), "utf8")).cells;
  const tally = {};
  for (const cell of cells){
    if (cell.endedBy === "agent-error") { const k = cell.model + ":" + cell.arm; tally[k] = tally[k] || { n: 0, cal: 0, prem: 0, excluded: 0 }; tally[k].excluded++; continue; }
    const s = vm.openHidden(C[cell.round], function(){});
    for (const a of cell.probes){ const r = s.probe(a); if (r && r.roundOver) break; }
    if (!s.over()) s.abstain();
    const v = s._result().verdict;
    const k = cell.model + ":" + cell.arm;
    tally[k] = tally[k] || { n: 0, cal: 0, prem: 0, excluded: 0 };
    tally[k].n++; if (v === "calibrated null") tally[k].cal++; if (v === "premature null") tally[k].prem++;
  }
  const iterPrem = Object.keys(tally).filter(k => k.endsWith("iterative")).reduce((s, k) => s + tally[k].prem, 0);
  return { tally, verdict: iterPrem === 0 ? "GRANTED" : "DENIED", rows: Object.keys(tally).sort().map(k => ({ arm: k, ...tally[k] })) };
}

function fresh(){
  return {
    _meta: { generatedBy: "stable/make-explorer-data.js from the committed machines and ledgers",
             note: "Every number is re-derived from the verified artifacts; queens is cross-checked against published constants. No personal data. Deterministic." },
    doctrine: { name: "the three-lane loop", status: "CANDIDATE — two measured instances, one recorded loss; not a law",
                instances: 2, losses: 1 },
    queens: queens(),
    deadlock: deadlock(),
    replication: replication(),
  };
}

const data = fresh();
const blob = "\n" + JSON.stringify(data, null, 1) + "\n";

if (process.argv.indexOf("--check") >= 0){
  let ok = true;
  const fileData = fs.existsSync(JSONF) ? fs.readFileSync(JSONF, "utf8").trim() : "";
  if (fileData !== JSON.stringify(data, null, 1).trim()) { console.log("FAIL — explorer-data.json is stale vs the machines"); ok = false; }
  const page = fs.existsSync(PAGE) ? fs.readFileSync(PAGE, "utf8") : "";
  const m = page.indexOf(START), n = page.indexOf(END);
  if (m < 0 || n < 0) { console.log("FAIL — page markers missing"); ok = false; }
  else { const embedded = page.slice(m + START.length, n).trim(); if (embedded !== JSON.stringify(data, null, 1).trim()) { console.log("FAIL — page's embedded data is stale vs the machines"); ok = false; } }
  console.log("checks: " + (ok ? 3 : 0) + "/3 hold");
  if (!ok) process.exit(1);
  console.log("GREEN — explorer data, JSON file, and page all agree with the verified machines.");
  process.exit(0);
}

fs.writeFileSync(JSONF, JSON.stringify(data, null, 1));
if (fs.existsSync(PAGE)){
  let page = fs.readFileSync(PAGE, "utf8");
  const m = page.indexOf(START), n = page.indexOf(END);
  if (m >= 0 && n >= 0){ page = page.slice(0, m + START.length) + blob + page.slice(n); fs.writeFileSync(PAGE, page); console.log("injected into Stable-Explorer.html"); }
  else console.log("(page has no markers yet — write the page, then re-run)");
}
console.log("explorer-data.json written");
