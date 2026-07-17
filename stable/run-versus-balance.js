// Versus Table Phase 3 — balance validation. Deterministic; fuse-compatible output.
//   node run-versus-balance.js              -> tournament table + invariants
//   node run-versus-balance.js --self-test  -> invariants only (the gate runs this)
//
// The knobs (weights, quota, cap, trip) are validated by MEASUREMENT, not cold-read:
// scripted players of graded skill play a full round-robin; the game is balanced iff the
// invariants hold. Any knob change that breaks an invariant turns the gate red — the
// game's fairness is itself corpus-gated. No real agent sits down before this is green.
"use strict";

var path = require("path");
var vm = require(path.join(__dirname, "versus-match.js"));

var checks = 0, passes = 0, fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

// ---- declaration pools ---------------------------------------------------------------------
var POOL = {
  seamThreshold: { id: "disc", domain: { min: 1, max: 200 },
    clauses: [ { type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } } ],
    deviation: { clauseIndex: 0, flip: "opStrict" } },
  seamNamed: { id: "cart", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ],
    deviation: { clauseIndex: 0, flip: "unwritten" } },
  seamCeiling: { id: "gift", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "hiExclusive" } },
  seamFloor: { id: "gift-lo", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "loExclusive" } },
  soundCart: { id: "cart-sound", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ],
    deviation: null },
  soundGift: { id: "gift-sound", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ], deviation: null }
};
var BUILDS = {
  fair:      [POOL.seamThreshold, POOL.seamNamed, POOL.seamCeiling],
  varied:    [POOL.seamFloor, POOL.seamThreshold, POOL.seamNamed],
  defensive: [POOL.soundCart, POOL.soundGift, POOL.seamCeiling],   // max quota: 2 sound + 1 seamed
  greedy:    [POOL.soundCart, POOL.soundGift, POOL.soundGift]      // 3 sound: the third forfeits
};

// ---- witness strategies, graded by skill ----------------------------------------------------
function prosemoney(spec){
  var nums = {}; var m; var re = /\$(\d+(?:\.\d+)?)/g;
  while ((m = re.exec(spec))) nums[parseFloat(m[1])] = true;
  return Object.keys(nums).map(Number).sort(function(a, b){ return a - b; });
}
// Ranked: exact spec-named values FIRST (seams in this grammar always sit on a named value),
// then neighbors and domain ends to earn abstention coverage on sound cases.
function rankedPlay(session){
  var exact = prosemoney(session.spec).filter(function(v){ return v >= session.domain.min && v <= session.domain.max; });
  for (var i = 0; i < exact.length; i++){
    var r = session.probe(exact[i]);
    if (r && (r.roundOver || r.match === false)) return;
  }
  var rest = {};
  prosemoney(session.spec).forEach(function(n){ [n - 1, n + 1].forEach(function(v){ rest[v] = true; }); });
  rest[session.domain.min] = true; rest[session.domain.max] = true;
  var list = Object.keys(rest).map(Number)
    .filter(function(v){ return v >= session.domain.min && v <= session.domain.max && exact.indexOf(v) < 0; })
    .sort(function(a, b){ return a - b; });
  for (var j = 0; j < list.length; j++){
    var r2 = session.probe(list[j]);
    if (r2 && (r2.roundOver || r2.match === false)) return;
  }
  session.abstain();
}
// Spec reader: everything ascending (exact + neighbors + ends) — competent, unranked.
function specPlay(session){
  var cands = {};
  prosemoney(session.spec).forEach(function(n){ [n - 1, n, n + 1].forEach(function(v){ cands[v] = true; }); });
  cands[session.domain.min] = true; cands[session.domain.max] = true;
  var list = Object.keys(cands).map(Number)
    .filter(function(v){ return v >= session.domain.min && v <= session.domain.max; })
    .sort(function(a, b){ return a - b; });
  for (var i = 0; i < list.length; i++){
    var r = session.probe(list[i]);
    if (r && (r.roundOver || r.match === false)) return;
  }
  session.abstain();
}
function quitPlay(session){
  session.probe(Math.round((session.domain.min + session.domain.max) / 2) + 0.37);
  session.abstain();
}
function flailPlay(session){
  var st = 20260714;
  function nx(){ st = (st * 1103515245 + 12345) % 2147483648; return st / 2147483648; }
  while (!session.over()){
    var r = session.probe(Math.floor(session.domain.min + nx() * (session.domain.max - session.domain.min + 1)) + 0.37);
    if (r && r.roundOver) return;
  }
}

