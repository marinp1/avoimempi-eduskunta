import { resolveParty } from "#shared/domain";

interface PartySummaryRow {
  party_code: string;
  party_display_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
}

interface DisciplineRow {
  party_code: string;
  discipline_rate: number | null;
}

export interface PartyRow {
  code: string;
  name: string;
  shortName: string;
  color: string;
  bloc: "government" | "opposition";
  chairName: string | null;
  seatCount: number;
  seatShare: string;
  cohesionPct: number | null;
  cohesionLabel: string;
}

export interface PuolueetData {
  rows: PartyRow[];
  govSeats: number;
  oppSeats: number;
  totalSeats: number;
  fetchedAt: string;
}

export function buildPuolueetData(input: {
  summaryRows: PartySummaryRow[];
  partyDiscipline: DisciplineRow[];
  fetchedAt: string;
}): PuolueetData {
  const { summaryRows, partyDiscipline, fetchedAt } = input;

  const govSeats = summaryRows
    .filter((r) => r.is_in_government === 1)
    .reduce((s, r) => s + r.member_count, 0);
  const oppSeats = summaryRows
    .filter((r) => r.is_in_government === 0)
    .reduce((s, r) => s + r.member_count, 0);
  const totalSeats = govSeats + oppSeats;

  const rows: PartyRow[] = summaryRows.map((r) => {
    const disc = partyDiscipline?.find((d) => d.party_code === r.party_code);
    const cohesionPct = disc?.discipline_rate ?? null;
    const party = resolveParty(r.party_display_code, r.party_name);
    return {
      code: r.party_code,
      name: party.name,
      shortName: r.party_display_code,
      color: party.color,
      bloc: r.is_in_government === 1 ? "government" : "opposition",
      chairName: null,
      seatCount: r.member_count,
      seatShare:
        totalSeats > 0
          ? `${((r.member_count / totalSeats) * 100).toFixed(1)} %`
          : "\u2013",
      cohesionPct: cohesionPct != null ? Math.round(cohesionPct) : null,
      cohesionLabel:
        cohesionPct != null ? `${Math.round(cohesionPct)} %` : "\u2013",
    };
  });

  return {
    rows,
    govSeats,
    oppSeats,
    totalSeats,
    fetchedAt,
  };
}
