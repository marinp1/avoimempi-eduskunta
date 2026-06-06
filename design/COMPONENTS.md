# Component Library — Eduskuntapeili "Uutispöytä"

This catalogues `peili.css` as a **reusable component kit** and proposes how to express it as server-rendered template partials (htmx + Bun/TS). The goal: every page is assembled from the same small set of named, documented components — no page reinvents markup.

## How the system is layered
Build (and think) in four tiers. Anything new must slot into one of them.

1. **Tokens** — the CSS custom properties in `:root` (colors, type, spacing). Never hard-code a value that a token exists for. See README → Design Tokens.
2. **Primitives** — kicker, rule, tag, spill, btn, link-arrow, stat. Tiny, content-agnostic, used everywhere.
3. **Components** — composed, named blocks with a BEM-ish class API (`.block`, `.block__part`, `.block--variant`): masthead, period selector, AI summary, trace popover, party table, MP row, session row, agenda item, speech, lifecycle, etc.
4. **Page templates** — one per route; compose components + the shared shell. Hold no novel styling of their own (page-specific tweaks live as inline grid declarations only, e.g. `.home-main`).

## Naming & visual conventions (keep these to stay coherent)
- **BEM-ish:** `block`, `block__element`, `block--modifier`. Match existing names exactly; don't introduce parallel vocab.
- **Square corners.** No `border-radius` except circular dots/avatars and the 50% portrait bars. No rounded cards.
- **Hairlines, not boxes.** Separation is `1px solid var(--rule)` / `--rule-soft`, or a `2px solid var(--ink)` section opener. Shadows appear **only** on floating layers (`.trace-pop`, `.period__menu`).
- **Mono = "the voice of raw data."** Any technical/provenance/ID/timestamp text is `var(--mono)`. Editorial text is never mono.
- **Color is semantic:** `--hall` government, `--opp` opposition, `--blue` links/editorial/AI, `--red` "now"/alerts/markers. Don't use them decoratively.

## Proposed partial architecture (Bun + TS + htmx)
A flat, function-per-component layout. Each function takes a typed view-model and returns an HTML string.

```
src/
  server.ts                 # Bun.serve router; routes → page templates / fragments
  data/                     # typed Eduskunta open-data API clients → view-models (+ provenance)
    parliament.ts  votes.ts  members.ts  parties.ts  sessions.ts  documents.ts
  html.ts                   # tiny tagged-template `html` helper + escape()
  components/
    shell.ts                # masthead(), nav(), footer(), periodSelector(), timeline()
    primitives.ts           # kicker(), rule(), tag(), spill(), btn(), linkArrow(), stat()
    provenance.ts           # cite(), sourceNote(), aiSummary(), traceData()  (+ trace.js island)
    data-display.ts         # statRow(), blocBar(), partyTable(), voteBar(), seatGrid(), voteResult(), seatVoteMap(), mpLookup()
    lists.ts                # mpRow(), partyRow(), sessionRow(), agendaItem(), voteListRow(), actionRow(), voteRow(), subnav()
    editorial.ts            # summaryBlock(), article(), docAside(), timeline()
    matter.ts               # lifecycle(), viewpoints(), voteBlock(), decision()
    debate.ts               # speech(), speakerTally()
  pages/
    etusivu.ts  kansanedustajat.ts  kansanedustaja.ts  puolueet.ts  puolue.ts
    istunnot.ts  istunto.ts  asiakohta.ts  aanestykset.ts  aanestys.ts
    asia.ts  asiakirja.ts  keskustelu.ts
  public/
    peili.css   trace.js   period-island.js   fonts/
```
htmx fragment endpoints (e.g. `GET /kansanedustajat` returning just `#mp-list`) live in `server.ts` and call the same `mpRow()` partials — fragment and full-page share components.

---

## Catalogue

Each entry: **purpose · variants · canonical markup · suggested signature**. Markup is authoritative (matches `peili.css`); trim/extend per data.

### — Shell —

**`masthead()` + `nav()` + `footer()`** — the page frame, identical on every route.
```html
<header class="masthead">
  <div class="masthead__top">
    <div>
      <div class="brand__name">Eduskuntapeili</div>
      <div class="brand__tag">Eduskunnan avoin data, luettavassa muodossa</div>
    </div>
    <div class="masthead__meta">
      <span class="masthead__date">lauantai 30. toukokuuta 2026</span>
      <!-- periodSelector() here -->
    </div>
  </div>
  <hr class="rule-ink" />
  <nav class="nav">
    <a href="/" class="is-active">Etusivu</a>
    <a href="/kansanedustajat">Kansanedustajat</a>
    <a href="/puolueet">Puolueet</a>
    <a href="/istunnot">Istunnot</a>
    <a href="/aanestykset">Äänestykset</a>
    <a href="/asiakirjat">Asiakirjat</a>
    <span class="nav__search">Haku ⌕</span>
  </nav>
  <hr class="rule" />
</header>
```
Footer restates the active period (`.foot__period`) + legal/source line (`.foot__legal`). The active nav link gets `.is-active`. → `nav(activePath)`.

