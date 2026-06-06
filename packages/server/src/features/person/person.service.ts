import type { PersonRepository } from "./person.repository";
import {
  buildPersonProfileData,
  type PersonProfileData,
} from "./pages/profile.view-model";
import { fetchedAt } from "#server/helpers";

export class PersonService {
  constructor(private readonly personRepo: PersonRepository) {}

  async getProfile(personId: string): Promise<PersonProfileData | null> {
    const details = this.personRepo.fetchRepresentativeDetails({ personId });
    if (!details) return null;

    const [
      groupMemberships,
      districts,
      terms,
      votes,
      metrics,
      dissents,
      initiatives,
      questions,
      committees,
      focusAreas,
      speeches,
    ] = await Promise.all([
      this.personRepo.fetchPersonGroupMemberships({ personId }),
      this.personRepo.fetchRepresentativeDistricts({ personId }),
      this.personRepo.fetchPersonTerms({ personId }),
      this.personRepo.fetchPersonVotes({ personId }),
      this.personRepo.fetchPersonMetricsWithBaselines({ personId }),
      this.personRepo.fetchPersonDissents({ personId, limit: 20 }),
      this.personRepo.fetchPersonInitiatives({ personId, limit: 10 }),
      this.personRepo.fetchPersonQuestions({ personId, limit: 10 }),
      this.personRepo.fetchPersonCommittees({ personId }),
      this.personRepo.fetchPersonFocusAreas({ personId, topN: 12 }),
      this.personRepo.fetchPersonSpeeches({ personId, limit: 10 }),
    ]);

    const capabilities = this.personRepo.fetchPersonCapabilities({ personId });

    return buildPersonProfileData({
      details,
      groupMemberships,
      districts,
      terms,
      votes,
      metrics,
      dissents,
      initiatives,
      questions,
      committees,
      focusAreas,
      speeches,
      capabilities,
      fetchedAt: fetchedAt(),
    });
  }
}
