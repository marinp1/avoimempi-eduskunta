import type { VotingRepository } from "./voting.repository";
import { buildAanestyksetData } from "./pages/list.view-model";
import { buildSingleVoteData, buildMpVotes } from "./pages/detail.view-model";
import type { ProvenanceService } from "#server/domain/provenance.service";

export class VotingService {
  constructor(
    private readonly votingRepo: VotingRepository,
    private readonly provenanceService: ProvenanceService,
  ) {}

  browseVotings(params: {
    startDate?: string;
    endDate?: string;
    sort?: "newest" | "oldest" | "closest" | "largest";
    limit?: number;
  }) {
    const browseResult = this.votingRepo.browseVotings({
      startDate: params.startDate,
      endDate: params.endDate,
      sort: params.sort ?? "newest",
      limit: params.limit ?? 500,
    });
    return browseResult;
  }

  getVotingList(params: {
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
  }) {
    const browseResult = this.votingRepo.browseVotings({
      startDate: params.startDate,
      endDate: params.endDate,
      sort: "newest",
      limit: 500,
    });
    const totalCount = this.votingRepo.countVotings({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return buildAanestyksetData({
      votings: browseResult,
      totalCount,
      activeFilter: null,
      fetchedAt: this.provenanceService.tableFetchedAt("SaliDBAanestys"),
    });
  }

  getVotingDetail(votingId: string) {
    const voting = this.votingRepo.fetchVotingById({ votingId });
    if (!voting) return null;
    const details = this.votingRepo.fetchVotingInlineDetails({ votingId });
    return buildSingleVoteData({
      voting,
      details,
      provenanceService: this.provenanceService,
    });
  }

  getVotingMap(votingId: string) {
    const voting = this.votingRepo.fetchVotingById({ votingId });
    if (!voting) return null;
    const memberVotes = this.votingRepo.fetchVotingMemberVotes({ votingId });
    return {
      votingId: voting.id,
      mpVotes: buildMpVotes(memberVotes ?? []),
    };
  }
}
