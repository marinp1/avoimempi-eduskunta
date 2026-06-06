import {
  applyFilters,
  type RosterParams,
} from "../../../webapp/templates/helpers";
import Edustajat from "../../../webapp/templates/pages/edustajat";
import RosterContent from "../../../webapp/templates/pages/roster-content";
import { fragmentResponse } from "../../../webapp/eta";
import { page, getTimelineData } from "./helpers";
import type { WebappDeps } from "./deps";

export function createEdustajatRoute(deps: WebappDeps) {
  return {
    "/edustajat": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const params: RosterParams = {
          q: url.searchParams.get("q") ?? undefined,
          party: url.searchParams.get("party") ?? undefined,
          bloc: url.searchParams.get("bloc") ?? undefined,
          sort: url.searchParams.get("sort") ?? undefined,
          dir: url.searchParams.get("dir") ?? undefined,
        };
        const allRows = deps.personRepository.fetchRoster();
        const filtered = applyFilters(allRows, params);
        const isHtmx = req.headers.get("HX-Request") === "true";

        if (isHtmx) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (hxTarget.includes("roster-content")) {
            return fragmentResponse(
              RosterContent({ allRows, filtered, params, oob: true }),
            );
          }
          return fragmentResponse(
            Edustajat({ title: "Kansanedustajat", allRows, filtered, params }),
          );
        }

        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Edustajat({ title: "Kansanedustajat", allRows, filtered, params }),
          "/edustajat",
          "Kansanedustajat",
          tlData,
        );
      },
    },
  } as const;
}
