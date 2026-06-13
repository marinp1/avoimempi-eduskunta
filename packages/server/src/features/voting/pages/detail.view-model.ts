import {
  buildVoteTally,
  resolveParty,
  normalizeVote,
  normalizeBloc,
  type VoteToken,
} from "#server/domain";
import { formatFiLongDate } from "#server/helpers";
import type {
  CitePropData,
  ProvenanceService,
} from "#server/domain/provenance.service";
import type { SourceNoteOptions } from "#server/components/provenance";
import i18next from "i18next";
import { parseVotePropositions } from "../voting-title";
import type { ResolvedStatement } from "../voting-title";

/** Splits a mietintö decision text into display paragraphs, stripping the
 * standard heading lines. */
export function buildDecisionParagraphs(decisionText: string | null): string[] {
  if (!decisionText) return [];
  return decisionText
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length > 0 &&
        !/^VALIOKUNNAN PÄÄTÖSEHDOTUS$/i.test(s) &&
        !/päätösehdotus:$/i.test(s),
    );
}

/** Resolved statement proposal data as produced by VotingService. */
export type StatementProposalInput =
  | {
      kind: "vastalause";
      resolved: ResolvedStatement;
      reportId: number;
      reportIdentifier: string;
    }
  | { kind: "moniste"; title: string; edkIdentifier: string }
  | {
      kind: "muutosehdotus";
      dissentLabel: string;
      reportId: number;
      reportIdentifier: string;
    };

interface VotingRow {
  id: number;
  number: number;
  title: string | null;
  title_extra: string | null;
  start_date: string | null;
  start_time: string | null;
  session_key: string;
  section_order: number | null;
  section_key: string | null;
  section_title: string | null;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
}

interface PartyBreakdownRow {
  party_code: string;
  party_name: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
  is_government_party: 0 | 1;
}

interface MemberVoteRow {
  person_id: number;
  first_name: string;
  last_name: string;
  party_code: string;
  vote: string;
  is_government: 0 | 1;
}

interface GovernmentOppositionRow {
  government_yes: number;
  government_no: number;
  government_abstain: number;
  government_absent: number;
  government_total: number;
  opposition_yes: number;
  opposition_no: number;
  opposition_abstain: number;
  opposition_absent: number;
  opposition_total: number;
}

interface RelatedVotingRow {
  id: number;
  number: number | null;
  start_time: string | null;
  context_title: string;
  n_yes: number;
  n_no: number;
}

interface VotingInlineDetails {
  partyBreakdown: PartyBreakdownRow[] | null;
  memberVotes: MemberVoteRow[] | null;
  governmentOpposition: GovernmentOppositionRow | null;
  relatedVotings: RelatedVotingRow[] | null;
}

export interface SingleVoteData {
  vote: {
    id: number;
    votingNumber: number;
    title: string;
    titleExtra: string | null;
    date: string;
    dateLabel: string;
    time: string;
    sessionKey: string;
    sessionDateLabel: string;
    asiakohtaNum: number | null;
    sectionKey: string | null;
    sectionTitle: string | null;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nTotal: number;
    yesPct: number;
    noPct: number;
    emptyPct: number;
    absentPct: number;
    outcome: "ok" | "no";
    outcomeLabel: string;
    yesProposition: string | null;
    noProposition: string | null;
  };
  /**
   * The lausumaehdotus (statement proposal) the voting decided on, resolved
   * from the voting title. Null when the title has no proposal reference or
   * the reference could not be resolved unambiguously.
   */
  statementProposal:
    | {
        kind: "vastalause";
        statementText: string;
        statementNumber: number | null;
        dissentLabel: string;
        reportIdentifier: string;
        reportUrl: string;
      }
    | { kind: "moniste"; title: string; pdfUrl: string }
    | {
        kind: "muutosehdotus";
        dissentLabel: string;
        reportIdentifier: string;
        reportUrl: string;
      }
    | null;
  /** Mietintö (committee report) that is the JAA proposition for this voting. */
  mietinto: {
    decisionParagraphs: string[];
    reportIdentifier: string;
    reportUrl: string;
  } | null;
  /** Row-level trace for this voting record (deep-links to the source row). */
  provenance: CitePropData;
  partyBreakdown: Array<{
    partyCode: string;
    partyName: string;
    partyColor: string;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nTotal: number;
    yesPct: number;
    noPct: number;
  }>;
  mpVotes: Array<{
    personId: number;
    firstName: string;
    lastName: string;
    partyCode: string;
    partyColor: string;
    vote: VoteToken;
    bloc: "government" | "opposition";
    personSort: string;
  }>;
  govOppBreakdown: {
    governmentYes: number;
    governmentNo: number;
    governmentEmpty: number;
    governmentAbsent: number;
    governmentTotal: number;
    oppositionYes: number;
    oppositionNo: number;
    oppositionEmpty: number;
    oppositionAbsent: number;
    oppositionTotal: number;
  };
  relatedVotes: Array<{
    id: number;
    votingNumber: number;
    title: string;
    date: string;
    nYes: number;
    nNo: number;
    outcomeLabel: string;
  }>;
  /** Footer source note derived from the voting-detail query's source datasets. */
  sourceNote: SourceNoteOptions;
}

