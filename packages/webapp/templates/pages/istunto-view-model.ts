import { partyColor, partyShortName } from "../components/party";
import { formatFiLongDate } from "#shared-helpers";
import i18next from "i18next";

interface SessionDetailRow {
  state: string | null | undefined;
  state_text_fi: string | null | undefined;
  date: string | null | undefined;
  key: string;
  minutes_start_time?: string | null;
  minutes_end_time?: string | null;
  section_count: number | null | undefined;
  voting_count: number | null | undefined;
  speech_count: number | null | undefined;
  speaker_count: number | null | undefined;
  minutes_title?: string | null;
}

interface SectionDetailRow {
  key: string;
  minutes_processing_phase_code?: string | null;
  minutes_item_title?: string | null;
  title: string | null | undefined;
  speech_count: number | null | undefined;
  minutes_related_document_identifier?: string | null;
  minutes_related_document_type?: string | null;
}

interface VotingDetailRow {
  id?: number;
  n_yes: number | null | undefined;
  n_no: number | null | undefined;
  title: string | null | undefined;
}

interface RollCallReport {
  title: string | null;
  roll_call_start_time: string | null;
}

interface RollCallEntry {
  entry_type: string;
  party?: string | null;
  first_name: string;
  last_name: string;
  absence_reason?: string | null;
}

interface RollCallData {
  report: RollCallReport;
  entries: RollCallEntry[];
}

export interface SessionDetailData {
  session: SessionHeaderData;
  attendance: AttendanceData | null;
  votingSections: AgendaSectionData[];
  discussionSections: AgendaSectionData[];
  tabledItems: AgendaSectionData[];
  fetchedAt: string;
}

export interface SessionHeaderData {
  key: string;
  ptkId: string;
  typeLabel: string;
  stateClass: "done" | "live" | "draft";
  stateLabel: string;
  title: string;
  dateLabel: string;
  timeRange: string;
  duration: string;
  itemCount: number;
  votingCount: number;
  speechCount: number;
  speakerCount: number;
  minutesTitle: string | null;
}

export interface AttendanceData {
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalMembers: number;
  parties: AttendanceParty[];
  absenteesByParty: AbsenteeGroup[];
  rollCallTitle: string | null;
  rollCallTime: string | null;
}

export interface AttendanceParty {
  code: string;
  label: string;
  color: string;
  total: number;
  absent: number;
  bloc: "hallitus" | "oppositio";
}

export interface AbsenteeGroup {
  partyCode: string;
  partyLabel: string;
  color: string;
  members: AbsenteeMember[];
}

export interface AbsenteeMember {
  firstName: string;
  lastName: string;
  reason: string;
  isLate: boolean;
}

export interface AgendaSectionData {
  phaseCode: string;
  phaseLabel: string;
  items: AgendaItemData[];
}

export interface AgendaItemData {
  number: number;
  title: string;
  titleHref?: string;
  sectionKey?: string;
  documents: DocRef[];
  votingPhase?: VotingPhaseData;
  activity?: ActivityData;
  speakers?: SpeakerChip[];
}

export interface VotingPhaseData {
  label: string;
  votes: VoteResultData[];
}

export interface VoteResultData {
  id?: number;
  title: string;
  nYes: number;
  nNo: number;
  outcome: "hyväksytty" | "hylätty" | "mietintö" | string;
  outcomeClass: "ok" | "no";
  yesPct: number;
  noPct: number;
}

export interface ActivityData {
  speechCount: number;
  hasVotings: boolean;
}

export interface SpeakerChip {
  firstName: string;
  lastName: string;
  party: string;
  partyColor: string;
}

export interface DocRef {
  tunnus: string;
  isCommittee: boolean;
  documentId?: number;
}

function extractTimeRange(row: {
  minutes_start_time?: string | null;
  minutes_end_time?: string | null;
  minutes_title?: string | null;
}): string {
  if (row.minutes_title) {
    const m = row.minutes_title.match(
      /(\d{1,2})\.(\d{2})[–-](\d{1,2})\.(\d{2})/,
    );
    if (m) return `klo ${m[1]}.${m[2]}–${m[3]}.${m[4]}`;
  }
  if (row.minutes_start_time) {
    const start = row.minutes_start_time.slice(11, 16);
    const end = row.minutes_end_time ? row.minutes_end_time.slice(11, 16) : "";
    return end ? `klo ${start}–${end}` : `klo ${start}`;
  }
  return "";
}

