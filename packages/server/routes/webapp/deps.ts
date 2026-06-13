import type { Database } from "bun:sqlite";
import type { DocumentService } from "../../src/features/document/document.service";
import type { MetadataService } from "../../src/features/metadata/metadata.service";
import type { PersonService } from "../../src/features/person/person.service";
import type { SessionService } from "../../src/features/session/session.service";
import type { VotingService } from "../../src/features/voting/voting.service";
import type { AnalyticsRepository } from "../../src/features/analytics/analytics.repository";
import type { DocumentRepository } from "../../src/features/document/document.repository";
import type { HomeRepository } from "../../src/features/home/home.repository";
import type { MetadataRepository } from "../../src/features/metadata/metadata.repository";
import type { PersonRepository } from "../../src/features/person/person.repository";
import type { SessionRepository } from "../../src/features/session/session.repository";
import type { VotingRepository } from "../../src/features/voting/voting.repository";
import type { ProvenanceService } from "../../src/domain/provenance.service";
import type { TraceRepository } from "../../src/database/trace.repository";
import type { SanityRunner } from "../../src/features/quality/quality.runner";

export interface WebappDeps {
  analyticsRepository: AnalyticsRepository;
  documentRepository: DocumentRepository;
  documentService: DocumentService;
  homeRepository: HomeRepository;
  metadataRepository: MetadataRepository;
  metadataService: MetadataService;
  personRepository: PersonRepository;
  personService: PersonService;
  sessionRepository: SessionRepository;
  sessionService: SessionService;
  votingRepository: VotingRepository;
  votingService: VotingService;
  provenanceService: ProvenanceService;
  traceRepo: TraceRepository | null;
  /** Startup data sanity-check runner — state is read by /laadunvalvonta. */
  sanityRunner: SanityRunner;
  /** Main app DB — used by the trace overlay's on-demand provenance probes. */
  db: Database;
}
