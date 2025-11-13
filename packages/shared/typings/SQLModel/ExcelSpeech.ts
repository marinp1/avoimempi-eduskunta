declare global {
  export namespace DatabaseTables {
    export type ExcelSpeech = {
      excel_id: string; // Format: YYYYMMDDHHmmss_<document>_<processing_phase>_<order>_<person_id>
      processing_phase: string | null;
      document: string | null;
      ordinal: number;
      position: string | null;
      first_name: string | null;
      last_name: string | null;
      party: string | null;
      speech_type: string | null;
      start_time: string | null;
      end_time: string | null;
      content: string | null;
      minutes_url: string | null;
      source_file: string | null;
    };
  }
}

export {};
