// Versus match harness self-test — Phase 2's proof. Deterministic; fuse-compatible output.
//   node run-versus-match.js              -> match report + checks
//   node run-versus-match.js --self-test  -> checks only (the gate runs this)
"use strict";

var path = require("path");
var fs = require("fs");
var vm = require(path.join(__dirname, "versus-match.js"));

var checks = 0, passes = 0, fails = [];
function check(name, ok, detail){ checks++; if (ok) passes++; else fails.push(name + (detail ? " — " + detail : "")); }

// ---- declarations the builders play ------------------------------------------------------
var D = {
  discountDev: { id: "threshold-discount", domain: { min: 1, max: 200 },
    clauses: [ { type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } } ],
    deviation: { clauseIndex: 0, flip: "opStrict" } },
  giftDev: { id: "ceiling-gift-card", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "hiExclusive" } },
  cartSound: { id: "zero-empty-cart-sound", domain: { min: 0, max: 200 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 30, effect: { kind: "flatFee", value: 5 } } ],
    deviation: null },
  giftSound: { id: "gift-sound", domain: { min: 1, max: 600 },
    clauses: [ { type: "range", lo: 10, hi: 500, outside: "rejected" } ], deviation: null },
  tooWide: { id: "too-wide", domain: { min: 0, max: 5000 },
    clauses: [ { type: "threshold", op: ">=", t: 50, effect: { kind: "percentOff", value: 10 } } ], deviation: null }
};

// ---- scripted players ----------------------------------------------------------------------
function listBuilder(name, decls){
  return { name: name, build: function(r){ return decls[Math.floor(r / 2) % decls.length]; }, witness: specReaderPlay };
}
// The honest hidden-information witness: reads the spec PROSE, extracts every named dollar
// amount, probes each named number and its neighbors plus the domain ends; abstains when
// the candidate list is exhausted without a catch.
function specReaderPlay(session){
  var nums = {};
  var m; var re = /\$(\d+(?:\.\d+)?)/g;
  while ((m = re.exec(session.spec))) nums[parseFloat(m[1])] = true;
  var cands = {};
  Object.keys(nums).map(Number).forEach(function(n){ [n - 1, n, n + 1].forEach(function(v){ cands[v] = true; }); });
  cands[session.domain.min] = true; cands[session.domain.max] = true;
  var list = Object.keys(cands).map(Number)
    .filter(function(v){ return v >= session.domain.min && v <= session.domain.max; })
    .sort(function(a, b){ return a - b; });
  for (var i = 0; i < list.length; i++){
    var r = session.probe(list[i]);
    if (r && (r.roundOver || (r.match === false))) return;
  }
  session.abstain();
}
function flailerPlay(session){
  var st = 20260714;
  function nx(){ st = (st * 1103515245 + 12345) % 2147483648; return st / 2147483648; }
  while (!session.over()){
    var a = Math.floor(session.domain.min + nx() * (session.domain.max - session.domain.min + 1));
    var r = session.probe(a + 0.37);           // off-lattice: never lands on a special place
    if (r && r.roundOver) return;
  }
}
function quitterPlay(session){
  session.probe(Math.round((session.domain.min + session.domain.max) / 2) + 0.37);
  session.abstain();
}
// Wanderer: does its aimed reading first, then wanders fresh unaimed ground to the cap.
function wandererPlay(session){
  specProbeOnly(session);
  var a = session.domain.min + 2.37;
  while (!session.over()){
    var r = session.probe(a);
    a += 3.11; if (a > session.domain.max) a = session.domain.min + 0.61;
    if (r && r.roundOver) return;
  }
}
function specProbeOnly(session){
  var nums = {}; var m; var re = /\$(\d+(?:\.\d+)?)/g;
  while ((m = re.exec(session.spec))) nums[parseFloat(m[1])] = true;
  var list = [];
  Object.keys(nums).map(Number).forEach(function(n){ [n - 1, n, n + 1].forEach(function(v){ list.push(v); }); });
  list.push(session.domain.min); list.push(session.domain.max);
  list.filter(function(v){ return v >= session.domain.min && v <= session.domain.max; })
      .sort(function(a, b){ return a - b; })
      .forEach(function(v){ if (!session.over()) session.probe(v); });
}
function player(name, buildList, witnessFn){
  return { name: name, build: function(r){ return buildList[Math.floor(r / 2) % buildList.length]; }, witness: witnessFn };
}

// ---- 1. a clean match: two spec-readers, standard builds ---------------------------------
var clean = vm.playMatch("m-clean",
  player("A", [D.discountDev, D.giftDev, D.cartSound], specReaderPlay),
  player("B", [D.giftDev, D.cartSound, D.discountDev], specReaderPlay));

