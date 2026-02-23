import type { Database } from "bun:sqlite";
import * as queries from "../queries";

const buildSectionRows = (
  db: Database,
  sessionKey: string,
  sectionsStmt: ReturnType<Database["prepare"]>,
  votingCountStmt: ReturnType<Database["prepare"]>,
) => {
  const sections = sectionsStmt.all({ $sessionKey: sessionKey });
  const votingCountResult = votingCountStmt.get(
    { $sessionKey: sessionKey },
  ) as { voting_count?: number } | null;
  return {
    sections,
    section_count: sections.length,
    voting_count: votingCountResult?.voting_count || 0,
  };
};

export const fetchSessions = (
  db: Database,
  params: { page: number; limit: number },
) => {
  const offset = (params.page - 1) * params.limit;

  const countStmt = db.prepare<{ count: number }, []>(queries.sessionCount);
  const countResult = countStmt.get();
  const totalCount = countResult?.count || 0;
  countStmt.finalize();

  const stmt = db.prepare<
    DatabaseTables.Session & { agenda_title?: string; agenda_state?: string },
    { $limit: number; $offset: number }
  >(queries.sessionsPaginated);
  const sessions = stmt.all({ $limit: params.limit, $offset: offset });
  stmt.finalize();

  const sectionsStmt = db.prepare<
    DatabaseTables.Section & {
      voting_count: number;
      speech_count: number;
      speaker_count: number;
      party_count: number;
      vaski_document_id?: number | null;
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
    },
    { $sessionKey: string }
  >(queries.sessionSections);

  const votingCountStmt = db.prepare<{ voting_count: number }, { $sessionKey: string }>(
    queries.sessionVotingCount,
  );

  const sessionsWithSections = sessions.map((session) => ({
    ...session,
    ...buildSectionRows(db, session.key, sectionsStmt, votingCountStmt),
  }));

  sectionsStmt.finalize();
  votingCountStmt.finalize();

  return {
    sessions: sessionsWithSections,
    totalCount,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(totalCount / params.limit),
  };
};

export const fetchSessionByDate = (
  db: Database,
  params: { date: string },
) => {
  const stmt = db.prepare<
    DatabaseTables.Session & { agenda_title?: string; agenda_state?: string },
    { $date: string }
  >(queries.sessionByDate);
  const data = stmt.all({ $date: params.date });
  stmt.finalize();
  return data;
};

export const fetchSessionWithSectionsByDate = (
  db: Database,
  params: { date: string },
) => {
  const sessions = fetchSessionByDate(db, params);

  const sectionsStmt = db.prepare<
    DatabaseTables.Section & {
      voting_count: number;
      speech_count: number;
      speaker_count: number;
      party_count: number;
      vaski_document_id?: number | null;
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
    },
    { $sessionKey: string }
  >(queries.sessionSections);

  const votingCountStmt = db.prepare<{ voting_count: number }, { $sessionKey: string }>(
    queries.sessionVotingCount,
  );

  const sessionsWithSections = sessions.map((session) => ({
    ...session,
    ...buildSectionRows(db, session.key, sectionsStmt, votingCountStmt),
  }));

  sectionsStmt.finalize();
  votingCountStmt.finalize();

  return sessionsWithSections;
};

export const fetchSessionDocuments = (db: Database, params: { sessionKey: string }) => {
  const stmt = db.prepare<
    {
      document_kind: "agenda" | "minutes" | "roll_call";
      id: number;
      type_slug: string;
      type_name_fi: string | null;
      root_family: string | null;
      eduskunta_tunnus: string | null;
      document_type_code: string | null;
      document_number_text: string | null;
      parliamentary_year_text: string | null;
      title: string | null;
      status_text: string | null;
      created_at: string | null;
    },
    { $sessionKey: string }
  >(queries.sessionDocuments);
  const data = stmt.all({ $sessionKey: params.sessionKey });
  stmt.finalize();
  return data;
};

export const fetchSessionNotices = (db: Database, params: { sessionKey: string }) => {
  const stmt = db.prepare<DatabaseTables.SessionNotice, { $sessionKey: string }>(
    queries.sessionNotices,
  );
  const data = stmt.all({ $sessionKey: params.sessionKey });
  stmt.finalize();
  return data;
};

