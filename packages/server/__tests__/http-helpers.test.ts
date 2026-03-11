import { describe, expect, test } from "bun:test";
import {
  getBoundedIntegerQueryParam,
  getIntegerQueryParam,
  getLimitOffsetQueryParams,
  getMappedOptionalQueryParams,
  getMappedPaginatedQueryParams,
  getOptionalIntegerQueryParam,
  getPageLimitQueryParams,
  validateDateRange,
} from "../routes/http";

describe("route http helpers", () => {
  test("getIntegerQueryParam falls back for invalid values", () => {
    const params = new URLSearchParams("limit=abc");
    expect(getIntegerQueryParam(params, "limit", 20)).toBe(20);
    expect(getIntegerQueryParam(params, "missing", 10)).toBe(10);
  });

  test("getBoundedIntegerQueryParam applies min and max constraints", () => {
    const params = new URLSearchParams("limit=1000&threshold=-5");
    expect(
      getBoundedIntegerQueryParam(params, "limit", {
        fallback: 20,
        min: 1,
        max: 200,
      }),
    ).toBe(200);
    expect(
      getBoundedIntegerQueryParam(params, "threshold", {
        fallback: 10,
        min: 1,
      }),
    ).toBe(1);
    expect(
      getBoundedIntegerQueryParam(params, "missing", {
        fallback: 25,
        max: 50,
      }),
    ).toBe(25);
  });

  test("getPageLimitQueryParams applies defaults and lower bounds", () => {
    const params = new URLSearchParams("page=-2&limit=0");
    expect(getPageLimitQueryParams(params)).toEqual({
      page: 1,
      limit: 1,
    });
  });

  test("getLimitOffsetQueryParams applies defaults and lower bounds", () => {
    const params = new URLSearchParams("limit=-5&offset=-1");
    expect(
      getLimitOffsetQueryParams(params, {
        limitFallback: 50,
        offsetFallback: 3,
      }),
    ).toEqual({
      limit: 1,
      offset: 0,
    });
  });

  test("getMappedOptionalQueryParams maps external keys", () => {
    const params = new URLSearchParams("q=abc&year=2025");
    expect(
      getMappedOptionalQueryParams(params, {
        query: "q",
        year: "year",
        subject: "subject",
      } as const),
    ).toEqual({
      query: "abc",
      year: "2025",
      subject: undefined,
    });
  });

  test("getMappedPaginatedQueryParams merges mapped filters and paging", () => {
    const params = new URLSearchParams("q=abc&page=2&limit=30");
    expect(
      getMappedPaginatedQueryParams(params, {
        query: "q",
      } as const),
    ).toEqual({
      query: "abc",
      page: 2,
      limit: 30,
    });
  });

  test("getOptionalIntegerQueryParam returns undefined for missing or invalid", () => {
    const params = new URLSearchParams("personId=42&bad=oops");
    expect(getOptionalIntegerQueryParam(params, "personId")).toBe(42);
    expect(getOptionalIntegerQueryParam(params, "bad")).toBeUndefined();
    expect(getOptionalIntegerQueryParam(params, "missing")).toBeUndefined();
  });
});

describe("validateDateRange", () => {
  test("returns null when no date params are present", () => {
    const params = new URLSearchParams("q=test");
    expect(validateDateRange(params)).toBeNull();
  });

  test("returns null for valid YYYY-MM-DD dates", () => {
    const params = new URLSearchParams(
      "startDate=2024-01-01&endDate=2024-12-31",
    );
    expect(validateDateRange(params)).toBeNull();
  });

  test("returns 400 for non-ISO startDate", async () => {
    const params = new URLSearchParams("startDate=01-01-2024");
    const result = validateDateRange(params);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
    await expect(result!.json()).resolves.toMatchObject({
      message: expect.stringContaining("startDate"),
    });
  });

  test("returns 400 for non-ISO endDate", async () => {
    const params = new URLSearchParams("endDate=2024/12/31");
    const result = validateDateRange(params);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
  });

  test("returns 400 for partial date string", async () => {
    const params = new URLSearchParams("startDate=2024-01");
    const result = validateDateRange(params);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(400);
  });

  test("allows one date param without the other", () => {
    const paramsStart = new URLSearchParams("startDate=2024-06-01");
    expect(validateDateRange(paramsStart)).toBeNull();

    const paramsEnd = new URLSearchParams("endDate=2024-06-30");
    expect(validateDateRange(paramsEnd)).toBeNull();
  });
});
