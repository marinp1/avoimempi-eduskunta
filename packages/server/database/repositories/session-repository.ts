import type { Database } from "bun:sqlite";
import partySeatCounts from "../queries/PARTY_SEAT_COUNTS.sql";
import latestSpeechDate from "../queries/LATEST_SPEECH_DATE.sql";
import rollCallEntries from "../queries/ROLL_CALL_ENTRIES.sql";
import sectionByKey from "../queries/SECTION_BY_KEY.sql";
import sectionDocumentLinks from "../queries/SECTION_DOCUMENT_LINKS.sql";
import sessionByKey from "../queries/SESSION_BY_KEY.sql";
import sectionRollCallReport from "../queries/SECTION_ROLL_CALL_REPORT.sql";
import sectionSpeechCount from "../queries/SECTION_SPEECH_COUNT.sql";
import sectionSpeeches from "../queries/SECTION_SPEECHES.sql";
import sectionVotings from "../queries/SECTION_VOTINGS.sql";
import sessionByDate from "../queries/SESSION_BY_DATE.sql";
import sessionDatesCompleted from "../queries/SESSION_DATES_COMPLETED.sql";
import sessionNotices from "../queries/SESSION_NOTICES.sql";
import sessionSectionsBySessionKeys from "../queries/SESSION_SECTIONS_BY_SESSION_KEYS.sql";
import sessionVotingCountsBySessionKeys from "../queries/SESSION_VOTING_COUNTS_BY_SESSION_KEYS.sql";
import sessionsIndex from "../queries/SESSIONS_INDEX.sql";
import sessionTicks from "../queries/SESSION_TICKS.sql";
import compositionChangeDates from "../queries/COMPOSITION_CHANGE_DATES.sql";
import compositionChangeDetail from "../queries/COMPOSITION_CHANGE_DETAIL.sql";

type SessionRow = DatabaseTables.Session & {
  agenda_title?: string;
  agenda_state?: string;
};

type SessionSectionRow = DatabaseTables.Section & {
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
};

type SessionWithSectionsRow = SessionRow & {
  sections: SessionSectionRow[];
  section_count: number;
  voting_count: number;
};

export type SessionsIndexRow = {
  id: number;
  key: string;
  date: string;
  number: number;
  type: string;
  state: string;
  state_text_fi: string;
  description: string;
  start_time_actual: string | null;
  minutes_start_time: string | null;
  minutes_end_time: string | null;
  minutes_title: string | null;
  minutes_status: string | null;
  agenda_key: string | null;
  agenda_title: string | null;
  voting_count: number;
  section_count: number;
  speech_count: number;
  section_titles: string;
  voting_titles: string;
};

export class SessionRepository {
  constructor(private readonly db: Database) {}

  private fetchSectionRowsBySessionKeys(
    sessionKeys: string[],
  ): Map<string, SessionSectionRow[]> {
    if (sessionKeys.length === 0) {
      return new Map<string, SessionSectionRow[]>();
    }

    const stmt = this.db.prepare<
      SessionSectionRow,
      { $sessionKeysJson: string }
    >(sessionSectionsBySessionKeys);
    const sections = stmt.all({
      $sessionKeysJson: JSON.stringify(sessionKeys),
    });
    stmt.finalize();

    const sectionsBySessionKey = new Map<string, SessionSectionRow[]>();
    for (const section of sections) {
      const rows = sectionsBySessionKey.get(section.session_key);
      if (rows) {
        rows.push(section);
      } else {
        sectionsBySessionKey.set(section.session_key, [section]);
      }
    }

    return sectionsBySessionKey;
  }

  private fetchVotingCountsBySessionKeys(
    sessionKeys: string[],
  ): Map<string, number> {
    if (sessionKeys.length === 0) {
      return new Map<string, number>();
    }

    const stmt = this.db.prepare<
      { session_key: string; voting_count: number },
      { $sessionKeysJson: string }
    >(sessionVotingCountsBySessionKeys);
    const rows = stmt.all({
      $sessionKeysJson: JSON.stringify(sessionKeys),
    });
    stmt.finalize();

    const votingCountBySessionKey = new Map<string, number>();
    for (const row of rows) {
      votingCountBySessionKey.set(row.session_key, row.voting_count);
    }

    return votingCountBySessionKey;
  }

  private attachSectionsAndVotingCounts(
    sessions: SessionRow[],
  ): SessionWithSectionsRow[] {
    const sessionKeys = sessions.map((session) => session.key);
    const sectionsBySessionKey =
      this.fetchSectionRowsBySessionKeys(sessionKeys);
    const votingCountBySessionKey =
      this.fetchVotingCountsBySessionKeys(sessionKeys);

    return sessions.map((session) => {
      const sections = sectionsBySessionKey.get(session.key) ?? [];
      return {
        ...session,
        sections,
        section_count: sections.length,
        voting_count: votingCountBySessionKey.get(session.key) ?? 0,
      };
    });
  }

  public fetchSessionByKey(params: { key: string }): {
    session:
      | (SessionRow & {
          voting_count: number;
          section_count: number;
          speech_count: number;
          speaker_count: number;
          minutes_title?: string | null;
          minutes_start_time?: string | null;
          minutes_end_time?: string | null;
        })
      | null;
    sections: SessionSectionRow[];
  } {
    const stmt = this.db.prepare<
      SessionRow & {
        agenda_title?: string;
        agenda_state?: string;
        minutes_title?: string | null;
        minutes_status?: string | null;
        minutes_start_time?: string | null;
        minutes_end_time?: string | null;
        minutes_agenda_item_count?: number | null;
        minutes_other_item_count?: number | null;
        roll_call_document_id?: number | null;
        agenda_document_id?: number | null;
        minutes_document_id?: number | null;
        voting_count: number;
        section_count: number;
        speech_count: number;
        speaker_count: number;
      },
      { $key: string }
    >(sessionByKey);
    const session = stmt.get({ $key: params.key });
    stmt.finalize();

    if (!session) return { session: null, sections: [] };

    const sections = this.fetchSectionRowsBySessionKeys([params.key]);
    const sectionsForSession = sections.get(params.key) ?? [];

    return { session, sections: sectionsForSession };
  }

