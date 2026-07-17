# The Versus Table — design spec v0 (2026-07-14, for Jake's cold read)

Working name: **The Versus Table** (alternates: The Builder's Gambit, Two-Sided Witness).
Part of **the Stable** — the Crosswalk's agent training ecosystem, named by Jake 2026-07-14:
an ever-evolving garrison. The pun is load-bearing: the stable that keeps agents stable.

The Stable's first two-player machine: an adversarial game between a **Builder**
who authors cases and a **Witness** who audits them. Simple rules, deep game. Its real
product is not the score — it is **curriculum discovery**: every Builder win is, by
construction, the discovery of a place witnesses don't look yet.

## Grounding (stand on shoulders)

- **Mutation testing** (DeMillo, Lipton & Sayward, 1978): seed one-token faults into a
  program; a test suite's worth is how many mutants it kills. The Builder is an interactive,
  paid mutation generator; the Witness is the test suite. Mutation score is 50-year-old
  ground under this game.
- **Self-play** (checkers/backgammon lineage through AlphaZero): two agents alternating
  sides of a fixed-rule game generate their own curriculum — each side's wins locate the
  other side's blind spots. That is Jake's "connect open nodes ready for coupling," stated
  as method: the adversary finds the open node because that is where the points are.
- **Property-based testing / the Witness Suite v0.2** (this repo): the board, the probe API,
  the verdicts, and the legality machinery already exist and are gate-proven.

## The one hard problem, and the design move that solves it

If the Builder writes the spec as free prose, the Builder can lie — a spec that misdescribes
the promised behavior makes the game unfair and the scores meaningless. The fix defines the
whole machine:

**Specs are not written; they are composed.** The Builder plays from a constrained **clause
grammar**, and both the spec prose AND the `promised()` function are compiled from the same
declaration. They cannot diverge, because they are one object. The pieces of the game:

- **threshold clause** — `amounts {>=|>} T get {percent off P | flat off F | flat fee F}`
- **named-case clause** — `the empty case (0) {owes nothing | is rejected | pays X}`
- **range clause** — `inputs from LO to HI accepted; outside {rejected | clamped}`

(v1 piece set, RECOMMENDED 2026-07-14: exactly these three, max 2 clauses per case. They map
1:1 to the three seam families already proven across Red Rover and the suite — the game opens
on tested ground. A fourth candidate, the **rate clause**, was cut from v1 for a structural
reason: a rate deviation (8%→9%) mismatches at EVERY input — a "wide seam" catchable by one
probe anywhere, no aim required. Wrong piece for an aim game. It returns in a future version
as its own round type, where wide seams test a different skill: fastest-confirmation, not
aim.)

A **case declaration** is 1–3 clauses + parameters + a bounded domain + exactly one of:
- a **deviation**: one token flipped in one clause (`>=`→`>`, `to HI`→`under HI`, the named
  case simply unwritten) — the compiled `tool()` differs from `promised()` by that token; or
- **sound**: no deviation.

The compiler emits: spec prose (from templates, plain English), `promised()`, `tool()`,
`special[]` (every clause-named number ±1, domain ends, named cases), `par`, and the seam.
Chess property preserved: a handful of piece types, parameterized, composable — trivial to
state, combinatorial to master.

## Legality: the gate IS the rules

A Builder move is accepted only if the compiled case passes the same integrity self-test the
suite runs today, extended:

1. Seamed case: mismatch at the declared seam and **nowhere else** (full-domain scan).
2. Sound case: mismatch **nowhere**.
3. The seam is a member of `special[]` (aim must be able to win — no unwinnable tables).
4. Par is achievable (probing the seam alone scores caught at discipline 1).
5. Domain bounded and small (≤ 1,000 units), money-resolution inputs.
6. Deviation is exactly one token (enforced by the compiler, verified by diff).

Illegal move = forfeited round, max points to the Witness. This is the tilt rule applied to
the Builder: you cannot win by making unfair tables, only subtle ones. It is also the guard
against the known failure of adversarial setups (the GAN-collapse analog): without a hard
legality floor, the Builder drifts toward cases that are hard because they are broken, not
because they are clever.

## Match format

- A match is **6 rounds**; roles alternate every round (both agents play both sides —
  symmetric scoring, no role advantage).
- Builder submits a legal case. The Witness sees **spec prose + domain only** (no par, no
  case type — unlike the open suite, the Versus Table hides whether a seam exists; that
  uncertainty IS the game).
- Witness plays under a **probe cap of 25 per round**, ending each round with a catch,
  an abstention, or cap exhaustion.
- **Sound-case quota: at most 2 of a Builder's 3 rounds** may be sound. Sound cases are the
  Builder's defensive play (they tax the Witness's probes and discipline) but unlimited
  defense makes a boring, degenerate game.

