import Istunnot, {
  SessionList,
} from "../../../webapp/templates/pages/istunnot";
import { buildSessionsViewModel } from "../../../webapp/templates/pages/istunnot-view-models";
import { page, getTimelineData, setCursorCookie } from "./helpers";
import type { WebappDeps } from "./deps";

export function createIstunnotRoute(deps: WebappDeps) {
  return {
    "/istunnot": {
      GET: (req: Request) => {
        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") ?? undefined;
        const q = url.searchParams.get("q") ?? undefined;
        const dateParam = url.searchParams.get("date");

        const tlData = getTimelineData(req, deps.sessionRepository);
        const cursor = dateParam ?? tlData.cursor;

        const raw = deps.sessionRepository.fetchSessionsIndex(500);
        const filtered =
          cursor < tlData.today ? raw.filter((r) => r.date <= cursor) : raw;
        const data = buildSessionsViewModel(filtered, { kind, q });

        const isHtmx = req.headers.get("HX-Request") === "true";
        const isBoosted = req.headers.get("HX-Boosted") === "true";

        const cookieHeader = dateParam ? setCursorCookie(dateParam) : undefined;
        const cursorFormatted = formatFi(cursor);
        const isAtPresent = cursor >= tlData.today;
        const shownCursor = isAtPresent ? undefined : cursorFormatted;

        if (isHtmx && !isBoosted) {
          // Both search/filter and timeline cursor change return SessionList.
          // Search uses hx-select="#sit-root" + hx-swap="outerHTML" to extract
          // only #sit-root from the response. Timeline uses hx-swap="outerHTML"
          // on #tl-reactive to replace the whole section.
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
          return new Response(fragment, { headers });
        }

        const resolvedTl = dateParam
          ? { ...tlData, cursor, cursorFormatted }
          : tlData;
        const resp = page(
          req,
          Istunnot({ title: "Istunnot", data, cursorFormatted: shownCursor }),
          "/istunnot",
          "Istunnot",
          resolvedTl,
        );
        if (cookieHeader) {
          return new Response(resp.body, {
            status: resp.status,
            headers: {
              ...Object.fromEntries(resp.headers),
              "Set-Cookie": cookieHeader,
            },
          });
        }
        return resp;
      },
    },
  } as const;
}

function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}
