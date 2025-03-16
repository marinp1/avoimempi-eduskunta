type SessionState = "LOPETETTU";
type SessionType = "TAYSINT";

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
      year: number;
      type: SessionType;
      state: SessionState;
      description: string;
      start_time_actual: Modules.Common.DateString;
      start_time_reported: Modules.Common.DateString;
      article_key: string;
      speaker_id: number; // Representative.person_id (optional)
      modified_datetime: Modules.Common.DateString;
    }
  }
}

export {};
