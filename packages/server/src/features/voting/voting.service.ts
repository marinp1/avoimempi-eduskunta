import type { VotingRepository } from "./voting.repository";
import { buildAanestyksetData } from "./pages/list.view-model";
import { buildSingleVoteData, buildMpVotes } from "./pages/detail.view-model";
import type { StatementProposalInput } from "./pages/detail.view-model";
import type { ProvenanceService } from "#server/domain/provenance.service";
import {
  groupDissentRows,
  parseStatementProposalRef,
  resolveDissentReference,
  resolveDissentStatement,
  resolveDissentStatementByProposer,
} from "./voting-title";

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
    const mietinto = this.resolveMietinto(voting);
    return buildSingleVoteData({
      voting,
      details,
      mietinto,
      statementProposal: this.resolveStatementProposal(voting),
      provenanceService: this.provenanceService,
    });
  }

  private resolveMietinto(voting: DatabaseQueries.VotingSearchResult) {
    const sourceReference = voting.parliamentary_item;
    if (!sourceReference) return null;
    const rows = this.votingRepo.fetchStatementReportRows({ sourceReference });
    if (rows.length !== 1) return null;
    const row = rows[0]!;
    return {
      reportId: row.id,
      reportIdentifier: row.parliament_identifier,
      decisionText: row.decision_text,
    };
  }

  /**
   * Resolves the lausumaehdotus or muutosehdotus referenced by a voting
   * title to its source text (vastalause statement in the mietintö) or, for
   * moniste proposals distributed only on paper, to the plenary annex PDF.
   * Plain references (no "(vl)"/"(moniste)" marker) try the vastalause route
   * via proposer signer matching first and fall back to the annex.
   * Muutosehdotus references resolve to the dissent heading without statement
   * text. Returns null when the title carries no reference or resolution is
   * ambiguous.
   */
  private resolveStatementProposal(
    voting: DatabaseQueries.VotingSearchResult,
  ): StatementProposalInput | null {
    const ref = parseStatementProposalRef(voting.title);
    if (!ref) return null;
    const sourceReference = voting.parliamentary_item;
    if (!sourceReference) return null;

    if (ref.kind === "muutosehdotus") {
      const rows = this.votingRepo.fetchStatementProposalRows({
        sourceReference,
      });
      const signerRows = this.votingRepo.fetchStatementSignerRows({
        sourceReference,
      });
      const grouped = groupDissentRows(rows, signerRows);
      const resolved = grouped
        ? resolveDissentReference(ref, grouped.dissents)
        : null;
      if (resolved && grouped) {
        const dissentLabel =
          resolved.dissentHeading ??
          (resolved.dissentNumber !== null
            ? `Vastalause ${resolved.dissentNumber}`
            : "Vastalause");
        return {
          kind: "muutosehdotus",
          dissentLabel,
          reportId: grouped.reportId,
          reportIdentifier: grouped.reportIdentifier,
        };
      }
      return null;
    }

    if (ref.kind === "vastalause" || ref.kind === "plain") {
      const rows = this.votingRepo.fetchStatementProposalRows({
        sourceReference,
      });
      const signerRows =
        ref.kind === "plain"
          ? this.votingRepo.fetchStatementSignerRows({ sourceReference })
          : [];
      const grouped = groupDissentRows(rows, signerRows);
      const resolved = grouped
        ? ref.kind === "vastalause"
          ? resolveDissentStatement(ref, grouped.dissents)
          : resolveDissentStatementByProposer(ref, grouped.dissents)
        : null;
      if (resolved && grouped) {
        return {
          kind: "vastalause",
          resolved,
          reportId: grouped.reportId,
          reportIdentifier: grouped.reportIdentifier,
        };
      }
      if (ref.kind === "vastalause") return null;
    }

    if (!voting.session_key) return null;
    const annex = this.votingRepo.fetchStatementAnnex({
      sourceReference,
      sessionKey: voting.session_key,
    });
    if (!annex?.edk_identifier) return null;
    return {
      kind: "moniste",
      title: annex.title ?? "",
      edkIdentifier: annex.edk_identifier,
    };
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
