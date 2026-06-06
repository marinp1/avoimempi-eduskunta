/** A party's composition data for the home page overview. */
export interface PartyInfo {
  party_code: string;
  party_display_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
}

/** A narrowly-decided vote, featured on the home page. */
export interface CloseVote {
  id: number;
  title: string;
  section_title: string;
  n_yes: number;
  n_no: number;
  margin: number;
  start_time: string;
  session_key: string;
}

/** Speech activity stats for a single MP, shown on the home page. */
export interface SpeakerActivity {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  speech_count: number;
  total_words: number;
}

/** Aggregated data payload for the home page view. */
export interface HomeData {
  latestDay: {
    date: string | null;
    sessions: Array<{
      key: string;
      voting_count: number;
      section_count: number;
    }>;
  };
  composition: {
    totalMembers: number;
    governmentMembers: number;
    oppositionMembers: number;
    partyCount: number;
    parties: PartyInfo[];
  };
  signals: {
    closeVotes: CloseVote[];
    speechActivity: SpeakerActivity[];
  };
}
