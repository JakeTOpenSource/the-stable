// Versus Table balance — TUNE + CERTIFY (Spec B, witness-suite/SPEC-B-holdout.md, built 2026-07-21).
//   node run-versus-balance.js              -> full tournament table + both blocks
//   node run-versus-balance.js --self-test  -> both blocks only (the gate runs this)
//
// TUNE: the original Phase-3 roster (stable/roster-tune.js), free to iterate, INFORMATIONAL
// ONLY. Its 9 invariants are unchanged from the pre-Spec-B file; three of them (the finding is
// the crown, replay/determinism, bounded cabinet economics) test the ENGINE, not this specific
// roster — they are not re-homed into CERTIFY because stable/run-versus-match.js's own
// self-test (already, separately, unconditionally gate-wired) already covers exactly those
// engine properties. Demoting TUNE to informational therefore loses no real gate coverage.
//
// CERTIFY: a roster GENERATED from a grammar (stable/roster-certify.js), frozen, never seen by
// the tuning process (disjointness enforced below, not assumed). GATES. Requires: for every
// policy in the generated grid, the fair-builder pool scores at least as high as the
// defensive/sound-heavy pool against that policy — "score" operationalized (Jake, 2026-07-21)
// as each pool's summed BUILDER-side points (vm._scoreRound, the same scoring function used
// everywhere else) across its 3 declarations, driven by the policy via playAgainst(compiled,
// session) — a white-box call (compiled.par visible) rather than the spec's literal
// witness(session)-only shape; see roster-certify.js's header for why. This is the whole point
// of the hold-out: if the ratified knob doesn't generalize to players it was never fit to, this
// block reports it plainly and the gate goes red — that is enforcement working, not a broken
// instrument (Jake directed, 2026-07-21: build it and let a red CERTIFY be the first finding).
"use strict";

var path = require("path");
var vc = require(path.join(__dirname, "versus-compiler.js"));
var vm = require(path.join(__dirname, "versus-match.js"));
var rosterTune = require(path.join(__dirname, "roster-tune.js"));
var rosterCertify = require(path.join(__dirname, "roster-certify.js"));

var checks = 0, passes = 0, fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

// ---- disjointness: enforced at load, not assumed (Spec B's own rename-guard requirement) ----
(function assertDisjoint(){
  var tuneById = {};
  Object.keys(rosterTune.POOL).forEach(function(k){ tuneById[rosterTune.POOL[k].id] = rosterTune.POOL[k]; });
  var certifyById = {};
  Object.keys(rosterCertify.CERTIFY_POOL).forEach(function(k){ certifyById[rosterCertify.CERTIFY_POOL[k].id] = rosterCertify.CERTIFY_POOL[k]; });
  var sharedIds = Object.keys(tuneById).filter(function(id){ return id in certifyById; });
  if (sharedIds.length) throw new Error("Spec B disjointness violated: shared declaration id(s): " + sharedIds.join(", "));
  // Content comparison MUST strip id first — otherwise a decl renamed to a certify-style id
  // with byte-identical clauses/domain/deviation would sail past this check (the id-check above
  // already caught the id match; this branch exists specifically for the rename-around-identical-
  // content attack the spec calls out, so it cannot itself compare on id). Verified by adversarial
  // test (2026-07-21 pre-ship review): a tune declaration copied verbatim under a new certify-
  // style id used to pass silently; stripping id here catches it.
  function canonSansId(d){ var c = {}; Object.keys(d).forEach(function(k){ if (k !== "id") c[k] = d[k]; }); return rosterCertify.canon(c); }
  var tuneCanonToId = {};
  Object.keys(tuneById).forEach(function(id){ tuneCanonToId[canonSansId(tuneById[id])] = id; });
  var contentClash = null;
  Object.keys(certifyById).forEach(function(id){
    var c = canonSansId(certifyById[id]);
    if (tuneCanonToId[c]) contentClash = id + " is byte-identical (by content, ignoring id) to tune's " + tuneCanonToId[c];
  });
  if (contentClash) throw new Error("Spec B disjointness violated: " + contentClash);
})();

