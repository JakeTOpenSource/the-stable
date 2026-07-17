// The Versus Table, Phase 1: the clause-grammar compiler + legality gate (2026-07-14).
//
// THE DESIGN MOVE THAT DEFINES THE MACHINE: specs are not written; they are composed.
// A case declaration is played from a constrained clause grammar, and the spec prose,
// promised(), tool(), special[], par, and seam are ALL compiled from that one declaration.
// Spec and implementation cannot diverge, because they are one object — the Builder
// cannot lie in prose.
//
// v1 piece set (three pieces, max 2 clauses, per the sustainable design read):
//   threshold  — amounts {>=|>|<|<=} T get {percent off P | flat off F | flat fee F}
//   namedCase  — the value AT (e.g. an empty cart, $0) {owes nothing | is rejected | pays X}
//   range      — inputs from LO to HI accepted; outside {rejected | clamped}
// A deviation is EXACTLY one enumerated one-token flip on one clause, or the case is sound.
//
// Composition order (fixed, documented, deterministic): namedCase -> range -> threshold ->
// identity. Rejection is encoded -1, matching the Witness Suite convention.
//
// Legality is empirical, not trusted: validate() compiles both functions and SCANS the
// domain — a seamed case must break at its declared seam and nowhere else; a sound case
// must break nowhere. The gate is the rules: an illegal declaration is a forfeited move.
//
// Determinism guarantee: no randomness, no clock. Same declaration, same case, every time.
"use strict";

var path = require("path");
// The Witness Suite is the single source of truth for the target model (regions + extremes,
// v0.3.1) — par is derived through it, never computed here in parallel. Same-repo import,
// same pattern the Rail uses; no conductive path outside the Stable.
var suite = require(path.join(__dirname, "..", "witness-suite", "witness-suite.js"));

var EPS = 0.005;
var FLIPS = {
  threshold: { opStrict: [">=", "<="], opLoose: [">", "<"] },   // flip listed op to its strict/loose partner
  namedCase: { unwritten: true },                                // the named case simply not implemented
  range:     { hiExclusive: true, loExclusive: true }            // an included endpoint becomes excluded
};

function money(n){ return "$" + (Math.round(n * 100) / 100); }

// ---- clause semantics -------------------------------------------------------------------
function applyThreshold(cl, a, strictFlip){
  var op = cl.op;
  if (strictFlip){
    if (op === ">=") op = ">"; else if (op === "<=") op = "<";
    else if (op === ">") op = ">="; else if (op === "<") op = "<=";
  }
  var hit = op === ">=" ? a >= cl.t : op === ">" ? a > cl.t : op === "<=" ? a <= cl.t : a < cl.t;
  if (!hit) return a;
  if (cl.effect.kind === "percentOff") return a * (1 - cl.effect.value / 100);
  if (cl.effect.kind === "flatOff")    return a - cl.effect.value;
  return a + cl.effect.value;                                    // flatFee
}

function makeFn(decl, withDeviation){
  var dev = withDeviation ? decl.deviation : null;
  return function(a){
    for (var i = 0; i < decl.clauses.length; i++){
      var cl = decl.clauses[i];
      var deviated = dev && dev.clauseIndex === i;
      if (cl.type === "namedCase"){
        if (deviated) continue;                                   // unwritten: the case nobody coded
        if (Math.abs(a - cl.at) < EPS){
          if (cl.outcome === "owesNothing") return 0;
          if (cl.outcome === "rejected")   return -1;
          return cl.pays;
        }
      } else if (cl.type === "range"){
        var lo = cl.lo, hi = cl.hi;
        var inRange = deviated
          ? (dev.flip === "hiExclusive" ? (a >= lo && a < hi) : (a > lo && a <= hi))
          : (a >= lo && a <= hi);
        if (!inRange){
          if (cl.outside === "rejected") return -1;
          a = a < lo ? lo : hi;                                   // clamped
        }
      } else if (cl.type === "threshold"){
        a = applyThreshold(cl, a, deviated);                      // deviation = strictness flip
      }
    }
    return a;
  };
}

