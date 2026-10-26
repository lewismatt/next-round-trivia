// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { parseJsonSchemaValue, type Json } from "@next-round/contracts";
import type {
  GameEvent,
  Member,
  RuleContext,
  Transition,
} from "@next-round/game-sdk";
import { manifest } from "./manifest.js";
import { server } from "./server.js";
import type {
  TriviaBank,
  TriviaCategory,
  TriviaState,
} from "./types.js";

const member = (id: string): Member => ({
  id,
  principalId: `principal-${id}`,
  kind: "registered",
  displayName: id,
  status: "active",
  joinOrdinal: Number(id.slice(1)),
  disabled: false,
  accessEpoch: 1,
});
const bank: TriviaBank = {
  format: "next-round.trivia/1",
  title: "Fixture",
  attribution: "Fixture author",
  license: "CC0-1.0",
  questions: [
    {
      id: "first",
      prompt: "First public prompt",
      choices: ["Zero", "One"],
      correctChoice: 1,
      explanation: "First secret explanation",
    },
    {
      id: "second",
      prompt: "Second hidden prompt",
      choices: ["Two", "Three"],
      correctChoice: 0,
      explanation: "Second secret explanation",
    },
  ],
};

function fixture(rounds = 2) {
  let ctx: RuleContext = {
    matchId: "match",
    moduleVersion: "0.2.0",
    mode: "group",
    phase: null,
    revision: 0,
    now: "2026-10-24T00:00:00.000Z",
    eventId: "event",
    actor: { principalId: "principal-m1", memberId: "m1" },
    members: [member("m1"), member("m2")],
    hostMemberId: "m1",
    settings: { rounds, secondsPerRound: 30 },
    resource: { id: "resource", identity: "identity", version: 1, data: bank },
    facts: [],
  };
  let state: TriviaState | null = null;
  function step(event: GameEvent): Transition<TriviaState> {
    const result = server.transition(ctx, state, event);
    if (!result.ok) throw new Error(result.error.code);
    parseJsonSchemaValue(manifest.stateSchema, result.value.state);
    if (result.value.final)
      parseJsonSchemaValue(manifest.resultSchema, result.value.final.data);
    state = result.value.state;
    ctx = {
      ...ctx,
      phase: result.value.phase,
      hostMemberId: result.value.hostMemberId,
      revision: ctx.revision + 1,
    };
    return result.value;
  }
  step({ kind: "create" });
  return {
    get ctx() {
      return ctx;
    },
    get state() {
      return state!;
    },
    step,
    patch(values: Partial<RuleContext>) {
      ctx = { ...ctx, ...values };
    },
    actor(id: string) {
      ctx = { ...ctx, actor: { memberId: id, principalId: `principal-${id}` } };
    },
    status(id: string, disabled: boolean) {
      ctx = {
        ...ctx,
        members: ctx.members.map((m) => (m.id === id ? { ...m, disabled } : m)),
      };
      return step({ kind: "principal_status", memberId: id, disabled });
    },
    view(id: string) {
      const view = server.view(ctx, state!, {
        memberId: id,
        principalId: `principal-${id}`,
        access: "active",
      });
      parseJsonSchemaValue(manifest.viewSchema, view);
      return view;
    },
  };
}

/** The question in play for a round, via the match's stored draw. */
const drawn = (state: TriviaState, bank_: TriviaBank, round = 0) =>
  bank_.questions.find((q) => q.id === state.draw[round])!;

