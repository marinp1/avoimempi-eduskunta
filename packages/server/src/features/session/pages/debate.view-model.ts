import { partyColor, partyShortName } from "#server/domain";
import { formatFiLongDate } from "#server/helpers";
import i18next from "i18next";

interface DebateSessionRow {
  key: string;
  date: string | null | undefined;
}

interface DebateSectionRow {
  key: string;
  minutes_related_document_identifier: string | null | undefined;
  identifier: string | null | undefined;
  minutes_item_title: string | null | undefined;
  title: string | null | undefined;
  processing_title: string | null | undefined;
  minutes_item_number: string | null | undefined;
}

interface DebateVotingRow {
  n_yes: number | null | undefined;
  n_no: number | null | undefined;
  title: string | null | undefined;
}

interface DebateDocRow {
  document_id: number | null;
  document_tunnus: string | null;
  label: string | null;
  document_type_name: string | null;
}

export interface DebateData {
  session: DebateSessionRef;
  section: DebateSectionInfo;
  relatedDocs: DocLink[];
  speeches: SpeechEntry[];
  responseSpeeches: SpeechEntry[];
  votings: VoteResultData[];
  blocStats: BlocStats;
  fetchedAt: string;
}

export interface DebateSessionRef {
  key: string;
  date: string;
  dateLabel: string;
  title: string;
}

export interface DebateSectionInfo {
  key: string;
  identifier: string | null;
  title: string;
  processingTitle: string | null;
  itemNumber: string | null;
  totalSpeeches: number;
  groupSpeechCount: number;
  responseSpeechCount: number;
  timeRange: string;
  durationMin: number | null;
}

export interface DocLink {
  documentId: number | null;
  tunnus: string | null;
  label: string | null;
  typeName: string | null;
}

export interface SpeechEntry {
  kind: "group" | "reply";
  bloc: "hallitus" | "oppositio" | "unknown";
  searchText: string;
  ord: number;
  partyCode: string;
  partyName: string;
  partyColor: string;
  firstName: string;
  lastName: string;
  initials: string;
  speechType: string;
  roleLabel: string;
  roleClass: string;
  startTime: string | null;
  endTime: string | null;
  timeLabel: string | null;
  durationLabel: string | null;
  content: string | null;
  contentPreview: string | null;
  contentTruncated: boolean;
  contentLength: number;
  summary: string | null;
}

export interface VoteResultData {
  title: string;
  nYes: number;
  nNo: number;
  outcome: string;
  outcomeClass: "ok" | "no";
  yesPct: number;
  noPct: number;
}

export interface BlocStats {
  groupGov: number;
  groupOpp: number;
  totalReply: number;
}

function initials(first: string, last: string): string {
  const f = (first ?? "").charAt(0).toUpperCase();
  const l = (last ?? "").charAt(0).toUpperCase();
  return `${f}${l}` || "??";
}

function resolveBloc(
  partyAbr: string | null,
  partyGovMap: Map<string, number>,
): "hallitus" | "oppositio" | "unknown" {
  if (!partyAbr) return "unknown";
  const isInGov = partyGovMap.get(partyAbr.toLowerCase());
  if (isInGov === 1) return "hallitus";
  if (isInGov === 0) return "oppositio";
  return "unknown";
}

function roleLabel(speechType: string | null): string {
  switch (speechType) {
    case "NR":
      return "Ryhmäpuheenvuoro";
    case "IPV":
      return "Ilmoituspuheenvuoro";
    default:
      return "Puheenvuoro";
  }
}

function roleClass(speechType: string | null): string {
  switch (speechType) {
    case "NR":
      return "";
    case "IPV":
      return "min";
    default:
      return "reply";
  }
}

function formatFinnishTime(iso: string | null): string | null {
  if (!iso) return null;
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (m) return `klo ${m[1]}.${m[2]}`;
  return null;
}

function computeDuration(
  start: string | null,
  end: string | null,
): string | null {
  if (!start || !end) return null;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return null;
  const diffSec = Math.round((e - s) / 1000);
  if (diffSec < 60) return `${diffSec} s`;
  const min = Math.floor(diffSec / 60);
  const sec = diffSec % 60;
  if (min < 60) return `${min} min ${sec} s`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return `${h} h ${rem} min`;
}

function extractTimeRange(speeches: SpeechRow[]): string {
  const starts = speeches
    .map((s) => s.start_time)
    .filter(Boolean)
    .sort();
  const ends = speeches
    .map((s) => s.end_time)
    .filter(Boolean)
    .sort()
    .reverse();
  const first = starts[0] ? formatFinnishTime(starts[0]!) : null;
  const last = ends[0] ? formatFinnishTime(ends[0]!) : null;
  if (first && last) return `${first}–${last}`;
  if (first) return first;
  return "";
}

interface SpeechRow {
  start_time: string | null;
  end_time: string | null;
  speech_type: string | null;
  person_id: number;
  first_name: string;
  last_name: string;
  party_abbreviation: string | null;
  content: string | null;
  ordinal_number: number | null;
}

