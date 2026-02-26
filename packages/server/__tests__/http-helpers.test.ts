import { describe, expect, test } from "bun:test";
import {
  getBoundedIntegerQueryParam,
  getIntegerQueryParam,
  getLimitOffsetQueryParams,
  getMappedOptionalQueryParams,
  getMappedPaginatedQueryParams,
  getOptionalIntegerQueryParam,
  getPageLimitQueryParams,
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
