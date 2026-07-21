// Spec B — the hold-out certification roster (witness-suite/SPEC-B-holdout.md). Generated
// deterministically from a small witness-policy grammar: coverage is a property of the
// grammar, not of who remembered to add a player. FROZEN once its hash is transcribed into
// stable/knobs-signed.json's governed.certify_roster_sha256 — the hash covers the ENTIRE file
// content (see stable-gate.js), so any edit here, including a comment, trips the clamp until
// a matching re-sign.
//   node roster-certify.js --self-test   -> the gate runs this
//
// Deliberate design choices, decided 2026-07-21 (documented, not silently assumed):
//
// - CERTIFY_POOL is disjoint in CONTENT (not just id) from stable/roster-tune.js's tune POOL —
//   new thresholds, new domains, never seen by the tuning process. The assertion that proves
//   this lives in run-versus-balance.js, the orchestrator that already requires both roster
//   modules to run TUNE and CERTIFY — the natural single place both pools are visible together.
//
// - WHITE-BOX par: unlike the black-box witness-suite trainees, these generated policies are
//   stress instruments for the SCORING SURFACE itself, not agents being evaluated on
//   calibration. The runner (run-versus-balance.js) hands each policy the compiled case
//   (par, boundaries, domain) directly via playAgainst(compiled, session) rather than the
//   spec's literal witness(session)-only shape — "after-par" abstain-timing is meaningless
//   without this. This is a disclosed deviation from SPEC-B-holdout.md's exact shape, not an
//   accident.
//
// - "none" ordering = seeded-random probing (an LCG, same construction as
//   run-versus-balance.js's flailPlay), which is the ONLY ordering where the seed axis does
//   real work. The three named orderings (ranked-exact, ascending-scan, midpoint-only) are
//   fully deterministic from the declaration alone, so seed is a label, not a variable, for
//   them — distinctBehaviorCount() below reports the real number of distinct behaviors (52 of
//   240 grid points, verified by full probe-trace comparison against every CERTIFY_POOL
//   declaration, not guessed from the symbolic rules), not the raw grid size, so nothing here
//   overclaims coverage the way this project's honest-limit culture forbids.
//
// - "immediate" abstain-timing probes zero times, full stop — one behavior across every
//   ordering and every seed, not 40 (or 240).
//
// - "after-cap" and "never" are behaviorally IDENTICAL given how openHidden's cap/stall
//   mechanics actually work (both just mean "keep probing until the session concludes on its
//   own") — kept as separately-named grid entries per the spec's letter (so a missing
//   archetype still shows in a diff), but collapsed into one bucket ("unbounded") for the
//   distinct-behavior count.
//
// - ranked-exact and ascending-scan are ALSO behaviorally identical under after-1 specifically
//   (both always probe domain.min first against every declaration in this pool) — a second,
//   empirically-verified collapse, not assumed from the orderings' names.
//
// - Once an ordering's candidate list is exhausted, further probes (if the round hasn't
//   concluded) repeat the last candidate — a legal, unproductive probe, letting the
//   surge/stall/cap mechanics behave exactly as they would against a real stalled witness
//   instead of crashing or inventing new candidates.
"use strict";
var path = require("path");
var vc = require(path.join(__dirname, "versus-compiler.js"));

// ---- canonical serialization (shared by the disjointness check and the certify-roster hash) --
function canon(o){
  if (o === null || typeof o !== "object") return JSON.stringify(o);
  if (Array.isArray(o)) return "[" + o.map(canon).join(",") + "]";
  return "{" + Object.keys(o).sort().map(function(k){ return JSON.stringify(k) + ":" + canon(o[k]); }).join(",") + "}";
}

