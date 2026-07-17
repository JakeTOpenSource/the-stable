// The Rail + Tilt Sensor v0.1 — the Stable's curriculum router (2026-07-14).
//
// TELEMETRY: AC-phasor mapping (Jake's design, parsed honestly). Each session becomes a
// point on the complex plane, imaginary unit written j per electrical convention:
//
//   R  (real axis)      — resistive work: aimed, fresh, pre-conclusion probes. Pure
//                         resistance lies on the horizontal axis where phase is zero:
//                         action synchronized with evidence. The perfect reader.
//   XL (+j, inductive)  — lag: action AFTER the evidence. Probes after the catch, repeats
//                         of answered questions, probing past full coverage. Current lags
//                         voltage; the flailer that cannot stop is a large inductor.
//   XC (-j, capacitive) — lead: action BEFORE the evidence. Premature nulls and false
//                         passes counted as the special places left unprobed at the
//                         moment of conclusion. Current leads voltage; the quitter.
//
//   X = XL - XC;  Z = R + jX;  |Z| = sqrt(R^2 + X^2);  phi = atan2(X, R)
//   cos(phi) = timing efficiency. discipline = aim efficiency (from the suite).
//   TRUE POWER FACTOR = discipline x cos(phi) — aim loss times timing loss.
//
// BOUNDARY (do not overclaim): this is a measurement formalism borrowed from AC analysis
// (Steinmetz's phasor method, 1893) — magnitude-and-phase bookkeeping, not physics. No
// energy conservation, no Kirchhoff laws. v1 has no frequency: turn-based play has no
// natural time-base, so reactance counts EVENTS, not rates. If sessions ever carry real
// timing, omega returns and reactance becomes rate-dependent.
//
// SEPARATION OF POWERS: the Rail routes; it never contains (walls), never teaches
// (machines), never scores (the suite's scorer stays untouched). The Sensor contains
// (flags force-signatures); it never teaches. The Rail is the sustainable band's only
// legitimate enforcer: it compresses the distribution by FEEDING CASES, never by
// touching the scorer.
//
// THE RAIL READS THE LEDGER, NOT THE TESTIMONY: every quantity is recomputed by replaying
// the session's probe ledger against the case definition. Determinism guarantee: no
// randomness, no clock; same ledgers, same routes, every run.
"use strict";

var path = require("path");
var suite = require(path.join(__dirname, "..", "witness-suite", "witness-suite.js"));

var POLICY = {
  version: "0.1",
  PHASE_BAND_DEG: 20,      // |phi| inside this band = synchronized (resonant) timing
  TRUE_PF_MIN: 0.85,       // discipline x cos(phi) needed to advance
  SPRAY_DISC: 0.25,        // discipline below this with enough probes = spraying force
  SPRAY_MIN_PROBES: 8,
  HAMMER_MIN_OOB: 3,       // out-of-domain attempts across sessions = hammering the walls
  CHURN_REPEAT_FRAC: 0.5,  // over half the probes are repeats = churning
  CHURN_MIN_PROBES: 6,
  // The sustainable band as an annulus on the reflection-coefficient (Gamma) plane:
  READY_BAND_INNER: 0.1,   // inside this = matched core (mastered; advance, do not park here)
  READY_BAND_OUTER: 0.5    // inner..outer = the ready band (competent, with headroom); outside = mismatched
};

function bandOf(gammaAbs){
  if (gammaAbs < POLICY.READY_BAND_INNER) return "matched-core";
  if (gammaAbs <= POLICY.READY_BAND_OUTER) return "ready-band";
  return "mismatched";
}

function caseById(id){
  for (var i = 0; i < suite._cases.length; i++) if (suite._cases[i].id === id) return suite._cases[i];
  throw new Error("unknown case: " + id);
}

