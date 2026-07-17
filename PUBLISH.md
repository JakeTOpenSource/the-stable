# Publishing this repo — the by-the-book procedure

This repo is built to be published *deterministically*: every empirical claim in it is
reproduced by scripts a stranger can run (`FINDINGS.md` → "Reproduce everything"), so the
transfer's accuracy does not depend on trusting the transfer. Provenance lives in the
**tree** (ledgers, decision logs, gate-checked replays), not in git archaeology — which is
what makes the clean-genesis step below cost nothing scientifically.

## Gates that must be green before any push

1. **The custody gate** (`node stable-gate.js`) — every machine self-test, the clamp, the
   replication verdict, and the publication-hygiene sweep (no absolute machine paths, no
   user-directory strings, no e-mail addresses anywhere in the tracked tree).
2. **The local publication privacy gate** (wired into this repo's pre-push hook; it lives
   outside the repo on purpose — its word list names private things, so it must never sit
   in a publishable tree). It sweeps the tree, the file names, and **every blob in the full
   git history**, and prints the author/committer identity surface for review. A clean tree
   over a leaking history still leaks; the gate blocks the push until the history is clean.

Both gates fail closed. The push simply will not leave the machine while either is red.

## Clean genesis (why and how)

The development history of this repo predates the hygiene sweep and contains local machine
paths in early commits. History rewriting is error-prone; the honest, deterministic
alternative is a **clean genesis**: publish the verified tree as a single initial commit.
Nothing scientific is lost — every experiment's data, pre-registration, decision logs, and
machine-checked replay are files *in* the tree.

```sh
# from the repo root, with all gates green:
git checkout --orphan public-main
git add -A
git commit -m "The Stable — public genesis (verified tree; see FINDINGS.md)"
git branch -M public-main main-public          # keep local main untouched
git remote add origin <your-new-github-repo-url>
git push origin main-public:main               # pre-push hooks run both gates here
```

Keep the private development branch local. From the genesis forward, publish with normal
incremental commits — and commit pre-registrations **before** their experiments run, so the
registration's commit hash predates the data (adopted practice; see
`experiments/replication-2026-07-17/PREREGISTRATION.md`).

## Identity choices (deliberate, not accidental)

- Commits carry the author identity configured in git. If you prefer not to expose a
  personal e-mail, set GitHub's **noreply** address before the genesis commit:
  `git config user.email "<id>+<username>@users.noreply.github.com"`.
- First-name design credits in the docs are intentional (open-source-with-credit).
- Model co-authorship lines are intentional credit, not tooling leakage.

## After the push — bracket the deploy

A green push proves the source left correctly; it does not prove the transfer carried it.
From a **fresh clone on any machine**:

```sh
git clone <url> && cd <repo>
node stable-gate.js          # must print GREEN with all checks holding
node bridge/replay-replication.js
```

If the fresh clone's gates are green, the published repo carries the full verified state —
custody, claims, and verdicts included — with no reference to any private system.

## Inviting stress testers

Point newcomers at `FINDINGS.md` (what is claimed, at what n, with what limits) and
`witness-suite/SPEC-B-holdout.md` (the advertised open problem: the held-out certification
roster that would certify the current balance tuning against players it was never fit to).
Issues that break a claim are *findings* — the highest-value contribution this project
recognizes.
