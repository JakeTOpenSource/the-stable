// Phase 4 on the TABLE — run a real agent's witness plans through the migrated match harness
// (compiler 0.2 / scale 0.3, region+extremes target model). Hidden information, anonymized:
// the agent sees round labels r1..r6 with spec prose + domain ONLY. Ids like "cart-sound"
// would leak soundness out-of-band, so the labels carry nothing. Two rounds may share
// identical prose with different hidden implementations — that uncertainty is the game.
//   node play-versus.js --specs        -> the hidden-info view (all an agent may see)
//   node play-versus.js <plans.json>   -> score every agent in the file + scripted baselines
// plans.json: { "<agent>": { "r1": { "probes": [..], "thenAbstain": true }, ... }, ... }
"use strict";
const path = require("path");
const fs = require("fs");
const vc = require(path.join(__dirname, "..", "stable", "versus-compiler.js"));
const vm = require(path.join(__dirname, "..", "stable", "versus-match.js"));

// The reference facing-set a tournament witness meets: four seamed builds + two sound
// (the legal defensive maximum) — same declarations the balance tournament plays.
const DECLS = [
  { id: "disc", domain: { min: 1, max: 200 },
    clauses: [ { type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } } ],
    deviation: { clauseIndex: 0, flip: "opStrict" } },
  { id: "cart", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ],
    deviation: { clauseIndex: 0, flip: "unwritten" } },
  { id: "gift", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "hiExclusive" } },
  { id: "gift-lo", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "loExclusive" } },
  { id: "cart-sound", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ],
    deviation: null },
  { id: "gift-sound", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ], deviation: null }
];
const ROUNDS = DECLS.map(function(d, i){
  const v = vc.validate(d);
  if (!v.legal) throw new Error(d.id + " illegal: " + v.reasons.join("; "));
  return { label: "r" + (i + 1), id: d.id, compiled: v.compiled };
});

if (process.argv.includes("--specs")) {
  console.log(JSON.stringify(ROUNDS.map(r => ({
    round: r.label, spec: r.compiled.spec, domain: r.compiled.domain
  })), null, 1));
  process.exit(0);
}

// ---- scripted baselines (the balance tournament's graded witnesses, verbatim) -------------
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

// ---- run one witness (committed plan or scripted fn) through all six rounds ---------------
function runPlan(c, plan){
  const session = vm.openHidden(c, function(){});
  for (const a of (plan.probes || [])){
    const r = session.probe(a);
    if (r && r.roundOver) break;
  }
  if (!session.over()) session.abstain();   // a witness that walks away has abstained (harness rule)
  return session._result();
}
function runFn(c, fn){
  const session = vm.openHidden(c, function(){});
  fn(session);
  if (!session.over()) session.abstain();
  return session._result();
}
function scoreAll(runner){
  let W = 0, B = 0;
  const rows = ROUNDS.map(r => {
    const res = runner(r.compiled);
    const sc = vm._scoreRound(res.verdict, res.probes, r.compiled.par);
    W += sc.witness; B += sc.builder;
    return { round: r.label, id: r.id, verdict: res.verdict, probes: res.probes,
             par: r.compiled.par, coverage: res.coverage, W: sc.witness, B: sc.builder };
  });
  return { rows, witnessTotal: Math.round(W * 10) / 10, concededToBuilders: Math.round(B * 10) / 10 };
}

const plansPath = process.argv[2];
if (!plansPath) { console.log("usage: node play-versus.js <plans.json>  (or --specs)"); process.exit(1); }
const plans = JSON.parse(fs.readFileSync(plansPath, "utf8"));

const results = {};
for (const agent of Object.keys(plans)){
  results[agent] = scoreAll(c => runPlan(c, plans[agent][ROUNDS.find(r => r.compiled === c).label] || {}));
}
results["ranked (script)"] = scoreAll(c => runFn(c, rankedPlay));
results["spec (script)"]   = scoreAll(c => runFn(c, specPlay));
results["quit (script)"]   = scoreAll(c => runFn(c, quitPlay));
results["flail (script)"]  = scoreAll(c => runFn(c, flailPlay));

console.log("=== witness-side discrimination on the MIGRATED table (scale " + vm.RULES.version + ") ===\n");
for (const name of Object.keys(results)){
  const r = results[name];
  console.log(name.padEnd(16) + " witness " + String(r.witnessTotal).padEnd(7) +
    " conceded " + String(r.concededToBuilders).padEnd(6) + " | " +
    r.rows.map(x => x.verdict.replace("calibrated null","cal-null").replace("premature null","premature") + "@" + x.probes).join(", "));
}
console.log("\nper-round detail (verdict probes/par cov):");
console.log("round".padEnd(7) + Object.keys(results).map(n => n.slice(0,12).padEnd(14)).join(""));
ROUNDS.forEach((r, i) => {
  console.log(r.label.padEnd(7) + Object.keys(results).map(n => {
    const x = results[n].rows[i];
    return (x.verdict.slice(0,7) + " " + x.probes + "/" + x.par).padEnd(14);
  }).join(""));
});
