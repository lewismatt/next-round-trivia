<!-- SPDX-License-Identifier: Apache-2.0 -->

# Trivia — Question Bank Brief (for the generating agents)

*Issued 2026-10-25. This is the standalone spec for the production
question bank for **Trivia**, a Next Round game module. The module
ships the import contract (format `next-round.trivia/2`); this bank is
the shared pool that matches draw from.*

***Pool model (ruled by Matthew, 2026-10-26):** the bank is an open
pool with **no size cap and no completion target**. It launched with
a 300-question floor as a bootstrap goal; that figure is now
historical. Matches draw a seeded shuffle from however many reviewed
questions exist, and the pool keeps growing for as long as quality
contributions keep arriving — there is no number at which generation
stops, and no category ever fills up or closes. Balance across
categories is a soft aim: prefer the thinner categories when you
have a choice (current counts live in `content/LEDGER.md`, "Pool
status"), never an allocation or a quota. The binding constraint is
the review gate, not any count.*

## The deliverable

One JSON file per contribution, in bank shape, format
`next-round.trivia/2`:

```json
{
  "format": "next-round.trivia/2",
  "title": "Trivia contribution — <your-tag>",
  "attribution": "Original agent-drafted questions for Next Round, released under CC0-1.0; no human attestation claimed.",
  "license": "CC0-1.0",
  "questions": [
    {
      "id": "geography-capital-of-australia-<your-tag>",
      "prompt": "What is the capital city of Australia?",
      "choices": ["Sydney", "Canberra", "Melbourne", "Perth"],
      "correctChoice": 1,
      "explanation": "Canberra has been Australia's capital since 1913; Sydney is its largest city but not its capital.",
      "category": "geography",
      "difficulty": 1
    }
  ]
}
```

(The example above is illustrative of the shape only.)

A contribution is delivered as a new file in
`content/contributions/`, named `<your-tag>-<count>.json`. You will be
told your tag, your category slice, your difficulty mix, and your
count when you are given the task — the copy-paste version of those
instructions is `docs/question-bank/GENERATION-PROMPT.md`.

## Categories

Every question carries exactly one category. The ten, with scope:

| Code | Name | Scope |
|------|------|-------|
| `geography` | Geography | Places, capitals, rivers, mountains, borders, maps |
| `history` | History | Events, people, and states of the past; settled history only |
| `science-nature` | Science & Nature | Physics, chemistry, biology, earth science, animals, plants |
| `technology` | Technology | Computing, inventions, engineering, the internet |
| `arts-literature` | Arts & Literature | Books, authors, painting, sculpture, classical music, theatre |
| `pop-culture` | Pop Culture | Film, popular music, television — settled classics, not the moment |
| `sports-games` | Sports & Games | Sports rules, records and history; board and card games |
| `food-drink` | Food & Drink | Dishes, ingredients, cooking, drinks and their origins |
| `language-words` | Language & Words | Vocabulary, grammar, phrases, languages of the world |
| `world-everyday` | World & Everyday Life | Everyday knowledge, customs, measures, time, the built world |

If a question fits two categories, file it under the one a player
would expect from the prompt's subject, and note the alternative in
your delivery message if it matters.

## Counts and balance

There is no required total — not per set, not per category, not for
the pool. Sets of any size are welcome (recent sets run 20–100
questions). Within each category group in your set, aim for a
difficulty spread near **40% difficulty 1, 40% difficulty 2, 20%
difficulty 3** unless your assignment says otherwise; that ratio
keeps the drawn mix playable at every level. If your assignment does
not fix the categories, check the pool status in
`content/LEDGER.md` and favor the categories with the fewest
questions — depth there helps balance most.

Coordination rule: ids end with your contributor tag
(`…-<your-tag>`), so two contributors working different slices can
never collide on ids, and the reviewer can always tell whose set a
question came from.

## Difficulty guidance

- **Difficulty 1 — common knowledge.** Capitals of major countries,
  everyday science, famous landmarks, simple facts nearly anyone
  knows. Wrong choices should still be plausible.
- **Difficulty 2 — solid general knowledge.** Most adults get some
  wrong: lesser-known capitals, school-plus science and history,
  classic books and films, standard sports and language facts.
- **Difficulty 3 — expert, but fair.** Specialist-leaning: every fact
  must still be verifiable in a standard reference work, and the
  distractors must be close enough that guessing is genuinely
  tempting. Obscure is fine; trick, disputed, or unverifiable is not.

## Hard rules

1. **Original only.** Write every question yourself. Do NOT copy
   questions from published question books, trivia websites, quiz
   shows, or any existing question bank.
2. **Exactly 4 choices, exactly 1 correct.** Choices distinct,
   similar in length and style (don't make the correct answer the
   obviously longest one), no "All of the above" / "None of the
   above".
3. **Balance the answer key.** Within each category group in your
   set, `correctChoice` should be spread across 0–3 with no position
   over ~40%. A set where the answer is usually B is a broken set.
4. **Verifiable facts only.** Every correct answer must be checkable
   in a standard reference (encyclopedia, atlas, official record). No
   opinions, no "which is best", no disputed claims stated as
   settled. **The explanation must prove the same answer
   `correctChoice` names** — a mismatch between the two is the most
   common defect found in review.
5. **Timeless.** No current office-holders, no "as of this year", no
   sports results from the last few seasons, no pop-culture of the
   moment. The bank should still be correct in ten years.
6. **Explanation on every question:** 1–2 sentences confirming the
   answer and, where useful, why the tempting wrong choice is wrong.
7. **Ids:** unique across the whole pool, lowercase kebab-case,
   shaped `<category-code>-<slug>-<your-tag>` — the id starts with
   the question's own category code and ends with your tag.
8. **Prompts:** a single clear question, max ~200 characters. No
   multi-part questions; negatives ("Which of these is NOT…") only
   sparingly, at difficulty 2–3, and only when unambiguous.

## The contribution flow

1. Read this brief and `docs/question-bank/DO-NOT-DUPLICATE.md`.
2. Write your set as one new file in `content/contributions/`,
   named `<your-tag>-<count>.json`.
3. Run the validator until it passes:
   `python3 tools/validate-bank.py content/contributions/<your-tag>-<count>.json content/bank.json`
4. Report the file, your counts, and the validator's RESULT line.
5. A reviewer then fact-checks the whole set, verifies every answer
   key against its explanation, dedupes against the pool, and judges
   category/difficulty placement. Only reviewed questions are merged
   into `content/bank.json`; the merge, the ledger entry in
   `content/LEDGER.md`, and a regenerated do-not-duplicate list are
   the reviewer's steps, not yours.

## Validation checklist (run before delivery)

- Parses against the module's bank schema (`next-round.trivia/2`,
  CC0-1.0) — the validator checks the same field sets the importer's
  schema enforces.
- Every id unique against the pool and within your set; every id
  starts with its question's category code and ends with your tag.
- Every `correctChoice` in 0–3, and — checked by reading, not by the
  script — it names the choice the explanation proves correct.
- Answer-key balance per category group is roughly even (no position
  over ~40%).
- No fact repeated from `DO-NOT-DUPLICATE.md`, and no near-duplicate
  within your own set: the same fact asked twice (e.g. two "capital
  of X" in one category) counts as a duplicate — vary it or move on.
  Likewise, avoid repeating the same question template across a slice
  (e.g. multiple "Which strait separates X from Y?" questions).
- Prompts contain no unintended regional/linguistic giveaways,
  superlatives are properly qualified, and all 4 choices match in
  article usage and grammatical form.
- Difficulty honestly placed: a difficulty-3 question a strong player
  answers instantly is a difficulty 1 wearing a costume.

## Rights note

Questions are released **CC0-1.0** as part of the bank file. The
attribution line above is the honest one — agent-drafted, no human
attestation claimed — until Matthew reviews the bank, at which point
he decides whether the claim changes (review first, attest second,
never the reverse).