describe("simultaneous trivia rules", () => {
  it("holds the deadline until reveal and never leaks another answer or a future question", () => {
    const f = fixture();
    const start = f.step({ kind: "start" });
    expect(start.needsActionFrom).toEqual(["m1", "m2"]);
    const q0 = drawn(f.state, bank);
    const other = bank.questions.find((q) => q.id !== q0.id)!;
    const wrong = (q0.correctChoice + 1) % q0.choices.length;
    const after = f.step({
      kind: "action",
      type: "submit",
      payload: { roundIndex: 0, choice: q0.correctChoice },
    });
    expect(after.deadlines).toEqual(start.deadlines);
    expect(after.needsActionFrom).toEqual(["m2"]);
    expect(f.view("m1").myChoice).toBe(q0.correctChoice);
    expect(f.view("m2").myChoice).toBeNull();
    expect(f.view("m2").question).toEqual({
      id: q0.id,
      prompt: q0.prompt,
      choices: q0.choices,
    });
    expect(JSON.stringify(f.view("m2"))).not.toMatch(
      new RegExp(
        `correctChoice|secret explanation|${other.prompt}|identity|answers`,
      ),
    );
    expect(
      server.transition(f.ctx, f.state, {
        kind: "action",
        type: "submit",
        payload: { roundIndex: 0, choice: wrong },
      }),
    ).toMatchObject({ ok: false, error: { code: "ALREADY_SUBMITTED" } });
    f.actor("m2");
    f.step({
      kind: "action",
      type: "submit",
      payload: { roundIndex: 0, choice: wrong },
    });
    f.patch({ now: start.deadlines[0].dueAt });
    const reveal = f.step({ kind: "deadline", deadline: start.deadlines[0] });
    expect(reveal.state.scores).toEqual({ m1: 1, m2: 0 });
    expect(f.view("m2").reveals[0]).toMatchObject({
      correctChoice: q0.correctChoice,
      explanation: q0.explanation,
      answers: { m1: q0.correctChoice, m2: wrong },
    });
    expect(f.view("m1").myChoice).toBeNull();
    expect(
      server.transition(f.ctx, f.state, {
        kind: "action",
        type: "submit",
        payload: { roundIndex: 0, choice: 0 },
      }),
    ).toMatchObject({ ok: false, error: { code: "WRONG_ROUND" } });
  });

  it("preserves answers and remaining time while disabled, and fences late joins/rejoins", () => {
    const f = fixture();
    const start = f.step({ kind: "start" });
    const correct = drawn(f.state, bank).correctChoice;
    f.step({
      kind: "action",
      type: "submit",
      payload: { roundIndex: 0, choice: correct },
    });
    f.patch({ now: "2026-10-24T00:00:05.000Z" });
    expect(f.status("m1", true).deadlines).toEqual(start.deadlines);
    const paused = f.status("m2", true);
    expect(paused.deadlines).toEqual([]);
    expect(paused.needsActionFrom).toEqual([]);
    expect(paused.state).toMatchObject({
      suspended: true,
      suspendedRemainingMs: 25000,
      answers: { m1: correct },
    });
    f.patch({ now: "2026-10-24T00:05:00.000Z" });
    const resumed = f.status("m2", false);
    expect(resumed.deadlines).toEqual([
      { key: "round", generation: 2, dueAt: "2026-10-24T00:05:25.000Z" },
    ]);
    expect(resumed.state.answers).toEqual({ m1: correct });
    f.patch({ members: [...f.ctx.members, member("m3")] });
    const joined = f.step({ kind: "join", memberId: "m3", rejoin: false });
    expect(joined.deadlines).toEqual(resumed.deadlines);
    expect(f.view("m3").canSubmit).toBe(false);
    f.patch({
      members: f.ctx.members.map((m) =>
        m.id === "m2" ? { ...m, status: "left" } : m,
      ),
    });
    f.step({ kind: "leave", memberId: "m2", reason: "left" });
    f.patch({
      members: f.ctx.members.map((m) =>
        m.id === "m2" ? { ...m, status: "active" } : m,
      ),
    });
    f.step({ kind: "join", memberId: "m2", rejoin: true });
    expect(f.view("m2").canSubmit).toBe(false);
    f.patch({ now: resumed.deadlines[0].dueAt });
    const next = f.step({ kind: "deadline", deadline: resumed.deadlines[0] });
    expect(next.needsActionFrom).toEqual(["m2", "m3"]);
    expect(next.state.scores.m1).toBe(1);
  });

  it("projects complete results without resource/state and does not score an unfinished round", () => {
    const f = fixture(1);
    const start = f.step({ kind: "start" });
    f.step({
      kind: "action",
      type: "submit",
      payload: { roundIndex: 0, choice: drawn(f.state, bank).correctChoice },
    });
    f.patch({ now: start.deadlines[0].dueAt });
    const final = f.step({
      kind: "deadline",
      deadline: start.deadlines[0],
    }).final!;
    expect(final).toMatchObject({
      outcome: "completed",
      data: { roundsPlayed: 1, winners: ["m1"] },
      participants: [
        { memberId: "m1", score: 1, win: true, careerEligible: true },
        { memberId: "m2", score: 0, win: false, careerEligible: true },
      ],
    });
    const projection = server.resultView(
      { ...f.ctx, resource: null },
      final,
      "principal-m1",
    );
    expect(JSON.stringify(projection)).not.toMatch(
      /secret explanation|correctChoice|answers|prompt/,
    );
    expect(server.career(final)).toEqual([
      { memberId: "m1", points: 1, played: 1, wins: 1 },
      { memberId: "m2", points: 0, played: 1, wins: 0 },
    ]);
    const early = fixture();
    early.step({ kind: "start" });
    early.step({
      kind: "action",
      type: "submit",
      payload: { roundIndex: 0, choice: 1 },
    });
    const ended = early.step({ kind: "finish", reason: "host_ended" }).final!;
    expect(ended.data).toMatchObject({ roundsPlayed: 0, winners: [] });
    expect(
      ended.participants.every((p) => p.score === 0 && !p.careerEligible),
    ).toBe(true);
    expect(server.career(ended)).toEqual([]);
  });
});

