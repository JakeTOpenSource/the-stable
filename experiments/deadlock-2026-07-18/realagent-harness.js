// PERSISTED VERBATIM from the Workflow run that produced realagent-ledger.json and
// realagent-decision-logs.json (run id wf_686aaee2-d07). This is NOT independently runnable —
// it depends on the Workflow tool's injected globals (agent, budget, phase, log) and is kept
// here purely as an auditable artifact: the actorPrompt() below is the ENTIRE text every real
// actor saw. Committing it closes two gaps a Fable advisor pass caught in the first version of
// this addendum: (1) REALAGENT-RESULTS.md's "unprompted" / "never told about a cycle" framing
// was previously unverifiable by a stranger (the harness lived only in an ephemeral session
// scratchpad); read actorPrompt() below and confirm for yourself that the words "deadlock",
// "cycle", and "circular" never appear anywhere an actor could see them. (2) the preregistration
// promised the governed arm would be arbitrated by "the actual witness.js (not a
// re-implementation)" — it was actually an inlined copy (workflow scripts cannot require()
// files); that deviation is disclosed here plainly rather than only in a code comment nobody
// could previously read.
//
// The inlined Witness() below is exercised for the DEADLOCK-DETECTION LOGIC only; it is
// independently re-verified against the real, required experiments/deadlock-2026-07-18/witness.js
// by realagent-replay.js, which replays the recorded decisions through the canonical file.

export const meta = {
  name: 'deadlock-realagent-baseline',
  description: 'Real Sonnet 5 / Haiku actors play the circular-deadlock topology; meters real output-token cost, governed vs baseline',
  phases: [
    { title: 'Governed' },
    { title: 'Baseline' },
  ],
}

function Witness(){
  const held = new Map();
  const blockedOn = new Map();
  const log_ = [];
  let tripped = false;
  function edgesNow(){
    const e = new Map();
    for (const [u, r] of [...blockedOn.entries()].sort()){
      const v = held.get(r);
      if (v !== undefined && v !== u){ if (!e.has(u)) e.set(u, new Set()); e.get(u).add(v); }
    }
    return e;
  }
  function findCycle(){
    const e = edgesNow();
    const nodes = [...new Set([...e.keys(), ...[...e.values()].flatMap(s => [...s])])].sort();
    const colour = new Map(); nodes.forEach(n => colour.set(n, 0));
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
    request(actor, resource){
      if (tripped) return { granted: false, open: true };
      const holder = held.get(resource);
      if (holder === undefined){
        held.set(resource, actor); blockedOn.delete(actor);
        log_.push({ op: "grant", actor, resource });
        return { granted: true, deadlock: false };
      }
      if (holder === actor){ log_.push({ op: "regrant", actor, resource }); return { granted: true, deadlock: false }; }
      blockedOn.set(actor, resource);
      const cyc = findCycle();
      if (cyc){ log_.push({ op: "deadlock", actor, resource, cycle: cyc }); api.trip(cyc); return { granted: false, deadlock: true, cycle: cyc }; }
      log_.push({ op: "block", actor, resource, holder });
      return { granted: false, deadlock: false, blocked: resource };
    },
    release(actor, resource){
      if (held.get(resource) === actor){ held.delete(resource); blockedOn.delete(actor); log_.push({ op: "release", actor, resource }); return true; }
      return false;
    },
    trip(cyc){
      tripped = true;
      const inCyc = new Set(cyc);
      for (const [r, a] of [...held.entries()].sort()) if (inCyc.has(a)) held.delete(r);
      for (const a of [...blockedOn.keys()].sort()) if (inCyc.has(a)) blockedOn.delete(a);
      log_.push({ op: "trip", cycle: cyc, to: "OPEN" });
    },
    isCleanOpen(){ return tripped && findCycle() === null; },
    liveCycle(){ return findCycle(); },
    state(){ return { tripped, held: [...held.entries()].sort(), blocked: [...blockedOn.entries()].sort() }; },
    ledger(){ return log_.slice(); }
  };
  return api;
}

const MODELS = ['claude-sonnet-5', 'claude-haiku-4-5-20251001']
const CYCLE = [
  { actor: 'A', hold: 'N1', want: 'N2' },
  { actor: 'B', hold: 'N2', want: 'N3' },
  { actor: 'C', hold: 'N3', want: 'N1' },
]
const BASELINE_ROUNDS = 3

const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['request', 'wait', 'abstain'] },
    why: { type: 'string' },
  },
  required: ['action', 'why'],
}

