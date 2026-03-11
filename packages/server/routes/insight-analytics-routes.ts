import type { BunRequest } from "bun";
import type { AnalyticsRepository } from "../database/repositories/analytics-repository";
import {
  getBoundedIntegerQueryParam,
  getMappedOptionalQueryParams,
  getOptionalIntegerQueryParam,
  getSearchParams,
} from "./http";
import { badRequest, json } from "./route-responses";

const dateRangeQueryParamMap = {
  startDate: "startDate",
  endDate: "endDate",
} as const;

export const createInsightAnalyticsRoutes = (db: AnalyticsRepository) => ({
  "/api/insights/participation": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const participation = await db.fetchVotingParticipation(params);
      return json(participation);
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
      return json(participation);
    },
  },

  "/api/insights/gender-division": {
    GET: async () => {
      const genderDivision = await db.fetchGenderDivisionOverTime();
      return json(genderDivision);
    },
  },

  "/api/insights/age-division": {
    GET: async () => {
      const ageDivision = await db.fetchAgeDivisionOverTime();
      return json(ageDivision);
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
      return json(partyParticipation);
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
      return json(data);
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
      return json(data);
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
      return json(data);
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
      return json(data);
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
      return json(data);
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
      return json(data);
    },
  },

  "/api/analytics/attendance": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchAttendanceAnalytics(params);
      return json(data);
    },
  },

  "/api/analytics/attendance-by-party": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = await db.fetchAttendanceByParty(params);
      return json(data);
    },
  },

  "/api/analytics/attendance/:personId": {
    GET: async (req: BunRequest<"/api/analytics/attendance/:personId">) => {
      const personId = parseInt(req.params.personId, 10);
      if (!Number.isFinite(personId) || personId <= 0) {
        return badRequest("Invalid personId");
      }
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        dateRangeQueryParamMap,
      );
      const data = db.fetchAttendancePersonHistory({ personId, ...params });
      return json(data);
    },
  },

  "/api/analytics/committees": {
    GET: async () => {
      const data = await db.fetchCommitteeOverview();
      return json(data);
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
      return json(data);
    },
  },
});
