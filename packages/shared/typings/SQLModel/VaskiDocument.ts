declare global {
  export namespace DatabaseTables {
    export type VaskiDocument = {
      id: number;
      eduskunta_tunnus: string;
      document_type_name: string | null;
      document_type_code: string | null;
      language_code: string | null;
      publicity_code: string | null;
      status: string | null;
      created: string | null;
      attachment_group_id: number | null;
      version_text: string | null;
      laadinta_pvm: string | null;
      muu_tunnus: string | null;
      paatehtava_koodi: string | null;
      rakennemaarittely_nimi: string | null;
      message_type: string | null;
      message_id: string | null;
      message_created: string | null;
      transfer_code: string | null;
      meeting_id: string | null;
      meeting_org: string | null;
      title: string | null;
      alternative_title: string | null;
      document_number: string | null;
      parliamentary_year: string | null;
      summary_text: string | null;
      content_root_type: string | null;
    };

    export type VaskiIdentifier = {
      id?: number;
      document_id: number;
      identifier_type: string;
      identifier_value: string;
    };

    export type VaskiSubject = {
      id?: number;
      document_id: number;
      subject_text: string;
      yso_url: string | null;
    };

    export type VaskiRelationship = {
      id?: number;
      document_id: number;
      relationship_type: string;
      target_eduskunta_tunnus: string;
    };

    export type VaskiAttachment = {
      id?: number;
      document_id: number;
      native_id: string | null;
      use_type: string | null;
      file_name: string | null;
      file_path: string | null;
      format_name: string | null;
      format_version: string | null;
      hash_algorithm: string | null;
      hash_value: string | null;
    };

    export type VaskiDocumentActor = {
      id?: number;
      document_id: number;
      role_code: string | null;
      person_id: number | null;
      first_name: string | null;
      last_name: string | null;
      position_text: string | null;
      organization_text: string | null;
      extra_text: string | null;
    };

    export type VaskiMinutesSpeech = {
      id?: number;
      document_id: number;
      section_ordinal: number | null;
      ordinal: number | null;
      person_id: number | null;
      first_name: string | null;
      last_name: string | null;
      party: string | null;
      position: string | null;
      speech_type: string | null;
      start_time: string | null;
      end_time: string | null;
      content: string | null;
      link_key?: string | null;
    };

    export type VaskiSectionLink = {
      id?: number;
      section_key: string;
      document_id: number;
      link_type: string;
      source_section_id: number | null;
    };

    export type VaskiSessionLink = {
      id?: number;
      session_key: string;
      document_id: number;
      link_type: string;
    };
  }
}

export {};
