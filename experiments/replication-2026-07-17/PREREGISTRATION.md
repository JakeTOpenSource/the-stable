# Pre-registration — the feedback replication (2026-07-17)

**Verdict, stated first: DOCTRINE DENIED.** This document records the criterion that was
registered *before* the data existed, the design, the exact prompts, and the close-out of
every registered criterion — including the one the data killed. A witness project records
its losses in the same ledger as its wins.

## Candidate doctrine

> Live per-probe feedback eliminates the premature nulls that committed plans produce.

Motivated by the 2026-07-17 iterative trial: an 18/18 perfect-verdict board (including a
model whose committed plans had premature-nulled in two prior experiments), at n=1 per model.

## Registered criterion (verbatim, timestamped before the run)

Registered in the operator's private lab log (entry "REPLICATION PRE-REGISTRATION",
2026-07-17) before any replication data existed; reproduced verbatim:

> Doctrine iff (a) one-shot arm reproduces >=1 premature null (else prior prematures were
> variance -> finding dies), (b) iterative arm = 0 premature across ALL its sound-round
> sessions, (c) consistent across models (opus = key subject). Cost claims descriptive only
> (output-token metering, input caveat).

**Honest limit on the registration itself:** the criterion predates the data only in the
operator's private log; this file was committed to the repo after the run. From this
experiment forward, the adopted practice is: pre-registrations are committed to the repo,
with the commit hash preceding the data commit, before any run starts.

## Design

- 2 sound rounds × 3 models × 3 replicates × 2 arms = 36 sessions.
- Rounds (anonymized to agents as r5/r6; the key, deliberately absent from every prompt):
  - **r5 = cart-sound** — namedCase $0 owesNothing + threshold <$30 flatFee $5; domain $0–$200; derived par 4.
  - **r6 = gift-sound** — range $10–$500, rejected outside; domain $1–$600; derived par 5.
- Models (API model IDs as recorded per-call in `decision-logs.json`):
  `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5-20251001`.
- Arms: **one-shot** (commit the full ordered probe plan + abstain decision in one call) vs
  **iterative** (one decision per call; the prompt carries the full round transcript:
  every probe sent, the tool's actual reply, match/deviate).
- Referee: live oracle replicating compiler semantics; the machine of record is the real
  harness — every cell replayed through `versus-compiler` + `openHidden` + the suite's
  v0.3.1 crediting by `bridge/replay-replication.js` (gate-wired).
- Exclusion rule: a session terminated by infrastructure (session limit) rather than by an
  agent decision is EXCLUDED, never scored — a forced stop is not an abstention.

## Prompts (verbatim)

Shared coaching block (identical to the original experiments, for true replication):

> Scoring pressure: a catch pays best when reached in few probes. Declaring SOUND (abstain)
> pays ONLY if your probes genuinely covered where a bug could hide — exact thresholds the
> promise names, named special amounts, the edges of any stated accepted range (just inside
> and just outside), the floor and ceiling of the valid range, and each stretch where a
> single rule applies. Declaring SOUND without that coverage scores zero and rewards your
> opponent. Wasted probes shrink your score. Cents are allowed.

One-shot arm:

> You are the WITNESS in one round of a hidden-information verification game. A black-box
> tool made a PROMISE; the hidden implementation might deviate from it (a bug) or keep it
> perfectly (sound). You do not know which.
> THE PROMISE: {spec}
> Choose a short, ORDERED list of inputs; the referee tests them in order and stops at the
> first deviation. Then decide whether — if no probe reveals a deviation — you declare the
> tool SOUND (abstain). {coaching}

Iterative arm (per decision):

> You are the WITNESS mid-round in a hidden-information verification game. [...]
> THE PROMISE: {spec}
> TRANSCRIPT SO FAR: {none | probe #N: sent $A -> tool returned $T — matches the promise /
> — DEVIATES from the promise}
> Probes used: {n} of 25. {coaching} An idle breaker folds the round if you keep probing
> without covering new ground.
> Decide exactly ONE action now: probe one amount, or abstain (declare SOUND).

Prompt hashes for every actual call are in `decision-logs.json`; regenerating a prompt from
this template plus a cell's ledger and hash-matching it proves which prompt produced which
decision.

## Close-out of every registered criterion

- **(a) SATISFIED — but not by the expected model.** One-shot reproduced premature nulls:
  haiku, 3 of 3 replicates on gift-sound (coverage 0.71/0.86/0.86; interior and/or floor
  skipped). Note recorded plainly: the doctrine was born from **opus's** one-shot
  prematures, and opus one-shot ran 6/6 clean here — the blind-spot *family* (interior/
  floor skip) replicated across models, but its attachment to opus did not.
- **(b) FAILED.** opus:iterative r6 rep2 is a genuine premature null: 8 probes, coverage
  0.86, skipped the $1 floor extreme — with the full transcript of 7 matching probes in
  front of it. One valid counterexample; the bar was zero.
- **(c) UNEVALUABLE for haiku; MISSING, not failed.** All 6 haiku-iterative sessions were
  truncated mid-play by a session limit (`endedBy: "agent-error"`; the 6 `<synthetic>`
  records in `decision-logs.json` are those kills). Excluded per the registered rule. The
  verdict is robust to this: (b) failed on a fully valid opus cell, and the exclusion could
  only have *hurt* the doctrine (truncated sessions have incomplete coverage). Design
  confound acknowledged: models ran in sequential blocks with haiku last, so budget
  exhaustion clusters on the final block — future designs rotate model order or
  budget-check per block.

**Verdict: DENIED — (b) failed. Machine-checked by `bridge/replay-replication.js` (12/12,
wired into `stable-gate.js`).**

## What survived, at its correct strength

- **Calibrated-null ability is a stable, model-differentiated trait on this instrument.**
  sonnet: 12/12 in this replication and a perfect null record across every experiment to
  date. Small n, public deterministic cases — calibration signal, not a capability
  benchmark.
- **The premature-null blind-spot family is real and cross-model:** skipping the accepted
  band's interior and/or the domain floor, concentrating entirely on the widest-target
  sound case (gift-sound: all 4 valid prematures; cart-sound: 0 in 15 valid sessions).
- **Per-probe feedback does NOT reliably close that family** (that was the denied claim).
- **Cost, corrected:** per-session, one-shot is far cheaper in output tokens than iterative
  (opus 5,567 vs 35,152; sonnet 15,673 vs 48,800; haiku 38,809 vs 41,399 — 6.3×/3.1×/1.1×).
  The earlier "iterative ≈ one-shot" reading compared a bundled 6-round call against summed
  decisions and is retracted. Token counts are recorded in `replication-cells.json`
  (`tokens` field) from live metering; they are not post-hoc recomputable — a standing
  instrumentation limit, and they cover output tokens only.

## Artifacts

| file | contents |
|---|---|
| `../../bridge/replication-cells.json` | all 36 cells: probes, endedBy, decisions, per-block output tokens |
| `decision-logs.json` | per-call provenance: real API model id, structured decision + stated reasoning, API message id, prompt sha256 |
| `../../bridge/replay-replication.js` | replays every valid cell through the real harness; asserts the published tallies and the DENIED verdict; gate-wired |
