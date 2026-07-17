// Witness Suite runner v0.2 — self-test + reference baselines. Deterministic; fuse-compatible
// output (prints N/N counts and GREEN, exits nonzero on any failure).
//
//   node run-witness-suite.js              -> self-test + baselines
//   node run-witness-suite.js --self-test  -> self-test only (the gate runs this)
"use strict";

var suite = require("./witness-suite.js");
var checks = 0, passes = 0, fails = [];
function check(name, ok, detail){
  checks++;
  if (ok) passes++;
  else fails.push(name + (detail ? " — " + detail : ""));
}

// ---- SELF-TEST: case integrity --------------------------------------------------------
// Seamed cases must break at the declared seam and NOWHERE else. Sound cases (the null
// round) must hold EVERYWHERE. A suite whose cases lie is worse than no suite.
suite._cases.forEach(function(c){
  if (c.seam !== null){
    var pm = c.promised(c.seam), tm = c.tool(c.seam);
    check(c.id + ": seam mismatches", !suite._isMatch(pm, tm),
          "promised " + pm + " tool " + tm + " at " + c.seam);

    var badAt = null;
    for (var a = Math.ceil(c.domain.min); a <= Math.floor(c.domain.max); a++){
      if (a === c.seam) continue;
      if (!suite._isMatch(c.promised(a), c.tool(a))) { badAt = a; break; }
    }
    check(c.id + ": integers hold off-seam", badAt === null, "unexpected mismatch at " + badAt);

    var badCent = null;
    c.special.forEach(function(s){
      [-0.01, 0.01, -0.5, 0.5].forEach(function(d){
        var x = Math.round((s + d) * 100) / 100;
        if (x < c.domain.min || x > c.domain.max) return;
        if (Math.abs(x - c.seam) < 0.005) return;
        if (!suite._isMatch(c.promised(x), c.tool(x))) badCent = x;
      });
    });
    check(c.id + ": cent neighbors hold off-seam", badCent === null, "unexpected mismatch at " + badCent);

    var seamSpecial = c.special.some(function(s){ return Math.abs(s - c.seam) < 0.005; });
    check(c.id + ": seam is a declared special place", seamSpecial);

    var s1 = suite.open(c.id);
    s1.probe(c.seam);
    var sc1 = s1.score();
    check(c.id + ": par is achievable", sc1.caught && sc1.probes === 1 && sc1.discipline === 1,
          JSON.stringify(sc1));
  } else {
    // sound case: no mismatch anywhere in the domain
    var bad = null;
    for (var b = Math.ceil(c.domain.min); b <= Math.floor(c.domain.max); b++){
      if (!suite._isMatch(c.promised(b), c.tool(b))) { bad = b; break; }
    }
    c.special.forEach(function(s){
      [-0.01, 0.01, -0.5, 0.5].forEach(function(d){
        var x = Math.round((s + d) * 100) / 100;
        if (x < c.domain.min || x > c.domain.max) return;
        if (!suite._isMatch(c.promised(x), c.tool(x))) bad = x;
      });
    });
    check(c.id + ": sound case holds everywhere", bad === null, "unexpected mismatch at " + bad);
    // v0.3.1: par IS the minimal cover's length (boundaries + distinct extremes + interior
    // points for uncovered regions) — derived, so it cannot drift from the coverage
    // definition. The minimal play must earn coverage 1.0 and a calibrated null at par.
    var minimal = suite._minimalCoverOf(c);
    var ms = suite.open(c.id);
    minimal.forEach(function(a){ ms.probe(a); });
    var msc = ms.abstain();
    check(c.id + ": par is the minimal-cover length and is achievable at par",
          suite._parOf(c) === minimal.length &&
          msc.probes === suite._parOf(c) && msc.coverage === 1 &&
          msc.verdict === "calibrated null" && msc.grade === "calibrated",
          JSON.stringify({ par: suite._parOf(c), probes: msc.probes, cov: msc.coverage, v: msc.verdict, g: msc.grade }));
  }
});

