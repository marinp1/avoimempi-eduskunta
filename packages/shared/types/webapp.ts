export interface RosterRow {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  birth_year: number | null;
  minister: number;
  group_abbreviation: string | null;
  is_in_government: number;
  district_name: string | null;
  participation_rate: number;
}

export interface SessionIndexRow {
  key: string;
  date: string;
  voting_count: number;
  speech_count: number;
  section_count: number;
}

export interface SessionSectionRow {
  key: string;
  title: string;
  session_key: string;
  voting_count: number;
  speech_count: number;
  minutes_item_number: number | null;
  minutes_item_title: string | null;
  minutes_related_document_identifier: string | null;
  minutes_processing_phase_code: string | null;
  processing_title: string | null;
  note: string | null;
  resolution: string | null;
  identifier: string | null;
}

export interface VotingRow {
  id: number;
  number: number;
  title: string | null;
  title_extra?: string | null;
  start_time: string | null;
  start_date?: string | null;
  session_key: string | null;
  section_key?: string | null;
  section_order?: number | null;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
  context_title?: string | null;
  section_title?: string | null;
}

export interface SpeechRow {
  person_id: number;
  first_name: string;
  last_name: string;
  party_abbreviation: string;
  speech_type: string | null;
  start_time: string | null;
  content: string | null;
  is_government?: number;
}

export interface RollCallEntry {
  person_id: number;
  first_name: string;
  last_name: string;
  party_code: string;
  attendance: string;
  is_in_government: number;
}

export interface PartySeatRow {
  party_code: string;
  seat_count: number;
  is_in_government: number;
}

export interface VoteDetail {
  partyBreakdown?: Array<{
    party_code: string;
    party_name: string | null;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
  }>;
  memberVotes?: Array<{
    person_id: number;
    first_name: string;
    last_name: string;
    party_code: string;
    vote: string;
    is_government: number;
  }>;
  governmentOpposition?: {
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
  };
  relatedVotings?: Array<{
    id: number;
    number: number | null;
    context_title: string | null;
    start_time: string | null;
    n_yes: number;
    n_no: number;
  }>;
}

export interface CompositionChangeRow {
  date: string;
  joined: number;
  left_count: number;
}