function P(name, buildKey, witnessFn){
  var pool = BUILDS[buildKey];
  return { name: name, build: function(r){ return pool[Math.floor(r / 2) % pool.length]; }, witness: witnessFn };
}
var PLAYERS = [
  P("rankedFair", "fair", rankedPlay),
  P("specFair", "varied", specPlay),
  P("quitFair", "fair", quitPlay),
  P("flailFair", "varied", flailPlay),
  P("rankedDefensive", "defensive", rankedPlay),
  P("rankedGreedy", "greedy", rankedPlay)
];

// ---- round-robin tournament ------------------------------------------------------------------
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

// ---- balance invariants (the game's own corpus) ----------------------------------------------
// 1. skill orders outcomes among fair-building witnesses
check("skill orders outcomes: ranked > spec > quitter/flailer",
      totals.rankedFair > totals.specFair &&
      totals.specFair > Math.max(totals.quitFair, totals.flailFair),
      JSON.stringify(totals));

// 2. sound-spam is not dominant: fair building beats defensive building at equal witness skill
check("defense does not dominate: rankedFair >= rankedDefensive",
      totals.rankedFair >= totals.rankedDefensive,
      totals.rankedFair + " vs " + totals.rankedDefensive);

// 3. rule-breaking never pays: greedy (quota-breaker) < defensive (legal max defense)
check("rule-breaking never pays: rankedGreedy < rankedDefensive",
      totals.rankedGreedy < totals.rankedDefensive,
      totals.rankedGreedy + " vs " + totals.rankedDefensive);

// 4. the finding is the crown: no single-round builder outcome exceeds a false pass
(function(){
  var maxB = 0, findingSeen = false;
  matches.forEach(function(m){ m.rounds.forEach(function(r){
    if (r.score && r.score.builder > maxB) maxB = r.score.builder;
    if (r.verdict === "false pass") findingSeen = true;
  }); });
  check("the finding is the top builder prize (" + vm.RULES.SCORE.findingB + ")",
        maxB <= vm.RULES.SCORE.findingB, "max builder round score " + maxB);
  check("weak witnesses concede findings (false passes occur in the tournament)", findingSeen);
})();

// 5. the surge protector holds in tournament play. 0.3 recalibration: flailers now fold back
// via the STALL trip (no new target for 2x grace) rather than the Gamma trip, so the bound is
// grace + 2x grace — still well under the 25 cap (measured worst: 16).
(function(){
  var worst = 0;
  matches.forEach(function(m){ m.rounds.forEach(function(r){
    if (r.witness === "flailFair" && r.legal && r.probes > worst) worst = r.probes;
  }); });
  check("surge holds in tournament: flailer folds back within grace + 2x grace", worst <= 3 * vm.RULES.SURGE_GRACE_PROBES, "worst " + worst);
})();

// 6. strong witnesses always conclude: no ranked/spec round ends open or tripped
(function(){
  var bad = null;
  matches.forEach(function(m){ m.rounds.forEach(function(r){
    if ((r.witness === "rankedFair" || r.witness === "specFair") && r.legal &&
        (r.verdict === "open" || r.verdict === "tripped")) bad = r.witness + "@" + m.matchId;
  }); });
  check("readers always conclude (catch or earned abstention)", bad === null, bad);
})();

// 7. ranked skill shows as probe economy: ranked spends fewer probes than spec overall
check("ranked reading is cheaper than ascending reading", probeSpend.rankedFair < probeSpend.specFair,
      probeSpend.rankedFair + " vs " + probeSpend.specFair);

// 8. determinism: replaying the first match reproduces it; re-running it agrees byte-for-byte
(function(){
  var m0 = matches[0];
  var rep = vm.replay(m0);
  var same = rep.rounds.every(function(rr, k){
    var live = m0.rounds[k];
    if (live.legal === false) return rr.verdict === "illegal";
    return rr.verdict === live.verdict && rr.probes === live.probes;
  });
  check("tournament matches replay exactly", same);
  var again = vm.playMatch(m0.matchId, PLAYERS[0], PLAYERS[1]);
  check("tournament is deterministic", JSON.stringify(again) === JSON.stringify(m0));
})();

// 9. every match is bounded (cabinet economics): no match exceeds ROUNDS * CAP probes
(function(){
  var worst = 0;
  matches.forEach(function(m){
    var t = 0; Object.keys(m.probesTotal).forEach(function(k){ t += m.probesTotal[k]; });
    if (t > worst) worst = t;
  });
  check("cabinet economics: worst match probe total within bounds",
        worst <= vm.RULES.ROUNDS * vm.RULES.PROBE_CAP, "worst " + worst);
})();

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " balance break(s):");
  fails.forEach(function(f){ console.log("  ✗ " + f); });
  process.exit(1);
}
console.log("GREEN — skill orders outcomes; defense and rule-breaking do not dominate; the finding is the crown; the game is fair enough to seat real agents.");
process.exit(0);