  public fetchSessionsIndex(limit: number = 50): SessionsIndexRow[] {
    const stmt = this.db.prepare<SessionsIndexRow, { $limit: number }>(
      sessionsIndex,
    );
    const rows = stmt.all({ $limit: limit });
    stmt.finalize();
    return rows;
  }

  public fetchSittingTicks(): {
    date: string;
    key: string;
    voting_count: number;
    speech_count: number;
  }[] {
    const stmt = this.db.prepare<
      { date: string; key: string; voting_count: number; speech_count: number },
      []
    >(sessionTicks);
    const rows = stmt.all();
    stmt.finalize();
    return rows;
  }

  public fetchCompositionChangeDates(): {
    date: string;
    joined: number;
    left_count: number;
  }[] {
    const stmt = this.db.prepare<
      { date: string; joined: number; left_count: number },
      []
    >(compositionChangeDates);
    const rows = stmt.all();
    stmt.finalize();
    return rows;
  }

  public fetchCompositionChangeDetail(params: { date: string }): {
    person_id: number;
    first_name: string;
    last_name: string;
    party: string | null;
    change_type: string;
    description: string | null;
    replacement_person: string | null;
  }[] {
    const stmt = this.db.prepare<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        party: string | null;
        change_type: string;
        description: string | null;
        replacement_person: string | null;
      },
      { $date: string }
    >(compositionChangeDetail);
    const rows = stmt.all({ $date: params.date });
    stmt.finalize();
    return rows;
  }

  public fetchSectionSpeeches(params: {
    sectionKey: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const countStmt = this.db.prepare<
      { count: number },
      { $sectionKey: string }
    >(sectionSpeechCount);
    const countResult = countStmt.get({ $sectionKey: params.sectionKey });
    const total = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      DatabaseTables.Speech & {
        content: string | null;
        start_time: string | null;
        end_time: string | null;
        minutes_url: string | null;
      },
      { $sectionKey: string; $limit: number; $offset: number }
    >(sectionSpeeches);
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
  }

  public fetchSectionByKey(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
      {
        key: string;
        identifier: string | null;
        title: string | null;
        processing_title: string | null;
        note: string | null;
        resolution: string | null;
        session_key: string;
        minutes_item_title: string | null;
        minutes_item_number: string | null;
        minutes_processing_phase_code: string | null;
        minutes_related_document_identifier: string | null;
        minutes_content_text: string | null;
      },
      { $sectionKey: string }
    >(sectionByKey);
    const data = stmt.get({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return data || null;
  }

  public fetchSectionVotings(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Voting,
      { $sectionKey: string }
    >(sectionVotings);
    const votings = stmt.all({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return votings;
  }

  public fetchSectionRollCall(params: { sectionKey: string }) {
    const infoStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        session_date: string;
        roll_call_start_time: string | null;
        roll_call_end_time: string | null;
        title: string | null;
        status: string | null;
        created_at: string | null;
        edk_identifier: string;
        source_path: string;
        attachment_group_id: number | null;
        entry_count: number;
        absent_count: number;
        late_count: number;
      },
      { $sectionKey: string }
    >(sectionRollCallReport);
    const info = infoStmt.get({ $sectionKey: params.sectionKey });
    infoStmt.finalize();
    if (!info) return null;

    const entriesStmt = this.db.prepare<
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
    >(rollCallEntries);
    const entries = entriesStmt.all({ $rollCallId: info.id });
    entriesStmt.finalize();

    return {
      report: info,
      entries,
    };
  }

  public fetchPartySeatCounts(date: string): Array<{
    party_code: string;
    seat_count: number;
    is_in_government: number;
  }> {
    const stmt = this.db.prepare<
      { party_code: string; seat_count: number; is_in_government: number },
      { $date: string }
    >(partySeatCounts);
    const rows = stmt.all({ $date: date });
    stmt.finalize();
    return rows;
  }

  public fetchSessionByDate(params: { date: string }) {
    const stmt = this.db.prepare<SessionRow, { $date: string }>(sessionByDate);
    const data = stmt.all({ $date: params.date });
    stmt.finalize();
    return data;
  }

  public fetchSessionWithSectionsByDate(params: { date: string }) {
    const sessions = this.fetchSessionByDate(params);
    return this.attachSectionsAndVotingCounts(sessions);
  }

  public fetchSessionNotices(params: { sessionKey: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.SessionNotice,
      { $sessionKey: string }
    >(sessionNotices);
    const data = stmt.all({ $sessionKey: params.sessionKey });
    stmt.finalize();
    return data;
  }

  public fetchSectionDocumentLinks(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
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
    >(sectionDocumentLinks);
    const data = stmt.all({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return data;
  }

  public fetchCompletedSessionDates() {
    const stmt = this.db.prepare<{ date: string }, []>(sessionDatesCompleted);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchLatestSpeechDate(): string | null {
    const stmt = this.db.prepare<{ date: string | null }, []>(latestSpeechDate);
    const row = stmt.get();
    stmt.finalize();
    return row?.date ?? null;
  }
}
