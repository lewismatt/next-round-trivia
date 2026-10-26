<!-- SPDX-License-Identifier: Apache-2.0 -->

# Trivia — Question Pool Contributions Ledger

*Opened 2026-10-25. This ledger is the single coordination point for
the Trivia question pool — who contributed what, what review found,
and what is in the bank — so slices never collide and nothing is
double-counted. The authoring spec is `docs/question-bank/BRIEF.md`;
the pool file is `content/bank.json`.*

## How entries work

- **Statuses:** Asked → Received → Reviewed → **Banked** (merged
  into the pool), with any of: corrections made in review, questions
  held as reviewed spares, questions excluded (with the reason).
- A contribution counts as received only when its JSON arrives in
  `content/contributions/` and passes the validator.
- The reviewer (currently Larry) fact-checks every question,
  verifies every `correctChoice` against its explanation, dedupes
  against the pool, and records the disposition here. Ids are never
  renumbered on merge.

## Pool model

The pool is an **open pool with no size cap and no completion
target** (Matthew's ruling, 2026-10-26; the original 300-question
launch floor was a bootstrap goal and is now historical). Matches
draw a seeded shuffle from however many reviewed questions exist,
and the pool keeps growing as contributions are reviewed in — no
category ever fills up or closes. The review gate is the binding
constraint. Bank format: `next-round.trivia/2`, CC0-1.0, attribution
claims no human attestation (Matthew is the human gate; review
first, attest second).

## Pool status

*As of the grok merge, 2026-10-26: **170 questions** in the pool.*

| Category | In pool | d1 / d2 / d3 |
|----------|--------:|--------------|
| geography | 35 | 14 / 13 / 8 |
| history | 15 | 6 / 6 / 3 |
| science-nature | 15 | 6 / 6 / 3 |
| technology | 15 | 6 / 6 / 3 |
| arts-literature | 15 | 6 / 6 / 3 |
| pop-culture | 15 | 6 / 6 / 3 |
| sports-games | 15 | 6 / 6 / 3 |
| food-drink | 15 | 6 / 6 / 3 |
| language-words | 15 | 6 / 6 / 3 |
| world-everyday | 15 | 6 / 6 / 3 |
| **Total** | **170** | **68 / 67 / 35** |

## Contributors

