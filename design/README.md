# Handoff: Eduskuntapeili — "Uutispöytä" (editorial open-data reader)

## Overview
Eduskuntapeili ("Parliament Mirror") is a public-facing web app that renders the **Finnish Parliament's open data** (avoindata.eduskunta.fi) in a readable, journalistic form. The chosen design direction is **"Uutispöytä" (the news desk)**: a warm-paper, ink-on-paper editorial layout where data carries itself through hierarchy, hairlines and columns rather than a sea of rounded cards.

The defining feature is **data provenance ("jäljitettävyys")**: every official number, quote, and AI summary is traceable back to its source record — dataset → API table → endpoint → record → fetch timestamp — one click away. This is a product principle, not a decoration; preserve it.

The UI language is Finnish. Keep all copy in Finnish unless the team asks for localization.

## About the Design Files
The files in `design_files/` are **design references created in HTML/CSS/JS** — high-fidelity prototypes showing the intended look, layout, and behavior. They are **not** meant to be shipped verbatim.

Your task is to **recreate these designs in the target stack** (below), driven by live data from the Eduskunta open-data API rather than the hard-coded sample values in the mocks. The HTML/CSS is the source of truth for *appearance and interaction*.

## Target stack
**Server-rendered HTML + htmx, plain CSS, TypeScript on Bun. No SPA, no client framework, no build-time component runtime.**

This design is a near-perfect fit for that model — it is already ~90% static HTML with three tiny vanilla-JS behaviors, and every "interaction" is naturally a server round-trip or a sliver of progressive enhancement:

- **Server:** a TypeScript HTTP server on **Bun** (e.g. `Bun.serve`, or Hono if you want a router). It renders full HTML pages and HTML *fragments*. Use a plain template approach (tagged-template HTML helpers or JSX-as-strings via Bun) — **render to HTML strings, not a client VDOM.**
- **Interactivity:** **htmx** attributes (`hx-get`, `hx-target`, `hx-swap`, `hx-push-url`) for anything that fetches/replaces markup. Reach for a few lines of vanilla JS only for the genuinely client-only bits (popover positioning, localStorage). No React/Vue/Svelte.
- **CSS:** ship `peili.css` essentially **as-is** — it is framework-agnostic plain CSS with custom properties and needs no porting. Split into partials if you like (`tokens.css`, `shell.css`, `components.css`) but keep the tokens and class names.
- **Data layer:** typed TypeScript modules that query the Eduskunta open-data API (table/endpoint shapes are referenced in the `.cite` attributes throughout the mocks) and return typed view-models the templates consume. **Generate provenance metadata here**, from the real queries.
- **Fonts:** self-host the three Google fonts; serve locally.

Why htmx maps cleanly to each behavior — see **Interactions & Behavior** below; each one has an "htmx mapping" note.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction details are final and intentional. Recreate the UI pixel-faithfully using the codebase's own primitives. All exact tokens are listed in **Design Tokens** below; the complete, authoritative stylesheet is `design_files/peili.css` (read it — it is thoroughly commented and is the canonical spec for every component).

---

## Screens / Views

All pages share the same shell: **masthead** (brand + `Tietojakso` period selector), **nav**, the page body inside `.wrap` (max-width 1180px, 40px gutters), and a **footer** that restates the active data period. Filenames map 1:1 to views.

### 1. `Etusivu.html` — Home / "Eduskunta juuri nyt"
- **Purpose:** at-a-glance snapshot of Parliament right now.
- **Layout (top→bottom):** lead headline block (`.lead`) → 4-up stat row (`.stat-row`, ruled, no boxes: 200 / 108 hallitus / 92 oppositio / 8 puolueita) → AI summary inset (`.ai`) with expandable source ledger → two-column `.home-main` grid (1.55fr / 1fr): **left** = bloc bar (`.bloc-bar`) + party table (`.party-table`) + source note; **right** = `.rail` of editorial highlights (tightest vote, most active speaker, latest interpellation), each carrying an inline `.cite` trace.

### 2. `Kansanedustajat.html` — MP roster (list)
- **Purpose:** browse / filter / sort all 200 MPs.
- **Layout:** page head → `.toolbar` (search `.search` + live count) → party filter chips (`.fchips`/`.fchip`) → sortable table head (`.mp-table-head`, grid `28px 2fr 1.3fr 1.4fr 64px 110px`) → `.mp-list` of `.mp-row` (same grid). Each row: party dot, name (+ optional role pill), party/bloc, district, age, attendance bar.
- **Behavior:** powered by `roster.js` — see Interactions.

