import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routes } from "../pages";
import { refs } from "../references";

const toRouteKey = (path: string) => {
  const url = new URL(path, "https://example.test");
  return url.pathname.replace(/^\/+/, "");
};

describe("Internal link integrity", () => {
  test("refs paths map to existing client routes", () => {
    const routeKeys = new Set(Object.keys(routes));
    const samplePaths = [
      refs.member(123),
      refs.session("2024/1", "2024-01-15"),
      refs.section("2024/1/3", "2024-01-15", "2024/1"),
      refs.voting(100, "2024/1", "2024-01-15"),
    ];

    for (const path of samplePaths) {
      expect(routeKeys.has(toRouteKey(path))).toBe(true);
    }
  });

  test("refs paths are served as SPA routes by server", () => {
    const serverIndexPath = join(
      import.meta.dirname,
      "../../server/routes/static-page-routes.ts",
    );
    const source = readFileSync(serverIndexPath, "utf-8");
    const homepageRoutes = new Set(
      [...source.matchAll(/"([^"]+)":\s*homepage/g)].map((match) => match[1]),
    );

    const expectedPaths = ["/edustajat", "/istunnot", "/aanestykset"];
    for (const expectedPath of expectedPaths) {
      expect(homepageRoutes.has(expectedPath)).toBe(true);
    }
  });
});
