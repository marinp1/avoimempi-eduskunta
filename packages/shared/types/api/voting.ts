/**
 * Voting API DTOs — stable external contracts for voting data.
 * These replace raw SQL row shapes returned by the API.
 */

export interface VotingListItemDto {
  id: number;
  votingNumber: number;
  title: string;
  contextTitle: string;
  date: string | null;
  endDate: string | null;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  absentVotes: number;
  totalVotes: number;
  isAnnulled: boolean;
  sessionKey: string;
  sectionKey: string | null;
  resultUrl: string | null;
  proceedingsUrl: string | null;
}

/** A voting as cast by one MP — a list item plus the member's vote + government context. */
export interface PersonVoteDto extends VotingListItemDto {
  vote: string;
  governmentName: string | null;
  governmentStartDate: string | null;
  governmentEndDate: string | null;
  isCoalition: boolean;
}

export interface PartyBreakdownDto {
  partyCode: string;
  partyName: string;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  absentVotes: number;
  totalVotes: number;
}

export interface MemberVoteDto {
  personId: number;
  firstName: string;
  lastName: string;
  partyCode: string;
  vote: string;
  isGovernment: boolean;
}

export interface GovOppBreakdownDto {
  governmentYesVotes: number;
  governmentNoVotes: number;
  governmentAbstainVotes: number;
  governmentAbsentVotes: number;
  governmentTotalVotes: number;
  oppositionYesVotes: number;
  oppositionNoVotes: number;
  oppositionAbstainVotes: number;
  oppositionAbsentVotes: number;
  oppositionTotalVotes: number;
}

export interface RelatedVotingDto {
  id: number;
  votingNumber: number | null;
  date: string | null;
  title: string;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  absentVotes: number;
  totalVotes: number;
  sessionKey: string | null;
}

export interface VotingDetailDto {
  voting: VotingListItemDto;
  partyBreakdown: PartyBreakdownDto[];
  memberVotes: MemberVoteDto[];
  governmentOpposition: GovOppBreakdownDto | null;
  relatedVotings: RelatedVotingDto[];
}

interface VotingSearchResultInput {
  id: number;
  number: number;
  start_time: string | null;
  end_time?: string | null;
  annulled: boolean | number;
  title: string | null;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
  proceedings_url: string | null;
  result_url: string | null;
  section_key: string | null;
  session_key: string;
  context_title?: string;
}

export function buildVotingListItemDto(
  row: VotingSearchResultInput,
): VotingListItemDto {
  return {
    id: row.id,
    votingNumber: row.number,
    title: row.title ?? "(ei otsikkoa)",
    contextTitle: row.context_title ?? row.title ?? "(ei otsikkoa)",
    date: row.start_time ?? null,
    endDate: row.end_time ?? null,
    yesVotes: row.n_yes,
    noVotes: row.n_no,
    abstainVotes: row.n_abstain,
    absentVotes: row.n_absent,
    totalVotes: row.n_total,
    isAnnulled: Boolean(row.annulled),
    sessionKey: row.session_key,
    sectionKey: row.section_key ?? null,
    resultUrl: row.result_url ?? null,
    proceedingsUrl: row.proceedings_url ?? null,
  };
}

export function buildVotingListDtos(
  rows: VotingSearchResultInput[],
): VotingListItemDto[] {
  return rows.map(buildVotingListItemDto);
}

interface PersonVoteInput extends VotingSearchResultInput {
  vote: string;
  government_name: string | null;
  government_start_date: string | null;
  government_end_date: string | null;
  is_coalition: number | boolean;
}

export function buildPersonVoteDto(row: PersonVoteInput): PersonVoteDto {
  return {
    ...buildVotingListItemDto(row),
    vote: row.vote,
    governmentName: row.government_name ?? null,
    governmentStartDate: row.government_start_date ?? null,
    governmentEndDate: row.government_end_date ?? null,
    isCoalition: Boolean(row.is_coalition),
  };
}

export function buildPersonVoteDtos(rows: PersonVoteInput[]): PersonVoteDto[] {
  return rows.map(buildPersonVoteDto);
}

interface PartyBreakdownInput {
  party_code: string;
  party_name: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
}

function buildPartyBreakdownDto(row: PartyBreakdownInput): PartyBreakdownDto {
  return {
    partyCode: row.party_code,
    partyName: row.party_name,
    yesVotes: row.n_yes,
    noVotes: row.n_no,
    abstainVotes: row.n_abstain,
    absentVotes: row.n_absent,
    totalVotes: row.n_total,
  };
}

interface MemberVoteInput {
  person_id: number;
  first_name: string;
  last_name: string;
  party_code: string;
  vote: string;
  is_government: number | boolean;
}

function buildMemberVoteDto(row: MemberVoteInput): MemberVoteDto {
  return {
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    partyCode: row.party_code,
    vote: row.vote,
    isGovernment: Boolean(row.is_government),
  };
}

interface GovOppBreakdownInput {
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

function buildGovOppBreakdownDto(
  row: GovOppBreakdownInput,
): GovOppBreakdownDto {
  return {
    governmentYesVotes: row.government_yes,
    governmentNoVotes: row.government_no,
    governmentAbstainVotes: row.government_abstain,
    governmentAbsentVotes: row.government_absent,
    governmentTotalVotes: row.government_total,
    oppositionYesVotes: row.opposition_yes,
    oppositionNoVotes: row.opposition_no,
    oppositionAbstainVotes: row.opposition_abstain,
    oppositionAbsentVotes: row.opposition_absent,
    oppositionTotalVotes: row.opposition_total,
  };
}

interface RelatedVotingInput {
  id: number;
  number: number | null;
  start_time: string | null;
  context_title: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
  session_key: string | null;
}

function buildRelatedVotingDto(row: RelatedVotingInput): RelatedVotingDto {
  return {
    id: row.id,
    votingNumber: row.number,
    date: row.start_time ?? null,
    title: row.context_title,
    yesVotes: row.n_yes,
    noVotes: row.n_no,
    abstainVotes: row.n_abstain,
    absentVotes: row.n_absent,
    totalVotes: row.n_total,
    sessionKey: row.session_key,
  };
}

export interface VotingDetailInput {
  voting: VotingSearchResultInput;
  partyBreakdown: PartyBreakdownInput[];
  memberVotes: MemberVoteInput[];
  governmentOpposition: GovOppBreakdownInput | null;
  relatedVotings: RelatedVotingInput[];
}

export function buildVotingDetailDto(
  input: VotingDetailInput,
): VotingDetailDto {
  return {
    voting: buildVotingListItemDto(input.voting),
    partyBreakdown: input.partyBreakdown.map(buildPartyBreakdownDto),
    memberVotes: input.memberVotes.map(buildMemberVoteDto),
    governmentOpposition: input.governmentOpposition
      ? buildGovOppBreakdownDto(input.governmentOpposition)
      : null,
    relatedVotings: input.relatedVotings.map(buildRelatedVotingDto),
  };
}
