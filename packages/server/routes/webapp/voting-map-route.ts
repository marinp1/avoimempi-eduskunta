import VotingMapFragment from "#server/features/voting/fragments/map.fragment";
import type { WebappDeps } from "./deps";
import { defineRoute } from "#server/helpers";

export function createVotingMapRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/aanestys/:id/kartta",
    GET: async (_req, params) => {
      const { id } = params;
      if (!id || !/^\d+$/.test(id)) {
        return new Response("", { status: 404 });
      }
      const kartta = deps.votingService.getVotingMap(id);
      if (!kartta) return new Response("", { status: 404 });
      const html = VotingMapFragment({ mpVotes: kartta.mpVotes });
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });
}
