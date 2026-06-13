/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import i18next, { Namespace, ParseKeys } from "i18next";

interface Props {
  /** Current navigation path for active-link highlighting. */
  activePath: string;
}

/** Navigation items definition: label and href for each top-level page. */
const NAV_ITEMS = [
  { href: "/", label: "nav:home" },
  { href: "/edustajat", label: "nav:mps" },
  { href: "/puolueet", label: "nav:parties" },
  { href: "/istunnot", label: "nav:sessions" },
  { href: "/aanestykset", label: "nav:votings" },
  { href: "/asiakirjat", label: "nav:documents" },
] as const satisfies Array<{ href: string; label: ParseKeys<Namespace> }>;

/** Top-level navigation bar. On desktop the links are a horizontal flex row;
 *  on mobile (≤720px) the toggle button shows/hides a vertical overlay menu.
 *  Uses explicit hx-get so the server can return content-area-only fragments
 *  (no layout wrapper), avoiding the nested-DOM problems that hx-boost with
 *  hx-target causes. */
export default function Nav({ activePath }: Props) {
  return (
    <nav class="nav">
      <button
        type="button"
        class="nav__toggle"
        aria-label={i18next.t("common:menu")}
        aria-expanded="false"
        data-nav-toggle
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div class="nav__menu" data-nav-menu>
        {NAV_ITEMS.map((item) => (
          <a
            href={item.href}
            class={clsx({ "is-active": activePath === item.href })}
            hx-get={item.href}
            hx-target="#main-content"
            hx-push-url="true"
            hx-swap="innerHTML"
            hx-browser-indicator="true"
          >
            {i18next.t(item.label)}
          </a>
        ))}
        <span class="nav__search">{i18next.t("common:search")}</span>
        <button type="button" class="nav__about" data-about-open>
          <span class="ic">i</span>
          {i18next.t("nav:about")}
        </button>
      </div>
    </nav>
  );
}
