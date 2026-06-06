import Muutokset from "#server/features/analytics/pages/changes.page";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createChangesRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/muutokset",
    GET: withWebappPage(deps, async () => ({
      fragment: Muutokset({ title: i18next.t("nav:changes") }),
      activePath: "/muutokset",
      title: i18next.t("nav:changes"),
    })),
  });
}
