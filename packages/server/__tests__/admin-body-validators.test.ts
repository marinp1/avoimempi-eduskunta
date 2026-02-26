import { describe, expect, test } from "bun:test";
import {
  parseParserBulkStartBody,
  parseParserStartBody,
  parseScraperBulkStartBody,
  parseScraperStartBody,
} from "../routes/admin/body-validators";

const createJsonRequest = (body: unknown) =>
  new Request("http://localhost/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

describe("admin body validators", () => {
  test("scraper start validates tableName", async () => {
    const missing = await parseScraperStartBody(createJsonRequest({}));
    expect(missing.ok).toBe(false);
    if (missing.ok === false) {
      expect(missing.error).toBe("tableName is required");
    }

    const valid = await parseScraperStartBody(
      createJsonRequest({ tableName: "MemberOfParliament", mode: "full" }),
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.tableName).toBe("MemberOfParliament");
      expect(valid.value.mode).toBe("full");
    }
  });

  test("parser start validates tableName", async () => {
    const missing = await parseParserStartBody(createJsonRequest({}));
    expect(missing.ok).toBe(false);
    if (missing.ok === false) {
      expect(missing.error).toBe("tableName is required");
    }

    const valid = await parseParserStartBody(
      createJsonRequest({ tableName: "SaliDBAanestys" }),
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.value.tableName).toBe("SaliDBAanestys");
    }
  });

  test("bulk validators reject invalid payloads", async () => {
    const missing = await parseScraperBulkStartBody(createJsonRequest({}));
    expect(missing.ok).toBe(false);
    if (missing.ok === false) {
      expect(missing.error).toBe("tableNames array is required");
    }

    const empty = await parseParserBulkStartBody(
      createJsonRequest({ tableNames: [] }),
    );
    expect(empty.ok).toBe(false);
    if (empty.ok === false) {
      expect(empty.error).toBe("tableNames array cannot be empty");
    }

    const nonString = await parseParserBulkStartBody(
      createJsonRequest({ tableNames: ["A", 123] }),
    );
    expect(nonString.ok).toBe(false);
    if (nonString.ok === false) {
      expect(nonString.error).toBe("tableNames must contain non-empty strings");
    }

    const invalidForce = await parseParserBulkStartBody(
      createJsonRequest({ tableNames: ["A"], force: "yes" }),
    );
    expect(invalidForce.ok).toBe(false);
    if (invalidForce.ok === false) {
      expect(invalidForce.error).toBe("force must be a boolean");
    }
  });

  test("bulk validators accept valid payloads", async () => {
    const scraper = await parseScraperBulkStartBody(
      createJsonRequest({ tableNames: ["A", "B"], mode: "continue" }),
    );
    expect(scraper.ok).toBe(true);
    if (scraper.ok) {
      expect(scraper.value.tableNames).toEqual(["A", "B"]);
      expect(scraper.value.mode).toBe("continue");
    }

    const parser = await parseParserBulkStartBody(
      createJsonRequest({ tableNames: ["A"], force: true }),
    );
    expect(parser.ok).toBe(true);
    if (parser.ok) {
      expect(parser.value.tableNames).toEqual(["A"]);
      expect(parser.value.force).toBe(true);
    }
  });
});