export function buildMpVotes(
  memberVotes: Array<{
    person_id: number;
    first_name: string;
    last_name: string;
    party_code: string;
    vote: string;
    is_government: 0 | 1;
  }>,
): SingleVoteData["mpVotes"] {
  return memberVotes.map(
    (mv) =>
      ({
        personId: mv.person_id,
        firstName: mv.first_name,
        lastName: mv.last_name,
        partyCode: mv.party_code,
        partyColor: resolveParty(mv.party_code).color,
        vote: normalizeVote(mv.vote),
        bloc: normalizeBloc(mv.is_government),
        personSort: `${mv.last_name} ${mv.first_name}`.toLowerCase(),
      }) as const,
  );
}

function buildStatementProposal(
  input: StatementProposalInput | null | undefined,
): SingleVoteData["statementProposal"] {
  if (!input) return null;
  if (input.kind === "moniste") {
    return {
      kind: "moniste",
      title: input.title,
      pdfUrl: `https://www.eduskunta.fi/FI/vaski/JulkaisuMetatieto/Documents/${input.edkIdentifier}.pdf`,
    };
  }
  if (input.kind === "muutosehdotus") {
    return {
      kind: "muutosehdotus",
      dissentLabel: input.dissentLabel,
      reportIdentifier: input.reportIdentifier,
      reportUrl: `/asiakirja/${input.reportId}?kind=mietinto`,
    };
  }
  const dissentLabel =
    input.resolved.dissentHeading ??
    (input.resolved.dissentNumber !== null
      ? `Vastalause ${input.resolved.dissentNumber}`
      : "Vastalause");
  return {
    kind: "vastalause",
    statementText: input.resolved.statementText,
    statementNumber: input.resolved.statementNumber,
    dissentLabel,
    reportIdentifier: input.reportIdentifier,
    reportUrl: `/asiakirja/${input.reportId}?kind=mietinto`,
  };
}

