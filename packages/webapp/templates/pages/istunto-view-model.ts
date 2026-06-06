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

const PARTY_LABELS: Record<string, string> = {
  kok: "Kokoomus",
  ps: "Perussuomalaiset",
  sd: "SDP",
  kesk: "Keskusta",
  vihr: "Vihreät",
  vas: "Vasemmistoliitto",
  r: "RKP",
  kd: "Kristillisdemokraatit",
  liik: "Liike Nyt",
};

const PARTY_COLORS: Record<string, string> = {
  kok: "#1d4f91",
  ps: "#2c3e8c",
  sd: "#d3243a",
  kesk: "#0b8a4a",
  vihr: "#5aa829",
  vas: "#9e1f4b",
  r: "#1278b6",
  kd: "#1a3f86",
  liik: "#e0922f",
};

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
    const totalMembers = 200;
    const totalPresent = totalMembers - totalAbsent;

    const absentByParty = new Map<string, AbsenteeGroup>();
    for (const entry of entries) {
      const party = entry.party ?? "muu";
      if (!absentByParty.has(party)) {
        absentByParty.set(party, {
          partyCode: party,
          partyLabel: PARTY_LABELS[party] ?? party.toUpperCase(),
          color: PARTY_COLORS[party] ?? "#8a8178",
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

    const parties: AttendanceParty[] = [
      {
        code: "kok",
        label: "Kokoomus",
        color: "#1d4f91",
        total: 48,
        absent: countAbsent(absentByParty, "kok"),
        bloc: "hallitus",
      },
      {
        code: "ps",
        label: "Perussuomalaiset",
        color: "#2c3e8c",
        total: 45,
        absent: countAbsent(absentByParty, "ps"),
        bloc: "hallitus",
      },
      {
        code: "r",
        label: "RKP",
        color: "#1278b6",
        total: 10,
        absent: countAbsent(absentByParty, "r"),
        bloc: "hallitus",
      },
      {
        code: "kd",
        label: "Kristillisdemokraatit",
        color: "#1a3f86",
        total: 5,
        absent: countAbsent(absentByParty, "kd"),
        bloc: "hallitus",
      },
      {
        code: "sd",
        label: "SDP",
        color: "#d3243a",
        total: 43,
        absent: countAbsent(absentByParty, "sd"),
        bloc: "oppositio",
      },
      {
        code: "kesk",
        label: "Keskusta",
        color: "#0b8a4a",
        total: 23,
        absent: countAbsent(absentByParty, "kesk"),
        bloc: "oppositio",
      },
      {
        code: "vihr",
        label: "Vihreät",
        color: "#5aa829",
        total: 13,
        absent: countAbsent(absentByParty, "vihr"),
        bloc: "oppositio",
      },
      {
        code: "vas",
        label: "Vasemmistoliitto",
        color: "#9e1f4b",
        total: 11,
        absent: countAbsent(absentByParty, "vas"),
        bloc: "oppositio",
      },
      {
        code: "liik",
        label: "Liike Nyt",
        color: "#e0922f",
        total: 1,
        absent: countAbsent(absentByParty, "liik"),
        bloc: "oppositio",
      },
      {
        code: "muu",
        label: "Muu",
        color: "#8a8178",
        total: 1,
        absent: countAbsent(absentByParty, "muu"),
        bloc: "oppositio",
      },
    ];

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

    const documents: DocRef[] = buildDocRefs(section);

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
    };

    if (out.isVoting) {
      const votes: VoteResultData[] = sectionVotings.map((v: any) => {
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

function buildDocRefs(section: any): DocRef[] {
  const refs: DocRef[] = [];
  const docId = section.minutes_related_document_identifier;
  const docType = section.minutes_related_document_type;
  if (docId) {
    refs.push({
      tunnus: docId,
      isCommittee:
        docType === "valiokunnan_mietinto" ||
        docType === "valiokunnan_lausunto",
    });
  }
  return refs;
}

function determineOutcome(
  phaseCode: string,
  votingCount: number,
): { isVoting: boolean } {
  return {
    isVoting: phaseCode === "2_kasittely" && votingCount > 0,
  };
}
