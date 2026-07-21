# Spec B — results (2026-07-21, widened and then rebuilt same day)

**Current verdict: CERTIFY FAILS on the ratified knob — 740/1120 hold (66.1%).** Three runs
happened today, in order, each an honest data point kept below rather than overwritten: 150/240
(62.5%, first run) → 520/1120 (46.4%, widened grid, same certify pool) → **740/1120 (66.1%,
widened grid, rebuilt certify pool)**. The jump between the last two isn't the knob getting
better — it's a real construction bug in the certify pool being fixed (see "The certify pool
rebuild" below). The knob still does not generalize to the held-out grid; the rate just got more
honest as the instrument measuring it improved.

**First run (240 points), for the record:** 150/240 held; worst case `ranked-exact@after-cap`,
seed 0 — fair scores 3, defensive scores 25, a 22-point gap. This was predicted before the run (an
adversarial-advisor pass computed the arithmetic in advance) and directed by Jake ("build it
anyway, let it fail — a red CERTIFY is the first real finding").

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

## The numbers (first run, 240 points)

- Grid: 240 generated policies (probe-ordering × abstain-timing × seed: `ranked-exact`,
  `ascending-scan`, `midpoint-only`, `none` × `immediate`, `after-1`, `after-2`, `after-par`,
  `after-cap`, `never` × 10 seeds), 52 truly distinct behaviors — verified by full probe-trace
  comparison against every certify declaration, not just guessed from the grammar's own symbolic
  rules. (A pre-ship adversarial review caught that the grammar's symbolic collapse rules alone
  predicted 53, one more than the traces actually show — the widened run below replaced that
  symbolic reasoning with a direct trace comparison, so this class of error can't recur.)
- Fair pool (3 certify-only declarations) vs. defensive pool (2 sound + 1 seamed, respecting
  `SOUND_QUOTA`), scored with the exact same `_scoreRound` used throughout the tournament, summed
  per pool per policy.
- 150/240 policies: fair pool's builder-side total ≥ defensive pool's.
- 90/240 policies: defensive pool wins; worst gap 22 points (`ranked-exact@after-cap-seed0`).

## The widened run (1120 points, 2026-07-21, same day)

Jake directed widening the grid to convert the single 62.5% sample into an actual rate: 3 new
probe-orderings (`descending-scan` — same candidate set as `ascending-scan`, reverse order;
`extremes-first` — domain min/max probed before anything else, the witness-suite's own "domain
extremes are first-class targets" doctrine as a policy; `boundary-targeted` — white-box, probes
`compiled.boundaries` directly rather than regex-parsing prose dollar amounts like `ranked-exact`
does), 2 new abstain-timings (`after-3`, `after-5`), seeds doubled to 20. Grid: 240 → 1120 points,
155 truly distinct behaviors (trace-verified, same method as above — the symbolic collapse rule
was retired entirely in favor of the provably-correct trace comparison, rather than hand-extended
and risking another off-by-one).

**Result: 520/1120 hold (46.4%) — worse than the first run's 62.5%, not better.** Worst case:
`boundary-targeted@after-cap`, seed 0 — fair scores 1, defensive scores 24, a 23-point gap.

**The genuinely interesting part is where the failures concentrate, broken down by ordering:**

| ordering | hold | fail | hold rate |
|---|---|---|---|
| `midpoint-only` | 160 | 0 | 100% |
| `none` (random) | 160 | 0 | 100% |
| `descending-scan` | 100 | 60 | 63% |
| `ranked-exact` | 40 | 120 | 25% |
| `ascending-scan` | 20 | 140 | 13% |
| `extremes-first` | 20 | 140 | 13% |
| `boundary-targeted` | 20 | 140 | 13% |

The lazy/unstructured orderings (`midpoint-only`, random `none`) never trigger the imbalance at
all — they don't probe enough to stress it. The **targeted, structured orderings — the kind a
real, careful witness actually uses — hold only 13–25% of the time.** This makes the finding more
serious, not less: it means the imbalance is worst against exactly the probing style a real model
tends to use (this project's own prior real-agent runs consistently show targeted, prose-informed
probing, not random flailing), so the narrower grid's 62.5% figure was, if anything, an optimistic
sample rather than a pessimistic one.

**The ascending/descending asymmetry, chased down (2026-07-21):** `descending-scan` holds 63% of
the time vs. `ascending-scan`'s 13%, despite probing the identical candidate set in reverse. Root
cause, confirmed with a per-declaration diagnostic trace: **`certify-seamB`'s planted bug sits
exactly at its `domain.min` (0), and `certify-seamC`'s sits near its `domain.max` (400, close to
the 450 ceiling)** — an accidental artifact of where the deviations were placed when these
declarations were hand-built, not a property of the scoring engine.

- `ascending-scan` (starts at `domain.min`) catches `seamB` for free — 1 probe, builder score
  exactly 0 — but needs 7 probes to reach `seamC`'s bug, so under any short abstain-timing
  (`after-1` through `after-5`) it misses `seamC` entirely: a **false pass**, worth a flat 15
  points to the builder regardless of how few probes were spent. Net for short timings: 0 (seamB,
  caught) + 15 (seamC, missed) = 15.
- `descending-scan` is NOT a mirror image — the two bugs aren't symmetric, so neither is the
  cost. Descending reaches `seamC`'s bug in 4 probes (faster than ascending's 7, since 400 sits
  closer to `domain.max` than `domain.min` is far from it) but doesn't reach `seamB`'s bug until
  probe 10 — the very last candidate, because that bug sits *exactly at* an extreme (`domain.min`)
  while `seamC`'s only sits *near* one. Under the shortest timings (`after-1` through `after-3`),
  descending is still short of both, so it misses both: 15 + 15 = 30, exactly double ascending's
  15 (not "nearly" — verified exact, both by direct computation and by an independent adversarial
  re-derivation).