function computeDuration(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return "";
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return "";
  const diffMs = e - s;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.round((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function deriveState(
  state: string | null | undefined,
  stateTextFi: string | null | undefined,
): { class: "done" | "live" | "draft"; label: string } {
  if (state === "KAYNNISSA")
    return { class: "live", label: i18next.t("istunnot:status_live") };
  if (state === "LOPETETTU" && stateTextFi === "Istunto päättynyt")
    return { class: "done", label: i18next.t("istunnot:status_done") };
  if (state === "PJLAADITTU")
    return { class: "draft", label: i18next.t("istunnot:status_draft") };
  return { class: "draft", label: i18next.t("istunnot:status_unknown") };
}

function phaseLabel(code: string | null | undefined): string {
  switch (code) {
    case "2_kasittely":
      return i18next.t("istunnot:detail.phase_toinen_kasittely");
    case "lahetekeskustelu":
      return i18next.t("istunnot:detail.phase_lahetekeskustelu");
    case "1_kasittely":
      return i18next.t("istunnot:detail.phase_ensimmainen_kasittely");
    case "ainoakasittely":
      return i18next.t("istunnot:detail.phase_ainoa_kasittely");
    case "poydallepano":
      return i18next.t("istunnot:detail.phase_poydallepano");
    default:
      return code ?? "";
  }
}

export function buildSessionDetailViewModel(
  session: SessionDetailRow,
  sections: SectionDetailRow[],
  votingsBySectionKey: Map<string, VotingDetailRow[]>,
  rollCallData: RollCallData | null,
  fetchedAt: string,
  seatCounts: Record<string, { seats: number; inGov: boolean }> = {},
  docIdMap?: Map<string, number>,
): SessionDetailData {
  const stateInfo = deriveState(session.state, session.state_text_fi);
  const dateLabel = session.date ? formatFiLongDate(session.date) : "";
  const timeRange = extractTimeRange(session);
  const duration = computeDuration(
    session.minutes_start_time,
    session.minutes_end_time,
  );

  const header: SessionHeaderData = {
    key: session.key,
    ptkId: `PTK ${session.key.split("/")[1]}/${session.key.split("/")[0]} vp`,
    typeLabel: i18next.t("istunnot:detail.minutes_protocol_label"),
    stateClass: stateInfo.class,
    stateLabel: stateInfo.label,
    title: i18next.t("common:session_title_format", { key: session.key }),
    dateLabel,
    timeRange,
    duration,
    itemCount: session.section_count ?? 0,
    votingCount: session.voting_count ?? 0,
    speechCount: session.speech_count ?? 0,
    speakerCount: session.speaker_count ?? 0,
    minutesTitle: session.minutes_title ?? null,
  };

  let attendance: AttendanceData | null = null;
  if (rollCallData) {
    const report = rollCallData.report;
    const entries = rollCallData.entries;
    const absentEntries = entries.filter((e) => e.entry_type === "absent");
    const lateEntries = entries.filter((e) => e.entry_type === "late");
    const totalAbsent = absentEntries.length;
    const totalLate = lateEntries.length;
    const totalMembers =
      Object.values(seatCounts).reduce((s, v) => s + v.seats, 0) || 200;
    const totalPresent = totalMembers - totalAbsent - totalLate;

    const absentByParty = new Map<string, AbsenteeGroup>();
    for (const entry of entries) {
      const party = entry.party ?? "muu";
      if (!absentByParty.has(party)) {
        absentByParty.set(party, {
          partyCode: party,
          partyLabel: partyShortName(party, party.toUpperCase()),
          color: partyColor(party),
          members: [],
        });
      }
      const group = absentByParty.get(party)!;
      group.members.push({
        firstName: entry.first_name,
        lastName: entry.last_name,
        reason: entry.absence_reason ?? "-",
        isLate: entry.entry_type === "late",
      });
    }

    const allPartyCodes = new Set<string>([
      ...Array.from(absentByParty.keys()),
      ...Object.keys(seatCounts),
    ]);

    const parties: AttendanceParty[] = Array.from(allPartyCodes)
      .map((code) => ({
        code,
        label: partyShortName(code, code.toUpperCase()),
        color: partyColor(code),
        total: seatCounts[code]?.seats ?? 0,
        absent: countAbsent(absentByParty, code),
        bloc: (seatCounts[code]?.inGov ? "hallitus" : "oppositio") as "hallitus" | "oppositio",
      }))
      .sort((a, b) => b.total - a.total);

    attendance = {
      totalPresent,
      totalAbsent,
      totalLate,
      totalMembers,
      parties,
      absenteesByParty: Array.from(absentByParty.values()),
      rollCallTitle: report.title ?? null,
      rollCallTime: report.roll_call_start_time ?? null,
    };
  }

  const votingSections: AgendaSectionData[] = [];
  const discussionSections: AgendaSectionData[] = [];
  const tabledItems: AgendaSectionData[] = [];

  let currentVotingPhase: AgendaSectionData | null = null;
  let currentDiscussionPhase: AgendaSectionData | null = null;
  let currentTabled: AgendaSectionData | null = null;

  let itemNumber = 1;

  for (const section of sections) {
    const phaseCode = section.minutes_processing_phase_code ?? "";
    const phaseLabelStr = phaseLabel(phaseCode);
    const sectionVotings = votingsBySectionKey.get(section.key) ?? [];
    const title = section.minutes_item_title ?? section.title ?? "";
    if (!title) continue;

    const documents: DocRef[] = buildDocRefs(section, docIdMap);

    const out = determineOutcome(phaseCode, sectionVotings.length);
    const speechCount = section.speech_count ?? 0;

    let activity: ActivityData | undefined;
    if (!out.isVoting) {
      activity = {
        speechCount,
        hasVotings: sectionVotings.length > 0,
      };
    }

    const item: AgendaItemData = {
      number: itemNumber++,
      title,
      documents,
      activity,
      sectionKey: section.key,
      titleHref: section.key
        ? `/asiakohta/${encodeURIComponent(section.key)}`
        : undefined,
    };

    if (out.isVoting) {
      const votes: VoteResultData[] = sectionVotings.map((v) => {
        const nYes = v.n_yes ?? 0;
        const nNo = v.n_no ?? 0;
        const total = nYes + nNo;
        const isApproved = nYes > nNo;
        return {
          id: v.id,
          title: v.title ?? "",
          nYes,
          nNo,
          outcome: isApproved ? "hyväksytty" : "hylätty",
          outcomeClass: isApproved ? "ok" : "no",
          yesPct: total > 0 ? (nYes / total) * 100 : 0,
          noPct: total > 0 ? (nNo / total) * 100 : 0,
        };
      });

      if (votes.length > 0) {
        item.votingPhase = {
          label: phaseLabelStr,
          votes,
        };
      }

      if (!currentVotingPhase || currentVotingPhase.phaseCode !== phaseCode) {
        currentVotingPhase = {
          phaseCode,
          phaseLabel: phaseLabelStr,
          items: [],
        };
        votingSections.push(currentVotingPhase);
      }
      currentVotingPhase.items.push(item);
    } else if (phaseCode === "poydallepano") {
      if (!currentTabled) {
        currentTabled = {
          phaseCode: "poydallepano",
          phaseLabel: i18next.t("istunnot:detail.section_tabled_label"),
          items: [],
        };
        tabledItems.push(currentTabled);
      }
      currentTabled.items.push(item);
    } else {
      if (
        !currentDiscussionPhase ||
        currentDiscussionPhase.phaseCode !== phaseCode
      ) {
        currentDiscussionPhase = {
          phaseCode,
          phaseLabel: phaseLabelStr,
          items: [],
        };
        discussionSections.push(currentDiscussionPhase);
      }
      currentDiscussionPhase.items.push(item);
    }
  }

  return {
    session: header,
    attendance,
    votingSections,
    discussionSections,
    tabledItems,
    fetchedAt,
  };
}

function countAbsent(map: Map<string, AbsenteeGroup>, party: string): number {
  return map.get(party)?.members.filter((m) => !m.isLate).length ?? 0;
}

function buildDocRefs(section: SectionDetailRow, docIdMap?: Map<string, number>): DocRef[] {
  const refs: DocRef[] = [];
  const docId = section.minutes_related_document_identifier;
  const docType = section.minutes_related_document_type;
  if (docId) {
    refs.push({
      tunnus: docId,
      isCommittee:
        docType === "valiokunnan_mietinto" ||
        docType === "valiokunnan_lausunto",
      documentId: docIdMap?.get(docId),
    });
  }
  return refs;
}

function determineOutcome(
  phaseCode: string,
  votingCount: number,
): { isVoting: boolean } {
  return {
    isVoting:
      (phaseCode === "2_kasittely" || phaseCode === "ainoakasittely") &&
      votingCount > 0,
  };
}
