import {
  resolveParty,
  tallyVoteList,
  findCurrentGroup,
  findCurrentDistrict,
} from "#server/domain";
import i18next from "i18next";
import {
  initiativeTypeLabel,
  questionKindLabel,
} from "#server/features/document/kinds/labels";
import type {
  ProvenanceService,
  CitePropData,
} from "#server/domain/provenance.service";
import type { SourceNoteOptions } from "#server/components/provenance";

interface PersonRow {
  person_id: number;
  first_name: string | null;
  last_name: string | null;
  birth_year: number | null;
  profession: string | null;
  party: string | null;
}

interface GroupMembershipRow {
  end_date: string | null;
  group_abbreviation: string | null;
}

interface DistrictRow {
  end_date: string | null;
  district_name: string | null;
}

interface TermRow {
  start_year: number | null;
  start_date: string | null;
}

interface PersonVoteRow {
  vote: string;
}

interface PersonMetrics {
  initiative_count?: number;
  written_question_count?: number;
  speech_count?: number;
}

interface BaselineMetrics {
  avgSpeechCount: number;
  avgInitiativeCount: number;
  avgWrittenQuestionCount: number;
  avgVoteParticipationRate: number;
}

interface MetricsData {
  person: PersonMetrics | null;
  party: BaselineMetrics | null;
  parliament: BaselineMetrics | null;
}

interface DissentRow {
  voting_id: number;
  start_time: string;
  title: string | null;
  section_title: string | null;
  mp_vote: string | null;
  majority_vote: string | null;
  party_name: string | null;
}

interface InitiativeRow {
  id: number;
  parliament_identifier: string | null;
  initiative_type_code: string | null;
  title: string | null;
  submission_date: string | null;
  relation_role: string | null;
}

interface QuestionRow {
  id: number;
  question_kind: string | null;
  parliament_identifier: string | null;
  title: string | null;
  submission_date: string | null;
}

