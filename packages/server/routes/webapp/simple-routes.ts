import Aanestykset from "../../../webapp/templates/pages/aanestykset";
import Analytiikka from "../../../webapp/templates/pages/analytiikka";
import Asiakirjat from "../../../webapp/templates/pages/asiakirjat";
import Hallitukset from "../../../webapp/templates/pages/hallitukset";
import Home, { HomeReactive } from "../../../webapp/templates/pages/home";
import Muutokset from "../../../webapp/templates/pages/muutokset";
import Puolueet from "../../../webapp/templates/pages/puolueet";
import { htmlResponse, fragmentResponse } from "../../../webapp/eta";
import {
  page,
  getTimelineData,
  setCursorCookie,
  readPeriod,
  getTermBounds,
} from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";

export function createSimplePageRoutes(deps: WebappDeps) {
  return {
    "/": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const tlData = getTimelineData(req, deps.sessionRepository);
        const cursor = dateParam ?? tlData.cursor;

        const period = readPeriod(req);
        const bounds = getTermBounds(period);
        const data = await deps.homeRepository.fetchOverview({
          asOfDate: cursor,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          governmentStartDate: bounds.governmentStartDate,
        });
        const sessionCount = tlData.sittings.filter(
          (s) => s.d <= cursor,
        ).length;

        const isHtmx = req.headers.get("HX-Request") === "true";
        const cookieHeader = dateParam ? setCursorCookie(dateParam) : undefined;

        if (isHtmx) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (hxTarget.includes("tl-reactive") && dateParam) {
            const fragment = HomeReactive({ data, cursor, sessionCount });
            const headers: Record<string, string> = {
              "Content-Type": "text/html; charset=utf-8",
              Vary: "HX-Request",
            };
            if (cookieHeader) headers["Set-Cookie"] = cookieHeader;
            return new Response(fragment, { headers });
          }
          return fragmentResponse(
            Home({ title: "Etusivu", data, cursor, sessionCount }),
          );
        }

        const resolvedTl = dateParam
          ? { ...tlData, cursor, cursorFormatted: formatFi(cursor) }
          : tlData;
        const resp = page(
          req,
          Home({ title: "Etusivu", data, cursor, sessionCount }),
          "/",
          "Etusivu",
          resolvedTl,
        );
        if (cookieHeader && resp.status === 200) {
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
    "/puolueet": {
      GET: (req: Request) => {
        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Puolueet({ title: "Puolueet" }),
          "/puolueet",
          "Puolueet",
          tlData,
        );
      },
    },
    "/aanestykset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Aanestykset({ title: "Äänestykset" }),
          "/aanestykset",
          "Äänestykset",
          tlData,
        );
      },
    },
    "/asiakirjat": {
      GET: (req: Request) => {
        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Asiakirjat({ title: "Asiakirjat" }),
          "/asiakirjat",
          "Asiakirjat",
          tlData,
        );
      },
    },
    "/hallitukset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Hallitukset({ title: "Hallitukset" }),
          "/hallitukset",
          "Hallitukset",
          tlData,
        );
      },
    },
    "/analytiikka": {
      GET: (req: Request) => {
        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Analytiikka({ title: "Analytiikka" }),
          "/analytiikka",
          "Analytiikka",
          tlData,
        );
      },
    },
    "/muutokset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(req, deps.sessionRepository);
        return page(
          req,
          Muutokset({ title: "Muutokset" }),
          "/muutokset",
          "Muutokset",
          tlData,
        );
      },
    },
    "/laadunvalvonta": {
      GET: (req: Request) =>
        htmlResponse(
          req,
          `<title>Laadunvalvonta — Eduskuntapeili</title>
<section class="page-hero"><h1>Laadunvalvonta</h1></section>`,
          {
            activePath: "/laadunvalvonta",
            title: "Laadunvalvonta",
            assetVersion,
          },
        ),
    },
  } as const;
}

function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}
