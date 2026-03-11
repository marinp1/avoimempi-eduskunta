import { describe, expect, test } from "bun:test";
import { createVotingRoutes } from "../routes/voting-routes";

describe("voting routes", () => {
  test("overview forwards scope params to repository", async () => {
    let receivedParams: Record<string, string | undefined> = {};

    const routes = createVotingRoutes({
      fetchVotingOverview: async (params: {
        startDate?: string;
        endDate?: string;
      }) => {
        receivedParams = params;
        return {
          metrics: {
            total_votings: 10,
            close_votings: 2,
            latest_session_key: "89/2024",
            phase_count: 3,
          },
          facets: {
            phases: [{ value: "Toinen käsittely", count: 4 }],
            sessions: [{ value: "89/2024", count: 6 }],
          },
          sections: {
            recent: [],
            close: [],
            turnout: [],
          },
        };
      },
      browseVotings: () => [],
      fetchRecentVotings: () => [],
      queryVotings: () => [],
      fetchVotingsByDocument: () => [],
      fetchDocumentRelations: () => [],
      fetchVotingById: () => null,
      fetchVotingInlineDetails: () => null,
    } as any);

    const response = await routes["/api/votings/overview"].GET({
      url: "https://example.test/api/votings/overview?startDate=2024-06-01&endDate=2025-03-01",
      params: {},
      cookies: {
        get: () => undefined,
        getAll: () => [],
        has: () => false,
      },
    } as any);

    expect(response.status).toBe(200);
    expect(receivedParams).toEqual({
      startDate: "2024-06-01",
      endDate: "2025-03-01",
    });
    await expect(response.json()).resolves.toMatchObject({
      metrics: {
        total_votings: 10,
      },
      sections: {
        recent: [],
      },
    });
  });
});
