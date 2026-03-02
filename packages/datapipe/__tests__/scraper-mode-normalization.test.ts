import { describe, expect, test } from "bun:test";
import { normalizeScrapeMode } from "../scraper/scraper";

describe("normalizeScrapeMode", () => {
  test("maps legacy continue mode to auto-resume", () => {
    expect(normalizeScrapeMode("continue")).toEqual({ type: "auto-resume" });
    expect(normalizeScrapeMode({ type: "continue" })).toEqual({
      type: "auto-resume",
    });
  });

  test("keeps valid start-from-pk and patch-from-pk", () => {
    expect(
      normalizeScrapeMode({ type: "start-from-pk", pkStartValue: 42 }),
    ).toEqual({ type: "start-from-pk", pkStartValue: 42 });

    expect(
      normalizeScrapeMode({ type: "patch-from-pk", pkStartValue: 1337 }),
    ).toEqual({ type: "patch-from-pk", pkStartValue: 1337 });
  });

  test("supports range and single-pk payloads", () => {
    expect(
      normalizeScrapeMode({
        type: "range",
        pkStartValue: 100,
        pkEndValue: 150,
      }),
    ).toEqual({ type: "range", pkStartValue: 100, pkEndValue: 150 });

    expect(normalizeScrapeMode({ type: "single-pk", pkValue: 77 })).toEqual({
      type: "range",
      pkStartValue: 77,
      pkEndValue: 77,
    });
  });

  test("falls back to auto-resume for invalid mode payloads", () => {
    expect(normalizeScrapeMode({ type: "start-from-pk" })).toEqual({
      type: "auto-resume",
    });
    expect(
      normalizeScrapeMode({ type: "patch-from-pk", pkStartValue: -1 }),
    ).toEqual({ type: "auto-resume" });
    expect(
      normalizeScrapeMode({
        type: "range",
        pkStartValue: 10,
        pkEndValue: 9,
      }),
    ).toEqual({ type: "auto-resume" });
    expect(normalizeScrapeMode("full")).toEqual({ type: "auto-resume" });
    expect(normalizeScrapeMode(undefined)).toEqual({ type: "auto-resume" });
  });
});
