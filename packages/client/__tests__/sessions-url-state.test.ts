import { describe, expect, test } from "bun:test";
import {
  buildSessionsUrl,
  parseSessionsUrlState,
} from "../pages/Sessions/url-state";

describe("sessions url state", () => {
  test("parses date, session, and section params", () => {
    expect(
      parseSessionsUrlState(
        "?date=2024-12-01&session=89%2F2024&section=1.2",
        "2025-01-01",
      ),
    ).toEqual({
      date: "2024-12-01",
      sessionKey: "89/2024",
      sectionKey: "1.2",
    });
  });

  test("falls back when date is missing or invalid", () => {
    expect(
      parseSessionsUrlState("?date=foo&section=1.2", "2025-01-01"),
    ).toEqual({
      date: "2025-01-01",
      sessionKey: null,
      sectionKey: "1.2",
    });
  });

  test("builds a shareable sessions url", () => {
    expect(
      buildSessionsUrl("/istunnot", "", {
        date: "2024-12-01",
        sessionKey: "89/2024",
        sectionKey: "1.2",
      }),
    ).toBe("/istunnot?date=2024-12-01&session=89%2F2024&section=1.2");
  });

  test("preserves unrelated params while clearing section selection", () => {
    expect(
      buildSessionsUrl("/istunnot", "?foo=1&section=1.2", {
        date: "2024-12-01",
        sessionKey: "89/2024",
        sectionKey: null,
      }),
    ).toBe("/istunnot?foo=1&date=2024-12-01&session=89%2F2024");
  });
});