interface CommitteeRow {
  committee_code: string | null;
  committee_name: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface FocusAreaItem {
  label: string;
  weight: number;
}

interface FocusAreasData {
  areas: FocusAreaItem[];
}

export interface PersonProfileData {
  person: {
    id: number;
    firstName: string;
    lastName: string;
    initials: string;
    partyCode: string;
    partyName: string;
    partyColor: string;
    isInGovernment: boolean;
    currentDistrict: string;
    birthYear: number | null;
    age: string;
    profession: string;
    memberSince: string;
  };
  stats: {
    participationPct: string;
    nTotal: number;
    nCast: number;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nInitiatives: number;
    nWrittenQuestions: number;
  };
  dissents: Array<{
    votingId: number;
    startTime: string;
    title: string;
    sectionTitle: string;
    mpVote: string;
    majorityVote: string;
    partyName: string;
  }>;
  initiatives: Array<{
    documentId?: number;
    parliamentIdentifier: string;
    initiativeTypeCode: string;
    initiativeTypeLabel: string;
    title: string | null;
    submissionDate: string | null;
    relationRole: string;
  }>;
  questions: Array<{
    documentId?: number;
    questionKind: string;
    questionKindLabel: string;
    parliamentIdentifier: string;
    title: string | null;
    submissionDate: string | null;
  }>;
  committees: Array<{
    committeeCode: string;
    committeeName: string;
    role: string;
    startDate: string;
    endDate: string | null;
  }>;
  focusAreas: Array<{
    label: string;
    weight: number;
  }>;
  baselines: {
    speech: { own: number; partyAvg: number; parliamentAvg: number };
    initiative: { own: number; partyAvg: number; parliamentAvg: number };
    writtenQuestion: { own: number; partyAvg: number; parliamentAvg: number };
    participation: { own: string; partyAvg: string; parliamentAvg: string };
  } | null;
  hasAiSummary: boolean;
  provenance: {
    stats: {
      participation: CitePropData;
      votedNo: CitePropData;
      initiatives: CitePropData;
      writtenQuestions: CitePropData;
    };
    notes: {
      vote: SourceNoteOptions;
      vaski: SourceNoteOptions;
      committees: SourceNoteOptions;
      focusAreas: SourceNoteOptions;
      basics: SourceNoteOptions;
    };
  };
}

export interface PersonSpeechesData {
  personId: number;
  personName: string;
  speeches: Array<{
    sectionTitle: string | null;
    startTime: string | null;
    speechType: string | null;
  }>;
  sourceNote: SourceNoteOptions;
}

export function buildPersonProfileData(input: {
  details: PersonRow;
  groupMemberships: GroupMembershipRow[];
  districts: DistrictRow[];
  terms: TermRow[];
  votes: PersonVoteRow[];
  metrics: MetricsData;
  dissents: DissentRow[];
  initiatives: InitiativeRow[];
  questions: QuestionRow[];
  committees: CommitteeRow[];
  focusAreas: FocusAreasData;
  capabilities: { hasAiSummary: boolean };
  provenanceService: ProvenanceService;
}): PersonProfileData {
  const {
    details,
    groupMemberships,
    districts,
    terms,
    votes,
    metrics,
    dissents,
    initiatives,
    questions,
    committees,
    focusAreas,
    capabilities,
    provenanceService,
  } = input;

  const currentGroup = findCurrentGroup(groupMemberships);
  const partyCode =
    currentGroup?.group_abbreviation ?? details.party ?? "unknown";
  const isInGovernment = !!currentGroup && !currentGroup.end_date;

  const currentDistrict = findCurrentDistrict(districts);
  const districtName =
    currentDistrict?.district_name ?? districts[0]?.district_name ?? "";

  const firstTerm = terms[0];
  const memberSince = firstTerm?.start_year
    ? i18next.t("persons:profile.member_since_prefix", {
        year: firstTerm.start_year,
      })
    : firstTerm?.start_date
      ? i18next.t("persons:profile.member_since_prefix", {
          year: new Date(firstTerm.start_date).getFullYear(),
        })
      : "";

  const voteTally = tallyVoteList(votes);
  const participationPct =
    voteTally.nTotal > 0 ? voteTally.participationPct.toFixed(1) : "0";

  const metricsPerson = metrics.person;
  const nInitiatives = metricsPerson?.initiative_count ?? 0;
  const nWrittenQuestions = metricsPerson?.written_question_count ?? 0;

  const firstName = details.first_name ?? "";
  const lastName = details.last_name ?? "";
  const initials =
    `${firstName.charAt(0) ?? ""}${lastName.charAt(0) ?? ""}`.toUpperCase();
  const age = details.birth_year
    ? String(new Date().getFullYear() - details.birth_year)
    : "\u2014";
  const profession = details.profession ?? "";
  const party = resolveParty(partyCode);

  const baselinesParty = metrics.party;
  const baselinesParliament = metrics.parliament;
  const baselines =
    baselinesParty && baselinesParliament
      ? {
          speech: {
            own: metricsPerson?.speech_count ?? 0,
            partyAvg: baselinesParty.avgSpeechCount,
            parliamentAvg: baselinesParliament.avgSpeechCount,
          },
          initiative: {
            own: metricsPerson?.initiative_count ?? 0,
            partyAvg: baselinesParty.avgInitiativeCount,
            parliamentAvg: baselinesParliament.avgInitiativeCount,
          },
          writtenQuestion: {
            own: metricsPerson?.written_question_count ?? 0,
            partyAvg: baselinesParty.avgWrittenQuestionCount,
            parliamentAvg: baselinesParliament.avgWrittenQuestionCount,
          },
          participation: {
            own: participationPct,
            partyAvg: (baselinesParty.avgVoteParticipationRate * 100).toFixed(
              1,
            ),
            parliamentAvg: (
              baselinesParliament.avgVoteParticipationRate * 100
            ).toFixed(1),
          },
        }
      : null;

  return {
    person: {
      id: details.person_id,
      firstName,
      lastName,
      initials: initials || "\u2014",
      partyCode,
      partyName: party.name,
      partyColor: party.color,
      isInGovernment,
      currentDistrict: districtName,
      birthYear: details.birth_year,
      age,
      profession,
      memberSince,
    },
    stats: {
      participationPct,
      nTotal: voteTally.nTotal,
      nCast: voteTally.nCast,
      nYes: voteTally.nYes,
      nNo: voteTally.nNo,
      nEmpty: voteTally.nEmpty,
      nAbsent: voteTally.nAbsent,
      nInitiatives,
      nWrittenQuestions,
    },
    dissents: dissents.map((d) => ({
      votingId: d.voting_id,
      startTime: d.start_time,
      title: d.title ?? "",
      sectionTitle: d.section_title ?? "",
      mpVote: d.mp_vote ?? "",
      majorityVote: d.majority_vote ?? "",
      partyName: d.party_name ?? "",
    })),
    initiatives: initiatives.map((i) => ({
      documentId: i.id,
      parliamentIdentifier: i.parliament_identifier ?? "",
      initiativeTypeCode: i.initiative_type_code ?? "",
      initiativeTypeLabel:
        initiativeTypeLabel(i.initiative_type_code) ??
        i18next.t("documents:initiative_type_labels.A"),
      title: i.title ?? "",
      submissionDate: i.submission_date ?? null,
      relationRole: i.relation_role ?? "",
    })),
    questions: questions.map((q) => ({
      documentId: q.id,
      questionKind: q.question_kind ?? "",
      questionKindLabel: questionKindLabel(q.question_kind),
      parliamentIdentifier: q.parliament_identifier ?? "",
      title: q.title ?? "",
      submissionDate: q.submission_date ?? null,
    })),
    committees: committees.map((c) => ({
      committeeCode: c.committee_code ?? "",
      committeeName: c.committee_name ?? "",
      role: c.role ?? "",
      startDate: c.start_date ?? "",
      endDate: c.end_date ?? null,
    })),
    focusAreas: focusAreas.areas.map((a) => ({
      label: a.label,
      weight: a.weight,
    })),
    baselines,
    hasAiSummary: capabilities.hasAiSummary,
    provenance: {
      stats: {
        participation: provenanceService.citeProps({
          sources: [{ table: "SaliDBAanestysEdustaja" }],
          value: `${participationPct} % (${voteTally.nCast} / ${voteTally.nTotal})`,
          caption: i18next.t("persons:profile.participation_caption"),
          markText: "*",
        }),
        votedNo: provenanceService.citeProps({
          sources: [
            {
              table: "SaliDBAanestysEdustaja",
              label: i18next.t("persons:profile.voted_no_record", {
                nYes: voteTally.nYes,
                nNo: voteTally.nNo,
                nEmpty: voteTally.nEmpty,
              }),
            },
          ],
          value: i18next.t("persons:profile.voted_no_caption"),
          caption: i18next.t("persons:profile.voted_no_caption"),
          markText: "*",
        }),
        initiatives: provenanceService.citeProps({
          sources: [{ table: "VaskiData" }],
          value: i18next.t("persons:profile.initiatives_n", {
            count: nInitiatives,
          }),
          caption: i18next.t("persons:profile.initiatives_caption"),
          markText: "*",
        }),
        writtenQuestions: provenanceService.citeProps({
          sources: [{ table: "VaskiData" }],
          value: i18next.t("persons:profile.written_questions_n", {
            count: nWrittenQuestions,
          }),
          caption: i18next.t("persons:profile.written_questions_caption"),
          markText: "*",
        }),
      },
      notes: {
        vote: provenanceService.sourceNoteForQuery("person-votes.sql"),
        vaski: provenanceService.sourceNoteOpts(["VaskiData"]),
        committees: provenanceService.sourceNoteForQuery(
          "person-committees.sql",
        ),
        focusAreas: provenanceService.sourceNoteForQuery(
          "person-focus-areas.sql",
        ),
        basics: provenanceService.sourceNoteForQuery("person-detail.sql"),
      },
    },
  };
}

export function buildPersonSpeeches(input: {
  personId: number;
  firstName: string;
  lastName: string;
  speeches: Array<{
    section_title: string | null;
    start_time: string | null;
    speech_type: string | null;
  }>;
  provenanceService: ProvenanceService;
}): PersonSpeechesData {
  return {
    personId: input.personId,
    personName: `${input.firstName} ${input.lastName}`,
    speeches: input.speeches.map((sp) => ({
      sectionTitle: sp.section_title ?? null,
      startTime: sp.start_time ?? null,
      speechType: sp.speech_type ?? null,
    })),
    sourceNote: input.provenanceService.sourceNoteForQuery(
      "person-speeches.sql",
    ),
  };
}
