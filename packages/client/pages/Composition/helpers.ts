import type { RepresentativeSelection } from "./Details";

export type MemberWithExtras = DatabaseQueries.GetParliamentComposition;
export type PersonLookupResult = ApiRouteItem<"/api/person/search">;
export type GovernmentFilterValue = "all" | "government" | "opposition";
export type CompositionBrowserView = "list" | "table";
export type CompositionSortValue = "name" | "party" | "age" | "tenure";

export const formatFinnishDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-");
  return `${parseInt(day, 10)}.${parseInt(month, 10)}.${year}`;
};

export const calculateAgeAtDate = (birthDate: string, activeDate: string) => {
  const birth = new Date(birthDate);
  const active = new Date(activeDate);
  let age = active.getFullYear() - birth.getFullYear();
  const monthDelta = active.getMonth() - birth.getMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && active.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
};

export const buildCompositionUrl = (
  pathname: string,
  search: string,
  updates: Record<string, string | null | undefined>,
) => {
  const params = new URLSearchParams(search);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

export const getActivationDateForSearchResult = (
  result: PersonLookupResult,
  selectedDate: string,
) => {
  if (result.is_active_on_selected_date === 1) {
    return selectedDate;
  }
  return result.latest_active_date ?? selectedDate;
};

export const toRepresentativeSelectionFromMember = (
  member: MemberWithExtras,
): RepresentativeSelection => ({
  personId: member.person_id,
  summary: {
    firstName: member.first_name,
    lastName: member.last_name,
    partyName: member.party_name,
    isInGovernment: member.is_in_government,
  },
});

export const toRepresentativeSelectionFromSearchResult = (
  result: PersonLookupResult,
): RepresentativeSelection => ({
  personId: result.person_id,
  summary: {
    firstName: result.first_name,
    lastName: result.last_name,
    partyName: result.latest_party_name,
    isInGovernment: null,
  },
});

export const getMemberStartDate = (member: MemberWithExtras) =>
  (member as MemberWithExtras & { t_start_date?: string }).start_date ||
  (member as MemberWithExtras & { t_start_date?: string }).t_start_date ||
  "";

export type PartySummary = {
  partyName: string;
  total: number;
  government: number;
  opposition: number;
  share: number;
};

export const buildPartySummaries = (
  members: MemberWithExtras[],
): PartySummary[] => {
  const grouped = members.reduce<Record<string, PartySummary>>(
    (acc, member) => {
      const partyName = member.party_name || "Ei tiedossa";
      const existing = acc[partyName] ?? {
        partyName,
        total: 0,
        government: 0,
        opposition: 0,
        share: 0,
      };
      existing.total += 1;
      if (member.is_in_government === 1) {
        existing.government += 1;
      } else {
        existing.opposition += 1;
      }
      acc[partyName] = existing;
      return acc;
    },
    {},
  );

  const totalMembers = members.length || 1;
  return Object.values(grouped)
    .map((party) => ({
      ...party,
      share: party.total / totalMembers,
    }))
    .sort(
      (a, b) => b.total - a.total || a.partyName.localeCompare(b.partyName),
    );
};
