import {
  applyFilters,
  type RosterParams,
} from "../../../webapp/templates/helpers";
import Koostumusmuutos from "../../../webapp/templates/components/koostumusmuutos";
import Edustajat from "../../../webapp/templates/pages/edustajat";
import RosterContent from "../../../webapp/templates/pages/roster-content";
import { fragmentResponse } from "../../../webapp/eta";
import { page, getTimelineData, timelineOobHtml } from "./helpers";
import type { WebappDeps } from "./deps";

export function createEdustajatRoute(deps: WebappDeps) {
  return {
    "/edustajat": {
      GET: async (req: Request) => {
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
        const isHtmx = req.headers.get("HX-Request") === "true";

        if (isHtmx) {
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
                title: "Kansanedustajat",
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

        const compRows = deps.sessionRepository.fetchCompositionChangeDetail({
          date: tlData.cursor,
        });
        const compDetailHtml = Koostumusmuutos({
          date: tlData.cursor,
          rows: compRows,
        });

        return page(
          req,
          Edustajat({
            title: "Kansanedustajat",
            allRows,
            filtered,
            params,
            compDetailHtml,
          }),
          "/edustajat",
          "Kansanedustajat",
          tlData,
        );
      },
    },

    "/koostumusmuutos": {
      GET: async (req: Request) => {
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
    },
  } as const;
}
