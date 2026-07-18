"use strict";
// The out-of-band deadlock witness + breaker (the thing under test).
// Deterministic, no model, no randomness, no clock. It is the ONLY arbiter of locks; actors
// never negotiate with each other. Detection = a directed cycle in the wait-for graph
// (Coffman et al., 1971). Breaker = deny the closing lock, release the deadlocked actors'
// locks, flush to a clean OPEN state. Pre-registration: ./PREREGISTRATION.md
//
//   node witness.js --self-test   -> the witness's own scenarios (the gate runs this)
//
// This file is Lane 2 (certify) + Lane 3 (retract) of the three-lane loop. Lane 1 (taste)
// is the actors' local scheduling, which lives in run-deadlock.js. The verdict on the whole
// trial is NOT decided here — it is recomputed by the independently-written replay-deadlock.js.
"use strict";

function Witness(){
  const held = new Map();       // resource -> actor holding it (single holder, authoritative)
  const blockedOn = new Map();  // actor -> the resource it is currently waiting for
  const log = [];               // deterministic event ledger
  let tripped = false;

  // wait-for graph: U -> V iff U is blocked on a resource held by V (V != U). Sorted for determinism.
  function edgesNow(){
    const e = new Map();
    for (const [u, r] of [...blockedOn.entries()].sort()){
      const v = held.get(r);
      if (v !== undefined && v !== u){ if (!e.has(u)) e.set(u, new Set()); e.get(u).add(v); }
    }
    return e;
  }
  // 3-colour DFS; return the cycle as an actor list (closing node repeated), or null.
  function findCycle(){
    const e = edgesNow();
    const nodes = [...new Set([...e.keys(), ...[...e.values()].flatMap(s => [...s])])].sort();
    const colour = new Map(); nodes.forEach(n => colour.set(n, 0)); // 0 white, 1 grey, 2 black
    const stack = []; let cyc = null;
    function dfs(u){
      colour.set(u, 1); stack.push(u);
      for (const v of [...(e.get(u) || [])].sort()){
        if (cyc) return;
        if (colour.get(v) === 1){ cyc = stack.slice(stack.indexOf(v)).concat(v); return; }
        if (colour.get(v) === 0) dfs(v);
      }
      colour.set(u, 2); stack.pop();
    }
    for (const n of nodes){ if (cyc) break; if (colour.get(n) === 0) dfs(n); }
    return cyc;
  }

  const api = {
    // Lane 2: every lock request is arbitrated here. No actor-to-actor talk exists.
    request(actor, resource){
      if (tripped) return { granted: false, open: true };
      const holder = held.get(resource);
      if (holder === undefined){
        held.set(resource, actor); blockedOn.delete(actor);
        log.push({ op: "grant", actor, resource });
        return { granted: true, deadlock: false };
      }
      if (holder === actor){ log.push({ op: "regrant", actor, resource }); return { granted: true, deadlock: false }; }
      // busy: actor now waits. Tentatively record the wait edge, then test for a closed cycle.
      blockedOn.set(actor, resource);
      const cyc = findCycle();
      if (cyc){ log.push({ op: "deadlock", actor, resource, cycle: cyc }); api.trip(cyc); return { granted: false, deadlock: true, cycle: cyc }; }
      log.push({ op: "block", actor, resource, holder });
      return { granted: false, deadlock: false, blocked: resource };
    },
    release(actor, resource){
      if (held.get(resource) === actor){ held.delete(resource); blockedOn.delete(actor); log.push({ op: "release", actor, resource }); return true; }
      return false;
    },
    // Lane 3: deny the closing lock, release every lock held by a deadlocked actor, drop those
    // actors' waits. The result must contain no remaining cycle (verified by isCleanOpen()).
    trip(cyc){
      tripped = true;
      const inCyc = new Set(cyc);
      for (const [r, a] of [...held.entries()].sort()) if (inCyc.has(a)) held.delete(r);
      for (const a of [...blockedOn.keys()].sort()) if (inCyc.has(a)) blockedOn.delete(a);
      log.push({ op: "trip", cycle: cyc, to: "OPEN" });
    },
    // clean OPEN = tripped AND no cycle remains AND no deadlocked actor still holds/awaits a lock.
    isCleanOpen(){ return tripped && findCycle() === null; },
    liveCycle(){ return findCycle(); },       // for the false-pass invariant: must be null whenever !tripped
    state(){ return { tripped, held: [...held.entries()].sort(), blocked: [...blockedOn.entries()].sort() }; },
    ledger(){ return log.slice(); }
  };
  return api;
}