export function buildSingleVoteData(input: {
  voting: VotingRow;
  details: VotingInlineDetails | null;
  mietinto?: {
    reportId: number;
    reportIdentifier: string;
    decisionText: string | null;
  } | null;
  statementProposal?: StatementProposalInput | null;
  provenanceService: ProvenanceService;
}): SingleVoteData {
  const { voting, details, provenanceService } = input;
  const propositions = parseVotePropositions(voting.title);

  const tally = buildVoteTally({
    nYes: voting.n_yes,
    nNo: voting.n_no,
    nEmpty: voting.n_abstain,
    nAbsent: voting.n_absent,
    nTotal: voting.n_total,
  });

  const partyBreakdown =
    details?.partyBreakdown?.map((pb) => {
      const party = resolveParty(pb.party_code, pb.party_name);
      const pt = buildVoteTally({
        nYes: pb.n_yes,
        nNo: pb.n_no,
        nEmpty: pb.n_abstain,
        nAbsent: pb.n_absent,
        nTotal: pb.n_total,
      });
      return {
        partyCode: party.code,
        partyName: party.name,
        partyColor: party.color,
        nYes: pt.nYes,
        nNo: pt.nNo,
        nEmpty: pt.nEmpty,
        nAbsent: pt.nAbsent,
        nTotal: pt.nTotal,
        yesPct: pt.yesPct,
        noPct: pt.noPct,
      };
    }) ?? [];

  const mpVotes = buildMpVotes(details?.memberVotes ?? []);

  const govOppBreakdown = details?.governmentOpposition
    ? {
        governmentYes: details.governmentOpposition.government_yes,
        governmentNo: details.governmentOpposition.government_no,
        governmentEmpty: details.governmentOpposition.government_abstain,
        governmentAbsent: details.governmentOpposition.government_absent,
        governmentTotal: details.governmentOpposition.government_total,
        oppositionYes: details.governmentOpposition.opposition_yes,
        oppositionNo: details.governmentOpposition.opposition_no,
        oppositionEmpty: details.governmentOpposition.opposition_abstain,
        oppositionAbsent: details.governmentOpposition.opposition_absent,
        oppositionTotal: details.governmentOpposition.opposition_total,
      }
    : {
        governmentYes: 0,
        governmentNo: 0,
        governmentEmpty: 0,
        governmentAbsent: 0,
        governmentTotal: 0,
        oppositionYes: 0,
        oppositionNo: 0,
        oppositionEmpty: 0,
        oppositionAbsent: 0,
        oppositionTotal: 0,
      };

  const relatedVotes =
    details?.relatedVotings?.map((rv) => ({
      id: rv.id,
      votingNumber: rv.number ?? 0,
      title: rv.context_title ?? "",
      date: rv.start_time ?? "",
      nYes: rv.n_yes,
      nNo: rv.n_no,
      outcomeLabel:
        rv.n_yes > rv.n_no
          ? i18next.t("votings:outcome_approved")
          : i18next.t("votings:outcome_rejected"),
    })) ?? [];

  const recordLabel = i18next.t("votings:detail.doc_id_format", {
    number: voting.number,
    sessionKey: voting.session_key ?? "",
  });

  return {
    vote: {
      id: voting.id,
      votingNumber: voting.number,
      title: voting.title ?? "",
      titleExtra: voting.title_extra ?? null,
      date: voting.start_date ?? "",
      dateLabel: voting.start_date ? formatFiLongDate(voting.start_date) : "",
      time: voting.start_time ?? "",
      sessionKey: voting.session_key ?? "",
      sessionDateLabel: voting.start_date
        ? formatFiLongDate(voting.start_date)
        : "",
      asiakohtaNum: voting.section_order ?? null,
      sectionKey: voting.section_key ?? null,
      sectionTitle: voting.section_title ?? null,
      nYes: tally.nYes,
      nNo: tally.nNo,
      nEmpty: tally.nEmpty,
      nAbsent: tally.nAbsent,
      nTotal: tally.nTotal,
      yesPct: tally.yesPct,
      noPct: tally.noPct,
      emptyPct: tally.emptyPct,
      absentPct: tally.absentPct,
      outcome: tally.outcome,
      outcomeLabel:
        tally.outcome === "ok"
          ? i18next.t("votings:outcome_approved")
          : i18next.t("votings:outcome_rejected"),
      yesProposition: propositions?.yes ?? null,
      noProposition: propositions?.no ?? null,
    },
    statementProposal: buildStatementProposal(input.statementProposal),
    mietinto: input.mietinto
      ? {
          decisionParagraphs: buildDecisionParagraphs(
            input.mietinto.decisionText,
          ),
          reportIdentifier: input.mietinto.reportIdentifier,
          reportUrl: `/asiakirja/${input.mietinto.reportId}?kind=mietinto`,
        }
      : null,
    provenance: provenanceService.forRow("Voting", voting.id, {
      value: `${i18next.t(
        tally.outcome === "ok"
          ? "votings:outcome_approved"
          : "votings:outcome_rejected",
      )} (${tally.nYes}–${tally.nNo})`,
      caption: voting.title ?? undefined,
      label: recordLabel,
      markText: "*",
    }),
    partyBreakdown,
    mpVotes,
    govOppBreakdown,
    relatedVotes,
    sourceNote: provenanceService.sourceNoteForQuery("voting-detail.sql"),
  };
}