**`periodSelector(active)`** — masthead dropdown; **htmx: cookie + full re-render** (README → Period selector). Structure: `.period > .period__btn(.period__k/.period__v/.period__badge.is-now/.period__caret) + .period__menu[role=menu] > .period__opt[.is-selected]`. Open/close is the only client JS.

**`timeline()`** — the time scrubber ("tarkasteluhetki"), rendered right after the masthead on **every** product page. Full structure + behavior in README → Time scrubber. Skeleton:
```html
<section class="timeline" data-timeline>
  <div class="tl__head">
    <div class="tl__lead"><span class="tl__kicker">Tarkasteluhetki</span>
      <span class="tl__date" data-tl-date>28.5.2026</span>
      <span class="tl__rel is-now" data-tl-rel>nykyhetki</span></div>
    <div class="tl__nav">
      <button class="tl__now is-hidden" data-tl-now>Palaa nykyhetkeen →</button>
      <span class="tl__pair"><button class="tl__step" data-tl-prev>‹ edellinen</button>
        <button class="tl__step" data-tl-next>seuraava ›</button></span>
    </div>
  </div>
  <div class="tl__track" data-tl-track>
    <div class="tl__grid" data-tl-grid></div><div class="tl__axis"></div>
    <div class="tl__ticks" data-tl-ticks></div><div class="tl__today" data-tl-today></div>
    <div class="tl__handle" data-tl-handle role="slider">
      <div class="tl__flag" data-tl-flag>2026/57</div><div class="tl__stem"></div><div class="tl__knob"></div></div>
  </div>
  <div class="tl__legend">… t-vote / t-talk / t-quiet keys …</div>
</section>
```
Reset button uses `.is-hidden` (visibility, not display) so prev/next never shift. Ticks/gridlines/handle position are filled by JS from the sittings list. → `timeline(activeTerm, cursorDate, sittings[])`; the drag/keyboard stays a client island, the rendered fragment swaps via `hx-get` on release.

**Time-reactive hooks** — any value that should change with the cursor carries a `data-tl-*` attribute the scrubber writes to (see README for the full list): page-level `data-tl-headline/session/datetime/agenda/hall/opp/statval/ai/…`, rail facts `data-tl-vote-*` / `data-tl-interp-*`, and generic `data-tl-asof` / `data-tl-asof-long` "as of <date>" labels for list/entity pages. In the htmx build the server fills these per request; the `data-tl-*` names are a useful checklist of what each view must recompute by date.

### — Primitives —

| Component | Markup | Variants |
|---|---|---|
| **kicker** | `<p class="kicker">LABEL</p>` | `.kicker--red` (+`<span class="dot">`), `.kicker--blue` |
| **rule** | `<hr class="rule" />` | `.rule-ink` (2px), `.rule-soft` |
| **tag** | `<span class="tag tag--hall">Hallitus</span>` | `--hall`, `--opp`, `--ghost` |
| **spill** (status pill) | `<span class="spill spill--live"><span class="ld"></span>Käynnissä</span>` | `--live`, `--done`, `--draft` |
| **btn** | `<button class="btn">Avaa ↗</button>` | `.btn--ghost` |
| **link-arrow** | `<span class="link-arrow">Avaa →</span>` | — |
| **stat** | `<div class="stat"><div class="stat__label">…</div><div class="stat__value hall">108</div></div>` | value `.hall`/`.opp` |

### — Provenance (the centerpiece — see README → Data provenance) —

**`cite(data)`** — inline traceable value. The single most reused component.
```html
<span class="cite" data-value="83 JAA – 76 EI" data-caption="…"
  data-set="…" data-table="Voting" data-endpoint="GET /api/v1/tables/…"
  data-record="…" data-jakso="Vaalikausi 2023–2027" data-fetched="30.5.2026 klo 07.16"
  data-chain="avoindata.eduskunta.fi > Voting > Etusivu-kooste"
  data-url="https://avoindata.eduskunta.fi/" data-orig="Avaa äänestystulos">seitsemän äänen erolla</span>
```
`.verify` modifier = blue "varmenna jäljite" affordance; `data-mark="off"` suppresses the ∗ marker. **Generate the `data-*` from the real data layer.** The popover (`.trace-pop`) is a single shared client island (`trace.js`).

