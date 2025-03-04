export namespace SQLModel {
  export type DateString = string;

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
    birth_place: string;
    death_date: DateString | null;
    death_place: string | null;
    gender: string;
    term_end_date: DateString | null;
  };

  export type Interruption = {
    person_id: number;
    description: string;
    start_date: DateString;
    end_date: DateString | null;
    replacement_person: string | null;
  };

  export type Publication = {
    person_id: number;
    name: string;
    year: number;
    authors: string;
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
    ministry: string;
    name: string;
    government: string;
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
    year: number;
  };

  export type WorkExperience = {
    person_id: number;
    name: string;
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
  };

  export type ParliamentGroup = {
    code: string;
    name: string;
  };

  export type ParliamentGroupMembership = {
    person_id: number;
    group_code: string;
    start_date: DateString;
    end_date: DateString | null;
  };

  export type ParliamentGroupAssignment = {
    person_id: number;
    group_code: string;
    role: string;
    time_period: string | null;
    start_date: DateString;
    end_date: DateString | null;
  };
}
