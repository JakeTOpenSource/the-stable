# Addendum pre-registration — the real-agent token baseline (2026-07-21)

**Registered BEFORE any run.** This is the piece `RESULTS.md` named as the "next honest step":
falsification condition 3 (uneconomical witness) was only proven *structurally* in the
deterministic-core trial (governed 6 bounded steps vs. baseline 78 frozen steps, both scripted,
both free). This addendum measures it in **real output tokens**, with real Sonnet 5 / Haiku
actors standing in for the scripted ones. Everything else about the trial — the topology, the
witness, the falsification conditions — is unchanged; only the actors stop being a script.

## What this does NOT redo

The deterministic core (`witness.js`, `run-deadlock.js`, `replay-deadlock.js`, the five original
falsification conditions) is already GRANTED and is not re-litigated here. This addendum adds a
sixth measurement — real token cost — on top of it. A bad result here does not undo the
deterministic-core verdict; it would only mean the *economy* claim needs a caveat.

## Protocol

Same three actors (A, B, C), same three single-holder resources (N1, N2, N3), same injected,
undisclosed cycle: A holds N1 wants N2 / B holds N2 wants N3 / C holds N3 wants N1. Each actor
is now a real model call instead of a scripted rule, given ONLY its own two-step task and the
outcome of its own last action — never the cycle, never the other actors' states.

**Models:** Sonnet 5 and Haiku, run as separate conditions (per the original registration's
"Model routing" section). No Opus — this addendum is deliberately the cheap, high-volume tier,
matching the original's "menial, high-volume harness passes — cheap by design."

**Governed arm (per model):** Phase 1 (each actor takes its held resource) is granted
programmatically, exactly as in the scripted arm — it involves no real decision, so no model
call is spent on it. Phase 2: actors A, then B, then C are each given one real decision
(request / wait / abstain) for their second resource, in that fixed order, matching the
scripted sequence that closes the cycle on the third request. The witness used to arbitrate is
the actual `witness.js` (not a re-implementation) called from a harness that wraps each
decision. **Exactly 3 real decisions, fixed, per model.**

**Baseline arm (per model):** No witness. Actors are told only "busy, held by someone else" when
blocked — no cycle information, no global view, ever. Capped at **3 rounds** (a third of the
original scripted baseline's structural depth, deliberately — see "Why 3 rounds, not 25" below).
Each round, every actor still in play (has not abstained) gets one real decision. **Up to 9 real
decisions per model** (fewer if actors abstain early, which is itself a result worth reporting:
a real model recognizing it is stuck is not a failure of the design).

**Why 3 rounds, not 25:** the scripted baseline's 25-round cap was free (no tokens spent) and
existed to make the *structural* bound (governed finite and known vs. ungoverned capped only by
the wall) visible. Real rounds cost real money. This addendum does not need to re-prove the
structural bound — it needs to know whether even a SMALL, cheap number of real decision rounds
already outspends the governed arm. Three rounds is enough to see a trend; it is not a claim
about what happens at round 25.

## Metering (the actual point of this addendum)

Real **output tokens**, measured per decision via the Workflow harness's own token accounting
(a before/after delta bracketing each individual model call). This requires the calls to run
**strictly sequentially, never concurrently** — concurrent calls would let one call's tokens
leak into another's delta. The harness enforces this (no `parallel()` around any decision call).

- Reported per-arm, per-model: total real output tokens across all decisions in that
  arm/model, and the count of decisions that produced them.
- **Not claimed:** a dollar figure. Prior experiments in this repo (E2/E3) quoted dollar costs
  from a session's own accounting; this addendum does not have independent confirmation of the
  current per-model output-token rate, so it reports tokens only, consistent with the standing
  instrument-discipline rule (never a blended or unverified number).
- **Not claimed:** cryptographic model identity. Which model answered rests on the model
  parameter requested of the harness, the same standing limit already disclosed in
  `../../FINDINGS.md` ("Model identity rests on API records ... not cryptographic attestation").
- Input-side cost (prompt tokens) is not metered here, the same disclosed asymmetry as the
  original replication trial (`../replication-2026-07-17/decision-logs.json`'s `_meta`).

## Falsification conditions for THIS addendum (any one kills the "cheaper in real tokens" claim)

1. **The governed arm's total real output tokens meet or exceed the baseline arm's**, for
   either model. (The cure costing as much as the disease, in real currency this time.)
2. **A real actor in the governed arm still closes the cycle in a different order or count than
   3 fixed decisions** — i.e. real reasoning changes the topology's shape, not just its cost.
   (This would mean the governed-arm token count isn't a fair comparison point.)
3. **The witness, called from the real-agent harness, disagrees with a fresh, independent
   `witness.js` replay of the recorded request sequence** — the same non-determinism check as
   the original trial's condition 4, now applied to a harness-mediated call path instead of a
   hand-written script.

## Honest limits (stated up front, not discovered after)

- **n is tiny** (one run per model per arm) — this is a first look, not a distribution. A
  single favorable or unfavorable number does not establish a rate.
- **A real model may behave nothing like the scripted flailer** — it may abstain immediately,
  it may (unlike the mindless script) partially reason its way toward suspecting a deadlock
  without ever being told about one. Any of those outcomes is reportable, not a broken
  instrument. The prior sibling result (E3/E4) already showed real models diverging sharply from
  scripted expectations; this addendum is written to survive that.
- **This still is not deadlock resolution.** Same scope boundary as the original registration —
  detect-and-fail-safe, never graceful completion.
- **The witness itself is unchanged and untested here** — this addendum is purely about the
  actors' real cost, not a re-run of the deterministic-core falsification conditions.

## Artifacts (to be produced when the run happens)

- `play-deadlock-real.js` (or equivalent Workflow script, persisted under the session's
  scratchpad and referenced by run id) — the harness; calls the real, required `witness.js` for
  the governed arm, a plain resource map for the baseline arm.
- `realagent-decision-logs.json` — one record per real decision (model, arm, actor, round,
  decision, real output-token delta, outcome), same provenance-archive shape as
  `../replication-2026-07-17/decision-logs.json`.
- `realagent-ledger.json` — the resulting request sequence and outcomes, replayable.
- An independent replay of the governed arm's recorded sequence through `witness.js`, gate-wired
  if it warrants standing regression coverage.
- `REALAGENT-RESULTS.md` — the verdict on the token-economy claim, written after the run, never
  before.