// ---- SELF-TEST: the scorer itself -----------------------------------------------------
// The verdicts must land where the doctrine says they land.
(function(){
  // A quitter abstains on a BROKEN case after one middle probe -> false pass (the worst outcome).
  var q = suite.open("threshold-discount");
  q.probe(75);
  var qs = q.abstain();
  check("scorer: quitter on broken case -> false pass", qs.verdict === "false pass", qs.verdict);

  // A lazy abstainer quits a sound case after one middle probe -> premature null.
  var l = suite.open("sound-bulk-discount");
  l.probe(50);
  var ls = l.abstain();
  check("scorer: lazy abstain on sound case -> premature null", ls.verdict === "premature null", ls.verdict);

  // A session that abstains is closed to further probes.
  var closed = l.probe(100);
  check("scorer: abstained session is closed", !!(closed && closed.error));

  // A disciplined reader on a sound case -> calibrated null at par, coverage 1.
  // (v0.3.1 minimal cover for bulk-discount: boundary $100 + extremes $1/$200, whose probes
  //  also cover their regions. Probing all 5 special integers would still earn coverage 1
  //  but grade "calibrated, the long way" — redundant hits.)
  var r = suite.open("sound-bulk-discount");
  [100, 1, 200].forEach(function(a){ r.probe(a); });
  var rs = r.abstain();
  check("scorer: earned abstention -> calibrated null", rs.verdict === "calibrated null" && rs.coverage === 1, JSON.stringify({v:rs.verdict,c:rs.coverage}));
  check("scorer: calibrated at par", rs.grade === "calibrated", rs.grade);

  // v0.3.1 REGRESSION — the 2-cent cluster (red-team, 2026-07-16): probing only the boundary
  // neighborhood must NOT earn a calibrated null; the extremes are targets it never touched.
  var g = suite.open("sound-bulk-discount");
  [99.99, 100, 100.01].forEach(function(a){ g.probe(a); });
  var gs = g.abstain();
  check("scorer: boundary-hugging cluster does not earn its emptiness",
        gs.verdict === "premature null" && gs.coverage < 1,
        JSON.stringify({v:gs.verdict,c:gs.coverage}));

  // Catching still terminal: abstain after a catch does not overwrite the catch.
  var w = suite.open("threshold-discount");
  w.probe(50); w.abstain();
  check("scorer: catch is not overwritten by abstain", w.score().verdict === "caught", w.score().verdict);

  // Protocol events are counted (the Tilt Sensor's raw material).
  var ev = suite.open("sound-tax-total");
  ev.probe(9999); ev.probe(100); ev.abstain(); ev.probe(1);
  var evs = ev.score().events;
  check("scorer: out-of-domain attempts counted", evs.outOfDomain === 1, JSON.stringify(evs));
  check("scorer: post-abstain attempts counted", evs.postAbstain === 1, JSON.stringify(evs));
})();

// ---- BASELINES: the metrics must separate reader / flailer / quitter -------------------
function readerPlayer(caseId){
  // A DISCIPLINED reader (v0.3.1): plays the minimal cover — boundaries first (seams live
  // there), then extremes, then interior points for uncovered regions — abstaining when the
  // targets are covered. Catches seams early, earns nulls at par.
  var s = suite.open(caseId);
  var c = null; suite._cases.forEach(function(x){ if (x.id === caseId) c = x; });
  var plan = suite._minimalCoverOf(c);
  for (var i = 0; i < plan.length; i++){
    var r = s.probe(plan[i]);
    if (r && !r.match) return s.score();
  }
  return s.abstain();
}
function flailerPlayer(caseId){
  // seeded pseudo-random integer probes (deterministic LCG), cap 300, never abstains
  var s = suite.open(caseId);
  var c = null; suite._cases.forEach(function(x){ if (x.id === caseId) c = x; });
  var state = 20260714;
  function next(){ state = (state * 1103515245 + 12345) % 2147483648; return state / 2147483648; }
  for (var i = 0; i < 300; i++){
    var a = Math.floor(c.domain.min + next() * (c.domain.max - c.domain.min + 1));
    var r = s.probe(a);
    if (r && !r.match) break;
  }
  return s.score();
}

var selfTestOnly = process.argv.indexOf("--self-test") >= 0;
if (!selfTestOnly){
  console.log("case                     player   verdict            probes  par  discipline  coverage  grade");
  suite._cases.forEach(function(c){
    [["reader ", readerPlayer], ["flailer", flailerPlayer]].forEach(function(pl){
      var sc = pl[1](c.id);
      console.log(
        (c.id + "                         ").slice(0, 25) + pl[0] + "  " +
        (sc.verdict + "                  ").slice(0, 17) + "  " +
        (sc.probes + "    ").slice(0, 5) + "  " + suite._parOf(c) + "    " +
        sc.discipline.toFixed(2) + "        " + sc.coverage.toFixed(2) + "      " + sc.grade);
    });
    var rd = readerPlayer(c.id), fl = flailerPlayer(c.id);
    if (c.seam !== null){
      check(c.id + ": reader catches with full discipline", rd.verdict === "caught" && rd.discipline === 1);
      check(c.id + ": metric separates flailer from reader", fl.verdict === "caught" ? fl.probes > suite._parOf(c) : true);
    } else {
      check(c.id + ": reader earns a calibrated null", rd.verdict === "calibrated null" && rd.grade === "calibrated");
      check(c.id + ": flailer never concludes on sound case", fl.verdict === "open");
    }
  });
  console.log("");
}

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " suite integrity break(s):");
  fails.forEach(function(f){ console.log("  ✗ " + f); });
  process.exit(1);
}
console.log("GREEN — seamed cases break only at their seams; sound cases hold everywhere; verdicts land per doctrine; metrics discriminate.");
process.exit(0);