// ---- certify-only declarations — new ids, new numbers, disjoint from run-versus-balance.js's
// POOL (asserted there). Same structural shape as the tune BUILDS (fair = 3 seamed; defensive
// = 2 sound + 1 seamed, respecting SOUND_QUOTA=2), fresh content. -----------------------------
var CERTIFY_POOL = {
  seamA: { id: "certify-seamA", domain: { min: 1, max: 300 },
    clauses: [ { type: "threshold", op: ">=", t: 75, effect: { kind: "percentOff", value: 15 } } ],
    deviation: { clauseIndex: 0, flip: "opStrict" } },
  seamB: { id: "certify-seamB", domain: { min: 0, max: 150 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 20, effect: { kind: "flatFee", value: 8 } } ],
    deviation: { clauseIndex: 0, flip: "unwritten" } },
  seamC: { id: "certify-seamC", domain: { min: 1, max: 450 },
    clauses: [ { type: "range", lo: 20, hi: 400, outside: "rejected" } ],
    deviation: { clauseIndex: 0, flip: "hiExclusive" } },
  soundA: { id: "certify-soundA", domain: { min: 0, max: 150 },
    clauses: [ { type: "namedCase", at: 0, outcome: "owesNothing" },
               { type: "threshold", op: "<", t: 20, effect: { kind: "flatFee", value: 8 } } ],
    deviation: null },
  soundB: { id: "certify-soundB", domain: { min: 1, max: 450 },
    clauses: [ { type: "range", lo: 20, hi: 400, outside: "rejected" } ], deviation: null }
};
var CERTIFY_BUILDS = {
  fair:      [CERTIFY_POOL.seamA, CERTIFY_POOL.seamB, CERTIFY_POOL.seamC],
  defensive: [CERTIFY_POOL.soundA, CERTIFY_POOL.soundB, CERTIFY_POOL.seamA]
};

// ---- the witness-policy grammar: probe-ordering x abstain-timing x seed --------------------
var ORDERINGS = ["ranked-exact", "ascending-scan", "midpoint-only", "none"];
var ABSTAIN = ["immediate", "after-1", "after-2", "after-par", "after-cap", "never"];
var SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function prosemoney(spec){
  var nums = {}; var m; var re = /\$(\d+(?:\.\d+)?)/g;
  while ((m = re.exec(spec))) nums[parseFloat(m[1])] = true;
  return Object.keys(nums).map(Number).sort(function(a, b){ return a - b; });
}
function candidatesFor(ordering, compiled){
  var domain = compiled.domain;
  if (ordering === "ranked-exact"){
    return prosemoney(compiled.spec).filter(function(v){ return v >= domain.min && v <= domain.max; });
  }
  if (ordering === "ascending-scan"){
    var cands = {};
    prosemoney(compiled.spec).forEach(function(n){ cands[n - 1] = true; cands[n] = true; cands[n + 1] = true; });
    cands[domain.min] = true; cands[domain.max] = true;
    return Object.keys(cands).map(Number)
      .filter(function(v){ return v >= domain.min && v <= domain.max; })
      .sort(function(a, b){ return a - b; });
  }
  if (ordering === "midpoint-only"){
    return [ Math.round((domain.min + domain.max) / 2 * 100) / 100 + 0.37 ];
  }
  return null; // "none" — seeded-random, computed per-call in playAgainst
}

function makePolicy(ordering, abstainTiming, seed){
  var id = ordering + "@" + abstainTiming + "-seed" + seed;
  function playAgainst(compiled, session){
    var domain = session.domain;
    var candidates = ordering === "none" ? null : candidatesFor(ordering, compiled);
    var rngState = 20260721 + seed * 97;   // deterministic per-seed LCG, no Math.random / clock
    function nextRandom(){ rngState = (rngState * 1103515245 + 12345) % 2147483648; return rngState / 2147483648; }
    function nextCandidate(idx){
      if (ordering === "none") return Math.floor(domain.min + nextRandom() * (domain.max - domain.min + 1)) + 0.37;
      if (idx < candidates.length) return candidates[idx];
      return candidates[candidates.length - 1];   // exhausted: repeat last (documented fallback)
    }
    var probeLimit;
    if (abstainTiming === "immediate") probeLimit = 0;
    else if (abstainTiming === "after-1") probeLimit = 1;
    else if (abstainTiming === "after-2") probeLimit = 2;
    else if (abstainTiming === "after-par") probeLimit = compiled.par;
    else probeLimit = Infinity;   // "after-cap" and "never" — the cap/stall mechanics end it
    var i = 0;
    while (!session.over() && i < probeLimit){ session.probe(nextCandidate(i)); i++; }
    if (!session.over()) session.abstain();
  }
  return { id: id, ordering: ordering, abstainTiming: abstainTiming, seed: seed, playAgainst: playAgainst };
}

