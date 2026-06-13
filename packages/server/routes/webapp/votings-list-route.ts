import Aanestykset, {
  VoteGroupsFragment,
} from "#server/features/voting/pages/list.page";
import { buildAanestyksetData } from "#server/features/voting/pages/list.view-model";
import { fetchedAt } from "#server/helpers/template-helpers";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute, isHtmx } from "#server/helpers";

const VALID_TYPES = new Set(["lait", "selonteot", "luottamus", "tiukat"]);

/** Returns an endDate (exclusive) that is one day before the given ISO date string. */
function dayBefore(isoDate: string): string {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function createVotingsListRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/aanestykset",
    GET: withWebappPage(deps, async (ctx) => {
      const url = new URL(ctx.req.url);
      const searchQuery = url.searchParams.get("q")?.trim().toLowerCase();
      const cursor = url.searchParams.get("cursor") ?? undefined;
      const typeParam = url.searchParams.get("type") ?? undefined;
      const activeFilter = typeParam && VALID_TYPES.has(typeParam) ? typeParam : null;

      // When a cursor is present (load-more), fetch sessions strictly before it.
      const endDate = cursor ? dayBefore(cursor) : ctx.bounds.endDate;

      const browseResult = ctx.deps.votingRepository.browseVotings({
        startDate: ctx.bounds.startDate,
        endDate,
        sort: "newest",
        limit: 500,
      });

      const data = buildAanestyksetData({
        votings: browseResult,
        searchQuery,
        activeFilter,
        fetchedAt: fetchedAt(),
      });

      // Click-to-load: return only the new groups + updated button, no page wrapper.
      if (isHtmx(ctx.req) && url.searchParams.has("load_more")) {
        return new Response(VoteGroupsFragment({ data }), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      let pageUrl = "/aanestykset";
      if (searchQuery) pageUrl += `?q=${encodeURIComponent(searchQuery)}`;
      else if (activeFilter) pageUrl += `?type=${activeFilter}`;

      return {
        fragment: Aanestykset({
          title: i18next.t("votings:title"),
          data,
        }),
        activePath: pageUrl,
        title: i18next.t("votings:title"),
      };
    }),
  });
}
