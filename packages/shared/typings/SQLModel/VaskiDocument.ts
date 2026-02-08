declare global {
  export namespace DatabaseTables {
    export type VaskiDocument = {
      id: number;
      eduskunta_tunnus: string;
      document_type_code: string;
      document_type_name: string;
      document_number: number | null;
      parliamentary_year: string | null;
      title: string | null;
      author_first_name: string | null;
      author_last_name: string | null;
      author_role: string | null;
      author_organization: string | null;
      creation_date: string | null;
      status: string | null;
      language_code: string;
      publicity_code: string | null;
      source_reference: string | null;
      summary: string | null;
      attachment_group_id: number | null;
      created: string | null;
    };

    export type DocumentSubject = {
      id?: number;
      document_id: number;
      subject_text: string;
      yso_url: string | null;
    };

    export type DocumentRelationship = {
      id?: number;
      source_document_id: number;
      target_eduskunta_tunnus: string;
      relationship_type: string;
    };
  }
}

export {};
