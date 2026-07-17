// stable-gate.js — deterministic custody gate for The Stable (the agent / "horses" pole).
// Split out of The Crosswalk's gate 2026-07-16 when the two poles were galvanically isolated
// into separate repos. This gate proves the Stable's OWN integrity: the suite, the Rail, the
// Versus Table, the clamp, the scoreboard. It shares only the METHOD with the human gate
// (State Delta: enumerate-never-hand-list, check-the-property, fail-closed, bite-proof) —
// that shared reference is COPIED here, not imported, so the two circuits have no conductive
// path between them. Green contract (fuse-compatible): prints N/N and GREEN, else FAIL + exit 1.
// Override the dir for testing with STABLE_DIR.
"use strict";
const fs = require("fs");
const path = require("path");

const DIR = process.env.STABLE_DIR || __dirname;   // gate sits at repo root; no machine identity in the tree
const PUB = path.join(DIR, "public");

// --- the shared reference (State Delta), copied not imported ---
function lum(hex){ const c = hex.replace("#","").match(/../g).map(h=>parseInt(h,16)/255)
  .map(v=>v<=0.04045? v/12.92 : Math.pow((v+0.055)/1.055,2.4));
  return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; }
function contrast(a,b){ const [l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x); return (l1+0.05)/(l2+0.05); }
let checks = 0, passes = 0;
const fails = [];
function check(page, name, ok, detail){
  checks++;
  if (ok) { passes++; }
  else fails.push(page + " :: " + name + (detail ? " — " + detail : ""));
}

