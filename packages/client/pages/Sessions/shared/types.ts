export type SessionWithSections = {
  id: number;
  number?: number;
  key: string;
  date: string;
  year?: number;
  type?: string;
  state?: string;
  description?: string;
  start_time_actual?: string;
  start_time_reported?: string;
  agenda_title?: string;
  agenda_state?: string;
  section_count: number;
  voting_count: number;
  sections?: Section[];
  documents?: SessionDocument[];
  notices?: SessionNotice[];
  minutes_items?: SessionMinutesItem[];
  minutes_attachments?: SessionMinutesAttachment[];
};

export type Section = {
  id: number;
  key: string;
  ordinal: number;
  title: string;
  note?: string | null;
  processing_title?: string;
  identifier?: string;
  resolution?: string;
  session_key?: string;
  agenda_key?: string;
  modified_datetime?: string;
  vaski_id?: number;
  vaski_document_id?: number | null;
  voting_count?: number;
  speech_count?: number;
  speaker_count?: number;
  party_count?: number;
  vaski_document_type_name?: string | null;
  vaski_document_type_code?: string | null;
  vaski_eduskunta_tunnus?: string | null;
  vaski_document_number?: number | null;
  vaski_parliamentary_year?: string | null;
  vaski_title?: string | null;
  vaski_summary?: string | null;
  vaski_author_first_name?: string | null;
  vaski_author_last_name?: string | null;
  vaski_author_role?: string | null;
  vaski_author_organization?: string | null;
  vaski_creation_date?: string | null;
  vaski_status?: string | null;
  vaski_source_reference?: string | null;
  vaski_subjects?: string | null;
  minutes_entry_kind?: string | null;
  minutes_entry_order?: number | null;
  minutes_item_identifier?: number | null;
  minutes_parent_item_identifier?: string | null;
  minutes_item_number?: string | null;
  minutes_item_order?: number | null;
  minutes_item_title?: string | null;
  minutes_related_document_identifier?: string | null;
  minutes_related_document_type?: string | null;
  minutes_processing_phase_code?: string | null;
  minutes_general_processing_phase_code?: string | null;
  minutes_content_text?: string | null;
  minutes_match_mode?: string | null;
};

export type SessionDocument = {
  document_kind: "agenda" | "minutes" | "roll_call";
  id: number;
  type_slug: string;
  type_name_fi?: string | null;
  root_family?: string | null;
  eduskunta_tunnus?: string | null;
  document_type_code?: string | null;
  document_number_text?: string | null;
  parliamentary_year_text?: string | null;
  title?: string | null;
  status_text?: string | null;
  created_at?: string | null;
};

export type SessionNotice = {
  id: number;
  session_key: string;
  section_key?: string | null;
  notice_type?: string | null;
  text_fi?: string | null;
  valid_until?: string | null;
  sent_at?: string | null;
  created_datetime?: string | null;
  modified_datetime?: string | null;
};

export type SessionMinutesItem = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  item_type: string;
  ordinal?: number | null;
  title?: string | null;
  identifier_text?: string | null;
  processing_title?: string | null;
  note?: string | null;
  source_item_id?: number | null;
  source_parent_item_id?: number | null;
  section_id?: number | null;
  section_key?: string | null;
};

export type SessionMinutesAttachment = {
  id: number;
  session_key: string;
  minutes_document_id: number;
  minutes_item_id?: number | null;
  title?: string | null;
  related_document_tunnus?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  native_id?: string | null;
};

export type SectionDocumentLink = {
  id: number;
  section_key: string;
  label?: string | null;
  url?: string | null;
  document_tunnus?: string | null;
  document_id?: number | null;
  document_type_name?: string | null;
  document_type_code?: string | null;
  document_title?: string | null;
  document_created_at?: string | null;
  source_type?: string | null;
};

export type RollCallReport = {
  id: number;
  parliament_identifier: string;
  session_date: string;
  roll_call_start_time?: string | null;
  roll_call_end_time?: string | null;
  title?: string | null;
  status?: string | null;
  created_at?: string | null;
  edk_identifier: string;
  source_path: string;
  attachment_group_id?: number | null;
  entry_count: number;
  absent_count: number;
  late_count: number;
};

export type RollCallEntry = {
  roll_call_id: number;
  entry_order: number;
  person_id?: number | null;
  first_name: string;
  last_name: string;
  party?: string | null;
  entry_type: "absent" | "late";
  absence_reason?: string | null;
  arrival_time?: string | null;
};

export type SectionRollCallData = {
  report: RollCallReport;
  entries: RollCallEntry[];
};

export type SubSection = {
  id: number;
  session_key: string;
  section_key: string;
  entry_order: number;
  entry_kind: "asiakohta" | "muu_asiakohta";
  item_identifier: number;
  parent_item_identifier?: string | null;
  item_number?: string | null;
  item_order?: number | null;
  item_title?: string | null;
  related_document_identifier?: string | null;
  related_document_type?: string | null;
  processing_phase_code?: string | null;
  general_processing_phase_code?: string | null;
  content_text?: string | null;
  match_mode: "direct" | "parent_fallback";
  minutes_document_id: number;
};

export type MinutesContentReference = {
  vaskiId: number | null;
  code: string | null;
};

export type Speech = {
  id: number;
  ordinal: number;
  ordinal_number?: number;
  first_name: string;
  last_name: string;
  party_abbreviation?: string;
  speech_type?: string;
  content?: string;
  start_time?: string;
  end_time?: string;
};

export type Voting = {
  id: number;
  number: number;
  title: string;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
};

export type VotingInlineDetails = {
  voting: Voting & {
    n_abstain: number;
    n_absent: number;
    context_title?: string | null;
    parliamentary_item?: string | null;
    section_key?: string | null;
  };
  partyBreakdown: {
    party_code: string;
    party_name: string;
    n_yes: number;
    n_no: number;
    n_abstain: number;
    n_absent: number;
    n_total: number;
  }[];
  memberVotes: {
    person_id: number;
    first_name: string;
    last_name: string;
    party_code: string;
    vote: string;
    is_government: 0 | 1;
  }[];
  governmentOpposition: {
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
  } | null;
  relatedVotings: {
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
  }[];
};

export type SpeechData = {
  speeches: Speech[];
  total: number;
  page: number;
  totalPages: number;
};