// session = { caseId, score }  (score as returned by the suite's session.score())
function phasorFromSession(session){
  var c = caseById(session.caseId);
  var led = session.score.ledger || [];
  // v0.3.1: replay against the same TARGET model the suite scores with — boundaries (exact
  // rule-change points) + regions of constant rule + distinct domain extremes. Crediting
  // mirrors the suite: boundary probe -> boundary only; extreme probe -> extreme AND its
  // containing region; other in-region probe -> its region. R (resistive work) counts
  // PRODUCTIVE probes (each covers a not-yet-covered target); redundant probes are apparent
  // effort, charged to discipline.
  var targets = suite._targetsOf(c);
  var totalTargets = targets.boundaries.length + targets.regions.length + targets.extremes.length;
  var seen = {}, bHit = {}, eHit = {}, rHit = {}, covCount = 0;
  var catchIdx = -1, covDoneIdx = -1;
  var R = 0, XL = 0, repeats = 0;
  var EPS = 0.005;

  function creditRegion(x){
    for (var m = 0; m < targets.regions.length; m++){
      var lo = targets.regions[m][0], hi = targets.regions[m][1];
      if (x >= lo - EPS && x <= hi + EPS){
        if (!rHit[m]){ rHit[m] = true; covCount++; return true; }
        return false;
      }
    }
    return false;
  }

  for (var i = 0; i < led.length; i++){
    var a = led[i], key = String(a);
    var isRepeat = !!seen[key];
    if (isRepeat) repeats++;
    seen[key] = true;

    // does this probe cover a not-yet-covered boundary, extreme, or region?
    var productive = false, placed = false;
    for (var j = 0; j < targets.boundaries.length; j++){
      if (Math.abs(a - targets.boundaries[j]) < EPS){ placed = true;
        if (!bHit[j]){ bHit[j] = true; covCount++; productive = true; } break; }
    }
    if (!placed){
      for (var k = 0; k < targets.extremes.length; k++){
        if (Math.abs(a - targets.extremes[k]) < EPS){ placed = true;
          if (!eHit[k]){ eHit[k] = true; covCount++; productive = true; }
          if (creditRegion(a)) productive = true;
          break; }
      }
    }
    if (!placed){
      if (creditRegion(a)) productive = true;
    }
    if (covCount === totalTargets && covDoneIdx < 0) covDoneIdx = i;

    var lag = (catchIdx >= 0 && i > catchIdx) || isRepeat ||
              (c.seam === null && covDoneIdx >= 0 && i > covDoneIdx);

    var p = c.promised(a), t = c.tool(a);
    var match = (p < 0 || t < 0) ? p === t : Math.abs(p - t) < EPS;
    if (!match && catchIdx < 0) catchIdx = i;

    if (lag) XL++;
    else if (productive) R++;
    // redundant/unaimed fresh pre-conclusion probes carry no R and no X: they are apparent
    // effort; their cost is measured by discipline (aim), not by phase (timing).
  }

  var XC = 0;
  if (session.score.verdict === "premature null" || session.score.verdict === "false pass"){
    XC = totalTargets - covCount;    // the targets left unprobed at the moment of conclusion
  }

  var X = XL - XC;
  var phi = (R === 0 && X === 0) ? 0 : Math.atan2(X, R) * 180 / Math.PI;
  var cosPhi = Math.cos(phi * Math.PI / 180);
  var disc = session.score.discipline || 0;
  var probes = led.length;
  var mastered = (session.score.verdict === "caught" && probes <= session.score.par) ||
                 (session.score.verdict === "calibrated null" && probes <= session.score.par);

  // Smith gauge (conformal fold, Jake 2026-07-14): Gamma = (Z - Z0)/(Z + Z0) with Z0 = par,
  // the calibrated agent as reference impedance. Maps the whole unbounded impedance
  // half-plane into the unit disk: |Gamma| = 0 is matched (center), |Gamma| = 1 is total
  // reflection (rim — all effort bounced, no real work). Bounded by construction: the
  // instrument cannot over-rev. VSWR = (1+|G|)/(1-|G|) is the surge gauge.
  var g = gammaOf(R, X, session.score.par);

  return {
    caseId: session.caseId, verdict: session.score.verdict,
    R: R, X: X, XL: XL, XC: XC,
    magnitude: Math.round(Math.sqrt(R * R + X * X) * 100) / 100,
    phiDeg: Math.round(phi * 10) / 10,
    cosPhi: Math.round(cosPhi * 100) / 100,
    discipline: disc,
    truePF: Math.round(disc * cosPhi * 100) / 100,
    gammaRe: g.re, gammaIm: g.im, gammaAbs: g.abs, gammaDeg: g.deg, vswr: g.vswr,
    probes: probes, repeats: repeats,
    repeatFrac: probes ? Math.round(repeats / probes * 100) / 100 : 0,
    par: session.score.par, mastered: mastered,
    events: session.score.events || { outOfDomain: 0, postAbstain: 0 }
  };
}

