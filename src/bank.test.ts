// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTriviaImport } from "./content.js";
import {
  TRIVIA_CATEGORY_CODES,
  type TriviaBank,
  type TriviaCategory,
} from "./types.js";

/**
 * The production pool gate. content/LEDGER.md ("Pool status") is the
 * human record; this table is its machine-checked mirror — when a
 * reviewed contribution is merged, update both together.
 */
const LEDGER_POOL: Record<TriviaCategory, number> = {
  geography: 25,
  history: 5,
  "science-nature": 5,
  technology: 5,
  "arts-literature": 5,
  "pop-culture": 5,
  "sports-games": 5,
  "food-drink": 5,
  "language-words": 5,
  "world-everyday": 5,
};

const pool = JSON.parse(
  readFileSync(new URL("../content/bank.json", import.meta.url), "utf8"),
) as TriviaBank;

describe("production question pool (content/bank.json)", () => {
  it("parses through the module importer as a /2 bank", () => {
    expect(pool.format).toBe("next-round.trivia/2");
    const imported = parseTriviaImport(pool);
    const metadata = imported.metadata as {
      questionCount: number;
      rights: { license: string };
    };
    expect(metadata.questionCount).toBe(pool.questions.length);
    expect(metadata.rights.license).toBe("CC0-1.0");
  });

  it("categorizes every question and matches the ledger's pool status", () => {
    const counts = Object.fromEntries(
      TRIVIA_CATEGORY_CODES.map((code) => [code, 0]),
    ) as Record<TriviaCategory, number>;
    for (const q of pool.questions) {
      const v2 = q as { category?: TriviaCategory; difficulty?: number };
      expect(v2.category, `question ${q.id} has a category`).toBeDefined();
      expect(
        TRIVIA_CATEGORY_CODES,
        `question ${q.id} category is a known code`,
      ).toContain(v2.category);
      expect(
        Number.isInteger(v2.difficulty) &&
          v2.difficulty! >= 1 &&
          v2.difficulty! <= 3,
        `question ${q.id} difficulty is 1-3`,
      ).toBe(true);
      counts[v2.category!] += 1;
    }
    expect(counts).toEqual(LEDGER_POOL);
    expect(pool.questions.length).toBe(
      Object.values(LEDGER_POOL).reduce((a, b) => a + b, 0),
    );
  });
});
