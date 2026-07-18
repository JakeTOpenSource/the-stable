# The three-lane loop — candidate doctrine and its chain of custody

**Status: CANDIDATE. One measured instance. Not yet doctrine.**
This document records where the idea came from, what has actually been measured, what is
claimed at what strength, and what would kill it. Foundational ideas in this project are
published with their full provenance — including the parts that failed — because a claim
whose history is hidden is a claim you cannot audit.

## The candidate doctrine

Dilemmas whose choices consume each other's freedom (constraint webs) are handled by three
separable lanes, all necessary, none sufficient:

1. **Taste orders.** Structural intuition chooses *where to look first*. It is a scheduler,
   not a certifier.
2. **A witness certifies.** Every commitment is judged by a cheap, dumb, deterministic,
   out-of-band check. Taste never grades its own work.
3. **Retraction completes.** Commitments stay revisable; a stall is information, delivered
   early and cheaply — an honest "open," never a false pass.

Two riders, paid for by measurement:
- Better ordering is not free — it buys fewer commitments at the price of more measuring
  per step. Say so; never promise a free lunch.
- Never act on a single instrument's number. (See the two-bug story below.)

## Provenance chain (the actual order of events)

1. **Origin:** Shoshana Cox's public essays on adversarial AI and the 8-Queens puzzle
   (disesdi.substack.com), advocating structural "negative space" placement over brute
   force: "when you maximize negative space, you minimize surprise."
2. **First instance (measured):** `queens.js` in this directory — a deterministic,
   self-witnessing testbed. Verified results, each pinned as a self-check:
   - 92 solutions; the board's symmetry group (D4) acts on them leaving **12 orbits**
     (11 of size 8, one of size 4). Twelve representatives stand for all 92 — one witness
     per family, never the whole space.
   - One faithful formalization of her rule (most-constrained-first) shrinks the search
     tree **33.9%** (2,056 → 1,360 committed placements) while still finding all 92 —
     and pays ~90% more primitive checking per step at this board size.
   - A sibling reading of the same prose (least-constraining choice) beats it (55 vs 75
     placements to a first solution): aesthetic language underdetermines mechanism.
   - Her rule taken literally — greedy, no undo — **stalls at 5 of 8 queens**. Her own
     essay never shows a completed board and explicitly rejects systematic retry; the
     stall is the measured boundary of the method, not a strawman.
3. **Adversarial parse:** an independent review caught the experiment's own instruments
   lying twice — a 99.9% figure (order-dependent safety check) and then a 91% figure
   (asymmetric counters). The honest numbers above come from same-metric recounts,
   cross-checked by two separately-written verifiers. **The two-bug story is kept in
   `queens.js`'s header on purpose: one instrument lies plausibly; only an independent
   witness catches it.**
4. **Design dialogues:** subsequent brainstorming (operator + assistant models) generated
   candidate extensions — context compaction as witness-certified "line clears,"
   file-based stateless-harness agents, dual public/private ledgers, out-of-band physical
   telemetry. These are IDEAS, sorted below; none are measured results.

## Claims made / claims refused

| claim | status |
|---|---|
| On 8-Queens, one formalization of the negative-space rule shrinks the tree ~34% preserving all solutions | **Made** — measured, twice-witnessed |
| The same rule, literal and without retraction, stalls at 5 of 8 (under the tested reading) | **Made** — measured; scoped to the tested formalization |
| Aesthetic prose underdetermines mechanism; formalization choices change outcomes and must be declared | **Made** — measured (55 vs 75) |
| Single-instrument measurement is untrustworthy even in a 200-line deterministic script | **Made** — demonstrated twice |
| "Intuition doesn't work" | **Refused** — the data shows the opposite |
| "The ~34% generalizes" beyond this puzzle and size | **Refused** — one board, one size, no scaling data |
| "This proves anything about adversarial AI / quantum security" | **Refused** — we measured the chessboard, not the metaphor |
| "Greedy always stalls" | **Refused** — one deterministic trajectory was tested |
| "The three-lane loop is a general dilemma method" | **Refused until replicated** — that is what the next experiment is for |

## Ideas sorted from the design dialogues (transparency, not endorsement)

**Kept for testing:** the multi-agent circular-deadlock trial (see
`../deadlock-2026-07-18/PREREGISTRATION.md`) — a second, structurally different instance
for the doctrine, on real infrastructure semantics rather than a puzzle.

**Kept as framing (already built, now named):** durable-private-record + compressed-public-
working-set (this repo's own publication architecture); file-as-state with stateless model
passes (this repo's experiment harnesses).

**Held, unproven:** witness-certified context compaction ("a line clears only when a dumb
checker certifies the row is full") — a genuine gap in current production practice, worth
its own pre-registered test; not claimed.

**Cut as overclaim:** "containment guaranteed by architecture" (nothing is guaranteed
until measured — the project's own prior doctrine died in replication); physical-telemetry
claims beyond available instrumentation; any "this cannot drift / cannot be tricked"
phrasing. The circuit vocabulary in this project is **formalism, not physics** — no claim
rides on an analogy that the measurement layer cannot cash.

## Reproduce

```
node queens.js     # deterministic; every published number is a pinned self-check (15/15 GREEN)
```
