import type { BunRequest } from "bun";
import {
  getBoundedIntegerQueryParam,
  getMappedOptionalQueryParams,
  getOptionalIntegerQueryParam,
  getSearchParams,
} from "./http";

const dateRangeQueryParamMap = {
  startDate: "startDate",
  endDate: "endDate",
} as const;

type InsightAnalyticsDataAccess = {
  fetchVotingParticipation: (params?: {
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchVotingParticipationByGovernment: (params: {
    personId: string;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchGenderDivisionOverTime: () => unknown;
  fetchAgeDivisionOverTime: () => unknown;
  fetchPartyParticipationByGovernment: (params?: {
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchPartyDiscipline: (params?: {
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchCloseVotes: (params: {
    threshold?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchMpActivityRanking: (params: { limit?: number }) => unknown;
  fetchCoalitionVsOpposition: (params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchDissentTracking: (params: {
    personId?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchSpeechActivity: (params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchCommitteeOverview: () => unknown;
  fetchRecentActivity: (params: { limit?: number }) => unknown;
};

export const createInsightAnalyticsRoutes = (
  db: InsightAnalyticsDataAccess,
) => ({
  "/api/insights/participation": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const participation = await db.fetchVotingParticipation(params);
      return Response.json(participation);
    },
  },

  "/api/insights/participation/:personId/by-government": {
    GET: async (
      req: BunRequest<"/api/insights/participation/:personId/by-government">,
    ) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const participation = await db.fetchVotingParticipationByGovernment({
        personId: req.params.personId,
        ...params,
      });
      return Response.json(participation);
    },
  },

  "/api/insights/gender-division": {
    GET: async () => {
      const genderDivision = await db.fetchGenderDivisionOverTime();
      return Response.json(genderDivision);
    },
  },

  "/api/insights/age-division": {
    GET: async () => {
      const ageDivision = await db.fetchAgeDivisionOverTime();
      return Response.json(ageDivision);
    },
  },

  "/api/insights/party-participation-by-government": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const partyParticipation =
        await db.fetchPartyParticipationByGovernment(params);
      return Response.json(partyParticipation);
    },
  },

  "/api/analytics/party-discipline": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchPartyDiscipline(params);
      return Response.json(data);
    },
  },

  "/api/analytics/close-votes": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const threshold = getBoundedIntegerQueryParam(searchParams, "threshold", {
        fallback: 10,
        min: 1,
        max: 200,
      });
      const limit = getBoundedIntegerQueryParam(searchParams, "limit", {
        fallback: 50,
        min: 1,
        max: 500,
      });
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchCloseVotes({
        threshold,
        limit,
        ...params,
      });
      return Response.json(data);
    },
  },

  "/api/analytics/mp-activity": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const limit = getBoundedIntegerQueryParam(searchParams, "limit", {
        fallback: 50,
        min: 1,
        max: 500,
      });
      const data = await db.fetchMpActivityRanking({ limit });
      return Response.json(data);
    },
  },

  "/api/analytics/coalition-opposition": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const limit = getBoundedIntegerQueryParam(searchParams, "limit", {
        fallback: 50,
        min: 1,
        max: 500,
      });
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchCoalitionVsOpposition({
        limit,
        ...params,
      });
      return Response.json(data);
    },
  },

  "/api/analytics/dissent": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const limit = getBoundedIntegerQueryParam(searchParams, "limit", {
        fallback: 100,
        min: 1,
        max: 1_000,
      });
      const personId = getOptionalIntegerQueryParam(searchParams, "personId");
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchDissentTracking({
        personId,
        limit,
        ...params,
      });
      return Response.json(data);
    },
  },

  "/api/analytics/speech-activity": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const limit = getBoundedIntegerQueryParam(searchParams, "limit", {
        fallback: 50,
        min: 1,
        max: 500,
      });
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchSpeechActivity({
        limit,
        ...params,
      });
      return Response.json(data);
    },
  },

  "/api/analytics/committees": {
    GET: async () => {
      const data = await db.fetchCommitteeOverview();
      return Response.json(data);
    },
  },

  "/api/analytics/recent-activity": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const limit = getBoundedIntegerQueryParam(searchParams, "limit", {
        fallback: 20,
        min: 1,
        max: 200,
      });
      const data = await db.fetchRecentActivity({ limit });
      return Response.json(data);
    },
  },
});
