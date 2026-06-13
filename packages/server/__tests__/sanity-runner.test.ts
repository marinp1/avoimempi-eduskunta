import { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  executeCheck,
  SAMPLE_LIMIT,
  SanityRunner,
} from "../src/features/quality/quality.runner";
import type { SanityCheckDefinition } from "../src/features/quality/quality.types";

function makeCheck(
  id: string,
  rows: Record<string, unknown>[] | (() => Record<string, unknown>[]),
  extra: Partial<SanityCheckDefinition> = {},
): SanityCheckDefinition {
  return {
    id,
    category: "Test",
    severity: "error",
    name: `Check ${id}`,
    description: `Description for ${id}`,
    query: typeof rows === "function" ? rows : () => rows,
    ...extra,
  };
}

/** Yield function the test resolves manually, one step per completed check. */
function deferredYield() {
  const queue: Array<() => void> = [];
  return {
    yieldFn: () => new Promise<void>((resolve) => queue.push(resolve)),
    step: async () => {
      queue.shift()?.();
      // Let the runner continuation execute before assertions.
      await Bun.sleep(0);
    },
  };
}

describe("executeCheck", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  test("passing check yields pass with zero violations", () => {
    const outcome = executeCheck(db, makeCheck("ok", []));

    expect(outcome.status).toBe("pass");
    expect(outcome.totalViolations).toBe(0);
    expect(outcome.sample).toEqual([]);
    expect(outcome.error).toBeUndefined();
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("failing check yields fail with full count and capped sample", () => {
    const rows = Array.from({ length: SAMPLE_LIMIT + 3 }, (_, i) => ({
      id: i,
    }));
    const outcome = executeCheck(db, makeCheck("bad", rows));

    expect(outcome.status).toBe("fail");
    expect(outcome.totalViolations).toBe(SAMPLE_LIMIT + 3);
    expect(outcome.sample).toHaveLength(SAMPLE_LIMIT);
    expect(outcome.sample[0]).toEqual({ id: 0 });
  });

  test("throwing check yields error with the message", () => {
    const outcome = executeCheck(
      db,
      makeCheck("boom", () => {
        throw new Error("table missing");
      }),
    );

    expect(outcome.status).toBe("error");
    expect(outcome.error).toBe("table missing");
    expect(outcome.totalViolations).toBe(0);
    expect(outcome.sample).toEqual([]);
  });

  test("carries check metadata into the outcome", () => {
    const outcome = executeCheck(db, makeCheck("meta", []));

    expect(outcome.id).toBe("meta");
    expect(outcome.category).toBe("Test");
    expect(outcome.severity).toBe("error");
    expect(outcome.name).toBe("Check meta");
    expect(outcome.description).toBe("Description for meta");
    expect(outcome.findingNotes).toBeUndefined();
  });

  test("carries findingNotes into the outcome regardless of status", () => {
    const notes = "Tunnettu syy: lähdedatan kattavuus.";

    const passing = executeCheck(db, makeCheck("ok", [], { findingNotes: notes }));
    const failing = executeCheck(
      db,
      makeCheck("bad", [{ id: 1 }], { findingNotes: notes }),
    );

    expect(passing.findingNotes).toBe(notes);
    expect(failing.findingNotes).toBe(notes);
  });
});

describe("SanityRunner", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  test("initial state is idle", () => {
    const runner = new SanityRunner(db, [makeCheck("a", [])]);

    expect(runner.getState()).toEqual({ phase: "idle" });
  });

  test("runs checks one per yield and reports progress", async () => {
    const { yieldFn, step } = deferredYield();
    const runner = new SanityRunner(
      db,
      [makeCheck("a", []), makeCheck("b", [{ id: 1 }]), makeCheck("c", [])],
      { yieldFn },
    );

    const done = runner.start();
    await Bun.sleep(0);

    let state = runner.getState();
    expect(state.phase).toBe("running");
    if (state.phase !== "running") throw new Error("unreachable");
    expect(state.total).toBe(3);
    expect(state.completed).toHaveLength(0);
    expect(state.current).toEqual({ id: "a", name: "Check a" });

    await step();
    state = runner.getState();
    if (state.phase !== "running") throw new Error("expected running");
    expect(state.completed).toHaveLength(1);
    expect(state.completed[0]?.id).toBe("a");
    expect(state.completed[0]?.status).toBe("pass");
    expect(state.current).toEqual({ id: "b", name: "Check b" });

    await step();
    state = runner.getState();
    if (state.phase !== "running") throw new Error("expected running");
    expect(state.completed).toHaveLength(2);
    expect(state.completed[1]?.status).toBe("fail");
    expect(state.completed[1]?.totalViolations).toBe(1);

    await step();
    await done;

    state = runner.getState();
    expect(state.phase).toBe("complete");
    if (state.phase !== "complete") throw new Error("unreachable");
    expect(state.completed).toHaveLength(3);
    expect(state.total).toBe(3);
    expect(state.startedAt).toBeString();
    expect(state.finishedAt).toBeString();
    expect(state.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("a throwing check is recorded as error and the run continues", async () => {
    const runner = new SanityRunner(db, [
      makeCheck("boom", () => {
        throw new Error("broken query");
      }),
      makeCheck("after", []),
    ]);

    await runner.start();

    const state = runner.getState();
    expect(state.phase).toBe("complete");
    if (state.phase !== "complete") throw new Error("unreachable");
    expect(state.completed).toHaveLength(2);
    expect(state.completed[0]?.status).toBe("error");
    expect(state.completed[0]?.error).toBe("broken query");
    expect(state.completed[1]?.status).toBe("pass");
  });

  test("start() is idempotent while running and after completion", async () => {
    let calls = 0;
    const runner = new SanityRunner(db, [
      makeCheck("counted", () => {
        calls += 1;
        return [];
      }),
    ]);

    const first = runner.start();
    const second = runner.start();
    await Promise.all([first, second]);
    await runner.start();

    expect(calls).toBe(1);
    expect(runner.getState().phase).toBe("complete");
  });

  test("getState returns a snapshot detached from internal state", async () => {
    const runner = new SanityRunner(db, [makeCheck("a", [{ id: 7 }])]);
    await runner.start();

    const snapshot = runner.getState();
    if (snapshot.phase !== "complete") throw new Error("expected complete");
    snapshot.completed.pop();
    snapshot.completed.push({
      ...snapshot.completed[0]!,
      id: "tampered",
    } as never);

    const fresh = runner.getState();
    if (fresh.phase !== "complete") throw new Error("expected complete");
    expect(fresh.completed).toHaveLength(1);
    expect(fresh.completed[0]?.id).toBe("a");
  });
});
