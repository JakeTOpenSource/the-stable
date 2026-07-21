# FINDINGS — the Stable's empirical record

Every experiment run against real agents, in order, with its n, its verdict, its caveats,
and the command that reproduces it from this repo alone. Losses are recorded in the same
ledger as wins; a claim that cannot be replayed is treated as not made.

Conventions: "one-shot" = the agent commits its full probe plan in one call; "iterative" =
one decision per call with the round transcript fed back. All scoring is done by the real
machines (`witness-suite/witness-suite.js` v0.3.1 crediting; `stable/versus-match.js`
scale 0.3) — never by the experiment harnesses. Models named by recorded API id:
opus = `claude-opus-4-8`, sonnet = `claude-sonnet-5`, haiku = `claude-haiku-4-5-20251001`.

---

## E1 — Solo-suite one-shot discrimination (2026-07-16)

Three models committed blind plans against the open suite's five cases.
**Finding:** the coarse metrics saturated (all models caught all seams) while the phasor
discriminated — and all three models committed the *same* premature null, which turned out
to be a metric artifact (exact-integer coverage refusing rational cents probes). The eval's
first real result was a bug report about itself.
**Consequence:** witness-suite v0.3 (region coverage), then — after a red team proved a
2-cent boundary cluster gamed v0.3, a hole a real agent (haiku) had already walked through
naturally — v0.3.1 (extremes as first-class targets), with the exploit pinned as a
permanent regression test in `witness-suite/run-witness-suite.js`.
**Data:** `bridge/first-agent-plan.json`, `bridge/discrimination-plans.json`.
**Reproduce:** `node bridge/play-suite.js bridge/first-agent-plan.json` ·
`node witness-suite/run-witness-suite.js`
**Caveats:** n=1 per model; plan provenance is ledger-only for this earliest experiment
(decision-log archiving began with E2).

## E2 — Versus Table one-shot seating (2026-07-16)

