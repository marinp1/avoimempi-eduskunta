import { html } from "../html";

const escHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const NAV_ITEMS = [
  { href: "/", label: "Etusivu" },
  { href: "/edustajat", label: "Edustajat" },
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
}

export function renderLayout(content: string, options: LayoutOptions): string {
  const navLinks = NAV_ITEMS.map(
    ({ href, label }) =>
      html`<a href="${href}"${href === options.activePath ? ' aria-current="page"' : ""}>${label}</a>`,
  ).join("\n                ");

  const pageTitle = options.title
    ? `${escHtml(options.title)} — Eduskuntapeili`
    : "Eduskuntapeili";

  return html`<!DOCTYPE html>
<html lang="fi">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${pageTitle}</title>
        <link rel="stylesheet" href="/webapp/styles.css" />
        <script src="/webapp/setup.js" defer></script>
    </head>
    <body>
        <header class="site-header">
            <a class="site-logo" href="/">Eduskuntapeili</a>
            <nav class="site-nav"
                 hx-boost="true"
                 hx-target="#main-content"
                 hx-push-url="true"
                 hx-swap="innerHTML transition:true">
                ${navLinks}
            </nav>
        </header>
        <main id="main-content">
            ${content}
        </main>
        <footer class="site-footer">
            <p>Eduskuntapeili &mdash; Avoin parlamenttidata</p>
        </footer>
    </body>
</html>`;
}

/**
 * Returns a fragment for htmx requests, or a full page for direct URL access.
 * The fragment always starts with a <title> tag so htmx can update document.title.
 */
export function htmlResponse(
  req: Request,
  fragment: string,
  options: LayoutOptions,
): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const body = isHtmx ? fragment : renderLayout(fragment, options);
  return new Response(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
