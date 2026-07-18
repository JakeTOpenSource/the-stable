"use strict";
// The circular-deadlock trial — runs both arms, records a replayable ledger, meters cost.
// Deterministic (scripted actors, no models): the claim under test is the WITNESS, so the
// core proof needs no token spend. The real-model token baseline (falsification condition 3
// in dollar terms) is a separately-budgeted run, flagged below and NOT claimed here.
//   node run-deadlock.js         -> run both arms, write deadlock-ledger.json, print summary
// Verdict is decided by the independently-written replay-deadlock.js, not by this file.
"use strict";
const fs = require("fs");
const path = require("path");
const { Witness } = require(path.join(__dirname, "witness.js"));

// The injected, unannounced cycle: A holds N1 wants N2 / B holds N2 wants N3 / C holds N3 wants N1.
const CYCLE_TASKS = [
  { actor: "A", hold: "N1", want: "N2" },
  { actor: "B", hold: "N2", want: "N3" },
  { actor: "C", hold: "N3", want: "N1" },
];
const BASELINE_CAP = 25;   // pre-budgeted ceiling: the ungoverned flail cannot cost more than this many retry rounds

// --- GOVERNED arm: Lane 1 actors grab their first node, then request their second; the
//     witness (Lane 2/3) arbitrates. Deadlock closes on the third second-request. ---
function governed(){
  const w = Witness();
  const seq = [];                 // the replayable request ledger: [{actor, resource}, ...]
  function req(actor, resource){ seq.push({ actor, resource }); return w.request(actor, resource); }
  // phase 1: every actor takes its first (held) node — all granted, no contention yet
  for (const t of CYCLE_TASKS) req(t.actor, t.hold);
  // phase 2: every actor requests its second node — the third one closes the loop
  let trippedAt = -1, cycle = null;
  for (let i = 0; i < CYCLE_TASKS.length; i++){
    const t = CYCLE_TASKS[i];
    const r = req(t.actor, t.want);
    if (r.deadlock){ trippedAt = seq.length; cycle = r.cycle; break; }
  }
  return {
    requestSequence: seq,
    steps: seq.length,            // committed requests issued (same event, both arms)
    trippedAtStep: trippedAt,
    cycle,
    cleanOpen: w.isCleanOpen(),
    ledger: w.ledger(),
  };
}

// --- BASELINE arm: NO witness, NO breaker. Single-holder resources in a plain map. Each actor
//     holds its first node and spins re-requesting its second, which is held by the next actor
//     and never released. Unbounded flail, stopped only by the pre-budgeted cap. ---
function baseline(){
  const held = new Map();
  let steps = 0;
  for (const t of CYCLE_TASKS){ held.set(t.hold, t.actor); steps++; }   // phase 1: first locks
  let freedThisRound = -1;
  for (let round = 0; round < BASELINE_CAP; round++){
    freedThisRound = 0;
    for (const t of CYCLE_TASKS){
      steps++;                                   // one retry attempt for the blocked second node
      if (held.get(t.want) === undefined){ held.set(t.want, t.actor); freedThisRound++; }
    }
    if (freedThisRound === 0 && [...CYCLE_TASKS].every(t => held.get(t.want) !== t.actor)){
      // nobody progressed and nobody holds their want: frozen. Keep spinning to the cap (the flail).
    }
  }
  return { steps, cap: BASELINE_CAP, froze: true };   // it never resolves — that is the point
}

const g = governed();
const b = baseline();

const ledger = {
  _meta: {
    trial: "circular-deadlock-2026-07-18",
    preregistration: "PREREGISTRATION.md",
    deterministic: true,
    note: "Scripted actors (no models). The witness is the claim under test; token-dollar economy vs real flailing models is a separately-budgeted run, not included here.",
  },
  cycleTasks: CYCLE_TASKS,
  governed: {
    requestSequence: g.requestSequence,
    steps: g.steps,
    trippedAtStep: g.trippedAtStep,
    cycle: g.cycle,
    cleanOpen: g.cleanOpen,
    ledger: g.ledger,
  },
  baseline: { steps: b.steps, cap: b.cap, froze: b.froze },
};
fs.writeFileSync(path.join(__dirname, "deadlock-ledger.json"), JSON.stringify(ledger, null, 1));

console.log("=== circular-deadlock trial (deterministic core) ===\n");
console.log("GOVERNED arm (witness active):");
console.log("  request sequence: " + g.requestSequence.map(x => x.actor + ":" + x.resource).join("  "));
console.log("  deadlock tripped at step " + g.trippedAtStep + " of " + g.steps + "; cycle " + JSON.stringify(g.cycle));
console.log("  clean OPEN reached: " + g.cleanOpen);
console.log("");
console.log("BASELINE arm (ungoverned, no breaker):");
console.log("  froze and flailed to the pre-budgeted cap: " + b.steps + " steps (cap " + b.cap + " rounds), never resolved");
console.log("");
console.log("structural economy: governed " + g.steps + " steps -> hard stop; baseline " + b.steps + " steps -> still frozen.");
console.log("  The governed run is BOUNDED and known in advance; the ungoverned run is capped only by the wall.");
console.log("  (Token-dollar economy vs real flailing models = separate budgeted run; not claimed here.)");
console.log("\nwrote deadlock-ledger.json — verdict is decided by replay-deadlock.js (independent).");