Same three models as witnesses across six anonymized rounds (4 seamed + 2 sound; identical
prose over independent hidden implementations).
**Finding:** all three real agents beat the best scripted witness (41.3 / 41.7 / 46.3 vs
ranked's 32.3) on null probe-economy; every seam caught; opus premature-nulled gift-sound
by skipping the accepted band's interior; the surge stall-trip folded the scripted flailer
at 13–16 probes in live play.
**Data:** `bridge/versus-plans.json`; provenance
`experiments/table-oneshot-2026-07-16/decision-logs.json` (real API model ids per call).
**Reproduce:** `node bridge/play-versus.js bridge/versus-plans.json`
**Caveats:** n=1 per model.

## E3 — Iterative trial (2026-07-17)

Same six rounds, one decision per call with live feedback.
**Finding:** first perfect-verdict board — 18/18 correct (12 seams, 6 earned nulls, 0
premature); totals sonnet 48.4 / haiku 48.0 / opus 43.4.
**Re-read after E4:** the perfect board was a favorable draw, not a law — see E4. One of
its 18 verdicts (haiku r6) was a harness-forced abstain after a session-limit kill, correct
only because coverage was already complete.
**Data:** `bridge/iterative-plans.json`; provenance
`experiments/table-iterative-2026-07-17/decision-logs.json`.
**Reproduce:** `node bridge/play-versus.js bridge/iterative-plans.json`
**Caveats:** n=1 per model; the per-model output-token figures quoted in project logs
(26.8k/30.8k/34.2k) came from live metering and are not post-hoc recomputable; the
"iterative ≈ one-shot output tokens" comparison originally drawn from them was
apples-to-oranges and was **retracted** after E4 measured the controlled pair.

## E4 — Feedback replication, pre-registered (2026-07-17) — **DOCTRINE DENIED**

Candidate doctrine: *live per-probe feedback eliminates the premature nulls that committed
plans produce.* Criterion registered before the data; full registration, prompts, round
key, criterion close-outs, and honest limits: `experiments/replication-2026-07-17/PREREGISTRATION.md`.
2 sound rounds × 3 models × 3 reps × 2 arms = 36 sessions; 6 excluded (haiku-iterative,
truncated by session limit — a forced stop is not an abstention).
**Verdict: DENIED.** One-shot reproduced prematures (haiku 3/3 on gift-sound) but the
iterative arm was not premature-free: opus:iterative r6 rep2 skipped the $1 floor at
coverage 0.86 with seven matching probes in its transcript.
**What replicated instead, at its correct strength:**
- calibrated-null ability is a stable, model-differentiated trait here — sonnet 12/12, and
  perfect across every experiment to date;
- the blind-spot family (interior/floor skip) is real and cross-model, concentrating
  entirely on the widest-target sound case (gift-sound 4/4 valid prematures; cart-sound
  0/15);
- feedback does **not** reliably close that family;
- per-session, one-shot is far cheaper in output tokens than iterative (6.3× opus, 3.1×
  sonnet, 1.1× haiku).
**Data:** `bridge/replication-cells.json` (probes, endings, per-block tokens);
`experiments/replication-2026-07-17/decision-logs.json` (per-call model ids, decisions,
stated reasoning, prompt hashes).
**Reproduce (machine-checked, gate-wired):** `node bridge/replay-replication.js`
**Caveats:** n=6 valid sessions per model:arm; sequential-block design put haiku last, so
budget exhaustion clustered there (future designs rotate order); registration predated the
data in the operator log but was committed post-hoc — from now on, pre-registrations are
committed before the run.

## E5 — Adversarial coherence parse (2026-07-17)

Two adversarial verifiers (opus) + one advisor (fable) with code execution, instructed to
break the math and the claims.
**Survived verification:** the Γ reflection algebra is exactly correct (0 divergence across
a full R×X×Z0 grid vs direct complex arithmetic); |Γ|≤1 for R≥0 with equality only at R=0;
sign(Im Γ)=sign(X); VSWR consistent; truePF provably in [0,1] (R is a non-negative count,
so cos φ ≥ 0); par ≡ minimal-cover length, achievable at par; coverage order-independent,
in [0,1] under fuzz; all 10 scale-fixture rows reproduce exactly; the /2→/3 counterfactual
reproduces (193.6 vs 187.6, invariant breaks); every published number in the spec and logs
recomputes; the DENIED verdict was independently re-derived twice from raw cells.
**Findings, and their dispositions:**
- latent gap: `scoreRound("caught", 0, par)` returned builder −1 (unreachable in live play;
  a catch always logs ≥1 probe) → **fixed** with a `max(0,…)` guard; every fixture row
  byte-identical, governed scale untouched;
- display note: `gammaAbs` rounds to 2 dp while `vswr` derives from the unrounded
  magnitude, so a rim point can read abs 1.00 beside a finite vswr → **documented** in
  `stable/rail.js` (the unrounded magnitude is the source of truth);
- overclaim: "direction even reversed for opus" (0/6 vs 1/6, statistically
  indistinguishable) → **retracted**; the supportable statement is that the iterative arm
  failed the zero-premature bar while one-shot happened to run clean;
- reproducibility gaps (token counts and agent provenance existed only in logs) →
  **closed** by the `experiments/*/decision-logs.json` archives and
  `bridge/replay-replication.js`;
- label conflation: "Spec B par root-cause closed" — the *par-derivation* item cited in the
  0.2 ratification note is closed by derived par; Spec B itself (the held-out certification
  roster) was a separate design. **Update (2026-07-21): Spec B is now built and run** —
  `witness-suite/SPEC-B-RESULTS.md`. The /3 sound-reward divisor, tuned and certified on the
  same six scripted players, does NOT generalize to the held-out policy grid (150/240 hold,
  worst gap 22 points in the defensive pool's favor) — the exact standing consequence this
  section used to only warn about is now a measured, gate-pinned finding, not a prediction.

---

## Standing limits (read before citing anything above)

1. All n are small and all cases are public and deterministic: this is **calibration and
   training signal, never a capability benchmark**. Detection-trained ≠ aligned.
2. The instrument constrains what agents do inside its games; nothing here certifies model
   behavior outside the constrained surface. What travels is the telemetry (documented,
   reproducible blind-spot records per model), not the containment.
3. Output tokens only, where token costs are quoted; input-side cost of iterative play
   (transcript growth per decision) is unmetered and would tilt further against iterative.
4. Model identity rests on API records in the decision logs, not cryptographic attestation.

## Reproduce everything

```
node stable-gate.js                                    # prints GREEN — all machines + the clamp + the replication verdict + Spec B's CERTIFY line
node witness-suite/run-witness-suite.js                # suite self-test + baselines
node stable/run-rail.js                                # phasor corpus + archetypes
node stable/run-versus-balance.js                      # TUNE (informational) + CERTIFY (Spec B hold-out — see witness-suite/SPEC-B-RESULTS.md)
node bridge/play-versus.js bridge/versus-plans.json    # E2 exactly
node bridge/play-versus.js bridge/iterative-plans.json # E3 exactly
node bridge/replay-replication.js                      # E4 verdict, asserted
```
