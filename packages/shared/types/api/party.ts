/**
 * Party/analytics API DTOs — stable external contracts for party data.
 */

export interface PartySummaryDto {
  partyCode: string;
  partyDisplayCode: string;
  partyName: string;
  memberCount: number;
  isInGovernment: boolean;
  votesCast: number;
  totalVotings: number;
  participationRate: number;
  femaleCount: number;
  maleCount: number;
  averageAge: number;
}

interface PartySummaryInput {
  party_code: string;
  party_display_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number | boolean;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
  female_count: number;
  male_count: number;
  average_age: number;
}

export function buildPartySummaryDto(row: PartySummaryInput): PartySummaryDto {
  return {
    partyCode: row.party_code,
    partyDisplayCode: row.party_display_code,
    partyName: row.party_name,
    memberCount: row.member_count,
    isInGovernment: Boolean(row.is_in_government),
    votesCast: row.votes_cast,
    totalVotings: row.total_votings,
    participationRate: row.participation_rate,
    femaleCount: row.female_count,
    maleCount: row.male_count,
    averageAge: row.average_age,
  };
}

export function buildPartySummaryDtos(
  rows: PartySummaryInput[],
): PartySummaryDto[] {
  return rows.map(buildPartySummaryDto);
}
