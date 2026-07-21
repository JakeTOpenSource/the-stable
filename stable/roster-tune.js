// The TUNE roster — free to iterate, no gate weight (Spec B, witness-suite/SPEC-B-holdout.md).
// This is the exact POOL/BUILDS/PLAYERS that Phase 3 (2026-07-15) and the /3 migration
// (2026-07-16) measured against; moved out of run-versus-balance.js unchanged so a human (or a
// future proposal loop) can keep exploring here without touching the frozen certify roster.
"use strict";

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

function prosemoney(spec){
  var nums = {}; var m; var re = /\$(\d+(?:\.\d+)?)/g;
  while ((m = re.exec(spec))) nums[parseFloat(m[1])] = true;
  return Object.keys(nums).map(Number).sort(function(a, b){ return a - b; });
}
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

module.exports = { POOL: POOL, BUILDS: BUILDS, PLAYERS: PLAYERS,
  rankedPlay: rankedPlay, specPlay: specPlay, quitPlay: quitPlay, flailPlay: flailPlay };