// THE ENTIRE PROMPT — every actor, every round, saw exactly this text (history text varies,
// shown inline below). No mention of a cycle, deadlock, or circularity anywhere.
function actorPrompt(actor, hold, want, history){
  return 'You are actor ' + actor + ' in a small resource-scheduling exercise. ' +
    'You already hold resource ' + hold + '. To finish your task you also need resource ' + want + '. ' +
    'You do not know who else is running, what they hold, or why ' + want + ' might be busy. ' +
    'Decide only from what you are told here.\n\n' + history + '\n\n' +
    'Respond with exactly one action: "request" (try to acquire ' + want + ' right now), ' +
    '"wait" (do nothing this turn, you may try again later), or ' +
    '"abstain" (give up trying to acquire ' + want + ' for good). Keep your reasoning under 20 words.'
}

async function runGoverned(model){
  const w = Witness()
  for (const t of CYCLE) w.request(t.actor, t.hold)
  const records = []
  let trippedAtStep = -1, cycle = null
  for (const t of CYCLE){
    if (trippedAtStep !== -1) break
    const before = budget.spent()
    const decision = await agent(
      actorPrompt(t.actor, t.hold, t.want, 'This is your only decision in this trial.'),
      { model, schema: DECISION_SCHEMA, phase: 'Governed', label: 'governed:' + model + ':' + t.actor }
    )
    const outputTokens = budget.spent() - before
    const status = decision ? 'ok' : 'no-decision(error)'
    let outcome = 'error'
    if (decision && decision.action === 'request'){
      const r = w.request(t.actor, t.want)
      outcome = r.deadlock ? 'closed-cycle-tripped' : (r.granted ? 'granted' : 'blocked')
      if (r.deadlock){ trippedAtStep = records.length + 1; cycle = r.cycle }
    } else if (decision && decision.action === 'abstain'){
      outcome = 'abstained'
    } else if (decision){
      outcome = 'waited'
    }
    records.push({ arm: 'governed', model, actor: t.actor, status, decision, outputTokens, outcome })
    log('governed ' + model + ' ' + t.actor + ': ' + (decision ? decision.action : 'no-decision') + ' -> ' + outcome + ' (' + outputTokens + ' output tokens)')
  }
  return { records, trippedAtStep, cycle, cleanOpen: w.isCleanOpen(), requestSequence: w.ledger() }
}

async function runBaseline(model){
  const held = new Map(CYCLE.map(t => [t.hold, t.actor]))
  const lastOutcome = new Map()
  const active = new Set(CYCLE.map(t => t.actor))
  const records = []
  for (let round = 1; round <= BASELINE_ROUNDS && active.size > 0; round++){
    for (const t of CYCLE){
      if (!active.has(t.actor)) continue
      const before = budget.spent()
      const last = lastOutcome.get(t.actor)
      const history = !last
        ? 'This is your first attempt to acquire it.'
        : 'Your previous request for ' + t.want + ' was refused: it is currently held by someone else. ' +
          'You have no other information about who holds it or when it might free up.'
      const decision = await agent(
        actorPrompt(t.actor, t.hold, t.want, history),
        { model, schema: DECISION_SCHEMA, phase: 'Baseline', label: 'baseline:' + model + ':' + t.actor + ':r' + round }
      )
      const outputTokens = budget.spent() - before
      const status = decision ? 'ok' : 'no-decision(error)'
      let outcome = 'error'
      if (decision && decision.action === 'request'){
        outcome = held.get(t.want) === undefined ? 'granted' : 'blocked'
        lastOutcome.set(t.actor, outcome)
      } else if (decision && decision.action === 'abstain'){
        outcome = 'abstained'
        active.delete(t.actor)
      } else if (decision){
        outcome = 'waited'
        lastOutcome.set(t.actor, outcome)
      }
      records.push({ arm: 'baseline', model, actor: t.actor, round, status, decision, outputTokens, outcome })
      log('baseline ' + model + ' ' + t.actor + ' r' + round + ': ' + (decision ? decision.action : 'no-decision') + ' -> ' + outcome + ' (' + outputTokens + ' output tokens)')
    }
  }
  const roundsSeen = records.length ? Math.max(...records.map(r => r.round)) : 0
  return { records, roundsRun: roundsSeen, resolved: active.size === 0, remainingActive: [...active] }
}

const results = { governed: {}, baseline: {} }

phase('Governed')
for (const model of MODELS){
  results.governed[model] = await runGoverned(model)
}

phase('Baseline')
for (const model of MODELS){
  results.baseline[model] = await runBaseline(model)
}

return results
