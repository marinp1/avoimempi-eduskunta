import type { MetadataRepository } from "./metadata.repository";

export class MetadataService {
  constructor(private readonly metadataRepo: MetadataRepository) {}

  getGovernmentPeriods() {
    return this.metadataRepo.fetchHallituskaudet();
  }
}
