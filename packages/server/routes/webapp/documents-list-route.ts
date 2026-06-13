import Asiakirjat, {
  DocLoadMoreFragment,
} from "#server/features/document/pages/list.page";
import type { AsiakirjatIndexData } from "#server/features/document/pages/list.page";
import { withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute, isHtmx } from "#server/helpers";

export function createDocumentsListRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/asiakirjat",
    GET: withWebappPage(deps, async (ctx) => {
      const url = new URL(ctx.req.url);
      const q = url.searchParams.get("q") ?? undefined;
      const kind = url.searchParams.get("kind") ?? undefined;
      const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
      let currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
      const limit = 50;

      const { rows, totalCount } = ctx.deps.documentService.listByKind(kind, {
        query: q,
        page: currentPage,
        limit,
      });

      currentPage = Math.min(currentPage, Math.ceil(totalCount / limit) || 1);

      const data: AsiakirjatIndexData = {
        rows,
        totalCount,
        page: currentPage,
        totalPages: Math.ceil(totalCount / limit),
        kind: kind ?? "",
        fetchedAt: deps.provenanceService.tableFetchedAt("VaskiData"),
      };

      // Click-to-load: return only the new rows + updated button, no page wrapper.
      if (isHtmx(ctx.req) && url.searchParams.has("load_more")) {
        return new Response(
          DocLoadMoreFragment({ data, query: q, kind: kind ?? "" }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }

      return {
        fragment: Asiakirjat({
          title: i18next.t("documents:title"),
          data,
          query: q,
          kind,
        }),
        activePath: "/asiakirjat",
        title: i18next.t("documents:title"),
      };
    }),
  });
}
