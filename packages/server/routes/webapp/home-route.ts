import Home, { HomeReactive } from "#server/features/home/pages/home.page";
import { formatFi, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createHomeRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/",
    GET: withWebappPage(deps, async (ctx) => {
      const url = new URL(ctx.req.url);
      const dateParam = url.searchParams.get("date");
      const cursor = dateParam ?? ctx.tlData.cursor;

      const data = await ctx.deps.homeRepository.fetchOverview({
        asOfDate: cursor,
        startDate: ctx.bounds.startDate,
        endDate: ctx.bounds.endDate,
        governmentStartDate: ctx.bounds.governmentStartDate,
      });
      const sessionCount = ctx.tlData.sittings.filter(
        (s) => s.d <= cursor,
      ).length;

      const qs = new URLSearchParams();
      qs.set("period", ctx.tlData.term);
      if (cursor < ctx.tlData.today) qs.set("date", cursor);
      const replaceUrl = `/?${qs.toString()}`;

      const extraHeaders: Record<string, string> = {};
      if (replaceUrl) extraHeaders["HX-Replace-Url"] = replaceUrl;

      const resolvedTl = dateParam
        ? { ...ctx.tlData, cursor, cursorFormatted: formatFi(cursor) }
        : ctx.tlData;

      return {
        fragment: Home({
          title: i18next.t("home:title"),
          data,
          cursor,
          sessionCount,
        }),
        activePath: "/",
        title: i18next.t("home:title"),
        timelineData: resolvedTl,
        extraHeaders:
          Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
        partial: {
          target: "tl-reactive",
          when: !!dateParam,
          fragment: HomeReactive({ data, sessionCount }),
        },
      };
    }),
  });
}
