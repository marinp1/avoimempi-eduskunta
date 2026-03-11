import { describe, expect, test } from "bun:test";
import { createHomeRoutes } from "../routes/home-routes";

describe("home routes", () => {
  test("overview forwards scope query params to repository", async () => {
    let receivedParams: Record<string, string | undefined> = {};
    const homeRoutes = createHomeRoutes({
      fetchOverview: async (params) => {
        receivedParams = params;
        return {
          scope: {
            asOfDate: params.asOfDate ?? "2025-02-01",
            startDate: params.startDate ?? null,
            endDate: params.endDate ?? null,
            governmentName: params.governmentName ?? null,
            governmentStartDate: params.governmentStartDate ?? null,
            latestCompletedSessionDate: null,
          },
          freshness: {
            lastMigrationTimestamp: null,
            lastScraperRunAt: null,
            lastMigratorRunAt: null,
          },
          composition: {
            totalMembers: 200,
            governmentMembers: 101,
            oppositionMembers: 99,
            partyCount: 8,
            parties: [],
          },
          latestDay: {
            date: null,
            vaskiLatestSpeechDate: null,
            sessions: [],
          },
          signals: {
            recentActivity: [],
            closeVotes: [],
            speechActivity: [],
            coalitionOpposition: [],
          },
        };
      },
    });

    const response = await homeRoutes["/api/home/overview"].GET(
      new Request(
        "https://example.test/api/home/overview?asOfDate=2025-02-01&startDate=2024-06-01&endDate=2025-03-01&governmentName=Testi&governmentStartDate=2024-06-20",
      ),
    );

    expect(response.status).toBe(200);
    expect(receivedParams).toEqual({
      asOfDate: "2025-02-01",
      startDate: "2024-06-01",
      endDate: "2025-03-01",
      governmentName: "Testi",
      governmentStartDate: "2024-06-20",
    });
    await expect(response.json()).resolves.toMatchObject({
      composition: {
        totalMembers: 200,
      },
      latestDay: {
        sessions: [],
      },
    });
  });
});