// The full complex reflection coefficient. Gamma = ((R-Z0)+jX)/((R+Z0)+jX). Working the
// algebra: Re = (R^2 - Z0^2 + X^2)/|den|^2, Im = 2*Z0*X/|den|^2 — so sign(Im) = sign(X):
// upper half-disk is inductive (lag), lower half is capacitive (lead). A single bounded
// complex point carries both mismatch magnitude (|Gamma|) and lag/lead direction (angle).
// The plottable coordinate of the reflection-coefficient plane (Smith, 1939). Pure
// formalism: bounded mismatch bookkeeping on the unit disk, not physics — no watts reflect.
// Display note (adversarial parse 2026-07-17): the returned `abs` is rounded to 2 dp while
// `vswr` is computed from the UNROUNDED magnitude — near the rim a point can display
// abs 1.00 alongside a large-but-finite vswr (e.g. raw 0.9978 -> abs "1.00", vswr 904.2).
// Each field is individually correct; the unrounded magnitude is the source of truth, and
// (1+abs)/(1-abs) recomputed from the ROUNDED field will not reconcile at the rim. The
// verified algebra: |Gamma|^2 = ((R-Z0)^2+X^2)/((R+Z0)^2+X^2), and (R+Z0)^2-(R-Z0)^2 =
// 4*R*Z0 >= 0, so |Gamma| <= 1 whenever R >= 0 with equality only at R = 0 — the min(1,...)
// clamp below is redundant belt-and-suspenders, proven never to mask a violation.
function gammaOf(R, X, Z0){
  if (!Z0 || Z0 <= 0) Z0 = 1;
  var den2 = (R + Z0) * (R + Z0) + X * X;
  var re = den2 === 0 ? -1 : (R * R - Z0 * Z0 + X * X) / den2;
  var im = den2 === 0 ? 0  : (2 * Z0 * X) / den2;
  var abs = Math.min(1, Math.sqrt(re * re + im * im));
  var deg = (re === 0 && im === 0) ? 0 : Math.atan2(im, re) * 180 / Math.PI;
  var vswr = abs >= 0.999 ? 999 : (1 + abs) / (1 - abs);
  return { re: Math.round(re * 100) / 100, im: Math.round(im * 100) / 100,
           abs: Math.round(abs * 100) / 100, deg: Math.round(deg * 10) / 10,
           vswr: Math.round(vswr * 10) / 10 };
}

