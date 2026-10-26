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

The pool is an **open pool** with a **launch floor of 300** questions
(10 categories × 30; per category 12 × difficulty 1, 10 × difficulty
2, 8 × difficulty 3). The floor is not a cap: matches draw a seeded
shuffle from however many reviewed questions exist, and the pool
keeps growing as contributions are reviewed in. The review gate is
the binding constraint. Bank format: `next-round.trivia/2`, CC0-1.0,
attribution claims no human attestation (Matthew is the human gate;
review first, attest second).

## Pool status

*As of the seed merge, 2026-10-25: **50 of 300** toward the launch
floor.*

| Category | In pool | Floor | d1 / d2 / d3 |
|----------|--------:|------:|--------------|
| geography | 5 | 30 | 2 / 2 / 1 |
| history | 5 | 30 | 2 / 2 / 1 |
| science-nature | 5 | 30 | 2 / 2 / 1 |
| technology | 5 | 30 | 2 / 2 / 1 |
| arts-literature | 5 | 30 | 2 / 2 / 1 |
| pop-culture | 5 | 30 | 2 / 2 / 1 |
| sports-games | 5 | 30 | 2 / 2 / 1 |
| food-drink | 5 | 30 | 2 / 2 / 1 |
| language-words | 5 | 30 | 2 / 2 / 1 |
| world-everyday | 5 | 30 | 2 / 2 / 1 |
| **Total** | **50** | **300** | **20 / 20 / 10** |

## Contributors

| Contributor | Asked | Slice | Count | Status |
|-------------|-------|-------|------:|--------|
| Larry (Matthew's agent) | 2026-10-25, by Matthew directly in chat (endorsed with the bank design) | All 10 categories, 5 each (id tag `larry`) | 50 | **Received, reviewed, and banked** 2026-10-25 — the seed set; see Received below. |

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

## Notes

- `content/starter.json` (6 questions, format `/1`) is the module's
  original starter bank and a test fixture. It is **not** part of
  this pool and does not count toward the floor.
- Invited ≠ committed: a slice counts as allocated only when a
  contributor accepts it, and as received only when the JSON arrives
  and passes validation.
- Outstanding to the launch floor: 250 questions (25 per category),
  unallocated. The assignment template is
  `docs/question-bank/GENERATION-PROMPT.md`.
