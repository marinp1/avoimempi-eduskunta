import type { Database } from "bun:sqlite";
import type { BunRequest, Server } from "bun";
import type { ResolutionStore } from "../sanity/resolution-store";
import { runSanityChecks } from "../sanity/runner";
import type { ResolutionStatus } from "../sanity/types";
import { badRequest, json } from "./route-responses";

const VALID_STATUSES: ResolutionStatus[] = [
  "unresolved",
  "bug",
  "data_source_issue",
];

export const createSanityDevRoutes = (
  db: Database,
  resolutionStore: ResolutionStore,
) => ({
  "/api/sanity/run": {
    GET: () => {
      const result = runSanityChecks(db, resolutionStore);
      return json(result);
    },
  },

  "/api/sanity/resolution/:checkId": {
    PUT: async (req: BunRequest<"/api/sanity/resolution/:checkId">) => {
      const { checkId } = req.params;
      const body = (await req.json()) as {
        status?: unknown;
        summary?: unknown;
      };

      if (
        typeof body.status !== "string" ||
        !VALID_STATUSES.includes(body.status as ResolutionStatus)
      ) {
        return badRequest(
          `status must be one of: ${VALID_STATUSES.join(", ")}`,
        );
      }

      const summary =
        typeof body.summary === "string" ? body.summary.trim() : "";
      resolutionStore.upsertResolution(
        checkId,
        body.status as ResolutionStatus,
        summary,
      );
      return json({ ok: true });
    },

    DELETE: (req: BunRequest<"/api/sanity/resolution/:checkId">) => {
      resolutionStore.deleteResolution(req.params.checkId);
      return json({ ok: true });
    },
  },

  "/api/sanity/violation-comment": {
    PUT: async (req: Request) => {
      const body = (await req.json()) as {
        checkId?: unknown;
        violationKey?: unknown;
        comment?: unknown;
      };

      if (typeof body.checkId !== "string" || !body.checkId) {
        return badRequest("checkId is required");
      }
      if (typeof body.violationKey !== "string" || !body.violationKey) {
        return badRequest("violationKey is required");
      }

      const comment = typeof body.comment === "string" ? body.comment : "";
      resolutionStore.upsertViolationComment(
        body.checkId,
        body.violationKey,
        comment,
      );
      return json({ ok: true });
    },
  },
  "/api/sanity/run-ws": {
    GET: (req: Request, srv: Server<undefined>) => {
      if (srv.upgrade(req)) return new Response();
      return new Response("WebSocket upgrade failed", { status: 426 });
    },
  },
});
