import type { HomeRepository } from "../../database/repositories/home-repository";
import type { PersonRepository } from "../../database/repositories/person-repository";
import type { SessionRepository } from "../../database/repositories/session-repository";

export interface WebappDeps {
  homeRepository: HomeRepository;
  personRepository: PersonRepository;
  sessionRepository: SessionRepository;
}
