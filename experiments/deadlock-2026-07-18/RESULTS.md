# Circular-deadlock trial — results (2026-07-18)

**Verdict: candidate GRANTED for this instance — deterministic core.**
Written after the run, against the criteria registered before it (`PREREGISTRATION.md`).
Machine-checked forever by `replay-deadlock.js` (wired into `stable-gate.js`); two
independently-written cycle detectors agree, and the verifier is bite-proven.

## What ran

Three actors (A, B, C) as scripted schedulers, three single-holder resources (N1, N2, N3),
the unannounced cycle A→N2 held-by-B→N3 held-by-C→N1 held-by-A. Two arms, identical start.

- **Governed** (witness active): request sequence `A:N1 B:N2 C:N3 A:N2 B:N3 C:N1`. The
  deadlock closed on step 6 (`C:N1`); the witness detected the cycle {A,B,C}, denied the
  closing lock, tripped, and reached a clean OPEN state.
- **Baseline** (ungoverned, no breaker): the three actors froze holding their first resource
  and flailed re-requesting their second to the pre-budgeted cap — **78 steps, never
  resolved.** That is the cost the doctrine claims to prevent.

## The five registered falsification conditions — each closed out

| # | condition (a failure kills the candidate) | result |
|---|---|---|
| 1 | false pass: two actors hold one resource, or a live deadlock is certified | **not violated** — single-holder never double-granted; ledger grant-invariant holds; adversarial retry refused |
| 2 | missed cycle | **not violated** — the independent reduction detector also found the deadlock |
| 3 | uneconomical: governed cost ≥ baseline | **passed, structurally** — governed 6 bounded steps vs baseline 78 frozen steps |
| 4 | non-determinism | **not violated** — the independent detector agrees on the exact closing step (6) and the exact actor set {A,B,C}, by a *different algorithm* (graph reduction vs the witness's DFS) |
| 5 | breaker fires but leaves a dirty state | **not violated** — witness recorded clean OPEN; independently, no deadlock remains after releasing the cycle's locks |

## What this does and does NOT establish (scope, stated plainly)

**Establishes:** an out-of-band, deterministic witness — a plain script, no model — detects a
circular resource deadlock the instant the cycle closes, refuses to certify it, and fails
safe to a clean OPEN state at a bounded, known-in-advance cost. Detection is corroborated by
a second, independently-written detector using a different algorithm. This is the three-lane
loop's second measured instance, on infrastructure semantics rather than a puzzle: Lane 1
(actors' local scheduling) ordered the play, Lane 2 (the witness) certified, Lane 3 (the
breaker) retracted to open.

**Does NOT establish:**
- **Detection is not resolution.** The claim is detect-and-fail-safe, not "the deadlocked work
  then completes." Trip to OPEN is the whole claim.
- **The token-dollar economy vs *real* flailing models is not measured here.** The baseline is
  a scripted freeze; it proves the *structural* bound (governed is finite and known, ungoverned
  is capped only by the wall). Whether real models negotiating in prose actually cost more than
  the witness's check is a separately-budgeted real-agent run — registered, not yet run, and
  not claimed.
- **One board, one topology.** A single 3-actor / 3-resource cycle. No claim about larger
  graphs, multi-resource holds, partial cycles, or livelock (as opposed to deadlock) until
  those are separately tested.
- **This is calibration/engineering evidence, not a safety guarantee.** Nothing here certifies
  what a model *means* or does outside this arbitrated surface — only that the arbiter, on this
  surface, is deterministic and fails closed.

## The doctrine now has two instances

1. **8-Queens** (`../three-lane-loop/`): taste orders (~34% fewer commitments), but literal
   taste without retraction stalls at 5 of 8.
2. **Circular deadlock** (here): the witness + breaker catch the loop and fail safe, bounded.

Two measured instances, structurally different, both surviving pre-registered falsification —
and one prior sibling (the feedback doctrine) that was DENIED. That is the honest state: a
candidate with growing, checkable support and a recorded loss, not a proven law.

## Reproduce

```
node witness.js --self-test          # the witness's own scenarios (11/11)
node run-deadlock.js                 # runs both arms, writes deadlock-ledger.json (deterministic)
node replay-deadlock.js --self-test  # independent verifier: recomputes the GRANTED verdict (10/10)
```

## Next honest step — RUN (2026-07-21)

The real-agent token baseline this section used to flag as unrun has been run: see
`REALAGENT-PREREGISTRATION.md` and `REALAGENT-RESULTS.md`. Verdict: candidate GRANTED for
Sonnet 5 (governed cost 2,370 real output tokens vs. baseline 2,879 — a clean, matching-shape
comparison); INCONCLUSIVE for Haiku (the governed arm's actors declined to complete the fixed
request sequence, so its lower token count isn't priced against the same event). The more
interesting result: no real-agent condition reproduced the scripted baseline's mindless
infinite flailing — every real actor settled into a cautious `wait` pattern instead.
