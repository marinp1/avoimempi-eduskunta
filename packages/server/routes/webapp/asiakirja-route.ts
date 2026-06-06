import Asiakirja from "#webapp/templates/pages/asiakirja";
import type { DocumentKind } from "#shared/constants/DocumentKinds";
import { notFoundResponse, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import { validateNumericId } from "./validators";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";
import { KIND_BUILDERS } from "./asiakirja/registry";

export function createAsiakirjaRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/asiakirja/:id",
    GET: withWebappPage(deps, async (ctx, params) => {
      const id = validateNumericId(params.id);
      if (!id) return docNotFound(ctx.req, params.id);

      const url = new URL(ctx.req.url);
      const kind = (url.searchParams.get("kind") ?? "kk") as DocumentKind;

      const builder = KIND_BUILDERS[kind];
      const data = builder ? builder(id, ctx.deps) : null;
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
    title: i18next.t("asiakirjat:detail.not_found_title"),
    heading: i18next.t("asiakirjat:detail.not_found_title"),
    desc: i18next.t("asiakirjat:detail.not_found_desc"),
    backHref: "/asiakirjat",
    backLabel: i18next.t("asiakirjat:detail.back_to_docs"),
  });
}
