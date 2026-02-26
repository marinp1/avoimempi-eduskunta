import type { BunRequest } from "bun";
import type { StatusController } from "../controllers/status-controller";
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
};

export const createCoreRoutes = (db: CoreRoutesDataAccess) => ({
  "/api/health": new Response("OK"),

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
});

export const createDevStatusRoutes = (statusController: StatusController) => ({
  "/api/status/overview": {
    GET: async () => {
      const overview = await statusController.getOverview();
      return Response.json(overview);
    },
  },
  "/api/status/sanity-checks": {
    GET: async () => {
      const checks = await statusController.getSanityChecks();
      return Response.json(checks);
    },
  },
  "/api/status/source-data": {
    GET: async () => {
      const sourceData = await statusController.getSourceDataStatus();
      return Response.json(sourceData);
    },
  },
});
