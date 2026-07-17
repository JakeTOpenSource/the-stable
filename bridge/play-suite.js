// Phase 4 bridge — run a REAL agent's probe plan through the real Witness Suite, score it,
// and compute its phasor signature via the Rail. The agent is given ONLY spec + domain (hidden
// information); it never sees the seam, par, special places, or whether a case is even buggy.
// This is the Stable's first real subject: humans feel it, agents run it — here an agent runs it.
//   node play-suite.js --specs           -> prints the hidden-info view (spec+domain per case)
//   node play-suite.js <plan.json>       -> runs the agent's plan, scores it, prints the phasor
// plan.json shape: { "<caseId>": { "probes": [n, ...], "thenAbstain": true|false }, ... }
"use strict";
const path = require("path");
const fs = require("fs");
const suite = require(path.join(__dirname, "..", "witness-suite", "witness-suite.js"));
const rail = require(path.join(__dirname, "..", "stable", "rail.js"));

if (process.argv.includes("--specs")) {
  const view = suite.cases().map(c => { const s = suite.open(c.id); return { id: c.id, spec: s.spec, domain: s.domain }; });
  console.log(JSON.stringify(view, null, 1));
  process.exit(0);
}

const planPath = process.argv[2];
if (!planPath) { console.log("usage: node play-suite.js <plan.json>  (or --specs)"); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));

const sessions = [], rows = [];
for (const c of suite.cases()) {
  const p = plan[c.id] || { probes: [], thenAbstain: true };
  const s = suite.open(c.id);
  let caught = false;
  for (const n of (p.probes || [])) {
    const r = s.probe(n);
    if (r && r.match === false) { caught = true; break; }   // found the deviation — stop, like a real tester
  }
  if (!caught && p.thenAbstain) s.abstain();
  const score = s.score();
  sessions.push({ caseId: c.id, score });
  rows.push({ id: c.id, verdict: score.verdict, probes: score.probes, par: score.par,
              discipline: score.discipline, coverage: score.coverage, grade: score.grade });
}

const route = rail.route(sessions);
console.log("=== the agent's play, scored against the real suite ===");
console.log("case                    verdict          probes/par  disc  cov   grade");
rows.forEach(r => console.log(
  (r.id + "                        ").slice(0,24) +
  (r.verdict + "                ").slice(0,17) +
  (r.probes + "/" + r.par + "        ").slice(0,10) + " " +
  (r.discipline + "     ").slice(0,5) + " " +
  (r.coverage + "     ").slice(0,5) + " " + r.grade));

const caught = rows.filter(r => r.verdict === "caught").length;
const seamed = suite._cases.filter(c => c.seam !== null).length;
const calibrated = rows.filter(r => r.verdict === "calibrated null").length;
const sound = suite._cases.filter(c => c.seam === null).length;
const falsePass = rows.filter(r => r.verdict === "false pass").length;
const premature = rows.filter(r => r.verdict === "premature null").length;
console.log("\n=== outcome ===");
console.log("seams caught:        " + caught + " / " + seamed);
console.log("calibrated nulls:    " + calibrated + " / " + sound + " sound cases");
console.log("false passes (missed a real bug): " + falsePass);
console.log("premature nulls (abstained without full coverage): " + premature);

console.log("\n=== the agent's phasor signature (via the Rail) ===");
const a = route.agent || {};
console.log("phi " + a.phiDeg + " deg | truePF " + a.truePF + " | Gamma (" + a.gammaRe + ", " + a.gammaIm + "j) |Gamma| " + a.gammaAbs + " | band " + a.band);
console.log("route: " + route.route);
console.log("reason: " + route.reason);
console.log("flags: " + (route.flags.length ? route.flags.join(", ") : "none"));
