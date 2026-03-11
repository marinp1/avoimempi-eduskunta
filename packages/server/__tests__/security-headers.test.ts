import { describe, expect, test } from "bun:test";
import {
  addSecurityHeaders,
  withSecurityHeaders,
} from "../middleware/security-headers";

const REQUIRED_HEADERS = [
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "content-security-policy",
];

describe("security headers", () => {
  describe("addSecurityHeaders", () => {
    test("adds all required security headers to a response", () => {
      const base = Response.json({ ok: true });
      const secured = addSecurityHeaders(base);

      for (const header of REQUIRED_HEADERS) {
        expect(secured.headers.get(header)).not.toBeNull();
      }
    });

    test("preserves original status and body", async () => {
      const base = Response.json({ value: 42 }, { status: 201 });
      const secured = addSecurityHeaders(base);

      expect(secured.status).toBe(201);
      expect(await secured.json()).toEqual({ value: 42 });
    });

    test("X-Content-Type-Options is nosniff", () => {
      const secured = addSecurityHeaders(new Response("ok"));
      expect(secured.headers.get("x-content-type-options")).toBe("nosniff");
    });

    test("X-Frame-Options is DENY", () => {
      const secured = addSecurityHeaders(new Response("ok"));
      expect(secured.headers.get("x-frame-options")).toBe("DENY");
    });
  });

  describe("withSecurityHeaders", () => {
    test("wraps GET handlers and injects security headers", async () => {
      const routes = withSecurityHeaders({
        "/api/test": {
          GET: async (_req: Request) => Response.json({ ok: true }),
        },
      });

      const handler = (
        routes["/api/test"] as { GET: (r: Request) => Promise<Response> }
      ).GET;
      const response = await handler(new Request("http://localhost/api/test"));

      for (const header of REQUIRED_HEADERS) {
        expect(response.headers.get(header)).not.toBeNull();
      }
    });

    test("wraps static Response instances", () => {
      const routes = withSecurityHeaders({
        "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
      });

      const value = routes["/api/*"] as Response;
      expect(value).toBeInstanceOf(Response);
      for (const header of REQUIRED_HEADERS) {
        expect(value.headers.get(header)).not.toBeNull();
      }
    });
  });
});
