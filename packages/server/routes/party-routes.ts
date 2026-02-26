import type { BunRequest } from "bun";
import { getMappedOptionalQueryParams, getSearchParams } from "./http";

type PartyRoutesDataAccess = {
  fetchPartySummary: (params?: {
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    governmentName?: string;
    governmentStartDate?: string;
  }) => unknown;
  fetchPartyMembers: (params: {
    partyCode: string;
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    governmentName?: string;
    governmentStartDate?: string;
  }) => unknown;
};

export const createPartyRoutes = (db: PartyRoutesDataAccess) => ({
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
      return Response.json(data);
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
      return Response.json(data);
    },
  },
});
