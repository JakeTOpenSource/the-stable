---
name: two-bug-review
description: >
  Dispatch an independent adversarial reviewer to try to break a just-made change before it
  ships — re-deriving every reported number by running the actual code, bite-testing
  verification logic by mutating what it guards in a sandbox, and walking the real ship path
  (gates, hooks, pinned strings, hashes, docs) to confirm it would actually pass. Use this
  whenever work is about to be committed, pushed, or published that carries a quantitative
  claim (rates, counts, totals, benchmark numbers, verdicts), a behavioral claim ("X now does
  Y"), new or changed verification/test/gate logic, or an update to signed, pinned, or hashed
  state — even if the change looks small and even if the numbers were already checked once.
  Also use it when the user asks for an "advisor parse", "adversarial review", "two-bug
  check", "Fable pass", or a pre-ship/pre-launch check on recent work. Skip it only for
  trivial mechanical edits or pure prose that makes no checkable claim.
---

# Two-Bug Review

## Why this exists

If the same mind writes both the work and the check, one blind spot produces two matching
artifacts: the work and the check agree *with each other*, not with reality. The fix is
structural, not motivational — a second, independently-derived view of the same claim, and a
requirement that the two agree before anything ships. That is the "two-bug" discipline: for a
wrong claim to survive, there now have to be two bugs, one in the work and one in an
independently-built check, that happen to align.

Track record from its first day of systematic use (five reviews on one project, 2026-07-21):
every single review caught at least one real, confirmed problem the author had missed —
prose contradicting the committed data it described, verification checks that could never
fire, a diff the repo's own pre-push hook would have rejected (twice), and subtler
recurrences of bugs already "fixed" once. The strongest predictor of catch quality was one
behavior: the reviewer **re-derived everything from the artifacts instead of trusting the
description it was handed.**

## When to run it

Ship-bar, not every-change bar. Run it when the change being shipped carries:

- a **quantitative claim** — a rate, count, total, score, or verdict someone will read as true;
- a **behavioral claim** — "X now does Y," "the bug is fixed," "these two are now identical";
- **new or changed verification logic** — tests, verifiers, gates, replay scripts (checks that
  guard other claims are the highest-value review target: a vacuous check silently converts
  every future wrong claim into a shipped one);
- **signed / pinned / hashed state** — anything a gate compares against a frozen value.

Skip it for trivial mechanical edits, pure prose with no checkable claims, or work already
reviewed this session with no substantive changes since. When unsure, the question to ask is:
"if a number or claim in this change is wrong, does it ship to somewhere that matters?" Yes →
review.

## How to dispatch the reviewer

Independence is the active ingredient — protect it:

1. Use a **fresh subagent** (Agent tool, general-purpose) with no shared working context.
2. Route it to the strongest reasoning model available that did **not** author the change.
   (In this user's setup: Fable is the standing advisor model.)
3. If no subagent tool is available in the current context, do not silently pretend: perform
   the full rigor bar yourself — the mechanical steps (re-run, mutate, walk the ship path) do
   not depend on fresh eyes — and tell the user plainly that this review lacked
   reviewer-independence and why that weakens it.

The dispatch prompt must contain all six of these, because each one has independently earned
its place:

1. **The artifacts, not a summary** — repo path and the exact files to read, in reading order.
2. **The claims, stated precisely** — every number, verdict, and behavioral statement the
   change ships, quoted exactly as the user will see them.
3. **A distrust instruction** — "the description in this prompt is itself unverified; check
   every part of it against the actual code before relying on it." Reviews that skipped this
   verified the author's framing instead of the work.
4. **The rigor bar below, spelled out** — reviewers default to reading when not explicitly
   told to run and mutate.
5. **Prior-catch pressure** — tell the reviewer that previous reviews of this kind have each
   found a real problem, and to assume this change contains one until proven otherwise.
   Reviews given this framing stayed aggressive; reviews without it drift toward summarizing.
6. **The required output shape** (below), so findings arrive actionable instead of as an essay.

Also instruct the reviewer to **sandbox every mutation**: copy files to a scratch directory
before altering anything; never modify the real working tree. A review must not contaminate
the thing it reviews.

## The rigor bar (what the reviewer must actually do)

1. **Re-run, don't re-read.** Execute the actual code and confirm every reported number
   regenerates exactly. A number that cannot be reproduced is treated as wrong, not as
   probably-fine. Printed output in docs, commit messages, or the dispatch prompt is not
   evidence.
2. **Bite-test every verification.** For each check the change relies on, mutate the thing it
   guards (in a sandbox copy) and confirm the check actually goes red. A check that stays
   green under corruption is vacuous — report it as a finding even if the data it currently
   guards happens to be correct. This single move has caught a verifier that compared only
   lengths (content corruption passed) and a disjointness assertion that could never fire.
3. **Walk the ship path.** Run the real gate/hook/CI entrypoint this change must pass through,
   exactly as it will run. Stale pinned strings, stale hashes, and docs contradicting code are
   ship-blockers even when the logic is right — and this class of miss recurred twice in one
   day, so check it every time regardless of how careful the author believes they were.
4. **Diff docs against code.** Any document stating numbers or claims must match what the code
   currently produces, not what it produced when the document was written.
5. **Derive independently where feasible.** Recompute key results by a different route than
   the implementation — a different algorithm, a hand computation, an algebraic reduction —
   and require agreement. Two derivations that share a method can share a bug.
6. **Distinguish reduced from closed.** If the change fixes a failure mode, quantify the
   residue. "Improved" and "eliminated" are different claims; report which one the evidence
   actually supports, with the numbers.

## Required output shape

Require exactly this structure from the reviewer:

- **Confirmed-accurate** — each verified claim, *with how it was verified* (what was run, what
  was mutated, what agreed). "Looks right" is not a verification.
- **Must-fix** — each problem with file/line and a concrete fix, ordered by severity. Apply
  the fix in the sandbox and confirm it actually resolves the problem before writing it down —
  a prescribed fix that doesn't apply cleanly, or trades one bug for another, is a finding the
  review owes the author, not a surprise for them to discover later.
- **Go / No-go** — ship as-is, or not, and exactly what blocks.
- **Review limits** — one line on what this specific review did not check (paths not
  exercised, claims taken on the author's word, scope left out). Required even on a clean
  review — "found nothing" and "checked everything" are different claims, and only the second
  one needs evidence.

## What to do with the result

- Apply every must-fix, or log explicitly why a finding was declined — a declined finding
  gets a written reason, never silence.
- If the fixes were substantive (changed code or changed claims), the correction pass itself
  now carries new claims; judge honestly whether it needs its own review. (In practice: a
  correction that only re-pins strings and updates docs usually doesn't; one that changes
  logic usually does.)
- Report the review's catches to the user plainly, including catches against your own work.
  The record of being caught is the evidence that the process works — softening it defeats
  the purpose of running it.
- Never quietly ship over a No-go. Surface it and let the user decide.

## Honest limits

- This buys **derivation independence, not provenance independence**: the reviewer is still a
  language model, differently prompted and routed. It can share blind spots with the author.
  It raises the cost of a wrong claim surviving; it does not make claims unfakeable.
- Reviews are expensive (order of 100k+ tokens, several minutes). The ship-bar exists so the
  cost lands where claims do — resist both skipping it on real claims and burning it on
  trivia.
- A green review is one failed attempt to break the work — not a proof. Treat "confirmed
  accurate" as "survived this attack," and keep the attack honest.
