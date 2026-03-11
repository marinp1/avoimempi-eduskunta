import type { BunRequest } from "bun";
import type { VotingRepository } from "../database/repositories/voting-repository";
import { getOptionalQueryParam, getSearchParams } from "./http";
import { badRequest, json, jsonOrNotFound } from "./route-responses";

export const createVotingRoutes = (db: VotingRepository) => ({
  "/api/votings/recent": {
    GET: async (req: BunRequest<"/api/votings/recent">) => {
      const searchParams = getSearchParams(req);
      const startDate = getOptionalQueryParam(searchParams, "startDate");
      const endDate = getOptionalQueryParam(searchParams, "endDate");
      const rows = await db.fetchRecentVotings({ startDate, endDate });
      return json(rows);
    },
  },

  "/api/votings/overview": {
    GET: async (req: BunRequest<"/api/votings/overview">) => {
      const searchParams = getSearchParams(req);
      const startDate = getOptionalQueryParam(searchParams, "startDate");
      const endDate = getOptionalQueryParam(searchParams, "endDate");
      const overview = await db.fetchVotingOverview({ startDate, endDate });
      return json(overview);
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
      return json(titles);
    },
  },

  "/api/votings/browse": {
    GET: async (req: BunRequest<"/api/votings/browse">) => {
      const searchParams = getSearchParams(req);
      const q = searchParams.get("q")?.trim() || undefined;
      const phase = getOptionalQueryParam(searchParams, "phase");
      const session = getOptionalQueryParam(searchParams, "session");
      const sort = searchParams.get("sort")?.trim() || undefined;
      const startDate = getOptionalQueryParam(searchParams, "startDate");
      const endDate = getOptionalQueryParam(searchParams, "endDate");

      if (q && q.length < 3) {
        return badRequest("Query parameter requires at least three characters");
      }

      const rows = await db.browseVotings({
        q,
        phase: phase && phase !== "all" ? phase : undefined,
        session: session && session !== "all" ? session : undefined,
        sort:
          sort === "oldest" ||
          sort === "closest" ||
          sort === "largest" ||
          sort === "newest"
            ? sort
            : undefined,
        startDate,
        endDate,
      });
      return json(rows);
    },
  },

  "/api/votings/by-document/:identifier": {
    GET: async (req: BunRequest<"/api/votings/by-document/:identifier">) => {
      const data = await db.fetchVotingsByDocument({
        identifier: decodeURIComponent(req.params.identifier),
      });
      return json(data);
    },
  },

  "/api/documents/:identifier/relations": {
    GET: async (req: BunRequest<"/api/documents/:identifier/relations">) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) {
        return badRequest("Missing document identifier");
      }
      const data = await db.fetchDocumentRelations({ identifier });
      return json(data);
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

export type VotingRoutes = ReturnType<typeof createVotingRoutes>;
export type VotingRouteResponse<TPath extends keyof VotingRoutes> =
  InferRouteMethodResponse<VotingRoutes, TPath, "GET">;