/** Full speech content is always shown — no truncation. */
function contentPreview(content: string | null): {
  preview: string | null;
  truncated: boolean;
} {
  if (!content) return { preview: null, truncated: false };
  return { preview: content, truncated: false };
}

export function buildDebateViewModel(params: {
  session: DebateSessionRow;
  section: DebateSectionRow;
  speeches: SpeechRow[];
  sectionVotings: DebateVotingRow[];
  sectionDocs: DebateDocRow[];
  partyGovMap: Map<string, number>;
  fetchedAt: string;
}): DebateData {
  const {
    session,
    section,
    speeches,
    sectionVotings,
    sectionDocs,
    partyGovMap,
    fetchedAt,
  } = params;

  const groupSpeeches = speeches.filter(
    (s) => s.speech_type === "NR" || s.speech_type === "IPV",
  );
  const replySpeeches = speeches.filter(
    (s) => s.speech_type !== "NR" && s.speech_type !== "IPV",
  );

  const buildSpeech = (s: SpeechRow, kind: "group" | "reply"): SpeechEntry => {
    const { preview, truncated } = contentPreview(s.content);
    const startLabel = formatFinnishTime(s.start_time);
    const dur = computeDuration(s.start_time, s.end_time);
    const pCode = (s.party_abbreviation ?? "").toLowerCase();
    return {
      kind,
      bloc: resolveBloc(s.party_abbreviation, partyGovMap),
      searchText:
        `${s.first_name} ${s.last_name} ${s.party_abbreviation ?? ""} ${pCode}`.toLowerCase(),
      ord: s.ordinal_number ?? 0,
      partyCode: pCode,
      partyName: partyShortName(
        s.party_abbreviation ?? "",
        s.party_abbreviation ?? "",
      ),
      partyColor: partyColor(s.party_abbreviation ?? ""),
      firstName: s.first_name,
      lastName: s.last_name,
      initials: initials(s.first_name, s.last_name),
      speechType: s.speech_type ?? "",
      roleLabel: roleLabel(s.speech_type),
      roleClass: roleClass(s.speech_type),
      startTime: s.start_time,
      endTime: s.end_time,
      timeLabel: startLabel,
      durationLabel: dur,
      content: s.content,
      contentPreview: preview,
      contentTruncated: truncated,
      contentLength: s.content?.length ?? 0,
      summary: null,
    };
  };

  const speechEntries = [
    ...groupSpeeches.map((s) => buildSpeech(s, "group")),
    ...replySpeeches.map((s) => buildSpeech(s, "reply")),
  ];

  const sessionComp = {
    key: session.key ?? "",
    date: session.date ?? "",
    dateLabel: session.date ? formatFiLongDate(session.date) : "",
    title: i18next.t("common:session_title_format", { key: session.key ?? "" }),
  };

  const sectionComp: DebateSectionInfo = {
    key: section.key ?? "",
    identifier:
      section.minutes_related_document_identifier ?? section.identifier ?? null,
    title: section.minutes_item_title ?? section.title ?? "Keskustelu",
    processingTitle: section.processing_title ?? null,
    itemNumber: section.minutes_item_number?.toString() ?? null,
    totalSpeeches: speeches.length,
    groupSpeechCount: groupSpeeches.length,
    responseSpeechCount: replySpeeches.length,
    timeRange: extractTimeRange(speeches),
    durationMin: null,
  };

  const docs: DocLink[] = (sectionDocs ?? []).map((d) => ({
    documentId: d.document_id ?? null,
    tunnus: d.document_tunnus ?? d.label ?? null,
    label: d.label ?? null,
    typeName: d.document_type_name ?? null,
  }));

  const votes: VoteResultData[] = (sectionVotings ?? []).map((v) => {
    const nYes = v.n_yes ?? 0;
    const nNo = v.n_no ?? 0;
    const total = nYes + nNo;
    const isApproved = nYes > nNo;
    return {
      title: v.title ?? "",
      nYes,
      nNo,
      outcome: isApproved ? "hyväksytty" : "hylätty",
      outcomeClass: isApproved ? "ok" : "no",
      yesPct: total > 0 ? (nYes / total) * 100 : 0,
      noPct: total > 0 ? (nNo / total) * 100 : 0,
    };
  });

  const blocStats: BlocStats = {
    groupGov: groupSpeeches.filter(
      (s) => resolveBloc(s.party_abbreviation, partyGovMap) === "hallitus",
    ).length,
    groupOpp: groupSpeeches.filter(
      (s) => resolveBloc(s.party_abbreviation, partyGovMap) === "oppositio",
    ).length,
    totalReply: replySpeeches.length,
  };

  return {
    session: sessionComp,
    section: sectionComp,
    relatedDocs: docs,
    speeches: speechEntries,
    responseSpeeches: speechEntries.filter((s) => s.kind === "reply"),
    votings: votes,
    blocStats,
    fetchedAt,
  };
}
