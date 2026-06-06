import type { BunRequest } from "bun";
import type { PersonRepository } from "../database/repositories/person-repository";
import {
  getBoundedIntegerQueryParam,
  getLimitOffsetQueryParams,
  getSearchParams,
} from "./http";
import { badRequest, json } from "./route-responses";

export const createPersonRoutes = (db: PersonRepository) => ({
  "/api/person/search": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const q = searchParams.get("q")?.trim() || "";
      if (q.length < 2) {
        return badRequest("Query must be at least 2 characters");
      }
      const data = await db.fetchPersonSearch({
        q,
        date: searchParams.get("date"),
        limit: getBoundedIntegerQueryParam(searchParams, "limit", {
          fallback: 20,
          min: 1,
          max: 50,
        }),
      });
      return json(data);
    },
  },

  "/api/person/:id/group-memberships": {
    GET: async (req: BunRequest<"/api/person/:id/group-memberships">) => {
      const memberships = await db.fetchPersonGroupMemberships(req.params);
      return json(memberships);
    },
  },

  "/api/person/:id/terms": {
    GET: async (req: BunRequest<"/api/person/:id/terms">) => {
      const memberships = await db.fetchPersonTerms(req.params);
      return json(memberships);
    },
  },

  "/api/person/:id/votes": {
    GET: async (req: BunRequest<"/api/person/:id/votes">) => {
      const votes = await db.fetchPersonVotes(req.params);
      return json(votes);
    },
  },

  "/api/person/:id/details": {
    GET: async (req: BunRequest<"/api/person/:id/details">) => {
      const details = await db.fetchRepresentativeDetails(req.params);
      return json(details);
    },
  },

  "/api/person/:id/districts": {
    GET: async (req: BunRequest<"/api/person/:id/districts">) => {
      const districts = await db.fetchRepresentativeDistricts(req.params);
      return json(districts);
    },
  },

  "/api/person/:id/leaving-records": {
    GET: async (req: BunRequest<"/api/person/:id/leaving-records">) => {
      const records = await db.fetchLeavingParliamentRecords(req.params);
      return json(records);
    },
  },

  "/api/person/:id/trust-positions": {
    GET: async (req: BunRequest<"/api/person/:id/trust-positions">) => {
      const positions = await db.fetchTrustPositions(req.params);
      return json(positions);
    },
  },

  "/api/person/:id/government-memberships": {
    GET: async (req: BunRequest<"/api/person/:id/government-memberships">) => {
      const memberships = await db.fetchGovernmentMemberships(req.params);
      return json(memberships);
    },
  },

  "/api/person/:id/government-periods": {
    GET: async (req: BunRequest<"/api/person/:id/government-periods">) => {
      const periods = await db.fetchGovernmentPeriods(req.params);
      return json(periods);
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
      return json(data);
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
      return json(data);
    },
  },

  "/api/person/:id/committees": {
    GET: async (req: BunRequest<"/api/person/:id/committees">) => {
      const data = await db.fetchPersonCommittees({
        personId: req.params.id,
      });
      return json(data);
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
      return json(data);
    },
  },

  "/api/person/:id/initiatives": {
    GET: async (req: BunRequest<"/api/person/:id/initiatives">) => {
      const searchParams = getSearchParams(req);
      const data = await db.fetchPersonInitiatives({
        personId: req.params.id,
        limit: getBoundedIntegerQueryParam(searchParams, "limit", {
          fallback: 200,
          min: 1,
          max: 2_000,
        }),
      });
      return json(data);
    },
  },

  "/api/person/:id/interpellations": {
    GET: async (req: BunRequest<"/api/person/:id/interpellations">) => {
      const data = await db.fetchPersonInterpellations({
        personId: req.params.id,
      });
      return json(data);
    },
  },

  "/api/person/:id/ties": {
    GET: async (req: BunRequest<"/api/person/:id/ties">) => {
      const data = await db.fetchPersonTies({ personId: req.params.id });
      return json(data);
    },
  },

  "/api/person/:id/focus-areas": {
    GET: async (req: BunRequest<"/api/person/:id/focus-areas">) => {
      const searchParams = getSearchParams(req);
      const data = await db.fetchPersonFocusAreas({
        personId: req.params.id,
        topN: getBoundedIntegerQueryParam(searchParams, "topN", {
          fallback: 12,
          min: 1,
          max: 50,
        }),
      });
      return json(data);
    },
  },

  "/api/person/:id/election-context": {
    GET: async (req: BunRequest<"/api/person/:id/election-context">) => {
      const data = await db.fetchPersonElectionContext({
        personId: req.params.id,
      });
      return json(data);
    },
  },

  "/api/person/:id/capabilities": {
    GET: async (req: BunRequest<"/api/person/:id/capabilities">) => {
      const data = await db.fetchPersonCapabilities({
        personId: req.params.id,
      });
      return json(data);
    },
  },

  "/api/person/:id/annotations": {
    GET: async (req: BunRequest<"/api/person/:id/annotations">) => {
      const searchParams = getSearchParams(req);
      const data = await db.fetchPersonAnnotations({
        personId: req.params.id,
        kind: searchParams.get("kind"),
      });
      return json(data);
    },
  },

  "/api/person/:id/metrics": {
    GET: async (req: BunRequest<"/api/person/:id/metrics">) => {
      const data = await db.fetchPersonMetricsWithBaselines({
        personId: req.params.id,
      });
      return json(data);
    },
  },

  "/api/baselines": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const data = await db.fetchBaselines({
        partyId: searchParams.get("partyId"),
      });
      return json(data);
    },
  },

  "/api/people/compare": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const idsParam = searchParams.get("ids")?.trim() || "";
      if (!idsParam) return badRequest("Missing ids query parameter");
      const personIds = idsParam
        .split(",")
        .map((s) => Number.parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (personIds.length === 0) return badRequest("No valid ids provided");
      if (personIds.length > 10)
        return badRequest("At most 10 ids may be compared");
      const data = await db.fetchPeopleCompare({ personIds });
      return json(data);
    },
  },
});
