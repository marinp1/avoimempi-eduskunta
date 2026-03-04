import type { BunRequest } from "bun";
import { getOptionalQueryParam, getSearchParams } from "./http";
import { badRequest, jsonOrNotFound } from "./route-responses";

type VotingRoutesDataAccess = {
  queryVotings: (params: {
    q: string;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchRecentVotings: (params: {
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchVotingsByDocument: (params: { identifier: string }) => unknown;
  fetchDocumentRelations: (params: { identifier: string }) => unknown;
  fetchVotingById: (params: { id: string }) => unknown;
  fetchVotingInlineDetails: (params: { id: string }) => unknown;
};

export const createVotingRoutes = (db: VotingRoutesDataAccess) => ({
  "/api/votings/recent": {
    GET: async (req: BunRequest<"/api/votings/recent">) => {
      const searchParams = getSearchParams(req);
      const startDate = getOptionalQueryParam(searchParams, "startDate");
      const endDate = getOptionalQueryParam(searchParams, "endDate");
      const rows = await db.fetchRecentVotings({ startDate, endDate });
      return Response.json(rows);
    },
  },

  "/api/votings/search": {
    GET: async (req: BunRequest<"/api/votings/search">) => {
      const searchParams = getSearchParams(req);
      const q = searchParams.get("q")?.trim() || "";
      const startDate = getOptionalQueryParam(searchParams, "startDate");
      const endDate = getOptionalQueryParam(searchParams, "endDate");
      if (!q) return badRequest("Missing query parameter");
      if (q.length < 3)
        return badRequest("Query parameter requires at least three characters");
      const titles = await db.queryVotings({ q, startDate, endDate });
      return Response.json(titles);
    },
  },

  "/api/votings/by-document/:identifier": {
    GET: async (req: BunRequest<"/api/votings/by-document/:identifier">) => {
      const data = await db.fetchVotingsByDocument({
        identifier: decodeURIComponent(req.params.identifier),
      });
      return Response.json(data);
    },
  },

  "/api/documents/:identifier/relations": {
    GET: async (req: BunRequest<"/api/documents/:identifier/relations">) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) {
        return badRequest("Missing document identifier");
      }
      const data = await db.fetchDocumentRelations({ identifier });
      return Response.json(data);
    },
  },

  "/api/votings/:id": {
    GET: async (req: BunRequest<"/api/votings/:id">) => {
      const voting = await db.fetchVotingById(req.params);
      return jsonOrNotFound(voting, "Voting not found");
    },
  },

  "/api/votings/:id/details": {
    GET: async (req: BunRequest<"/api/votings/:id/details">) => {
      const votingId = Number.parseInt(req.params.id, 10);
      if (!Number.isFinite(votingId) || votingId <= 0) {
        return badRequest("Invalid voting id");
      }
      const details = await db.fetchVotingInlineDetails({
        id: req.params.id,
      });
      return jsonOrNotFound(details, "Voting not found");
    },
  },
});
