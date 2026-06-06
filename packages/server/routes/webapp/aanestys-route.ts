import Aanestys from "../../../webapp/templates/pages/aanestys";
import type { SingleVoteData } from "../../../webapp/templates/pages/aanestys-view-model";
import { page, getWebappContext, getRouteParam } from "./helpers";
import {
  partyColor,
  partyShortName,
  fetchedAt,
} from "../../../webapp/templates/helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";

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
] as const;

const DAY_NAMES = [
  "sunnuntaina",
  "maanantaina",
  "tiistaina",
  "keskiviikkona",
  "torstaina",
  "perjantaina",
  "lauantaina",
] as const;

function finnishDateLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const dayName = DAY_NAMES[d.getDay()] ?? "";
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()] ?? "";
  const year = d.getFullYear();
  return `${dayName} ${day}.${month.slice(0, 4)}${month.slice(4)} ${year}`;
}

export function createAanestysRoute(deps: WebappDeps) {
  return {
    "/aanestys/:id": {
      GET: async (req: Request) => {
        const id = getRouteParam(req, "id") ?? "";
        const { tlData } = getWebappContext(req, deps);

        const voting = deps.votingRepository.fetchVotingById({ id });
        if (!voting) {
          return page(
            req,
            `<section class="page-hero"><h1>${i18next.t("common:vote_not_found")}</h1><p>${i18next.t("common:vote_not_found_id", { id })}</p></section>`,
            `/aanestys/${id}`,
            i18next.t("common:vote_not_found"),
            tlData,
          );
        }

        const details = deps.votingRepository.fetchVotingInlineDetails({ id });

        const nYes = voting.n_yes ?? 0;
        const nNo = voting.n_no ?? 0;
        const nEmpty = voting.n_abstain ?? 0;
        const nAbsent = voting.n_absent ?? 0;
        const nTotal = voting.n_total ?? 0;

        const partyBreakdown =
          details?.partyBreakdown?.map((pb) => ({
            partyCode: pb.party_code,
            partyName: partyShortName(
              pb.party_code,
              pb.party_name ?? pb.party_code,
            ),
            partyColor: partyColor(pb.party_code),
            nYes: pb.n_yes,
            nNo: pb.n_no,
            nEmpty: pb.n_abstain,
            nAbsent: pb.n_absent,
            nTotal: pb.n_total,
            yesPct: pb.n_total > 0 ? (pb.n_yes / pb.n_total) * 100 : 0,
            noPct: pb.n_total > 0 ? (pb.n_no / pb.n_total) * 100 : 0,
          })) ?? [];

        const mpVotes =
          details?.memberVotes?.map(
            (mv) =>
              ({
                personId: mv.person_id,
                firstName: mv.first_name,
                lastName: mv.last_name,
                partyCode: mv.party_code,
                partyColor: partyColor(mv.party_code),
                vote:
                  mv.vote === "JAA"
                    ? "jaa"
                    : mv.vote === "EI"
                      ? "ei"
                      : mv.vote === "TYHJAA"
                        ? "tyhjaa"
                        : "poissa",
                bloc: mv.is_government === 1 ? "government" : "opposition",
                personSort: `${mv.last_name} ${mv.first_name}`.toLowerCase(),
              }) as const,
          ) ?? [];

        const data: SingleVoteData = {
          vote: {
            id: voting.id,
            votingNumber: voting.number,
            title: voting.title ?? "",
            titleExtra: voting.title_extra ?? null,
            date: voting.start_date ?? "",
            dateLabel: voting.start_date
              ? finnishDateLabel(voting.start_date)
              : "",
            time: voting.start_time ?? "",
            sessionKey: voting.session_key ?? "",
            sessionDateLabel: voting.start_date
              ? finnishDateLabel(voting.start_date)
              : "",
            asiakohtaNum: voting.section_order ?? null,
            sectionKey: voting.section_key ?? null,
            sectionTitle: voting.section_title ?? null,
            nYes,
            nNo,
            nEmpty,
            nAbsent,
            nTotal,
            yesPct: nTotal > 0 ? (nYes / nTotal) * 100 : 0,
            noPct: nTotal > 0 ? (nNo / nTotal) * 100 : 0,
            emptyPct: nTotal > 0 ? (nEmpty / nTotal) * 100 : 0,
            absentPct: nTotal > 0 ? (nAbsent / nTotal) * 100 : 0,
            outcome: nYes > nNo ? "ok" : "no",
            outcomeLabel:
              nYes > nNo
                ? i18next.t("aanestykset:outcome_approved")
                : i18next.t("aanestykset:outcome_rejected"),
            yesProposition: null,
            noProposition: null,
          },
          partyBreakdown,
          mpVotes,
          govOppBreakdown: details?.governmentOpposition
            ? {
                governmentYes: details.governmentOpposition.government_yes,
                governmentNo: details.governmentOpposition.government_no,
                governmentEmpty:
                  details.governmentOpposition.government_abstain,
                governmentAbsent:
                  details.governmentOpposition.government_absent,
                governmentTotal: details.governmentOpposition.government_total,
                oppositionYes: details.governmentOpposition.opposition_yes,
                oppositionNo: details.governmentOpposition.opposition_no,
                oppositionEmpty:
                  details.governmentOpposition.opposition_abstain,
                oppositionAbsent:
                  details.governmentOpposition.opposition_absent,
                oppositionTotal: details.governmentOpposition.opposition_total,
              }
            : {
                governmentYes: 0,
                governmentNo: 0,
                governmentEmpty: 0,
                governmentAbsent: 0,
                governmentTotal: 0,
                oppositionYes: 0,
                oppositionNo: 0,
                oppositionEmpty: 0,
                oppositionAbsent: 0,
                oppositionTotal: 0,
              },
          relatedVotes:
            details?.relatedVotings?.map((rv) => ({
              id: rv.id,
              votingNumber: rv.number ?? 0,
              title: rv.context_title ?? "",
              date: rv.start_time ?? "",
              nYes: rv.n_yes,
              nNo: rv.n_no,
              outcomeLabel:
                rv.n_yes > rv.n_no
                  ? i18next.t("aanestykset:outcome_approved")
                  : i18next.t("aanestykset:outcome_rejected"),
            })) ?? [],
          fetchedAt: fetchedAt(),
        };

        return page(
          req,
          Aanestys({ title: voting.title ?? undefined, data }),
          `/aanestys/${id}`,
          voting.title ?? i18next.t("aanestykset:title"),
          tlData,
        );
      },
    },
  } as const;
}
