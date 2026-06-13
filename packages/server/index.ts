// modules/server/server.ts
import "./src/i18n";
import {
  getLastMigratorRunAtPath,
  getLastScraperRunAtPath,
} from "../shared/database";
import { createResponseCache } from "./src/cache/response-cache";
import { loadRuntimeConfig } from "./src/config/runtime-config";
import { DatabaseConnection, openTraceDb } from "./src/database/db";
import { prepareDatabaseForServerStartup } from "./src/database/launch-db";
import { TraceRepository } from "./src/database/trace.repository";
import { ProvenanceService } from "./src/domain/provenance.service";
import { sanityChecks } from "./src/features/quality/quality.checks";
import { SanityRunner } from "./src/features/quality/quality.runner";
import { AnalyticsRepository } from "./src/features/analytics/analytics.repository";
import { DocumentRepository } from "./src/features/document/document.repository";
import { HomeRepository } from "./src/features/home/home.repository";
import { MetadataRepository } from "./src/features/metadata/metadata.repository";
import { PersonRepository } from "./src/features/person/person.repository";
import { SessionRepository } from "./src/features/session/session.repository";
import { VotingRepository } from "./src/features/voting/voting.repository";
import { DocumentService } from "./src/features/document/document.service";
import { MetadataService } from "./src/features/metadata/metadata.service";
import { PersonService } from "./src/features/person/person.service";
import { SessionService } from "./src/features/session/session.service";
import { VotingService } from "./src/features/voting/voting.service";
import {
  addSecurityHeaders,
  withSecurityHeaders,
} from "./src/middleware/security-headers";
import { createHealthRoutes } from "./routes/health-routes";
import {
  createWebappPageRoutes,
  createWebappStaticRoutes,
} from "./routes/webapp-routes";

await prepareDatabaseForServerStartup();
const databaseConnection = new DatabaseConnection();
const db = databaseConnection.db;

const traceDb = openTraceDb();
if (!traceDb) {
  console.warn(
    "Trace DB not found — provenance timestamps will show current time",
  );
}
const traceRepo = traceDb ? new TraceRepository(traceDb) : null;
const provenanceService = new ProvenanceService(traceRepo);

const analyticsRepository = new AnalyticsRepository(db);
const documentRepository = new DocumentRepository(db);
const metadataRepository = new MetadataRepository(db);
const personRepository = new PersonRepository(db);
const sessionRepository = new SessionRepository(db);
const votingRepository = new VotingRepository(db);
const personService = new PersonService(personRepository, provenanceService);
const documentService = new DocumentService(
  documentRepository,
  personRepository,
);
const metadataService = new MetadataService(metadataRepository);
const sessionService = new SessionService(
  sessionRepository,
  documentRepository,
  provenanceService,
);
const votingService = new VotingService(votingRepository, provenanceService);
const sanityRunner = new SanityRunner(db, sanityChecks);

const readTimestamp = async (filePath: string): Promise<string | null> => {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return null;
  const text = (await file.text()).trim();
  return text || null;
};

const fetchLastMigrationTimestamp = (): string | null => {
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
};

const homeRepository = new HomeRepository(
  sessionRepository,
  analyticsRepository,
  {
    fetchLastMigrationTimestamp,
    fetchLastScraperRunAt: () => readTimestamp(getLastScraperRunAtPath()),
    fetchLastMigratorRunAt: () => readTimestamp(getLastMigratorRunAtPath()),
  },
);

const { isDev, port, idleTimeout, reusePort } = loadRuntimeConfig();

const generationKey = fetchLastMigrationTimestamp();

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
      documentService,
      homeRepository,
      metadataRepository,
      metadataService,
      personRepository,
      personService,
      sessionRepository,
      sessionService,
      votingRepository,
      votingService,
      provenanceService,
      traceRepo,
      sanityRunner,
      db,
    }),
    {
      cacheKey: webappCacheKey,
      // Live runner state: the page must reflect progress and the status
      // fragment is polled until the run completes — never cache either.
      exclude: new Set(["/laadunvalvonta", "/laadunvalvonta/status"]),
    },
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

// Startup data sanity checks: run in the background (never block startup);
// results appear on /laadunvalvonta as each check completes.
void sanityRunner.start().then(() => {
  const state = sanityRunner.getState();
  if (state.phase === "complete") {
    const failed = state.completed.filter((c) => c.status !== "pass").length;
    console.log(
      `Sanity checks complete: ${state.completed.length - failed}/${state.total} passed` +
        (failed > 0 ? ` (${failed} with findings — see /laadunvalvonta)` : ""),
    );
  }
});
