import Aanestykset from "#webapp/templates/pages/aanestykset";
import { buildAanestyksetData } from "#webapp/templates/pages/aanestykset-view-model";
import { fetchedAt } from "#webapp/templates/helpers";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createAanestyksetListRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/aanestykset",
    GET: withWebappPage(deps, async (ctx) => {
      const url = new URL(ctx.req.url);
      const searchQuery = url.searchParams.get("q")?.trim().toLowerCase();

      const browseResult = ctx.deps.votingRepository.browseVotings({
        startDate: ctx.bounds.startDate,
        endDate: ctx.bounds.endDate,
        sort: "newest",
        limit: 500,
      });

      const data = buildAanestyksetData({
        votings: browseResult,
        searchQuery,
        fetchedAt: fetchedAt(),
      });

      const pageUrl = searchQuery
        ? `/aanestykset?q=${encodeURIComponent(searchQuery)}`
        : "/aanestykset";

      return {
        fragment: Aanestykset({
          title: i18next.t("aanestykset:title"),
          data,
        }),
        activePath: pageUrl,
        title: i18next.t("aanestykset:title"),
      };
    }),
  });
}
