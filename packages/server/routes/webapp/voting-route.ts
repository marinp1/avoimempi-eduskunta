import Aanestys from "#server/features/voting/pages/detail.page";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";
import { esc } from "#server/helpers/template-helpers";
export function createVotingRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/aanestys/:id",
    GET: withWebappPage(deps, async (ctx, params) => {
      const id = params.id;

      const data = ctx.deps.votingService.getVotingDetail(id);
      if (!data) {
        return {
          fragment: `<section class="page-hero"><h1>${i18next.t("common:vote_not_found")}</h1><p>${i18next.t("common:vote_not_found_id", { id: esc(id) })}</p></section>`,
          activePath: `/aanestys/${id}`,
          title: i18next.t("common:vote_not_found"),
        };
      }

      return {
        fragment: Aanestys({ title: data.vote.title || undefined, data }),
        activePath: `/aanestys/${id}`,
        title: data.vote.title || i18next.t("votings:title"),
      };
    }),
  });
}
