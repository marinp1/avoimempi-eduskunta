import { describe, expect, test } from "bun:test";
import { StorageKeyBuilder } from "../types";

describe("StorageKeyBuilder.parseKey", () => {
  test("parses standard zero-padded PK range keys", () => {
    const parsed = StorageKeyBuilder.parseKey(
      "raw/MemberOfParliament/page_000000000102+000000000201.json",
    );

    expect(parsed).toEqual({
      stage: "raw",
      table: "MemberOfParliament",
      firstPk: 102,
      lastPk: 201,
    });
  });

  test("parses PK range keys with values longer than 12 digits", () => {
    const parsed = StorageKeyBuilder.parseKey(
      "raw/SomeTable/page_1234567890123+1234567890222.json",
    );

    expect(parsed).toEqual({
      stage: "raw",
      table: "SomeTable",
      firstPk: 1234567890123,
      lastPk: 1234567890222,
    });
  });
});
