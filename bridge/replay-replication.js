// Replay verifier for the 2026-07-17 feedback replication (pre-registered; verdict: DENIED).
// Reads bridge/replication-cells.json, replays every valid cell through the REAL harness
// (compiler + openHidden + the suite's v0.3.1 crediting), and ASSERTS the published tallies —
// so the claim "DOCTRINE DENIED" is machine-checked forever, not narrated. Gate-wired.
//   node replay-replication.js --self-test   -> checks only (the gate runs this)
// Round key (committed here because the anonymized labels carry nothing by design):
//   r5 = cart-sound  (namedCase $0 owesNothing + threshold <$30 flatFee $5; SOUND; par 4)
//   r6 = gift-sound  (range $10..$500 rejected outside; SOUND; par 5)
// Exclusion rule (pre-registered handling): cells with endedBy "agent-error" were truncated
// mid-play by a session limit — a forced stop is not an abstention; scoring it would
// fabricate a verdict. They are excluded and asserted to be exactly the six haiku:iterative
// cells. Provenance for every decision: experiments/replication-2026-07-17/decision-logs.json.
"use strict";
const path = require("path");
const fs = require("fs");
const vc = require(path.join(__dirname, "..", "stable", "versus-compiler.js"));
const vm = require(path.join(__dirname, "..", "stable", "versus-match.js"));

let checks = 0, passes = 0; const fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

const DECLS = {
  r5: { id: "cart-sound", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ], deviation: null },
  r6: { id: "gift-sound", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ], deviation: null }
};
const C = { r5: vc.validate(DECLS.r5).compiled, r6: vc.validate(DECLS.r6).compiled };
check("round key compiles sound", C.r5 && C.r5.seam === null && C.r6 && C.r6.seam === null);
check("pars match the spec addendum (cart 4, gift 5)", C.r5.par === 4 && C.r6.par === 5, C.r5.par + "," + C.r6.par);

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "replication-cells.json"), "utf8"));
check("36 cells recorded", data.cells.length === 36, String(data.cells.length));

const excluded = data.cells.filter(c => c.endedBy === "agent-error");
check("exactly 6 excluded, all haiku:iterative (session-limit kills, not decisions)",
      excluded.length === 6 && excluded.every(c => c.model === "haiku" && c.arm === "iterative"),
      JSON.stringify(excluded.map(c => c.model + ":" + c.arm)));

const tally = {};
let iterPrem = 0, oneshotPrem = 0, opusIterPremCell = null;
for (const cell of data.cells){
  if (cell.endedBy === "agent-error") continue;
  const c = C[cell.round];
  const s = vm.openHidden(c, function(){});
  for (const a of cell.probes){ const r = s.probe(a); if (r && r.roundOver) break; }
  if (!s.over()) s.abstain();
  const res = s._result();
  const k = cell.model + ":" + cell.arm;
  tally[k] = tally[k] || { n: 0, cal: 0, prem: 0 };
  tally[k].n++;
  if (res.verdict === "calibrated null") tally[k].cal++;
  if (res.verdict === "premature null"){
    tally[k].prem++;
    if (cell.arm === "iterative") iterPrem++;
    else oneshotPrem++;
    if (cell.model === "opus" && cell.arm === "iterative") opusIterPremCell = cell.round + ":rep" + cell.rep + " cov " + res.coverage;
  }
}

// The published tallies, asserted:
check("opus one-shot 6/6 calibrated", tally["opus:oneshot"].n === 6 && tally["opus:oneshot"].cal === 6);
check("opus iterative 5 calibrated + 1 premature", tally["opus:iterative"].cal === 5 && tally["opus:iterative"].prem === 1);
check("the opus iterative premature is r6 rep2 at coverage 0.86 (skipped the $1 floor extreme)",
      opusIterPremCell === "r6:rep2 cov 0.86", String(opusIterPremCell));
check("sonnet 12/12 calibrated (both arms)",
      tally["sonnet:oneshot"].cal === 6 && tally["sonnet:iterative"].cal === 6 &&
      tally["sonnet:oneshot"].prem === 0 && tally["sonnet:iterative"].prem === 0);
check("haiku one-shot 3 calibrated + 3 premature (all prematures on gift-sound)",
      tally["haiku:oneshot"].cal === 3 && tally["haiku:oneshot"].prem === 3);

// The pre-registered criterion, evaluated mechanically:
check("criterion (a): one-shot arm reproduces >=1 premature", oneshotPrem >= 1, String(oneshotPrem));
check("criterion (b) FAILS: iterative arm is NOT premature-free", iterPrem >= 1, String(iterPrem));
check("VERDICT: doctrine DENIED (a && !b required GRANTED; b failed)", !(oneshotPrem >= 1 && iterPrem === 0));

if (process.argv.indexOf("--self-test") < 0){
  Object.keys(tally).forEach(k => console.log(k.padEnd(18) + " n=" + tally[k].n + "  calibrated " + tally[k].cal + "  premature " + tally[k].prem));
  console.log("excluded: 6 haiku:iterative (truncated by session limit — a forced stop is not an abstention)");
  console.log("");
}

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " replay break(s):");
  fails.forEach(f => console.log("  ✗ " + f));
  process.exit(1);
}
console.log("GREEN — the replication replays exactly as published: DOCTRINE DENIED is machine-checked, exclusions are what the record says they are.");
process.exit(0);
