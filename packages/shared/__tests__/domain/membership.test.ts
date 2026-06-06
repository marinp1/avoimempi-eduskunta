import { describe, expect, test } from "bun:test";
import {
  isCurrentMembership,
  findCurrentGroup,
  findCurrentDistrict,
} from "#shared/domain";

describe("isCurrentMembership", () => {
  test("null end_date → current", () => {
    expect(isCurrentMembership(null)).toBe(true);
  });

  test("undefined end_date → current", () => {
    expect(isCurrentMembership(undefined)).toBe(true);
  });

  test("future end_date → current", () => {
    expect(isCurrentMembership("2999-12-31")).toBe(true);
  });

  test("past end_date → not current", () => {
    expect(isCurrentMembership("2020-01-01")).toBe(false);
  });

  test("today's date → current", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isCurrentMembership(today)).toBe(true);
  });

  test("custom reference date", () => {
    expect(isCurrentMembership("2024-06-15", new Date("2024-06-01"))).toBe(
      true,
    );
    expect(isCurrentMembership("2024-05-30", new Date("2024-06-01"))).toBe(
      false,
    );
  });
});

describe("findCurrentGroup", () => {
  test("finds membership with null end_date", () => {
    const groups = [
      { end_date: "2020-01-01", group_abbreviation: "old" },
      { end_date: null, group_abbreviation: "kok" },
    ];
    const result = findCurrentGroup(groups);
    expect(result?.group_abbreviation).toBe("kok");
  });

  test("finds membership with future end_date", () => {
    const groups = [
      { end_date: "2999-12-31", group_abbreviation: "kok" },
      { end_date: "2020-01-01", group_abbreviation: "old" },
    ];
    const result = findCurrentGroup(groups);
    expect(result?.group_abbreviation).toBe("kok");
  });

  test("returns undefined when no current membership", () => {
    const groups = [
      { end_date: "2020-01-01", group_abbreviation: "old" },
      { end_date: "2019-06-01", group_abbreviation: "older" },
    ];
    expect(findCurrentGroup(groups)).toBeUndefined();
  });

  test("returns first current membership", () => {
    const groups = [
      { end_date: null, group_abbreviation: "kok" },
      { end_date: null, group_abbreviation: "sd" },
    ];
    const result = findCurrentGroup(groups);
    expect(result?.group_abbreviation).toBe("kok");
  });

  test("empty array → undefined", () => {
    expect(findCurrentGroup([])).toBeUndefined();
  });
});

describe("findCurrentDistrict", () => {
  test("finds district with null end_date", () => {
    const districts = [
      { end_date: "2020-01-01", district_name: "Old District" },
      { end_date: null, district_name: "Helsingin vaalipiiri" },
    ];
    const result = findCurrentDistrict(districts);
    expect(result?.district_name).toBe("Helsingin vaalipiiri");
  });

  test("only null end_date is current (not future)", () => {
    const districts = [
      { end_date: "2999-12-31", district_name: "Future District" },
      { end_date: null, district_name: "Current District" },
    ];
    const result = findCurrentDistrict(districts);
    expect(result?.district_name).toBe("Current District");
  });

  test("returns undefined when no current district", () => {
    const districts = [
      { end_date: "2020-01-01", district_name: "Old District" },
    ];
    expect(findCurrentDistrict(districts)).toBeUndefined();
  });

  test("empty array → undefined", () => {
    expect(findCurrentDistrict([])).toBeUndefined();
  });
});
