// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Json } from "@next-round/contracts";
import { ResourceImportError } from "@next-round/game-sdk";
import { parseTriviaImport } from "./content.js";
import type { TriviaBank, TriviaQuestionV2 } from "./types.js";

const bank: TriviaBank = {
  format: "next-round.trivia/1",
  title: "Private bank",
  attribution: "Original test fixture",
  license: "CC0-1.0",
  questions: [
    {
      id: "one",
      prompt: "First?",
      choices: ["A", "B"],
      correctChoice: 1,
      explanation: "Private explanation",
    },
  ],
};

describe("trivia import identity and privacy", () => {
  it("pins every content/rights field independent of JSON property ordering", () => {
    const original = parseTriviaImport(bank);
    expect(
      parseTriviaImport({
        questions: bank.questions,
        license: bank.license,
        attribution: bank.attribution,
        title: bank.title,
        format: bank.format,
      }).identity,
    ).toBe(original.identity);
    for (const change of [
      { ...bank, title: "Different title" },
      { ...bank, attribution: "Other author" },
      ...["prompt", "explanation", "id"].map((field) => ({
        ...bank,
        questions: [{ ...bank.questions[0], [field]: "Changed" }],
      })),
      { ...bank, questions: [{ ...bank.questions[0], choices: ["B", "A"] }] },
      { ...bank, questions: [{ ...bank.questions[0], correctChoice: 0 }] },
    ])
      expect(parseTriviaImport(change).identity).not.toBe(original.identity);
    expect(original.metadata).toEqual({
      title: bank.title,
      questionCount: 1,
      rights: {
        license: "CC0-1.0",
        sourceUrl: null,
        attribution: bank.attribution,
        permissionNote: null,
      },
    });
  });

  it("rejects malformed banks and unknown fields without exposing submitted secrets", () => {
    for (const invalid of [
      null,
      { ...bank, questions: [null] },
      { ...bank, questions: [bank.questions[0], bank.questions[0]] },
      { ...bank, questions: [{ ...bank.questions[0], correctChoice: 2 }] },
      { ...bank, questions: [{ ...bank.questions[0], choices: ["A", "A"] }] },
      { ...bank, license: "unreviewed-secret" },
      { ...bank, hidden: "unreviewed-secret" },
    ]) {
      expect(() => parseTriviaImport(invalid)).toThrow(ResourceImportError);
      try {
        parseTriviaImport(invalid);
      } catch (error) {
        expect(JSON.stringify(error)).not.toContain("unreviewed-secret");
        expect(JSON.stringify(error)).not.toContain("Private explanation");
      }
    }
  });

  it("keeps the starter bank identity pinned (format /1 regression)", () => {
    const starter = JSON.parse(
      readFileSync(
        new URL("../content/starter.json", import.meta.url),
        "utf8",
      ),
    ) as TriviaBank;
    // Computed with the 0.1.0 canonicalization; the /1 path must not move.
    expect(parseTriviaImport(starter).identity).toBe(
      "a3f82d769f97e0e1ab178f89af96679ab3fb18f493fbd7573ebe1e839231dbbb",
    );
  });
});

const questionV2: TriviaQuestionV2 = {
  id: "geography-capital-of-france-test",
  prompt: "What is the capital of France?",
  choices: ["London", "Paris", "Rome", "Madrid"],
  correctChoice: 1,
  explanation: "Paris is the capital of France.",
  category: "geography",
  difficulty: 1,
};

const bankV2: TriviaBank = {
  format: "next-round.trivia/2",
  title: "Categorized bank",
  attribution: "Original test fixture",
  license: "CC0-1.0",
  questions: [questionV2],
};

describe("trivia format /2 import", () => {
  it("imports a categorized bank and pins category/difficulty into the identity", () => {
    const original = parseTriviaImport(bankV2);
    expect(
      parseTriviaImport({
        questions: [
          {
            difficulty: questionV2.difficulty,
            category: questionV2.category,
            explanation: questionV2.explanation,
            correctChoice: questionV2.correctChoice,
            choices: questionV2.choices,
            prompt: questionV2.prompt,
            id: questionV2.id,
          },
        ],
        license: bankV2.license,
        attribution: bankV2.attribution,
        title: bankV2.title,
        format: bankV2.format,
      }).identity,
    ).toBe(original.identity);
    expect((original.data as TriviaBank).questions[0]).toMatchObject({
      category: "geography",
      difficulty: 1,
    });
    for (const change of [
      {
        ...bankV2,
        questions: [{ ...bankV2.questions[0], category: "history" }],
      },
      {
        ...bankV2,
        questions: [{ ...bankV2.questions[0], difficulty: 2 }],
      },
    ])
      expect(parseTriviaImport(change).identity).not.toBe(original.identity);
  });

  it("rejects /2 banks with missing, unknown, or out-of-range category data", () => {
    const q = questionV2;
    const without = (field: string) => {
      const copy: Record<string, Json> = { ...q };
      delete copy[field];
      return { ...bankV2, questions: [copy] };
    };
    for (const invalid of [
      without("category"),
      without("difficulty"),
      { ...bankV2, questions: [{ ...q, category: "astrology" }] },
      { ...bankV2, questions: [{ ...q, difficulty: 0 }] },
      { ...bankV2, questions: [{ ...q, difficulty: 4 }] },
      { ...bankV2, questions: [{ ...q, difficulty: 1.5 }] },
      { ...bankV2, format: "next-round.trivia/3" },
      // A /1-shaped question inside a /2 bank is missing its category data.
      {
        ...bankV2,
        questions: [
          {
            id: q.id,
            prompt: q.prompt,
            choices: q.choices,
            correctChoice: q.correctChoice,
            explanation: q.explanation,
          },
        ],
      },
      // A /2 question inside a /1 bank is an unknown field there.
      { ...bank, questions: [{ ...bank.questions[0], category: "geography", difficulty: 1 }] },
    ]) {
      expect(() => parseTriviaImport(invalid)).toThrow(ResourceImportError);
    }
  });
});
