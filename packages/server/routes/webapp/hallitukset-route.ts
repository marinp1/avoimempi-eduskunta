import Hallitukset from "#webapp/templates/pages/hallitukset";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createHallituksetRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/hallitukset",
    GET: withWebappPage(deps, async () => ({
      fragment: Hallitukset({ title: i18next.t("nav:governments") }),
      activePath: "/hallitukset",
      title: i18next.t("nav:governments"),
    })),
  });
}
