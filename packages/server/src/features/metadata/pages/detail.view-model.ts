import { resolveParty } from "#server/domain";
import i18next from "i18next";

interface PartySummaryRow {
  member_count: number;
  is_in_government: number;
  participation_rate: number | null;
  average_age: number | null;
  female_count: number;
  male_count: number;
}

interface PartyMemberRow {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  birth_date: string;
  current_municipality: string;
}

interface DisciplineRow {
  discipline_rate: number | null;
  total_votes: number | null;
}

export interface PartyDetailData {
  party: {
    code: string;
    name: string;
    shortName: string;
    color: string;
    bloc: "government" | "opposition";
    chairName: string | null;
    seatCount: number;
    seatShare: string;
    avgAttendance: string | null;
    avgAge: string | null;
    govtSince: string | null;
    femaleCount: number;
    maleCount: number;
  };
  totalSeats: number;
  cohesion: {
    pct: number | null;
    label: string;
    totalVotings: number | null;
  };
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    partyCode: string;
    color: string;
    district: string;
    age: number | null;
    attendancePct: number | null;
  }>;
  splitVotes: Array<{
    id: number;
    title: string;
    date: string;
    nYes: number;
    nNo: number;
    dissenters: number;
  }>;
  topics: string[];
  committeeChairs: Array<{
    committee: string;
    name: string;
    isLead: boolean;
  }>;
  recentSpeeches: Array<{
    personId: number;
    name: string;
    partyCode: string;
    color: string;
    date: string;
    title: string;
  }>;
  fetchedAt: string;
}

export function buildPartyDetailData(input: {
  partyCode: string;
  partyRow: PartySummaryRow | undefined;
  members: PartyMemberRow[];
  cohRow: DisciplineRow | undefined;
  totalSeats: number;
  fetchedAt: string;
}): PartyDetailData {
  const { partyCode, partyRow, members, cohRow, totalSeats, fetchedAt } = input;
  const party = resolveParty(partyCode);
  const cohesionPct = cohRow?.discipline_rate ?? null;

  return {
    totalSeats,
    party: {
      code: partyCode,
      name: party.name,
      shortName: partyCode,
      color: party.color,
      bloc: partyRow?.is_in_government === 1 ? "government" : "opposition",
      chairName: null,
      seatCount: partyRow?.member_count ?? 0,
      seatShare:
        totalSeats > 0
          ? `${(((partyRow?.member_count ?? 0) / totalSeats) * 100).toFixed(1)} %`
          : "\u2013",
      avgAttendance:
        partyRow?.participation_rate != null
          ? `${partyRow.participation_rate.toFixed(0)}`
          : null,
      avgAge:
        partyRow?.average_age != null
          ? `${partyRow.average_age.toFixed(0)}`
          : null,
      govtSince: null,
      femaleCount: partyRow?.female_count ?? 0,
      maleCount: partyRow?.male_count ?? 0,
    },
    cohesion: {
      pct: cohesionPct != null ? Math.round(cohesionPct) : null,
      label:
        cohesionPct != null
          ? i18next.t("parties:detail.cohesion_unified_format", {
              pct: Math.round(cohesionPct),
            })
          : i18next.t("parties:detail.cohesion_no_data"),
      totalVotings: cohRow?.total_votes ?? null,
    },
    members: members.map((m) => {
      const birthDate = m.birth_date ? new Date(m.birth_date) : null;
      const age =
        birthDate != null
          ? new Date().getFullYear() -
            birthDate.getFullYear() -
            (new Date().getMonth() < birthDate.getMonth() ||
            (new Date().getMonth() === birthDate.getMonth() &&
              new Date().getDate() < birthDate.getDate())
              ? 1
              : 0)
          : null;
      return {
        id: m.person_id,
        firstName: m.first_name,
        lastName: m.last_name,
        partyCode: m.party,
        color: party.color,
        district: m.current_municipality ?? "",
        age,
        attendancePct: null,
      };
    }),
    splitVotes: [],
    topics: [],
    committeeChairs: [],
    recentSpeeches: [],
    fetchedAt,
  };
}
