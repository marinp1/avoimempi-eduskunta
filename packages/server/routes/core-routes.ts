import type { BunRequest } from "bun";
import { getSearchParams } from "./http";
import { badRequest } from "./route-responses";

type CoreRoutesDataAccess = {
  fetchImportSourceTableSummaries: (params: { tableNames: string[] }) => {
    tables: Array<{
      tableName: string;
      importedRows: number;
      distinctPages: number;
      firstScrapedAt: string | null;
      lastScrapedAt: string | null;
      firstMigratedAt: string | null;
      lastMigratedAt: string | null;
    }>;
  };
  fetchParliamentComposition: (params: { date: string }) => unknown;
  fetchHallituskaudet: () => unknown;
  fetchLastMigrationTimestamp: () => string | null;
  checkReadiness: () => {
    ok: boolean;
    details?: string;
  };
};

export const createCoreRoutes = (db: CoreRoutesDataAccess) => ({
  "/api/health": new Response("OK"),
  "/api/ready": {
    GET: async () => {
      const result = db.checkReadiness();
      if (!result.ok) {
        return Response.json(
          { status: "not-ready", details: result.details ?? "unknown" },
          { status: 503 },
        );
      }
      return Response.json({ status: "ready" });
    },
  },

  "/api/import-source/table-summaries": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const tableNames = searchParams.getAll("tableName").flatMap((rawValue) =>
        rawValue
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== ""),
      );

      if (tableNames.length === 0) {
        return badRequest(
          "Missing required query parameter: tableName (repeat or comma-separated)",
        );
      }

      const data = await db.fetchImportSourceTableSummaries({
        tableNames,
      });
      return Response.json(data);
    },
  },

  "/api/composition/:date": {
    GET: async (req: BunRequest<"/api/composition/:date">) => {
      const composition = await db.fetchParliamentComposition(req.params);
      return Response.json(composition);
    },
  },

  "/api/hallituskaudet": {
    GET: async () => {
      const periods = await db.fetchHallituskaudet();
      return Response.json(periods);
    },
  },

  "/api/db-info": {
    GET: async () => {
      const lastMigrationTimestamp = db.fetchLastMigrationTimestamp();
      return Response.json({ lastMigrationTimestamp });
    },
  },
});
