<!-- SPDX-License-Identifier: Apache-2.0 -->

# Contributions drop zone

This directory is where question-bank contributions land **before**
review. One file per contribution, named `<tag>-<count>.json`, in the
bank shape of format `next-round.trivia/2` (see
`docs/question-bank/BRIEF.md` for the full authoring spec and
`docs/question-bank/GENERATION-PROMPT.md` for the assignment template
that produces these files).

Rules:

- **One file per contribution.** Never bundle two deliveries into one
  file, and never append to another contributor's file.
- **Never edit `content/bank.json` from here.** The pool is changed
  only by a reviewer merging a reviewed contribution.
- A contribution file stays in this directory permanently after it is
  banked: it is the provenance record for its questions. The pool and
  the contribution file intentionally contain the same questions.
- If a review sends a set back, the contributor delivers a corrected
  replacement file (same name); the reviewer records what changed in
  `content/LEDGER.md`.

What happens after delivery:

1. The validator runs (`tools/validate-bank.py`, also in CI) —
   a failing set is not reviewed until it passes.
2. The reviewer fact-checks every question, verifies each
   `correctChoice` against its explanation, dedupes against the
   pool, and judges category/difficulty placement.
3. Accepted questions are merged into `content/bank.json` (ids are
   never renumbered), the disposition is recorded in
   `content/LEDGER.md`, and `docs/question-bank/DO-NOT-DUPLICATE.md`
   is regenerated from the new pool.
