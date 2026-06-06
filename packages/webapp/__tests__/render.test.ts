import { describe, expect, test } from "bun:test";
import Edustajat from "../templates/pages/edustajat";
import RosterContent from "../templates/pages/roster-content";
import { makeRow } from "./fixtures";

const allRows = [
  makeRow({
    first_name: "Aino",
    last_name: "Aalto",
    sort_name: "Aalto, Aino",
    group_abbreviation: "kok",
    is_in_government: 1,
  }),
  makeRow({
    first_name: "Veikko",
    last_name: "Virtanen",
    sort_name: "Virtanen, Veikko",
    group_abbreviation: "sd",
    is_in_government: 0,
  }),
];

describe("pages/edustajat", () => {
  test("renders roster page with bloc bar and table", () => {
    const html = Edustajat({
      title: "Kansanedustajat",
      allRows,
      filtered: allRows,
      params: {},
    });
    expect(html).toContain("kansanedustajaa");
    expect(html).toContain("bloc-bar");
    expect(html).toContain("Aalto");
    // bloc bar segment colors come from the typed builder
    expect(html).toContain("var(--party-kok)");
  });
});

describe("pages/roster-content", () => {
  test("emits the OOB count span only when oob is set", () => {
    const withOob = RosterContent({
      allRows,
      filtered: allRows,
      params: {},
      oob: true,
    });
    expect(withOob).toContain('id="mp-count"');
    expect(withOob).toContain('hx-swap-oob="true"');

    const withoutOob = RosterContent({
      allRows,
      filtered: allRows,
      params: {},
      oob: false,
    });
    expect(withoutOob).not.toContain('hx-swap-oob="true"');
  });

  test("renders party filter chips and sortable headers", () => {
    const html = RosterContent({
      allRows,
      filtered: allRows,
      params: { sort: "party", dir: "desc" },
    });
    expect(html).toContain("Kokoomus");
    expect(html).toContain("mp-sort");
    expect(html).toContain('hx-target="#roster-content"');
  });
});
