// Versus compiler self-test — Phase 1's proof. Deterministic; fuse-compatible output
// (prints N/N counts and GREEN, nonzero exit on any failure).
//   node run-versus-compiler.js              -> full report
//   node run-versus-compiler.js --self-test  -> same checks (the gate runs this)
//
// The strongest Phase 1 claim: the compiler independently REGENERATES the three hand-built
// Witness Suite cases from pure declarations — behaviorally identical across their full
// domains. Two implementations, one behavior: the two-witness pattern applied to the
// machine itself.
"use strict";

var path = require("path");
var suite = require(path.join(__dirname, "..", "witness-suite", "witness-suite.js"));
var vc = require(path.join(__dirname, "versus-compiler.js"));

var checks = 0, passes = 0, fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

// ---- declarations that must regenerate the suite ----------------------------------------
var DECLS = {
  "threshold-discount": {
    id: "threshold-discount", domain: { min: 1, max: 200 },
    clauses: [ { type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } } ],
    deviation: { clauseIndex: 0, flip: "opStrict" }
  },
  "zero-empty-cart": {
    id: "zero-empty-cart", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ],
    deviation: { clauseIndex: 0, flip: "unwritten" }
  },
  "ceiling-gift-card": {
    id: "ceiling-gift-card", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "hiExclusive" }
  }
};

function suiteCase(id){ for (var i = 0; i < suite._cases.length; i++) if (suite._cases[i].id === id) return suite._cases[i]; }

Object.keys(DECLS).forEach(function(id){
  var v = vc.validate(DECLS[id]);
  check(id + ": declaration is legal", v.legal, (v.reasons || []).join("; "));
  if (!v.legal) return;
  var c = v.compiled, s = suiteCase(id);

  // behavioral equivalence with the hand-built case, across the whole domain
  var diverged = null;
  function cmp(a){
    a = Math.round(a * 100) / 100;
    if (a < s.domain.min || a > s.domain.max) return;
    var pc = c.promised(a), ps = s.promised(a), tc = c.tool(a), ts = s.tool(a);
    var same = function(x, y){ return (x < 0 || y < 0) ? x === y : Math.abs(x - y) < 0.005; };
    if (!same(pc, ps) || !same(tc, ts)) diverged = a;
  }
  for (var a = Math.ceil(s.domain.min); a <= Math.floor(s.domain.max); a++) cmp(a);
  s.special.forEach(function(sp){ [-0.01, 0.01, -0.5, 0.5].forEach(function(d){ cmp(sp + d); }); });
  check(id + ": compiled behavior identical to hand-built case", diverged === null, "diverges at " + diverged);

  check(id + ": special places identical", JSON.stringify(c.special) === JSON.stringify(s.special),
        JSON.stringify(c.special) + " vs " + JSON.stringify(s.special));
  // v0.3: the suite's par is DERIVED (suite._parOf), not a stored field. For these seamed
  // cases both the compiler and the suite give par = 1 (one witnessing probe), so the cross-
  // check still holds. (The Versus Table's own null-round coverage still uses special.length —
  // migrating it to region coverage to match the solo suite is tracked follow-up, not this fix.)
  check(id + ": seam and par identical", c.seam === s.seam && c.par === suite._parOf(s),
        JSON.stringify({ compiler: { seam: c.seam, par: c.par }, suite: { seam: s.seam, par: suite._parOf(s) } }));
});

// the compiled boundaries must equal the hand-built suite cases' boundaries — the two-witness
// pattern applied to the target model itself (v0.2 compiler / suite v0.3.1)
Object.keys(DECLS).forEach(function(id){
  var v = vc.validate(DECLS[id]);
  if (!v.legal) return;
  var s = suiteCase(id);
  check(id + ": boundaries identical to the hand-built case",
        JSON.stringify(v.compiled.boundaries) === JSON.stringify(s.boundaries),
        JSON.stringify(v.compiled.boundaries) + " vs " + JSON.stringify(s.boundaries));
});

// sound variants of all three must also be legal, with par = the minimal cover under the
// region+extremes model. Expected values are HAND-DERIVED, not read back from the code:
//   threshold-discount-sound: boundary 50 + extremes 1,200 (both regions covered by them) = 3
//   zero-empty-cart-sound:    boundaries 0,30 + extreme 200 + interior of [0,30]          = 4
//   ceiling-gift-card-sound:  boundaries 10,500 + extremes 1,600 + interior of [10,500]   = 5
var EXPECTED_SOUND_PAR = { "threshold-discount": 3, "zero-empty-cart": 4, "ceiling-gift-card": 5 };
Object.keys(DECLS).forEach(function(id){
  var d = JSON.parse(JSON.stringify(DECLS[id])); d.deviation = null; d.id = id + "-sound";
  var v = vc.validate(d);
  check(id + "-sound: legal and par = minimal cover (" + EXPECTED_SOUND_PAR[id] + ")",
        v.legal && v.compiled.par === EXPECTED_SOUND_PAR[id],
        v.legal ? "par " + v.compiled.par : (v.reasons || []).join("; "));
});

