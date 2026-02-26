import type { BunRequest } from "bun";
import type { DocumentRoutesDataAccess } from "../document-routes";
import { getMappedPaginatedQueryParams, getSearchParams } from "../http";
import { jsonOrNotFound } from "../route-responses";

export const createInterpellationGovernmentRoutes = (
  db: DocumentRoutesDataAccess,
) => ({
  "/api/interpellations": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedPaginatedQueryParams(searchParams, {
        query: "q",
        year: "year",
        subject: "subject",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchInterpellations(params);
      return Response.json(data);
    },
  },

  "/api/interpellations/subjects": {
    GET: async () => {
      const data = await db.fetchInterpellationsSubjects();
      return Response.json(data);
    },
  },

  "/api/interpellations/years": {
    GET: async () => {
      const data = await db.fetchInterpellationYears();
      return Response.json(data);
    },
  },

  "/api/interpellations/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/interpellations/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchInterpellationByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
      });
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
      const params = getMappedPaginatedQueryParams(searchParams, {
        query: "q",
        year: "year",
        subject: "subject",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchGovernmentProposals(params);
      return Response.json(data);
    },
  },

  "/api/government-proposals/subjects": {
    GET: async () => {
      const data = await db.fetchGovernmentProposalsSubjects();
      return Response.json(data);
    },
  },

  "/api/government-proposals/years": {
    GET: async () => {
      const data = await db.fetchGovernmentProposalYears();
      return Response.json(data);
    },
  },

  "/api/government-proposals/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/government-proposals/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchGovernmentProposalByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
      });
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
