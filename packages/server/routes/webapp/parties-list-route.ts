import Puolueet from "#server/features/metadata/pages/parties.page";
import { buildPuolueetData } from "#server/features/metadata/pages/list.view-model";
import { withWebappPage } from "./helpers";
import { fetchedAt } from "#server/helpers/template-helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createPartiesListRoute(deps: WebappDeps) {
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
        fragment: Puolueet({ title: i18next.t("parties:title"), data }),
        activePath: "/puolueet",
        title: i18next.t("parties:title"),
      };
    }),
  });
}
