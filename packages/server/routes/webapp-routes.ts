import { htmlResponse, renderLayout } from "../../webapp/templates/layout";
import { AANESTYKSET_TITLE, renderAanestykset } from "../../webapp/templates/pages/aanestykset";
import { ANALYTIIKKA_TITLE, renderAnalytiikka } from "../../webapp/templates/pages/analytiikka";
import { ASIAKIRJAT_TITLE, renderAsiakirjat } from "../../webapp/templates/pages/asiakirjat";
import { EDUSTAJAT_TITLE, renderEdustajat } from "../../webapp/templates/pages/edustajat";
import { HALLITUKSET_TITLE, renderHallitukset } from "../../webapp/templates/pages/hallitukset";
import { HOME_TITLE, renderHome } from "../../webapp/templates/pages/home";
import { ISTUNNOT_TITLE, renderIstunnot } from "../../webapp/templates/pages/istunnot";
import { MUUTOKSET_TITLE, renderMuutokset } from "../../webapp/templates/pages/muutokset";
import { PUOLUEET_TITLE, renderPuolueet } from "../../webapp/templates/pages/puolueet";

// Build setup.ts once at module load time (top-level await, ESM).
const setupJsPath = new URL("../../webapp/src/setup.ts", import.meta.url).pathname;
const cssPath = new URL("../../webapp/src/styles.css", import.meta.url).pathname;

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

// ── static assets ────────────────────────────────────────────────────────────

const assetHeaders = (contentType: string) => ({
  "Content-Type": contentType,
  "Cache-Control":
    process.env.NODE_ENV === "production"
      ? "public, max-age=3600, stale-while-revalidate=86400"
      : "no-store",
});

function jsAsset() {
  return new Response(setupJs, { headers: assetHeaders("application/javascript; charset=utf-8") });
}

function cssAsset() {
  return new Response(cssText, { headers: assetHeaders("text/css; charset=utf-8") });
}

// ── not-found fragment (used for unknown /edustaja/* paths) ──────────────────

function notFoundFragment(path: string): string {
  return `<title>Sivua ei löydy — Eduskuntapeili</title>
<section class="page-hero">
    <h1>Sivua ei löydy</h1>
    <p class="page-lead">Polkua <code>${path}</code> ei löydy.</p>
    <p><a href="/">Palaa etusivulle</a></p>
</section>`;
}

// ── route map ────────────────────────────────────────────────────────────────

export function createWebappRoutes() {
  return {
    "/webapp/setup.js": jsAsset,
    "/webapp/styles.css": cssAsset,

    "/": (req: Request) =>
      htmlResponse(req, renderHome(), { activePath: "/", title: HOME_TITLE }),

    "/edustajat": (req: Request) =>
      htmlResponse(req, renderEdustajat(), { activePath: "/edustajat", title: EDUSTAJAT_TITLE }),

    "/puolueet": (req: Request) =>
      htmlResponse(req, renderPuolueet(), { activePath: "/puolueet", title: PUOLUEET_TITLE }),

    "/istunnot": (req: Request) =>
      htmlResponse(req, renderIstunnot(), { activePath: "/istunnot", title: ISTUNNOT_TITLE }),

    "/aanestykset": (req: Request) =>
      htmlResponse(req, renderAanestykset(), { activePath: "/aanestykset", title: AANESTYKSET_TITLE }),

    "/asiakirjat": (req: Request) =>
      htmlResponse(req, renderAsiakirjat(), { activePath: "/asiakirjat", title: ASIAKIRJAT_TITLE }),

    "/hallitukset": (req: Request) =>
      htmlResponse(req, renderHallitukset(), { activePath: "/hallitukset", title: HALLITUKSET_TITLE }),

    "/analytiikka": (req: Request) =>
      htmlResponse(req, renderAnalytiikka(), { activePath: "/analytiikka", title: ANALYTIIKKA_TITLE }),

    "/muutokset": (req: Request) =>
      htmlResponse(req, renderMuutokset(), { activePath: "/muutokset", title: MUUTOKSET_TITLE }),

    // Representative detail pages — stub until edustaja page is implemented.
    "/edustaja/:id": (req: Request) => {
      const fragment = notFoundFragment(new URL(req.url).pathname);
      return htmlResponse(req, fragment, { activePath: "/edustajat", title: "Edustaja" });
    },

    // Quality control — retained from old routes, served as a full page.
    "/laadunvalvonta": (req: Request) =>
      new Response(
        renderLayout(
          `<section class="page-hero"><h1>Laadunvalvonta</h1></section>`,
          { activePath: "/laadunvalvonta" },
        ),
        { headers: { "Content-Type": "text/html; charset=utf-8" } },
      ),
  } as const;
}
