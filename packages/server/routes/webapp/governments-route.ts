import Hallitukset from "#server/features/analytics/pages/governments.page";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createGovernmentsRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/hallitukset",
    GET: withWebappPage(deps, async () => ({
      fragment: Hallitukset({ title: i18next.t("nav:governments") }),
      activePath: "/hallitukset",
      title: i18next.t("nav:governments"),
    })),
  });
}
