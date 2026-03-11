import { describe, expect, test } from "bun:test";
import { createPartyRoutes } from "../routes/party-routes";

const mockDb: any = {
  fetchPartySummary: async () => [],
  fetchPartyMembers: async () => [],
};

const routes = createPartyRoutes(mockDb);

describe("party routes", () => {
  test("GET /api/parties/summary returns 200", async () => {
    const response = await routes["/api/parties/summary"].GET(
      new Request("https://example.test/api/parties/summary"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test("GET /api/parties/summary forwards scope params to repository", async () => {
    let received: Record<string, any> = {};
    const db: any = {
      fetchPartySummary: async (params: any) => {
        received = params;
        return [];
      },
      fetchPartyMembers: async () => [],
    };
    const localRoutes = createPartyRoutes(db);
    await localRoutes["/api/parties/summary"].GET(
      new Request(
        "https://example.test/api/parties/summary?startDate=2023-06-20&endDate=2025-04-14",
      ),
    );
    expect(received.startDate).toBe("2023-06-20");
    expect(received.endDate).toBe("2025-04-14");
  });

  test("GET /api/parties/:code/members returns 200", async () => {
    const response = await routes["/api/parties/:code/members"].GET({
      url: "https://example.test/api/parties/kesk/members",
      params: { code: "kesk" },
    } as any);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });
});
