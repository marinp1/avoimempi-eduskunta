/**
 * Person API DTOs — stable external contracts for person/MP data.
 * These replace raw SQL row shapes returned by the API.
 */

export interface PersonDetailDto {
  personId: number;
  firstName: string;
  lastName: string;
  sortName: string;
  fullName: string;
  party: string;
  isMinister: boolean;
  phone: string | null;
  email: string | null;
  municipality: string | null;
  profession: string;
  website: string | null;
  additionalInfo: string;
  birthDate: string;
  birthYear: number | null;
  birthPlace: string;
  deathDate: string | null;
  deathPlace: string | null;
  gender: string;
  termEndDate: string | null;
}

export interface PersonSearchResultDto {
  personId: number;
  firstName: string;
  lastName: string;
  sortName: string;
  fullName: string;
  birthDate: string | null;
  deathDate: string | null;
  profession: string | null;
  latestParty: string | null;
  firstTermStart: string | null;
  lastTermEnd: string | null;
  latestActiveDate: string | null;
  isCurrentMp: boolean;
  isActiveOnSelectedDate: boolean;
}

interface RepresentativeInput {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  party: string;
  minister: boolean | number;
  phone: string | null;
  email: string | null;
  current_municipality: string | null;
  profession: string;
  website: string | null;
  additional_info: string;
  birth_date: string;
  birth_year: number | null;
  birth_place: string;
  death_date: string | null;
  death_place: string | null;
  gender: string;
  term_end_date: string | null;
}

export function buildPersonDetailDto(
  row: RepresentativeInput,
): PersonDetailDto {
  return {
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    sortName: row.sort_name,
    fullName: `${row.first_name} ${row.last_name}`,
    party: row.party,
    isMinister: Boolean(row.minister),
    phone: row.phone ?? null,
    email: row.email ?? null,
    municipality: row.current_municipality ?? null,
    profession: row.profession,
    website: row.website ?? null,
    additionalInfo: row.additional_info,
    birthDate: row.birth_date,
    birthYear: row.birth_year ?? null,
    birthPlace: row.birth_place,
    deathDate: row.death_date ?? null,
    deathPlace: row.death_place ?? null,
    gender: row.gender,
    termEndDate: row.term_end_date ?? null,
  };
}

interface PersonSearchResultInput {
  person_id: number;
  first_name: string;
  last_name: string;
  sort_name: string;
  birth_date: string | null;
  death_date: string | null;
  profession: string | null;
  latest_party_name: string | null;
  first_term_start: string | null;
  last_term_end: string | null;
  latest_active_date: string | null;
  is_current_mp: number | boolean;
  is_active_on_selected_date: number | boolean;
}

export function buildPersonSearchResultDto(
  row: PersonSearchResultInput,
): PersonSearchResultDto {
  return {
    personId: row.person_id,
    firstName: row.first_name,
    lastName: row.last_name,
    sortName: row.sort_name,
    fullName: `${row.first_name} ${row.last_name}`,
    birthDate: row.birth_date ?? null,
    deathDate: row.death_date ?? null,
    profession: row.profession ?? null,
    latestParty: row.latest_party_name ?? null,
    firstTermStart: row.first_term_start ?? null,
    lastTermEnd: row.last_term_end ?? null,
    latestActiveDate: row.latest_active_date ?? null,
    isCurrentMp: Boolean(row.is_current_mp),
    isActiveOnSelectedDate: Boolean(row.is_active_on_selected_date),
  };
}

export function buildPersonSearchResultDtos(
  rows: PersonSearchResultInput[],
): PersonSearchResultDto[] {
  return rows.map(buildPersonSearchResultDto);
}
