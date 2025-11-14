export interface ParticipationData {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  party_name: string | null;
  term_start: string;
  term_end: string;
  votes_cast: number;
  total_votings: number;
  participation_rate: number;
}

export type SortField =
  | "participation_rate"
  | "votes_cast"
  | "sort_name"
  | "party_name";

export type SortDirection = "asc" | "desc";
