import { applyFilters, type RosterParams } from "#webapp/templates/helpers";
import Koostumusmuutos from "#webapp/templates/components/koostumusmuutos";
import Edustajat from "#webapp/templates/pages/edustajat";
import RosterContent from "#webapp/templates/pages/roster-content";
import { fragmentResponse } from "#webapp/eta";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

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
