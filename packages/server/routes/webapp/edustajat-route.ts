import {
  applyFilters,
  type RosterParams,
} from "../../../webapp/templates/helpers";
import Koostumusmuutos from "../../../webapp/templates/components/koostumusmuutos";
import Edustajat from "../../../webapp/templates/pages/edustajat";
import RosterContent from "../../../webapp/templates/pages/roster-content";
import { fragmentResponse } from "../../../webapp/eta";
import {
  page,
  getTimelineData,
  timelineOobHtml,
  isHtmx,
  getPeriodSelectorData,
} from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createEdustajatRoute(deps: WebappDeps) {
  return {
    ...defineRoute({
      path: "/edustajat",
      GET: async (req) => {
        const url = new URL(req.url);
        const params: RosterParams = {
          q: url.searchParams.get("q") ?? undefined,
          party: url.searchParams.get("party") ?? undefined,
          bloc: url.searchParams.get("bloc") ?? undefined,
          sort: url.searchParams.get("sort") ?? undefined,
          dir: url.searchParams.get("dir") ?? undefined,
        };
        const allRows = deps.personRepository.fetchRoster();
        const filtered = applyFilters(allRows, params);

        if (isHtmx(req)) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (hxTarget.includes("roster-content")) {
            return fragmentResponse(
              RosterContent({ allRows, filtered, params, oob: true }),
            );
          }

          const tlData = getTimelineData(
            req,
            deps.sessionRepository,
            deps.metadataRepository,
            "composition",
          );
          const tlHtml = timelineOobHtml(tlData);
          return new Response(
            tlHtml +
              Edustajat({
                title: i18next.t("edustajat:title"),
                allRows,
                filtered,
                params,
              }),
            {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                Vary: "HX-Request",
              },
            },
          );
        }

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
          "composition",
        );

        const periodData = getPeriodSelectorData(req, deps.metadataRepository);

        const compRows = deps.sessionRepository.fetchCompositionChangeDetail({
          date: tlData.cursor,
        });
        const compDetailHtml = Koostumusmuutos({
          date: tlData.cursor,
          rows: compRows,
        });

        return page({
          req,
          fragment: Edustajat({
            title: i18next.t("edustajat:title"),
            allRows,
            filtered,
            params,
            compDetailHtml,
          }),
          activePath: "/edustajat",
          title: i18next.t("edustajat:title"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/koostumusmuutos",
      GET: async (req) => {
        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");

        if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
          return fragmentResponse(Koostumusmuutos({ date: "", rows: [] }));
        }

        const rows = deps.sessionRepository.fetchCompositionChangeDetail({
          date: dateParam,
        });

        return fragmentResponse(
          Koostumusmuutos({
            date: dateParam,
            rows,
          }),
        );
      },
    }),
  };
}