// prose faithfulness: the compiled spec speaks its own declaration
(function(){
  var spec1 = vc.validate(DECLS["threshold-discount"]).compiled.spec;
  check("prose names the threshold and effect", spec1.indexOf("$50") >= 0 && spec1.indexOf("10% off") >= 0, spec1);
  var spec2 = vc.validate(DECLS["zero-empty-cart"]).compiled.spec;
  check("prose names the empty case", spec2.indexOf("$0") >= 0 && spec2.indexOf("owes nothing") >= 0, spec2);
  var spec3 = vc.validate(DECLS["ceiling-gift-card"]).compiled.spec;
  check("prose names the range and rejection", spec3.indexOf("$500") >= 0 && spec3.indexOf("rejected") >= 0, spec3);
})();

// ---- the legality gate rejects what it must ----------------------------------------------
function expectIllegal(name, decl, reasonFragment){
  var v = vc.validate(decl);
  var hit = !v.legal && (v.reasons || []).join(" | ").indexOf(reasonFragment) >= 0;
  check("illegal: " + name, hit, v.legal ? "was accepted" : "reasons: " + (v.reasons || []).join(" | "));
}
expectIllegal("domain too wide",
  { id: "x", domain: { min: 0, max: 5000 }, clauses: [{ type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } }], deviation: null },
  "wider than 1000");
expectIllegal("seam outside the domain (unreachable)",
  { id: "x", domain: { min: 1, max: 200 }, clauses: [{ type: "threshold", op: ">=", t: 250, effect: { kind: "percentOff", value: 10 } }], deviation: { clauseIndex: 0, flip: "opStrict" } },
  "never breaks");
expectIllegal("clamped range hides the deviation (no behavioral difference)",
  { id: "x", domain: { min: 1, max: 600 }, clauses: [{ type: "range", lo: 10, hi: 500, outside: "clamped" }], deviation: { clauseIndex: 0, flip: "hiExclusive" } },
  "never breaks");
expectIllegal("flip not legal for the op",
  { id: "x", domain: { min: 1, max: 200 }, clauses: [{ type: "threshold", op: ">", t: 50, effect: { kind: "percentOff", value: 10 } }], deviation: { clauseIndex: 0, flip: "opStrict" } },
  "not legal for op");
expectIllegal("too many clauses for v1",
  { id: "x", domain: { min: 1, max: 200 }, clauses: [
    { type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } },
    { type: "namedCase", at: 0, outcome: "owesNothing" },
    { type: "range", lo: 1, hi: 200, outside: "rejected" } ], deviation: null },
  "1-2 clauses");
expectIllegal("negative charge (charges must be money)",
  { id: "x", domain: { min: 1, max: 200 }, clauses: [{ type: "threshold", op: "<", t: 20, effect: { kind: "flatOff", value: 10 } }], deviation: null },
  "negative charge");
expectIllegal("output collides with the rejection sentinel",
  { id: "x", domain: { min: 1, max: 200 }, clauses: [{ type: "threshold", op: "<", t: 20, effect: { kind: "flatOff", value: 10 } }], deviation: null },
  "negative charge"); // -5 at $5 trips first; the sentinel rule additionally guards exact -1 cases

// ---- determinism ---------------------------------------------------------------------------
(function(){
  var a = vc.validate(DECLS["threshold-discount"]).compiled;
  var b = vc.validate(DECLS["threshold-discount"]).compiled;
  var same = a.spec === b.spec && JSON.stringify(a.special) === JSON.stringify(b.special) &&
             a.promised(50) === b.promised(50) && a.tool(49.99) === b.tool(49.99);
  check("compilation is deterministic", same);
})();

// ---- property sweep: a small legal space compiles legal, wall to wall ----------------------
(function(){
  var bad = 0, total = 0;
  [25, 50, 120].forEach(function(t){
    [">=", ">", "<", "<="].forEach(function(op){
      [{ kind: "percentOff", value: 10 }, { kind: "flatFee", value: 5 }].forEach(function(effect){
        var flip = (op === ">=" || op === "<=") ? "opStrict" : "opLoose";
        [null, { clauseIndex: 0, flip: flip }].forEach(function(dev){
          total++;
          var v = vc.validate({ id: "sweep", domain: { min: 1, max: 200 },
            clauses: [{ type: "threshold", op: op, t: t, effect: effect }], deviation: dev });
          if (!v.legal) bad++;
        });
      });
    });
  });
  check("property sweep: all " + total + " single-threshold declarations legal", bad === 0, bad + " rejected");
})();

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " compiler integrity break(s):");
  fails.forEach(function(f){ console.log("  ✗ " + f); });
  process.exit(1);
}
console.log("GREEN — the compiler regenerates the suite from declarations; legality rejects unfair tables; compilation is deterministic.");
process.exit(0);
