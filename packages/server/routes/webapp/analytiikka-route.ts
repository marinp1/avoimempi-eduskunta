import Analytiikka from "#webapp/templates/pages/analytiikka";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createAnalytiikkaRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/analytiikka",
    GET: withWebappPage(deps, async () => ({
      fragment: Analytiikka({ title: i18next.t("nav:analytics") }),
      activePath: "/analytiikka",
      title: i18next.t("nav:analytics"),
    })),
  });
}
