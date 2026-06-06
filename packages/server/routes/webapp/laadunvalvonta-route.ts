import { htmlResponse } from "#webapp/eta";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createLaadunvalvontaRoute(_deps: WebappDeps) {
  return defineRoute({
    path: "/laadunvalvonta",
    GET: (req) =>
      htmlResponse(
        req,
        `<title>${i18next.t("common:page_title_format", { title: i18next.t("nav:quality_control"), brand: i18next.t("common:brand_name") })}</title>
<section class="page-hero"><h1>${i18next.t("nav:quality_control")}</h1></section>`,
        {
          activePath: "/laadunvalvonta",
          title: i18next.t("nav:quality_control"),
          assetVersion,
        },
      ),
  });
}
