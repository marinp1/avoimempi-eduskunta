export interface ParticipationData {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
}

export interface ParticipationByGovernmentData {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  government: string;
  government_start: string;
  government_end: string | null;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
  was_in_government: 0 | 1;
  was_in_coalition: 0 | 1;
}

export type SortField = "participation_rate" | "votes_cast" | "sort_name";

export type SortDirection = "asc" | "desc";
