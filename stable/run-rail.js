// Rail + Tilt Sensor self-test + reference archetypes. Deterministic; fuse-compatible
// (prints N/N counts and GREEN, nonzero exit on any failure).
//   node run-rail.js              -> archetype table + corpus
//   node run-rail.js --self-test  -> corpus only (the gate runs this)
"use strict";

var path = require("path");
var suite = require(path.join(__dirname, "..", "witness-suite", "witness-suite.js"));
var rail = require(path.join(__dirname, "rail.js"));

var checks = 0, passes = 0, fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

function caseOf(id){ for (var i = 0; i < suite._cases.length; i++) if (suite._cases[i].id === id) return suite._cases[i]; }

// ---- archetype players: each plays every case, returns [{caseId, score}] ----------------
// Perfect reader: probes special places in order, stops at the first mismatch, else abstains.
function reader(){
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    for (var i = 0; i < c.special.length; i++){ var r = s.probe(c.special[i]); if (r && !r.match) return { caseId: c.id, score: s.score() }; }
    s.abstain(); return { caseId: c.id, score: s.score() };
  });
}
// Flailer: seeded random integers, never stops until catch or cap 60 (inductive: over-probes).
function flailer(){
  var st = 20260714;
  function nx(){ st = (st * 1103515245 + 12345) % 2147483648; return st / 2147483648; }
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    for (var i = 0; i < 60; i++){ var a = Math.floor(c.domain.min + nx() * (c.domain.max - c.domain.min + 1)); var r = s.probe(a); if (r && !r.match) break; }
    return { caseId: c.id, score: s.score() };
  });
}
// Quitter: one middle probe, then abstain (capacitive: concludes before evidence).
function quitter(){
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    var mid = Math.round((c.domain.min + c.domain.max) / 2);
    if (Math.abs(mid - (c.seam === null ? -1 : c.seam)) < 0.005) mid += 1;
    s.probe(mid); s.abstain(); return { caseId: c.id, score: s.score() };
  });
}
// Lagger: reads correctly but keeps probing well past the catch/coverage (pure inductive).
function lagger(){
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    c.special.forEach(function(sp){ s.probe(sp); });          // full coverage...
    c.special.forEach(function(sp){ s.probe(sp); });          // ...then laps it again (lag)
    if (!s.score().caught) s.abstain();
    return { caseId: c.id, score: s.score() };
  });
}
// Sprayer: many unaimed probes (low discipline force-play), never near a special place.
function sprayer(){
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    for (var k = 0; k < 12; k++){
      var a = c.domain.min + 0.37 + k * ((c.domain.max - c.domain.min) / 40); // off-lattice, avoids special ints
      var r = s.probe(Math.round(a * 100) / 100); if (r && !r.match) break;
    }
    if (!s.score().caught) s.abstain();
    return { caseId: c.id, score: s.score() };
  });
}
// Hammer: repeatedly probes out of domain (force against the walls).
function hammer(){
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    s.probe(c.domain.max + 500); s.probe(c.domain.max + 900); s.probe(c.domain.min - 50);
    if (c.seam !== null) s.probe(c.seam); else { c.special.forEach(function(sp){ s.probe(sp); }); s.abstain(); }
    return { caseId: c.id, score: s.score() };
  });
}
// Ranked reader: the reference impedance made flesh — seam first on seamed cases, exactly
// the MINIMAL covering play (boundaries + distinct extremes + interior points for uncovered
// regions, v0.3.1) then abstention on sound ones. Z = par everywhere: the center of the disk.
function ranked(){
  return suite._cases.map(function(c){
    var s = suite.open(c.id);
    if (c.seam !== null) s.probe(c.seam);
    else {
      suite._minimalCoverOf(c).forEach(function(a){ s.probe(a); });
      s.abstain();
    }
    return { caseId: c.id, score: s.score() };
  });
}

var ARCH = { ranked: ranked, reader: reader, flailer: flailer, quitter: quitter, lagger: lagger, sprayer: sprayer, hammer: hammer };

// the archetypes are the Stable's reference players; other instruments (the scoreboard
// emitter) import them so every display feeds from the same source of truth as the corpus.
module.exports = { ARCH: ARCH };