### 3. `Kansanedustaja.html` — MP profile
- **Purpose:** one MP in depth.
- **Layout:** `.bio-head` (116px portrait placeholder w/ initials + party bar, name, meta) → `.bio-stats` (4-up ruled) → `.bio-grid` (1.5fr/1fr) → substance sections (`.psec`): voting record (`.vote-bar` + `.vote-legend`), dissent / notable votes (`.vote-row`), topics (`.topic-tag`), actions — written questions & initiatives (`.act-row`); sidebar has committees (`.committee-row`) and spoken topics (`.spoke-row`).

### 4. `Istunnot.html` — Plenary sessions index
- **Purpose:** chronological list of sittings, grouped by sitting-week.
- **Layout:** `.week` groups with `.week-head` dividers → `.sit-list` of `.sit-row` (grid `64px 1fr 168px`): left date rail (`.sit-date` with keyed dot — vote/talk/quiet), middle (id, time, status pill `.spill--live/done/draft`, headline, note, agenda chips `.dchip` with result coloring), right meta.

### 5. `Istunto.html` — Single sitting
- **Purpose:** one plenary sitting's agenda and outcomes in detail.

### 6. `Asia.html` — Matter / lifecycle view
- **Purpose:** a legislative matter across its whole lifecycle (proposal → debate → vote → decision).
- **Layout:** `.lifecycle` stepper (`.lc-step`, done states colored) → per-stage `.stage` sections: debate viewpoints for/against (`.viewpoints`/`.vp`), `.speakers` list, party-by-party vote breakdown (`.vote-block`/`.pvote`), and a `.decision` banner.

### 7. `Asiakirja.html` — Document reading view
- **Purpose:** full-text speeches, written questions, proposals, initiatives.
- **Layout:** `.doc-head` (id pill, type, headline, byline) → `.doc-toolbar` → **the summary element** `.summary` ("Mistä tässä on kyse?" — AI-generated TL;DR with lead, dash points, numbered asks, disclaimer) → `.doc-body` two-column (article `66ch` + `.doc-aside` with status, timeline, related).

### 8. `Keskustelu.html` — Debate view
- **Purpose:** threaded plenary debate / speeches.

### 9. `Suunnittelujärjestelmä.html` — Design system page
- **Not a product screen.** It is the living style guide: principles, color swatches, type specs, kickers/rules/buttons, stats/composition, and the full provenance component gallery. Use it as the visual reference of record.

---

## Interactions & Behavior

Three vanilla-JS modules drive all behavior. In the htmx build, two of the three become **server round-trips returning HTML**; only the trace popover stays as a small client island. The data-attribute contracts below are the spec.

### Period selector — `period.js`
- Dropdown in the masthead choosing the **data period (`Tietojakso`)**: `2023` (Vaalikausi 2023–2027, Orpon hallitus — **default**), `2019` (2019–2023), `all` (kaikki vaalikaudet).
- Selection is **persisted in `localStorage` under key `peili.period`** and applied on every page load.
- On change it updates: masthead label/badge (`[data-period-v]`, `[data-period-badge]`, `.is-now` toggled only for `2023`), footer statement (`[data-period-label]`, `[data-period-detail]`), and sets `document.body[data-active-period]` so trace popovers can read it. Period definitions (label/gov/badge/detail) live in the `PERIODS` map at the top of the file.
- **Product meaning:** the period scopes every number and summary on the page. In the real app this should be global app state that filters all data queries — not just cosmetic text.
- Menu opens on button click; closes on outside-click and `Escape`.
- **htmx mapping:** keep the period as a **server-side concern**. Store the choice in a cookie (`peili_period`). Selecting an option does `hx-get="/period?val=2019" hx-target="body" hx-push-url="true"` (or a header-driven full re-render) so the whole page re-renders with the new period applied to every query. The cookie makes it persist across pages without client state. The dropdown open/close is the only client JS here (a few lines, or `<details>`).

### Data provenance / trace — `trace.js`
The centerpiece. Two pieces:
1. **`.cite` inline citation** — any value wrapped in `<span class="cite" data-*>`. Renders a dotted underline + a superscript monospace marker (`∗`, auto-injected unless `data-mark="off"`). Click / Enter / Space opens a single shared **popover** (`.trace-pop`) built from the element's `data-*` attributes; click again, outside-click, or `Escape` closes. The popover repositions on scroll and closes on resize. Every `.cite` is made focusable (`tabindex=0`, `role=button`, `aria-expanded`).
   - **Data-attribute contract** (all optional except as a group): `data-value` (headline figure), `data-caption`, `data-set` (Aineisto), `data-table` (Taulu — rendered as code), `data-endpoint` (Rajapintakutsu — code), `data-record` (Tietue), `data-jakso` (Jakso), `data-fetched` (Haettu — also drives the green "tuore" freshness dot), `data-chain` (`>`-separated nodes rendered as `node → node → node`), `data-url` + `data-orig` (external "open original" link), `data-mark="off"` to suppress the marker, `data-mark-text` to override it.
