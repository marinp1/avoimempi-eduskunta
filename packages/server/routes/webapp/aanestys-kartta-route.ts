import KarttaFragment from "#server/features/voting/fragments/kartta.fragment";
import type { WebappDeps } from "./deps";
import { defineRoute } from "#server/helpers";

export function createAanestysKarttaRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/aanestys/:id/kartta",
    GET: async (_req, params) => {
      const { id } = params;
      if (!id || !/^\d+$/.test(id)) {
        return new Response("", { status: 404 });
      }
      const kartta = deps.votingService.getVotingKartta(id);
      if (!kartta) return new Response("", { status: 404 });
      const html = KarttaFragment({ mpVotes: kartta.mpVotes });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });
}
