// modules/server/server.ts
import "../shared/i18n";
import {
  getLastMigratorRunAtPath,
  getLastScraperRunAtPath,
} from "../shared/database";
import { createResponseCache } from "./cache/response-cache";
import { loadRuntimeConfig } from "./config/runtime-config";
import { DatabaseConnection } from "./database/db";
import { prepareDatabaseForServerStartup } from "./database/launch-db";
import { AnalyticsRepository } from "./database/repositories/analytics-repository";
import { DocumentRepository } from "./database/repositories/document-repository";
import { HomeRepository } from "./database/repositories/home-repository";
import { MetadataRepository } from "./database/repositories/metadata-repository";
import { PersonRepository } from "./database/repositories/person-repository";
import { SessionRepository } from "./database/repositories/session-repository";
import { VotingRepository } from "./database/repositories/voting-repository";
import {
  addSecurityHeaders,
  withSecurityHeaders,
} from "./middleware/security-headers";
import { createHealthRoutes } from "./routes/health-routes";
import {
  createWebappPageRoutes,
  createWebappStaticRoutes,
} from "./routes/webapp-routes";

await prepareDatabaseForServerStartup();
const databaseConnection = new DatabaseConnection();
const db = databaseConnection.db;
const analyticsRepository = new AnalyticsRepository(db);
const documentRepository = new DocumentRepository(db);
const metadataRepository = new MetadataRepository(db);
const personRepository = new PersonRepository(db);
const sessionRepository = new SessionRepository(db);
const votingRepository = new VotingRepository(db);

const readTimestamp = async (filePath: string): Promise<string | null> => {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  const text = (await file.text()).trim();
  return text || null;
};

const homeRepository = new HomeRepository(
  sessionRepository,
  analyticsRepository,
  {
    fetchLastMigrationTimestamp: () => {
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
    },
    fetchLastScraperRunAt: () => readTimestamp(getLastScraperRunAtPath()),
    fetchLastMigratorRunAt: () => readTimestamp(getLastMigratorRunAtPath()),
  },
);

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

const cache = createResponseCache({
  generationKey: isDev ? "dev" : generationKey,
  ttlMs: isDev ? 15_000 : 5 * 60 * 1000,
});

console.log(
  isDev
    ? "Response cache enabled (dev mode, TTL: 15s)"
    : generationKey
      ? `Response cache enabled (generation: ${generationKey})`
      : "Response cache disabled (no migration timestamp found)",
);

// Cache key for webapp page routes: responses for the same URL may differ
// based on HX-Request (full page vs fragment) and HX-Target (which partial
// to return — main-content, roster-content, sit-root, tl-reactive, etc.).
const webappCacheKey = (req: Request, url: URL) =>
  `${url.pathname}${url.search}|htmx=${req.headers.get("HX-Request") ?? "0"}|target=${req.headers.get("HX-Target") ?? ""}`;

const allRoutes = withSecurityHeaders({
  ...createWebappStaticRoutes(), // in-memory strings, no cache wrapper needed
  ...cache.wrapRoutes(
    createWebappPageRoutes({
      analyticsRepository,
      documentRepository,
      homeRepository,
      metadataRepository,
      personRepository,
      sessionRepository,
      votingRepository,
    }),
    { cacheKey: webappCacheKey },
  ),
  // Liveness/readiness only — the rest of the JSON API has been removed.
  ...createHealthRoutes(db),
  "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
});

const commonServeOptions = {
  port,
  reusePort,
  idleTimeout,
  development: isDev,

  error(error: Error) {
    console.error(error);
    return addSecurityHeaders(
      new Response("Internal Server Error", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      }),
    );
  },
};

const server = Bun.serve({
  ...commonServeOptions,
  routes: allRoutes,
});

console.log(
  `Listening on ${server.url} ${server.development ? "(development)" : "(production)"}`,
);
