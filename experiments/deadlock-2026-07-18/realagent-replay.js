"use strict";
// Independent verifier for the real-agent token-cost addendum (two-bug discipline, applied to
// a real-model run instead of a scripted one). The workflow harness that ran the real Sonnet 5
// / Haiku actors used an INLINED copy of the witness (workflow scripts have no filesystem
// access to require() the real file). This script does NOT reuse that copy — it requires the
// actual, canonical witness.js and replays each model's recorded decision sequence through it
// fresh, then checks the result matches what realagent-ledger.json recorded. Agreement between
// the inlined copy (used live, under real model latency) and the canonical file (required here,
// after the fact) is the point — same pattern as replay-deadlock.js vs witness.js.
//   node realagent-replay.js --self-test   -> the gate runs this
"use strict";
const fs = require("fs");
const path = require("path");
const { Witness } = require(path.join(__dirname, "witness.js"));

const LEDGER = JSON.parse(fs.readFileSync(path.join(__dirname, "realagent-ledger.json"), "utf8"));
const CYCLE = LEDGER.cycleTasks;

// Replay one model's recorded governed-arm decisions through a FRESH, real witness.js instance.
function replayGoverned(decisions){
  const w = Witness();
  for (const t of CYCLE) w.request(t.actor, t.hold);   // phase 1: free seed grants, same as the run
  let trippedAtStep = -1, cycle = null;
  for (let i = 0; i < CYCLE.length; i++){
    if (trippedAtStep !== -1) break;
    const t = CYCLE[i];
    if (decisions[i] !== "request") continue;          // "wait"/"abstain" never reaches the witness
    const r = w.request(t.actor, t.want);
    if (r.deadlock){ trippedAtStep = i + 1; cycle = r.cycle; }
  }
  return { trippedAtStep, cycle, cleanOpen: w.isCleanOpen(), ledger: w.ledger() };
}

let n = 0, ok = 0; const fails = [];
const check = (name, cond, d) => { n++; if (cond) ok++; else fails.push(name + (d ? " — " + d : "")); };

for (const model of Object.keys(LEDGER.governed)){
  const recorded = LEDGER.governed[model];
  const replay = replayGoverned(recorded.decisions);
  check(model + ": independent trippedAtStep matches recorded",
        replay.trippedAtStep === recorded.trippedAtStep,
        replay.trippedAtStep + " vs " + recorded.trippedAtStep);
  check(model + ": independent cycle matches recorded",
        JSON.stringify(replay.cycle) === JSON.stringify(recorded.cycle),
        JSON.stringify(replay.cycle) + " vs " + JSON.stringify(recorded.cycle));
  check(model + ": independent cleanOpen matches recorded",
        replay.cleanOpen === recorded.cleanOpen,
        replay.cleanOpen + " vs " + recorded.cleanOpen);
  check(model + ": independent request-sequence op count matches recorded",
        replay.ledger.length === recorded.requestSequence.length,
        replay.ledger.length + " vs " + recorded.requestSequence.length);
}

// Sanity: the token comparison in REALAGENT-RESULTS.md rests on these totals — recompute them
// here too, independently of any prose, straight from the per-decision arrays in the ledger.
for (const model of Object.keys(LEDGER.governed)){
  const g = LEDGER.governed[model];
  const sum = g.outputTokensPerDecision.reduce((a, b) => a + b, 0);
  check(model + ": governed outputTokensTotal recomputes", sum === g.outputTokensTotal, sum + " vs " + g.outputTokensTotal);
}
for (const model of Object.keys(LEDGER.baseline)){
  const b = LEDGER.baseline[model];
  const sum = b.perRoundOutputTokens.reduce((a, b2) => a + b2, 0);
  check(model + ": baseline outputTokensTotal recomputes", sum === b.outputTokensTotal, sum + " vs " + b.outputTokensTotal);
}
for (const model of Object.keys(LEDGER.governed)){
  check(model + ": governed cheaper than baseline in real output tokens (this run)",
        LEDGER.governed[model].outputTokensTotal < LEDGER.baseline[model].outputTokensTotal,
        LEDGER.governed[model].outputTokensTotal + " vs " + LEDGER.baseline[model].outputTokensTotal);
}

console.log("checks: " + ok + "/" + n + " hold");
if (fails.length){ console.log("FAIL — " + fails.length + " break(s):"); fails.forEach(f => console.log("  x " + f)); process.exit(1); }
console.log("GREEN — the canonical witness.js, replayed independently of the workflow harness's inlined copy, reproduces every recorded governed-arm outcome; token totals recompute exactly from the per-decision arrays.");