- **`after-cap`/`never` do NOT converge by shifting to the sound side, as an earlier draft of
  this note claimed — that framing was checked and was wrong.** At those timings `soundA`/`soundB`
  both register `tripped` (the surge/VSWR protector fires, not a full calibrated-null coverage),
  which pays a flat `openB=12` each — **24 total, identical for both orderings.** The sound
  declarations contribute *nothing* to the residual difference between orderings here. What
  narrows the gap is still entirely `seamB`+`seamC`: ascending, having reached both bugs by now,
  totals 0+6=6; descending totals 9+3=12 (its late `seamB` catch, at probe 10, still costs more
  than a catch would if it had happened earlier — `probes-1` grows with the probe count). Gap
  (sound − seam) is 24−6=18 for ascending vs. 24−12=12 for descending — narrower, but for the
  same reason as everywhere else in this analysis: the seam declarations, not the sound ones.

**How much of the gap this actually explains:** not "most of it" — all of it, exactly. An
adversarial pass verified the identity `(defensive total) − (fair total) = (soundA+soundB) −
(seamB+seamC)` holds with zero exceptions across the full 1120-point grid (every ordering, every
abstain-timing, every seed) — not an approximation from a sampled subset. For `ascending-scan`
vs. `descending-scan` specifically, this reduced form alone reproduces every hold/fail flip at
every abstain-timing exactly. The mechanism above is the complete explanation, not a partial one.

**What this actually means:** the 5× swing isn't telling us something new about the `/3` divisor —
it's exposing that these 5 certify declarations weren't built with their deviations placed
evenly across the domain, so a probe order that happens to start from the "wrong" end pays an
outsized false-pass penalty that has nothing to do with witness quality. This is a real
construction weakness in the certify pool itself, not a finding about the knob. **Jake directed
fixing it the same day — see "The certify pool rebuild," below** — rather than leaving it
documented and unfixed.

By abstain-timing (this widened-grid, pre-rebuild run): `immediate` is trivial by construction (0
probes, 100% hold, not a real test). `after-1` through `after-3` hold ~43%; `after-5` drops to
29%; `after-par` is the best of the "real" timings at 57%; `after-cap`/`never` (unbounded, full
exploration) are worst at 29% — more probing room for the defensive pool's overshoot-based
reward, the more the gap widens.

## The certify pool rebuild (2026-07-21, third pass, fixes the asymmetry above)

Jake: "fix the pool's construction now." Rebuilt all 5 `CERTIFY_POOL` declarations:

