import Asiakirjat, {
  DocLoadMoreFragment,
} from "#server/features/document/pages/list.page";
import type { AsiakirjatIndexData } from "#server/features/document/pages/list.page";
import { formatFi, withWebappPage } from "./helpers";
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
      const dateParam = url.searchParams.get("date") || undefined;
      const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
      let currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
      const limit = 50;

      const cursor = dateParam ?? ctx.tlData.cursor;

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

      if (isHtmx(ctx.req) && url.searchParams.has("load_more")) {
        return new Response(
          DocLoadMoreFragment({ data, query: q, kind: kind ?? "" }),
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }

      const isAtPresent = cursor >= ctx.tlData.today;
      const shownCursor = isAtPresent ? undefined : formatFi(cursor);

      const resolvedTl = dateParam
        ? { ...ctx.tlData, cursor, cursorFormatted: formatFi(cursor) }
        : ctx.tlData;

      const extraHeaders: Record<string, string> = {};
      if (cursor < ctx.tlData.today && dateParam) {
        const qs = new URLSearchParams();
        qs.set("period", ctx.tlData.term);
        qs.set("date", cursor);
        if (kind) qs.set("kind", kind);
        if (q) qs.set("q", q);
        extraHeaders["HX-Replace-Url"] = `/asiakirjat?${qs.toString()}`;
      }

      return {
        fragment: Asiakirjat({
          title: i18next.t("documents:title"),
          data,
          query: q,
          kind,
          cursorFormatted: shownCursor,
        }),
        activePath: "/asiakirjat",
        title: i18next.t("documents:title"),
        timelineData: resolvedTl,
        extraHeaders:
          Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
      };
    }),
  });
}
