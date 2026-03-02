import type { BunRequest } from "bun";
import {
  getBoundedIntegerQueryParam,
  getLimitOffsetQueryParams,
  getSearchParams,
} from "./http";

type PersonRoutesDataAccess = {
  fetchPersonGroupMemberships: (params: { id: string }) => unknown;
  fetchPersonTerms: (params: { id: string }) => unknown;
  fetchPersonVotes: (params: { id: string }) => unknown;
  fetchRepresentativeDetails: (params: { id: string }) => unknown;
  fetchRepresentativeDistricts: (params: { id: string }) => unknown;
  fetchLeavingParliamentRecords: (params: { id: string }) => unknown;
  fetchTrustPositions: (params: { id: string }) => unknown;
  fetchGovernmentMemberships: (params: { id: string }) => unknown;
  fetchPersonSpeeches: (params: {
    personId: string;
    limit?: number;
    offset?: number;
  }) => unknown;
  fetchPersonQuestions: (params: {
    personId: string;
    limit?: number;
  }) => unknown;
  fetchPersonCommittees: (params: { personId: string }) => unknown;
  fetchPersonDissents: (params: {
    personId: string;
    limit?: number;
  }) => unknown;
};

export const createPersonRoutes = (db: PersonRoutesDataAccess) => ({
  "/api/person/:id/group-memberships": {
    GET: async (req: BunRequest<"/api/person/:id/group-memberships">) => {
      const memberships = await db.fetchPersonGroupMemberships(req.params);
      return Response.json(memberships);
    },
  },

  "/api/person/:id/terms": {
    GET: async (req: BunRequest<"/api/person/:id/terms">) => {
      const memberships = await db.fetchPersonTerms(req.params);
      return Response.json(memberships);
    },
  },

  "/api/person/:id/votes": {
    GET: async (req: BunRequest<"/api/person/:id/votes">) => {
      const votes = await db.fetchPersonVotes(req.params);
      return Response.json(votes);
    },
  },

  "/api/person/:id/details": {
    GET: async (req: BunRequest<"/api/person/:id/details">) => {
      const details = await db.fetchRepresentativeDetails(req.params);
      return Response.json(details);
    },
  },

  "/api/person/:id/districts": {
    GET: async (req: BunRequest<"/api/person/:id/districts">) => {
      const districts = await db.fetchRepresentativeDistricts(req.params);
      return Response.json(districts);
    },
  },

  "/api/person/:id/leaving-records": {
    GET: async (req: BunRequest<"/api/person/:id/leaving-records">) => {
      const records = await db.fetchLeavingParliamentRecords(req.params);
      return Response.json(records);
    },
  },

  "/api/person/:id/trust-positions": {
    GET: async (req: BunRequest<"/api/person/:id/trust-positions">) => {
      const positions = await db.fetchTrustPositions(req.params);
      return Response.json(positions);
    },
  },

  "/api/person/:id/government-memberships": {
    GET: async (req: BunRequest<"/api/person/:id/government-memberships">) => {
      const memberships = await db.fetchGovernmentMemberships(req.params);
      return Response.json(memberships);
    },
  },

  "/api/person/:id/speeches": {
    GET: async (req: BunRequest<"/api/person/:id/speeches">) => {
      const searchParams = getSearchParams(req);
      const { limit, offset } = getLimitOffsetQueryParams(searchParams, {
        limitFallback: 50,
        offsetFallback: 0,
        minLimit: 1,
        minOffset: 0,
        maxLimit: 500,
      });
      const data = await db.fetchPersonSpeeches({
        personId: req.params.id,
        limit,
        offset,
      });
      return Response.json(data);
    },
  },

  "/api/person/:id/questions": {
    GET: async (req: BunRequest<"/api/person/:id/questions">) => {
      const searchParams = getSearchParams(req);
      const data = await db.fetchPersonQuestions({
        personId: req.params.id,
        limit: getBoundedIntegerQueryParam(searchParams, "limit", {
          fallback: 500,
          min: 1,
          max: 2_000,
        }),
      });
      return Response.json(data);
    },
  },

  "/api/person/:id/committees": {
    GET: async (req: BunRequest<"/api/person/:id/committees">) => {
      const data = await db.fetchPersonCommittees({
        personId: req.params.id,
      });
      return Response.json(data);
    },
  },

  "/api/person/:id/dissents": {
    GET: async (req: BunRequest<"/api/person/:id/dissents">) => {
      const searchParams = getSearchParams(req);
      const data = await db.fetchPersonDissents({
        personId: req.params.id,
        limit: getBoundedIntegerQueryParam(searchParams, "limit", {
          fallback: 100,
          min: 1,
          max: 1_000,
        }),
      });
      return Response.json(data);
    },
  },
});
