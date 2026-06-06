import Istunnot, {
  SessionList,
  SessionScrollFragment,
} from "#server/features/session/pages/list.page";
import { buildSessionsViewModel } from "#server/features/session/pages/list.view-model";
import { formatFi, withWebappPage } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute, isHtmx } from "#server/helpers";

export function createSessionsListRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/istunnot",
    GET: withWebappPage(deps, async (ctx) => {
      const url = new URL(ctx.req.url);
      const kind = url.searchParams.get("kind") ?? undefined;
      const q = url.searchParams.get("q") ?? undefined;
      const dateParam = url.searchParams.get("date") || undefined;
      const offsetParam = url.searchParams.get("offset");
      const isScroll = url.searchParams.has("scroll");

      const cursor = dateParam ?? ctx.tlData.cursor;

      const raw = ctx.deps.sessionRepository.fetchSessionsIndex(2000);
      const termFiltered = raw.filter(
        (r) =>
          r.date >= ctx.bounds.startDate &&
          (!ctx.bounds.endDate || r.date <= ctx.bounds.endDate),
      );
      const filtered =
        cursor < ctx.tlData.today
          ? termFiltered.filter((r) => r.date <= cursor)
          : termFiltered;
      const data = buildSessionsViewModel(
        filtered,
        { kind, q },
        offsetParam ? Number(offsetParam) : 0,
      );

      if (isHtmx(ctx.req) && isScroll && offsetParam) {
        return new Response(
          SessionScrollFragment({
            weeks: data.weeks,
            nextOffset: data.nextOffset,
            currentKind: kind ?? "",
            currentQuery: q ?? "",
            currentDate: dateParam ?? "",
          }),
          {
            headers: { "Content-Type": "text/html; charset=utf-8" },
          },
        );
      }

      const isAtPresent = cursor >= ctx.tlData.today;
      const shownCursor = isAtPresent ? undefined : formatFi(cursor);

      const replaceUrl = buildSessionsListUrl({
        cursor,
        today: ctx.tlData.today,
        term: ctx.tlData.term,
        kind,
        q,
      });

      const extraHeaders: Record<string, string> = {};
      if (replaceUrl) extraHeaders["HX-Replace-Url"] = replaceUrl;

      const resolvedTl = dateParam
        ? { ...ctx.tlData, cursor, cursorFormatted: formatFi(cursor) }
        : ctx.tlData;

      return {
        fragment: Istunnot({
          title: i18next.t("sessions:title"),
          data,
          cursorFormatted: shownCursor,
          currentKind: kind ?? "",
          currentQuery: q ?? "",
          currentDate: dateParam ?? "",
        }),
        activePath: "/istunnot",
        title: i18next.t("sessions:title"),
        timelineData: resolvedTl,
        extraHeaders:
          Object.keys(extraHeaders).length > 0 ? extraHeaders : undefined,
        partial: {
          target: ["sit-root", "tl-reactive"],
          fragment: SessionList({
            weeks: data.weeks,
            totalSessions: data.totalSessions,
            cursorFormatted: shownCursor,
            nextOffset: data.nextOffset,
            currentKind: kind ?? "",
            currentQuery: q ?? "",
            currentDate: dateParam ?? "",
          }),
        },
      };
    }),
  });
}

function buildSessionsListUrl(opts: {
  cursor: string;
  today: string;
  term: string;
  kind?: string;
  q?: string;
}): string | undefined {
  const { cursor, today, term, kind, q } = opts;
  const qs = new URLSearchParams();
  qs.set("period", term);
  if (cursor < today) qs.set("date", cursor);
  if (kind) qs.set("kind", kind);
  if (q) qs.set("q", q);
  return `/istunnot?${qs.toString()}`;
}
