// SPDX-License-Identifier: Apache-2.0
import {
  SDK_IDENTIFIER,
  type GameManifest,
  type Schema,
} from "@next-round/contracts";
import { TRIVIA_CATEGORY_CODES } from "./types.js";

function object(properties: Record<string, Schema>): Schema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}
const text = (maxLength: number): Schema => ({
  type: "string",
  minLength: 1,
  maxLength,
});
const choice: Schema = { type: "integer", minimum: 0, maximum: 7 };
const scores: Schema = {
  type: "object",
  additionalProperties: { type: "integer", minimum: 0 },
};
const answers: Schema = { type: "object", additionalProperties: choice };
const ids: Schema = {
  type: "array",
  items: { type: "string" },
  uniqueItems: true,
};
const choices: Schema = {
  type: "array",
  items: text(300),
  minItems: 2,
  maxItems: 8,
  uniqueItems: true,
};
const category: Schema = { type: "string", enum: [...TRIVIA_CATEGORY_CODES] };
const difficulty: Schema = { type: "integer", minimum: 1, maximum: 3 };
/** Public question projection. Category and difficulty are optional
 * properties: they are projected only for format /2 banks, so views of
 * /1 banks are exactly what they were in 0.1.0. */
const publicQuestion: Schema = {
  type: "object",
  properties: {
    id: text(80),
    prompt: text(1000),
    choices,
    category: {
      anyOf: [category, { type: "null" }],
    },
    difficulty: {
      anyOf: [difficulty, { type: "null" }],
    },
  },
  required: ["id", "prompt", "choices"],
  additionalProperties: false,
};
const question = object({
  id: text(80),
  prompt: text(1000),
  choices,
  correctChoice: choice,
  explanation: text(2000),
});
const questionV2 = object({
  id: text(80),
  prompt: text(1000),
  choices,
  correctChoice: choice,
  explanation: text(2000),
  category,
  difficulty,
});
const reveal = object({
  roundIndex: { type: "integer", minimum: 0, maximum: 19 },
  questionId: text(80),
  prompt: text(1000),
  choices,
  correctChoice: choice,
  explanation: text(2000),
  answers,
});
const reveals: Schema = { type: "array", items: reveal, maxItems: 20 };
const nullableTime: Schema = { type: ["string", "null"] };

export const triviaBankSchema: Schema = object({
  format: { const: "next-round.trivia/1", type: "string" },
  title: text(120),
  attribution: text(500),
  license: { const: "CC0-1.0", type: "string" },
  questions: { type: "array", items: question, minItems: 1, maxItems: 1000 },
});

export const triviaBankSchemaV2: Schema = object({
  format: { const: "next-round.trivia/2", type: "string" },
  title: text(120),
  attribution: text(500),
  license: { const: "CC0-1.0", type: "string" },
  questions: { type: "array", items: questionV2, minItems: 1, maxItems: 1000 },
});

/** Banks of either supported format may be imported and pinned. */
const bankSchema: Schema = { anyOf: [triviaBankSchema, triviaBankSchemaV2] };

export const manifest: GameManifest = {
  id: "trivia",
  name: "Trivia",
  version: "0.2.0",
  sdk: SDK_IDENTIFIER,
  platformRange: ">=0.1.0 <1.0.0",
  stateVersion: 2,
  resultVersion: 1,
  description:
    "Simultaneous private answers, timed reveals and shared standings.",
  modes: [
    {
      id: "solo",
      label: "Solo",
      minPlayersToStart: 1,
      maxPlayers: 1,
      lateJoin: false,
      rejoin: true,
    },
    {
      id: "group",
      label: "Group",
      minPlayersToStart: 2,
      maxPlayers: 8,
      lateJoin: true,
      rejoin: true,
    },
  ],
  capabilities: {
    chat: true,
    deadlines: true,
    solo: true,
    resources: true,
    careerStats: true,
  },
  /** Built explicitly (not via the all-required object() helper) so the
   * category setting stays optional: clients that send only
   * {rounds, secondsPerRound} keep working. */
  settingsSchema: {
    type: "object",
    properties: {
      rounds: { type: "integer", minimum: 1, maximum: 20 },
      secondsPerRound: { type: "integer", minimum: 1, maximum: 300 },
      category,
    },
    required: ["rounds", "secondsPerRound"],
    additionalProperties: false,
  },
  actionSchemas: {
    submit: object({
      roundIndex: { type: "integer", minimum: 0, maximum: 19 },
      choice,
    }),
  },
  stateSchema: object({
    roundIndex: { type: "integer", minimum: 0, maximum: 20 },
    answers,
    roundMemberIds: ids,
    scores,
    reveals,
    generation: { type: "integer", minimum: 0 },
    dueAt: nullableTime,
    suspended: { type: "boolean" },
    suspendedRemainingMs: {
      type: ["integer", "null"],
      minimum: 0,
      maximum: 300000,
    },
    draw: ids,
  }),
  viewSchema: object({
    phase: { enum: ["lobby", "active", "finished"] },
    roundIndex: { type: "integer", minimum: 0, maximum: 20 },
    totalRounds: { type: "integer", minimum: 1, maximum: 20 },
    question: { anyOf: [publicQuestion, { type: "null" }] },
    myMemberId: { type: ["string", "null"] },
    myChoice: { type: ["integer", "null"], minimum: 0, maximum: 7 },
    canSubmit: { type: "boolean" },
    scores,
    reveals,
    dueAt: nullableTime,
    suspended: { type: "boolean" },
    attribution: { type: ["string", "null"] },
  }),
  resultSchema: object({
    roundsPlayed: { type: "integer", minimum: 0, maximum: 20 },
    totalRounds: { type: "integer", minimum: 1, maximum: 20 },
    winners: ids,
    attribution: text(500),
  }),
  resourceSchemas: {
    import: bankSchema,
    data: bankSchema,
    facts: object({}),
    metadata: object({
      title: text(120),
      questionCount: { type: "integer", minimum: 1, maximum: 1000 },
      rights: object({
        license: { const: "CC0-1.0", type: "string" },
        sourceUrl: { type: "null" },
        attribution: text(500),
        permissionNote: { type: "null" },
      }),
    }),
  },
  client: { entry: "./client.js", css: [] },
};