**`sourceNote(model)`** — newspaper "Lähde:" footnote under a section.
```html
<div class="source-note"><span>Lähde:</span>
  <span class="dset">Eduskunnan avoin data · …</span><span>·</span>
  <span class="fresh">haettu 30.5.2026 07.16</span><span>·</span>
  <!-- optional cite.verify -->
</div>
```

**`aiSummary(model)`** — editorial AI inset with expandable source ledger (`.ai` / `.ai__head` / `.ai__body` / `.ai__foot` + `.ai-sources-toggle` → `.ai-sources` of `.src-row`). Left blue rule, never a card. Toggle via `<details>` or lazy `hx-get`.

### — Data display —

- **`statRow(stats[])`** — `.stat-row` grid of `stat` primitives (home: 4-up; collapses 2-up on phone).
- **`blocBar(segments[]) + blocLegend()`** — government/opposition seat bar: `.bloc-bar > span.seg-hall|.seg-opp` + `.bloc-legend`.
- **`partyTable(rows[])`** — `.party-table` (dot · name+bloc small · `.pt-bar` track/fill · `.pt-seats`). Bar hidden on phone.
- **`voteBar(result) + voteLegend()`** — JAA/EI/TYH/POISSA breakdown (`.vote-bar .v-jaa/.v-ei/.v-tyh/.v-poi` + `.vote-legend`).
- **`seatGrid(seats[]) + attendance()`** — istunto attendance: `.att-big` headline number, `.att-bar`, `.att-chips`, and `.seatgrid` of `.seat[.absent]` dots (per-seat color via `--p`). Legend `.seat-legend`.
- **`voteResult(result)`** *(new)* — Äänestys headline: `.vresult` (JAA/EI `.prop`s with `.k.j`/`.k.e` labels · four-segment `.vote-bar` `.v-jaa/.v-ei/.v-tyh/.v-poi` + `.vote-legend` · `.decision`).
- **`seatVoteMap(votes[])`** *(new)* — the attendance `.seatgrid` recolored by *how each MP voted* (per-seat `--p`: hall-green = jaa, red = ei, opp-orange = tyhjä, `.absent` hollow = poissa), clustered by party. Built by inline JS from a per-MP vote list; reuses `.seatgrid`/`.seat` + `.seat-legend`.
- **`mpLookup(votes[])`** *(new)* — searchable per-MP vote list beside the seat map: `.mlookup` (`.search` + `.mlist` of `.mvote`: `.mn` name + party · `.mb.j|.e|.tyh|.out` vote badge).

### — Lists & rows (the workhorses) —

**`mpRow(mp)`** — roster row; the `#mp-list` fragment is a list of these. Grid `28px 2fr 1.3fr 1.4fr 64px 110px`, paired with `.mp-table-head`. Carries the filter/sort data-attrs.
```html
<a class="mp-row" href="/kansanedustaja/467" data-party="kesk" data-bloc="opp" data-name="hoskonen hannu" data-district="savo-karjala">
  <span class="c-dot"><span style="background:#0b8a4a"></span></span>
  <span class="mp-name">Hoskonen, Hannu <span class="role">pj</span></span>
  <span class="mp-party">Keskusta <small>Oppositio</small></span>
  <span class="mp-district">Savo-Karjala</span>
  <span class="mp-age">66</span>
  <span class="mp-att"><span class="track"><span class="fill" style="width:96%"></span></span><span class="pct">96%</span></span>
</a>
```
Collapses to a stacked card on phone (grid-areas in the 720px block). → server filters/sorts, returns the list.

- **`sessionRow(sitting)`** — Istunnot list item: `.sit-row` (date rail `.sit-date` w/ keyed dot · `.sit-main` with `.sit-top` id/time/`spill`, `.sit-head`, `.sit-note`, agenda `.dchip`s · figures `.sit-meta`/`.sit-fig` + `.sit-go`).
- **`agendaItem(item)`** — Istunto agenda entry: `.ag-item` (`.ag-num` · `.ag-body` with `.ag-phase` keyed dot, `.ag-title`, `.ag-docs`/`.ag-doc`, `.ag-activity`/`.ag-badge`, optional compact `.ag-votes`/`.agvote`, `.ag-speakers`/`.spk`).
- **`voteRow(vote)`** — notable/dissent vote (profile + matter): `.vote-row` (`.vote-row__badge.jaa|.tyh` · title+sub · `.vote-row__result`).
- **`actionRow(item)`** — written question / initiative: `.act-row` (`.act-row__id` · title/sub · `.act-row__date`).
- **`dchip(model)`** — decision/agenda chip: `.dchip > .dchip__k / .dchip__t / .dchip__r.ok|.no|.neu`; `.dchip--more` for overflow.
- **`partyRow(party)`** *(new)* — Puolueet index row: `.prow` grid (`.prow__sq` color square · `.prow__id` name + group chair · `.prow__seats` count/share · `.prow__coh` *ryhmäkuri* track · `.prow__go`). Grouped under `.pgroup` + `.week-head` by bloc; links to Puolue.
- **`voteListRow(vote)`** *(new)* — Äänestykset index row: `.vrow` grid (mono `.vrow__rail` id/time · `.vrow__main` question + `.ag-doc` chips + inner `.ref` spans · `.vrow__res` `.vrow__nums` JAA–EI + `.vrow__bar` + `.vrow__out.ok|.no` pill · `.vrow__go`). Grouped under `.vgroup` + `.week-head` by sitting; **the row is the only anchor** — inner references are `.ref` spans, never nested `<a>`. Doc chips re-scope `.ag-doc` under `.vrow__docs` (committee report = blue).
- **`subnav(prev, cur, next)`** *(new)* — prev/next pager between sibling subsections (Asiakohta): `.subnav` 3-col (`.subnav__side.prev|.next` dir + title · `.subnav__mid` position + label).

