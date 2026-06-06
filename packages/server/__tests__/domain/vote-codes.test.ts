import { describe, expect, test } from "bun:test";
import { normalizeVote, normalizeBloc } from "#server/domain";

describe("normalizeVote", () => {
  test("maps known codes to lowercase tokens", () => {
    expect(normalizeVote("JAA")).toBe("jaa");
    expect(normalizeVote("EI")).toBe("ei");
    expect(normalizeVote("TYHJAA")).toBe("tyhjaa");
    expect(normalizeVote("POISSA")).toBe("poissa");
  });

  test("unknown code → 'poissa'", () => {
    expect(normalizeVote("UNKNOWN")).toBe("poissa");
    expect(normalizeVote("")).toBe("poissa");
  });

  test("null/undefined → 'poissa'", () => {
    expect(normalizeVote(null)).toBe("poissa");
    expect(normalizeVote(undefined)).toBe("poissa");
  });
});

describe("normalizeBloc", () => {
  test("1 → 'government'", () => {
    expect(normalizeBloc(1)).toBe("government");
  });

  test("true → 'government'", () => {
    expect(normalizeBloc(true)).toBe("government");
  });

  test("0 → 'opposition'", () => {
    expect(normalizeBloc(0)).toBe("opposition");
  });

  test("false → 'opposition'", () => {
    expect(normalizeBloc(false)).toBe("opposition");
  });

  test("null/undefined → 'opposition'", () => {
    expect(normalizeBloc(null)).toBe("opposition");
    expect(normalizeBloc(undefined)).toBe("opposition");
  });
});
