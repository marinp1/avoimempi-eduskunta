import { describe, expect, test } from "bun:test";
import {
  age,
  applyFilters,
  buildHref,
  districtShort,
  esc,
  pct,
  pctNum,
  sortClass,
  sortHref,
} from "../templates/helpers";
import { makeRow } from "./fixtures";

describe("applyFilters", () => {
  const rows = [
    makeRow({
      first_name: "Aino",
      last_name: "Aalto",
      sort_name: "Aalto, Aino",
      group_abbreviation: "kok",
      is_in_government: 1,
      district_name: "Helsingin vaalipiiri",
      birth_year: 1980,
      participation_rate: 95,
    }),
    makeRow({
      first_name: "Veikko",
      last_name: "Virtanen",
      sort_name: "Virtanen, Veikko",
      group_abbreviation: "sd",
      is_in_government: 0,
      district_name: "Uudenmaan vaalipiiri",
      birth_year: 1960,
      participation_rate: 80,
    }),
  ];

  test("filters by name query (case-insensitive)", () => {
    expect(applyFilters(rows, { q: "aino" })).toHaveLength(1);
    expect(applyFilters(rows, { q: "AALTO" })[0].last_name).toBe("Aalto");
  });

  test("filters by district query", () => {
    const result = applyFilters(rows, { q: "uudenmaan" });
    expect(result).toHaveLength(1);
    expect(result[0].last_name).toBe("Virtanen");
  });

  test("filters by party, ignoring 'all'", () => {
    expect(applyFilters(rows, { party: "sd" })).toHaveLength(1);
    expect(applyFilters(rows, { party: "all" })).toHaveLength(2);
  });

  test("filters by bloc", () => {
    expect(applyFilters(rows, { bloc: "hallitus" })[0].last_name).toBe("Aalto");
    expect(applyFilters(rows, { bloc: "oppositio" })[0].last_name).toBe(
      "Virtanen",
    );
  });

  test("sorts by party with direction", () => {
    const asc = applyFilters(rows, { sort: "party", dir: "asc" });
    expect(asc.map((r) => r.group_abbreviation)).toEqual(["kok", "sd"]);
    const desc = applyFilters(rows, { sort: "party", dir: "desc" });
    expect(desc.map((r) => r.group_abbreviation)).toEqual(["sd", "kok"]);
  });

  test("sorts by age (birth_year)", () => {
    const asc = applyFilters(rows, { sort: "age", dir: "asc" });
    expect(asc[0].birth_year).toBe(1980);
  });

  test("sorts by attendance", () => {
    const asc = applyFilters(rows, { sort: "att", dir: "asc" });
    expect(asc[0].participation_rate).toBe(80);
  });

  test("does not mutate the input array", () => {
    const input = [...rows];
    applyFilters(input, { sort: "party", dir: "desc" });
    expect(input).toEqual(rows);
  });
});

describe("buildHref", () => {
  test("returns bare path when only defaults", () => {
    expect(buildHref({})).toBe("/edustajat");
    expect(buildHref({ party: "all", sort: "name", dir: "asc" })).toBe(
      "/edustajat",
    );
  });

  test("includes and encodes non-default params", () => {
    expect(buildHref({ q: "a b", party: "kok" })).toBe(
      "/edustajat?q=a%20b&party=kok",
    );
    expect(buildHref({ bloc: "oppositio", sort: "age", dir: "desc" })).toBe(
      "/edustajat?bloc=oppositio&sort=age&dir=desc",
    );
  });
});

describe("sortHref", () => {
  test("toggles direction on the active column", () => {
    expect(sortHref({ sort: "name" }, "name")).toBe("/edustajat?dir=desc");
    expect(sortHref({ sort: "name", dir: "desc" }, "name")).toBe("/edustajat");
  });

  test("defaults a new column to ascending", () => {
    expect(sortHref({ sort: "name" }, "age")).toBe("/edustajat?sort=age");
  });
});

describe("sortClass", () => {
  test("marks the active column with direction", () => {
    expect(sortClass({}, "name")).toBe("mp-sort is-asc");
    expect(sortClass({ sort: "name", dir: "desc" }, "name")).toBe(
      "mp-sort is-desc",
    );
    expect(sortClass({ sort: "age" }, "name")).toBe("mp-sort");
  });

  test("appends right-align modifier", () => {
    expect(sortClass({ sort: "age" }, "age", true)).toBe("mp-sort ta-r is-asc");
  });
});

describe("formatters", () => {
  test("age handles null", () => {
    expect(age(null)).toBe("—");
    expect(age(new Date().getFullYear() - 30)).toBe("30");
  });

  test("districtShort strips ' vaalipiiri' suffix and trailing genitive n", () => {
    expect(districtShort(null)).toBe("—");
    expect(districtShort("Uudenmaan vaalipiiri")).toBe("Uudenmaa");
  });

  test("pct / pctNum guard divide-by-zero", () => {
    expect(pct(0, 0)).toBe("0%");
    expect(pct(1, 4)).toBe("25.0%");
    expect(pctNum(0, 0)).toBe("0");
    expect(pctNum(1, 4)).toBe("25.0");
  });

  test("esc escapes HTML metacharacters", () => {
    expect(esc(`a&b<c>"d`)).toBe("a&amp;b&lt;c&gt;&quot;d");
    expect(esc(null)).toBe("");
    expect(esc(42)).toBe("42");
  });
});
