import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import type { BunRequest } from "bun";
import { getChangesArchiveDir, getChangesReportPath } from "#database";
import { getSearchParams } from "./http";
import { badRequest, json } from "./route-responses";

export const createCoreRoutes = (
  db: typeof import("../index").coreRoutesDataAccess,
) => ({
  "/api/health": {
    GET: async () => {
      return new Response("OK");
    },
  },
  "/api/ready": {
    GET: async () => {
      const result = db.checkReadiness();
      if (!result.ok) {
        return json(
          { status: "not-ready", details: result.details ?? "unknown" },
          { status: 503 },
        );
      }
      return json({ status: "ready" });
    },
  },

  "/api/import-source/row-trace": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const table = searchParams.get("table");
      const pkName = searchParams.get("pkName");
      const pkValue = searchParams.get("pkValue");

      if (!table || !pkName || !pkValue) {
        return badRequest(
          "Missing required query parameters: table, pkName, pkValue",
        );
      }

      const result = db.fetchRowTrace({ table, pkName, pkValue });
      if (!result) {
        return json({ error: "No trace found" }, { status: 404 });
      }
      return json(result);
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
      return json(data);
    },
  },

  "/api/composition/:date": {
    GET: async (req: BunRequest<"/api/composition/:date">) => {
      const composition = await db.fetchParliamentComposition(req.params);
      return json(composition);
    },
  },

  "/api/hallituskaudet": {
    GET: async () => {
      const periods = await db.fetchHallituskaudet();
      return json(periods);
    },
  },

  "/api/db-info": {
    GET: async () => {
      const lastMigrationTimestamp = db.fetchLastMigrationTimestamp();
      return json({ lastMigrationTimestamp });
    },
  },

  "/api/changes-report": {
    GET: async (req: Request) => {
      try {
        const runId = getSearchParams(req).get("run");
        const filePath = runId
          ? path.join(getChangesArchiveDir(), `${runId}.json`)
          : getChangesReportPath();
        const file = Bun.file(filePath);
        const exists = await file.exists();
        if (!exists) {
          return json(
            { error: "No changes report available yet" },
            { status: 404 },
          );
        }
        const report = await file.json();
        return json(report);
      } catch {
        return json(
          { error: "Failed to read changes report" },
          { status: 500 },
        );
      }
    },
  },

  "/api/changes-history": {
    GET: () => {
      const archiveDir = getChangesArchiveDir();
      if (!existsSync(archiveDir)) {
        return json({ runs: [] });
      }
      const runs = readdirSync(archiveDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.slice(0, -5))
        .sort((a, b) => Number(b) - Number(a))
        .map((id) => ({
          id,
          generatedAt: new Date(Number(id)).toISOString(),
        }));
      return json({ runs });
    },
  },
});