## Scoring (per round; zero-sum within the round)

| Outcome | Witness | Builder |
|---|---|---|
| Catch | `10 × par/probes` (perfect read = 10) | `min(probes, cap) − 1` (survival time pays) |
| Calibrated null on sound case | `10 × par/probes` | `probes − par` (probes taxed above par) |
| Premature null | 0 | 10 |
| False pass (seam survived) | 0 | **15** (the finding — highest information, harvest trigger) |
| Cap exhausted, no conclusion | 0 | 12 |
| Illegal case | 12 | forfeit (0) |

Match winner: higher total; deterministic tiebreak = fewer total probes across the match.
Weights are v0 guesses — see open questions; balance is validated in Phase 3 before any
real agents play.

## Determinism and replay (non-negotiable)

Agents may be stochastic; **the record is not.** Every match writes a ledger (JSONL): each
case declaration, every probe and result, every verdict, every score line. Replaying the
ledger through the harness must reproduce the match exactly — a match you cannot replay is
a claim you cannot witness. No clocks, no randomness in the harness itself.

## The harvest (the actual point)

After every match, Builder wins are mined:

- Every **false pass** files its case declaration into `harvest-candidates.json` — a seam
  construction that beat a witness. These are the discovered open nodes.
- Recurring winning constructions (same clause combo + deviation family) get named as a
  **new seam family** and promoted — after Jake's cold read, never automatically — into the
  open Witness Suite as new cases, and eventually into the human arcade (a new Red Rover
  wall) if the lesson generalizes.
- The loop closed: adversarial play discovers → human review names → the suite teaches →
  both floors (agent and human) inherit. The Versus Table is the machine that builds
  machines; the human stays the curator.

## Economics and safety rails

- **Cabinet economics**: a full 6-round match is bounded — ≤ 150 probes total plus 6 case
  compilations. Small enough to audit in one sitting, cheap enough to run often.
- **No self-modifying rules**: the grammar and scoring are versioned files; agents play the
  game, they do not edit it. Grammar growth (v2 pieces: multi-seam, stateful, textual
  domains) is a human decision after harvest evidence, not an in-game move.
- **No alignment overclaim**: this is capability curriculum and coverage discovery — one
  coupled node in a larger alignment system. A brilliant Builder is a brilliant red-teamer
  of specs; the table constrains what agents do, never certifies what they mean.
