import { createHash } from "node:crypto";
import { htmlResponse, renderLayout } from "../../webapp/templates/layout";
import {
  AANESTYKSET_TITLE,
  renderAanestykset,
} from "../../webapp/templates/pages/aanestykset";
import {
  ANALYTIIKKA_TITLE,
  renderAnalytiikka,
} from "../../webapp/templates/pages/analytiikka";
import {
  ASIAKIRJAT_TITLE,
  renderAsiakirjat,
} from "../../webapp/templates/pages/asiakirjat";
import {
  EDUSTAJAT_TITLE,
  renderEdustajat,
} from "../../webapp/templates/pages/edustajat";
import {
  HALLITUKSET_TITLE,
  renderHallitukset,
} from "../../webapp/templates/pages/hallitukset";
import { HOME_TITLE, renderHome } from "../../webapp/templates/pages/home";
import {
  ISTUNNOT_TITLE,
  renderIstunnot,
} from "../../webapp/templates/pages/istunnot";
import {
  MUUTOKSET_TITLE,
  renderMuutokset,
} from "../../webapp/templates/pages/muutokset";
import {
  PUOLUEET_TITLE,
  renderPuolueet,
} from "../../webapp/templates/pages/puolueet";

// ── Build setup.ts and read CSS once at module load (top-level await, ESM) ──

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

const cssText = await Bun.file(cssPath).text();

// Content-fingerprint both assets into a single version token.
// The layout embeds ?v=<hash> in asset URLs so browsers can cache them
// indefinitely (immutable) and automatically bust the cache on redeploy.
const assetVersion = createHash("sha256")
  .update(cssText)
  .update(setupJs)
  .digest("hex")
  .slice(0, 8);

// ── Static asset responses ────────────────────────────────────────────────────
// One year / immutable is safe because the URL includes the content hash.

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
// Injects assetVersion so every full-page render links versioned asset URLs.

function page(
  req: Request,
  fragment: string,
  activePath: string,
  title?: string,
): Response {
  return htmlResponse(req, fragment, { activePath, title, assetVersion });
}

function notFoundFragment(path: string): string {
  return `<title>Sivua ei löydy — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Sivua ei löydy</h1>
    <p class="page-lead">Polkua <code>${path}</code> ei löydy.</p>
    <p><a href="/">Palaa etusivulle</a></p>
</section>`;
}

// ── Route maps ────────────────────────────────────────────────────────────────
//
// Static asset routes: plain functions, NOT wrapped by ResponseCache.
// These are already in-memory strings; caching adds overhead without benefit.
//
// Page routes: { GET } objects so ResponseCache.wrapRoutes() can wrap them.
// They must be wrapped with the htmx-aware cache key (see index.ts) so that
// fragment and full-page responses are cached separately.

export function createWebappStaticRoutes() {
  return {
    "/webapp/setup.js": jsAsset,
    "/webapp/styles.css": cssAsset,
  } as const;
}

export function createWebappPageRoutes() {
  return {
    "/": {
      GET: (req: Request) => page(req, renderHome(), "/", HOME_TITLE),
    },
    "/edustajat": {
      GET: (req: Request) =>
        page(req, renderEdustajat(), "/edustajat", EDUSTAJAT_TITLE),
    },
    "/puolueet": {
      GET: (req: Request) =>
        page(req, renderPuolueet(), "/puolueet", PUOLUEET_TITLE),
    },
    "/istunnot": {
      GET: (req: Request) =>
        page(req, renderIstunnot(), "/istunnot", ISTUNNOT_TITLE),
    },
    "/aanestykset": {
      GET: (req: Request) =>
        page(req, renderAanestykset(), "/aanestykset", AANESTYKSET_TITLE),
    },
    "/asiakirjat": {
      GET: (req: Request) =>
        page(req, renderAsiakirjat(), "/asiakirjat", ASIAKIRJAT_TITLE),
    },
    "/hallitukset": {
      GET: (req: Request) =>
        page(req, renderHallitukset(), "/hallitukset", HALLITUKSET_TITLE),
    },
    "/analytiikka": {
      GET: (req: Request) =>
        page(req, renderAnalytiikka(), "/analytiikka", ANALYTIIKKA_TITLE),
    },
    "/muutokset": {
      GET: (req: Request) =>
        page(req, renderMuutokset(), "/muutokset", MUUTOKSET_TITLE),
    },
    "/edustaja/:id": {
      GET: (req: Request) => {
        const path = new URL(req.url).pathname;
        return page(req, notFoundFragment(path), "/edustajat", "Edustaja");
      },
    },
    "/laadunvalvonta": {
      GET: (_req: Request) =>
        new Response(
          renderLayout(
            `<section class="page-hero"><h1>Laadunvalvonta</h1></section>`,
            { activePath: "/laadunvalvonta", assetVersion },
          ),
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              Vary: "HX-Request",
            },
          },
        ),
    },
  } as const;
}
