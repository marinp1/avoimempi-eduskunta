type DateString = string;

declare global {
  export namespace DatabaseTables {
    export type Representative = {
      person_id: number;
      last_name: string;
      first_name: string;
      sort_name: string;
      marticle_name: string;
      /** @deprecated */
      party: string;
      /** @deprecated */
      minister: boolean;
      phone: string | null;
      email: string | null;
      current_municipality: string | null;
      profession: string;
      website: string | null;
      additional_info: string;
      birth_date: DateString;
      birth_year: number | null;
      birth_place: string;
      death_date: DateString | null;
      death_place: string | null;
      gender: string;
      term_end_date: DateString | null;
    };

    export type TemporaryAbsence = {
      person_id: number;
      description: string;
      start_date: DateString;
      end_date: DateString | null;
      replacement_person: string | null;
    };

    export type PeopleJoiningParliament = {
      person_id: number;
      description: string;
      start_date: DateString | null;
      replacement_person: string | null;
    };

    export type PeopleLeavingParliament = {
      person_id: number;
      description: string;
      end_date: DateString | null;
      replacement_person: string | null;
    };

    export type Committee = {
      code: string;
      name: string;
    };

    export type CommitteeMembership = {
      person_id: number;
      committee_code: string;
      role: string;
      start_date: DateString;
      end_date: DateString | null;
    };

    export type GovernmentMembership = {
      person_id: number;
      ministry: string | null;
      name: string | null;
      government: string | null;
      government_id: number;
      start_date: DateString | null;
      end_date: DateString | null;
    };

    export type Government = {
      id: number;
      name: string;
      start_date: DateString;
      end_date: DateString | null;
    };

    export type TrustPosition = {
      person_id: number;
      position_type: "national" | "international" | "municapility" | "other";
      name: string;
      period: string;
    };

    export type Education = {
      person_id: number;
      name: string;
      institution: string;
      year: number | null;
    };

    export type WorkExperience = {
      person_id: number;
      position: string;
      period: string;
    };

    export type Title = {
      person_id: number;
      institution: string;
      name: string;
      year: number;
    };

    export type District = {
      name: string;
      code: string;
    };

    export type RepresentativeDistrict = {
      person_id: number;
      district_code: string;
      start_date: DateString;
      end_date: DateString | null;
    };

    export type Term = {
      person_id: number;
      start_date: DateString;
      end_date: DateString | null;
      start_year: number | null;
      end_year: number | null;
    };

    export type ParliamentGroup = {
      code: string;
    };

    export type ParliamentGroupMembership = {
      person_id: number;
      group_code: string;
      group_abbreviation: string | null;
      group_name: string | null;
      start_date: DateString;
      end_date: DateString | null;
    };

    export type ParliamentGroupAssignment = {
      person_id: number;
      group_code: string;
      group_name: string | null;
      role: string;
      time_period: string | null;
      start_date: DateString;
      end_date: DateString | null;
    };
  }

  export namespace DatabaseQueries {
    export type GetParliamentComposition = {
      person_id: number;
      last_name: string;
      first_name: string;
      sort_name: string;
      gender: string;
      birth_date: DateString;
      death_date: DateString | null;
      birth_place: string;
      death_place: string;
      profession: string;
      start_date: string;
      end_date: string;
      party_name: string;
      is_in_government: 1 | 0;
    };

    export type VotesByPerson = DatabaseTables.Voting &
      Pick<DatabaseTables.Vote, "vote" | "group_abbreviation"> & {
        government_name: string | null;
        government_start_date: string | null;
        government_end_date: string | null;
        is_coalition: 0 | 1;
      };

    export type PersonSearchResult = {
      person_id: number;
      first_name: string;
      last_name: string;
      sort_name: string;
      birth_date: DateString | null;
      death_date: DateString | null;
      profession: string | null;
      latest_party_name: string | null;
      first_term_start: DateString | null;
      last_term_end: DateString | null;
      latest_active_date: DateString | null;
      is_current_mp: 0 | 1;
      is_active_on_selected_date: 0 | 1;
    };
  }
}

export {};
