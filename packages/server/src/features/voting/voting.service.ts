import type { VotingRepository } from "./voting.repository";
import { buildAanestyksetData } from "./pages/list.view-model";
import { buildSingleVoteData, buildMpVotes } from "./pages/detail.view-model";
import { fetchedAt } from "#server/helpers";

export class VotingService {
  constructor(private readonly votingRepo: VotingRepository) {}

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
    return buildAanestyksetData({
      votings: browseResult,
      searchQuery: params.searchQuery,
      activeFilter: null,
      fetchedAt: fetchedAt(),
    });
  }

  getVotingDetail(votingId: string) {
    const voting = this.votingRepo.fetchVotingById({ votingId });
    if (!voting) return null;
    const details = this.votingRepo.fetchVotingInlineDetails({ votingId });
    return buildSingleVoteData({
      voting,
      details,
      fetchedAt: fetchedAt(),
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
