import { describe, expect, test } from "bun:test";
import { validateNumericId } from "../routes/webapp/validators";

describe("validateNumericId", () => {
  test('"123" → "123"', () => {
    expect(validateNumericId("123")).toBe("123");
  });

  test('"12a" → null', () => {
    expect(validateNumericId("12a")).toBeNull();
  });

  test("undefined → null", () => {
    expect(validateNumericId(undefined)).toBeNull();
  });

  test('"" → null', () => {
    expect(validateNumericId("")).toBeNull();
  });

  test("null → null", () => {
    expect(validateNumericId(null)).toBeNull();
  });
});
