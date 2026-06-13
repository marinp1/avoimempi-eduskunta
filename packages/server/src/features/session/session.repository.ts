import type { Database } from "bun:sqlite";
import partySeatCounts from "./sql/session-party-seats.sql";
import latestSpeechDate from "./sql/session-latest-speech-date.sql";
import rollCallEntries from "./sql/session-roll-call-entries.sql";
import sectionByKey from "./sql/session-section-detail.sql";
import sectionDocumentLinks from "./sql/session-section-documents.sql";
import sessionByKey from "./sql/session-detail.sql";
import sectionRollCallReport from "./sql/session-section-roll-call.sql";
import sectionSpeechCount from "./sql/session-section-speech-count.sql";
import sectionSpeeches from "./sql/session-section-speeches.sql";
import sectionVotings from "./sql/session-section-votings.sql";
import sessionByDate from "./sql/session-by-date.sql";
import sessionDatesCompleted from "./sql/session-dates-completed.sql";
import sessionNotices from "./sql/session-notices.sql";
import sessionNoticesBySessionKeys from "./sql/session-notices-batch.sql";
import sessionSectionsBySessionKeys from "./sql/session-sections.sql";
import sessionVotingCountsBySessionKeys from "./sql/session-voting-counts.sql";
import sectionVotingsBatch from "./sql/session-section-votings-batch.sql";
import sectionRollCallBatch from "./sql/session-roll-call-batch.sql";
import writtenQuestionsByIdentifiers from "./sql/written-questions-by-identifiers.sql";
import sessionsIndex from "./sql/session-list.sql";
import sessionTicks from "./sql/session-ticks.sql";
import compositionChangeDates from "./sql/session-composition-changes.sql";
import compositionChangeDetail from "./sql/session-composition-detail.sql";

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

    const sections = this.db
      .query<SessionSectionRow, { $sessionKeysJson: string }>(
        sessionSectionsBySessionKeys,
      )
      .all({
        $sessionKeysJson: JSON.stringify(sessionKeys),
      });

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

    const rows = this.db
      .query<
        { session_key: string; voting_count: number },
        { $sessionKeysJson: string }
      >(sessionVotingCountsBySessionKeys)
      .all({
        $sessionKeysJson: JSON.stringify(sessionKeys),
      });

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
    const session = this.db
      .query<
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
      >(sessionByKey)
      .get({ $key: params.key });

    if (!session) return { session: null, sections: [] };

    const sections = this.fetchSectionRowsBySessionKeys([params.key]);
    const sectionsForSession = sections.get(params.key) ?? [];

    return { session, sections: sectionsForSession };
  }

  public fetchSessionsIndex(params: {
    limit?: number;
    startDate?: string | null;
    endDateExclusive?: string | null;
  }): SessionsIndexRow[] {
    return this.db
      .query<
        SessionsIndexRow,
        {
          $limit: number;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(sessionsIndex)
      .all({
        $limit: params.limit ?? 50,
        $startDate: params.startDate ?? null,
        $endDateExclusive: params.endDateExclusive ?? null,
      });
  }

  public fetchSittingTicks(): {
    date: string;
    key: string;
    voting_count: number;
    speech_count: number;
  }[] {
    return this.db
      .query<
        {
          date: string;
          key: string;
          voting_count: number;
          speech_count: number;
        },
        []
      >(sessionTicks)
      .all();
  }

  public fetchCompositionChangeDates(): {
    date: string;
    joined: number;
    left_count: number;
  }[] {
    return this.db
      .query<{ date: string; joined: number; left_count: number }, []>(
        compositionChangeDates,
      )
      .all();
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
    return this.db
      .query<
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
      >(compositionChangeDetail)
      .all({ $date: params.date });
  }

  public fetchSectionSpeeches(params: {
    sectionKey: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const total =
      this.db
        .query<{ count: number }, { $sectionKey: string }>(sectionSpeechCount)
        .get({ $sectionKey: params.sectionKey })?.count || 0;

    const speeches = this.db
      .query<
        DatabaseTables.Speech & {
          content: string | null;
          start_time: string | null;
          end_time: string | null;
          minutes_url: string | null;
        },
        { $sectionKey: string; $limit: number; $offset: number }
      >(sectionSpeeches)
      .all({
        $sectionKey: params.sectionKey,
        $limit: limit,
        $offset: offset,
      });

    return {
      speeches,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  public fetchSectionByKey(params: { sectionKey: string }) {
    const data = this.db
      .query<
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
      >(sectionByKey)
      .get({ $sectionKey: params.sectionKey });
    return data || null;
  }

  public fetchSectionVotings(params: { sectionKey: string }) {
    return this.db
      .query<DatabaseTables.Voting, { $sectionKey: string }>(sectionVotings)
      .all({ $sectionKey: params.sectionKey });
  }

  public fetchSectionRollCall(params: { sectionKey: string }) {
    const info = this.db
      .query<
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
      >(sectionRollCallReport)
      .get({ $sectionKey: params.sectionKey });
    if (!info) return null;

    const entries = this.db
      .query<
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
      >(rollCallEntries)
      .all({ $rollCallId: info.id });

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
    return this.db
      .query<
        { party_code: string; seat_count: number; is_in_government: number },
        { $date: string }
      >(partySeatCounts)
      .all({ $date: date });
  }

  public fetchSessionByDate(params: { date: string }) {
    return this.db.query<SessionRow, { $date: string }>(sessionByDate).all({
      $date: params.date,
    });
  }

  public fetchSessionWithSectionsByDate(params: { date: string }) {
    const sessions = this.fetchSessionByDate(params);
    return this.attachSectionsAndVotingCounts(sessions);
  }

  public fetchSessionNotices(params: { sessionKey: string }) {
    return this.db
      .query<DatabaseTables.SessionNotice, { $sessionKey: string }>(
        sessionNotices,
      )
      .all({ $sessionKey: params.sessionKey });
  }

  public fetchSessionNoticesBySessionKeys(
    sessionKeys: string[],
  ): Map<string, DatabaseTables.SessionNotice[]> {
    if (sessionKeys.length === 0) return new Map();
    const rows = this.db
      .query<DatabaseTables.SessionNotice, { $sessionKeysJson: string }>(
        sessionNoticesBySessionKeys,
      )
      .all({
        $sessionKeysJson: JSON.stringify(sessionKeys),
      });
    const map = new Map<string, DatabaseTables.SessionNotice[]>();
    for (const row of rows) {
      const list = map.get(row.session_key);
      if (list) list.push(row);
      else map.set(row.session_key, [row]);
    }
    return map;
  }

  public fetchSectionDocumentLinks(params: { sectionKey: string }) {
    return this.db
      .query<
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
      >(sectionDocumentLinks)
      .all({ $sectionKey: params.sectionKey });
  }

  public fetchCompletedSessionDates() {
    return this.db.query<{ date: string }, []>(sessionDatesCompleted).all();
  }

  public fetchLatestSpeechDate(): string | null {
    return (
      this.db.query<{ date: string | null }, []>(latestSpeechDate).get()
        ?.date ?? null
    );
  }

  public fetchSectionVotingsByKeys(
    sectionKeys: string[],
  ): Map<string, DatabaseTables.Voting[]> {
    if (sectionKeys.length === 0) return new Map();
    const rows = this.db
      .query<DatabaseTables.Voting, { $sectionKeysJson: string }>(
        sectionVotingsBatch,
      )
      .all({
        $sectionKeysJson: JSON.stringify(sectionKeys),
      });
    const map = new Map<string, DatabaseTables.Voting[]>();
    for (const row of rows) {
      const list = map.get(row.section_key);
      if (list) list.push(row);
      else map.set(row.section_key, [row]);
    }
    return map;
  }

  public fetchSectionRollCallByKeys(sectionKeys: string[]): {
    report: {
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
    };
    entries: Array<{
      roll_call_id: number;
      entry_order: number;
      person_id?: number | null;
      first_name: string;
      last_name: string;
      party?: string | null;
      entry_type: "absent" | "late";
      absence_reason?: string | null;
      arrival_time?: string | null;
    }>;
  } | null {
    if (sectionKeys.length === 0) return null;

    const results = this.db
      .query<
        {
          section_key: string;
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
        { $sectionKeysJson: string }
      >(sectionRollCallBatch)
      .all({
        $sectionKeysJson: JSON.stringify(sectionKeys),
      });

    for (const row of results) {
      const entries = this.fetchSingleRollCallEntries(row.id);
      return {
        report: {
          id: row.id,
          parliament_identifier: row.parliament_identifier,
          session_date: row.session_date,
          roll_call_start_time: row.roll_call_start_time,
          roll_call_end_time: row.roll_call_end_time,
          title: row.title,
          status: row.status,
          created_at: row.created_at,
          edk_identifier: row.edk_identifier,
          source_path: row.source_path,
          attachment_group_id: row.attachment_group_id,
          entry_count: row.entry_count,
          absent_count: row.absent_count,
          late_count: row.late_count,
        },
        entries,
      };
    }

    return null;
  }

  private fetchSingleRollCallEntries(rollCallId: number): Array<{
    roll_call_id: number;
    entry_order: number;
    person_id?: number | null;
    first_name: string;
    last_name: string;
    party?: string | null;
    entry_type: "absent" | "late";
    absence_reason?: string | null;
    arrival_time?: string | null;
  }> {
    return this.db
      .query<
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
      >(rollCallEntries)
      .all({ $rollCallId: rollCallId });
  }

  public fetchWrittenQuestionsByIdentifiers(
    identifiers: string[],
  ): Map<string, number> {
    if (identifiers.length === 0) return new Map();
    const rows = this.db
      .query<
        { id: number; parliament_identifier: string },
        { $identifiersJson: string }
      >(writtenQuestionsByIdentifiers)
      .all({
        $identifiersJson: JSON.stringify(identifiers),
      });
    const map = new Map<string, number>();
    for (const row of rows) {
      if (!map.has(row.parliament_identifier)) {
        map.set(row.parliament_identifier, row.id);
      }
    }
    return map;
  }
}
