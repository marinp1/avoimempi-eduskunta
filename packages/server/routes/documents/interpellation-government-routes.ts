import type { BunRequest } from "bun";
import type { DocumentRepository } from "../../database/repositories/document-repository";
import {
  getMappedPaginatedQueryParams,
  getSearchParams,
  validateDateRange,
} from "../http";
import { badRequest, json, jsonOrNotFound } from "../route-responses";

export const createInterpellationGovernmentRoutes = (
  db: DocumentRepository,
) => ({
  "/api/interpellations": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          subject: "subject",
          startDate: "startDate",
          endDate: "endDate",
        } as const,
        {
          pageFallback: 1,
          limitFallback: 20,
          minPage: 1,
          minLimit: 1,
          maxLimit: 200,
        },
      );
      const data = await db.fetchInterpellations(params);
      return json(data);
    },
  },

  "/api/interpellations/subjects": {
    GET: async () => {
      const data = await db.fetchInterpellationsSubjects();
      return json(data);
    },
  },

  "/api/interpellations/years": {
    GET: async () => {
      const data = await db.fetchInterpellationYears();
      return json(data);
    },
  },

  "/api/interpellations/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/interpellations/by-identifier/:identifier">,
    ) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) return badRequest("Missing document identifier");
      const data = await db.fetchInterpellationByIdentifier({ identifier });
      return jsonOrNotFound(data);
    },
  },

  "/api/interpellations/:id": {
    GET: async (req: BunRequest<"/api/interpellations/:id">) => {
      const data = await db.fetchInterpellationById({ id: req.params.id });
      return jsonOrNotFound(data);
    },
  },

  "/api/government-proposals": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          subject: "subject",
          startDate: "startDate",
          endDate: "endDate",
        } as const,
        {
          pageFallback: 1,
          limitFallback: 20,
          minPage: 1,
          minLimit: 1,
          maxLimit: 200,
        },
      );
      const data = await db.fetchGovernmentProposals(params);
      return json(data);
    },
  },

  "/api/government-proposals/subjects": {
    GET: async () => {
      const data = await db.fetchGovernmentProposalsSubjects();
      return json(data);
    },
  },

  "/api/government-proposals/years": {
    GET: async () => {
      const data = await db.fetchGovernmentProposalYears();
      return json(data);
    },
  },

  "/api/government-proposals/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/government-proposals/by-identifier/:identifier">,
    ) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) return badRequest("Missing document identifier");
      const data = await db.fetchGovernmentProposalByIdentifier({ identifier });
      return jsonOrNotFound(data);
    },
  },

  "/api/government-proposals/:id": {
    GET: async (req: BunRequest<"/api/government-proposals/:id">) => {
      const data = await db.fetchGovernmentProposalById({
        id: req.params.id,
      });
      return jsonOrNotFound(data);
    },
  },
});
