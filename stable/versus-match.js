// The Versus Table, Phase 2: the match harness (2026-07-14).
//
// Runs Builder-vs-Witness matches over compiled cases: hidden-information sessions, probe
// cap, sound-case quota, the scoring table, a replayable ledger, and — new with Jake's
// conformal-fold design — THE SURGE PROTECTOR: a running Smith gauge per round. After each
// probe the harness computes the session's reflection coefficient Gamma against Z0 = par;
// if VSWR stays at or above the trip threshold once the grace probes are spent, the round
// folds back early (verdict "tripped") instead of burning the remaining budget. RF
// amplifiers protect themselves from mismatched loads exactly this way; here it is an
// economic floor, not physics — nothing burns, budget just stops leaking.
//
// Hidden information: the Witness sees ONLY spec prose + domain (+ probe/abstain). Not par,
// not the seam, not whether a seam exists. That uncertainty is the game.
//
// Determinism and replay (non-negotiable): no randomness, no clock in the harness. The
// ledger records declarations, every probe, verdicts, trips, and scores; replay() re-runs
// the ledger and must reproduce the match exactly. A match you cannot replay is a claim
// you cannot witness.
"use strict";

var path = require("path");
var vc = require(path.join(__dirname, "versus-compiler.js"));
// Single source of truth for coverage/aim: the suite's target model (regions + extremes,
// v0.3.1). The harness never re-implements crediting; it replays through suite._analyze.
var suite = require(path.join(__dirname, "..", "witness-suite", "witness-suite.js"));

// The scale version is a PART LABEL. Any change to a SCORE constant or a scoring formula
// must bump it — a ledger stamped with an old label but scored under a new scale is a
// mislabeled component, and replay() refuses it rather than quietly re-rating it (Jake's
// circuit doctrine: an unlabeled part that silently changed value is what a surge trips on).
// Bump history: 0.1 initial · 0.2 (2026-07-15) sound-builder reward -> floor((probes-par)/2)
// · 0.3 (2026-07-16) coverage/par migrated to the region+extremes target model (witness-suite
//   v0.3.1); scoring FORMULA unchanged, but par semantics feeding it changed, so a 0.2 ledger
//   replayed under 0.3 would silently re-rate — the label exists to refuse exactly that.
var RULES = {
  version: "0.3",
  ROUNDS: 6,               // roles alternate every round
  PROBE_CAP: 25,
  SOUND_QUOTA: 2,          // of each builder's 3 builder-rounds
  SURGE_VSWR_TRIP: 6,      // fold back when running VSWR >= this...
  SURGE_GRACE_PROBES: 6,   // ...but never before this many probes (aim needs room to start)
  SCORE: {                 // per round; weights are v0 knobs, balance-tuned in Phase 3
    catchW: 10,            // witness: 10 * par / probes
    nullW: 10,             // witness: 10 * par / probes on calibrated null
    prematureB: 10,
    findingB: 15,          // the finding — highest information, harvest trigger
    openB: 12,             // cap exhausted or tripped without conclusion
    illegalW: 12
  }
};

var EPS = 0.005;
function isMatch(p, t){ if (p < 0 || t < 0) return p === t; return Math.abs(p - t) < EPS; }

// running phasor pieces for the surge gauge (R = productive work, XL = lag), same target
// model the suite and Rail use (v0.3.1), computed by replaying the growing ledger through
// suite._analyze so the gauge exists DURING the round with zero duplicated crediting logic.
// sinceProductive is the STALL counter: probes since the last new target was covered.
function surgeState(c){
  return { probes: [], seen: {}, lastProductive: 0, caught: false, covWasDone: false,
           R: 0, XL: 0, sinceProductive: 0 };
}
function surgeStep(st, c, a, match){
  var key = String(a);
  var isRepeat = !!st.seen[key];
  st.seen[key] = true;
  st.probes.push(a);
  var an = suite._analyze(st.probes, c);
  var productive = an.productive > st.lastProductive;
  st.lastProductive = an.productive;
  // lag, incrementally: any probe after the catch, any repeat, any probe after a sound
  // case's coverage was already complete. The catching/completing probes are work, not lag.
  if (st.caught || isRepeat || (c.seam === null && st.covWasDone)) st.XL++;
  else if (productive) st.R++;
  st.sinceProductive = productive ? 0 : st.sinceProductive + 1;
  if (c.seam === null && an.coverage >= 1) st.covWasDone = true;
  if (!match) st.caught = true;
}
function surgeVSWR(st, par){
  var R = st.R, X = st.XL, Z0 = par > 0 ? par : 1;
  var num = Math.sqrt((R - Z0) * (R - Z0) + X * X);
  var den = Math.sqrt((R + Z0) * (R + Z0) + X * X);
  var abs = den === 0 ? 1 : Math.min(1, num / den);
  return abs >= 0.999 ? 999 : (1 + abs) / (1 - abs);
}

