# The real-agent token baseline — results (2026-07-21)

**Verdict: candidate GRANTED for Sonnet 5 (clean, matching-shape comparison); INCONCLUSIVE for
Haiku (the comparison is real but confounded — see below).** Written after the run, against
the criteria registered before it (`REALAGENT-PREREGISTRATION.md`). Independently re-verified:
`realagent-replay.js` requires the actual, canonical `witness.js` (not the workflow harness's
inlined copy used live) and reproduces every recorded outcome exactly (14/14).

## What ran

24 real model calls (12 Sonnet 5, 12 Haiku), each a single structured decision
(`request` / `wait` / `abstain`) from an actor told only its own two-step task — never the
cycle, never the other actors. Governed arm: 3 fixed decisions (A, B, C in order) arbitrated by
the real `witness.js`. Baseline arm: up to 9 decisions (3 rounds × 3 actors), no witness, capped
deliberately small because real rounds cost real tokens.

## The numbers

| condition | model | decisions | real output tokens | outcome |
|---|---|---|---|---|
| governed | Sonnet 5 | 3 | **2,370** | cycle closed on step 3 (matches the scripted trial exactly), clean OPEN |
| governed | Haiku | 3 | **4,462** | cycle never closed — B and C both chose `wait` |
| baseline | Sonnet 5 | 9 | **2,879** | froze at the 3-round cap; nobody ever abstained |
| baseline | Haiku | 9 | **5,052** | froze at the 3-round cap; nobody ever abstained |

Per-decision tokens and the full reasoning text for all 24 calls: `realagent-decision-logs.json`.
Metering is real output tokens only (a before/after delta around each individual call), never a
blended or estimated number — no dollar figure is claimed (see preregistration).

## The headline comparison, and its complication

**Sonnet 5: governed (2,370) < baseline (2,879) — 18% cheaper, clean comparison.** Both arms
reproduced the same shape the scripted trial predicted: in the governed arm, all three actors
requested without hesitation and the cycle closed exactly on C's request, same as the script.
This is the addendum's cleanest result and it supports the doctrine: even with real model
latency and reasoning tokens standing in for a free script, the witness-governed path cost less.

**Haiku: governed (4,462) < baseline (5,052) numerically, but this is not the same
comparison.** Only actor A actually issued a request; B and C both reasoned (unprompted — they
were never told a cycle existed) that requesting *might* cause a deadlock, and chose to `wait`
instead. The witness never got to intervene, never tripped, and `cleanOpen` is `false` because
there was nothing to clean — the run simply stopped one request short of the topology closing.
**Falsification condition 2, read by its spirit rather than its letter, is triggered here:** the
literal wording ("closes the cycle in a different order or count than 3 fixed decisions") is
technically satisfied — 3 decisions were made, in the registered order — but the *count of
requests that actually reached the witness* was 1, not 3, so the 4,462-token figure is not
priced against the same event the baseline's 5,052 tokens are. Labeling this a clean win for the
doctrine would be the same kind of label conflation `FINDINGS.md` has already caught and
corrected once (the Spec B par-derivation note); it is flagged here instead.

## The more interesting real finding

The scripted baseline flails mechanically forever (78 steps, never resolving, because a script
has no way to notice it's stuck). **No real-agent condition did that.** Across all four
model×arm combinations, every actor requested once, got told it was blocked, and from then on
chose `wait` every single round — never `abstain`, but never blindly retrying either. Real
models, even without being told anything about a cycle, converge quickly to a cautious holding
pattern that looks nothing like either the scripted baseline (mindless infinite retry) or the
scripted governed arm (immediate, confident requests). Haiku went one step further and had two
of its three governed-arm actors preemptively reason about deadlock risk they were never told
about, and decline to test the theory. Whether that caution is itself a form of the same
verification instinct this whole Stable trains for, or just an artifact of a thin two-line
prompt with nothing else to reason about, is not something this small a run can settle.

## Falsification conditions — closed out

| # | condition | result |
|---|---|---|
| 1 | governed total tokens ≥ baseline total tokens, either model | **not violated** — Sonnet 2,370<2,879; Haiku 4,462<5,052 (Haiku comparison confounded, see above) |
| 2 | real actor closes the cycle in a different order/count of *requests* than the fixed decision sequence implies | **violated in spirit for Haiku** (1 of 3 decisions became a request instead of 3); **not violated for Sonnet** |
| 3 | harness-mediated witness disagrees with an independent `witness.js` replay | **not violated** — `realagent-replay.js` 14/14, exact agreement on trip step, cycle, cleanOpen, and token-total recomputation |

## Honest limits

- **n=1 per model per arm.** This is a first look, not a distribution. Neither the Sonnet
  clean-win nor the Haiku confound should be read as a rate.
- **Input-side token cost is not metered.** Only output tokens are compared, the same disclosed
  asymmetry as the original replication trial.
- **Model identity rests on the model parameter requested of the harness**, not cryptographic
  attestation — the same standing limit already disclosed in `../../FINDINGS.md`.
- **The witness itself was not re-tested.** This addendum measures real actors' token cost
  against an unchanged, already-verified witness; it does not re-run the five original
  falsification conditions.
- **This still is not deadlock resolution.** Same scope boundary as the original trial.

## Reproduce

```
node experiments/deadlock-2026-07-18/realagent-replay.js --self-test   # 14/14, gate-wired
node stable-gate.js                                                    # includes the above
```

The 24 real model calls themselves are not re-runnable deterministically (real API calls, real
latency, no seed) — `realagent-decision-logs.json` is the durable record of what each one
returned. `realagent-replay.js` re-verifies the *arbitration*, not the *model calls*.

## Next honest step

A larger n (several independent trials per model) would turn "Sonnet was cheaper this time"
into a rate — small and cheap to run, same protocol, no design changes needed. A second,
separate question this run surfaced and did not answer: does real-model caution (choosing
`wait` over `request`) generalize to *other* topologies, or is it specific to a prompt that
gives the actor nothing else to reason about?