// ============================================================================================
// TUNE block — unchanged from the pre-Spec-B file, sourced from roster-tune.js. Informational.
// ============================================================================================
var PLAYERS = rosterTune.PLAYERS;
var totals = {}, wins = {}, probeSpend = {};
PLAYERS.forEach(function(p){ totals[p.name] = 0; wins[p.name] = 0; probeSpend[p.name] = 0; });
var matches = [];
for (var i = 0; i < PLAYERS.length; i++){
  for (var j = i + 1; j < PLAYERS.length; j++){
    var led = vm.playMatch("t-" + PLAYERS[i].name + "-vs-" + PLAYERS[j].name, PLAYERS[i], PLAYERS[j]);
    matches.push(led);
    totals[PLAYERS[i].name] += led.totals[PLAYERS[i].name];
    totals[PLAYERS[j].name] += led.totals[PLAYERS[j].name];
    probeSpend[PLAYERS[i].name] += led.probesTotal[PLAYERS[i].name];
    probeSpend[PLAYERS[j].name] += led.probesTotal[PLAYERS[j].name];
    wins[led.winner]++;
  }
}

if (process.argv.indexOf("--self-test") < 0){
  console.log("=== TUNE roster (informational) ===");
  console.log("player            total    wins   probes");
  PLAYERS.map(function(p){ return p.name; })
    .sort(function(a, b){ return totals[b] - totals[a]; })
    .forEach(function(n){
      console.log((n + "                  ").slice(0, 17) +
        (Math.round(totals[n] * 10) / 10 + "       ").slice(0, 8) +
        (wins[n] + "      ").slice(0, 6) + " " + probeSpend[n]);
    });
  console.log("");
}

var tuneChecks = 0, tunePasses = 0, tuneFails = [];
function tuneCheck(name, ok, detail){ tuneChecks++; if (ok) tunePasses++; else tuneFails.push(name + (detail ? " — " + detail : "")); }

tuneCheck("skill orders outcomes: ranked > spec > quitter/flailer",
      totals.rankedFair > totals.specFair &&
      totals.specFair > Math.max(totals.quitFair, totals.flailFair),
      JSON.stringify(totals));
tuneCheck("defense does not dominate: rankedFair >= rankedDefensive",
      totals.rankedFair >= totals.rankedDefensive,
      totals.rankedFair + " vs " + totals.rankedDefensive);
tuneCheck("rule-breaking never pays: rankedGreedy < rankedDefensive",
      totals.rankedGreedy < totals.rankedDefensive,
      totals.rankedGreedy + " vs " + totals.rankedDefensive);
(function(){
  var maxB = 0, findingSeen = false;
  matches.forEach(function(m){ m.rounds.forEach(function(r){
    if (r.score && r.score.builder > maxB) maxB = r.score.builder;
    if (r.verdict === "false pass") findingSeen = true;
  }); });
  tuneCheck("the finding is the top builder prize (" + vm.RULES.SCORE.findingB + ")",
        maxB <= vm.RULES.SCORE.findingB, "max builder round score " + maxB);
  tuneCheck("weak witnesses concede findings (false passes occur in the tournament)", findingSeen);
})();
(function(){
  var worst = 0;
  matches.forEach(function(m){ m.rounds.forEach(function(r){
    if (r.witness === "flailFair" && r.legal && r.probes > worst) worst = r.probes;
  }); });
  tuneCheck("surge holds in tournament: flailer folds back within grace + 2x grace", worst <= 3 * vm.RULES.SURGE_GRACE_PROBES, "worst " + worst);
})();
(function(){
  var bad = null;
  matches.forEach(function(m){ m.rounds.forEach(function(r){
    if ((r.witness === "rankedFair" || r.witness === "specFair") && r.legal &&
        (r.verdict === "open" || r.verdict === "tripped")) bad = r.witness + "@" + m.matchId;
  }); });
  tuneCheck("readers always conclude (catch or earned abstention)", bad === null, bad);
})();
tuneCheck("ranked reading is cheaper than ascending reading", probeSpend.rankedFair < probeSpend.specFair,
      probeSpend.rankedFair + " vs " + probeSpend.specFair);
