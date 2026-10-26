<!-- SPDX-License-Identifier: Apache-2.0 -->

# Trivia Question Generation — Prompt Template

*For the operator: copy everything inside the fence, fill the four
slots, and hand it to any agent with access to this repository. The
agent needs no other context — the repository tells it the rest.*

```
You are contributing questions to the Trivia question bank in this
repository (a Next Round game module). Work only in this repo.

ASSIGNMENT
- Category slice: {CATEGORY}  (one category code, or the list you are given)
- Difficulty mix: {DIFFICULTY_MIX}  (e.g. "per category: 2 x difficulty 1, 2 x difficulty 2, 1 x difficulty 3")
- Count: {COUNT} questions total
- Your contributor tag: {TAG}

BEFORE YOU WRITE ANYTHING
1. Read AGENTS.md at the repository root.
2. Read docs/question-bank/BRIEF.md in full — it is the governing
   spec: format, category scopes, difficulty bands, hard rules.
3. Read docs/question-bank/DO-NOT-DUPLICATE.md — every fact already
   in the pool. None of your questions may repeat one of those facts,
   even reworded.

DELIVERABLE — exactly one new file
- Path: content/contributions/{TAG}-{COUNT}.json
- Shape: a bank file in format "next-round.trivia/2" (see the worked
  example in the brief): top-level format, title
  "Trivia contribution — {TAG}", the standard attribution line from
  the brief, license "CC0-1.0", and your questions array.
- Every question: id "{category-code}-{slug}-{TAG}" (lowercase
  kebab-case), prompt, exactly 4 distinct choices, correctChoice
  (0-3), explanation (1-2 sentences), category, difficulty (1-3).
- Original questions only. Verifiable in standard references.
  Timeless — nothing that expires. The explanation must prove the
  same answer correctChoice names. Balance your answer key: no
  correctChoice position over ~40% within a category.

VALIDATE BEFORE YOU REPORT
Run:  python3 tools/validate-bank.py content/contributions/{TAG}-{COUNT}.json content/bank.json
Fix everything it flags and re-run until the RESULT line says PASS.

DO NOT
- Do not edit content/bank.json, content/LEDGER.md, or
  docs/question-bank/DO-NOT-DUPLICATE.md — merging, ledger entries,
  and list regeneration are the reviewer's steps.
- Do not edit or delete anyone else's file in content/contributions/.
- Do not publish or push anything anywhere.

REPORT BACK
The file path, your question count, per-category and per-difficulty
counts, and the validator's RESULT line, verbatim.
```