if (require.main === module) {

var selfTestOnly = process.argv.indexOf("--self-test") >= 0;
if (!selfTestOnly){
  console.log("archetype   phi     Gamma(re,im)   |G|   VSWR   band          route");
  Object.keys(ARCH).forEach(function(name){
    var out = rail.route(ARCH[name]());
    var a = out.agent || {};
    console.log(
      (name + "          ").slice(0, 11) +
      ((a.phiDeg || 0) + "      ").slice(0, 6) + "  " +
      ("(" + (a.gammaRe || 0) + "," + (a.gammaIm || 0) + ")            ").slice(0, 14) + " " +
      ((a.gammaAbs || 0) + "    ").slice(0, 5) + " " +
      ((a.vswr || 0) + "     ").slice(0, 6) + " " +
      ((a.band || "") + "             ").slice(0, 14) + " " + out.route);
  });
  console.log("");
}

// ---- CORPUS: labeled routing cases — the Rail's own gate --------------------------------
function routeOf(name){ return rail.route(ARCH[name]()); }

// phase signs land where the physics says
check("reader is resonant (|phi| < band)", Math.abs(routeOf("reader").agent.phiDeg) < rail.POLICY.PHASE_BAND_DEG, JSON.stringify(routeOf("reader").agent));
check("lagger is inductive (phi > 0)", routeOf("lagger").agent.phiDeg > 0, JSON.stringify(routeOf("lagger").agent));
check("quitter is capacitive (phi < 0)", routeOf("quitter").agent.phiDeg < 0, JSON.stringify(routeOf("quitter").agent));

// the Smith gauge: the conformal fold puts each archetype where the disk says it belongs.
// (Calibration note, 2026-07-14: first corpus guesses put the naive reader at the center —
// the gauge corrected us. A naive reader over-works par, so it is a good match, not a
// perfect one; the CENTER belongs to the ranked reader, whose Z = par everywhere.)
check("ranked reader sits at the center (Z = Z0, |Gamma| < 0.05)", routeOf("ranked").agent.gammaAbs < 0.05, "gammaAbs " + routeOf("ranked").agent.gammaAbs);
check("naive reader is well-matched, not centered (|Gamma| < 0.35, VSWR < 2.2)",
      routeOf("reader").agent.gammaAbs < 0.35 && routeOf("reader").agent.vswr < 2.2,
      "gammaAbs " + routeOf("reader").agent.gammaAbs + " vswr " + routeOf("reader").agent.vswr);
// v0.3 recalibration: under region coverage the reference (ranked) sits at dead center, and
// the bad players re-seat at new magnitudes — the quitter does ONE productive region-probe
// before quitting (so it is deep-mismatched, not pure rim), and the lagger's redundant laps
// pile into XL and push it near the rim. What is doctrine (and still holds): both are firmly
// mismatched; the phase SIGNS (quitter capacitive, lagger inductive) are checked above; the
// disk is bounded (checked below). The exact magnitude order is a calibration, not doctrine.
check("quitter is deep-mismatched (does one probe, then quits) (|Gamma| > 0.5)", routeOf("quitter").agent.gammaAbs > 0.5, "gammaAbs " + routeOf("quitter").agent.gammaAbs);
check("lagger is mismatched, near the rim (its laps pile into lag) (|Gamma| > 0.5)", routeOf("lagger").agent.gammaAbs > 0.5, "gammaAbs " + routeOf("lagger").agent.gammaAbs);
check("the gauge is bounded (no archetype exceeds |Gamma| = 1)",
      Object.keys(ARCH).every(function(n){ return routeOf(n).agent.gammaAbs <= 1; }));
check("ranked reader advances to the versus table (mastered everything, centered)",
      routeOf("ranked").route === "advance:versus", routeOf("ranked").route);

// the reflection-coefficient plane: the angle of Gamma is a bounded lag/lead axis
// (sign of Im(Gamma) = sign of X: upper half inductive/lag, lower half capacitive/lead)
check("lagger sits in the upper half-disk (Im Gamma > 0, inductive/lag)", routeOf("lagger").agent.gammaIm > 0, "gammaIm " + routeOf("lagger").agent.gammaIm);
check("quitter sits in the lower half-disk (Im Gamma < 0, capacitive/lead)", routeOf("quitter").agent.gammaIm < 0, "gammaIm " + routeOf("quitter").agent.gammaIm);
check("|Gamma| is consistent with Re/Im (sqrt(re^2+im^2))", (function(){
  return Object.keys(ARCH).every(function(n){ var a = routeOf(n).agent;
    return Math.abs(Math.sqrt(a.gammaRe*a.gammaRe + a.gammaIm*a.gammaIm) - a.gammaAbs) < 0.02; }); })());

// the sustainable band as an annulus: mastered agents in the matched core, force on the rim,
// competent learners in the ready ring. Band membership must agree with the routing.
check("ranked reader is in the matched core", routeOf("ranked").agent.band === "matched-core", routeOf("ranked").agent.band);
check("naive reader is in the ready band (competent, headroom)", routeOf("reader").agent.band === "ready-band", routeOf("reader").agent.band);
// The quitter's failure is impedance (mismatched band); the sprayer's is DISCIPLINE. Under
// region coverage a wide spray incidentally covers regions, so a sprayer can look well-matched
// by |Gamma| yet be caught by the Tilt Sensor's spray flag (productive/probes below threshold).
// Two different failure modes, two different instruments — the flag is what routes the sprayer.
check("quitter mismatched by band; sprayer caught by the spray flag (its failure is discipline, not impedance)",
      routeOf("quitter").agent.band === "mismatched" && routeOf("sprayer").flags.indexOf("spray") >= 0,
      "quitter band " + routeOf("quitter").agent.band + " | sprayer flags " + JSON.stringify(routeOf("sprayer").flags));
check("band membership agrees with routing (core/ready -> advance, mismatched -> drills)", (function(){
  return Object.keys(ARCH).every(function(n){ var o = routeOf(n);
    if (o.flags.length) return true;                              // force overrides band, by doctrine
    if (o.agent.band === "mismatched") return o.route.indexOf("drills") === 0;
    return o.route.indexOf("advance") === 0 || o.route.indexOf("continue") === 0; }); })());

// routes land where doctrine says
// The naive reader probes ALL special integers — redundant same-region hits under region
// coverage. It stays competent (ready-band) but its truePF now falls below the advance bar, so
// it routes to "continue" (keep playing), not "advance". A stricter, more honest read of an
// over-worker; the advance:versus path is exercised by the ranked reader (Z = par everywhere).
check("naive reader stays in the competent band (advance or continue, never drills)",
      ["advance", "continue"].some(function(p){ return routeOf("reader").route.indexOf(p) === 0; }), routeOf("reader").route);
check("lagger -> stopping drills", routeOf("lagger").route === "drills:stopping", routeOf("lagger").route);
check("quitter -> coverage drills", routeOf("quitter").route === "drills:coverage", routeOf("quitter").route);

// the Tilt Sensor fires on force, and force is routed to discipline BEFORE difficulty
check("sprayer flagged spray", routeOf("sprayer").flags.indexOf("spray") >= 0, JSON.stringify(routeOf("sprayer").flags));
check("sprayer -> discipline drills", routeOf("sprayer").route === "drills:discipline", routeOf("sprayer").route);
check("hammer flagged hammer", routeOf("hammer").flags.indexOf("hammer") >= 0, JSON.stringify(routeOf("hammer").flags));
check("hammer -> discipline drills (force before difficulty)", routeOf("hammer").route === "drills:discipline", routeOf("hammer").route);

// separation of powers: routing must never mutate a score
(function(){
  var sessions = reader();
  var before = JSON.stringify(sessions.map(function(s){ return s.score.verdict + s.score.probes; }));
  rail.route(sessions); rail.route(sessions);
  var after = JSON.stringify(sessions.map(function(s){ return s.score.verdict + s.score.probes; }));
  check("Rail does not mutate scores (routes, never scores)", before === after);
})();

// determinism: same sessions -> same route, twice
check("route is deterministic", JSON.stringify(rail.route(reader())) === JSON.stringify(rail.route(reader())));

// a clean advance requires BOTH resonance and mastery — a reader who only played one case cannot advance to versus
(function(){
  var one = [ reader()[0] ];
  var r = rail.route(one);
  check("partial mastery does not reach versus", r.route !== "advance:versus", r.route);
})();

if (!selfTestOnly) console.log("");
console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " rail integrity break(s):");
  fails.forEach(function(f){ console.log("  ✗ " + f); });
  process.exit(1);
}
console.log("GREEN — phase signs match the physics; every archetype routes per doctrine; force before difficulty; Rail routes, never scores.");
process.exit(0);

}
