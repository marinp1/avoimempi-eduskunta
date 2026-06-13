import { htmlResponse } from "#server/eta";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";
import QualityPage from "#server/features/quality/pages/quality.page";
import QualityStatusFragment from "#server/features/quality/fragments/status.fragment";
import { buildQualityViewModel } from "#server/features/quality/pages/quality.view-model";

/**
 * Startup sanity-check results page. Both routes must stay excluded from the
 * response cache (see `exclude` in index.ts) — the page reflects live runner
 * state and the status fragment is polled until the run completes.
 */
export function createDataQualityRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/laadunvalvonta",
    GET: (req) => {
      const vm = buildQualityViewModel(deps.sanityRunner.getState());
      return htmlResponse(req, String(QualityPage({ vm })), {
        activePath: "/laadunvalvonta",
        title: i18next.t("quality:title"),
        assetVersion,
      });
    },
  });
}

export function createDataQualityStatusRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/laadunvalvonta/status",
    GET: () => {
      const vm = buildQualityViewModel(deps.sanityRunner.getState());
      return new Response(String(QualityStatusFragment({ vm })), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    },
  });
}
