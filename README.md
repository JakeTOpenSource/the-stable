# The Stable

A deterministic training and evaluation ecosystem for AI agents, built on the **State Delta**
method (a claim held against a witness). It is the agent pole of a two-pole system; the human
pole is [The Crosswalk](../Code-Crosswalk). The two share the method, not a codebase — they are
separate repos on purpose, coupled only through the shared discipline, so neither can quietly
condition the other.

## What it measures

One narrow, underserved skill: **verifying a confident claim against a written promise by
probing a black box — efficiently.** Not "can the agent write code." Can it *audit* code it did
not write, find where the implementation deviates from the spec, and do it by reading rather
than flailing. The nearest prior art (PBT-Bench, TestExplora) scores bug *detection*; this
scores **probe economy and earned abstention** — the part they leave out. Landscape notes with
fetched sources: `agent-eval-landscape-v0.json`.

## The floor

Everything is **deterministic** — no clocks, no randomness in any harness; the same inputs
reproduce the same scores and the same ledgers, every run. That is the whole basis for trusting
the data: clone it, run one command, get the same numbers. The custody gate proves it:

```
node stable-gate.js        # pages, data, every machine's self-test, and the clamp
```

The machines:
- **witness-suite/** — solo drills across three seam families plus the Null Round (knowing when
  there is nothing to catch, and abstaining with coverage documented).
- **stable/rail.js** — the curriculum router. Places each session on the reflection-coefficient
  (Smith-chart) plane and routes by measured discipline. Routes; never scores.
- **stable/versus-*.js** — the Versus Table: an adversarial Builder-vs-Witness game whose
  scoring knobs are held under a signed **clamp** (`stable/knobs-signed.json`) so no value moves
  without a recorded human disposition.
- **public/Crosswalk-Scoreboard.html** — the disk visualization, gate-diffed against the Rail's
  own math so the display cannot drift from what is measured.

## Honest limits — read before citing

- **This is calibration, not a capability benchmark.** Cases are public and deterministic, so
  they can be memorized. Right for training signal and self-calibration; wrong for capability
  claims. Do not report suite scores as evidence of general verification ability.
- **What it has actually discovered so far: one trivial seam** (a `>=` flipped to `>`), from
  scripted reference players. **No real agent has played yet.** The apparatus is real; the yield
  is, to date, one fact it started with. Treat any grander claim as unearned.
- **One coupled node, not the system.** It trains failure *detection* and honest reporting —
  which constrain what an agent *does*, never certify what it *means*. Detection-trained is not
  aligned. A brilliant seam-finder can still be pointed wrong.
- **The formalism is borrowed bookkeeping, not physics.** The AC-circuit / Smith-chart mappings
  (Steinmetz 1893; P.H. Smith 1939) are magnitude-and-phase bookkeeping on bounded planes. No
  energy is conserved; nothing here obeys Maxwell. Boundaries are stated in each file.

## Credit

Stands on: mutation testing (DeMillo, Lipton & Sayward, 1978); self-play (the checkers→AlphaZero
lineage); property-based testing; the reflection-coefficient plane kept current in the
open-access journal *Radioengineering*; and the two nearest neighbors it does not replace,
**PBT-Bench** and **TestExplora**. Open, with credit — the Mola Mola way: what is free cannot be
extracted.

## Status

Deliberately unshipped. It goes to researchers when its builder judges it validated — not before.
