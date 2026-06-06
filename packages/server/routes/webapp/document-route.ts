import Asiakirja from "#server/features/document/pages/detail.page";
import type { DocumentKind } from "#server/features/document/kinds/types";
import { notFoundResponse, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createDocumentRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/asiakirja/:id",
    GET: withWebappPage(deps, async (ctx, params) => {
      const id = params.id && /^\d+$/.test(params.id) ? params.id : null;
      if (!id) return docNotFound(ctx.req, params.id);

      const url = new URL(ctx.req.url);
      const kind = (url.searchParams.get("kind") ?? "kk") as DocumentKind;

      const data = ctx.deps.documentService.buildDetail(kind, id);
      if (!data) return docNotFound(ctx.req, id);

      return {
        fragment: Asiakirja({ data }),
        activePath: "/asiakirjat",
        title: data.identifier,
      };
    }),
  });
}

function docNotFound(req: Request, idPath: string): Response {
  return notFoundResponse(req, `/asiakirja/${idPath}`, {
    activePath: "/asiakirjat",
    title: i18next.t("documents:detail.not_found_title"),
    heading: i18next.t("documents:detail.not_found_title"),
    desc: i18next.t("documents:detail.not_found_desc"),
    backHref: "/asiakirjat",
    backLabel: i18next.t("documents:detail.back_to_docs"),
  });
}
