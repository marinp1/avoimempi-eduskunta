import type { BunRequest } from "bun";
import type { AnalyticsRepository } from "../database/repositories/analytics-repository";
import { getMappedOptionalQueryParams, getSearchParams } from "./http";
import { json } from "./route-responses";

export const createPartyRoutes = (db: AnalyticsRepository) => ({
  "/api/parties/summary": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(searchParams, {
        asOfDate: "asOfDate",
        startDate: "startDate",
        endDate: "endDate",
        governmentName: "governmentName",
        governmentStartDate: "governmentStartDate",
      } as const);
      const data = await db.fetchPartySummary(params);
      return json(data);
    },
  },

  "/api/parties/:code/members": {
    GET: async (req: BunRequest<"/api/parties/:code/members">) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(searchParams, {
        asOfDate: "asOfDate",
        startDate: "startDate",
        endDate: "endDate",
        governmentName: "governmentName",
        governmentStartDate: "governmentStartDate",
      } as const);
      const data = await db.fetchPartyMembers({
        partyCode: req.params.code,
        ...params,
      });
      return json(data);
    },
  },
});
