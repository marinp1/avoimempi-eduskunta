import { describe, expect, test } from "bun:test";
import { partyShortName } from "../templates/components/party";
import { buildBlocBar } from "../templates/view-models";
import { makeRow } from "./fixtures";

describe("buildBlocBar", () => {
  const rows = [
    makeRow({ group_abbreviation: "kok", is_in_government: 1 }),
    makeRow({ group_abbreviation: "kok", is_in_government: 1 }),
    makeRow({ group_abbreviation: "kok", is_in_government: 1 }),
    makeRow({ group_abbreviation: "sd", is_in_government: 0 }),
    makeRow({ group_abbreviation: "vihr", is_in_government: 0 }),
    makeRow({ group_abbreviation: null, is_in_government: 0 }),
  ];

  test("computes gov / opp / total counts", () => {
    const bar = buildBlocBar(rows, partyShortName);
    expect(bar.total).toBe(6);
    expect(bar.govTotal).toBe(3);
    expect(bar.oppTotal).toBe(3);
  });

  test("emits hallitus segments before oppositio segments", () => {
    const bar = buildBlocBar(rows, partyShortName);
    const sides = bar.segments.map((s) => s.side);
    expect(sides.indexOf("hall")).toBeLessThan(sides.indexOf("opp"));
    expect(
      bar.segments.every((s) => s.side === "hall" || s.side === "opp"),
    ).toBe(true);
  });

  test("excludes rows with no party (unknown)", () => {
    const bar = buildBlocBar(rows, partyShortName);
    expect(bar.segments.some((s) => s.code === "unknown")).toBe(false);
  });

  test("produces ready-to-render color, width and label", () => {
    const bar = buildBlocBar(rows, partyShortName);
    const kok = bar.segments.find((s) => s.code === "kok");
    expect(kok?.color).toBe("var(--party-kok)");
    expect(kok?.width).toBe("50.0%");
    expect(kok?.count).toBe(3);
    expect(kok?.label).toBe("Kokoomus");
  });

  test("handles an empty roster without dividing by zero", () => {
    const bar = buildBlocBar([], partyShortName);
    expect(bar.total).toBe(0);
    expect(bar.segments).toHaveLength(0);
  });
});
