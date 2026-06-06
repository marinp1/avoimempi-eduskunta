import Puolueet from "#webapp/templates/pages/puolueet";
import { buildPuolueetData } from "#webapp/templates/pages/puolueet-view-model";
import { withWebappPage } from "./helpers";
import { fetchedAt } from "#webapp/templates/helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createPuolueetListRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/puolueet",
    GET: withWebappPage(deps, async (ctx) => {
      const summaryRows = ctx.deps.analyticsRepository.fetchPartySummary({
        asOfDate: ctx.tlData.cursor,
        startDate: ctx.bounds.startDate,
        endDate: ctx.bounds.endDate,
        governmentStartDate: ctx.bounds.governmentStartDate,
      });

      const partyDiscipline = ctx.deps.analyticsRepository.fetchPartyDiscipline(
        {
          startDate: ctx.bounds.startDate,
          endDate: ctx.bounds.endDate,
        },
      );

      const data = buildPuolueetData({
        summaryRows,
        partyDiscipline,
        fetchedAt: fetchedAt(),
      });

      return {
        fragment: Puolueet({ title: i18next.t("puolueet:title"), data }),
        activePath: "/puolueet",
        title: i18next.t("puolueet:title"),
      };
    }),
  });
}
