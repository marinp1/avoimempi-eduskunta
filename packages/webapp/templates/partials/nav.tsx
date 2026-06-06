/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";

interface Props {
  /** Current navigation path for active-link highlighting. */
  activePath: string;
}

/** Navigation items definition: label and href for each top-level page. */
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
];

/** Top-level navigation bar. Uses explicit hx-get so the server can return
 *  content-area-only fragments (no layout wrapper), avoiding the nested-DOM
 *  problems that hx-boost with hx-target causes. */
export default function Nav({ activePath }: Props) {
  return (
    <nav class="nav">
      {NAV_ITEMS.map((item) => (
        <a
          href={item.href}
          class={clsx({ "is-active": activePath === item.href })}
          hx-get={item.href}
          hx-target="#main-content"
          hx-push-url="true"
          hx-swap="innerHTML"
        >
          {item.label}
        </a>
      ))}
      <span class="nav__search">Haku ⌕</span>
    </nav>
  );
}
