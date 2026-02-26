import { describe, expect, test } from "bun:test";
import {
  buildDocumentIdentifierVariants,
  buildSearchQuery,
  endDateExclusive,
  paginatedResult,
} from "../database/query-helpers";

describe("database query helpers", () => {
  test("buildSearchQuery tokenizes and joins by wildcard", () => {
    expect(buildSearchQuery("  climate   act ")).toBe("climate%act");
    expect(buildSearchQuery("")).toBeNull();
    expect(buildSearchQuery("   ")).toBeNull();
    expect(buildSearchQuery(undefined)).toBeNull();
  });

  test("endDateExclusive returns next date", () => {
    expect(endDateExclusive("2025-01-31")).toBe("2025-02-01");
    expect(endDateExclusive("invalid-date")).toBeNull();
    expect(endDateExclusive(undefined)).toBeNull();
  });

  test("buildDocumentIdentifierVariants normalizes vp suffix", () => {
    expect(buildDocumentIdentifierVariants("HE 1/2025 vp")).toEqual([
      "HE 1/2025 vp",
      "HE 1/2025",
      "HE 1/2025 vp",
    ]);
    expect(buildDocumentIdentifierVariants("HE  1/2025")).toEqual([
      "HE 1/2025",
      "HE 1/2025",
      "HE 1/2025 vp",
    ]);
  });

  test("paginatedResult computes total pages", () => {
    expect(paginatedResult([{ id: 1 }], 11, 2, 10)).toEqual({
      items: [{ id: 1 }],
      totalCount: 11,
      page: 2,
      limit: 10,
      totalPages: 2,
    });
  });
});
