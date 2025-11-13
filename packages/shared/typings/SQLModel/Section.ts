declare global {
  export namespace DatabaseTables {
    export type Section = {
      id: number; // unique
      key: string; // uniuque
      identifier: string;
      title: string;
      ordinal: number;
      note: string | null;
      processing_title: string;
      resolution: string;
      session_key: string; // Session.key
      agenda_key: string; // Agenga.key
      modified_datetime: Modules.Common.DateString;
      vaski_id: number;
    };
  }
}

export {};
