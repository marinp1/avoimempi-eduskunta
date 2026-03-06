declare global {
  export namespace DatabaseTables {
    export type Speech = {
      id: number;
      key: string; // unique
      session_key: string; // Session.key
      section_key: string; // Section.key
      ordinal: number;
      ordinal_number: number;
      speech_type: string; // PVTyyppi (T = normal speech)
      request_method: string; // PyyntoTapa (I = interrupt, etc)
      request_time: Modules.Common.DateString | null;
      person_id: number; // Representative.person_id
      first_name: string;
      last_name: string;
      gender: string;
      party_abbreviation: string | null;
      has_spoken: boolean; // Puhunut (0 = hasn't spoken yet, 1 = has spoken, 2 = speaking)
      ministry: string | null;
      modified_datetime: Modules.Common.DateString | null;
      created_datetime: Modules.Common.DateString | null;
      imported_datetime: Modules.Common.DateString | null;
      ad_tunnus: string | null;
      order_raw: string | null;
    };
  }
}

export {};
