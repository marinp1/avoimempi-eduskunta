import Aanestykset from "../../../webapp/templates/pages/aanestykset";
import Analytiikka from "../../../webapp/templates/pages/analytiikka";
import Asiakirjat, {
  type AsiakirjatIndexData,
  type QuestionRow,
} from "../../../webapp/templates/pages/asiakirjat";
import Hallitukset from "../../../webapp/templates/pages/hallitukset";
import Home, { HomeReactive } from "../../../webapp/templates/pages/home";
import Muutokset from "../../../webapp/templates/pages/muutokset";
import Puolueet from "../../../webapp/templates/pages/puolueet";
import { partyColor } from "../../../webapp/templates/helpers";
import { htmlResponse } from "../../../webapp/eta";
import {
  page,
  getTimelineData,
  setCursorCookie,
  readPeriod,
  getTermBounds,
  timelineOobHtml,
} from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";

export function createSimplePageRoutes(deps: WebappDeps) {
  return {
    "/": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const cursor = dateParam ?? tlData.cursor;

        const period = readPeriod(req, deps.metadataRepository);
        const bounds = getTermBounds(period, deps.metadataRepository);
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
            headers["HX-Replace-Url"] = `/?date=${encodeURIComponent(cursor)}`;
            return new Response(fragment, { headers });
          }

          const tlHtml = timelineOobHtml(tlData);
          const fullHeaders: Record<string, string> = {
            "Content-Type": "text/html; charset=utf-8",
            Vary: "HX-Request",
          };
          if (dateParam && cursor < tlData.today) {
            fullHeaders["HX-Replace-Url"] =
              `/?date=${encodeURIComponent(cursor)}`;
          }
          return new Response(
            tlHtml + Home({ title: "Etusivu", data, cursor, sessionCount }),
            { headers: fullHeaders },
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
          const bodyStr = await resp.text();
          return new Response(bodyStr, {
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
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
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
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
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
        const url = new URL(req.url);
        const q = url.searchParams.get("q") ?? undefined;
        const currentPage =
          parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
        const limit = 50;

        const result = deps.documentRepository.fetchWrittenQuestions({
          query: q,
          page: currentPage,
          limit,
        });

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const questions: QuestionRow[] = result.items.map((item: any) => ({
          id: item.id,
          parliamentIdentifier: item.parliament_identifier,
          title: item.title ?? "",
          submissionDate: item.submission_date ?? "",
          firstSignerName:
            [item.first_signer_first_name, item.first_signer_last_name]
              .filter(Boolean)
              .join(" ") || "—",
          firstSignerParty: item.first_signer_party ?? "",
          firstSignerPartyColor: partyColor(item.first_signer_party ?? ""),
          answerDate: item.answer_date ?? null,
          answerMinisterTitle: item.answer_minister_title ?? null,
          subjects: item.subjects
            ? item.subjects.split("||").filter(Boolean)
            : [],
        }));

        const data: AsiakirjatIndexData = {
          questions,
          totalCount: result.totalCount,
          page: result.page,
          totalPages: result.totalPages,
          fetchedAt,
        };

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );

        const isHtmx = req.headers.get("HX-Request") === "true";
        if (isHtmx) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (
            hxTarget.includes("doc-root") ||
            hxTarget.includes("tl-reactive")
          ) {
            const fragment = Asiakirjat({
              title: "Asiakirjat",
              data,
              query: q,
            });
            const tlHtml = timelineOobHtml(tlData);
            return new Response(tlHtml + fragment, {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                Vary: "HX-Request",
              },
            });
          }

          const tlHtml = timelineOobHtml(tlData);
          return new Response(
            tlHtml + Asiakirjat({ title: "Asiakirjat", data, query: q }),
            {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                Vary: "HX-Request",
              },
            },
          );
        }

        return page(
          req,
          Asiakirjat({ title: "Asiakirjat", data, query: q }),
          "/asiakirjat",
          "Asiakirjat",
          tlData,
        );
      },
    },
    "/hallitukset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
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
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
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
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
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
