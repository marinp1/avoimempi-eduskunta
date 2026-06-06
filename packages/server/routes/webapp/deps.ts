import type { AnalyticsRepository } from "../../database/repositories/analytics-repository";
import type { DocumentRepository } from "../../database/repositories/document-repository";
import type { HomeRepository } from "../../database/repositories/home-repository";
import type { MetadataRepository } from "../../database/repositories/metadata-repository";
import type { PersonRepository } from "../../database/repositories/person-repository";
import type { SessionRepository } from "../../database/repositories/session-repository";
import type { VotingRepository } from "../../database/repositories/voting-repository";

export interface WebappDeps {
  analyticsRepository: AnalyticsRepository;
  documentRepository: DocumentRepository;
  homeRepository: HomeRepository;
  metadataRepository: MetadataRepository;
  personRepository: PersonRepository;
  sessionRepository: SessionRepository;
  votingRepository: VotingRepository;
}
