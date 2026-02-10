type SessionState = string | "LOPETETTU";
type SessionType = string | "TAYSINT";

declare global {
  export namespace DatabaseTables {
    export interface Agenda {
      key: string; // unique
      title: string;
      state: string;
    }

    export interface Session {
      id: number; // unique
      number: number; // unique
      key: string; // unique
      date: Modules.Common.DateString;
      year: number | null;
      type: SessionType;
      state: SessionState;
      description: string;
      start_time_actual: Modules.Common.DateString;
      start_time_reported: Modules.Common.DateString;
      end_time: Modules.Common.DateString | null;
      roll_call_time: Modules.Common.DateString | null;
      article_key: string;
      agenda_key: string; // Agenda.key
      speaker_id: number; // Representative.person_id (optional)
      modified_datetime: Modules.Common.DateString;
      created_datetime: Modules.Common.DateString | null;
      imported_datetime: Modules.Common.DateString | null;
      state_text_fi: string | null;
      manual_blocked: number;
      attachment_group_id: number | null;
    }
  }
}

export {};