2. **`.ai-sources-toggle`** — expands/collapses a `.ai-sources` ledger of cited source records (`.src-row`: number, title, API call, date, "avaa ↗" link) inside an `.ai` or `.summary` block. Toggles `.is-open`, swaps the chevron rotation and the button label (`data-label` ⇄ "Piilota lähteet").
   - **htmx mapping:** the popover is genuinely client-side (positioning relative to the clicked element, single-instance, keyboard) — keep it as a **~40-line vanilla-JS island**, unchanged from `trace.js`. Server-render every `.cite` with its `data-*` already populated from the data layer; the island just reads them. The `.ai-sources` ledger can be server-rendered inline and toggled with CSS/`<details>`, or lazy-loaded via `hx-get` on first expand if you'd rather not ship the records until asked.

### Roster filter/sort — `roster.js`
- Operates on `.mp-row` elements via data-attributes: `data-party`, `data-bloc`, `data-name`, `data-district`.
- **Party/bloc chips** (`.fchip[data-filter]`) filter the list; active chip gets `.is-active`; `data-filter="all"` shows everything.
- **Search** (`#mp-search`) filters by name or district (case-insensitive substring).
- **Sortable columns** (`.mp-sort`) toggle asc/desc (`.is-asc`/`.is-desc`).
- Live result **count** written to `#mp-count`.
- **htmx mapping:** this is the cleanest htmx win. The toolbar is a `<form>`; the search input uses `hx-get="/kansanedustajat" hx-trigger="input changed delay:200ms" hx-target="#mp-list" hx-push-url="true"`; chips and sort headers are `hx-get` links carrying `?party=&sort=&dir=` query params. **The server does the filtering/sorting and returns the `#mp-list` fragment + updated count.** No client list logic at all.

### Shared interaction patterns
- **Navigation:** standard links between pages. Active nav item gets `.is-active` (red underline).
- **Hover states:** rows tint to `--paper-2`; links shift `--blue → --blue-ink`; buttons `--ink → #2a241d`.
- All interactions are keyboard-accessible (Enter/Space/Escape) and use ARIA — preserve this.

### Loading / empty / error states
Not designed in these mocks. When wiring to the live open-data API, design these to match the editorial language: hairline skeletons over the ruled rows, a quiet monospace note for empty results, and an inline error in the same `.source-note` voice rather than a modal.

---

## State Management
- **Active data period** — server-side, carried in a **cookie** (`peili_period`, default `2023`); filters every data query. Not client state.
- **Roster filter/sort** — encoded in the **URL query string** (`?party=&q=&sort=&dir=`); the server derives the list. Shareable/bookmarkable, back-button friendly via `hx-push-url`.
- **Open trace popover** — the one piece of true client UI state (single-at-a-time), owned by the small trace island.
- **AI-sources expanded** — CSS/`<details>` state, or a per-request `hx-get`.
- **Data fetching:** the Bun/TS data layer queries the Eduskunta open-data API. The mocks reference real table/endpoint shapes in the `.cite` attributes (e.g. `GET /api/v1/tables/SaliDBAanestys/rows?VotingId=…`, `MemberOfParliament`, `ParliamentaryGroupMembership`, `VaskiData`, `SaliDBPuheenvuoro`, `SaliDBPoytakirja`) — use these as the integration starting point. **The provenance metadata must be produced by the real data layer**, not hand-authored, so traces stay truthful. Cache responses server-side and stamp the `data-fetched` time from the real fetch.

---

## Design Tokens
All defined as CSS custom properties at the top of `peili.css`. Authoritative values:

### Colors
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FBFAF7` | page background (warm paper) |
| `--paper-2` | `#F4F1E8` | inset / tinted block, hovers |
| `--paper-3` | `#EFEBDF` | deeper inset |
| `--ink` | `#16130F` | headlines, primary text |
| `--body` | `#3A352D` | running text |
| `--muted` | `#847B6D` | meta, captions |
| `--faint` | `#A89F90` | least-important |
| `--blue` | `#1B3A6B` | links, editorial accent |
| `--blue-ink` | `#14305A` | link hover |
| `--red` | `#BC3A23` | "now", alerts, footnote markers |
| `--hall` | `#2F6B4F` | hallitus / government |
| `--hall-soft` | `#E4EDE7` | government tint |
| `--opp` | `#B97324` | oppositio / opposition |
| `--opp-soft` | `#F4E9DA` | opposition tint |
| `--rule` | `rgba(22,19,15,.16)` | standard hairline |
| `--rule-soft` | `rgba(22,19,15,.08)` | faint hairline |
| `--rule-ink` | `#16130F` | strong 2px rule |

