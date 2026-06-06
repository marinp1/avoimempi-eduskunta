import Istunnot, {
  SessionList,
} from "../../../webapp/templates/pages/istunnot";
import { buildSessionsViewModel } from "../../../webapp/templates/pages/istunnot-view-models";
import {
  page,
  getTimelineData,
  setCursorCookie,
  readPeriod,
  getTermBounds,
  timelineOobHtml,
  isHtmx,
  formatFi,
  getPeriodSelectorData,
} from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createIstunnotRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/istunnot",
    GET: async (req) => {
        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") ?? undefined;
        const q = url.searchParams.get("q") ?? undefined;
        const dateParam = url.searchParams.get("date");

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const cursor = dateParam ?? tlData.cursor;

        const period = readPeriod(req, deps.metadataRepository);
        const bounds = getTermBounds(period, deps.metadataRepository);

        const raw = deps.sessionRepository.fetchSessionsIndex(2000);
        const termFiltered = raw.filter(
          (r) =>
            r.date >= bounds.startDate &&
            (!bounds.endDate || r.date <= bounds.endDate),
        );
        const filtered =
          cursor < tlData.today
            ? termFiltered.filter((r) => r.date <= cursor)
            : termFiltered;
        const data = buildSessionsViewModel(filtered, { kind, q });

        const cookieHeader = dateParam ? setCursorCookie(dateParam) : undefined;
        const cursorFormatted = formatFi(cursor);
        const isAtPresent = cursor >= tlData.today;
        const shownCursor = isAtPresent ? undefined : cursorFormatted;

        if (isHtmx(req)) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (
            hxTarget.includes("sit-root") ||
            hxTarget.includes("tl-reactive")
          ) {
            const fragment = SessionList({
              weeks: data.weeks,
              totalSessions: data.totalSessions,
              cursorFormatted: shownCursor,
            });
            const headers: Record<string, string> = {
              "Content-Type": "text/html; charset=utf-8",
              Vary: "HX-Request",
            };
            if (cookieHeader) headers["Set-Cookie"] = cookieHeader;
            const replaceUrl = buildIstunnotUrl({
              cursor,
              today: tlData.today,
              kind,
              q,
            });
            if (replaceUrl) headers["HX-Replace-Url"] = replaceUrl;
            return new Response(fragment, { headers });
          }

          const tlHtml = timelineOobHtml(tlData);
          const fullHeaders: Record<string, string> = {
            "Content-Type": "text/html; charset=utf-8",
            Vary: "HX-Request",
          };
          const replaceUrl = buildIstunnotUrl({
            cursor,
            today: tlData.today,
            kind,
            q,
          });
          if (replaceUrl) fullHeaders["HX-Replace-Url"] = replaceUrl;
          return new Response(
            tlHtml +
              Istunnot({
                title: i18next.t("istunnot:title"),
                data,
                cursorFormatted: shownCursor,
              }),
            { headers: fullHeaders },
          );
        }

        const resolvedTl = dateParam
          ? { ...tlData, cursor, cursorFormatted }
          : tlData;
        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Istunnot({
            title: i18next.t("istunnot:title"),
            data,
            cursorFormatted: shownCursor,
          }),
          activePath: "/istunnot",
          title: i18next.t("istunnot:title"),
          timelineData: resolvedTl,
          extraHeaders: cookieHeader
            ? { "Set-Cookie": cookieHeader }
            : undefined,
          periodData,
        });
      },
  });
}

function buildIstunnotUrl(opts: {
  cursor: string;
  today: string;
  kind?: string;
  q?: string;
}): string | undefined {
  const { cursor, today, kind, q } = opts;
  if (cursor >= today && !kind && !q) return undefined;
  const qs = new URLSearchParams();
  if (cursor < today) qs.set("date", cursor);
  if (kind) qs.set("kind", kind);
  if (q) qs.set("q", q);
  const query = qs.toString();
  return query ? `/istunnot?${query}` : "/istunnot";
}
