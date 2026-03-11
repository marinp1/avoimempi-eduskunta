import { describe, expect, test } from "bun:test";
import { createSessionRoutes } from "../routes/session-routes";

function makeRequest(url: string): Request {
  return new Request(`https://example.test${url}`);
}

const mockDb: any = {
  fetchSessions: () => ({ sessions: [], totalCount: 0, page: 1, limit: 20, totalPages: 0 }),
  fetchSessionByDate: () => [],
  fetchSessionWithSectionsByDate: () => [],
  fetchDocumentsBySessionKeys: () => new Map(),
  fetchNoticesBySessionKeys: () => new Map(),
  fetchLatestSpeechDate: () => null,
  fetchSpeechesByDate: () => [],
  fetchSessionDates: () => [],
  fetchCompletedSessionDates: () => [],
  fetchSectionByKey: () => null,
  fetchSectionSpeeches: () => ({ speeches: [], totalCount: 0 }),
  fetchSectionVotings: () => [],
  fetchSectionSubSections: () => [],
  fetchSectionRollCall: () => null,
  fetchSectionDocumentLinks: () => [],
};

const routes = createSessionRoutes(mockDb);

describe("session routes", () => {
  test("GET /api/sessions returns 200 with sessions object", async () => {
    const response = await routes["/api/sessions"].GET(makeRequest("/api/sessions"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ sessions: [], totalCount: 0 });
  });

  test("GET /api/session-dates returns 200", async () => {
    const response = await routes["/api/session-dates"].GET(makeRequest("/api/session-dates"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  test("GET /api/session-dates/completed returns 200", async () => {
    const response = await routes["/api/session-dates/completed"].GET(
      makeRequest("/api/session-dates/completed"),
    );
    expect(response.status).toBe(200);
  });

  test("GET /api/day/:date/sessions uses batch queries and returns sessions array", async () => {
    const db = {
      ...mockDb,
      fetchSessionWithSectionsByDate: () => [
        { key: "2024/1", date: "2024-01-15", sections: [], section_count: 0, voting_count: 0 },
        { key: "2024/2", date: "2024-01-15", sections: [], section_count: 0, voting_count: 0 },
      ],
      fetchDocumentsBySessionKeys: (keys: string[]) => {
        expect(keys).toHaveLength(2); // batch: both sessions at once
        return new Map();
      },
      fetchNoticesBySessionKeys: (keys: string[]) => {
        expect(keys).toHaveLength(2);
        return new Map();
      },
    };
    const localRoutes = createSessionRoutes(db);
    const response = await localRoutes["/api/day/:date/sessions"].GET({
      url: "https://example.test/api/day/2024-01-15/sessions",
      params: { date: "2024-01-15" },
    } as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sessions).toHaveLength(2);
    expect(body.sessions[0]).toHaveProperty("documents");
    expect(body.sessions[0]).toHaveProperty("notices");
  });

  test("GET /api/sections/:sectionKey returns 404 for unknown key", async () => {
    const response = await routes["/api/sections/:sectionKey"].GET({
      url: "https://example.test/api/sections/unknown",
      params: { sectionKey: "unknown" },
    } as any);
    expect(response.status).toBe(404);
  });
});
