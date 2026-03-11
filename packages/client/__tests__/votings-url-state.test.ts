import { describe, expect, test } from "bun:test";
import {
  buildVotingsUrl,
  DEFAULT_VOTINGS_PHASE,
  DEFAULT_VOTINGS_SESSION,
  DEFAULT_VOTINGS_SORT,
  parseVotingsUrlState,
} from "../pages/Votings/url-state";

describe("votings url state", () => {
  test("parses all supported params", () => {
    expect(
      parseVotingsUrlState(
        "?q=budjetti&session=89%2F2024&phase=Toinen%20k%C3%A4sittely&sort=closest&voting=123",
      ),
    ).toEqual({
      query: "budjetti",
      session: "89/2024",
      phase: "Toinen käsittely",
      sort: "closest",
      voting: 123,
    });
  });

  test("falls back to defaults for missing or invalid values", () => {
    expect(parseVotingsUrlState("?sort=nope&voting=foo")).toEqual({
      query: "",
      session: DEFAULT_VOTINGS_SESSION,
      phase: DEFAULT_VOTINGS_PHASE,
      sort: DEFAULT_VOTINGS_SORT,
      voting: null,
    });
  });

  test("builds a shareable URL while omitting defaults", () => {
    expect(
      buildVotingsUrl("/aanestykset", "", {
        query: "budjetti",
        session: "89/2024",
        phase: DEFAULT_VOTINGS_PHASE,
        sort: DEFAULT_VOTINGS_SORT,
        voting: 123,
      }),
    ).toBe("/aanestykset?q=budjetti&session=89%2F2024&voting=123");
  });

  test("preserves unrelated params while updating voting state", () => {
    expect(
      buildVotingsUrl("/aanestykset", "?foo=1&sort=oldest", {
        query: "",
        session: DEFAULT_VOTINGS_SESSION,
        phase: "Ensimmäinen käsittely",
        sort: "largest",
        voting: null,
      }),
    ).toBe("/aanestykset?foo=1&sort=largest&phase=Ensimm%C3%A4inen+k%C3%A4sittely");
  });
});