const makeBank = (
  count: number,
  format: TriviaBank["format"] = "next-round.trivia/1",
  categorize?: (i: number) => { category: TriviaCategory; difficulty: number },
): TriviaBank => ({
  format,
  title: "Generated fixture",
  attribution: "Fixture author",
  license: "CC0-1.0",
  questions: Array.from({ length: count }, (_, i) => ({
    id: `q${i}`,
    prompt: `Question ${i}?`,
    choices: ["A", "B", "C", "D"],
    correctChoice: i % 4,
    explanation: `Explanation ${i}`,
    ...(categorize ? categorize(i) : {}),
  })),
});

function makeCtx(
  settingsValue: Record<string, Json>,
  data: TriviaBank,
  matchId = "match",
): RuleContext {
  return {
    matchId,
    moduleVersion: "0.2.0",
    mode: "group",
    phase: null,
    revision: 0,
    now: "2026-10-24T00:00:00.000Z",
    eventId: "event",
    actor: { principalId: "principal-m1", memberId: "m1" },
    members: [member("m1"), member("m2")],
    hostMemberId: "m1",
    settings: settingsValue,
    resource: { id: "resource", identity: "identity", version: 1, data },
    facts: [],
  };
}

/** Create + start a match directly; returns the started state. */
function startedState(
  settingsValue: Record<string, Json>,
  data: TriviaBank,
  matchId = "match",
): TriviaState {
  const ctx = makeCtx(settingsValue, data, matchId);
  const created = server.transition(ctx, null, { kind: "create" });
  if (!created.ok) throw new Error(created.error.code);
  const started = server.transition(
    { ...ctx, phase: "lobby" },
    created.value.state,
    { kind: "start" },
  );
  if (!started.ok) throw new Error(started.error.code);
  parseJsonSchemaValue(manifest.stateSchema, started.value.state);
  return started.value.state;
}

