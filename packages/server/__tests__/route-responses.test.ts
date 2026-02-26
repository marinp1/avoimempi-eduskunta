import { describe, expect, test } from "bun:test";
import {
  badRequest,
  jsonOrNotFound,
  notFound,
} from "../routes/route-responses";

describe("route response helpers", () => {
  test("badRequest returns 400 payload", async () => {
    const response = badRequest("Missing query");
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Missing query" });
  });

  test("notFound returns 404 payload", async () => {
    const response = notFound();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "Not found" });
  });

  test("jsonOrNotFound returns json for data and 404 for null", async () => {
    const okResponse = jsonOrNotFound({ id: 1 });
    expect(okResponse.status).toBe(200);
    expect(await okResponse.json()).toEqual({ id: 1 });

    const missingResponse = jsonOrNotFound(null, "Voting not found");
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({
      message: "Voting not found",
    });
  });
});
