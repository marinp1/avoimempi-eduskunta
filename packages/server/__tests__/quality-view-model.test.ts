import { describe, expect, test } from "bun:test";
import {
  buildQualityViewModel,
  formatDuration,
} from "../src/features/quality/pages/quality.view-model";
import type { CheckOutcome } from "../src/features/quality/quality.types";

function outcome(overrides: Partial<CheckOutcome> = {}): CheckOutcome {
  return {
    id: "check-id",
    category: "Business Logic",
    severity: "error",
    name: "Tarkistus",
    description: "Kuvaus",
    status: "pass",
    totalViolations: 0,
    sample: [],
    durationMs: 12,
    ...overrides,
  };
}

describe("formatDuration", () => {
  test("formats sub-millisecond, millisecond and second durations", () => {
    expect(formatDuration(0.4)).toBe("<1 ms");
    expect(formatDuration(12.4)).toBe("12 ms");
    expect(formatDuration(1234)).toBe("1,2 s");
  });
});

describe("buildQualityViewModel", () => {
  test("maps idle state", () => {
    const vm = buildQualityViewModel({ phase: "idle" });

    expect(vm.phase).toBe("idle");
    expect(vm.progress).toEqual({ done: 0, total: 0 });
    expect(vm.currentName).toBeNull();
    expect(vm.summary).toEqual({ passed: 0, failed: 0, errored: 0, total: 0 });
    expect(vm.groups).toEqual([]);
    expect(vm.totalDurationLabel).toBeNull();
  });

  test("maps running state with progress and current check", () => {
    const vm = buildQualityViewModel({
      phase: "running",
      startedAt: "2026-06-11T08:00:00.000Z",
      total: 3,
      completed: [outcome({ id: "a" })],
      current: { id: "b", name: "Toinen tarkistus" },
    });

    expect(vm.phase).toBe("running");
    expect(vm.progress).toEqual({ done: 1, total: 3 });
    expect(vm.currentName).toBe("Toinen tarkistus");
    expect(vm.groups).toHaveLength(1);
  });

  test("counts summary statuses and groups checks by category in first-seen order", () => {
    const vm = buildQualityViewModel({
      phase: "complete",
      startedAt: "2026-06-11T08:00:00.000Z",
      finishedAt: "2026-06-11T08:00:03.000Z",
      total: 4,
      completed: [
        outcome({ id: "a", category: "Business Logic", status: "pass" }),
        outcome({
          id: "b",
          category: "Data Integrity",
          status: "fail",
          totalViolations: 50,
        }),
        outcome({ id: "c", category: "Business Logic", status: "pass" }),
        outcome({
          id: "d",
          category: "Data Integrity",
          status: "error",
          error: "no such table",
        }),
      ],
      durationMs: 3000,
    });

    expect(vm.summary).toEqual({ passed: 2, failed: 1, errored: 1, total: 4 });
    expect(vm.groups.map((g) => g.category)).toEqual([
      "Business Logic",
      "Data Integrity",
    ]);
    expect(vm.groups[0]?.checks.map((c) => c.id)).toEqual(["a", "c"]);
    expect(vm.groups[1]?.checks.map((c) => c.id)).toEqual(["b", "d"]);
    expect(vm.groups[1]?.checks[1]?.error).toBe("no such table");
    expect(vm.totalDurationLabel).toBe("3,0 s");
  });

  test("maps findingNotes onto the display check", () => {
    const vm = buildQualityViewModel({
      phase: "complete",
      startedAt: "2026-06-11T08:00:00.000Z",
      finishedAt: "2026-06-11T08:00:01.000Z",
      total: 2,
      completed: [
        outcome({ id: "a", findingNotes: "Tunnettu syy tekstinä." }),
        outcome({ id: "b" }),
      ],
      durationMs: 1000,
    });

    expect(vm.groups[0]?.checks[0]?.findingNotes).toBe(
      "Tunnettu syy tekstinä.",
    );
    expect(vm.groups[0]?.checks[1]?.findingNotes).toBeUndefined();
  });

  test("flattens sample rows into column/value string pairs", () => {
    const vm = buildQualityViewModel({
      phase: "complete",
      startedAt: "2026-06-11T08:00:00.000Z",
      finishedAt: "2026-06-11T08:00:01.000Z",
      total: 1,
      completed: [
        outcome({
          status: "fail",
          totalViolations: 2,
          sample: [
            { id: 100, n_total: 199, actual_votes: null },
            { id: 101, n_total: 198, actual_votes: 42 },
          ],
        }),
      ],
      durationMs: 1000,
    });

    const check = vm.groups[0]?.checks[0];
    expect(check?.sample).toEqual([
      [
        { column: "id", value: "100" },
        { column: "n_total", value: "199" },
        { column: "actual_votes", value: "–" },
      ],
      [
        { column: "id", value: "101" },
        { column: "n_total", value: "198" },
        { column: "actual_votes", value: "42" },
      ],
    ]);
  });
});
