import type { BunRequest } from "bun";
import type { MetadataRepository } from "../database/repositories/metadata-repository";
import { json } from "./route-responses";

export const createGovernmentRoutes = (db: MetadataRepository) => ({
  "/api/hallitukset": {
    GET: async () => {
      const governments = db.fetchGovernments();
      return json(governments);
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
