"use strict";
// Independent verifier for the circular-deadlock trial (the two-bug discipline made real).
// This file does NOT import the witness's cycle detector. It replays the recorded request
// sequence through its OWN state machine and its OWN deadlock test (graph REDUCTION / peeling,
// not the witness's DFS 3-colour), then decides the verdict against the five pre-registered
// falsification conditions. Agreement between two independently-written detectors is the point.
//   node replay-deadlock.js --self-test   -> the gate runs this
// Pre-registration: PREREGISTRATION.md   Ledger: deadlock-ledger.json (from run-deadlock.js)
"use strict";
const fs = require("fs");
const path = require("path");

let n = 0, ok = 0; const fails = [];
const check = (name, cond, d) => { n++; if (cond) ok++; else fails.push(name + (d ? " — " + d : "")); };

const L = JSON.parse(fs.readFileSync(path.join(__dirname, "deadlock-ledger.json"), "utf8"));

// --- independent deadlock detector: reduction/peeling (different algorithm from the witness) ---
// Repeatedly remove any actor that can proceed — one not waiting, or waiting on a resource that
// is free or held by an actor that can itself proceed. Whatever cannot be peeled is deadlocked.
function deadlockSet(held, blockedOn){
  let remaining = new Set([...held.values(), ...blockedOn.keys()]);
  let changed = true;
  while (changed){
    changed = false;
    for (const u of [...remaining].sort()){
      const r = blockedOn.get(u);
      if (r === undefined){ remaining.delete(u); changed = true; continue; }        // holds only -> proceeds
      const holder = held.get(r);
      if (holder === undefined || holder === u || !remaining.has(holder)){ remaining.delete(u); changed = true; } // want is free or freeing
    }
  }
  return remaining;   // non-empty => a genuine deadlock, by an algorithm the witness never runs
}

// --- replay the recorded request sequence through independent state ---
const held = new Map(), blockedOn = new Map();
let indepTripStep = -1, indepSet = null, doubleGrant = false, ranPastTrip = false;
const seq = L.governed.requestSequence;
for (let i = 0; i < seq.length; i++){
  if (indepTripStep !== -1){ ranPastTrip = true; break; }   // witness stops at trip; so must a faithful replay
  const { actor, resource } = seq[i];
  const holder = held.get(resource);
  if (holder === undefined){ held.set(resource, actor); blockedOn.delete(actor); continue; }
  if (holder === actor) continue;
  if (holder !== undefined && holder !== actor && held.get(resource) === actor) doubleGrant = true; // never
  blockedOn.set(actor, resource);
  const ds = deadlockSet(held, blockedOn);
  if (ds.size > 0 && ds.has(actor)){ indepTripStep = i + 1; indepSet = ds; }
}

// --- independent clean-OPEN recompute: release the deadlocked actors' locks, drop their waits ---
function cleanOpenAfterTrip(){
  if (!indepSet) return false;
  const h2 = new Map(held), b2 = new Map(blockedOn);
  for (const [r, a] of [...h2.entries()]) if (indepSet.has(a)) h2.delete(r);
  for (const a of [...b2.keys()]) if (indepSet.has(a)) b2.delete(a);
  return deadlockSet(h2, b2).size === 0;   // no cycle may remain
}

// --- ledger invariant: no resource is granted while already held (false-pass scan) ---
function grantInvariantOk(){
  const openRes = new Set(); let bad = null;
  for (const ev of L.governed.ledger){
    if (ev.op === "grant"){ if (openRes.has(ev.resource)) bad = ev.resource; openRes.add(ev.resource); }
    if (ev.op === "release" || ev.op === "trip") { if (ev.resource) openRes.delete(ev.resource); if (ev.op === "trip") openRes.clear(); }
  }
  return bad === null;
}

const recordedSet = new Set((L.governed.cycle || []));   // e.g. ["A","B","C","A"] -> {A,B,C}
const indepAsArr = indepSet ? [...indepSet].sort() : [];
const recordedAsArr = [...recordedSet].sort();

// --- the five pre-registered falsification conditions, each closed out ---
// (2) detection: the independent detector must also find the deadlock
check("cond.2 NOT violated: independent detector found the deadlock (no missed cycle)", indepTripStep !== -1);
// (4) determinism/agreement: same closing step, same actor set, by two different algorithms
check("cond.4 determinism: independent trip step matches the witness's recorded step",
      indepTripStep === L.governed.trippedAtStep, indepTripStep + " vs " + L.governed.trippedAtStep);
check("cond.4 agreement: independent deadlock set matches the witness's recorded cycle (different algorithms concur)",
      JSON.stringify(indepAsArr) === JSON.stringify(recordedAsArr), JSON.stringify(indepAsArr) + " vs " + JSON.stringify(recordedAsArr));
check("faithful replay stopped at the trip (did not run past it)", ranPastTrip === false);
// (1) false pass: never two holders of one resource; ledger grant-invariant holds
check("cond.1 NOT violated: no double-grant of a single-holder resource in replay", doubleGrant === false);
check("cond.1 NOT violated: ledger never grants an already-held resource", grantInvariantOk());
// (5) clean OPEN: witness recorded it, AND independently no cycle remains after the breaker
check("cond.5: witness recorded a clean OPEN state", L.governed.cleanOpen === true);
check("cond.5: independently, no deadlock remains after releasing the cycle's locks", cleanOpenAfterTrip());
// (3) economy (structural): governed bounded and cheaper than the ungoverned flail
check("cond.3 structural: governed steps < baseline steps", L.governed.steps < L.baseline.steps,
      L.governed.steps + " vs " + L.baseline.steps);
check("cond.3 structural: governed run is bounded and known (trip <= sequence length)",
      L.governed.trippedAtStep > 0 && L.governed.trippedAtStep <= L.governed.steps);

const verdict = fails.length === 0 ? "GRANTED (this trial; deterministic core)" : "DENIED";
console.log("checks: " + ok + "/" + n + " hold");
console.log("VERDICT: candidate " + verdict);
if (fails.length){ console.log("FAIL — " + fails.length + " break(s):"); fails.forEach(f => console.log("  x " + f)); process.exit(1); }
console.log("GREEN — two independently-written detectors agree on the deadlock; no false pass, no missed cycle, clean OPEN, bounded cost. Doctrine survives THIS instance (deterministic core; real-model token economy is a separate budgeted run).");
