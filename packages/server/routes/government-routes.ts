import type { BunRequest } from "bun";
import type { MetadataRepository } from "../database/repositories/metadata-repository";
import { getOptionalQueryParam, getSearchParams } from "./http";
import { badRequest, json } from "./route-responses";

export const createGovernmentRoutes = (db: MetadataRepository) => ({
  "/api/hallitukset": {
    GET: async () => {
      const governments = db.fetchGovernments();
      return json(governments);
    },
  },

  "/api/hallitukset/active": {
    GET: async (req: BunRequest<"/api/hallitukset/active">) => {
      const searchParams = getSearchParams(req);
      const date =
        getOptionalQueryParam(searchParams, "date") ||
        new Date().toISOString().split("T")[0];

      const dateObj = new Date(date);
      if (Number.isNaN(dateObj.getTime())) {
        return badRequest("Invalid date");
      }

      const government = db.fetchGovernmentByDate({ date });
      if (!government) {
        return json({ government: null, members: [] });
      }

      const members = db.fetchGovernmentMembers({ id: government.id });
      const todayIso = new Date().toISOString().split("T")[0];

      return json({
        government: {
          ...government,
          is_current:
            government.start_date <= todayIso &&
            (government.end_date === null || government.end_date >= todayIso),
        },
        members,
      });
    },
  },

  "/api/hallitukset/:id/members": {
    GET: async (req: BunRequest<"/api/hallitukset/:id/members">) => {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return json({ error: "Invalid id" }, { status: 400 });
      }
      const members = db.fetchGovernmentMembers({ id });
      return json(members);
    },
  },
});
