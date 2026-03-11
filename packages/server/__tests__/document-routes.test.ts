import { describe, expect, test } from "bun:test";
import { createCommitteeLegislativeRoutes } from "../routes/documents/committee-legislative-routes";
import { createInterpellationGovernmentRoutes } from "../routes/documents/interpellation-government-routes";
import { createQuestionFamilyRoutes } from "../routes/documents/question-family-routes";

// Minimal stub covering all methods used across the document route families
const mockDb: any = {
  fetchInterpellations: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchInterpellationsSubjects: async () => [],
  fetchInterpellationYears: async () => [],
  fetchInterpellationByIdentifier: async () => null,
  fetchInterpellationById: async () => null,
  fetchGovernmentProposals: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchGovernmentProposalsSubjects: async () => [],
  fetchGovernmentProposalYears: async () => [],
  fetchGovernmentProposalByIdentifier: async () => null,
  fetchGovernmentProposalById: async () => null,
  fetchCommitteeReports: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchCommitteeReportYears: async () => [],
  fetchCommitteeReportSourceCommittees: async () => [],
  fetchCommitteeReportRecipientCommittees: async () => [],
  fetchCommitteeReportByIdentifier: async () => null,
  fetchCommitteeReportById: async () => null,
  fetchLegislativeInitiatives: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchLegislativeInitiativesSubjects: async () => [],
  fetchLegislativeInitiativeYears: async () => [],
  fetchLegislativeInitiativeByIdentifier: async () => null,
  fetchLegislativeInitiativeById: async () => null,
  fetchWrittenQuestions: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchWrittenQuestionsSubjects: async () => [],
  fetchWrittenQuestionYears: async () => [],
  fetchWrittenQuestionByIdentifier: async () => null,
  fetchWrittenQuestionById: async () => null,
  fetchExpertStatements: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchExpertStatementYears: async () => [],
  fetchExpertStatementCommittees: async () => [],
  fetchExpertStatementsByBill: async () => [],
  fetchWrittenQuestionResponses: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchWrittenQuestionResponseYears: async () => [],
  fetchOralQuestions: async () => ({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  }),
  fetchOralQuestionsSubjects: async () => [],
  fetchOralQuestionYears: async () => [],
  fetchOralQuestionByIdentifier: async () => null,
  fetchOralQuestionById: async () => null,
};

const interpellationRoutes = createInterpellationGovernmentRoutes(mockDb);
const committeeRoutes = createCommitteeLegislativeRoutes(mockDb);
const questionRoutes = createQuestionFamilyRoutes(mockDb);

describe("interpellation and government proposal routes", () => {
  test("GET /api/interpellations returns 200", async () => {
    const res = await interpellationRoutes["/api/interpellations"].GET(
      new Request("https://example.test/api/interpellations"),
    );
    expect(res.status).toBe(200);
  });

  test("GET /api/interpellations/by-identifier/:identifier returns 404 for unknown", async () => {
    const res = await interpellationRoutes[
      "/api/interpellations/by-identifier/:identifier"
    ].GET({
      url: "https://example.test/api/interpellations/by-identifier/VK+1%2F2024+vp",
      params: { identifier: "VK+1%2F2024+vp" },
    } as any);
    expect(res.status).toBe(404);
  });

  test("GET /api/interpellations/by-identifier/:identifier returns 400 for empty identifier", async () => {
    const res = await interpellationRoutes[
      "/api/interpellations/by-identifier/:identifier"
    ].GET({
      url: "https://example.test/api/interpellations/by-identifier/%20",
      params: { identifier: "%20" },
    } as any);
    expect(res.status).toBe(400);
  });

  test("GET /api/interpellations rejects invalid date format", async () => {
    const res = await interpellationRoutes["/api/interpellations"].GET(
      new Request(
        "https://example.test/api/interpellations?startDate=01-01-2024",
      ),
    );
    expect(res.status).toBe(400);
  });

  test("GET /api/government-proposals returns 200", async () => {
    const res = await interpellationRoutes["/api/government-proposals"].GET(
      new Request("https://example.test/api/government-proposals"),
    );
    expect(res.status).toBe(200);
  });

  test("GET /api/government-proposals/by-identifier/:identifier returns 400 for empty identifier", async () => {
    const res = await interpellationRoutes[
      "/api/government-proposals/by-identifier/:identifier"
    ].GET({
      url: "https://example.test/api/government-proposals/by-identifier/%20",
      params: { identifier: "%20" },
    } as any);
    expect(res.status).toBe(400);
  });
});

describe("committee and legislative initiative routes", () => {
  test("GET /api/committee-reports returns 200", async () => {
    const res = await committeeRoutes["/api/committee-reports"].GET(
      new Request("https://example.test/api/committee-reports"),
    );
    expect(res.status).toBe(200);
  });

  test("GET /api/committee-reports rejects invalid date format", async () => {
    const res = await committeeRoutes["/api/committee-reports"].GET(
      new Request(
        "https://example.test/api/committee-reports?endDate=2024/12/31",
      ),
    );
    expect(res.status).toBe(400);
  });

  test("GET /api/committee-reports/by-identifier/:identifier returns 400 for empty identifier", async () => {
    const res = await committeeRoutes[
      "/api/committee-reports/by-identifier/:identifier"
    ].GET({
      url: "https://example.test/api/committee-reports/by-identifier/%20",
      params: { identifier: "%20" },
    } as any);
    expect(res.status).toBe(400);
  });

  test("GET /api/legislative-initiatives returns 200", async () => {
    const res = await committeeRoutes["/api/legislative-initiatives"].GET(
      new Request("https://example.test/api/legislative-initiatives"),
    );
    expect(res.status).toBe(200);
  });
});

describe("question family routes", () => {
  test("GET /api/written-questions returns 200", async () => {
    const res = await questionRoutes["/api/written-questions"].GET(
      new Request("https://example.test/api/written-questions"),
    );
    expect(res.status).toBe(200);
  });

  test("GET /api/written-questions rejects invalid date format", async () => {
    const res = await questionRoutes["/api/written-questions"].GET(
      new Request(
        "https://example.test/api/written-questions?startDate=not-a-date",
      ),
    );
    expect(res.status).toBe(400);
  });

  test("GET /api/written-questions/by-identifier/:identifier returns 400 for empty identifier", async () => {
    const res = await questionRoutes[
      "/api/written-questions/by-identifier/:identifier"
    ].GET({
      url: "https://example.test/api/written-questions/by-identifier/%20",
      params: { identifier: "%20" },
    } as any);
    expect(res.status).toBe(400);
  });

  test("GET /api/oral-questions returns 200", async () => {
    const res = await questionRoutes["/api/oral-questions"].GET(
      new Request("https://example.test/api/oral-questions"),
    );
    expect(res.status).toBe(200);
  });

  test("GET /api/expert-statements returns 200", async () => {
    const res = await questionRoutes["/api/expert-statements"].GET(
      new Request("https://example.test/api/expert-statements"),
    );
    expect(res.status).toBe(200);
  });

  test("GET /api/expert-statements/by-bill returns 400 for missing identifier", async () => {
    const res = await questionRoutes["/api/expert-statements/by-bill"].GET(
      new Request("https://example.test/api/expert-statements/by-bill"),
    );
    expect(res.status).toBe(400);
  });

  test("GET /api/written-question-responses returns 200", async () => {
    const res = await questionRoutes["/api/written-question-responses"].GET(
      new Request("https://example.test/api/written-question-responses"),
    );
    expect(res.status).toBe(200);
  });
});