describe("seeded draw and categories", () => {
  it("keeps the settings schema honest: category is optional, unknown categories fail", () => {
    expect(() =>
      parseJsonSchemaValue(manifest.settingsSchema, {
        rounds: 2,
        secondsPerRound: 30,
      }),
    ).not.toThrow();
    expect(() =>
      parseJsonSchemaValue(manifest.settingsSchema, {
        rounds: 2,
        secondsPerRound: 30,
        category: "geography",
      }),
    ).not.toThrow();
    expect(() =>
      parseJsonSchemaValue(manifest.settingsSchema, {
        rounds: 2,
        secondsPerRound: 30,
        category: "astrology",
      }),
    ).toThrow();
    expect(
      server.transition(
        makeCtx(
          { rounds: 2, secondsPerRound: 30, category: "astrology" },
          bank,
        ),
        null,
        { kind: "create" },
      ),
    ).toMatchObject({ ok: false, error: { code: "INVALID_SETTINGS" } });
  });

  it("draws deterministically per match and stores the draw in state", () => {
    const large = makeBank(10);
    const a = startedState({ rounds: 4, secondsPerRound: 30 }, large);
    const b = startedState({ rounds: 4, secondsPerRound: 30 }, large);
    expect(a.draw).toEqual(b.draw);
    expect([...a.draw].sort()).toEqual(large.questions.map((q) => q.id).sort());
    const c = startedState(
      { rounds: 4, secondsPerRound: 30 },
      large,
      "another-match",
    );
    expect(c.draw).not.toEqual(a.draw);
  });

  it("reaches questions beyond index 19 of a large bank", () => {
    const large = makeBank(25);
    const state = startedState({ rounds: 20, secondsPerRound: 30 }, large);
    expect(state.draw).toHaveLength(25);
    const tail = new Set(large.questions.slice(20).map((q) => q.id));
    expect(state.draw.slice(0, 20).some((id) => tail.has(id))).toBe(true);
  });

  it("restricts the draw to the settings category and projects it in the view", () => {
    const mixed = makeBank(8, "next-round.trivia/2", (i) =>
      i % 2 === 0
        ? { category: "geography", difficulty: 1 }
        : { category: "history", difficulty: 2 },
    );
    const ctx = makeCtx(
      { rounds: 3, secondsPerRound: 30, category: "geography" },
      mixed,
    );
    const created = server.transition(ctx, null, { kind: "create" });
    if (!created.ok) throw new Error(created.error.code);
    const started = server.transition(
      { ...ctx, phase: "lobby" },
      created.value.state,
      { kind: "start" },
    );
    if (!started.ok) throw new Error(started.error.code);
    const state = started.value.state;
    expect(state.draw).toHaveLength(4);
    expect(
      state.draw.every(
        (id) =>
          mixed.questions.find((q) => q.id === id)?.category === "geography",
      ),
    ).toBe(true);
    const view = server.view(
      { ...ctx, phase: "active" },
      state,
      { memberId: "m1", principalId: "principal-m1", access: "active" },
    );
    parseJsonSchemaValue(manifest.viewSchema, view);
    expect(view.question).toMatchObject({
      id: state.draw[0],
      category: "geography",
      difficulty: 1,
    });
  });

  it("fails cleanly when a category is set against a /1 bank or a too-small subset", () => {
    expect(
      server.transition(
        makeCtx({ rounds: 2, secondsPerRound: 30, category: "geography" }, bank),
        null,
        { kind: "create" },
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_ENOUGH_QUESTIONS" } });
    const mixed = makeBank(8, "next-round.trivia/2", (i) =>
      i % 2 === 0
        ? { category: "geography", difficulty: 1 }
        : { category: "history", difficulty: 2 },
    );
    expect(
      server.transition(
        makeCtx(
          { rounds: 5, secondsPerRound: 30, category: "geography" },
          mixed,
        ),
        null,
        { kind: "create" },
      ),
    ).toMatchObject({ ok: false, error: { code: "NOT_ENOUGH_QUESTIONS" } });
  });
});
