declare global {
  export namespace DatabaseTables {
    export type Section = {
      id: number; // unique
      key: string; // uniuque
      identifier: string;
      title: string | null;
      ordinal: number;
      note: string | null;
      processing_title: string | null;
      resolution: string | null;
      session_key: string; // Session.key
      agenda_key: string; // Agenga.key
      modified_datetime: Modules.Common.DateString | null;
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

    export type SubSection = {
      id: number;
      session_key: string;
      section_key: string;
      entry_order: number;
      entry_kind: "asiakohta" | "muu_asiakohta";
      item_identifier: number;
      parent_item_identifier: string | null;
      item_number: string | null;
      item_order: number | null;
      item_title: string | null;
      related_document_identifier: string | null;
      related_document_type: string | null;
      processing_phase_code: string | null;
      general_processing_phase_code: string | null;
      content_text: string | null;
      match_mode: "direct" | "parent_fallback";
      minutes_document_id: number;
    };
  }
}

export {};
