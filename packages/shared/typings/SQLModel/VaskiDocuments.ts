declare global {
  export namespace DatabaseTables {
    export type RollCallReport = {
      id: number;
      parliament_identifier: string;
      session_date: Modules.Common.DateString;
      roll_call_start_time: Modules.Common.DateString | null;
      roll_call_end_time: Modules.Common.DateString | null;
      title: string | null;
      status: string | null;
      created_at: Modules.Common.DateString | null;
      edk_identifier: string;
      source_path: string;
      attachment_group_id: number | null;
    };

    export type RollCallEntry = {
      roll_call_id: number;
      entry_order: number;
      person_id: number | null;
      first_name: string;
      last_name: string;
      party: string | null;
      entry_type: "absent" | "late";
      absence_reason: string | null;
      arrival_time: string | null;
    };

    export type SpeechContent = {
      speech_id: number;
      session_key: string;
      section_key: string;
      source_document_id: number;
      source_item_identifier: number;
      source_entry_order: number;
      source_speech_order: number;
      source_speech_identifier: number | null;
      speech_type_code: string | null;
      language_code: string | null;
      start_time: Modules.Common.DateString | null;
      end_time: Modules.Common.DateString | null;
      content: string;
      source_path: string;
      source_first_name: string | null;
      source_last_name: string | null;
    };
  }
}

export {};