- **First fix:** the three fair-pool seams (`seamA`/`seamB`/`seamC`) were repositioned to the
  INTERIOR of their domains — ~33%, ~50%, ~67% of the way across — instead of sitting at (`seamB`)
  or near (`seamC`) a domain extreme. `namedCase` was dropped from the pool entirely: its "special
  value" is naturally the domain floor (e.g. "$0 owes nothing"), which reintroduces exactly the
  floor-clustering this rebuild exists to remove. This alone moved the overall rate from 46.4% to
  69.6% and closed most of the ascending/descending gap (13%/63% → 75%/63%).
- **Second fix, same day (a follow-up adversarial review caught a subtler recurrence of the same
  bug):** the first-pass rebuild gave `seamB`'s threshold a `flatFee` effect, whose dollar value
  (originally 8) showed up as its own "$" figure in the compiled prose. The candidate-list
  generator (`ascendingSet`/`prosemoney`) picks up *every* dollar figure in the spec text, not
  just the seam's own threshold — so this planted an unrelated decoy candidate cluster near the
  domain floor that `ascending-scan` reached before the real seam at 75. Same floor-clustering
  problem, re-entering through the prose-derived candidate list instead of the declared seam
  position. Fixed by switching the effect to `percentOff` (renders as "12% off" — no dollar
  figure to leak).

**Result, verified: `ascending-scan` and `descending-scan` now hold at the IDENTICAL rate — 63%
each** (was 13% vs. 63%). The asymmetry Jake asked to be fixed is gone, confirmed by an
independent recomputation of the full 8-timing × 20-seed breakdown for both orderings.

**Disclosed, not eliminated:**
- `certify-seamC`'s range clause still visits `lo` before `hi` under ascending order and the
  reverse under descending — an inherent property of range-type deviations (the deviation lives
  on only one side of a two-sided clause), not fixable by repositioning the seam's percentage
  alone. A small residual ordering effect from this one declaration remains.
- Dropping `namedCase` incidentally changed `soundA`'s difficulty: the old namedCase+threshold
  version had `par=4`; the new threshold-only version has `par=3` — a side effect of moving to a
  single-clause declaration, orthogonal to the ascending/descending fix, not itself investigated
  further.
- **The dominant remaining failure driver has nothing to do with probe order, and this rebuild
  does not touch it.** Under unbounded probing (`after-cap`/`never`), every ordering — including
  the otherwise-strong `boundary-targeted` — eventually catches every seeded bug (fair total
  collapses to ~1), while both sound declarations eventually exhaust their finite candidate list
  and trip the surge/stall protector, paying a flat `openB=12` penalty each *regardless of how
  much real coverage they'd already earned*. This single mechanism accounts for far more of the
  remaining 380/1120 failures than the ascending/descending effect ever did. It is a separate,
  unaddressed question: whether a witness that runs out of new things to probe should be
  penalized as harshly as one that never covered anything.

## Falsification / soundness checks on the mechanism itself (separate from the knob's own result)

- Disjointness enforced at load, not assumed: no shared declaration id, no shared canonical
  content, between the certify pool and the tune roster (`run-versus-balance.js`).
- `roster-certify.js --self-test`: 9/9 — every certify declaration legal, quota respected, grid
  well-formed, distinct-behavior count trace-verified (155, up from 52 on the narrower grid)
  rather than asserted from prose.
- The generator's white-box design (the runner hands each policy `compiled.par`/`boundaries`
  directly, rather than the original design's black-box `witness(session)`-only shape) is a
  disclosed deviation, not an accident — these are stress instruments for the scoring surface
  itself, not calibration trainees.

## Honest limits

- **Now addressed on both axes: sensitivity to the grammar's choices AND to the certify pool's own
  construction.** Widening the grid (3 more orderings, 2 more abstain-timings, 2× seeds) moved the
  rate from 62.5% to 46.4% on the same pool — worse, not better, some evidence the finding isn't
  an artifact of an arbitrarily narrow grammar. Rebuilding the pool itself (same grid, different
  declarations) moved the rate again, to 66.1% — proving the rate genuinely IS sensitive to how
  the certify pool is built, which is exactly why the rebuild's own construction choices are
  documented above rather than treated as beyond question. The knob still fails on every version
  tried; the specific percentage has moved with the instrument each time it improved.
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
