// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { parseJsonSchemaValue, type Json } from "@next-round/contracts";
import {
  ResourceImportError,
  type ImportResourceResult,
} from "@next-round/game-sdk";
import { triviaBankSchema, triviaBankSchemaV2 } from "./manifest.js";
import type { TriviaBank, TriviaQuestionV2 } from "./types.js";

function buildResult(bank: TriviaBank, canonical: TriviaBank): ImportResourceResult {
  const ids = new Set<string>();
  for (const question of bank.questions) {
    if (
      ids.has(question.id) ||
      question.correctChoice >= question.choices.length
    ) {
      throw new ResourceImportError([
        "Question IDs must be unique and correct choices must name an available choice.",
      ]);
    }
    ids.add(question.id);
  }
  return {
    identity: createHash("sha256")
      .update(JSON.stringify(canonical))
      .digest("hex"),
    data: canonical,
    metadata: {
      title: bank.title,
      questionCount: bank.questions.length,
      rights: {
        license: bank.license,
        sourceUrl: null,
        attribution: bank.attribution,
        permissionNote: null,
      },
    },
    importerFacts: [],
  };
}

/** Server-only import. Canonical field order pins every question and its rights. */
export function parseTriviaImport(input: Json): ImportResourceResult {
  const format =
    input && typeof input === "object" && !Array.isArray(input)
      ? (input as { format?: unknown }).format
      : undefined;
  if (format === "next-round.trivia/2") return parseTriviaImportV2(input);
  try {
    parseJsonSchemaValue(triviaBankSchema, input);
  } catch {
    throw new ResourceImportError([
      "Use a next-round.trivia/1 CC0 bank with complete questions and 2–8 distinct choices.",
    ]);
  }
  const bank = input as TriviaBank;
  const canonical: TriviaBank = {
    format: bank.format,
    title: bank.title,
    attribution: bank.attribution,
    license: bank.license,
    questions: bank.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: [...q.choices],
      correctChoice: q.correctChoice,
      explanation: q.explanation,
    })),
  };
  return buildResult(bank, canonical);
}

/** Format /2 import: every question also carries a category and a
 * difficulty (1–3), pinned into the canonical form after explanation. */
function parseTriviaImportV2(input: Json): ImportResourceResult {
  try {
    parseJsonSchemaValue(triviaBankSchemaV2, input);
  } catch {
    throw new ResourceImportError([
      "Use a next-round.trivia/2 CC0 bank with complete questions, a known category and a difficulty of 1–3 on every question, and 2–8 distinct choices.",
    ]);
  }
  const bank = input as TriviaBank;
  const canonical: TriviaBank = {
    format: bank.format,
    title: bank.title,
    attribution: bank.attribution,
    license: bank.license,
    questions: bank.questions.map((q) => {
      const v2 = q as TriviaQuestionV2;
      return {
        id: v2.id,
        prompt: v2.prompt,
        choices: [...v2.choices],
        correctChoice: v2.correctChoice,
        explanation: v2.explanation,
        category: v2.category,
        difficulty: v2.difficulty,
      };
    }),
  };
  return buildResult(bank, canonical);
}