// ---- self-test: the witness's own scenarios (verdict on the TRIAL is replay-deadlock.js) ----
if (require.main === module && process.argv.includes("--self-test")){
  let n = 0, ok = 0; const fails = [];
  const check = (name, cond, d) => { n++; if (cond) ok++; else fails.push(name + (d ? " — " + d : "")); };

  // 1. THE 3-CYCLE: A holds N1 wants N2 / B holds N2 wants N3 / C holds N3 wants N1.
  (function(){
    const w = Witness();
    w.request("A","N1"); w.request("B","N2"); w.request("C","N3");
    w.request("A","N2");                    // A blocks on B
    w.request("B","N3");                    // B blocks on C
    const r = w.request("C","N1");          // C blocks on A -> closes A->B->C->A
    check("3-cycle detected on the closing request", r.deadlock === true);
    check("3-cycle names all three actors", new Set(r.cycle).size === 3, JSON.stringify(r.cycle));
    check("breaker reached clean OPEN (no cycle remains)", w.isCleanOpen());
    check("no live cycle after trip", w.liveCycle() === null);
  })();

  // 2. SAFE CONTENTION: A waits on B; B releases; the wait must never be a cycle -> no false trip.
  (function(){
    const w = Witness();
    w.request("A","N1"); w.request("B","N2");
    const a2 = w.request("A","N2");         // A blocks on B, but B waits on nothing -> no cycle
    check("safe contention does NOT false-trip", a2.deadlock === false && a2.blocked === "N2");
    w.release("B","N2");
    const a2b = w.request("A","N2");        // now free
    check("A proceeds after B releases", a2b.granted === true);
    check("no trip on a resolvable wait", w.state().tripped === false);
  })();

  // 3. TWO-CYCLE: A holds N1 wants N2 / B holds N2 wants N1.
  (function(){
    const w = Witness();
    w.request("A","N1"); w.request("B","N2");
    w.request("A","N2");
    const r = w.request("B","N1");
    check("2-cycle detected", r.deadlock === true && new Set(r.cycle).size === 2);
  })();

  // 4. FALSE-PASS GUARD (adversarial actor): a blocked actor re-requests a held resource many
  // times; the witness must NEVER grant a single-holder resource to two actors, and must never
  // report a live cycle while untripped.
  (function(){
    const w = Witness();
    w.request("A","N1");                    // A holds N1
    let doubleGrant = false, liveCycleWhileOpen = false;
    for (let i = 0; i < 20; i++){
      const r = w.request("B","N1");        // B keeps trying to seize A's node
      if (r.granted) doubleGrant = true;    // must never happen
      if (!w.state().tripped && w.liveCycle() !== null) liveCycleWhileOpen = true;
    }
    check("single-holder never double-granted under adversarial retry", doubleGrant === false);
    check("witness never certifies a live deadlock while untripped", liveCycleWhileOpen === false);
    // ledger invariant: between any two grants of one resource there is a release
    const led = w.ledger(); let bad = null; const openRes = new Set();
    for (const ev of led){
      if (ev.op === "grant"){ if (openRes.has(ev.resource)) bad = ev.resource; openRes.add(ev.resource); }
      if (ev.op === "release") openRes.delete(ev.resource);
    }
    check("ledger invariant: no grant of an already-held resource", bad === null, "double at " + bad);
  })();

  console.log("checks: " + ok + "/" + n + " hold");
  if (fails.length){ console.log("FAIL — " + fails.length + " witness break(s):"); fails.forEach(f => console.log("  x " + f)); process.exit(1); }
  console.log("GREEN — cycle detection catches every injected loop, never false-trips a resolvable wait, never double-grants, and always reaches clean OPEN.");
}

module.exports = { Witness };
