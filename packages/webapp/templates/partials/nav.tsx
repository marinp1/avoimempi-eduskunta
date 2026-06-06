/** @jsxImportSource ../../src/jsx */

interface Props {
  activePath: string;
}

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

export default function Nav({ activePath }: Props) {
  return (
    <nav class="nav">
      {NAV_ITEMS.map((item) => (
        <a
          href={item.href}
          class={activePath === item.href ? "is-active" : undefined}
          hx-boost="true"
          hx-target="#main-content"
          hx-push-url="true"
          hx-swap="innerHTML transition:true"
        >
          {item.label}
        </a>
      ))}
      <span class="nav__search">Haku ⌕</span>
    </nav>
  );
}
