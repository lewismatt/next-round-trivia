<!-- SPDX-License-Identifier: Apache-2.0 -->

# Working in this repository — read this first

This repo is **Trivia**, a game module for the Next Round platform
(`@next-round/game-trivia`, currently 0.2.0). It contains two kinds of
work: the game module code (`src/`) and the question bank
(`content/`). Most agent visits here are for the question bank.

## If you were told to generate trivia questions

That is a **question-bank contribution**. Do exactly this, in order:

1. Read `docs/question-bank/BRIEF.md` — the full authoring spec
   (format, categories, difficulty bands, hard rules). It governs;
   this file only points at it.
2. Read `docs/question-bank/DO-NOT-DUPLICATE.md` — every fact already
   in the pool. Your questions must not repeat any of them.
3. Write your set as **one new file** in `content/contributions/`,
   named `<your-tag>-<count>.json`, in the bank shape described in the
   brief (format `next-round.trivia/2`). Your tag is part of every
   question id: `<category-code>-<slug>-<your-tag>`.
4. Run the validator and make it pass before you report back:
   `python3 tools/validate-bank.py content/contributions/<your-tag>-<count>.json content/bank.json`
5. Report: the file path, the question count, your per-category and
   per-difficulty counts, and the validator's RESULT line.

**Never edit `content/bank.json` directly.** The pool changes only
when a reviewer merges a reviewed contribution into it. Never edit
another contributor's file in `content/contributions/`. Never renumber
or re-id a question that is already in the pool.

### The flow, end to end

```
generate → contribution file in content/contributions/
         → validator PASS (you run it)
         → reviewer review: full fact-check, answer-key verification
           (correctChoice must name the choice the explanation proves),
           dedupe against the pool, difficulty/category judgement
         → reviewer merges the set into content/bank.json, updates
           content/LEDGER.md, regenerates DO-NOT-DUPLICATE.md
         → publish to git with CI green
```

The review gate is the binding constraint on pool growth, not
generation speed. A set the reviewer cannot verify does not land.

### Hard rules (summary — the brief is authoritative)

- Original questions only; verifiable in standard references;
  timeless (no current office-holders, current events, or recent
  seasons — the bank must still be correct in ten years).
- Exactly 4 distinct choices, exactly 1 correct; choices similar in
  length and style; no "All of the above" / "None of the above".
- An explanation (1–2 sentences) on every question.
- Answer key balanced within your set: no `correctChoice` position
  over ~40% of a category group.
- Questions are CC0-1.0 with the standard attribution line claiming
  **no human attestation** (see the brief's rights note).

## Module code basics

The platform packages are not on a registry; they are linked from a
pinned core checkout in `.core/`:

```sh
pnpm setup     # fetch pinned core, install, build platform packages
pnpm build
pnpm typecheck
pnpm test
```

- Bank format is `next-round.trivia/2` (category + difficulty per
  question). Format `/1` banks remain importable for compatibility;
  do not add new `/1` content.
- A match draws its questions by seeded shuffle from the eligible
  pool (optionally one category) at start; the draw is stored in
  state. Do not reintroduce in-order play.
- `content/starter.json` is the original `/1` fixture bank. Leave it
  untouched; its import identity is pinned by test.

## Publishing note

`content/bank.json` is a game resource: it is imported into a Next
Round deployment through the module's importer, never embedded in
code or the browser bundle. Publish repo changes only as complete,
CI-green states — a red bank validation step in CI means the pool
file or a contribution file is malformed.
