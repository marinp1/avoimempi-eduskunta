import { describe, expect, test } from "bun:test";
import { applyFilters } from "../src/helpers/template-helpers";
import type { RosterRow } from "#server/types/webapp";

function mp(overrides: Partial<RosterRow> = {}): RosterRow {
  return {
    person_id: 100,
    first_name: "Matti",
    last_name: "Meikäläinen",
    sort_name: "Meikäläinen, Matti",
    group_abbreviation: "kok",
    is_in_government: 1,
    district_name: "Helsinki",
    birth_year: 1980,
    participation_rate: 0.85,
    government_start_date: "2023-06-20",
    government_end_date: null,
    ...overrides,
  };
}

describe("applyFilters", () => {
  test("returns all rows when no filters are set", () => {
    const rows = [mp(), mp({ person_id: 101 })];
    const result = applyFilters(rows, {});
    expect(result).toHaveLength(2);
  });

  test("filters by search query (q) on names", () => {
    const rows = [
      mp({ first_name: "Matti", last_name: "Korhonen" }),
      mp({ person_id: 101, first_name: "Liisa", last_name: "Virtanen" }),
    ];

    const result = applyFilters(rows, { q: "matti" });
    expect(result).toHaveLength(1);
    expect(result[0]?.first_name).toBe("Matti");
  });

  test("filters by search query on district", () => {
    const rows = [
      mp({ district_name: "Helsinki" }),
      mp({ person_id: 101, district_name: "Oulu" }),
    ];

    const result = applyFilters(rows, { q: "helsinki" });
    expect(result).toHaveLength(1);
  });

  test("search is case-insensitive", () => {
    const rows = [mp({ last_name: "SUOMI" })];
    expect(applyFilters(rows, { q: "suomi" })).toHaveLength(1);
    expect(applyFilters(rows, { q: "SUOMI" })).toHaveLength(1);
  });

  test("filters by party code", () => {
    const rows = [
      mp({ group_abbreviation: "kok" }),
      mp({ person_id: 101, group_abbreviation: "sd" }),
    ];

    const result = applyFilters(rows, { party: "kok" });
    expect(result).toHaveLength(1);
    expect(result[0]?.group_abbreviation).toBe("kok");
  });

  test('filters by bloc "hallitus"', () => {
    const rows = [
      mp({ is_in_government: 1 }),
      mp({ person_id: 101, is_in_government: 0 }),
    ];

    const result = applyFilters(rows, { bloc: "hallitus" });
    expect(result).toHaveLength(1);
    expect(result[0]?.is_in_government).toBe(1);
  });

  test('filters by bloc "oppositio"', () => {
    const rows = [
      mp({ is_in_government: 1 }),
      mp({ person_id: 101, is_in_government: 0 }),
    ];

    const result = applyFilters(rows, { bloc: "oppositio" });
    expect(result).toHaveLength(1);
    expect(result[0]?.is_in_government).toBe(0);
  });

  test("sorts by party name ascending by default", () => {
    const rows = [
      mp({ person_id: 1, group_abbreviation: "sd" }),
      mp({ person_id: 2, group_abbreviation: "kok" }),
    ];

    const result = applyFilters(rows, { sort: "party" });
    expect(result[0]?.group_abbreviation).toBe("kok");
    expect(result[1]?.group_abbreviation).toBe("sd");
  });

  test("sorts by attendance rate descending", () => {
    const rows = [
      mp({ person_id: 1, participation_rate: 0.5 }),
      mp({ person_id: 2, participation_rate: 0.9 }),
    ];

    const result = applyFilters(rows, { sort: "att", dir: "desc" });
    expect(result[0]?.participation_rate).toBe(0.9);
    expect(result[1]?.participation_rate).toBe(0.5);
  });

  test("sorts by age ascending — younger first (higher birth_year)", () => {
    const rows = [
      mp({ person_id: 1, birth_year: 1990 }),
      mp({ person_id: 2, birth_year: 1960 }),
    ];

    // age sort: dir=asc means younger first (higher birth_year, since formula
    // is (b.birth_year - a.birth_year) * dir)
    const result = applyFilters(rows, { sort: "age" });
    expect(result[0]?.birth_year).toBe(1990);
    expect(result[1]?.birth_year).toBe(1960);
  });

  test("default (no sort) preserves insertion order", () => {
    const rows = [
      mp({ person_id: 1, sort_name: "Virtanen, A" }),
      mp({ person_id: 2, sort_name: "Aalto, B" }),
    ];

    const result = applyFilters(rows, {});
    expect(result[0]?.sort_name).toBe("Virtanen, A");
    expect(result[1]?.sort_name).toBe("Aalto, B");
  });

  test("multiple filters combine", () => {
    const rows = [
      mp({ person_id: 1, group_abbreviation: "kok", is_in_government: 1 }),
      mp({ person_id: 2, group_abbreviation: "kok", is_in_government: 1 }),
      mp({ person_id: 3, group_abbreviation: "sd", is_in_government: 0 }),
    ];

    const result = applyFilters(rows, { party: "kok", bloc: "hallitus" });
    expect(result).toHaveLength(2);
  });
});