// ---- prose templates (compiled from the SAME declaration — cannot diverge) ---------------
function clauseProse(cl){
  if (cl.type === "threshold"){
    var eff = cl.effect.kind === "percentOff" ? "get " + cl.effect.value + "% off"
            : cl.effect.kind === "flatOff"    ? "get " + money(cl.effect.value) + " off"
            :                                    "add a " + money(cl.effect.value) + " fee";
    var who = cl.op === ">=" ? "Amounts of " + money(cl.t) + " or more"
            : cl.op === ">"  ? "Amounts over " + money(cl.t)
            : cl.op === "<=" ? "Amounts of " + money(cl.t) + " or less"
            :                  "Amounts under " + money(cl.t);
    return who + " " + eff + "; all other amounts are unchanged.";
  }
  if (cl.type === "namedCase"){
    var out = cl.outcome === "owesNothing" ? "owes nothing"
            : cl.outcome === "rejected"    ? "is rejected"
            :                                "pays exactly " + money(cl.pays);
    return "The exact amount " + money(cl.at) + " " + out + ".";
  }
  var outside = cl.outside === "rejected" ? "outside that range the input is rejected"
                                          : "outside that range the nearest limit applies";
  return "Amounts from " + money(cl.lo) + " to " + money(cl.hi) + " are accepted exactly as sent; " + outside + ".";
}

// ---- special places (the spec's own structure; same rule the suite uses) -----------------
function specialPlaces(decl){
  var s = {};
  function add(v){ if (v >= decl.domain.min && v <= decl.domain.max) s[v] = true; }
  decl.clauses.forEach(function(cl){
    if (cl.type === "threshold"){ add(cl.t - 1); add(cl.t); add(cl.t + 1); }
    if (cl.type === "namedCase"){ add(cl.at); add(cl.at + 1); }
    if (cl.type === "range"){ [cl.lo - 1, cl.lo, cl.lo + 1, cl.hi - 1, cl.hi, cl.hi + 1].forEach(add); }
  });
  add(decl.domain.min); add(decl.domain.max);
  return Object.keys(s).map(Number).sort(function(a, b){ return a - b; });
}

function declaredSeam(decl){
  if (!decl.deviation) return null;
  var cl = decl.clauses[decl.deviation.clauseIndex];
  if (cl.type === "threshold") return cl.t;
  if (cl.type === "namedCase") return cl.at;
  return decl.deviation.flip === "hiExclusive" ? cl.hi : cl.lo;
}

// ---- boundaries: the declaration's exact rule-change points (v0.2, migrated to the
// region+extremes target model). The compiler KNOWS the structure — boundaries are not
// inferred from prose or specials, they are read off the clauses. Within-domain, deduped.
function boundariesOf(decl){
  var b = {};
  function add(v){ if (v >= decl.domain.min && v <= decl.domain.max) b[v] = true; }
  decl.clauses.forEach(function(cl){
    if (cl.type === "threshold") add(cl.t);
    if (cl.type === "namedCase") add(cl.at);
    if (cl.type === "range"){ add(cl.lo); add(cl.hi); }
  });
  return Object.keys(b).map(Number).sort(function(x, y){ return x - y; });
}

// ---- compile ------------------------------------------------------------------------------
function compile(decl){
  var special = specialPlaces(decl);
  var seam = declaredSeam(decl);
  var canReject = decl.clauses.some(function(c){
    return (c.type === "range" && c.outside === "rejected") || (c.type === "namedCase" && c.outcome === "rejected");
  });
  var spec = decl.clauses.map(clauseProse).join(" ") +
    " Valid inputs run from " + money(decl.domain.min) + " to " + money(decl.domain.max) +
    "; cents are allowed. Output is the amount charged in dollars" + (canReject ? ", or 'rejected'" : "") + ".";
  var c = {
    id: decl.id, title: decl.title || decl.id,
    spec: spec, domain: { min: decl.domain.min, max: decl.domain.max },
    promised: makeFn(decl, false), tool: makeFn(decl, true),
    seam: seam, special: special,
    boundaries: boundariesOf(decl)
  };
  // par via the suite's target model (v0.3.1): seamed = one witnessing probe; sound = the
  // minimal cover (boundaries + distinct extremes + interiors of uncovered regions).
  c.par = seam === null ? suite._minimalCoverOf(c).length : 1;
  return c;
}

