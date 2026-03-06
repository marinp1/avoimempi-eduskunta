import type { BunRequest } from "bun";

type GovernmentRoutesDataAccess = {
  fetchGovernments: () => Array<{
    id: number;
    name: string;
    start_date: string;
    end_date: string | null;
    member_count: number;
    parties: string[];
  }>;
  fetchGovernmentMembers: (params: { id: number }) => Array<{
    id: number;
    person_id: number | null;
    name: string | null;
    ministry: string | null;
    start_date: string | null;
    end_date: string | null;
    first_name: string | null;
    last_name: string | null;
    party: string | null;
    gender: string | null;
  }>;
};

export const createGovernmentRoutes = (db: GovernmentRoutesDataAccess) => ({
  "/api/hallitukset": {
    GET: async () => {
      const governments = db.fetchGovernments();
      return Response.json(governments);
    },
  },

  "/api/hallitukset/:id/members": {
    GET: async (req: BunRequest<"/api/hallitukset/:id/members">) => {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) {
        return Response.json({ error: "Invalid id" }, { status: 400 });
      }
      const members = db.fetchGovernmentMembers({ id });
      return Response.json(members);
    },
  },
});