Party dot colors are inline per-party hex (e.g. Kokoomus `#1d4f91`, SDP `#d3243a`, Keskusta `#0b8a4a`, Vihreät `#5aa829`, Vasemmistoliitto `#9e1f4b`, RKP `#1278b6`, PS `#2c3e8c`, KD `#1a3f86`).

### Typography
- **Heads:** `"Schibsted Grotesk"` (weights 400–900). **Body:** `"Hanken Grotesk"` (400–800). **Mono:** `"IBM Plex Mono"` (400–600) — the "voice of raw data," used for all provenance/technical text. (Google Fonts.)
- Headings: `letter-spacing: -.02em`. Body `line-height: 1.5`; long-form article `line-height: 1.72` at 18px.
- Scale: `--fs-display` clamp(40→56px) · `--fs-h1` clamp(30→40px) · `--fs-h2` 25px · `--fs-h3`/`--fs-lead` 19px · `--fs-body` 16px · `--fs-sm` 14px · `--fs-meta` 12.5px · `--fs-mono` 12px · `--fs-kicker` 11px (uppercase, `.15em` tracking).

### Layout / spacing
- `--maxw: 1180px`, `.wrap` padding `0 40px`.
- Section rhythm: `.ds-section` 40px vertical padding with top hairline; grids use `gap: 24px`/`48px`.
- **Borders are square** — this system deliberately avoids rounded corners and drop-shadow cards. Emphasis comes from hairlines, left-rule insets (`.ai` has a 3px `--blue` left border), and ink rules. Shadows appear only on floating popovers/menus (`0 1px 0 ink, 0 14px 40px rgba(22,19,15,.16-.18)`).
- Breakpoints: `900px` (grids collapse, stats → 2-up), `980px` (doc/matter two-cols → single).

## Assets
- **Fonts:** Schibsted Grotesk, Hanken Grotesk, IBM Plex Mono via Google Fonts (`<link>` in each page `<head>`). Self-host in production.
- **MP portraits:** placeholder squares with initials (`.bio-portrait .initials`). Real app should load official MP photos from the open-data API; keep the square frame + party-color bottom bar.
- **No icons/SVGs** beyond simple dots, carets (`▾`), arrows (`→ ↗`), and a spark glyph (`✦`) for AI blocks. No icon library dependency.
- **No images** are bundled; nothing proprietary.

## Files
In `design_files/`:
- `Etusivu.html` — home
- `Kansanedustajat.html` — MP roster · `Kansanedustaja.html` — MP profile
- `Istunnot.html` — sessions index · `Istunto.html` — single sitting
- `Asia.html` — matter lifecycle · `Asiakirja.html` — document reader · `Keskustelu.html` — debate
- `Suunnittelujärjestelmä.html` — **design system / style guide (read first)**
- `peili.css` — **the complete, commented design system (the spec)**
- `period.js` · `trace.js` · `roster.js` — behavior modules (logic contracts above)

And alongside this README:
- **`COMPONENTS.md`** — the reusable **component library**: every primitive/component catalogued with copy-ready markup, the class API, and a proposed partial/file architecture for the Bun+htmx build. Read it before writing any markup so pages share one vocabulary instead of reinventing it.

## Suggested approach for Claude Code
1. Open `Suunnittelujärjestelmä.html` and `peili.css` first to absorb the system.
2. Stand up the **Bun + TypeScript** server with an HTML-string template helper and serve `peili.css` (split into `tokens/shell/components` partials if desired) and self-hosted fonts. Add htmx.
3. Build the shared **shell** (masthead + period selector + nav + footer) and the **provenance primitives**: a `cite(data)` template helper that emits `<span class="cite" data-*>`, the server-rendered `.ai-sources` ledger, and the small **trace-popover JS island** (port `trace.js` ~verbatim). These are reused everywhere. **Work from `COMPONENTS.md`** — it defines the partial set and markup for every component.
4. Build the **typed data layer** against the Eduskunta open-data API; have it return view-models *with* provenance metadata.
5. Build screens in order of dependency: Etusivu → Kansanedustajat → Kansanedustaja → Istunnot/Istunto → Asia/Asiakirja/Keskustelu, rendering each as a server template.
6. Wire the **period cookie** (full re-render on change) and the **roster filter/sort** (query-param `hx-get` returning the `#mp-list` fragment).

## Viewing the designs
`design_files/` are runnable. Open any `.html` in a browser to see the **pixel-accurate, fully-styled, interactive** design (correct fonts, live popovers, working roster filter, period selector). To check the **responsive/mobile** layouts the CSS already implements (breakpoints at 980 / 900 / 720 / 560px — e.g. the roster table collapses to stacked cards, nav becomes a scrollable tab bar), resize the window or use your browser's device-emulation mode (DevTools → toggle device toolbar, e.g. iPhone/390px). This is a more faithful reference than static screenshots — and it lets you inspect computed styles directly.