// the agent's magnetization: mean of its session phasors on the complex plane
function agentPhasor(phasors){
  if (!phasors.length) return null;
  var R = 0, X = 0, disc = 0, par = 0;
  phasors.forEach(function(p){ R += p.R; X += p.X; disc += p.discipline; par += p.par; });
  R /= phasors.length; X /= phasors.length; disc /= phasors.length; par /= phasors.length;
  var phi = (R === 0 && X === 0) ? 0 : Math.atan2(X, R) * 180 / Math.PI;
  var cosPhi = Math.cos(phi * Math.PI / 180);
  var g = gammaOf(R, X, par);
  return {
    R: Math.round(R * 100) / 100, X: Math.round(X * 100) / 100,
    magnitude: Math.round(Math.sqrt(R * R + X * X) * 100) / 100,
    phiDeg: Math.round(phi * 10) / 10,
    cosPhi: Math.round(cosPhi * 100) / 100,
    discipline: Math.round(disc * 100) / 100,
    truePF: Math.round(disc * cosPhi * 100) / 100,
    gammaRe: g.re, gammaIm: g.im, gammaAbs: g.abs, gammaDeg: g.deg, vswr: g.vswr,
    band: bandOf(g.abs)
  };
}

// The Tilt Sensor: quiet, deterministic force-signature flags. Recorded, never punitive —
// the Rail reads them and routes to drills; nothing here bans or halts.
function sensorFlags(phasors){
  var flags = {}, oob = 0, ghost = 0;
  phasors.forEach(function(p){
    if (p.discipline < POLICY.SPRAY_DISC && p.probes >= POLICY.SPRAY_MIN_PROBES) flags.spray = true;
    if (p.repeatFrac > POLICY.CHURN_REPEAT_FRAC && p.probes >= POLICY.CHURN_MIN_PROBES) flags.churn = true;
    oob += p.events.outOfDomain; ghost += p.events.postAbstain;
  });
  if (oob >= POLICY.HAMMER_MIN_OOB) flags.hammer = true;
  if (ghost >= 1) flags.ghost = true;
  return Object.keys(flags).sort();
}

// The routing policy: ordered rules, first match wins. Versioned; corpus-gated in run-rail.
function route(sessions){
  var phasors = sessions.map(phasorFromSession);
  var agent = agentPhasor(phasors);
  var flags = sensorFlags(phasors);
  if (!agent) return { route: "continue:current-mix", reason: "no sessions yet", agent: null, flags: [] };

  var masteredIds = {};
  phasors.forEach(function(p){ if (p.mastered) masteredIds[p.caseId] = true; });
  var allIds = suite._cases.map(function(c){ return c.id; });
  var unmastered = allIds.filter(function(id){ return !masteredIds[id]; });

  var out = { agent: agent, flags: flags, phasors: phasors };

  if (flags.length){
    out.route = "drills:discipline";
    out.reason = "force signature (" + flags.join(", ") + ") — method before difficulty";
  } else if (agent.phiDeg <= -POLICY.PHASE_BAND_DEG){
    out.route = "drills:coverage";
    out.reason = "capacitive lead (phi " + agent.phiDeg + "°) — action ahead of evidence; earn abstention on sound cases";
  } else if (agent.phiDeg >= POLICY.PHASE_BAND_DEG){
    out.route = "drills:stopping";
    out.reason = "inductive lag (phi " + agent.phiDeg + "°) — evidence ahead of action; practice concluding";
  } else if (agent.truePF >= POLICY.TRUE_PF_MIN){
    if (unmastered.length === 0){
      out.route = "advance:versus";
      out.reason = "resonant (phi " + agent.phiDeg + "°, true PF " + agent.truePF + ") and every case mastered — the table is next";
    } else {
      out.route = "advance:next-family";
      out.target = unmastered[0];
      out.reason = "resonant timing, aim holds — next unmastered case: " + unmastered[0];
    }
  } else {
    out.route = "continue:current-mix";
    out.reason = "in the band (phi " + agent.phiDeg + "°) but true PF " + agent.truePF + " below " + POLICY.TRUE_PF_MIN + " — keep playing";
  }
  return out;
}

module.exports = { version: "0.1", POLICY: POLICY,
                   phasorFromSession: phasorFromSession, agentPhasor: agentPhasor,
                   sensorFlags: sensorFlags, route: route };
