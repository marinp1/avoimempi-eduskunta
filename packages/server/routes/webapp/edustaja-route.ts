import Edustaja, {
  type PersonProfileData,
} from "../../../webapp/templates/pages/edustaja";
import { partyColor, partyShortName } from "../../../webapp/templates/helpers";
import {
  page,
  personNotFoundResponse,
  getWebappContext,
  getRouteParam,
} from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";

const INITIATIVE_LABELS: Record<string, string> = {
  LA: i18next.t("asiakirjat:initiative_type_labels.LA"),
  TPA: i18next.t("asiakirjat:initiative_type_labels.TPA"),
  RA: i18next.t("asiakirjat:initiative_type_labels.RA"),
  A: i18next.t("asiakirjat:initiative_type_labels.A"),
};

const QUESTION_LABELS: Record<string, string> = {
  written_question: i18next.t("asiakirjat:kind_labels.kk"),
  interpellation: i18next.t("asiakirjat:kind_labels.valikysymys"),
  oral_question: i18next.t("asiakirjat:kind_labels.suullinen"),
};

export function createEdustajaRoute(deps: WebappDeps) {
  return {
    "/edustaja/:id": {
      GET: async (req: Request) => {
        const id = getRouteParam(req, "id") ?? "";
        if (!id || !/^\d+$/.test(id)) {
          return personNotFoundResponse(req, `/edustaja/${id}`);
        }

        const details = deps.personRepository.fetchRepresentativeDetails({
          id,
        });
        if (!details) {
          return personNotFoundResponse(req, `/edustaja/${id}`);
        }

        const [
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
          speeches,
        ] = await Promise.all([
          deps.personRepository.fetchPersonGroupMemberships({ id }),
          deps.personRepository.fetchRepresentativeDistricts({ id }),
          deps.personRepository.fetchPersonTerms({ id }),
          deps.personRepository.fetchPersonVotes({ id }),
          deps.personRepository.fetchPersonMetricsWithBaselines({
            personId: id,
          }),
          deps.personRepository.fetchPersonDissents({
            personId: id,
            limit: 20,
          }),
          deps.personRepository.fetchPersonInitiatives({
            personId: id,
            limit: 10,
          }),
          deps.personRepository.fetchPersonQuestions({
            personId: id,
            limit: 10,
          }),
          deps.personRepository.fetchPersonCommittees({ personId: id }),
          deps.personRepository.fetchPersonFocusAreas({
            personId: id,
            topN: 12,
          }),
          deps.personRepository.fetchPersonSpeeches({
            personId: id,
            limit: 10,
          }),
        ]);

        const currentGroup = groupMemberships.find(
          (g) =>
            !g.end_date || g.end_date >= new Date().toISOString().slice(0, 10),
        );
        const partyCode =
          currentGroup?.group_abbreviation ?? details.party ?? "unknown";
        const isInGovernment = !!currentGroup && !currentGroup.end_date;

        const currentDistrict = districts.find((d) => !d.end_date);
        const districtName =
          currentDistrict?.district_name ?? districts[0]?.district_name ?? "";

        const firstTerm = terms[0];
        const memberSince = firstTerm?.start_year
          ? i18next.t("edustajat:profile.member_since_prefix", {
              year: firstTerm.start_year,
            })
          : firstTerm?.start_date
            ? i18next.t("edustajat:profile.member_since_prefix", {
                year: new Date(firstTerm.start_date).getFullYear(),
              })
            : "";

        const nTotal = votes.length;
        const nYes = votes.filter((v) => v.vote === "Jaa").length;
        const nNo = votes.filter((v) => v.vote === "Ei").length;
        const nEmpty = votes.filter((v) => v.vote === "Tyhjää").length;
        const nAbsent = votes.filter((v) => v.vote === "Poissa").length;
        const nCast = nYes + nNo + nEmpty;
        const participationPct =
          nTotal > 0 ? ((nCast / nTotal) * 100).toFixed(1) : "0";

        const metricsPerson = metrics.person;
        const nInitiatives = metricsPerson?.initiative_count ?? 0;
        const nWrittenQuestions = metricsPerson?.written_question_count ?? 0;

        const firstName = details.first_name ?? "";
        const lastName = details.last_name ?? "";
        const initials =
          `${firstName.charAt(0) ?? ""}${lastName.charAt(0) ?? ""}`.toUpperCase();
        const age = details.birth_year
          ? String(new Date().getFullYear() - details.birth_year)
          : "—";
        const profession = details.profession ?? "";
        const partyName = partyShortName(partyCode, partyCode);
        const color = partyColor(partyCode);

        const { tlData } = getWebappContext(req, deps);

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
                  partyAvg: (
                    baselinesParty.avgVoteParticipationRate * 100
                  ).toFixed(1),
                  parliamentAvg: (
                    baselinesParliament.avgVoteParticipationRate * 100
                  ).toFixed(1),
                },
              }
            : null;

        const capabilities = deps.personRepository.fetchPersonCapabilities({
          personId: id,
        });

        const data: PersonProfileData = {
          person: {
            id: details.person_id,
            firstName,
            lastName,
            initials: initials || "—",
            partyCode,
            partyName,
            partyColor: color,
            isInGovernment,
            currentDistrict: districtName,
            birthYear: details.birth_year,
            age,
            profession,
            memberSince,
          },
          stats: {
            participationPct,
            nTotal,
            nCast,
            nYes,
            nNo,
            nEmpty,
            nAbsent,
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
              INITIATIVE_LABELS[i.initiative_type_code ?? ""] ??
              i18next.t("asiakirjat:initiative_type_labels.A"),
            title: i.title ?? "",
            submissionDate: i.submission_date ?? null,
            relationRole: i.relation_role ?? "",
          })),
          questions: questions.map((q) => ({
            documentId: q.id,
            questionKind: q.question_kind ?? "",
            questionKindLabel:
              QUESTION_LABELS[q.question_kind ?? ""] ?? q.question_kind ?? "",
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
          speeches: speeches.speeches.slice(0, 10).map((sp) => ({
            sectionTitle: sp.section_title ?? null,
            startTime: sp.start_time ?? null,
            speechType: sp.speech_type ?? null,
          })),
          baselines,
          hasAiSummary: capabilities.hasAiSummary,
          fetchedAt: new Date().toLocaleString("fi-FI", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        return page(
          req,
          Edustaja({ data }),
          "/edustajat",
          `${firstName} ${lastName}`,
          tlData,
        );
      },
    },
  } as const;
}
