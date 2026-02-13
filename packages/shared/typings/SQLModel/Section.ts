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
      default_speech_type: string | null;
      can_request_speech: boolean;
      created_datetime: Modules.Common.DateString | null;
      imported_datetime: Modules.Common.DateString | null;
      minutes_entry_kind?: "asiakohta" | "muu_asiakohta" | null;
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
      minutes_match_mode?: "direct" | "parent_fallback" | null;
    };
  }
}

export {};
