import { describe, expect, test } from "bun:test";
import { createPersonRoutes } from "../routes/person-routes";

const personRoutes = createPersonRoutes({
  fetchPersonSearch: (params: {
    q: string;
    limit?: number;
    date?: string | null;
  }) => [
    {
      person_id: 1000,
      first_name: "Matti",
      last_name: "Meikäläinen",
      sort_name: "Meikäläinen Matti",
      birth_date: "1970-01-15",
      death_date: null,
      profession: null,
      latest_party_name: "Keskustan eduskuntaryhmä",
      first_term_start: "2023-04-01",
      last_term_end: null,
      latest_active_date: "2026-03-10",
      is_current_mp: 1,
      is_active_on_selected_date: params.date ? 1 : 0,
    },
  ],
  fetchPersonGroupMemberships: () => [],
  fetchPersonTerms: () => [],
  fetchPersonVotes: () => [],
  fetchRepresentativeDetails: () => null,
  fetchRepresentativeDistricts: () => [],
  fetchLeavingParliamentRecords: () => [],
  fetchTrustPositions: () => [],
  fetchGovernmentMemberships: () => [],
  fetchGovernmentPeriods: () => [],
  fetchPersonSpeeches: () => ({ speeches: [], total: 0 }),
  fetchPersonQuestions: () => [],
  fetchPersonCommittees: () => [],
  fetchPersonDissents: () => [],
} as any);

describe("person routes", () => {
  test("person search rejects too-short query", async () => {
    const response = await personRoutes["/api/person/search"].GET(
      new Request("https://example.test/api/person/search?q=a"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Query must be at least 2 characters",
    });
  });

  test("person search returns typed results", async () => {
    const response = await personRoutes["/api/person/search"].GET(
      new Request(
        "https://example.test/api/person/search?q=meika&date=2024-01-15&limit=5",
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        person_id: 1000,
        first_name: "Matti",
        is_active_on_selected_date: 1,
      }),
    ]);
  });
});
