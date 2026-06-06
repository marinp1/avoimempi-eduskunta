import Istunto from "#server/features/session/pages/detail.page";
import { notFoundResponse, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import { orNotFound } from "#server/helpers/errors";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createIstuntoRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/istunto/:year/:num",
    GET: withWebappPage(deps, async (ctx, params) => {
      const { year, num } = params;
      if (!year || !num) {
        return notFoundResponse(ctx.req, `/istunto/${year}/${num}`);
      }

      const sessionKey = `${year}/${num}`;
      const data = await ctx.deps.sessionService.getSessionDetail(sessionKey);
      orNotFound(ctx.req, data, `/istunto/${sessionKey}`);

      return {
        fragment: Istunto({ data }),
        activePath: "/istunnot",
        title: i18next.t("common:session_title_format", { key: sessionKey }),
      };
    }),
  });
}
