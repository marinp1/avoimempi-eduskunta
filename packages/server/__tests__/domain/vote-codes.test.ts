import { describe, expect, test } from "bun:test";
import { normalizeVote, normalizeBloc } from "#server/domain";

describe("normalizeVote", () => {
  test("maps Finnish DB values to lowercase tokens", () => {
    expect(normalizeVote("Jaa")).toBe("jaa");
    expect(normalizeVote("Ei")).toBe("ei");
    expect(normalizeVote("Tyhjää")).toBe("tyhjaa");
    expect(normalizeVote("Poissa")).toBe("poissa");
  });

  test("unrecognised non-empty string → 'tuntematon'", () => {
    expect(normalizeVote("UNKNOWN")).toBe("tuntematon");
    expect(normalizeVote("JAA")).toBe("tuntematon");
  });

  test("falsy values (null, undefined, empty string) → 'poissa'", () => {
    expect(normalizeVote(null)).toBe("poissa");
    expect(normalizeVote(undefined)).toBe("poissa");
    expect(normalizeVote("")).toBe("poissa");
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