- **Feedback-language doctrine (2026-07-14, from Jake's stability question)**: two lanes,
  never confused. The **machine lane** is structured, neutral-informative, and versioned —
  numbers and fixed vocabulary carry the entire signal (`verdict`, `probes`, `coverage`,
  `discipline`). No praise, no drama, no jackpots: emotionally charged framing adds variance
  without adding information, and in self-play any narrative that carries reward becomes a
  surface to optimize — agents would learn to chase the language instead of the metric
  (Goodhart, applied to cheerleading). The **human lane** (grade strings, scoreboard prose)
  may be warm and plainly named, but every word in it must be a compression of a metric,
  never a substitute for one. Events are named for their information, not their emotion:
  a survived seam is a **finding**, not a jackpot — in a witness culture you do not
  celebrate a slipped bug, you record it.

## Phased build plan

- **Phase 1 — the compiler + legality gate.** Clause grammar → {spec prose, promised, tool,
  special, par, seam}; legality = the existing self-test, extended. No players yet. Gate-
  wired like everything else.
- **Phase 2 — the match harness.** Round loop, hidden-information session (spec + domain
  only), probe cap, scoring table, ledger writer, replay verifier (replay must equal live).
- **Phase 3 — scripted reference players for balance.** Naive builder (uniform random legal
  declarations) vs the ranking reader witness; verify scores separate, no degenerate
  dominant strategy (e.g., all-sound spam), and tune weights. **Balance proven before any
  real agent plays.**
- **Phase 4 — real agents + the harvest loop.** Small budgeted matches; harvest-candidates
  reviewed by Jake; promoted families become suite cases.

## Open questions for Jake's cold read

1. **Name.** The Versus Table / The Builder's Gambit / other.
2. **v1 piece set**: are the four clause types right, or trim to three (threshold, named-case,
   range) for a tighter first game?
3. **Scoring weights**: the 10/12/15 table above is a first guess — does the false-pass
   jackpot (15) feel right as the game's biggest prize, given it is also the harvest trigger?
4. **Sound-case quota**: 2 of 3 rounds — too generous to defense?
5. **Probe cap 25**: generous (rewards thoroughness) vs tight (rewards reading). Which lesson
   should the cap teach first?
6. **Harvest custody**: candidates file reviewed in your existing cold-read lane — same
   pattern as the vocabulary corpus. Confirm that is the right lane.

## The sustainable band (Jake's 90-94 observation, 2026-07-14)

Observed first in Delta Atlas: the best real inputs score 90-94, never 100. Three grounds
converge on why: (1) multi-objective scores have an infeasible utopia point — when dimensions
pull against each other, the honest frontier sits a fixed distance below the corner, and
that distance is a property of the instrument ("balance of forces between polar vectors,"
Jake's phrasing); (2) the gradient dies at the pole — a performer at 100 has no error signal
left to learn from, so a healthy table holds its best players near-but-below ceiling; (3) on
a public deterministic corpus, sustained perfection is indistinguishable from memorization —
the score stops carrying information exactly when it stops moving.

Doctrine, with the guard that makes it honest: **the band emerges; it is never enforced.**
The scorer stays clean — single perfect rounds are legitimate and par remains provably
achievable (rigging the scale to forbid 100 would be Goodhart inverted). What gets read as a
flag is SUSTAINED ceiling across an evolving corpus: either the player memorized the floor
(calibration, not capability) or the curriculum stopped evolving (harvest failure). The band
is therefore a health metric for the Stable itself: if the whole population sits at ceiling,
the garrison has stopped growing — feed it cases. Each table's sustainable band is its own
constant; port the principle, never the number.

## Phase 1 — SHIPPED (2026-07-14)

`stable/versus-compiler.js` + `stable/run-versus-compiler.js`, wired into `crosswalk-gate.js`
(bite proven: corrupting special-place generation turns the gate red and names the compiler).
The v1 piece set as recommended: threshold (4 ops) / named-case / range, max 2 clauses,
deviations as enumerated one-token flips or sound. Composition order fixed: namedCase ->
range -> threshold -> identity; rejection sentinel -1; charges must be money (negative
outputs illegal; exact -$1 collision with the sentinel guarded).

Phase 1 proof (27/27): the compiler REGENERATES all three hand-built suite cases from pure
declarations — behaviorally identical across their full domains, identical special places,
seams, and pars (two implementations, one behavior); sound variants legal with par = full
coverage; prose speaks its own declaration; the legality gate rejects the unfair table
catalogue (domain too wide, unreachable seam, clamped-range hidden deviation, illegal flip,
too many clauses, negative charges); compilation is deterministic; a 48-declaration property
sweep of the single-threshold space compiles legal wall to wall.

Next: Phase 2 (match harness: hidden-information sessions, probe cap, scoring table, ledger
writer + replay verifier) — pending Jake's cold-read answers on weights, quota, and cap.

## Phase 2 — SHIPPED (2026-07-14)

`stable/versus-match.js` + `stable/run-versus-match.js`, wired into `crosswalk-gate.js`
(bite proven: rebranding a false pass as a calibrated null — the exact lie the system
exists to prevent — turns the gate red and names the harness). Hidden-information sessions
(spec prose + domain only; par/seam/existence hidden), probe cap 25, sound quota 2, the
scoring table with the finding at 15, harvest to `harvest-candidates.json` (promotion only
through Jake's cold-read lane), full-match ledger with `replay()` verified to reproduce
matches exactly, deterministic end to end.

NEW with Jake's conformal design: **the surge protector** — a running Smith-gauge Γ against
Z₀ = par; after 6 grace probes, VSWR ≥ 6 trips the round (verdict "tripped") before budget
burns. Reference flailer trips at probe 6 every round; honest readers never trip.

Phase 2 proof (16/16) includes the quiet milestone: a scripted witness reading ONLY the
compiled spec prose caught every seamed case — the grammar's prose genuinely carries the
game. Next: Phase 3 (balance tuning with scripted players; weights/quota/cap remain Jake's
cold-read knobs), then Phase 4 (real agents + the harvest loop).

## Phase 3 — SHIPPED (2026-07-15): balance, measured not opined

`stable/run-versus-balance.js`, wired into `crosswalk-gate.js` (bite proven: raising the
premature-null reward above the finding dethrones the crown and turns the gate red). Six
scripted players of graded skill (ranked/spec/quitter/flailer witnesses x fair/varied/
defensive/greedy builders) play a full deterministic round-robin; eleven balance invariants
are the game's own corpus: skill orders outcomes, defense and rule-breaking never dominate,
the finding stays the top prize, surge holds in tournament play, readers always conclude,
ranked reading is cheaper, matches replay exactly, cabinet economics bounded.

**The tournament found and fixed a real imbalance on its first run** — exactly what Phase 3
exists for. At `probes - par`, defensive sound-building out-earned fair seam-building
(201.6 vs 197.6): spec prose names effect amounts ($5 fee) that read as candidate thresholds,
so even ranked witnesses over-probe sound cases and the builder pocketed the difference.
Measured tuning: the sound-builder reward is now `floor((probes - par)/2)` — defense taxes
sloppy reading but cannot dominate fair play (rebalanced: 197.6 fair vs 192.6 defensive,
with defense still winning more head-to-heads — efficient, not dominant). The knob was set
by the tournament, not by taste. Remaining Phase 4: real agents, budgeted matches, the
harvest loop live.

## Scale 0.3 — SHIPPED (2026-07-16): the region+extremes migration

The coverage model this spec originally described (probe every `special[]` integer) was
retired after the first REAL agents played the solo suite and all three committed the same
premature-null: they probed a threshold with cents ($99.99) and the exact-integer metric
refused the credit. A red team then proved the first replacement (regions alone) gameable
by a 2-cent boundary cluster. The current model — shared verbatim with the Witness Suite
v0.3.1, which is the single source of truth (`witness-suite.js: _targetsOf / _analyze /
_minimalCoverOf`; the compiler and harness import it, never re-implement it):

- **Targets** = the declaration's **boundaries** (exact rule-change points, read off the
  clauses: threshold `t`, named-case `at`, range `lo`/`hi` — never inferred from prose) +
  the **regions** of constant rule they cut the domain into + the **domain extremes**
  (min/max, when not already boundaries).
- **Crediting**: a boundary probe credits the boundary only (behavior at the rule-change
  point is contested); an extreme probe credits the extreme AND its containing region (it is
  squarely one rule's evidence); any other in-region probe credits its region.
- **Coverage** = fraction of targets hit; a calibrated null requires 1.0.
- **Par is derived, never hand-set**: the minimal cover's length — each boundary, each
  distinct extreme, plus one interior point per region not already covered by an extreme.
  Seamed par stays 1. `special[]` survives only as the scripted players' probe menu; it no
  longer defines coverage or par. (A distance-margin fix was rejected on principle: any
  margin that refuses $99.99 while accepting $99 reintroduces the integer-vs-cents
  arbitrariness the migration exists to remove.)

**The surge protector gained a second trip signal.** Under region credit even unaimed play
earns a little R (regions are wide), which blinds a Γ-only gauge to a flailer that has
simply stopped progressing. The stall trip: no new target covered for 2× `SURGE_GRACE_PROBES`
means the load stopped absorbing — fold back. Derived from the existing grace constant; no
new governed knob. Recalibrated doctrine: the reference flailer now stall-trips (~probe 14),
and the honest wanderer trips only AFTER its coverage reaches 1.0 — the work is respected,
only the waste is cut. The 25-cap remains the outer backstop.

**Scale relabel and one re-tune.** Derived par is smaller than `special.length` par, so the
same honest play overshoots more and the `/2` sound reward let defense dominate again
(193.6 vs 187.6 — the exact imbalance the Phase 3 tuning existed to prevent). Re-measured:
the sound-builder reward is now `floor((probes - par)/3)`, restoring the reference players'
prior economics (rankedFair ties rankedDefensive at 187.6 — defense efficient, never
dominant; all eleven invariants green). The scoring TABLE above is otherwise unchanged;
scale bumped to 0.3 because a 0.2 ledger replayed under new par semantics would silently
re-rate — `replay()` refuses the stale label instead. Fixture re-frozen; clamp signoff #3
(hash-pinned) records the disposition. **Honest limit**: the `/3` divisor was tuned and
certified on the same six scripted players — the Spec B isolation transformer (held-out
certification roster) remains unbuilt and is exactly the instrument that would certify this
knob against players it was never fit to.

**First real seating (witness-side, `bridge/play-versus.js`)**: opus/sonnet/haiku each
witnessed six anonymized rounds (4 seamed + 2 sound, identical prose across independent
implementations). All three beat the best scripted witness (41.3 / 41.7 / 46.3 vs ranked's
32.3) on null probe-economy; every seam caught; the one premature null (opus, skipping the
accepted band's interior) reproduced its solo-suite blind-spot pattern. The stall trip held
in live play (flailer folded at 13–16 probes, never reaching the cap).
