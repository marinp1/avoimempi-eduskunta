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
  doc_tunnuses: string | null;
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
  /** ISO date of the oldest shown session; non-null when more sessions may exist. */
  nextCursor: string | null;
  activeFilter: string | null;
  fetchedAt: string;
}

const COMMITTEE_PREFIXES = ["SIVM", "TVM", "HaVM", "PeVM", "VaVM", "LaVM", "LiVM", "MmVM", "PuVM", "SiVM", "StVM", "TaVM", "UaVM", "VaVL"];

function parseDocTunnuses(raw: string | null): VoteRow["documents"] {
  if (!raw) return [];
  const tunnuses = raw.split("||").filter(Boolean);
  const docs: VoteRow["documents"] = [];
  for (const tunnus of tunnuses.slice(0, 3)) {
    const trimmed = tunnus.trim();
    if (!trimmed) continue;
    const prefix = trimmed.split(" ")[0] ?? "";
    const isCommittee = COMMITTEE_PREFIXES.some((p) => prefix.startsWith(p));
    docs.push({ identifier: trimmed, label: trimmed, isCommittee });
  }
  return docs;
}

function matchesType(v: VotingBrowseRow, type: string): boolean {
  const title = (v.title ?? "").toLowerCase();
  switch (type) {
    case "lait":
      return title.includes("laki") && !title.includes("luottamus") && !title.includes("selonteko");
    case "selonteot":
      return title.includes("selonteko");
    case "luottamus":
      return title.includes("luottamus") || title.includes("välikysymys");
    case "tiukat":
      return v.n_total > 0 && Math.abs(v.n_yes - v.n_no) < 10;
    default:
      return true;
  }
}

export function buildAanestyksetData(input: {
  votings: VotingBrowseRow[];
  searchQuery: string | undefined;
  activeFilter: string | null;
  fetchedAt: string;
}): AanestyksetData {
  const { votings, searchQuery, activeFilter, fetchedAt } = input;

  const filtered = votings.filter((v) => {
    if (searchQuery) {
      const matchesSearch =
        (v.title ?? "").toLowerCase().includes(searchQuery) ||
        (v.session_key ?? "").toLowerCase().includes(searchQuery);
      if (!matchesSearch) return false;
    }
    if (activeFilter) return matchesType(v, activeFilter);
    return true;
  });

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
      documents: parseDocTunnuses(v.doc_tunnuses),
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
          ? i18next.t("votings:outcome_approved")
          : i18next.t("votings:outcome_rejected"),
    };
    const sk = v.session_key ?? "";
    if (!groupMap.has(sk)) groupMap.set(sk, []);
    groupMap.get(sk)!.push(row);
  }

  const MAX_GROUPS = 30;
  const sortedEntries = Array.from(groupMap.entries()).sort(([a], [b]) =>
    b.localeCompare(a),
  );
  const groups: VoteGroup[] = sortedEntries
    .slice(0, MAX_GROUPS)
    .map(([sessionKey, rows]) => ({
      sessionKey,
      sessionDate: rows[0]?.sessionDate ?? "",
      sessionDateLabel: i18next.t("votings:group_session_prefix", {
        key: sessionKey,
      }),
      rows,
    }));

  const nextCursor =
    sortedEntries.length > MAX_GROUPS
      ? (groups[groups.length - 1]?.sessionDate ?? null)
      : null;

  return {
    groups,
    totalCount: filtered.length,
    nextCursor,
    activeFilter,
    fetchedAt,
  };
}