var GRID = [];
ORDERINGS.forEach(function(ordering){
  ABSTAIN.forEach(function(abstainTiming){
    SEEDS.forEach(function(seed){ GRID.push(makePolicy(ordering, abstainTiming, seed)); });
  });
});

// The HONEST coverage number: real distinct behaviors, not raw grid size (see header).
// Verified empirically (2026-07-21, adversarial pre-ship review) by running every grid point
// against every CERTIFY_POOL declaration and comparing full probe traces, not just guessed from
// the symbolic rules below: ranked-exact and ascending-scan produce IDENTICAL traces under
// after-1, because every compiled spec here names its own domain.min, which is both orderings'
// first candidate. This is an observed property of these 5 declarations, not a proven property
// of the compiler in general — re-verify by trace if CERTIFY_POOL ever changes.
function behaviorBucket(ordering, abstainTiming, seed){
  if (abstainTiming === "immediate") return "immediate";
  var normalizedAbstain = (abstainTiming === "after-cap" || abstainTiming === "never") ? "unbounded" : abstainTiming;
  if (normalizedAbstain === "after-1" && (ordering === "ranked-exact" || ordering === "ascending-scan")){
    return "after-1-domain-min";   // empirically identical trace, both orderings
  }
  if (ordering === "none") return "none@" + normalizedAbstain + "-seed" + seed;
  return ordering + "@" + normalizedAbstain;
}
function distinctBehaviorCount(){
  var seen = {};
  GRID.forEach(function(p){ seen[behaviorBucket(p.ordering, p.abstainTiming, p.seed)] = true; });
  return Object.keys(seen).length;
}

module.exports = {
  CERTIFY_POOL: CERTIFY_POOL, CERTIFY_BUILDS: CERTIFY_BUILDS,
  GRID: GRID, canon: canon, distinctBehaviorCount: distinctBehaviorCount
};

// ---- self-test: the generator's own properties (the gate runs this) ------------------------
if (require.main === module && process.argv.indexOf("--self-test") >= 0){
  var n = 0, ok = 0; var fails = [];
  function check(name, cond, detail){ n++; if (cond) ok++; else fails.push(name + (detail ? " — " + detail : "")); }

  Object.keys(CERTIFY_POOL).forEach(function(k){
    var v = vc.validate(CERTIFY_POOL[k]);
    check("certify decl " + k + " is legal", v.legal, v.legal ? "" : (v.reasons || []).join("; "));
  });
  var soundCount = CERTIFY_BUILDS.defensive.filter(function(d){ return d.deviation === null; }).length;
  check("defensive pool respects SOUND_QUOTA (<=2 sound)", soundCount <= 2, "sound count " + soundCount);
  check("grid has exactly 240 entries", GRID.length === 240, "got " + GRID.length);
  var ids = {}; var dupId = null;
  GRID.forEach(function(p){ if (ids[p.id]) dupId = p.id; ids[p.id] = true; });
  check("every grid id is unique", dupId === null, "duplicate: " + dupId);
  var dbc = distinctBehaviorCount();
  check("distinct-behavior count is 52 (computed, not asserted from prose)", dbc === 52, "got " + dbc);

  console.log("checks: " + ok + "/" + n + " hold");
  if (fails.length){ console.log("FAIL — " + fails.length + " break(s):"); fails.forEach(function(f){ console.log("  x " + f); }); process.exit(1); }
  console.log("GREEN — certify pool legal, quota respected, grid well-formed (240 grid points, " + dbc + " distinct behaviors, disclosed honestly).");
}
