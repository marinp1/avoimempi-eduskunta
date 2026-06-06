import { createHash } from "node:crypto";
import {
  eta,
  fragmentResponse,
  htmlResponse,
  renderFullPage,
} from "../../webapp/eta";
import type { RosterParams } from "../../webapp/templates/helpers";
import * as helpers from "../../webapp/templates/helpers";
import type { HomeRepository } from "../database/repositories/home-repository";
import type { PersonRepository } from "../database/repositories/person-repository";

// ── Build setup.ts and CSS once at module load (top-level await, ESM) ─────────

const setupJsPath = new URL("../../webapp/src/setup.ts", import.meta.url)
  .pathname;
const cssPath = new URL("../../webapp/src/styles.css", import.meta.url)
  .pathname;

const setupBuild = await Bun.build({
  entrypoints: [setupJsPath],
  target: "browser",
  minify: process.env.NODE_ENV === "production",
});

if (!setupBuild.success) {
  for (const log of setupBuild.logs) console.error("[webapp build]", log);
}

const setupJs = setupBuild.success
  ? await setupBuild.outputs[0].text()
  : `console.error("webapp/setup.js build failed")`;

const cssBuild = await Bun.build({
  entrypoints: [cssPath],
  target: "browser",
  minify: process.env.NODE_ENV === "production",
});

if (!cssBuild.success) {
  for (const log of cssBuild.logs) console.error("[webapp css build]", log);
}

const cssText = cssBuild.success
  ? await cssBuild.outputs[0].text()
  : await Bun.file(cssPath).text();

// Content-fingerprint both assets into a single version token.
// The layout embeds ?v=<hash> in asset URLs so browsers can cache them
// indefinitely (immutable) and automatically bust the cache on redeploy.
const assetVersion = createHash("sha256")
  .update(cssText)
  .update(setupJs)
  .digest("hex")
  .slice(0, 8);

// ── Static asset responses ────────────────────────────────────────────────────

const ASSET_CACHE = "public, max-age=31536000, immutable";
const NO_CACHE = "no-store";

const assetCacheControl =
  process.env.NODE_ENV === "production" ? ASSET_CACHE : NO_CACHE;

function jsAsset() {
  return new Response(setupJs, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": assetCacheControl,
    },
  });
}

function cssAsset() {
  return new Response(cssText, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": assetCacheControl,
    },
  });
}

// ── Page helper ───────────────────────────────────────────────────────────────

function page(
  req: Request,
  templateName: string,
  data: Record<string, unknown>,
  activePath: string,
  title?: string,
): Response {
  const fragment = eta.render(templateName, { ...helpers, title, ...data });
  return htmlResponse(req, fragment, { activePath, title, assetVersion });
}

function notFoundFragment(path: string): string {
  return `<title>Sivua ei löydy — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Sivua ei löydy</h1>
    <p class="sub">Polkua <code>${path}</code> ei löydy.</p>
    <p><a href="/">Palaa etusivulle</a></p>
</section>`;
}

// ── Route maps ────────────────────────────────────────────────────────────────

export function createWebappStaticRoutes() {
  return {
    "/webapp/setup.js": jsAsset,
    "/webapp/styles.css": cssAsset,
  } as const;
}

export interface WebappDeps {
  homeRepository: HomeRepository;
  personRepository: PersonRepository;
}

export function createWebappPageRoutes(deps: WebappDeps) {
  return {
    "/": {
      GET: async (req: Request) => {
        const data = await deps.homeRepository.fetchOverview({});
        return page(req, "pages/home", { data }, "/", "Etusivu");
      },
    },
    "/edustajat": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const params: RosterParams = {
          q: url.searchParams.get("q") ?? undefined,
          party: url.searchParams.get("party") ?? undefined,
          bloc: url.searchParams.get("bloc") ?? undefined,
          sort: url.searchParams.get("sort") ?? undefined,
          dir: url.searchParams.get("dir") ?? undefined,
        };
        const allRows = deps.personRepository.fetchRoster();
        const filtered = helpers.applyFilters(allRows, params);
        const isHtmx = req.headers.get("HX-Request") === "true";
        const isBoosted = req.headers.get("HX-Boosted") === "true";
        // Filter/search request (not a full-page navigation): return only roster content
        if (isHtmx && !isBoosted) {
          const fragment = eta.render("pages/roster-content", {
            ...helpers,
            allRows,
            filtered,
            params,
            oob: true,
          });
          return fragmentResponse(fragment);
        }
        return page(
          req,
          "pages/edustajat",
          { allRows, filtered, params },
          "/edustajat",
          "Kansanedustajat",
        );
      },
    },
    "/puolueet": {
      GET: (req: Request) =>
        page(req, "pages/puolueet", {}, "/puolueet", "Puolueet"),
    },
    "/istunnot": {
      GET: (req: Request) =>
        page(req, "pages/istunnot", {}, "/istunnot", "Istunnot"),
    },
    "/aanestykset": {
      GET: (req: Request) =>
        page(req, "pages/aanestykset", {}, "/aanestykset", "Äänestykset"),
    },
    "/asiakirjat": {
      GET: (req: Request) =>
        page(req, "pages/asiakirjat", {}, "/asiakirjat", "Asiakirjat"),
    },
    "/hallitukset": {
      GET: (req: Request) =>
        page(req, "pages/hallitukset", {}, "/hallitukset", "Hallitukset"),
    },
    "/analytiikka": {
      GET: (req: Request) =>
        page(req, "pages/analytiikka", {}, "/analytiikka", "Analytiikka"),
    },
    "/muutokset": {
      GET: (req: Request) =>
        page(req, "pages/muutokset", {}, "/muutokset", "Muutokset"),
    },
    "/edustaja/:id": {
      GET: (req: Request) => {
        // Profile page not yet implemented — return a proper 404 for now.
        const path = new URL(req.url).pathname;
        const fragment = notFoundFragment(path);
        const isHtmx = req.headers.get("HX-Request") === "true";
        const body = isHtmx
          ? fragment
          : renderFullPage(fragment, {
              activePath: "/edustajat",
              title: "Sivua ei löydy",
              assetVersion,
            });
        return new Response(body, {
          status: 404,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            Vary: "HX-Request",
          },
        });
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