| Contributor | Asked | Slice | Count | Status |
|-------------|-------|-------|------:|--------|
| Larry (Matthew's agent) | 2026-10-25, by Matthew directly in chat (endorsed with the bank design) | All 10 categories, 5 each (id tag `larry`) | 50 | **Received, reviewed, and banked** 2026-10-25 — the seed set; see Received below. |
| antigravity | 2026-10-25, via the generation prompt Larry drafted for Matthew (geography slice) | Geography, 20 (id tag `antigravity`) | 20 | **Received, reviewed, and banked** 2026-10-25 — see Received below. |
| Grok | 2026-10-26, delivered as trivia-repo PR #1 at Matthew's direction | All 10 categories, 10 each (id tag `grok`) | 100 | **Received, reviewed, and banked** 2026-10-26, with one correction in review — see Received below. |

## Received

- **Larry — 50 questions, 2026-10-25 (the seed set):**
  `content/contributions/larry-50.json` (all 10 categories × 5; per
  category 2 × difficulty 1, 2 × difficulty 2, 1 × difficulty 3;
  ids `<category>-<slug>-larry`). This set is the worked example for
  the flow documented in `AGENTS.md` and the brief: authored to the
  brief, delivered as a contribution file, validated, reviewed, then
  merged — not written into the bank directly. Validator: PASS,
  0 warnings (overall answer key 12/13/13/12 across positions 0–3;
  no category position over 40%; cross-check against the merged bank
  clean). Answer key was balanced by construction and verified by
  the validator. Fact-check: the author checked every answer against
  standard-reference knowledge at writing time (including the traps
  done deliberately: largest *hot* desert vs Antarctica overall;
  Sudan vs Algeria after South Sudan's independence; Elvis as the
  King of Rock and Roll beside Jackson as King of Pop; the metre
  vs the kilometre in the 1790s definition). Larry is both author
  and first reviewer for the seed, so an independent re-check of a
  sample is welcome before the bank is finalised — the same caveat
  recorded for the Golden Ladder seed set. **Merged into
  `content/bank.json` 2026-10-25 (pool 0 → 50); do-not-duplicate
  list regenerated (50 facts).**

- **antigravity — 20 questions, 2026-10-25:**
  `content/contributions/antigravity-20.json` (geography × 20;
  8 × difficulty 1, 7 × difficulty 2, 5 × difficulty 3; ids
  `geography-<slug>-antigravity`). The set was pushed directly to
  the repository (commit `681fd922`, by the contributor's bot
  account) rather than returned as a file — the contribution landed
  in the drop zone in the correct shape and nothing entered the
  bank unreviewed. Review by Larry: validator PASS, 0 warnings
  (answer key a perfect 5/5/5/5 across positions 0–3); all 20
  questions fact-checked — 0 factual errors, 0 `correctChoice`
  index errors, no duplicates against the pool, no two-answer
  traps (the Angel Falls prompt's "terrestrial" qualifier and the
  Iberian Peninsula's "nearly all" were checked explicitly);
  difficulty placement honest. **All 20 banked with no corrections,
  2026-10-25 (pool 50 → 70; geography 5 → 25); do-not-duplicate
  list regenerated (70 facts).** Note: the same commit also amended
  `AGENTS.md` and `docs/question-bank/BRIEF.md` with self-review
  guidance (verify the key against the explanation, strip giveaway
  hints, qualify superlatives, vary question templates, ask for the
  contributor tag if the prompt carries a placeholder). The
  guidance's substance was reviewed and is sound; Matthew ruled
  2026-10-25 that the edits stand. For the record: process and spec
  changes should normally arrive as a proposal for the reviewer,
  not bundled into a contribution push — future generation prompts
  will say so explicitly.

- **Grok — 100 questions, 2026-10-26:**
  `content/contributions/grok-100.json` (all 10 categories × 10;
  per category 4 × difficulty 1, 4 × difficulty 2, 2 × difficulty
  3; ids `<category>-<slug>-grok`), delivered as PR #1 in this
  repository, merged as `9a2fa566` with the bank merge expressly
  left to review. Review by Larry (four independent chunk passes
  plus adjudication): validator PASS, 0 warnings (set answer key
  30/30/20/20); all 100 questions fact-checked — 99 clean as
  received (0 factual errors, 0 index errors, no duplicates
  against the pool or within the set, no false side claims in
  explanations; difficulty placement honest). **One correction in
  review:** `history-hannibal-punic-crossing-grok` listed
  "Hasdrubal Barca" as a distractor, but Hasdrubal also crossed
  the Alps with elephants, in 207 BCE during the same war — a
  genuine two-answer trap. The banked copy replaces that choice
  with "Hamilcar Barca" (Hannibal's father; First Punic War, never
  crossed the Alps); the keyed answer, its position, and the
  explanation are unchanged. The correction is applied to both the
  contribution file and the banked copy, so the validator's
  provenance-identity rule (contribution and bank copies of an id
  must be identical) still holds; the as-received original remains
  in git history at `9a2fa566` (PR #1). **All 100 banked 2026-10-26
  (pool 70 → 170; geography 25 → 35; every other category 5 → 15);
  do-not-duplicate list regenerated (170 facts).**

## Notes

- `content/starter.json` (6 questions, format `/1`) is the module's
  original starter bank and a test fixture. It is **not** part of
  this pool and does not count toward its size.
- Invited ≠ committed: a slice counts as allocated only when a
  contributor accepts it, and as received only when the JSON arrives
  and passes validation.
- Pool growth is open-ended (Matthew, 2026-10-26): there is no
  outstanding quota and no category ever closes. For balance, the
  nine non-geography categories (15 each) are the thin side versus
  geography (35), so new slices should favor them — but any
  category may be contributed at any time, in any quantity. The
  assignment template is `docs/question-bank/GENERATION-PROMPT.md`.