### — Editorial / document (Asiakirja) —

- **`summaryBlock(model)`** — "Mistä tässä on kyse?" AI TL;DR: `.summary` (blue `.summary__bar` · `.summary__lead` · dash `.summary__points` · numbered `.summary__asks` · `.summary__foot`/`.summary__disc`). The flagship document affordance.
- **`article(doc)`** — long-form body: `.article` (`.article__phase`, `p.standfirst`, `h3`, `.qlist`, `.article__sig`). Max width 66ch.
- **`docAside(meta)`** — sidebar: `.doc-aside .blk` blocks holding `dl`, `.statusline`, `.timeline` (`li.done`), `.related-row`s.
- **`docToolbar()`** — `.doc-toolbar` of `.tbtn`s.

### — Matter / lifecycle (Asia) —

- **`lifecycle(steps[])`** — stepper: `.lifecycle > .lc-step[.done][.is-vote]` (dot · num · label · date · `.lc-step__tag.ok|.no`). `.lc-step.current` adds the red "olet tässä" marker (used in Keskustelu context).
- **`stage(model)`** — per-phase section wrapper: `.stage` (`.stage__head` w/ `.stage__n`, `.stage__meta`, `.stage__intro`).
- **`viewpoints(for, against)`** — `.viewpoints > .vp.for|.vp.against` (top rule colored; `.vp__h`, bulleted `ul`).
- **`speakers(rows[])`** — `.speaker-row` (dot · name · `.sp-stance.for|.against|.neutral` · time).
- **`voteBlock(model)`** — party-by-party result: `.vote-block` (`.vote-block__result .big` · `.pvote` rows: name+dot · `.pvote__bar .j/.e/.a` · `.pvote__num`).
- **`decision(model)`** — outcome banner: `.decision` (round `.decision__icon` · `.decision__main .t/.s`). Government-green inset.

### — Debate (Keskustelu) —

- **`speech(model)`** — transcript entry, **shown in full by default** (no truncation): `.speech` (`.speech__av` initials+party bar · `.speech__head` name/`.speech__role`/time · **`.speech__sum` labeled per-speech AI summary** — opens with `.speech__sum-tag` “✦ Tekoälytiivistelmä” then a 1–2 sentence gist · `.speech__body` complete paragraphs, left-ruled · `.speech__foot` **provenance line**: char count · duration · “Avaa pöytäkirjassa”). First gets `2px solid ink` top. *(The old single-line `.speech__sum` gist and `.speech__cont` “…” truncation are removed — speeches are the value, nothing is hidden.)* Same treatment on Asiakohta.
- **`speakerTally(parties[])`** — `.spk-tally` strip of per-party speech counts.
- **`moreSpeeches(rows[])`** — collapsed `.more-speeches` block of `.reply-row`s (good `hx-get` lazy-load target).
- **`ctxGrid(themes, points)`** — debate synthesis: `.ctx-grid` two columns (`.ctx-themes`, numbered `.ctx-list`, `.ctx-src`).

---

> Index/row components added this iteration (`.prow`, `.vrow`, `.subnav`, `.vresult`, `.mlookup`, `.mvote`) live in `peili.css` under **“Index / row components”** — already lifted out of the per-page inline `<style>` blocks, so the stylesheet remains the single source of truth.

## Adding a new component coherently
1. Check it isn't an existing component + a modifier first (prefer `--variant` over a new block).
2. Compose from primitives and tokens; reuse hairlines/spacing rhythm. No new colors, no radius, no shadow (except floating layers).
3. Name it BEM-ish and add it to the right `components/*.ts` partial + this catalogue.
4. If it shows an official figure, it must support a `cite()` — provenance is non-negotiable.
