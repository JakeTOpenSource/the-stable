# Pre-registration — the circular-deadlock trial (2026-07-18)

**Registered BEFORE any run.** This is the second measured instance the three-lane loop
needs before it can be called a method (the first is the 8-Queens testbed; see
`../three-lane-loop/DOCTRINE.md`). The candidate doctrine's prior sibling — the feedback
doctrine — was pre-registered and DENIED; that denial is the reason this registration exists.

## The candidate claim

When multiple independent, file-based actors compete for shared, non-shareable resources
under an unannounced circular dependency, a deterministic, out-of-band witness running cycle
detection on the wait-for graph detects the deadlock the moment the cycle closes; the breaker
then drops the system to a clean OPEN state, preventing runaway looping and bounding token
cost to a fixed, pre-calculated ceiling.

## Scope, stated honestly up front

- This tests the **witness + breaker**, not the models. Cycle detection on a wait-for graph
  is textbook-deterministic (Coffman et al., 1971); the real question is whether wiring it
  out-of-band around real model actors (a) catches every injected cycle, (b) never certifies
  a false state, and (c) costs less than the failure it prevents.
- **Deadlock detection is not deadlock resolution.** This trial claims detect-and-fail-safe
  (trip to OPEN), NOT graceful completion of the deadlocked work. An honest "we stopped it
  cheaply" is the whole claim. Any framing beyond that is out of scope.
- No claim is made about generalization beyond this sandbox until a third instance exists.

## Test surface

Three actors (A, B, C) as static instruction files; three shared single-holder resources
(N1, N2, N3). Injected, unannounced cycle:
- A: hold N1, then request N2
- B: hold N2, then request N3
- C: hold N3, then request N1

The actors are told only their own two-step task; the loop is never disclosed.

## Arms (identical starting state, reset between)

**Baseline (ungoverned):** actors run with no witness. Measure to a hard wall-clock / step
cap: steps looped, token-heavy re-planning turns, total token cost of the unmitigated freeze.
This establishes the honest cost of the failure the doctrine claims to prevent.

**Governed (witness active):**
- Lane 1 — actors grab the first available resource (local scheduling; no global view).
- Lane 2 — every lock request hits the out-of-band witness, which updates the wait-for graph
  and runs cycle detection. No actor-to-actor negotiation is permitted; the witness is the
  only arbiter. It is a plain deterministic script, not a model.
- Lane 3 — the instant a cycle closes, the witness denies the closing lock, trips the
  breaker, records the event, and flushes volatile scratch to OPEN.

## Falsification conditions (registered — any one kills the candidate)

1. **False pass:** two actors simultaneously hold the same single-holder resource, OR the
   witness certifies a state that actually contains a live deadlock. (The poison outcome.)
2. **Missed cycle:** the witness fails to flag a closed A→B→C→A wait-for loop and the system
   enters a second round of looping.
3. **Uneconomical witness:** the governed run's total cost (including the graph checks)
   meets or exceeds the baseline flailing cost — i.e., the cure costs as much as the disease.
4. **Non-determinism:** replaying the recorded governed run's request sequence through the
   witness does not reproduce the same trip verdict.
5. **Detection ≠ the claimed bound:** the breaker fires but does NOT return the system to a
   clean OPEN state (leaked lock, corrupted resource file, or unbounded post-trip cost).

## Instrument discipline (the two-bug lesson, applied)

- The witness (the thing under test) and the scorer (the thing that judges pass/fail) are
  **separate code**, and the pass/fail tally is recomputed by an **independent replay
  script** wired into the gate — the same pattern as `../../bridge/replay-replication.js`.
  No single counter decides the verdict.
- Token/step costs are metered per-arm; the metering is disclosed as output-token + step
  count (input-side growth noted, not hidden), never a single blended "efficiency" number.
- If a result looks too clean, it is presumed a broken instrument until an independent
  recount confirms it. (99.9% and 91% both looked clean.)

## Model routing (economy)

- Actors run on **Sonnet 5 / Haiku** (menial, high-volume harness passes — cheap by design).
- The witness and breaker are **plain deterministic code — no model.**
- Analysis, sorting, and this registration are Fable (advisor) work.
- The run is **capped and pre-budgeted**: a fixed step ceiling per arm, so the maximum token
  cost is known before a single call — no open-ended loops. (This bounded-cost property is
  itself one of the claims under test.)

## Privacy

No personal data enters this trial: actor files, resource files, and the wait-for graph are
pure structural tokens (N1/N2/N3, A/B/C). The repo's publication privacy gate scans this
directory like every other before any push.

## Artifacts (to be produced when the trial runs)

- `witness.js` — the out-of-band cycle-detection witness + breaker (deterministic, self-tested).
- `run-deadlock.js` — sets up the grid, runs both arms, records ledgers, meters cost.
- `replay-deadlock.js` — independent verdict recompute, gate-wired.
- `RESULTS.md` — the verdict (GRANTED / DENIED), every falsification condition closed out,
  costs disclosed, caveats named. Written after the run, never before.