check("clean match: 6 rounds, all legal", clean.rounds.length === 6 && clean.rounds.every(function(r){ return r.legal; }));
check("clean match: seamed cases caught by reading prose alone",
      clean.rounds.filter(function(r){ return r.verdict === "caught"; }).length === 4,
      clean.rounds.map(function(r){ return r.verdict; }).join(", "));
check("clean match: sound cases earn calibrated nulls",
      clean.rounds.filter(function(r){ return r.verdict === "calibrated null"; }).length === 2,
      clean.rounds.map(function(r){ return r.verdict; }).join(", "));
check("clean match: a winner is named", !!clean.winner);

// hidden information: the session exposes nothing but spec/domain/probe/abstain/over
(function(){
  var v = require(path.join(__dirname, "versus-compiler.js")).validate(D.discountDev);
  var s = vm.openHidden(v.compiled, function(){});
  var leaked = ["par", "seam", "special", "promised", "tool"].filter(function(k){ return k in s; });
  check("hidden information: no par/seam/special/functions on the session", leaked.length === 0, "leaked: " + leaked.join(","));
})();

// ---- 2. the surge protector folds a flailer back early ------------------------------------
var surge = vm.playMatch("m-surge",
  player("A", [D.discountDev, D.discountDev, D.discountDev], quitterPlay),
  player("B", [D.discountDev, D.discountDev, D.discountDev], flailerPlay));
var flailRounds = surge.rounds.filter(function(r){ return r.witness === "B" && r.legal; });
check("surge: flailer rounds tripped, not capped",
      flailRounds.every(function(r){ return r.verdict === "tripped"; }),
      flailRounds.map(function(r){ return r.verdict; }).join(", "));
// 0.3 recalibration: under region credit a flailer earns a little R early (regions are
// wide), so it now folds back via the STALL trip — no new target for 2x grace — instead of
// the Gamma trip. Worst honest bound: last productive probe can be as late as the grace
// window, so trip <= GRACE + 2*GRACE. Budget still saved (measured: 14 of the 25 cap).
check("surge: budget saved (stall-tripped within grace + 2x grace)",
      flailRounds.every(function(r){ return r.probes <= 3 * vm.RULES.SURGE_GRACE_PROBES; }),
      "probes: " + flailRounds.map(function(r){ return r.probes; }).join(", "));
check("surge: readers never trip",
      clean.rounds.every(function(r){ return r.verdict !== "tripped"; }));

// ---- 3. false pass is the finding, and it is harvested ------------------------------------
var quitRounds = surge.rounds.filter(function(r){ return r.witness === "A" && r.legal; });
check("quitter on a seamed case = false pass, builder scores the finding (15)",
      quitRounds.every(function(r){ return r.verdict === "false pass" && r.score.builder === vm.RULES.SCORE.findingB; }),
      JSON.stringify(quitRounds.map(function(r){ return [r.verdict, r.score.builder]; })));
check("harvest holds the winning declarations", surge.harvest.length === quitRounds.length &&
      surge.harvest.every(function(h){ return h.declaration && h.builder && h.round >= 0; }));

// ---- 4. quotas and illegality forfeit ------------------------------------------------------
var spam = vm.playMatch("m-spam",
  player("A", [D.cartSound, D.giftSound, D.cartSound], specReaderPlay),   // 3 sound builds: 3rd breaks quota
  player("B", [D.discountDev, D.discountDev, D.discountDev], specReaderPlay));
var spamBuilds = spam.rounds.filter(function(r){ return r.builder === "A"; });
check("sound quota: third sound build forfeits", spamBuilds[2].verdict === "illegal" &&
      spamBuilds[2].reason.indexOf("quota") >= 0, JSON.stringify(spamBuilds.map(function(r){ return r.verdict; })));
var cheat = vm.playMatch("m-cheat",
  player("A", [D.tooWide, D.tooWide, D.tooWide], specReaderPlay),
  player("B", [D.discountDev, D.discountDev, D.discountDev], specReaderPlay));
var cheatBuilds = cheat.rounds.filter(function(r){ return r.builder === "A"; });
check("illegal declaration forfeits with witness compensation",
      cheatBuilds.every(function(r){ return r.verdict === "illegal" && r.score.witness === vm.RULES.SCORE.illegalW; }));