// A hidden-information session over a compiled case. The witness object receives ONLY this.
function openHidden(c, onEvent){
  var probes = [], caught = false, abstained = false, tripped = false, capped = false;
  var st = surgeState(c);

  function concluded(){ return caught || abstained || tripped || capped; }

  var session = {
    spec: c.spec,
    domain: { min: c.domain.min, max: c.domain.max },
    probe: function(a){
      if (concluded()) return { error: "round over" };
      a = Math.round(a * 100) / 100;
      if (!(a >= c.domain.min && a <= c.domain.max)) return { error: "out of domain", domain: session.domain };
      var p = c.promised(a), t = c.tool(a);
      var match = isMatch(p, t);
      probes.push(a);
      surgeStep(st, c, a, match);
      if (!match) caught = true;
      onEvent({ type: "probe", sent: a, tool: t, match: match });   // the witness sees tool + match only via return
      // THE SURGE, two trip signals (0.3): the Gamma-trip catches phase mismatch (lag-heavy
      // play), and the STALL-trip catches zero-power-transfer runs — no new target covered
      // for 2x the grace window means the load stopped absorbing; fold back. The stall trip
      // is required under region credit: even unaimed play earns a little R (regions are
      // wide), which blinds a Gamma-only gauge to a flailer that has simply stopped
      // progressing. No new constants: the stall window is derived from SURGE_GRACE_PROBES.
      if (!caught && probes.length >= RULES.SURGE_GRACE_PROBES){
        var vswrNow = surgeVSWR(st, c.par);
        var stalled = st.sinceProductive >= 2 * RULES.SURGE_GRACE_PROBES;
        if (vswrNow >= RULES.SURGE_VSWR_TRIP || stalled){
          tripped = true;
          onEvent({ type: "trip", atProbe: probes.length, vswr: Math.round(vswrNow * 10) / 10,
                    stall: stalled });
        }
      }
      if (!caught && !tripped && probes.length >= RULES.PROBE_CAP){
        capped = true;
        onEvent({ type: "cap", atProbe: probes.length });
      }
      return { sent: a, tool: t, match: match, roundOver: concluded() };
    },
    abstain: function(){
      if (!concluded()) { abstained = true; onEvent({ type: "abstain", afterProbes: probes.length }); }
      return { roundOver: true };
    },
    over: function(){ return concluded(); }
  };

  session._result = function(){
    // coverage via the suite's target model (v0.3.1) — same crediting the solo suite scores
    var coverage = suite._analyze(probes, c).coverage;
    var verdict;
    if (caught) verdict = "caught";
    else if (abstained) verdict = c.seam === null ? (coverage >= 1 ? "calibrated null" : "premature null") : "false pass";
    else if (tripped) verdict = "tripped";
    else verdict = "open";
    return { verdict: verdict, probes: probes.length, coverage: Math.round(coverage * 100) / 100, ledger: probes.slice() };
  };
  return session;
}

function scoreRound(verdict, probes, par){
  var S = RULES.SCORE, W = 0, B = 0;
  // max(0,...) guard: adversarial parse 2026-07-17 found scoreRound("caught", 0, par) returned
  // builder -1 — unreachable via openHidden (a probe is pushed before caught can be set, so a
  // catch always carries probes >= 1) but the standalone property "scores are never negative"
  // must hold for the function in isolation. Every scale-fixture row is byte-identical under
  // the guard (all pinned rows have probes >= 1), so the governed scale is untouched.
  if (verdict === "caught"){ W = Math.round(S.catchW * par / Math.max(1, probes) * 10) / 10; B = Math.max(0, Math.min(probes, RULES.PROBE_CAP) - 1); }
  // Sound-builder reward: overshoot / 3 (floor) — re-tuned 2026-07-16 with the region+
  // extremes migration. History: /2 was the Phase 3 tuning (2026-07-15) that stopped
  // defensive sound-spam from out-earning fair play (201.6 vs 197.6). Derived par is
  // smaller than the old special.length par, so the same honest play overshoots more and
  // /2 let defense dominate again (193.6 vs 187.6, re-measured); /3 restores the reference
  // players' 0.2-era builder economics almost exactly. Doctrine unchanged: defense taxes
  // sloppy reading, never dominates fair play — and a witness abstaining AT par pays the
  // defensive builder nothing at all.
  else if (verdict === "calibrated null"){ W = Math.round(S.nullW * par / Math.max(1, probes) * 10) / 10; B = Math.max(0, Math.floor((probes - par) / 3)); }
  else if (verdict === "premature null"){ B = S.prematureB; }
  else if (verdict === "false pass"){ B = S.findingB; }
  else { B = S.openB; }                                            // open or tripped
  return { witness: W, builder: B };
}

