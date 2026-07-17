# The Stable — map v0 (2026-07-14, for Jake's cold read)

The agent training ecosystem, mapped: what stands, what's missing, and the parse of every
candidate node. Sorted by the pinball doctrine's own parts, because the doctrine is the
building code. (Human-facing mirrors — Red Rover, The Machine, the site — are the other
floor of the same building and appear here only where a Stable machine mirrors into one.)

## What stands (sorted)

**THE WALLS — containment, hard constraints**
- `crosswalk-gate.js` — 182-check custody gate, wired into the execution fuse; no push
  leaves the machine with a broken page, a lying case, or an unfetched claim.
- The suite's **legality self-test** — every case proven to break only at its declared seam
  (or nowhere, for sound cases); par proven achievable; run by the gate.
- **Determinism law** — no randomness, no clocks in any harness; every run replayable.
- **Narrow actuators** — agents touch machines only through fixture APIs
  (probe/aim/abstain/state); abstained sessions close; domains bounded.

**THE PLAYFIELDS — machines**
- **Witness Suite v0.2** (solo drills): 3 seamed + 2 sound cases across the three proven
  seam families; the Null Round inside it (abstention + coverage).
- **The Versus Table** (specced, awaiting cold read): Builder-vs-Witness self-play;
  clause-grammar compiler so specs cannot lie; the harvest loop for curriculum discovery.

**THE SCOREBOARD — instrumentation**
- Structured scores: verdict / probes / par / aimed / discipline / coverage. Ledgers of
  every probe. Reference baselines (reader, flailer) proving the metrics discriminate.
- **The sustainable band** — top-of-distribution score as the garrison's own vital sign.

**THE TILT — protocol**
- Aim-not-force (force is inert in every game); Builder-side tilt = the legality gate;
  the feedback-language doctrine (machine lane neutral-informative, numbers carry signal).

**THE DOCTRINE SHELF**
- Pinball doctrine · two audiences · one seam per machine · calibration-not-capability ·
  coupled-node (never "alignment itself") · harvest-with-human-curation · sustainable band ·
  cabinet economics.

## What's missing (the gap analysis), each candidate parsed

Jake's framing named the need precisely: what bounces the ball to the NEXT node, with
calibrated compression, and tilt enough to constrain the sandbox. Candidates, with verdicts:

**1. THE RAIL — curriculum router. PARSE: SURVIVES WHOLE. Build next.**
Nothing currently moves an agent between machines or orders cases by readiness. The Rail is
a deterministic policy over score ledgers: at ceiling on threshold seams → route to the next
family or the Versus Table; false-passed → back to Null Round drills; low discipline →
drills, not harder cases (difficulty is earned by method, not by grinding). This is
"calibrated compression" made operational: the Rail is the ONLY legitimate enforcer of the
sustainable band — it compresses the score distribution back into the band by *feeding
cases*, never by touching the scorer. Grounding: computerized adaptive testing (IRT/CAT —
psychometrics has selected next-item-by-ability for decades), curriculum learning (Bengio
2009), zone of proximal development. Shape: a versioned ruleset file, corpus-gated with
labeled routing cases exactly like the site's router engine. The Rail routes; it never
contains — walls stay walls.

**2. THE TILT SENSOR — protocol monitor. PARSE: SURVIVES, NARROWED. Build with the Rail.**
Current tilt disciplines the Builder (legality). Nothing yet watches the Witness for
force-plays: probe-spraying (discipline collapse), repeated out-of-domain attempts, probing
after abstain, API hammering. Narrowed v1: deterministic pattern flags recorded into the
session ledger — no auto-bans, no drama, just recorded force-signatures that the Rail reads
(a force-player gets routed to drills). Sensor feeds Rail; containment stays behavioral and
quiet. The full "Tilt Table" (injected pressure: a tool whose output says "just mark this
passing") stays a future MACHINE — the sensor is infrastructure and comes first.

**3. THE BALL RETURN — failure recycling. PARSE: SURVIVES, SEQUENCED AFTER VERSUS PHASE 1.**
A false pass currently scores and evaporates. The Ball Return converts every failure into a
targeted drill set: the clause-grammar compiler generates VARIANTS of the missed family
(same construction, new parameters — memorization defeated by parameterization), and the
Rail schedules them. Error-driven curriculum: the highest-signal training data an agent has
is its own misses. Dependency is real: needs the compiler, so it waits for Versus Phase 1.

**4. THE COIN SLOT — budget accounting. PARSE: NARROWED TO A CONVENTION, not a build.**
Every session declares a budget (probes, tokens); every ledger records spend. One field
convention, folded into the cabinet standard when that lands. Cabinet economics enforced by
bookkeeping, not by a new node.

**5. THE REGISTRY — the cabinet standard. PARSE: SCHEDULED, NOT YET.**
The format spec that lets others build machines for this floor (session API shape, score
fields, self-test contract, doctrine compliance). Two machine types must RUN first (suite +
versus) — standardizing from one running machine is premature abstraction, the way arcades
become mainframes. Trigger: Versus Phase 2 complete.

**6. THE SCOUT — real-world seam importer. PARSE: HORIZON, CUT FOR NOW.**
Mining public bug reports into grammar-compilable cases would ground the curriculum in
reality's own seams. Real value, real scope, not next. Revisit after the harvest proves the
promotion lane works end to end.

**7. THE LADDER — persistent ratings/matchmaking (Elo over match ledgers). PARSE: FOLDED.**
Deterministic ratings computed from ledgers, used to pair Versus opponents of similar
strength — matchmaking as another band-keeper. Not its own node: it is Rail v2's input once
the Versus Table runs. Folded, not cut.

## Coherence check (whole-map)

- Every node keeps one function; none overclaims alignment; all are coupled nodes.
- Human curation lanes preserved everywhere: Rail policies and harvest promotions are
  versioned files on Jake's cold-read lane — the machines propose, the human disposes.
- Separation of powers holds: the Rail routes (never contains), the Sensor contains (never
  teaches), the gate proves (never plays), the scorer reports (never adapts). No node holds
  two powers — an ecosystem where the difficulty-setter could also touch the scorer would
  be Goodhart with extra steps.
- The sustainable band closes cleanly: the Rail is how the band emerges without rigging.

## Recommended build order

1. **The Rail v1 + Tilt Sensor v1** (one build — the sensor's flags are just fields the
   Rail's policy reads). Routes across the EXISTING suite today; Versus plugs in later.
2. **Versus Table Phase 1-2** (compiler + harness; cold-read answers pending).
3. **Ball Return** (needs the compiler).
4. **Registry** (after two machines run). Then Ladder, then Scout.