// ---- 5. the surge respects honest work: no trip before coverage completes ------------------
// 0.3 recalibration (was: "the cap is reachable by honest wandering"). Under the target
// model the wanderer COMPLETES full coverage during its aimed phase; everything after is
// post-coverage lag on a sound case, which the gauge now correctly folds back (verdict
// tripped, ~probe 22 vs burning to the 25 cap). The doctrine that must hold: coverage is 1.0
// at the trip — the work was done and respected; only the waste was cut. The 25 cap remains
// the outer backstop for play that keeps finding new ground.
var capMatch = vm.playMatch("m-cap",
  player("A", [D.giftSound, D.giftSound, D.giftSound], wandererPlay),
  player("B", [D.giftSound, D.giftSound, D.giftSound], wandererPlay));
var capRounds = capMatch.rounds.filter(function(r){ return r.legal; });
check("wanderer's aimed work is respected: coverage complete BEFORE the fold-back",
      capRounds.every(function(r){ return r.verdict === "tripped" && r.coverage === 1 && r.probes < vm.RULES.PROBE_CAP; }),
      JSON.stringify(capRounds.map(function(r){ return [r.verdict, r.coverage, r.probes]; })));

// ---- 6. replay reproduces the match; the harness is deterministic --------------------------
(function(){
  var rep = vm.replay(clean);
  var same = rep.rounds.every(function(rr, i){
    var live = clean.rounds[i];
    if (live.legal === false) return rr.verdict === "illegal";
    return rr.verdict === live.verdict && rr.probes === live.probes &&
           rr.score.witness === live.score.witness && rr.score.builder === live.score.builder;
  });
  check("replay reproduces the match exactly", same);
  var again = vm.playMatch("m-clean",
    player("A", [D.discountDev, D.giftDev, D.cartSound], specReaderPlay),
    player("B", [D.giftDev, D.cartSound, D.discountDev], specReaderPlay));
  check("the harness is deterministic (same players, same match)",
        JSON.stringify(again) === JSON.stringify(clean));

  // the scale is labelled: the live ledger carries the current version...
  check("ledger stamps the current scale version", clean.rules === vm.RULES.version, "stamped " + clean.rules);
  // ...and replay REFUSES a ledger whose label predates the current scale (the version-tag fix,
  // 2026-07-15). A stale ledger under a changed scale would re-rate silently; replay rejects it.
  var stale = JSON.parse(JSON.stringify(clean)); stale.rules = "0.1";
  var refusal = vm.replay(stale);
  check("replay refuses a stale-labelled ledger (no silent re-rating)",
        refusal.refused === true && refusal.rounds.length === 0, JSON.stringify(refusal.reason || refusal));

  // The part label matches the part value: the frozen fixture pins scoreRound to its scale.
  // A scoring-constant change without a re-freeze (which carries the version bump) breaks a row.
  var fx = JSON.parse(fs.readFileSync(path.join(__dirname, "scale-fixture.json"), "utf8"));
  check("fixture scale label equals the current version", fx.scale === vm.RULES.version, fx.scale + " vs " + vm.RULES.version);
  var drift = null;
  fx.rows.forEach(function(r){
    var s = vm._scoreRound(r.verdict, r.probes, r.par);
    if (s.witness !== r.witness || s.builder !== r.builder) drift = r.verdict + "@" + r.probes + "/" + r.par;
  });
  check("every frozen scoring row still computes identically (no unlabelled scale drift)", drift === null, "drift at " + drift);
})();

// ---- write the harvest file (the promotion lane's inbox) -----------------------------------
var harvestFile = path.join(__dirname, "harvest-candidates.json");
fs.writeFileSync(harvestFile, JSON.stringify({ _meta: {
  purpose: "Seam constructions that beat a witness (false passes) — the discovered open nodes. Promotion to the suite/human arcade happens ONLY through Jake's cold-read lane, never automatically.",
  source: "run-versus-match.js reference matches (deterministic)" }, candidates: surge.harvest }, null, 1));
check("harvest-candidates.json written and parses", !!JSON.parse(fs.readFileSync(harvestFile, "utf8")).candidates);

if (process.argv.indexOf("--self-test") < 0){
  console.log("clean match totals: " + JSON.stringify(clean.totals) + " -> winner " + clean.winner);
  console.log("surge match: flailer rounds " + flailRounds.map(function(r){ return r.verdict + "@" + r.probes; }).join(", "));
  console.log("");
}

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " harness integrity break(s):");
  fails.forEach(function(f){ console.log("  ✗ " + f); });
  process.exit(1);
}
console.log("GREEN — hidden-information rounds, surge protection, quotas, forfeits, the finding, harvest, replay, and determinism all hold.");
process.exit(0);
