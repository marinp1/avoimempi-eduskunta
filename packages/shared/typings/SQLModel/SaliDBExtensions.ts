declare global {
  export namespace DatabaseTables {
    export type VotingDocumentLink = {
      id: number;
      voting_id: number;
      document_label: string | null;
      document_url: string | null;
      imported_datetime: Modules.Common.DateString | null;
    };

    export type SectionDocumentLink = {
      id: number;
      section_key: string;
      key: string | null;
      name_fi: string | null;
      link_text_fi: string | null;
      link_url_fi: string | null;
      created_datetime: Modules.Common.DateString | null;
      modified_datetime: Modules.Common.DateString | null;
      imported_datetime: Modules.Common.DateString | null;
    };

    export type SessionNotice = {
      id: number;
      key: string | null;
      session_key: string;
      section_key: string | null;
      notice_type: string | null;
      text_fi: string | null;
      valid_until: Modules.Common.DateString | null;
      sent_at: Modules.Common.DateString | null;
      created_datetime: Modules.Common.DateString | null;
      modified_datetime: Modules.Common.DateString | null;
      imported_datetime: Modules.Common.DateString | null;
    };

    export type VotingDistribution = {
      id: number;
      voting_id: number;
      group_name: string | null;
      yes: number | null;
      no: number | null;
      abstain: number | null;
      absent: number | null;
      total: number | null;
      distribution_type: string | null;
      imported_datetime: Modules.Common.DateString | null;
    };

    export type SaliDBDocumentReference = {
      id?: number;
      source_type: string;
      voting_id: number | null;
      section_key: string | null;
      document_tunnus: string;
      source_text: string | null;
      source_url: string | null;
      created_datetime: Modules.Common.DateString | null;
      imported_datetime: Modules.Common.DateString | null;
    };
  }
}

export {};
