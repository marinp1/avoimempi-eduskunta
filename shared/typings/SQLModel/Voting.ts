declare global {
  export namespace DatabaseTables {
    export type Voting = {
      id: number; // unique
      number: number; // unique
      start_time: Modules.Common.DateString;
      annulled: boolean;
      title: string;
      proceedings_name: string;
      proceedings_url: string;
      result_url: string;
      n_yes: number;
      n_no: number;
      n_abstain: number;
      n_absent: number;
      n_total: number;
      session_number: number; // Session.number
      session_key: string; // Session.key
      modified_datetime: Modules.Common.DateString;
      section_id: number | null; // Section.id
      section_key: string; // Section.key
      main_section_id: string; // Section.id
    };
  }
}

export {};
