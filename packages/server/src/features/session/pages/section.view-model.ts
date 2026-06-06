import type { SessionRepository } from "../session.repository";
import { partyColor, partyShortName, buildVoteTally } from "#server/domain";
import i18next from "i18next";

type SectionRow = NonNullable<
  ReturnType<SessionRepository["fetchSectionByKey"]>
>;
type SectionVotingRow = ReturnType<
  SessionRepository["fetchSectionVotings"]
>[number];
type SpeechRow = ReturnType<
  SessionRepository["fetchSectionSpeeches"]
>["speeches"][number];
type SessionSectionRow = ReturnType<
  SessionRepository["fetchSessionByKey"]
>["sections"][number];

export interface AsiakohtaData {
  section: {
    key: string;
    itemNumber: string | null;
    title: string;
    processingTitle: string | null;
    sessionKey: string;
    sessionDate: string;
    sessionDateLabel: string;
    sessionTitle: string;
    identifier: string | null;
    timeRange: string | null;
    phase: string;
    note: string | null;
    resolution: string | null;
  };
  prevSection: {
    key: string;
    itemNumber: string | null;
    title: string;
  } | null;
  nextSection: {
    key: string;
    itemNumber: string | null;
    title: string;
  } | null;
  sessionItemsCount: number;
  currentItemIndex: number;
  lifecycleSteps: Array<{
    label: string;
    isDone: boolean;
    isCurrent: boolean;
    date: string | null;
    stepNumber: string | null;
    tag: string | null;
    tagClass: string | null;
  }>;
  viewpoints: {
    for: string[];
    against: string[];
  };
  votings: Array<{
    id: number;
    votingNumber: number;
    title: string;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    yesPct: number;
    noPct: number;
    outcome: "ok" | "no";
    outcomeLabel: string;
  }>;
  speeches: Array<{
    personId: number;
    firstName: string;
    lastName: string;
    initials: string;
    partyCode: string;
    partyName: string;
    partyColor: string;
    bloc: string;
    roleLabel: string;
    roleClass: string;
    timeLabel: string;
    durationLabel: string | null;
    summary: string | null;
    fullText: string | null;
    contentLength: number;
  }>;
  fetchedAt: string;
}

function phaseLabel(code: string | null): string {
  switch (code) {
    case "yksikasittely":
      return i18next.t("istunnot:detail.phase_yksi_kasittely");
    case "ensimmainenkasittely":
      return i18next.t("istunnot:detail.phase_ensimmainen_kasittely");
    case "toinenkasittely":
      return i18next.t("istunnot:detail.phase_toinen_kasittely");
    case "ainoa":
      return i18next.t("istunnot:detail.phase_ainoa_kasittely");
    case "kasittely":
      return i18next.t("istunnot:detail.phase_kasittely");
    case "poydallepano":
      return i18next.t("istunnot:detail.phase_poydallepano");
    default:
      return code ?? i18next.t("istunnot:detail.phase_kasittely");
  }
}

function initials(first: string, last: string): string {
  const f = (first ?? "").charAt(0).toUpperCase();
  const l = (last ?? "").charAt(0).toUpperCase();
  return `${f}${l}` || "??";
}

function sectionNav(s: SessionSectionRow): {
  key: string;
  itemNumber: string | null;
  title: string;
} {
  return {
    key: s.key,
    itemNumber: s.minutes_item_number?.toString() ?? null,
    title: s.minutes_item_title ?? s.title ?? "",
  };
}

export function buildAsiakohtaData(input: {
  section: SectionRow;
  sessionSections: SessionSectionRow[];
  sectionVotings: SectionVotingRow[];
  speeches: SpeechRow[];
  fetchedAt: string;
}): AsiakohtaData {
  const { section, sessionSections, sectionVotings, speeches } = input;

  const currentIndex = sessionSections.findIndex((s) => s.key === section.key);
  const prevSection =
    currentIndex > 0 ? sectionNav(sessionSections[currentIndex - 1]!) : null;
  const nextSection =
    currentIndex >= 0 && currentIndex < sessionSections.length - 1
      ? sectionNav(sessionSections[currentIndex + 1]!)
      : null;

  return {
    section: {
      key: section.key,
      itemNumber: section.minutes_item_number?.toString() ?? null,
      title: section.minutes_item_title ?? section.title ?? "",
      processingTitle: section.processing_title ?? null,
      sessionKey: section.session_key,
      sessionDate: "",
      sessionDateLabel: "",
      sessionTitle: i18next.t("common:session_title_format", {
        key: section.session_key,
      }),
      identifier:
        section.minutes_related_document_identifier ??
        section.identifier ??
        null,
      timeRange: null,
      phase: phaseLabel(section.minutes_processing_phase_code),
      note: section.note ?? null,
      resolution: section.resolution ?? null,
    },
    prevSection,
    nextSection,
    sessionItemsCount: sessionSections.length,
    currentItemIndex: currentIndex + 1,
    lifecycleSteps: [
      {
        label: phaseLabel(section.minutes_processing_phase_code),
        isDone: true,
        isCurrent: true,
        date: null,
        stepNumber: "01",
        tag: null,
        tagClass: null,
      },
    ],
    viewpoints: { for: [], against: [] },
    votings: sectionVotings.map((v) => {
      const t = buildVoteTally({
        nYes: v.n_yes,
        nNo: v.n_no,
        nEmpty: v.n_abstain,
        nAbsent: v.n_absent,
        nTotal: (v.n_yes ?? 0) + (v.n_no ?? 0),
      });
      return {
        id: v.id,
        votingNumber: v.number,
        title: v.title ?? "",
        nYes: t.nYes,
        nNo: t.nNo,
        nEmpty: t.nEmpty,
        nAbsent: t.nAbsent,
        yesPct: t.yesPct,
        noPct: t.noPct,
        outcome: t.outcome,
        outcomeLabel:
          t.outcome === "ok"
            ? i18next.t("aanestykset:outcome_approved").toLowerCase()
            : i18next.t("aanestykset:outcome_rejected").toLowerCase(),
      };
    }),
    speeches: speeches.map((s) => {
      const pCode = (s.party_abbreviation ?? "").toLowerCase();
      const content = s.content ?? null;
      const isGov = (s as Record<string, unknown>).is_government;
      return {
        personId: s.person_id,
        firstName: s.first_name ?? "",
        lastName: s.last_name ?? "",
        initials: initials(s.first_name, s.last_name),
        partyCode: pCode,
        partyName: partyShortName(s.party_abbreviation ?? ""),
        partyColor: partyColor(s.party_abbreviation ?? ""),
        bloc: isGov === 1 ? "hallitus" : "oppositio",
        roleLabel:
          s.speech_type === "NR"
            ? i18next.t("components:keskustelu.speech_type_group")
            : s.speech_type === "IPV"
              ? i18next.t("components:keskustelu.speech_type_notification")
              : i18next.t("components:keskustelu.speech_type_default"),
        roleClass:
          s.speech_type === "IPV"
            ? "min"
            : s.speech_type !== "NR"
              ? "reply"
              : "",
        timeLabel: s.start_time
          ? i18next.t("istunnot:detail.attendance_time_format", {
              time: s.start_time.slice(11, 16).replace(":", "."),
            })
          : "",
        durationLabel: null,
        summary: null,
        fullText: content,
        contentLength: content?.length ?? 0,
      };
    }),
    fetchedAt: input.fetchedAt,
  };
}
