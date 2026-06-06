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

const MONTH_NAMES = [
  "tammikuuta",
  "helmikuuta",
  "maaliskuuta",
  "huhtikuuta",
  "toukokuuta",
  "kesäkuuta",
  "heinäkuuta",
  "elokuuta",
  "syyskuuta",
  "lokakuuta",
  "marraskuuta",
  "joulukuuta",
];

const DAY_NAMES = [
  "sunnuntaina",
  "maanantaina",
  "tiistaina",
  "keskiviikkona",
  "torstaina",
  "perjantaina",
  "lauantaina",
];

import { partyColor, partyShortName } from "../components/party";

function finnishDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const dayName = DAY_NAMES[d.getDay()] ?? "";
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()] ?? "";
  const year = d.getFullYear();
  return `${dayName} ${day}.${month.slice(0, 4)}${month.slice(4)} ${year}`;
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
    return { class: "live", label: "Istunto käynnissä" };
  if (state === "LOPETETTU" && stateTextFi === "Istunto päättynyt")
    return { class: "done", label: "Istunto päättynyt" };
  if (state === "PJLAADITTU")
    return { class: "draft", label: "Pöytäkirjaa laaditaan" };
  return { class: "draft", label: "Luonnos" };
}

function phaseLabel(code: string | null | undefined): string {
  switch (code) {
    case "2_kasittely":
      return "Toinen käsittely";
    case "lahetekeskustelu":
      return "Lähetekeskustelu";
    case "1_kasittely":
      return "Ensimmäinen käsittely";
    case "ainoakasittely":
      return "Ainoa käsittely";
    case "poydallepano":
      return "Pöydällepano";
    default:
      return code ?? "";
  }
}

export function buildSessionDetailViewModel(
  session: any,
  sections: any[],
  votingsBySectionKey: Map<string, any[]>,
  rollCallData: any | null,
  fetchedAt: string,
  seatCounts: Record<string, { seats: number; inGov: boolean }> = {},
  docIdMap?: Map<string, number>,
): SessionDetailData {
  const stateInfo = deriveState(session.state, session.state_text_fi);
  const dateLabel = session.date ? finnishDateLabel(session.date) : "";
  const timeRange = extractTimeRange(session);
  const duration = computeDuration(
    session.minutes_start_time,
    session.minutes_end_time,
  );

  const header: SessionHeaderData = {
    key: session.key,
    ptkId: `PTK ${session.key.split("/")[1]}/${session.key.split("/")[0]} vp`,
    typeLabel: "Täysistunnon pöytäkirja",
    stateClass: stateInfo.class,
    stateLabel: stateInfo.label,
    title: `Täysistunto ${session.key}`,
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
    const absentEntries = entries.filter((e: any) => e.entry_type === "absent");
    const lateEntries = entries.filter((e: any) => e.entry_type === "late");
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
        bloc: (seatCounts[code]?.inGov ? "hallitus" : "oppositio") as
          | "hallitus"
          | "oppositio",
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
      const votes: VoteResultData[] = sectionVotings.map((v: any) => {
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
          phaseLabel: "Pöydälle pannut",
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

function buildDocRefs(section: any, docIdMap?: Map<string, number>): DocRef[] {
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