export const fetchSectionDocumentLinks = (
  db: Database,
  params: { sectionKey: string },
) => {
  const stmt = db.prepare<
    {
      id: number;
      section_key: string;
      label: string | null;
      url: string | null;
      document_tunnus: string | null;
      document_id: number | null;
      document_type_name: string | null;
      document_type_code: string | null;
      document_title: string | null;
      document_created_at: string | null;
      source_type: string | null;
    },
    { $sectionKey: string }
  >(queries.sectionDocumentLinks);
  const data = stmt.all({ $sectionKey: params.sectionKey });
  stmt.finalize();
  return data;
};

export const fetchSpeechesByDate = (db: Database, params: { date: string }) => {
  const stmt = db.prepare<
    {
      id: number;
      excel_id?: string | null;
      processing_phase?: string | null;
      document?: string | null;
      ordinal?: number | null;
      position?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      party?: string | null;
      speech_type?: string | null;
      start_time?: string | null;
      end_time?: string | null;
      content?: string | null;
      minutes_url?: string | null;
      source_file?: string | null;
      section_title?: string;
      section_processing_title?: string;
      section_ordinal?: number;
    },
    { $date: string }
  >(queries.speechesByDate);
  const data = stmt.all({ $date: params.date });
  stmt.finalize();
  return data;
};

export const fetchSessionDates = (db: Database) => {
  const stmt = db.prepare<{ date: string }, []>(queries.sessionDates);
  const data = stmt.all();
  stmt.finalize();
  return data;
};

export const fetchCompletedSessionDates = (db: Database) => {
  const stmt = db.prepare<{ date: string }, []>(queries.sessionDatesCompleted);
  const data = stmt.all();
  stmt.finalize();
  return data;
};

export const fetchSectionSpeeches = (
  db: Database,
  params: { sectionKey: string; limit?: number; offset?: number },
) => {
  const limit = params.limit ?? 20;
  const offset = params.offset ?? 0;

  const countStmt = db.prepare<{ count: number }, { $sectionKey: string }>(
    queries.sectionSpeechCount,
  );
  const countResult = countStmt.get({ $sectionKey: params.sectionKey });
  const total = countResult?.count || 0;
  countStmt.finalize();

  const stmt = db.prepare<
    DatabaseTables.Speech,
    { $sectionKey: string; $limit: number; $offset: number }
  >(queries.sectionSpeeches);
  const speeches = stmt.all({
    $sectionKey: params.sectionKey,
    $limit: limit,
    $offset: offset,
  });
  stmt.finalize();

  return {
    speeches,
    total,
    page: Math.floor(offset / limit) + 1,
    totalPages: Math.ceil(total / limit),
  };
};

export const fetchSectionVotings = (db: Database, params: { sectionKey: string }) => {
  const stmt = db.prepare<DatabaseTables.Voting, { $sectionKey: string }>(
    queries.sectionVotings,
  );
  const votings = stmt.all({ $sectionKey: params.sectionKey });
  stmt.finalize();
  return votings;
};

export const fetchSectionSubSections = (db: Database, params: { sectionKey: string }) => {
  const stmt = db.prepare<DatabaseTables.SubSection, { $sectionKey: string }>(
    queries.sectionSubSections,
  );
  const rows = stmt.all({ $sectionKey: params.sectionKey });
  stmt.finalize();
  return rows;
};

export const fetchSectionRollCall = (db: Database, params: { sectionKey: string }) => {
  const infoStmt = db.prepare<
    {
      id: number;
      session_key: string;
      parliament_identifier: string;
      document_kind: string;
      document_title: string;
      start_time: string;
      end_time: string;
      status: string;
      created_at: string;
    },
    { $sectionKey: string }
  >(queries.sectionRollCallReport);
  const info = infoStmt.get({ $sectionKey: params.sectionKey });
  infoStmt.finalize();
  if (!info) return null;

  const entriesStmt = db.prepare<
    {
      roll_call_id: number;
      entry_order: number;
      person_id?: number | null;
      first_name: string;
      last_name: string;
      party?: string | null;
      entry_type: "absent" | "late";
      absence_reason?: string | null;
      arrival_time?: string | null;
    },
    { $rollCallId: number }
  >(queries.rollCallEntries);
  const entries = entriesStmt.all({ $rollCallId: info.id });
  entriesStmt.finalize();

  return {
    report: info,
    entries,
  };
};
