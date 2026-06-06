import Asiakohta from "../../../webapp/templates/pages/asiakohta";
import type { AsiakohtaData } from "../../../webapp/templates/pages/asiakohta-view-model";
import { page, getRouteParam, getWebappContext } from "./helpers";
import {
  partyColor,
  partyShortName,
  fetchedAt,
} from "../../../webapp/templates/helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";

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

export function createAsiakohtaRoute(deps: WebappDeps) {
  return {
    "/asiakohta/:key": {
      GET: async (req: Request) => {
        const key = getRouteParam(req, "key") ?? "";
        const { tlData } = getWebappContext(req, deps);

        const section = deps.sessionRepository.fetchSectionByKey({
          sectionKey: key,
        });
        if (!section) {
          return page(
            req,
            `<section class="page-hero"><h1>${i18next.t("istunnot:detail.asiakohta_not_found")}</h1></section>`,
            `/asiakohta/${key}`,
            i18next.t("istunnot:detail.asiakohta_not_found"),
            tlData,
          );
        }

        const [speechesResult, sectionVotings] = await Promise.all([
          deps.sessionRepository.fetchSectionSpeeches({
            sectionKey: key,
            limit: 500,
            offset: 0,
          }),
          deps.sessionRepository.fetchSectionVotings({
            sectionKey: key,
          }),
        ]);

        const sessionData = deps.sessionRepository.fetchSessionByKey({
          key: section.session_key,
        });
        const sessionSections = sessionData.sections;

        const currentIndex = sessionSections.findIndex(
          (s) => s.key === section.key,
        );
        const prevSection =
          currentIndex > 0
            ? {
                key: sessionSections[currentIndex - 1]!.key,
                itemNumber:
                  sessionSections[
                    currentIndex - 1
                  ]!.minutes_item_number?.toString() ?? null,
                title:
                  sessionSections[currentIndex - 1]!.minutes_item_title ??
                  sessionSections[currentIndex - 1]!.title ??
                  "",
              }
            : null;
        const nextSection =
          currentIndex >= 0 && currentIndex < sessionSections.length - 1
            ? {
                key: sessionSections[currentIndex + 1]!.key,
                itemNumber:
                  sessionSections[
                    currentIndex + 1
                  ]!.minutes_item_number?.toString() ?? null,
                title:
                  sessionSections[currentIndex + 1]!.minutes_item_title ??
                  sessionSections[currentIndex + 1]!.title ??
                  "",
              }
            : null;

        const data: AsiakohtaData = {
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
            const nYes = v.n_yes ?? 0;
            const nNo = v.n_no ?? 0;
            const nEmpty = v.n_abstain ?? 0;
            const nAbsent = v.n_absent ?? 0;
            const total = nYes + nNo;
            return {
              id: v.id,
              votingNumber: v.number,
              title: v.title ?? "",
              nYes,
              nNo,
              nEmpty,
              nAbsent,
              yesPct: total > 0 ? (nYes / total) * 100 : 0,
              noPct: total > 0 ? (nNo / total) * 100 : 0,
              outcome: nYes > nNo ? "ok" : "no",
              outcomeLabel:
                nYes > nNo
                  ? i18next.t("aanestykset:outcome_approved").toLowerCase()
                  : i18next.t("aanestykset:outcome_rejected").toLowerCase(),
            };
          }),
          speeches: (speechesResult?.speeches ?? []).map((s) => {
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
                    ? i18next.t(
                        "components:keskustelu.speech_type_notification",
                      )
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
          fetchedAt: fetchedAt(),
        };

        return page(
          req,
          Asiakohta({
            title: i18next.t("common:asiakohta_title_format", {
              number: data.section.itemNumber ?? "",
            }),
            data,
          }),
          `/asiakohta/${key}`,
          data.section.title,
          tlData,
        );
      },
    },
  } as const;
}
