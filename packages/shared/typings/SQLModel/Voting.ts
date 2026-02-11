declare global {
  export namespace DatabaseTables {
    export type Voting = {
      id: number; // unique
      number: number; // unique
      start_time: Modules.Common.DateString;
      start_date: Modules.Common.DateString | null;
      end_time: Modules.Common.DateString | null;
      annulled: boolean;
      title: string;
      title_extra: string | null;
      proceedings_name: string;
      proceedings_url: string;
      result_url: string;
      parliamentary_item: string | null;
      parliamentary_item_url: string | null;
      n_yes: number;
      n_no: number;
      n_abstain: number;
      n_absent: number;
      n_total: number;
      language_id: string | null;
      section_note: string | null;
      section_order: number | null;
      section_processing_title: string | null;
      section_processing_phase: string;
      modified_datetime: Modules.Common.DateString;
      imported_datetime: Modules.Common.DateString | null;
      section_title: string;
      main_section_note: string | null;
      main_section_title: string | null;
      sub_section_identifier: string | null;
      agenda_title: string | null;
      section_id: number | null; // Section.id
      section_key: string; // Section.key
      main_section_id: number; // Section.id
      session_key: string; // Session.key
    };
  }

  export namespace DatabaseQueries {
    export type VotingSearchResult = DatabaseTables.Voting & {
      context_title: string;
    };
  }
}

export {};
