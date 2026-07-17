# Spec B — the isolation transformer (hold-out certification), design v0

For Jake's cold read. Synthesized from three independent designs under adversarial review
(workflow 2026-07-15): holdout-roster's spine + property-invariants' generation + crossval's
disjointness discipline. Not yet built — this is the design to approve or amend.

## The problem it solves

Phase 3 tuned a knob against six named players and certified it against those same six. The
red team proved the gap two ways: an off-roster instant-abstain witness harvested findings
with no invariant firing, and the tuning was blessed by the very test that motivated it. In
circuit terms: the measurement bus and the reference rail shared a winding — feedback with no
isolation, which is how an amplifier tunes itself into its own blind spot. Spec B installs the
isolation transformer: **the roster a knob is TUNED on and the roster it is CERTIFIED on are
galvanically separate, and no knob ships unless it holds on players it was never fit to.**

## Mechanism

Split `run-versus-balance.js`'s single `PLAYERS` into two separate files:

- **`stable/roster-tune.js`** — free to iterate while searching for a knob value. Carries no
  gate weight. This is where a human (or later, a proposal loop) explores.
- **`stable/roster-certify.js`** — frozen, and **generated deterministically** from a small
  witness-policy grammar rather than hand-picked, so coverage is a property of the grammar,
  not of who remembered to add a player. Dimensions:
  - probe-ordering: {ranked-exact, ascending-scan, midpoint-only, none}
  - abstain-timing: {immediate, after-k for k in {1, 2, par, cap}, never}
  - a fixed enumerated seed list 0..9 (no `Math.random`, no clock)

  Every grid point gets a canonical self-documenting id (e.g. `ranked-abstain@2-seed3`), so a
  missing archetype shows up in a diff instead of being silently absent. The instant-abstain
  witness that beat Phase 3 is now just one grid point, produced automatically.

**Disjointness is enforced, not assumed:** a load-time assertion checks that tune and certify
share no player id AND no `POOL` declaration by id — renaming a player around an identical
declaration cannot fake separation.

## Data shape

- The two roster files are pure generators: dimensions in, `[{name, witness(session)}]` out,
  no I/O.
- `knobs-signed.json/governed` gains one scalar: `"certify_roster_sha256": "<hex>"` — the hash
  of the canonically-serialized generated certify population. Because it is a scalar in
  `governed`, **the existing clamp loop already compares it** (this is the same rail the
  scale-fixture hash now rides — Spec B composes with the clamp instead of bolting on beside
  it). Editing the held-out roster to fit a favored knob becomes a visible, signed act.
- `run-versus-balance.js` runs its existing invariant suite **twice**, printing two labeled
  blocks: `TUNE: GREEN/FAIL` (informational only) and `CERTIFY: GREEN/FAIL` (gating). No
  averaging or blending across the two rosters — that would re-couple the windings.

## Pass / fail rule

Certification requires the **CERTIFY block green on its own merits**. The core property, stated
over the whole generated population: playing the **fair** builder pool against any generated
witness `w` must score at least as high as playing the **defensive/sound-heavy** pool against
that same `w`. Fail is any single `w` where defense out-scores fair play; the report names that
`w`'s id and the gap. In one line: **sound-spam must not be the builder's strictly-best
response to any policy the grid can express.**

## How the gate enforces it

Extend block 12b and reuse the hash rail from the clamp:
1. Require the `CERTIFY` block specifically green (not merely "a GREEN line is present").
2. Compute the live hash of `roster-certify.js`'s generated population and require it to equal
   `knobs-signed.json`'s `certify_roster_sha256`. The clamp already diffs that scalar, so a
   held-out-roster edit trips the clamp until a human transcribes the new hash.

## Honest limit (do not overclaim)

This proves a knob did not overfit the visible tune set and that it generalizes across **every
policy the declared grammar can express**. It does NOT prove fairness against a witness that
uses information outside the grid's axes, and two rosters that share a blind spot (e.g. both
exercising only prose-money seam grammar) can still overfit that shared gap invisibly. It is
necessary evidence against narrow fitting, not a proof of general fairness. Procedural, not
predictive — the same boundary the clamp carries.

## What was dropped, and why

- **crossval's signoff_log coupling** — dropped: the red team confirmed that field is currently
  dead (no code reads it). Wiring ratification is a separate decision (see the clamp's
  self-sign finding), not part of the hold-out mechanism.
- **crossval's live fold-recompute** — dropped: it reintroduced the self-referential trust
  ("check the artifact against the live function") that made the fixture launderable in the
  first place. Hashing the generated population instead is what closes it.

## Build order (when approved)

1. The generator grammar + `roster-certify.js` + the disjointness assertion.
2. Freeze the certify population, hash it, transcribe into `governed` (a signed act).
3. Extend `run-versus-balance.js` to the TUNE/CERTIFY two-block run.
4. Extend the gate: CERTIFY-green + hash match. Prove the bite (edit the held-out roster to
   rescue a bad knob -> gate red on the hash).
