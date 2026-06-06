import { esc, html } from "../html";

const GOOGLE_FONTS = html`<link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />`;

const NAV_ITEMS = [
  { href: "/", label: "Etusivu" },
  { href: "/edustajat", label: "Kansanedustajat" },
  { href: "/puolueet", label: "Puolueet" },
  { href: "/istunnot", label: "Istunnot" },
  { href: "/aanestykset", label: "Äänestykset" },
  { href: "/asiakirjat", label: "Asiakirjat" },
  { href: "/hallitukset", label: "Hallitukset" },
  { href: "/analytiikka", label: "Analytiikka" },
  { href: "/muutokset", label: "Muutokset" },
] as const;

export type NavHref = (typeof NAV_ITEMS)[number]["href"];

export interface LayoutOptions {
  activePath: string;
  title?: string;
  assetVersion?: string;
}

function formatFinnishDate(): string {
  return new Date().toLocaleDateString("fi-FI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function periodSelector(): string {
  return html`<div class="period" data-period>
          <button class="period__btn" aria-expanded="false" aria-haspopup="true">
            <span class="period__k">Tietojakso</span>
            <span class="period__v" data-period-v>Vaalikausi 2023–2027</span>
            <span class="period__badge is-now" data-period-badge>nykyinen</span>
            <span class="period__caret">▾</span>
          </button>
          <div class="period__menu" hidden role="menu">
            <div class="period__menu-head">Valitse tietojakso</div>
            <button class="period__opt is-selected" role="menuitemradio" aria-checked="true" data-val="2023">
              <span class="period__opt-main">Vaalikausi 2023–2027</span>
              <span class="period__opt-sub">Orpon hallitus · nykyinen</span>
            </button>
            <button class="period__opt" role="menuitemradio" aria-checked="false" data-val="2019">
              <span class="period__opt-main">Vaalikausi 2019–2023</span>
              <span class="period__opt-sub">Marinin / Rinteen hallitus</span>
            </button>
            <button class="period__opt" role="menuitemradio" aria-checked="false" data-val="all">
              <span class="period__opt-main">Kaikki vaalikaudet</span>
              <span class="period__opt-sub">koko avoin data</span>
            </button>
            <div class="period__note">Tietojakso rajaa kaikki sivun luvut ja koosteet. Oletuksena nykyinen kausi.</div>
          </div>
        </div>`;
}

export function renderLayout(content: string, options: LayoutOptions): string {
  const navLinks = NAV_ITEMS.map(
    ({ href, label }) =>
      html`<a href="${href}"${href === options.activePath ? ' class="is-active"' : ""}
            hx-boost="true"
            hx-target="#main-content"
            hx-push-url="true"
            hx-swap="innerHTML transition:true">${label}</a>`,
  ).join("\n      ");

  const pageTitle = options.title
    ? `${esc(options.title)} — Eduskuntapeili`
    : "Eduskuntapeili";

  const v = options.assetVersion ? `?v=${options.assetVersion}` : "";

  return html`<!DOCTYPE html>
<html lang="fi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${pageTitle}</title>
    ${GOOGLE_FONTS}
    <link rel="stylesheet" href="/webapp/styles.css${v}" />
    <script src="/webapp/setup.js${v}" defer></script>
  </head>
  <body>
    <div class="wrap">
      <header class="masthead">
        <div class="masthead__top">
          <div>
            <div class="brand__name">Eduskuntapeili</div>
            <div class="brand__tag">Eduskunnan avoin data, luettavassa muodossa</div>
          </div>
          <div class="masthead__meta">
            <span class="masthead__date">${formatFinnishDate()}</span>
            ${periodSelector()}
          </div>
        </div>
        <hr class="rule-ink" />
        <nav class="nav">
          ${navLinks}
          <span class="nav__search">Haku ⌕</span>
        </nav>
        <hr class="rule" />
      </header>
    </div>
    <main id="main-content">
      ${content}
    </main>
    <div class="wrap">
      <footer class="foot">
        <div class="foot__period">
          <span class="pk">Tietojakso</span>
          <span class="pv" data-period-label>Vaalikausi 2023–2027 · Orpon hallitus</span>
          <span class="pbadge is-now" data-period-badge-foot>nykyinen</span>
          <span class="pdetail" data-period-detail>20.6.2023 – kesken · 200 paikkaa · hallitus 108 / oppositio 92</span>
        </div>
        <div class="foot__legal">
          <span>Eduskuntapeili — avoin parlamenttidata · <a href="https://avoindata.eduskunta.fi/" target="_blank" rel="noopener">avoindata.eduskunta.fi</a></span>
          <span>Ei virallinen · data Creative Commons BY 4.0</span>
        </div>
      </footer>
    </div>
  </body>
</html>`;
}

export function htmlResponse(
  req: Request,
  fragment: string,
  options: LayoutOptions,
): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const body = isHtmx ? fragment : renderLayout(fragment, options);
  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}
