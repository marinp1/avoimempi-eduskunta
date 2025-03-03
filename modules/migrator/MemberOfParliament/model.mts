export type Representative = {
  person_id: number;
  firstname: string;
  lastname: string;
  email?: string;
  birth_year?: number;
  birth_place?: string;
  gender?: string;
  home_municipality?: string;
  profession?: string;
  party?: string;
  minister: boolean;
};

export type ElectoralDistrict = {
  // id: number;
  person_id: number;
  name: string;
  start_date: string; // Date string (ISO format)
  end_date: string | null; // Date string (ISO format) or null
};

export type RepresentativeTerm = {
  // id: number;
  person_id: number;
  start_date: string; // Date string (ISO format)
  end_date: string | null; // Date string (ISO format) or null
};

export type ParliamentGroup = {
  identifier: string | null;
  group_name: string | null;
};

export type ParliamentaryGroupMembership = {
  // id: number;
  person_id: number;
  group_identifier: string | null;
  start_date: string; // Date string (ISO format)
  end_date: string | null; // Date string (ISO format) or null
};

export type Committee = {
  identifier: string;
  committee_name: string;
};

export type CommitteeMembership = {
  // id: number;
  person_id: number;
  committee_identifier: string;
  role: string | null;
  start_date: string | null; // Date string (ISO format)
  end_date: string | null; // Date string (ISO format) or null
};

export type Declaration = {
  // id: number;
  person_id: number;
  declaration_type: string | null;
  description: string | null;
};

export type Education = {
  // id: number;
  person_id: number;
  name: string | null;
  establishement: string | null; // Decimal (nullable)
  year: number | null; // Integer (nullable)
};

export type Gift = {
  // id: number;
  person_id: number;
  giver: string | null;
  description: string | null;
  value: number | null; // Decimal (nullable)
  received_date: string | null; // Date string (ISO format)
};
