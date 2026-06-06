import {
  applyFilters,
  type RosterParams,
} from "#server/helpers/template-helpers";
import Koostumusmuutos from "#server/components/koostumusmuutos";
import Edustajat from "#server/features/person/pages/roster.page";
import RosterContent from "#server/features/person/fragments/roster-content.fragment";
import { fragmentResponse } from "#server/eta";
import { withWebappPage, readPeriod } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

function parseRosterParams(url: URL): RosterParams {
  return {
    q: url.searchParams.get("q") ?? undefined,
    party: url.searchParams.get("party") ?? undefined,
    bloc: url.searchParams.get("bloc") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    dir: url.searchParams.get("dir") ?? undefined,
  };
}

export function createEdustajatRoute(deps: WebappDeps) {
  return {
    ...defineRoute({
      path: "/edustajat",
      GET: withWebappPage(
        deps,
        async (ctx) => {
          const url = new URL(ctx.req.url);
          const params = parseRosterParams(url);
          const allRows = ctx.deps.personRepository.fetchRoster();
          const filtered = applyFilters(allRows, params);

          const compRows =
            ctx.deps.sessionRepository.fetchCompositionChangeDetail({
              date: ctx.tlData.cursor,
            });
          const compDetailHtml = Koostumusmuutos({
            date: ctx.tlData.cursor,
            rows: compRows,
          });

          return {
            fragment: Edustajat({
              title: i18next.t("edustajat:title"),
              allRows,
              filtered,
              params,
              compDetailHtml,
            }),
            activePath: "/edustajat",
            title: i18next.t("edustajat:title"),
            partial: {
              target: "roster-content",
              fragment: RosterContent({ allRows, filtered, params, oob: true }),
            },
          };
        },
        { tickSource: "composition" },
      ),
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

        const period = readPeriod(url, deps.metadataRepository);
        const termStr = period === "all" ? "all" : period.join(",");
        const qs = new URLSearchParams();
        qs.set("period", termStr);
        qs.set("date", dateParam);
        const replaceUrl = `/edustajat?${qs.toString()}`;

        const headers: Record<string, string> = {};
        if (replaceUrl) headers["HX-Replace-Url"] = replaceUrl;

        return new Response(
          Koostumusmuutos({
            date: dateParam,
            rows,
          }),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              Vary: "HX-Request",
              ...headers,
            },
          },
        );
      },
    }),
  };
}
