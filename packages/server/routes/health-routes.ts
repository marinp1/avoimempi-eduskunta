import type { Database } from "bun:sqlite";

// Minimal liveness/readiness endpoints retained for deployment healthchecks
// (scripts/app/app-release.sh and scripts/pipeline/pipeline-jobs.sh poll
// /api/ready). The rest of the JSON API has been removed in favour of the
// HTMX server-rendered webapp.
export const createHealthRoutes = (db: Database) => ({
  "/api/health": {
    GET: async () => new Response("OK"),
  },
  "/api/ready": {
    GET: async () => {
      try {
        const row = db.query("SELECT 1 AS ok").get() as
          | { ok?: number }
          | undefined;
        if (row?.ok === 1) {
          return Response.json({ status: "ready" });
        }
        return Response.json(
          { status: "not-ready", details: "unknown" },
          { status: 503 },
        );
      } catch (error) {
        return Response.json(
          {
            status: "not-ready",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 503 },
        );
      }
    },
  },
});
