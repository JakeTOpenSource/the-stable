// Scoreboard data emitter — the custody chain between the Rail's math and the display.
//   node make-scoreboard-data.js            -> recompute, write scoreboard-data.json, inject into the page
//   node make-scoreboard-data.js --check    -> recompute and DIFF against both the JSON file and the
//                                              page's embedded copy; GREEN only if all three agree.
// Deterministic: same rail, same archetypes, same bytes.
"use strict";

var path = require("path");
var fs = require("fs");
var rail = require(path.join(__dirname, "rail.js"));
var ARCH = require(path.join(__dirname, "run-rail.js")).ARCH;

var JSON_FILE = path.join(__dirname, "scoreboard-data.json");
var PAGE_FILE = path.join(__dirname, "..", "public", "Crosswalk-Scoreboard.html");
var START = "/*SCOREBOARD-DATA-START*/", END = "/*SCOREBOARD-DATA-END*/";

function fresh(){
  var agents = Object.keys(ARCH).map(function(name){
    var sessions = ARCH[name]();
    var out = rail.route(sessions);
    return {
      name: name,
      route: out.route, reason: out.reason, flags: out.flags,
      agent: out.agent,
      sessions: out.phasors.map(function(p){
        return { caseId: p.caseId, verdict: p.verdict, gammaRe: p.gammaRe, gammaIm: p.gammaIm,
                 gammaAbs: p.gammaAbs, probes: p.probes, par: p.par };
      })
    };
  });
  return {
    _meta: {
      version: "0.1", generatedBy: "stable/make-scoreboard-data.js from stable/rail.js reference archetypes",
      boundary: "Reflection-coefficient plane (Smith, 1939): bounded mismatch bookkeeping, not physics. Z0 = par, the calibrated agent as reference impedance.",
      bands: { core: rail.POLICY.READY_BAND_INNER, ready: rail.POLICY.READY_BAND_OUTER }
    },
    agents: agents
  };
}

var data = fresh();
var text = JSON.stringify(data, null, 1);

if (process.argv.indexOf("--check") >= 0){
  var ok = true, msgs = [];
  try {
    var onDisk = fs.readFileSync(JSON_FILE, "utf8");
    if (onDisk !== text){ ok = false; msgs.push("scoreboard-data.json is stale vs the Rail"); }
  } catch(e){ ok = false; msgs.push("scoreboard-data.json missing"); }
  try {
    var page = fs.readFileSync(PAGE_FILE, "utf8");
    var s = page.indexOf(START), e = page.indexOf(END);
    if (s < 0 || e < 0){ ok = false; msgs.push("page has no data markers"); }
    else {
      var embedded = page.slice(s + START.length, e).trim();
      if (embedded !== JSON.stringify(data)){ ok = false; msgs.push("page's embedded data is stale vs the Rail"); }
    }
  } catch(e){ ok = false; msgs.push("scoreboard page missing"); }
  console.log("checks: " + (ok ? "3/3" : (3 - msgs.length) + "/3") + " hold");
  if (!ok){ console.log("FAIL — " + msgs.join("; ")); process.exit(1); }
  console.log("GREEN — the scoreboard shows exactly what the Rail computes; no drift between math and display.");
  process.exit(0);
}

fs.writeFileSync(JSON_FILE, text);
try {
  var page = fs.readFileSync(PAGE_FILE, "utf8");
  var s = page.indexOf(START), e = page.indexOf(END);
  if (s >= 0 && e >= 0){
    fs.writeFileSync(PAGE_FILE, page.slice(0, s + START.length) + JSON.stringify(data) + page.slice(e));
    console.log("injected into " + path.basename(PAGE_FILE));
  } else {
    console.log("page markers not found — JSON written only");
  }
} catch(e){ console.log("page not present yet — JSON written only"); }
console.log("scoreboard-data.json written (" + data.agents.length + " agents)");
