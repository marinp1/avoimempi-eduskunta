import { buildVoteTally } from "#server/domain";
import i18next from "i18next";

interface VotingBrowseRow {
  id: number;
  number: number;
  start_time: string | null;
  start_date: string | null;
  title: string | null;
  session_key: string | null;
  section_order: number | null;
  section_key: string | null;
  n_yes: number;
  n_no: number;
  n_abstain: number;
  n_absent: number;
  n_total: number;
}

export interface VoteRow {
  id: number;
  votingNumber: number;
  time: string;
  title: string;
  questionText: string;
  sessionKey: string;
  sessionDate: string;
  asiakohtaNum: number | null;
  sectionKey: string | null;
  documents: Array<{
    identifier: string;
    label: string;
    isCommittee: boolean;
  }>;
  references: Array<{
    label: string;
    href: string;
  }>;
  nYes: number;
  nNo: number;
  nEmpty: number;
  nAbsent: number;
  nTotal: number;
  yesPct: number;
  noPct: number;
  outcome: "ok" | "no" | "neutral";
  outcomeLabel: string;
}

export interface VoteGroup {
  sessionKey: string;
  sessionDate: string;
  sessionDateLabel: string;
  rows: VoteRow[];
}

export interface AanestyksetData {
  groups: VoteGroup[];
  totalCount: number;
  fetchedAt: string;
}

export function buildAanestyksetData(input: {
  votings: VotingBrowseRow[];
  searchQuery: string | undefined;
  fetchedAt: string;
}): AanestyksetData {
  const { votings, searchQuery, fetchedAt } = input;

  const filtered = searchQuery
    ? votings.filter(
        (v) =>
          (v.title ?? "").toLowerCase().includes(searchQuery) ||
          (v.session_key ?? "").toLowerCase().includes(searchQuery),
      )
    : votings;

  const groupMap = new Map<string, VoteRow[]>();
  for (const v of filtered) {
    const t = buildVoteTally({
      nYes: v.n_yes,
      nNo: v.n_no,
      nEmpty: v.n_abstain,
      nAbsent: v.n_absent,
      nTotal: v.n_total,
    });
    const row: VoteRow = {
      id: v.id,
      votingNumber: v.number,
      time: v.start_time ?? "",
      title: v.title ?? "",
      questionText: (v.title ?? "").substring(0, 120),
      sessionKey: v.session_key ?? "",
      sessionDate: v.start_date ?? "",
      asiakohtaNum: v.section_order ?? null,
      sectionKey: v.section_key ?? null,
      documents: [],
      references: [],
      nYes: t.nYes,
      nNo: t.nNo,
      nEmpty: t.nEmpty,
      nAbsent: t.nAbsent,
      nTotal: t.nTotal,
      yesPct: t.yesPct,
      noPct: t.noPct,
      outcome: t.outcome,
      outcomeLabel:
        t.outcome === "ok"
          ? i18next.t("aanestykset:outcome_approved")
          : i18next.t("aanestykset:outcome_rejected"),
    };
    const sk = v.session_key ?? "";
    if (!groupMap.has(sk)) groupMap.set(sk, []);
    groupMap.get(sk)!.push(row);
  }

  const groups: VoteGroup[] = Array.from(groupMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 30)
    .map(([sessionKey, rows]) => ({
      sessionKey,
      sessionDate: rows[0]?.sessionDate ?? "",
      sessionDateLabel: i18next.t("aanestykset:group_session_prefix", {
        key: sessionKey,
      }),
      rows,
    }));

  return {
    groups,
    totalCount: filtered.length,
    fetchedAt,
  };
}
