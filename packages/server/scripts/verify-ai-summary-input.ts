/**
 * Verifies the exact input the AI summary feature sends to the on-device
 * Summarizer, by rendering real pages through the route handlers (no server)
 * and running the production collectors against the rendered DOM.
 *
 * Usage (from repo root, with the main DB present):
 *   bun packages/server/scripts/verify-ai-summary-input.ts [kkId] [sectionKey] [votingId]
 */
import "../src/i18n";
import { Window } from "happy-dom";
import { DatabaseConnection } from "../src/database/db";
import { ProvenanceService } from "../src/domain/provenance.service";
import { AnalyticsRepository } from "../src/features/analytics/analytics.repository";
import { DocumentRepository } from "../src/features/document/document.repository";
import { HomeRepository } from "../src/features/home/home.repository";
import { MetadataRepository } from "../src/features/metadata/metadata.repository";
import { PersonRepository } from "../src/features/person/person.repository";
import { SessionRepository } from "../src/features/session/session.repository";
import { VotingRepository } from "../src/features/voting/voting.repository";
import { DocumentService } from "../src/features/document/document.service";
import { MetadataService } from "../src/features/metadata/metadata.service";
import { PersonService } from "../src/features/person/person.service";
import { SessionService } from "../src/features/session/session.service";
import { VotingService } from "../src/features/voting/voting.service";
import { createWebappPageRoutes } from "../routes/webapp-routes";
import {
  BLOCK_PROFILES,
  buildPartContext,
  resolvePageProfile,
} from "../src/client/ai-summary-content";

const kkId = process.argv[2] ?? "340666";
const sectionKey = process.argv[3] ?? "0wOJpGX5WRvAe2d";
const votingId = process.argv[4] ?? "56634";

const db = new DatabaseConnection().db;
const provenanceService = new ProvenanceService(null);
const documentRepository = new DocumentRepository(db);
const personRepository = new PersonRepository(db);
const sessionRepository = new SessionRepository(db);
const votingRepository = new VotingRepository(db);
const analyticsRepository = new AnalyticsRepository(db);

const routes = createWebappPageRoutes({
  analyticsRepository,
  documentRepository,
  documentService: new DocumentService(documentRepository, personRepository),
  homeRepository: new HomeRepository(sessionRepository, analyticsRepository, {
    fetchLastMigrationTimestamp: () => null,
    fetchLastScraperRunAt: () => null,
    fetchLastMigratorRunAt: () => null,
  }),
  metadataRepository: new MetadataRepository(db),
  metadataService: new MetadataService(new MetadataRepository(db)),
  personRepository,
  personService: new PersonService(personRepository, provenanceService),
  sessionRepository,
  sessionService: new SessionService(
    sessionRepository,
    documentRepository,
    provenanceService,
  ),
  votingRepository,
  votingService: new VotingService(votingRepository, provenanceService),
  provenanceService,
  traceRepo: null,
  db,
});

async function renderPage(
  routePath: keyof typeof routes,
  url: string,
  params: Record<string, string>,
): Promise<Document> {
  const req = new Request(`http://localhost${url}`);
  (req as unknown as { params: Record<string, string> }).params = params;
  const res = await (
    routes[routePath] as { GET: (req: Request) => Response | Promise<Response> }
  ).GET(req);
  if (res.status !== 200) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  const html = await res.text();
  const window = new Window({ url: `http://localhost${url}` });
  window.document.write(html);
  return window.document as unknown as Document;
}

function show(label: string, value: string, maxLen = 900): void {
  const clipped =
    value.length > maxLen
      ? `${value.slice(0, maxLen)}\n… [yhteensä ${value.length} merkkiä]`
      : value;
  console.log(`\n--- ${label} ---\n${clipped}`);
}

function verifyPageSummary(doc: Document, expectKind: string): void {
  const scope =
    doc.querySelector<HTMLElement>("#main-content") ??
    (doc.body as unknown as HTMLElement);
  const el = doc.querySelector<HTMLElement>(".js-ai-summary[data-ai-kind]");
  if (!el) throw new Error("page has no .js-ai-summary element");
  const kind = el.dataset.aiKind ?? "";
  if (kind !== expectKind) {
    throw new Error(`expected kind ${expectKind}, got ${kind}`);
  }

  const profile = resolvePageProfile(kind, el.dataset.aiSubkind);
  if (!profile)
    throw new Error(`no profile for ${kind}/${el.dataset.aiSubkind}`);

  console.log(
    `\n=== ${kind}${el.dataset.aiSubkind ? `/${el.dataset.aiSubkind}` : ""} · ` +
      `${profile.type}/${profile.length} ===`,
  );
  const parts = profile.collectParts(scope, el);
  if (parts.length === 0) throw new Error("collectParts returned no parts");
  for (const part of parts) {
    console.log(`\n>>> OSA: ${part.heading ?? "(yksiosainen)"}`);
    show(
      "context (per-call)",
      buildPartContext(
        part.instruction,
        profile.contextLabel,
        el.dataset.aiContext ?? "",
      ),
      2000,
    );
    show("input", part.text);
  }
}

function verifyBlockSummary(doc: Document, blockKind: string): void {
  const scope =
    doc.querySelector<HTMLElement>("#main-content") ??
    (doc.body as unknown as HTMLElement);
  const el = doc.querySelector<HTMLElement>(
    `.js-ai-block[data-ai-kind="${blockKind}"]`,
  );
  if (!el) throw new Error(`page has no .js-ai-block[${blockKind}]`);
  const profile = BLOCK_PROFILES[blockKind];
  if (!profile) throw new Error(`no block profile for ${blockKind}`);

  console.log(
    `\n=== block:${blockKind} · ${profile.type}/${profile.length} ===`,
  );
  const part = profile.collectParts(scope, el)[0];
  if (!part) throw new Error("block collect returned nothing");
  show(
    "context (per-call)",
    buildPartContext(
      part.instruction,
      profile.contextLabel,
      el.dataset.aiContext ?? "",
    ),
    2000,
  );
  show("input", part.text);
}

const kkDoc = await renderPage("/asiakirja/:id", `/asiakirja/${kkId}?kind=kk`, {
  id: kkId,
});
verifyPageSummary(kkDoc, "document");
verifyBlockSummary(kkDoc, "doc-section");

const debateDoc = await renderPage(
  "/keskustelu",
  `/keskustelu?key=${encodeURIComponent(sectionKey)}`,
  {},
);
verifyPageSummary(debateDoc, "debate");
verifyBlockSummary(debateDoc, "speech");

const votingDoc = await renderPage("/aanestys/:id", `/aanestys/${votingId}`, {
  id: votingId,
});
verifyPageSummary(votingDoc, "voting");

console.log("\nOK — kaikki syötteet kerätty.");
process.exit(0);
