# Spec B — results (2026-07-21)

**Verdict: CERTIFY FAILS on the ratified knob.** The design in `SPEC-B-holdout.md` is built and run
for the first time. 150 of 240 generated witness policies hold (the fair-building pool scores at
least as well as the defensive/sound-heavy pool); 90 do not. Worst case: `ranked-exact@after-cap`,
seed 0 — fair scores 3, defensive scores 25, a 22-point gap in the defensive pool's favor. This was
predicted before the run (an adversarial-advisor pass computed the arithmetic in advance) and
directed by Jake ("build it anyway, let it fail — a red CERTIFY is the first real finding").

## What this is, precisely (corrected framing, 2026-07-21)

An earlier draft of this note described Spec B as catching the same kind of failure the Witness
Ledger's Candidate I ("ordering drift" — Purpose silently outranking Check while every individual
claim still passes) describes. **A cross-project Fable advisor pass declined that framing, and the
decline is correct — worth recording exactly why, so nobody re-reaches for the flattering label
later:**

- Ordering drift is defined as a rank inversion *invisible to a well-formed Check* — every local
  claim stays legitimate; what breaks is which function outranks which.
- Spec B's original problem was a **malformed Check**: the knob was validated against the same
  roster that tuned it — a reference checking itself, the Ledger's own named failure mode for
  Check ("claims checked against an internal echo"), not a rank inversion between two otherwise-
  intact functions.
- The proof is in how it was fixed: reconstituting Check properly (an externally disjoint,
  generated, frozen population) caught the problem immediately. Ordering drift is what a
  *correct* Check cannot see; Spec B's failure is exactly what a correct Check sees on the first
  real run. Filing it under the harder, still-open category would misfile a solved-category fix
  as progress on an unsolved one.
- Concretely: Delta Atlas already has a live, calibrated ordering-drift detector (the Priority
  Tracer) that has been run against planted inversions and clean traces. Spec B has never been
  tested against a planted rank-inversion at all — it has no specificity arm, operates on outcome
  distributions rather than decision traces, and its pass rule is one-directional where the
  tracer's question is required to be direction-symmetric. None of the four things that would
  have to exist before a hold-out mechanism could honestly claim that category exist here today.

**What Spec B honestly is:** Check's own externality clause, enforced by mechanism instead of
assumed — disjointness asserted at load (by id and by canonical declaration content, not just
name), the same scoring function used everywhere else in the tournament (no re-implementation),
riding the same signed clamp as every other governed knob. Real, useful, and modest: this is
upstream material a future priority-tracer-style detector could read (the tune-then-certify
decision logs are exactly the kind of trace that question would be asked of), not itself that
detector.

## The numbers

- Grid: 240 generated policies (probe-ordering × abstain-timing × seed), 52 truly distinct
  behaviors — verified by full probe-trace comparison against every certify declaration, not
  just guessed from the grammar's own symbolic rules — after collapsing degenerate duplicates
  (`immediate` collapses across every ordering and seed; `after-cap`/`never` are behaviorally
  identical given how the cap/stall mechanics work; `ranked-exact`/`ascending-scan` collapse
  under `after-1` because both always probe `domain.min` first against every declaration in this
  pool) — reported honestly rather than oversold as 240 independent tests. (A pre-ship adversarial
  review caught that the grammar's symbolic rules alone predicted 53, one more than the traces
  actually show — the number here is the empirically-verified one.)
- Fair pool (3 certify-only declarations) vs. defensive pool (2 sound + 1 seamed, respecting
  `SOUND_QUOTA`), scored with the exact same `_scoreRound` used throughout the tournament, summed
  per pool per policy.
- 150/240 policies: fair pool's builder-side total ≥ defensive pool's.
- 90/240 policies: defensive pool wins; worst gap 22 points (`ranked-exact@after-cap-seed0`).

## Falsification / soundness checks on the mechanism itself (separate from the knob's own result)

- Disjointness enforced at load, not assumed: no shared declaration id, no shared canonical
  content, between the certify pool and the tune roster (`run-versus-balance.js`).
- `roster-certify.js --self-test`: 9/9 — every certify declaration legal, quota respected, grid
  well-formed, distinct-behavior count independently recomputed (52) rather than asserted from
  prose.
- The generator's white-box design (the runner hands each policy `compiled.par`/`boundaries`
  directly, rather than the original design's black-box `witness(session)`-only shape) is a
  disclosed deviation, not an accident — these are stress instruments for the scoring surface
  itself, not calibration trainees.

## Honest limits

- **n=1 run.** A red CERTIFY here means the ratified `/3` divisor does not generalize to this
  particular generated population; it is not yet known how sensitive that verdict is to the
  grammar's own choices (ordering set, abstain-timing set, seed count).
- **This does not re-litigate the deterministic core elsewhere in the repo** (the deadlock trial,
  the replication trial) — it is scoped to this one knob, in this one game.
- **Not a Candidate I detector** (see above) — do not cite this result as ordering-drift evidence
  without the four missing pieces named above.
- **How the gate actually handles the red finding:** the original design said "require the
  CERTIFY block specifically green," which a pre-ship review caught would make this repo's own
  pre-push hook physically reject the push (it requires `stable-gate.js` to pass). Fixed the same
  way the deadlock trial's GRANTED and the replication trial's DENIED are already handled: the
  gate pins the exact reported line as a CLAIM, not "must be positive" — `stable-gate.js` holds
  CERTIFY's current, honest, correctly-isolated FAIL result and stays green *because* the finding
  reproduces exactly, not because the finding is good news. If the knob is later revised and the
  real result changes, that line must be updated deliberately, the same discipline the clamp
  itself already enforces for governed knobs — it cannot drift silently.

## Reproduce

```
node stable/roster-certify.js --self-test          # 9/9 — the generator's own properties
node stable/run-versus-balance.js --self-test      # TUNE informational, CERTIFY gates (currently FAILs)
```
