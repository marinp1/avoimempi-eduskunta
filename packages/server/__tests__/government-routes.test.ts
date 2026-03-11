import { describe, expect, test } from "bun:test";
import { createGovernmentRoutes } from "../routes/government-routes";

const mockDb: any = {
  fetchGovernments: () => [],
  fetchGovernmentByDate: () => null,
  fetchGovernmentMembers: () => [],
};

const routes = createGovernmentRoutes(mockDb);

describe("government routes", () => {
  test("GET /api/hallitukset returns 200 with array", async () => {
    const response = await routes["/api/hallitukset"].GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test("GET /api/hallitukset/active returns 200 with null government when none found", async () => {
    const response = await routes["/api/hallitukset/active"].GET({
      url: "https://example.test/api/hallitukset/active?date=2024-01-15",
      params: {},
    } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ government: null, members: [] });
  });

  test("GET /api/hallitukset/active rejects invalid date", async () => {
    const response = await routes["/api/hallitukset/active"].GET({
      url: "https://example.test/api/hallitukset/active?date=not-a-date",
      params: {},
    } as any);
    expect(response.status).toBe(400);
  });

  test("GET /api/hallitukset/active returns government and members when found", async () => {
    const db: any = {
      fetchGovernments: () => [],
      fetchGovernmentByDate: () => ({
        id: 1,
        name: "Orpon hallitus",
        start_date: "2023-06-20",
        end_date: null,
      }),
      fetchGovernmentMembers: () => [
        { person_id: 1000, name: "Valtiovarainministeri" },
      ],
    };
    const localRoutes = createGovernmentRoutes(db);
    const response = await localRoutes["/api/hallitukset/active"].GET({
      url: "https://example.test/api/hallitukset/active?date=2024-01-15",
      params: {},
    } as any);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      government: Record<string, unknown> | null;
      members: unknown[];
    };
    expect(body.government).not.toBeNull();
    expect(body.members).toHaveLength(1);
  });

  test("GET /api/hallitukset/:id/members rejects non-numeric id", async () => {
    const response = await routes["/api/hallitukset/:id/members"].GET({
      url: "https://example.test/api/hallitukset/abc/members",
      params: { id: "abc" },
    } as any);
    expect(response.status).toBe(400);
  });

  test("GET /api/hallitukset/:id/members returns 200 with members array", async () => {
    const response = await routes["/api/hallitukset/:id/members"].GET({
      url: "https://example.test/api/hallitukset/1/members",
      params: { id: "1" },
    } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
