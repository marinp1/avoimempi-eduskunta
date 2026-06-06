import Istunnot, {
  SessionList,
} from "../../../webapp/templates/pages/istunnot";
import { buildSessionsViewModel } from "../../../webapp/templates/pages/istunnot-view-models";
import { fragmentResponse } from "../../../webapp/eta";
import { page } from "./helpers";
import type { WebappDeps } from "./deps";

export function createIstunnotRoute(deps: WebappDeps) {
  return {
    "/istunnot": {
      GET: (req: Request) => {
        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") ?? undefined;
        const q = url.searchParams.get("q") ?? undefined;

        const raw = deps.sessionRepository.fetchSessionsIndex(50);
        const data = buildSessionsViewModel(raw, { kind, q });

        const isHtmx = req.headers.get("HX-Request") === "true";
        const isBoosted = req.headers.get("HX-Boosted") === "true";

        if (isHtmx && !isBoosted) {
          return fragmentResponse(
            SessionList({
              weeks: data.weeks,
              totalSessions: data.totalSessions,
            }),
          );
        }

        return page(
          req,
          Istunnot({ title: "Istunnot", data }),
          "/istunnot",
          "Istunnot",
        );
      },
    },
  } as const;
}
