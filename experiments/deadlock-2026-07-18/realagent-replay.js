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
const DECISIONS = JSON.parse(fs.readFileSync(path.join(__dirname, "realagent-decision-logs.json"), "utf8"));
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
  // Content, not just count (a Fable advisor pass proved the length-only version could pass
  // with a silently corrupted transcript — e.g. a "deadlock" op rewritten to a plain "block").
  check(model + ": independent request-sequence CONTENT matches recorded exactly",
        JSON.stringify(replay.ledger) === JSON.stringify(recorded.requestSequence),
        JSON.stringify(replay.ledger) + " vs " + JSON.stringify(recorded.requestSequence));
}

// Sanity: the token comparison in REALAGENT-RESULTS.md rests on these totals — recompute them
// here too, independently of any prose, straight from the per-decision arrays in the ledger.
for (const model of Object.keys(LEDGER.governed)){
  const g = LEDGER.governed[model];
  const sum = g.outputTokensPerDecision.reduce((a, b) => a + b, 0);
  check(model + ": governed outputTokensTotal recomputes from ledger arrays", sum === g.outputTokensTotal, sum + " vs " + g.outputTokensTotal);
}
for (const model of Object.keys(LEDGER.baseline)){
  const b = LEDGER.baseline[model];
  const sum = b.perRoundOutputTokens.reduce((a, b2) => a + b2, 0);
  check(model + ": baseline outputTokensTotal recomputes from ledger arrays", sum === b.outputTokensTotal, sum + " vs " + b.outputTokensTotal);
}

// Provenance: the ledger's arrays are themselves claims about the raw decision-logs records —
// a Fable advisor pass noted nothing checked that logs->ledger step. Recompute the ledger's
// per-decision/per-round arrays, decisions, and totals straight from realagent-decision-logs.json
// and require exact agreement, closing the logs->ledger link the same way the ledger->replay
// link is closed above.
function recordsFor(arm, model){ return DECISIONS.records.filter(r => r.arm === arm && r.model === model); }

for (const model of Object.keys(LEDGER.governed)){
  const g = LEDGER.governed[model];
  const recs = recordsFor("governed", model);
  const tokensFromLogs = recs.map(r => r.outputTokens);
  const decisionsFromLogs = recs.map(r => r.decision && r.decision.action);
  check(model + ": governed per-decision tokens match decision-logs",
        JSON.stringify(tokensFromLogs) === JSON.stringify(g.outputTokensPerDecision),
        JSON.stringify(tokensFromLogs) + " vs " + JSON.stringify(g.outputTokensPerDecision));
  check(model + ": governed decisions match decision-logs",
        JSON.stringify(decisionsFromLogs) === JSON.stringify(g.decisions),
        JSON.stringify(decisionsFromLogs) + " vs " + JSON.stringify(g.decisions));
}
for (const model of Object.keys(LEDGER.baseline)){
  const b = LEDGER.baseline[model];
  const recs = recordsFor("baseline", model);
  const byRound = {};
  for (const r of recs) byRound[r.round] = (byRound[r.round] || 0) + r.outputTokens;
  const perRoundFromLogs = Object.keys(byRound).sort((a, c) => a - c).map(k => byRound[k]);
  check(model + ": baseline per-round tokens match decision-logs",
        JSON.stringify(perRoundFromLogs) === JSON.stringify(b.perRoundOutputTokens),
        JSON.stringify(perRoundFromLogs) + " vs " + JSON.stringify(b.perRoundOutputTokens));
  const sumFromLogs = recs.reduce((a, r) => a + r.outputTokens, 0);
  check(model + ": baseline outputTokensTotal matches decision-logs sum", sumFromLogs === b.outputTokensTotal, sumFromLogs + " vs " + b.outputTokensTotal);
}

// The "cheaper" comparison is only a fair, same-event claim where the governed arm actually
// completed all 3 requests (a Fable advisor pass caught this being asserted unconditionally,
// including for Haiku, where it isn't). Derive fairness from the data — not from naming a
// model — the same "enforced, not assumed" discipline the project applies elsewhere.
for (const model of Object.keys(LEDGER.governed)){
  const g = LEDGER.governed[model];
  const sameEventComparison = g.decisions.every(d => d === "request");
  if (sameEventComparison){
    check(model + ": governed cheaper than baseline in real output tokens (same-event comparison)",
          g.outputTokensTotal < LEDGER.baseline[model].outputTokensTotal,
          g.outputTokensTotal + " vs " + LEDGER.baseline[model].outputTokensTotal);
  } else {
    console.log("note: " + model + "'s governed arm did not issue all 3 requests (decisions " +
      JSON.stringify(g.decisions) + ") — skipping the cheaper-than-baseline check; not a same-event comparison.");
  }
}

console.log("checks: " + ok + "/" + n + " hold");
if (fails.length){ console.log("FAIL — " + fails.length + " break(s):"); fails.forEach(f => console.log("  x " + f)); process.exit(1); }
console.log("GREEN — the canonical witness.js, replayed independently of the workflow harness's inlined copy, reproduces every recorded governed-arm outcome; the ledger's arrays recompute exactly from the raw decision-logs; token totals recompute exactly.");
