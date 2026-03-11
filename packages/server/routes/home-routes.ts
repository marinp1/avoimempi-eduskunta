import { getMappedOptionalQueryParams, getSearchParams } from "./http";
import { json } from "./route-responses";

const homeQueryParamMap = {
  asOfDate: "asOfDate",
  startDate: "startDate",
  endDate: "endDate",
  governmentName: "governmentName",
  governmentStartDate: "governmentStartDate",
} as const;

export const createHomeRoutes = (
  db: Pick<
    import("../database/repositories/home-repository").HomeRepository,
    "fetchOverview"
  >,
) => ({
  "/api/home/overview": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(
        searchParams,
        homeQueryParamMap,
      );
      const data = await db.fetchOverview(params);
      return json(data);
    },
  },
});