// --- HTML custody for the Stable's own pages (the Scoreboard) ---
const pages = fs.existsSync(PUB) ? fs.readdirSync(PUB).filter(f=>f.endsWith(".html")).sort() : [];
console.log("enumerated Stable pages: " + pages.length + " in " + PUB);
for (const f of pages){
  const raw = fs.readFileSync(path.join(PUB,f), "utf8");
  const noComments = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  check(f, "doctype", /^<!doctype html>/i.test(raw.trim()));
  check(f, "lang=en", /<html lang="en">/.test(raw));
  check(f, "charset", /<meta charset="utf-8">/.test(raw));
  check(f, "viewport", /<meta name="viewport"/.test(raw));
  check(f, "title present", /<title>[^<]+<\/title>/.test(raw));
  check(f, "footer honesty line", /no account, no tracking/.test(raw));
  check(f, "no legacy name", !/Code Crosswalk/.test(raw), "says 'Code Crosswalk'");
  const rootM = raw.match(/:root\{([^}]*)\}/);
  check(f, ":root tokens present", !!rootM);
  if (rootM){
    const tok = {};
    for (const m of rootM[1].matchAll(/--([a-z2]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) tok[m[1]] = m[2];
    const grounds = ["bg","panel","panel2"].filter(g=>tok[g]);
    check(f, "grounds declared", grounds.length === 3, "needs --bg, --panel, --panel2");
    const textTokens = Object.keys(tok).filter(k=>!["bg","panel","panel2","line"].includes(k));
    for (const t of textTokens){
      const worst = Math.min(...["panel","panel2"].filter(g=>tok[g]).map(g=>contrast(tok[t], tok[g])));
      check(f, "text token --"+t+" >=4.5:1 on panels", worst >= 4.5, worst.toFixed(2)+":1");
    }
    if (tok.line){
      const worstLine = Math.min(...grounds.map(g=>contrast(tok.line, tok[g])));
      check(f, "border token --line >=3:1", worstLine >= 3, worstLine.toFixed(2)+":1");
    }
  }
  check(f, "no Math.random", !/Math\.random\s*\(/.test(noComments));
  check(f, "no Date.now / new Date", !/Date\.now\s*\(|new Date\s*\(/.test(noComments));
  if (/addEventListener/.test(noComments)){
    check(f, "fixture API doc comment", /Fixture API/.test(raw));
    check(f, "fixture API exposed on window", /window\.[A-Z]+\s*=/.test(noComments));
  }
}

// --- data custody ---
try {
  JSON.parse(fs.readFileSync(path.join(DIR,"agent-eval-landscape-v0.json"),"utf8"));
  check("agent-eval-landscape-v0.json","parses",true);
} catch(e){ check("agent-eval-landscape-v0.json","parses",false,e.message); }

// --- the Stable machines: each self-tests ---
const { execSync } = require("child_process");
function selfTest(label, rel, args, timeout){
  try {
    const out = execSync('node "' + path.join(DIR, rel) + '"' + (args?" "+args:""),
                         { stdio:["ignore","pipe","pipe"], timeout: timeout||30000 }).toString();
    check(label, "self-test GREEN", /GREEN/.test(out) && !/FAIL/.test(out));
  } catch(e){ check(label, "self-test GREEN", false, "nonzero exit or did not run"); }
}
selfTest("witness-suite", "witness-suite/run-witness-suite.js", "--self-test");
selfTest("stable/rail", "stable/run-rail.js", "--self-test");
selfTest("stable/versus-compiler", "stable/run-versus-compiler.js", "--self-test");
selfTest("stable/versus-match", "stable/run-versus-match.js", "--self-test");
selfTest("stable/versus-balance", "stable/run-versus-balance.js", "--self-test", 60000);
selfTest("scoreboard custody", "stable/make-scoreboard-data.js", "--check");
// The replication's published verdict (DOCTRINE DENIED, 2026-07-17) is a CLAIM — so it is
// gate-checked like every other claim: the replay must reproduce the exact tallies forever.
selfTest("bridge/replay-replication", "bridge/replay-replication.js", "--self-test");

// --- publication hygiene: no local-machine identity in the publishable tree ---------------
// Semantic classes, not a blacklist (2026-07-17 privacy sweep): absolute filesystem paths,
// user directories, e-mail addresses. Regexes are assembled from fragments so this gate
// file itself contains no matchable literal. Scope: every git-tracked file.
try {
  const tracked = execSync("git ls-files", { cwd: DIR, stdio: ["ignore","pipe","pipe"] })
    .toString().trim().split(/\r?\n/).filter(Boolean);
  const BS = "\\" + "\\";
  const HYG = [
    { name: "absolute drive path to a user directory",
      re: new RegExp("[A-Za-z]:(" + BS + "|/)+" + "(Us" + "ers|ho" + "me)", "i") },
    { name: "posix user-directory path",
      re: new RegExp("(/Us" + "ers/|/ho" + "me/|App" + "Da" + "ta)") },
    { name: "e-mail address",
      re: new RegExp("[a-z0-9._%+-]+" + "@" + "[a-z0-9.-]+" + "\\.[a-z]{2,}", "i") },
  ];
  for (const h of HYG){
    const offenders = tracked.filter(f => {
      try { return h.re.test(fs.readFileSync(path.join(DIR, f), "utf8")); } catch(e){ return false; }
    });
    check("hygiene", "no " + h.name + " in any of " + tracked.length + " tracked files",
          offenders.length === 0, offenders.join(", "));
  }
} catch(e){ check("hygiene", "publication sweep ran", false, e.message || "failed"); }
try {
  const hv = path.join(DIR,"stable","harvest-candidates.json");
  if (fs.existsSync(hv)) { JSON.parse(fs.readFileSync(hv,"utf8")); check("harvest-candidates.json","parses",true); }
} catch(e){ check("harvest-candidates.json","parses",false,e.message); }

// --- the clamp: no governed knob changes without a matching edit to the signed disposition ---
try {
  const crypto = require("crypto");
  const rules = require(path.join(DIR,"stable","versus-match.js")).RULES;
  const signedFull = JSON.parse(fs.readFileSync(path.join(DIR,"stable","knobs-signed.json"),"utf8"));
  const signed = signedFull.governed;
  const fx = JSON.parse(fs.readFileSync(path.join(DIR,"stable","scale-fixture.json"),"utf8"));
  const fxHash = crypto.createHash("sha256").update(JSON.stringify({scale:fx.scale, rows:fx.rows})).digest("hex");
  const live = {
    scale_version: rules.version, SOUND_QUOTA: rules.SOUND_QUOTA, PROBE_CAP: rules.PROBE_CAP,
    SURGE_VSWR_TRIP: rules.SURGE_VSWR_TRIP, SURGE_GRACE_PROBES: rules.SURGE_GRACE_PROBES,
    scale_fixture_sha256: fxHash, SCORE: rules.SCORE,
  };
  const REQUIRED = ["scale_version","SOUND_QUOTA","PROBE_CAP","SURGE_VSWR_TRIP","SURGE_GRACE_PROBES","scale_fixture_sha256","SCORE"];
  const REQUIRED_SCORE = ["catchW","nullW","prematureB","findingB","openB","illegalW"];
  const missing = REQUIRED.filter(k => !(k in signed)).concat(
    (signed.SCORE ? REQUIRED_SCORE.filter(k => !(k in signed.SCORE)).map(k=>"SCORE."+k) : ["SCORE(absent)"]));
  const drift = [];
  for (const k of REQUIRED) {
    if (k === "SCORE") {
      for (const sk of REQUIRED_SCORE)
        if (signed.SCORE && live.SCORE[sk] !== signed.SCORE[sk]) drift.push("SCORE."+sk+" live "+live.SCORE[sk]+" != signed "+signed.SCORE[sk]);
    } else if (live[k] !== signed[k]) drift.push(k+" live "+String(live[k]).slice(0,12)+" != signed "+String(signed[k]).slice(0,12));
  }
  check("clamp", "signed record is complete", missing.length === 0, "governed missing: "+missing.join(", "));
  check("clamp", "governed knobs + fixture hash match the signed disposition", drift.length === 0,
        drift.join("; ") + " — a governed knob or the scoring fixture changed without a signoff in stable/knobs-signed.json");

  // Ratification ENFORCEMENT (2026-07-16): the newest signoff entry must be a real, ratified
  // human disposition that PINS the exact governed state it approved (governed_sha256). Move any
  // knob and the governed hash changes, no longer matching the ratified entry -> RED until a new
  // ratified, hash-pinned entry is appended. Closes the dead-metadata gap (ratified/token were
  // never read). Honest limit: still procedural, not cryptographic identity — a forger can write
  // a ratified entry with a matching hash, but no knob moves SILENTLY anymore; every change now
  // demands an explicit, ratified, hash-pinned disposition. A bright line, not a lock.
  function canon(o){ return (o && typeof o === "object" && !Array.isArray(o))
    ? "{"+Object.keys(o).sort().map(k=>JSON.stringify(k)+":"+canon(o[k])).join(",")+"}"
    : JSON.stringify(o); }
  const govHash = crypto.createHash("sha256").update(canon(signed)).digest("hex");
  const log = Array.isArray(signedFull.signoff_log) ? signedFull.signoff_log : [];
  const newest = log[log.length - 1];
  check("clamp", "a ratified disposition exists", !!newest && newest.ratified === true,
        "newest signoff is not ratified:true — ratify or revert");
  check("clamp", "ratification carries a real token", !!newest && !!newest.ratification_token && newest.ratification_token !== "PENDING",
        "token is missing or PENDING");
  check("clamp", "ratification matches the current scale", !!newest && newest.scale === rules.version,
        newest ? "ratified scale "+newest.scale+" != live "+rules.version : "no entry");
  check("clamp", "ratification pins the current governed state", !!newest && newest.governed_sha256 === govHash,
        newest ? "ratified governed_sha256 "+String(newest.governed_sha256).slice(0,12)+" != live "+govHash.slice(0,12)+" — a knob moved without a new ratified disposition" : "no entry");
} catch(e){ check("clamp", "governed knobs match the signed disposition", false, "clamp could not run: "+(e.message||"unknown")); }

console.log("checks: " + passes + "/" + checks + " hold");
if (fails.length){
  console.log("FAIL — " + fails.length + " custody break(s):");
  for (const x of fails) console.log("  ✗ " + x);
  process.exit(1);
}
console.log("GREEN — the Stable's chain of custody holds: pages, data, machines, and the clamp.");
process.exit(0);
