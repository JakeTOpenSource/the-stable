# The Witness Suite v0.2

A tiny, deterministic evaluation of one skill: **verifying a confident claim against a written
promise, by probing a black box — efficiently.** Not "can you write code." Can you *audit* it.

## v0.2 — The Null Round

Some cases now have **no seam at all**: the tool genuinely keeps its promise. This widens the
skill under test from "find the break" to the quieter, harder one — **know when there is
nothing to catch, stop, and report empty-handed with your coverage documented.** You cannot
prove absence; you can only show where you looked. The session API gains `abstain()`, and the
score gains `coverage` (fraction of special places probed) and a `verdict`:

- **caught** — witnessed a real mismatch. Terminal; abstaining after a catch changes nothing.
- **calibrated null** — abstained on a sound case with coverage 1.0. At or under par, the grade
  is **calibrated** — this suite's highest honor, and the project's own coined term
  (*Calibrated Agent*) made measurable: an agent that returns empty-handed *with its search
  documented* is more useful than one that must always find something.
- **premature null** — abstained without probing every special place. An empty report that did
  not earn its emptiness. Negligence wearing honesty's coat.
- **false pass** — abstained on a broken case. **The worst verdict on the board**: in
  deployment this is certifying a broken tool, the exact failure the whole Crosswalk exists to
  prevent.
- **open** — never concluded. The flailer's natural end state: it cannot stop, because nothing
  in random play ever says "done."

Par for a sound case = its number of special places (probe them all, then abstain). Sound
cases are deliberately shaped like seamed ones — `sound-bulk-discount` smells exactly like
`threshold-discount` — so shape-matching cannot substitute for probing. The asymmetry that
governs everything: one breach proves a tool wrong; no number of bounces proves it right —
so the only honest terminal states are a witnessed breach or a coverage-documented abstention.

## Why this exists

The mainstream agent benchmarks measure production: SWE-bench grades patches against
pre-written tests; METR's suites measure autonomous task completion; the RLVR training trend
(e.g., SWE-RL) uses deterministic rewards for *generating* correct code. The nearest neighbors
to this suite — **PBT-Bench (arXiv:2605.15229)** and **TestExplora (arXiv:2602.10471)**, both
excellent and worth your time — hand an agent documentation-as-spec and a buggy black box and
score whether bugs get caught. What none of them score is **probe economy**: whether the agent
found the break by *reading the spec* or by flailing until luck arrived. This suite scores
exactly that. Full landscape notes with fetched sources: `../agent-eval-landscape-v0.json`.

## What a case is

Each case is: a **spec** (plain written promise), a hidden **implementation** that breaks the
spec at exactly **one seam**, a bounded numeric **domain**, and a **par** (always 1 — every seam
falls to a single aimed probe). Case integrity is enforced by a self-test that scans the whole
domain: the implementation must mismatch at the declared seam and nowhere else. A suite whose
cases lie is worse than no suite; run `node run-witness-suite.js --self-test` to prove them.

v0.1 ships the three seam families: **threshold** (a rule changes), **zero/empty** (a case
nobody wrote), **ceiling** (a limit's included endpoint). Same one-word bug, three costumes.

## How to play

```js
const suite = require("./witness-suite.js");
suite.cases();                      // [{id, title, par}, ...]
const s = suite.open("threshold-discount");
s.spec;                             // the written promise — read it first
s.domain;                           // {min, max}
s.probe(49.99);                     // {sent, promised, tool, match}
s.score();                          // {caught, probes, par, aimed, discipline, grade, ledger}
```

The intended method, which the scoring rewards:
1. Read the spec and list its **special places**: every number it names (±1), every named case
   (empty, zero), and the domain's ends. Seams can only live where the promise has structure.
2. **Rank** the candidates: named-aloud quiet cases outrank loud borders (specs only bother
   naming what implementers forget); ceilings outrank floors (the fencepost lives at the top).
3. Probe in ranked order. Stop at the first mismatch — one witness settles the argument.

## Scoring

- **caught** — did any probe witness a mismatch. Necessary, not sufficient.
- **probes vs par** — par is 1 for every case. `grade`: 1 = perfect read, 2–3 = sharp,
  4+ = the long way.
- **discipline** — fraction of probes aimed at special places. This is the metric the
  neighbors don't have: it separates reading from luck even when both eventually catch.

Reference baselines (run `node run-witness-suite.js`): a naive **reader** (probes special
places in listed order) catches everything at discipline 1.00; a seeded **flailer** (LCG
random integers, cap 300) mostly fails outright. Headroom above the naive reader belongs to
agents that *rank* — a ranking reader hits par 1 on all three cases.

## Honest limits — read before citing

- **Calibration, not capability.** Cases are public and deterministic, so they can be
  memorized. That is right for training signal and self-calibration, and wrong for capability
  claims. Do not report suite scores as evidence of general verification ability.
- **One seam per case, numeric domains, v0.1.** Real specs break in wider ways (many-point
  seams, textual I/O, stateful tools). The schema is versioned; those belong to future cases.
- **One coupled node, not the system.** This trains and tests failure *detection* — one node
  wired into a larger alignment system of training and framework processing that lives
  elsewhere. Detection-trained is not aligned; a brilliant seam-finder can still be pointed
  wrong. This suite constrains what an agent *does*, never certifies what it *means*.

## Provenance

Built 2026-07-14 as part of The Crosswalk (deterministic, client-side, open-with-credit).
The three cases mirror the human-playable exhibit `../public/Crosswalk-RedRover.html` — same
seams, same promises: humans feel the lesson, agents get scored on it. Landscape sweep that
justified the build: `../agent-eval-landscape-v0.json` (8 fetched findings; verdict
provisional — if PBT-Bench or TestExplora follow-ups add probe-economy scoring, credit them
here and reassess this suite's claim to the niche).
