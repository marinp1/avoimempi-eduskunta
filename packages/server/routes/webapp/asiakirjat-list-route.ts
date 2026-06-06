import Asiakirjat from "#webapp/templates/pages/asiakirjat";
import type {
  AsiakirjatIndexData,
  DocumentRow,
} from "#webapp/templates/pages/asiakirjat";
import { withWebappPage } from "./helpers";
import { fetchedAt } from "#webapp/templates/helpers";
import { DOC_KIND_DISPATCH, mapToDocRow } from "./doc-dispatch";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";
import {
  type DocumentKind,
  DOC_KIND_REGISTRY,
  docKindList,
} from "#shared/constants/DocumentKinds";

export function createAsiakirjatListRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/asiakirjat",
    GET: withWebappPage(deps, async (ctx) => {
      const url = new URL(ctx.req.url);
      const q = url.searchParams.get("q") ?? undefined;
      const kind = url.searchParams.get("kind") ?? undefined;
      const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
      let currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
      const limit = 50;

      const config =
        kind && kind in DOC_KIND_REGISTRY
          ? DOC_KIND_REGISTRY[kind as DocumentKind]
          : undefined;

      let rows: DocumentRow[];
      let totalCount: number;

      if (config) {
        const dispatch = DOC_KIND_DISPATCH[config.key]!;
        const result = dispatch(ctx.deps, {
          query: q,
          page: currentPage,
          limit,
        });
        rows = result.items.map((item) => mapToDocRow(item, config));
        totalCount = result.totalCount;
      } else {
        const allRows: DocumentRow[] = [];
        const perKindLimit = 100;
        for (const c of docKindList()) {
          try {
            const dispatch = DOC_KIND_DISPATCH[c.key]!;
            const result = dispatch(ctx.deps, {
              query: q,
              page: 1,
              limit: perKindLimit,
            });
            for (const item of result.items) {
              allRows.push(mapToDocRow(item, c));
            }
          } catch {
            // Skip types that don't have data or fail
          }
        }
        allRows.sort(
          (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.id - a.id,
        );
        const start = (currentPage - 1) * limit;
        rows = allRows.slice(start, start + limit);
        totalCount = allRows.length;
      }

      currentPage = Math.min(currentPage, Math.ceil(totalCount / limit) || 1);

      const data: AsiakirjatIndexData = {
        rows,
        totalCount,
        page: currentPage,
        totalPages: Math.ceil(totalCount / limit),
        kind: kind ?? "",
        fetchedAt: fetchedAt(),
      };

      return {
        fragment: Asiakirjat({
          title: i18next.t("asiakirjat:title"),
          data,
          query: q,
          kind,
        }),
        activePath: "/asiakirjat",
        title: i18next.t("asiakirjat:title"),
      };
    }),
  });
}
