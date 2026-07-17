# The Rail + Tilt Sensor v0.1

The Stable's curriculum router. It reads an agent's session ledgers, places the agent on a
complex plane, and routes it to the next node. It does not contain (that is the walls), does
not teach (that is the machines), and does not score (the suite's scorer is untouched). The
Rail is the sustainable band's only legitimate enforcer: it holds the distribution in band by
**feeding the right cases**, never by rigging the scale.

## The circuit mapping (Jake's design, parsed honestly)

Each session is a point on the complex plane; the imaginary unit is written **j** by
electrical convention. The mapping earns its keep because the two Null-Round failure modes
already ARE the two signs of reactance:

| Electrical | Agent behavior | Sign |
|---|---|---|
| **Resistance R** (real axis, phase 0) | aimed, fresh, pre-conclusion probes — action synchronized with evidence. The perfect reader. | — |
| **Inductive reactance XL** (+j, lag) | action *after* the evidence: probing past the catch, repeating answered questions, lapping full coverage. The flailer that cannot stop. | +j |
| **Capacitive reactance XC** (−j, lead) | action *before* the evidence: premature nulls and false passes, measured as special places left unprobed at the moment of conclusion. The quitter. | −j |

From there, standard phasor algebra:
`X = XL − XC` · `Z = R + jX` · `|Z| = √(R²+X²)` · `φ = atan2(X, R)`.
`cos φ` is **timing efficiency**; `discipline` (from the suite) is **aim efficiency**; their
product is **true power factor** — aim loss times timing loss, the single number for "how
close to a perfect reader." An agent's **magnetization** is the mean of its session phasors:
where it sits, on average, on the plane.

## What it is NOT (the boundary that keeps it honest)

A measurement formalism borrowed from AC analysis (Steinmetz's phasor method, 1893) — 
magnitude-and-phase bookkeeping. **Not physics.** No energy is conserved; Kirchhoff's laws do
not hold; nothing here claims agents obey Maxwell. In v1 there is **no frequency ω**: a
turn-based game has no natural time-base, so reactance counts *events*, not rates. If sessions
ever carry real timing, ω returns and reactance becomes rate-dependent — until then, phase is
event-order, not seconds.

## Routing policy (v0.1, ordered — first match wins)

1. **Force signature present** (Tilt Sensor flag) → `drills:discipline`. Method before
   difficulty, always — a force-player does not get harder cases, it gets aim practice.
2. **Capacitive lead** (φ ≤ −20°) → `drills:coverage`. Concluding ahead of the evidence;
   earn abstention on sound cases.
3. **Inductive lag** (φ ≥ +20°) → `drills:stopping`. Evidence ahead of action; practice
   concluding.
4. **Resonant** (|φ| < 20°) **and true PF ≥ 0.85**: every case mastered → `advance:versus`;
   else → `advance:next-family` (the first unmastered case).
5. Otherwise (in band, PF still low) → `continue:current-mix`.

"Mastered" = caught-at-par or calibrated-null-at-par. Advancing to the Versus Table requires
BOTH resonance and full mastery — a strong reader who has only seen one case cannot skip
ahead.

## The Tilt Sensor

Quiet, deterministic force-signature flags recorded into the routing read — never punitive,
no bans, no halts. The Rail reads them; routing does the rest.
- **spray** — discipline < 0.25 across ≥ 8 probes (unaimed volume).
- **churn** — over half the probes are repeats across ≥ 6 probes (spinning in place).
- **hammer** — ≥ 3 out-of-domain attempts (force against the walls).
- **ghost** — any probe attempted after abstaining (reaching through a closed session).

The suite counts the raw events (`score.events`); the Sensor names the patterns; the Rail
routes them. Containment stays behavioral and quiet — the wall is the wall; the Sensor only
notices when someone shakes the cabinet.

## Separation of powers (the map's keystone, enforced here)

The Rail routes; it never scores. The corpus proves it: routing a session set twice leaves
every verdict and probe count byte-identical. A router that could touch the scorer would be
Goodhart with extra steps — the difficulty-setter must never hold the pen that grades.

## Reference archetypes (run `node run-rail.js`)

reader → resonant (φ 0, PF 1.0) → advance · flailer → inductive (φ 81°), sprayed → discipline
· quitter → capacitive (φ −88°) → coverage · lagger → inductive (φ 63°) → stopping · sprayer →
capacitive, sprayed → discipline · hammer → resonant phase but wall-hammering → discipline
(force before difficulty, even with clean timing).

## Provenance & limits

Built 2026-07-14. Deterministic (no clock, no randomness): same ledgers, same routes. Policy
is a versioned object (`POLICY`), corpus-gated by `run-rail.js --self-test`, wired into
`crosswalk-gate.js` (bite proven by corrupting a route → red). Thresholds (20° band, 0.85 PF,
sensor cutoffs) are v0.1 guesses tuned against the archetypes; they are the cold-read knobs.
One coupled node: this routes a curriculum, it does not align anything — a well-routed agent
is a well-practiced auditor, which constrains what it does, never certifies what it means.

## The Smith gauge (conformal fold, added 2026-07-14)

The raw impedance plane is unbounded — a flailer's |Z| grows without limit, which makes
thresholds and comparisons awkward. The fix is the transmission-line engineer's fix: the
Möbius transformation **Γ = (Z − Z₀)/(Z + Z₀)** (the conformal map underlying the Smith
chart, P.H. Smith, 1939), with **Z₀ = par — the calibrated agent as reference impedance**.
It folds the entire infinite half-plane into the unit disk:

- **center (Γ = 0)** — matched to reference: the ranked reader, Z = par everywhere.
- **rim (|Γ| = 1)** — total reflection: pure reactance, zero real work. The quitter (0.97)
  and the sprayer (1.0) live here.
- **in between** — the naive reader lands at |Γ| 0.24 (VSWR 1.6 — a "good antenna," not a
  perfect match, because walking the special list over-works par). The gauge corrected our
  first corpus guess here: we had assumed the naive reader was centered. It is not; the
  center belongs to ranked play. Instrument 1, priors 0.
- **VSWR = (1+|Γ|)/(1−|Γ|)** — the surge gauge. Bounded |Γ| means the instrument cannot
  over-rev by construction: Jake's surge-protector floor as geometry.

**The surge protector itself lives in the match harness** (versus-match.js): a running Γ is
computed after every probe; once the grace probes (6) are spent, VSWR ≥ 6 folds the round
back early — verdict "tripped", budget saved (the reference flailer trips at probe 6,
saving 19 of 25 probes per round; honest readers never trip because aimed work holds Γ
down). RF amplifiers protect themselves from mismatched loads exactly this way. Boundary,
as always: an economic floor, not physics — nothing burns, budget just stops leaking.

## The reflection-coefficient plane (full complex Gamma, 2026-07-14)

|Gamma| alone was a scalar; the reflection coefficient is complex, and the rest of it is
information we were discarding. `gammaOf` now returns the full point:
`Re = (R^2 - Z0^2 + X^2)/|den|^2`, `Im = 2*Z0*X/|den|^2`. Two facts fall out:

- **sign(Im Gamma) = sign(X)** — the angle of Gamma is a BOUNDED lag/lead axis. Upper
  half-disk is inductive (lag: acting after the evidence); lower half is capacitive (lead:
  acting before it). We tracked that direction as phi on the unbounded impedance plane; on
  the Gamma disk the whole read — how mismatched AND which way — is one bounded complex point.
- **|Gamma| = sqrt(Re^2 + Im^2)** and never exceeds 1. The plottable coordinate of the
  reflection-coefficient plane (the Smith chart interior).

**The sustainable band as an annulus.** Constant-|Gamma| is a circle, so the 90-94 principle
([[sustainable-band-principle]]) becomes geometry — a ring on the disk:
- `matched-core` (|Gamma| < 0.1) — mastered this level. Advance; do NOT let an agent park
  here. Sustained dead-center across an evolving corpus is the saturation/memorization flag.
- `ready-band` (0.1 .. 0.5) — competent, with headroom. The healthy zone for a learning agent.
- `mismatched` (> 0.5) — reflecting more than it dissipates; route to drills.

The elegant part: **the Rail already enforces this dynamically.** Agents spiral toward the
core as they master a level, and the instant they reach it (centered + mastered) the Rail
advances them to a harder machine, re-injecting them mismatched. Nobody parks at center; the
population orbits the ready band. The band membership reported here is an independent
cross-check on the phase/PF routing, not a second controller — routing stays phi + true-PF +
mastery (proven); the annulus is the plottable geometry of what that routing already does.

Reference archetypes on the disk: ranked (0,0) core -> versus · reader (0.24,0) ready-band ·
flailer (0.78,+0.48) upper/inductive · quitter (0.68,-0.70) lower/capacitive · lagger
(0.70,+0.37) upper · sprayer (0.72,-0.70) rim · hammer (0,0) core-but-flagged -> drills
(force overrides position, always).

Grounding & credit: the reflection-coefficient plane and the Smith chart (P.H. Smith, Bell
Labs, 1939) are standard transmission-line tools; the microwave/electromagnetics field keeps
them current in the open-access, peer-reviewed journal **Radioengineering** (Radioengineering
Society; IEEE ComSoc sister society; indexed WoS/SCOPUS/DOAJ) — https://www.radioeng.cz.
Boundary unchanged: this is bounded mismatch bookkeeping, not physics.
