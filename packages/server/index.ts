// modules/server/server.ts

import { getTraceDatabasePath } from "../shared/database";
import { createResponseCache } from "./cache/response-cache";
import { loadRuntimeConfig } from "./config/runtime-config";
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
import { createCoreRoutes } from "./routes/core-routes";
import { createDocumentRoutes } from "./routes/document-routes";
import { createInsightAnalyticsRoutes } from "./routes/insight-analytics-routes";
import { createPartyRoutes } from "./routes/party-routes";
import { createPersonRoutes } from "./routes/person-routes";
import { createSessionRoutes } from "./routes/session-routes";
import { createStaticPageRoutes } from "./routes/static-page-routes";
import { createVotingRoutes } from "./routes/voting-routes";

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
  fetchLastMigrationTimestamp: () => {
    try {
      const row = db
        .query<{ value: string }, []>(
          `SELECT value FROM _migration_info WHERE key = 'last_migration'`,
        )
        .get();
      return row?.value ?? null;
    } catch {
      return null;
    }
  },
  checkReadiness: () => {
    try {
      const row = db.query("SELECT 1 AS ok").get() as
        | { ok?: number }
        | undefined;
      return { ok: row?.ok === 1 };
    } catch (error) {
      return {
        ok: false,
        details: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

const { isDev, port, idleTimeout, reusePort } = loadRuntimeConfig();

const generationKey = (() => {
  try {
    return (
      db
        .query<{ value: string }, []>(
          `SELECT value FROM _migration_info WHERE key = 'last_migration'`,
        )
        .get()?.value ?? null
    );
  } catch {
    return null;
  }
})();

const cache = createResponseCache({ generationKey: isDev ? null : generationKey });

console.log(
  isDev
    ? "Response cache disabled (dev mode)"
    : generationKey
      ? `Response cache enabled (generation: ${generationKey})`
      : "Response cache disabled (no migration timestamp found)",
);

const UNCACHED_ROUTES = new Set(["/api/ready"]);

const server = Bun.serve({
  port,
  reusePort,
  idleTimeout,
  routes: {
    ...createStaticPageRoutes(homepage),
    ...cache.wrapRoutes(createCoreRoutes(coreRoutesDataAccess), {
      exclude: UNCACHED_ROUTES,
    }),
    ...cache.wrapRoutes(createPersonRoutes(personRepository)),
    ...cache.wrapRoutes(createVotingRoutes(votingRepository)),
    ...cache.wrapRoutes(createSessionRoutes(sessionRepository)),
    ...cache.wrapRoutes(createInsightAnalyticsRoutes(analyticsRepository)),
    ...cache.wrapRoutes(createPartyRoutes(analyticsRepository)),
    ...cache.wrapRoutes(createDocumentRoutes(documentRepository)),
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  development: isDev
    ? {
        hmr: true,
      }
    : false,

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