(function(){
  var m0 = matches[0];
  var rep = vm.replay(m0);
  var same = rep.rounds.every(function(rr, k){
    var live = m0.rounds[k];
    if (live.legal === false) return rr.verdict === "illegal";
    return rr.verdict === live.verdict && rr.probes === live.probes;
  });
  tuneCheck("tournament matches replay exactly", same);
  var again = vm.playMatch(m0.matchId, PLAYERS[0], PLAYERS[1]);
  tuneCheck("tournament is deterministic", JSON.stringify(again) === JSON.stringify(m0));
})();
(function(){
  var worst = 0;
  matches.forEach(function(m){
    var t = 0; Object.keys(m.probesTotal).forEach(function(k){ t += m.probesTotal[k]; });
    if (t > worst) worst = t;
  });
  tuneCheck("cabinet economics: worst match probe total within bounds",
        worst <= vm.RULES.ROUNDS * vm.RULES.PROBE_CAP, "worst " + worst);
})();

// TUNE is informational: fold its checks into the overall count for visibility, but a TUNE
// failure alone does not flip the process exit code — CERTIFY does that (see below). The
// printed line below deliberately avoids the bare token "FAIL" so an informational miss here
// cannot be mistaken by a naive log-grep for the gate's own verdict.
console.log("TUNE: " + (tuneFails.length === 0 ? "GREEN" : "not all invariants hold") +
  " (" + tunePasses + "/" + tuneChecks + ")");
if (tuneFails.length) tuneFails.forEach(function(f){ console.log("  (tune, informational) " + f); });
checks += tuneChecks; passes += tunePasses;

// ============================================================================================
// CERTIFY block — the hold-out. GATES.
// ============================================================================================
function poolTotalAgainst(build, policy){
  var total = 0;
  build.forEach(function(decl){
    var v = vc.validate(decl);
    if (!v.legal) throw new Error("certify declaration illegal: " + decl.id + " — " + (v.reasons || []).join("; "));
    var session = vm.openHidden(v.compiled, function(){});
    policy.playAgainst(v.compiled, session);
    if (!session.over()) session.abstain();
    var res = session._result();
    var sc = vm._scoreRound(res.verdict, res.probes, v.compiled.par);
    total += sc.builder;
  });
  return Math.round(total * 10) / 10;
}

var certifyViolations = [];
var worstGap = -Infinity, worstPolicyId = null, worstFair = null, worstDef = null;
rosterCertify.GRID.forEach(function(policy){
  var fairTotal = poolTotalAgainst(rosterCertify.CERTIFY_BUILDS.fair, policy);
  var defTotal = poolTotalAgainst(rosterCertify.CERTIFY_BUILDS.defensive, policy);
  var gap = defTotal - fairTotal;
  if (gap > 0) certifyViolations.push({ id: policy.id, fair: fairTotal, defensive: defTotal, gap: Math.round(gap * 10) / 10 });
  if (gap > worstGap){ worstGap = gap; worstPolicyId = policy.id; worstFair = fairTotal; worstDef = defTotal; }
});

check("CERTIFY: fair pool scores >= defensive pool against every one of the " + rosterCertify.GRID.length + " generated policies",
      certifyViolations.length === 0,
      certifyViolations.length + " violation(s); worst is " + worstPolicyId + " (fair " + worstFair + " vs defensive " + worstDef + ", gap " + Math.round(worstGap * 10) / 10 + ")");

var certifyGreen = certifyViolations.length === 0;
console.log("CERTIFY: " + (certifyGreen ? "GREEN" : "FAIL") +
  " — " + (rosterCertify.GRID.length - certifyViolations.length) + "/" + rosterCertify.GRID.length + " generated policies hold" +
  (certifyGreen ? "" : "; worst violation: " + worstPolicyId + " (fair " + worstFair + " vs defensive " + worstDef + ", defense wins by " + Math.round(worstGap * 10) / 10 + ")"));
if (!certifyGreen && certifyViolations.length > 1){
  console.log("  (" + (certifyViolations.length - 1) + " more violation(s) not printed individually — see certifyViolations in a debugger/require() for the full list)");
}

console.log("checks: " + passes + "/" + checks + " hold");
if (!certifyGreen){
  console.log("CERTIFY FAIL — the ratified knob does not generalize to the held-out policy grid. This is Spec B working as designed: no knob ships unless it holds on players it was never fit to.");
  process.exit(1);
}
if (fails.length){
  console.log("FAIL — " + fails.length + " balance break(s):");
  fails.forEach(function(f){ console.log("  ✗ " + f); });
  process.exit(1);
}
console.log("GREEN — TUNE informational, CERTIFY holds on the held-out policy grid: the game is fair enough to seat real agents, and the fairness generalizes beyond the roster it was tuned on.");
process.exit(0);
