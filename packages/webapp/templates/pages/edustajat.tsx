/** @jsxImportSource ../../src/jsx */
import type { RosterRow } from "../../../server/database/repositories/person-repository";
import Kicker from "../components/kicker";
import {
  type RosterParams,
  buildBlocBar,
  esc,
  partyShortName,
} from "../helpers";
import RosterContent from "./roster-content";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
  /** All roster rows before filtering. */
  allRows: RosterRow[];
  /** Rows after applying the current filter/sort params. */
  filtered: RosterRow[];
  /** Current filter and sort parameters from the URL query string. */
  params: RosterParams;
}

/** MP roster page with bloc bar, search, party filters, and sortable table. */
export default function Edustajat({ title, allRows, filtered, params }: Props) {
  const q = params.q || "";
  const bloc = buildBlocBar(allRows, partyShortName);

  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <section class="page-head">
          <Kicker text="Kansanedustajat" />
          <h1>{allRows.length} kansanedustajaa</h1>
          <p class="sub">
            Nykyisen vaalikauden edustajat. Suodata ryhmän tai blokin mukaan tai
            hae nimellä ja vaalipiirillä.
          </p>
        </section>
      </div>

      <div class="wrap" style="padding-bottom:8px">
        <div class="bloc-bar">
          {bloc.segments.map((seg) => (
            <span
              class={`seg-${seg.side}`}
              style={`width:${seg.width};background:${seg.color}`}
              title={`${seg.label} ${seg.count}`}
            ></span>
          ))}
        </div>
        <div class="bloc-legend">
          <span class="item">
            <span class="swatch" style="background:var(--hall)"></span>
            Hallitus <b>{bloc.govTotal}</b>
          </span>
          <span class="item">
            <span class="swatch" style="background:var(--opp)"></span>
            Oppositio <b>{bloc.oppTotal}</b>
          </span>
          <span class="note">{bloc.total} edustajaa</span>
        </div>
      </div>

      <div class="wrap">
        <div class="toolbar">
          <label class="search">
            <span class="ic">⌕</span>
            <input
              id="mp-search"
              name="q"
              type="text"
              value={esc(q)}
              placeholder="Hae nimellä tai vaalipiirillä…"
              hx-get="/edustajat"
              hx-trigger="input changed delay:300ms"
              hx-target="#roster-content"
              hx-include="#sort-field,#dir-field"
              hx-push-url="true"
            />
          </label>
          <span class="count" id="mp-count">
            <b>{filtered.length}</b> / {allRows.length} edustajaa
          </span>
        </div>
        <input
          type="hidden"
          id="sort-field"
          name="sort"
          value={params.sort || "name"}
        />
        <input
          type="hidden"
          id="dir-field"
          name="dir"
          value={params.dir || "asc"}
        />
      </div>

      <div id="roster-content" class="wrap">
        <RosterContent allRows={allRows} filtered={filtered} params={params} />
      </div>
    </>
  );
}
