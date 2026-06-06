import Aanestys from "#server/features/voting/pages/detail.page";
import type { SingleVoteData } from "#server/features/voting/pages/detail.view-model";
import { buildSingleVoteData } from "#server/features/voting/pages/detail.view-model";
import { withWebappPage } from "./helpers";
import { fetchedAt } from "#server/helpers/template-helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";
export function createAanestysRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/aanestys/:id",
    GET: withWebappPage(deps, async (ctx, params) => {
      const id = params.id;

      const voting = ctx.deps.votingRepository.fetchVotingById({
        votingId: id,
      });
      if (!voting) {
        return {
          fragment: `<section class="page-hero"><h1>${i18next.t("common:vote_not_found")}</h1><p>${i18next.t("common:vote_not_found_id", { id })}</p></section>`,
          activePath: `/aanestys/${id}`,
          title: i18next.t("common:vote_not_found"),
        };
      }

      const details = ctx.deps.votingRepository.fetchVotingInlineDetails({
        votingId: id,
      });

      const data: SingleVoteData = buildSingleVoteData({
        voting,
        details,
        fetchedAt: fetchedAt(),
      });

      return {
        fragment: Aanestys({ title: voting.title ?? undefined, data }),
        activePath: `/aanestys/${id}`,
        title: voting.title ?? i18next.t("aanestykset:title"),
      };
    }),
  });
}
