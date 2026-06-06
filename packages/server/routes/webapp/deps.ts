import type { AnalyticsService } from "../../src/features/analytics/analytics.service";
import type { DocumentService } from "../../src/features/document/document.service";
import type { HomeService } from "../../src/features/home/home.service";
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

export interface WebappDeps {
  analyticsRepository: AnalyticsRepository;
  analyticsService: AnalyticsService;
  documentRepository: DocumentRepository;
  documentService: DocumentService;
  homeRepository: HomeRepository;
  homeService: HomeService;
  metadataRepository: MetadataRepository;
  metadataService: MetadataService;
  personRepository: PersonRepository;
  personService: PersonService;
  sessionRepository: SessionRepository;
  sessionService: SessionService;
  votingRepository: VotingRepository;
  votingService: VotingService;
}
