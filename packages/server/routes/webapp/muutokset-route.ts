import Muutokset from "#webapp/templates/pages/muutokset";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createMuutoksetRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/muutokset",
    GET: withWebappPage(deps, async () => ({
      fragment: Muutokset({ title: i18next.t("nav:changes") }),
      activePath: "/muutokset",
      title: i18next.t("nav:changes"),
    })),
  });
}
