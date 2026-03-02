// modules/server/server.ts

import { getTraceDatabasePath } from "../shared/database";
import { loadRuntimeConfig } from "./config/runtime-config";
import { StatusController } from "./controllers/status-controller";
import { DatabaseConnection } from "./database/db";
import { prepareDatabaseForServerStartup } from "./database/launch-db";
import { AnalyticsRepository } from "./database/repositories/analytics-repository";
import { DocumentRepository } from "./database/repositories/document-repository";
import { ImportSourceRepository } from "./database/repositories/import-source-repository";
import { MetadataRepository } from "./database/repositories/metadata-repository";
import { PersonRepository } from "./database/repositories/person-repository";
import { SessionRepository } from "./database/repositories/session-repository";
import { VotingRepository } from "./database/repositories/voting-repository";
import homepage from "./public/index.html";
import { createCoreRoutes, createDevStatusRoutes } from "./routes/core-routes";
import { createDocumentRoutes } from "./routes/document-routes";
import { createInsightAnalyticsRoutes } from "./routes/insight-analytics-routes";
import { createPartyRoutes } from "./routes/party-routes";
import { createPersonRoutes } from "./routes/person-routes";
import { createSessionRoutes } from "./routes/session-routes";
import { createStaticPageRoutes } from "./routes/static-page-routes";
import { createVotingRoutes } from "./routes/voting-routes";
import { handleDevelopmentWebSocketUpgrade } from "./routes/websocket-upgrade";
import { getMigrationLockInfo } from "./services/maintenance-lock";

await prepareDatabaseForServerStartup();
const databaseConnection = new DatabaseConnection();
const db = databaseConnection.db;
const analyticsRepository = new AnalyticsRepository(db);
const documentRepository = new DocumentRepository(db);
const importSourceRepository = new ImportSourceRepository(db, {
  traceDatabasePath: getTraceDatabasePath(),
});
const metadataRepository = new MetadataRepository(db);
const personRepository = new PersonRepository(db);
const sessionRepository = new SessionRepository(db);
const votingRepository = new VotingRepository(db);

const coreRoutesDataAccess = {
  fetchImportSourceTableSummaries: (params: { tableNames: string[] }) =>
    importSourceRepository.fetchImportSourceTableSummaries(params),
  fetchParliamentComposition: (params: { date: string }) =>
    metadataRepository.fetchParliamentComposition(params),
  fetchHallituskaudet: () => metadataRepository.fetchHallituskaudet(),
  checkReadiness: () => {
    try {
      const row = db.query("SELECT 1 AS ok").get() as { ok?: number } | undefined;
      return { ok: row?.ok === 1 };
    } catch (error) {
      return {
        ok: false,
        details: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export const statusController = new StatusController(db);
const { isDev, port, idleTimeout, reusePort } = loadRuntimeConfig();

const server = Bun.serve<{
  type: "parser" | "scraper" | "migrator";
}>({
  port,
  reusePort,
  idleTimeout,
  routes: {
    ...createStaticPageRoutes(homepage, isDev),
    "/api/system/maintenance": {
      GET: async () => {
        const lockInfo = getMigrationLockInfo();
        const payload = {
          migrationOngoing: lockInfo.migrationOngoing,
          startedAt: lockInfo.startedAt,
        };
        return Response.json(payload, {
          headers: { "Cache-Control": "no-store" },
        });
      },
    },
    ...createCoreRoutes(coreRoutesDataAccess),
    ...(isDev ? createDevStatusRoutes(statusController) : {}),
    ...createPersonRoutes(personRepository),
    ...createVotingRoutes(votingRepository),

    ...createSessionRoutes(sessionRepository),
    ...createInsightAnalyticsRoutes(analyticsRepository),
    ...createPartyRoutes(analyticsRepository),

    ...createDocumentRoutes(documentRepository),

    ...(isDev
      ? await import("./admin").then((def) =>
          def.createAdminRoutes({ statusController }),
        )
      : {}),
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  development: isDev
    ? {
        hmr: true,
      }
    : false,

  fetch(req, server) {
    if (!isDev) {
      return new Response("Not Found", { status: 404 });
    }

    return handleDevelopmentWebSocketUpgrade(req, server);
  },
  websocket: isDev
    ? await import("./admin").then((def) => def.websocketHandler)
    : undefined,
  error(error) {
    console.error(error);
    return new Response(`Internal Error: ${error.message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  },
});

console.log(
  `Listening on ${server.url} ${server.development ? "(development)" : "(production)"}`,
);