// agents: { name, build(roundIndex) -> declaration, witness(session) -> plays until over/abstain }
function playMatch(matchId, agentA, agentB){
  var ledger = { matchId: matchId, rules: RULES.version, rounds: [], totals: {} };
  var totals = {}; totals[agentA.name] = 0; totals[agentB.name] = 0;
  var probesTotal = {}; probesTotal[agentA.name] = 0; probesTotal[agentB.name] = 0;
  var soundCount = {}; soundCount[agentA.name] = 0; soundCount[agentB.name] = 0;
  var harvest = [];

  for (var r = 0; r < RULES.ROUNDS; r++){
    var builder = r % 2 === 0 ? agentA : agentB;
    var witness = r % 2 === 0 ? agentB : agentA;
    var decl = builder.build(r);
    var round = { index: r, builder: builder.name, witness: witness.name, declaration: decl, events: [] };

    var v = vc.validate(decl);
    var isSound = v.legal && v.compiled.seam === null;
    if (isSound) soundCount[builder.name]++;
    if (!v.legal || (isSound && soundCount[builder.name] > RULES.SOUND_QUOTA)){
      round.legal = false;
      round.reason = !v.legal ? v.reasons.join("; ") : "sound quota exceeded (" + RULES.SOUND_QUOTA + " per builder)";
      round.verdict = "illegal";
      round.score = { witness: RULES.SCORE.illegalW, builder: 0 };
      totals[witness.name] += round.score.witness;
      ledger.rounds.push(round);
      continue;
    }
    round.legal = true;

    var session = openHidden(v.compiled, function(ev){ round.events.push(ev); });
    witness.witness(session);
    if (!session.over()) session.abstain();                        // a witness that walks away has abstained

    var res = session._result();
    round.verdict = res.verdict;
    round.probes = res.probes;
    round.coverage = res.coverage;
    round.ledgerProbes = res.ledger;
    round.score = scoreRound(res.verdict, res.probes, v.compiled.par);
    totals[witness.name] += round.score.witness;
    totals[builder.name] += round.score.builder;
    probesTotal[witness.name] += res.probes;

    if (res.verdict === "false pass") harvest.push({ matchId: matchId, round: r, builder: builder.name, witness: witness.name, declaration: decl });
    ledger.rounds.push(round);
  }

  ledger.totals = totals;
  ledger.probesTotal = probesTotal;
  var names = [agentA.name, agentB.name];
  ledger.winner = totals[names[0]] === totals[names[1]]
    ? (probesTotal[names[0]] <= probesTotal[names[1]] ? names[0] : names[1])   // tiebreak: fewer probes
    : (totals[names[0]] > totals[names[1]] ? names[0] : names[1]);
  ledger.harvest = harvest;
  return ledger;
}

// replay: re-run the ledger's declarations and probe sequences; the match must reproduce.
// Refuses a ledger whose scale label predates the current scoring version — replaying it
// would silently re-rate old rounds under new constants, exactly the drift the label exists
// to catch. A mislabeled part is rejected, not quietly re-scored.
function replay(ledger){
  if (ledger.rules && ledger.rules !== RULES.version){
    return { matchId: ledger.matchId, refused: true,
             reason: "ledger scale " + ledger.rules + " != current " + RULES.version +
                     " — replay would re-rate under a changed scale; re-run under the matching version", rounds: [] };
  }
  var out = { matchId: ledger.matchId, rounds: [] };
  ledger.rounds.forEach(function(round){
    var v = vc.validate(round.declaration);
    if (round.legal === false){
      out.rounds.push({ index: round.index, verdict: "illegal", score: { witness: RULES.SCORE.illegalW, builder: 0 } });
      return;
    }
    var session = openHidden(v.compiled, function(){});
    (round.ledgerProbes || []).forEach(function(a){ session.probe(a); });
    if (!session.over() && round.events.some(function(e){ return e.type === "abstain"; })) session.abstain();
    if (!session.over()) session.abstain();
    var res = session._result();
    out.rounds.push({ index: round.index, verdict: res.verdict, probes: res.probes,
                      score: scoreRound(res.verdict, res.probes, v.compiled.par) });
  });
  return out;
}

module.exports = { version: RULES.version, RULES: RULES, playMatch: playMatch, replay: replay, openHidden: openHidden, _scoreRound: scoreRound };
