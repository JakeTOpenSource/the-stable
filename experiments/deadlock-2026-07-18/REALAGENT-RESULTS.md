# The real-agent token baseline — results (2026-07-21)

**Verdict: candidate GRANTED for Sonnet 5 (clean, matching-shape comparison); INCONCLUSIVE for
Haiku (the comparison is real but confounded — see below).** Written after the run, against
the criteria registered before it (`REALAGENT-PREREGISTRATION.md`). Independently re-verified:
`realagent-replay.js` requires the actual, canonical `witness.js` (not the workflow harness's
inlined copy used live), replays the recorded decisions through it, and cross-checks the
ledger's per-decision arrays against the raw `realagent-decision-logs.json` records — 21/21
checks hold (8 outcome/arbitration-reproduction checks, 12 provenance recomputations tying
ledger totals back to the raw per-decision records, 1 same-event economy check).

## What ran

24 real model calls (12 Sonnet 5, 12 Haiku), each a single structured decision
(`request` / `wait` / `abstain`) from an actor told only its own two-step task — never the
cycle, never the other actors. Governed arm: 3 fixed decisions (A, B, C in order) arbitrated by an **inlined copy** of the
witness algorithm — workflow scripts cannot `require()` files, so the real `witness.js` could
not run live; this is a disclosed deviation from the preregistration's stated protocol ("the
actual `witness.js`, not a re-implementation"), mitigated by an independent replay of the
canonical file after the fact (see "Verified independently," below). Baseline arm: up to 9
decisions (3 rounds × 3 actors), no witness, capped deliberately small because real rounds cost
real tokens. The exact harness — including the complete, verbatim actor prompt every model
saw — is committed at `realagent-harness.js` for anyone to audit; it does not mention a cycle,
deadlock, or circularity anywhere.

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

**Falsification condition 2, verbatim:** "A real actor in the governed arm still closes the
cycle in a different order or count than 3 fixed decisions." **By the letter, this did not
fire:** exactly 3 decisions were made, in the registered order (A, B, C) — the protocol's
decision-count shape held exactly. But the condition's entire purpose was to flag exactly this
situation: only 1 of those 3 decisions became an actual request to the witness, so the cycle
never closed, and the 4,462-token figure is not priced against the same event the baseline's
5,052 tokens are. **Read for the purpose it was written to serve rather than its literal
wording, this run is exactly what condition 2 exists to catch**, and the Haiku comparison is
downgraded from GRANTED to INCONCLUSIVE as a result — a *stricter* reading than the letter
required, not a looser one. Labeling the numeric ordering a clean win for the doctrine anyway
would be the same kind of label conflation `FINDINGS.md` has already caught and corrected once
(the Spec B par-derivation note); it is flagged here instead. `realagent-replay.js` enforces
this mechanically: it only asserts the cheaper-than-baseline check for a model whose governed
decisions are *all* `request` — Haiku's is skipped automatically, not by name.

## The more interesting real finding

The scripted baseline flails mechanically forever (78 steps, never resolving, because a script
has no way to notice it's stuck). **No real-agent baseline condition did that:** in both
models' baseline arms, every actor requested once in round 1, got told it was blocked, and then
chose `wait` for every remaining round — never `abstain`, but never blindly retrying either.

The governed arm split by model instead of matching this pattern. Sonnet's three actors
requested straight through with no hesitation, reproducing the scripted shape exactly up to the
trip. Haiku's B and C skipped their one decision entirely: both reasoned that requesting might
itself trigger a deadlock — a real, unprompted inference, verifiable in `realagent-harness.js`,
since the word "deadlock" appears nowhere in the prompt they were given — and chose `wait`
rather than test the theory. Whether that caution is a form of the same verification instinct
this Stable trains for, or an artifact of a two-line prompt with nothing else to reason about,
is not something this small a run can settle.

## Falsification conditions — closed out

| # | condition | result |
|---|---|---|
| 1 | governed total tokens ≥ baseline total tokens, either model | **not violated for Sonnet** (2,370<2,879, clean same-event comparison); **not evaluable as a fair cost comparison for Haiku** (4,462<5,052 numerically, but see condition 2 — not the same event) |
| 2 | (verbatim) "a real actor in the governed arm still closes the cycle in a different order or count than 3 fixed decisions" | **letter: not triggered for either model** (both made exactly 3 decisions, in the registered order). **Purpose: triggered for Haiku** (only 1 of 3 decisions became an actual request — not a same-event comparison with the baseline); **not triggered for Sonnet** (all 3 became requests, matching the scripted shape exactly) |
| 3 | harness-mediated witness disagrees with an independent `witness.js` replay | **not violated** — `realagent-replay.js` 21/21: exact agreement on trip step, cycle, `cleanOpen`, full request-sequence content (not just length), and every token total recomputed independently from the raw per-decision records in `realagent-decision-logs.json` |

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
node experiments/deadlock-2026-07-18/realagent-replay.js --self-test   # 21/21, gate-wired
node stable-gate.js                                                    # includes the above
```

The 24 real model calls themselves are not re-runnable deterministically (real API calls, real
latency, no seed) — `realagent-decision-logs.json` is the durable record of what each one
returned, and `realagent-harness.js` is the exact code (including every prompt) that produced
them. `realagent-replay.js` re-verifies the *arbitration and the bookkeeping*, not the *model
calls* — it cannot prove a different model would answer the same way twice.

## Next honest step

A larger n (several independent trials per model) would turn "Sonnet was cheaper this time"
into a rate — small and cheap to run, same protocol, no design changes needed. A second,
separate question this run surfaced and did not answer: does real-model caution (choosing
`wait` over `request`) generalize to *other* topologies, or is it specific to a prompt that
gives the actor nothing else to reason about?
