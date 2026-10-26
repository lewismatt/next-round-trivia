// SPDX-License-Identifier: Apache-2.0
import type { Json } from "@next-round/contracts";

/** The ten question categories (format next-round.trivia/2). Codes are the
 * wire values stored in banks and settings; values are display names. */
export const TRIVIA_CATEGORIES = {
  geography: "Geography",
  history: "History",
  "science-nature": "Science & Nature",
  technology: "Technology",
  "arts-literature": "Arts & Literature",
  "pop-culture": "Pop Culture",
  "sports-games": "Sports & Games",
  "food-drink": "Food & Drink",
  "language-words": "Language & Words",
  "world-everyday": "World & Everyday Life",
} as const;

export type TriviaCategory = keyof typeof TRIVIA_CATEGORIES;

export const TRIVIA_CATEGORY_CODES = Object.keys(
  TRIVIA_CATEGORIES,
) as TriviaCategory[];

export interface TriviaSettings {
  rounds: number;
  secondsPerRound: number;
  /** Restrict the draw to one category; absent means Any (mixed). */
  category?: TriviaCategory;
}

export interface TriviaQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctChoice: number;
  explanation: string;
  [key: string]: Json;
}

/** A question in a format next-round.trivia/2 bank: the base fields plus
 * a category and a difficulty (integer 1–3), both required there. */
export interface TriviaQuestionV2 extends TriviaQuestion {
  category: TriviaCategory;
  difficulty: number;
}

export interface TriviaBank {
  format: "next-round.trivia/1" | "next-round.trivia/2";
  title: string;
  attribution: string;
  license: "CC0-1.0";
  questions: TriviaQuestion[];
  [key: string]: Json;
}

export interface TriviaReveal {
  roundIndex: number;
  questionId: string;
  prompt: string;
  choices: string[];
  correctChoice: number;
  explanation: string;
  answers: Record<string, number>;
  [key: string]: Json;
}

export interface TriviaState {
  roundIndex: number;
  answers: Record<string, number>;
  roundMemberIds: string[];
  scores: Record<string, number>;
  reveals: TriviaReveal[];
  generation: number;
  dueAt: string | null;
  suspended: boolean;
  suspendedRemainingMs: number | null;
  /** Question ids in play order, drawn once at match start (seeded
   * shuffle of the eligible pool). Empty until the match starts. */
  draw: string[];
  [key: string]: Json;
}

export interface TriviaView {
  phase: "lobby" | "active" | "finished";
  roundIndex: number;
  totalRounds: number;
  question: {
    id: string;
    prompt: string;
    choices: string[];
    /** Present only when the bank is format next-round.trivia/2. */
    category?: TriviaCategory;
    /** Present only when the bank is format next-round.trivia/2. */
    difficulty?: number;
  } | null;
  myMemberId: string | null;
  myChoice: number | null;
  canSubmit: boolean;
  scores: Record<string, number>;
  reveals: TriviaReveal[];
  dueAt: string | null;
  suspended: boolean;
  attribution: string | null;
  [key: string]: Json;
}
