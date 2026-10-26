# Trivia — a Next Round game module

Trivia is a simultaneous-answer quiz game for the
[Next Round](https://github.com/lewismatt/next-round) platform: every
player answers the same question privately before a shared deadline, then
the round reveals and scores together. It is a standalone game module —
this repository is the whole game — designed against the platform's game
SDK (`next-round-game/0.1`).

Trivia was the platform's second game (Sprint T, core PR
[#42](https://github.com/lewismatt/next-round/pull/42), merged 2026-10-24),
built to prove the SDK contract against a second real game with no
contract change. It moved to its own repository on 2026-10-25, following
the Cipher and Golden Ladder pattern; the design record is at
[docs/trivia-design.md](docs/trivia-design.md).

## Rules

- Each round reveals one question to all enabled members at once. Every
  enabled member submits an answer **privately** before a single, stable
  round deadline; until the deadline, each member can see only their own
  submission.
- At the deadline, the round closes, scores the answers, and reveals the
  explanation, the correct choice, and all accepted submissions.
- Settings: `rounds` (1–20, bounded by the eligible pool),
  `secondsPerRound` (1–300), and an optional `category` — when set,
  the match draws only from that category; when absent, the whole
  bank is eligible. Solo supports one player; group supports 2–8.
- Questions arrive as an importable resource bank (CC0-1.0): each
  question has an `id`, a `prompt`, 2–8 distinct `choices`, a
  `correctChoice`, and an `explanation`. At match start the server
  draws the play order by seeded shuffle from the eligible pool and
  stores it in state, so a match never simply plays the bank's first
  questions in order. The bank is server-private — never copied into
  a view — and a match pins one immutable bank version.
- Bank formats: `next-round.trivia/2` is current — every question
  also carries a `category` (one of ten) and a `difficulty` (1–3).
  Format `next-round.trivia/1` banks remain importable, without
  category data.
- `content/starter.json` is the original starter bank: six agent-drafted
  factual questions released under CC0-1.0, with that provenance in its
  `attribution`. No human review/attestation is claimed.
- Leaving never erases an accepted answer or earned score; disabled
  members' obligations are removed without invented answers, and
  all-disabled suspension preserves round progress explicitly. Final
  results carry per-member scores, outcome, eligibility, and public
  attribution, and need no retained bank or submissions.

## Layout

- `src/manifest.ts` — module manifest (modes, capabilities, JSON
  schemas, bank schema)
- `src/types.ts` — settings, state, and view types
- `src/server.ts` — pure rules reducer (`GameServer`): simultaneous
  submissions, round deadlines, reveals, scoring, pause/resume
- `src/content.ts` — question-bank import (`parseTriviaImport`)
- `src/client.ts` — browser client (vanilla DOM over the platform's
  `GameBridge`); it only ever receives the projected view
- `src/content.test.ts` / `src/server.test.ts` — import and rules tests;
  every transition is schema-validated
- `src/bank.test.ts` — production pool gate (the pool parses through
  the importer, and its per-category counts match the ledger)
- `content/bank.json` — the production question pool (format `/2`)
- `content/contributions/` — contribution drop zone and provenance
  record (see its README)
- `content/LEDGER.md` — the question pool contributions ledger
- `content/starter.json` — original CC0-1.0 starter question bank
- `docs/trivia-design.md` — the Sprint T design and evidence record
- `docs/question-bank/` — the question bank brief, the generation
  prompt template, and the generated do-not-duplicate list
- `tools/validate-bank.py` — the question bank validator
- `AGENTS.md` — read-first orientation for agents working in this repo

## Development

The platform packages (`@next-round/contracts`, `@next-round/game-sdk`,
`@next-round/game-client`) live in the core repository and are not
published to a registry. Development links them from a pinned checkout:

```sh
pnpm setup   # clones lewismatt/next-round into .core/ at a pinned ref,
             # installs, and builds the platform packages
pnpm build
pnpm typecheck
pnpm test
```

`CORE_REF` (see `scripts/fetch-core.sh`) pins the platform commit this
module is developed and verified against — currently core `f833971b`,
the commit the module was extracted from. CI does the same.

## Bundling into a Next Round deployment

Per the platform's module model, an operator adds a reviewed package to
the server build registry and redeploys API/web/worker together. The
mechanism is the one verified end-to-end for Cipher (core PR
[#46](https://github.com/lewismatt/next-round/pull/46), CI green on all
jobs, 2026-10-25):

1. **Fetch this repo into the core checkout as a workspace package.** The
   core repo's `scripts/fetch-trivia.sh` clones this repository into
   `games/trivia/` (gitignored) at a pinned commit; the `games/*`
   workspace glob picks it up and `apps/api` / `apps/worker` depend on
   `@next-round/game-trivia` via `workspace:*`, so the monorepo build
   compiles it alongside the platform's own packages and its dependencies
   on `@next-round/contracts` / `game-sdk` / `game-client` resolve to the
   platform's copies. A registry- or git-sourced dependency does **not**
   work: this package ships sources only (no committed `dist/`, no
   `prepare` script) and a platform build never compiles a dependency's
   sources — workspace inclusion is what makes it build. Keep the fetched
   tree byte-identical to the pinned upstream commit.
2. Registration stays in core: `trivia-module.ts` in each app calls
   `registry.register(manifest, server, { clientRoot, isDefault: true })`,
   invoked from API server and worker startup, alongside the
   `install-bundled-games` entry and the web bundle input for
   `games/trivia/0.2.0/client`. The starter bank is imported through
   **Admin → Trivia library**; no bank is embedded in the browser.
3. CI and the deployment image build run the fetch step before
   `pnpm install` / the Docker build.

The core repository intentionally carries no Trivia code; deployments
that don't want the game simply never bundle it.

## Question bank

The production question pool lives at `content/bank.json` (format
`next-round.trivia/2`, CC0-1.0) and currently holds **170 questions**
toward a launch floor of **300** — the floor is a minimum, not a cap:
the pool is an open pool that keeps growing as reviewed contributions
land, and matches draw from however much reviewed depth exists.

Every question belongs to one of ten categories — Geography, History,
Science & Nature, Technology, Arts & Literature, Pop Culture,
Sports & Games, Food & Drink, Language & Words, World & Everyday
Life — and carries a difficulty of 1–3.

To contribute: read `AGENTS.md`, then the brief at
`docs/question-bank/BRIEF.md`. Contributions arrive as one file per
set in `content/contributions/`, pass `tools/validate-bank.py`, and
are merged into the pool only after a full review (fact-check,
answer-key verification, dedupe). Who contributed what, and what
review found, is recorded in `content/LEDGER.md`. Operators handing
the work to an agent can use the copy-paste assignment in
`docs/question-bank/GENERATION-PROMPT.md`.

## License

Apache-2.0. Question banks imported as resources carry their own license
(the format requires CC0-1.0).
