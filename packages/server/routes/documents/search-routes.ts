import type { DocumentRoutesDataAccess } from "../document-routes";
import { getBoundedIntegerQueryParam, getSearchParams } from "../http";
import { badRequest } from "../route-responses";

export const createSearchRoutes = (db: DocumentRoutesDataAccess) => ({
  "/api/search": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const q = searchParams.get("q")?.trim() || "";
      if (!q || q.length < 2) {
        return badRequest("Query must be at least 2 characters");
      }
      const data = await db.federatedSearch({
        q,
        limit: getBoundedIntegerQueryParam(searchParams, "limit", {
          fallback: 30,
          min: 1,
          max: 200,
        }),
      });
      return Response.json(data);
    },
  },
});