// ---- legality: the gate IS the rules ------------------------------------------------------
function isMatch(p, t){ if (p < 0 || t < 0) return p === t; return Math.abs(p - t) < EPS; }

function validate(decl){
  var reasons = [];
  // structural rules
  if (!decl || !decl.id || !decl.domain || !Array.isArray(decl.clauses)) return { legal: false, reasons: ["malformed declaration"] };
  if (decl.clauses.length < 1 || decl.clauses.length > 2) reasons.push("v1 allows 1-2 clauses, got " + decl.clauses.length);
  if (!(decl.domain.min >= 0) || !(decl.domain.max > decl.domain.min)) reasons.push("domain must satisfy 0 <= min < max");
  if (decl.domain.max - decl.domain.min > 1000) reasons.push("domain wider than 1000 units");
  decl.clauses.forEach(function(cl, i){
    if (!FLIPS[cl.type]) reasons.push("clause " + i + ": unknown type " + cl.type);
  });
  if (decl.deviation){
    var d = decl.deviation;
    var cl = decl.clauses[d.clauseIndex];
    if (!cl) reasons.push("deviation points at a missing clause");
    else {
      var allowed = FLIPS[cl.type];
      if (cl.type === "threshold"){
        var pool = allowed[d.flip];
        if (!pool || pool.indexOf(cl.op) < 0) reasons.push("deviation flip '" + d.flip + "' not legal for op " + cl.op);
      } else if (!allowed[d.flip]) reasons.push("deviation flip '" + d.flip + "' not legal for " + cl.type);
    }
  }
  if (reasons.length) return { legal: false, reasons: reasons };

  // empirical rules: compile and scan the whole domain
  var c = compile(decl);
  var canReject = decl.clauses.some(function(cl){
    return (cl.type === "range" && cl.outside === "rejected") || (cl.type === "namedCase" && cl.outcome === "rejected");
  });
  var mismatches = [];
  function scanPoint(a){
    a = Math.round(a * 100) / 100;
    if (a < c.domain.min || a > c.domain.max) return;
    var p = c.promised(a), t = c.tool(a);
    var bad = function(v){ return v !== -1 && v < 0; };
    if (bad(p) || bad(t)) reasons.push("negative charge at " + a + " — charges must be money");
    if (!canReject && (p === -1 || t === -1))
      reasons.push("charge of exactly -$1 at " + a + " collides with the rejection sentinel");
    if (!isMatch(p, t) && mismatches.indexOf(a) < 0) mismatches.push(a);
  }
  for (var a = Math.ceil(c.domain.min); a <= Math.floor(c.domain.max); a++) scanPoint(a);
  c.special.forEach(function(s){ [-0.01, 0.01, -0.5, 0.5].forEach(function(d){ scanPoint(s + d); }); });
  if (c.seam !== null) scanPoint(c.seam);

  if (c.seam === null){
    if (mismatches.length) reasons.push("declared sound but breaks at " + mismatches.slice(0, 3).join(", "));
  } else {
    if (mismatches.length === 0) reasons.push("declared seam " + c.seam + " but the case never breaks (seam unreachable)");
    else if (mismatches.length > 1 || Math.abs(mismatches[0] - c.seam) >= EPS)
      reasons.push("breaks at [" + mismatches.slice(0, 5).join(", ") + "], not only at declared seam " + c.seam);
    var seamSpecial = c.special.some(function(s){ return Math.abs(s - c.seam) < EPS; });
    if (!seamSpecial) reasons.push("seam is not a special place (aim could not win)");
  }
  // charges must be money: no negative outputs other than the -1 rejection sentinel
  reasons = reasons.filter(function(r, i){ return reasons.indexOf(r) === i; });
  return { legal: reasons.length === 0, reasons: reasons, compiled: reasons.length === 0 ? c : null };
}

// 0.2 (2026-07-16): compiled cases carry `boundaries` (exact rule-change points read off
// the clauses) and par is derived through the suite's region+extremes minimal cover.
module.exports = { version: "0.2", compile: compile, validate: validate, FLIPS: FLIPS, _isMatch: isMatch };
