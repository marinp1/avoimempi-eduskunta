/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import Kicker from "../components/kicker";
import { esc } from "../helpers";
import type { AanestyksetData, VoteRow } from "./aanestykset-view-model";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

interface Props {
  title?: string;
  data: AanestyksetData;
}

export default function Aanestykset({ title, data }: Props) {
  const d = data;

  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <section class="page-head">
          <Kicker text="Äänestykset" />
          <h1>Äänestykset</h1>
          <p class="sub">
            Täysistuntojen äänestystulokset ·{" "}
            <b style="color:var(--ink)">{d.totalCount}</b> äänestystä
          </p>
        </section>

        <div class="toolbar mt-20">
          <label class="search">
            <span class="ic">⌕</span>
            <input
              id="aanestys-search"
              type="search"
              name="q"
              placeholder="Hae äänestyksellä, asiakirjalla tai istunnolla…"
              hx-get="/aanestykset"
              hx-trigger="keyup changed delay:300ms"
              hx-target="#main-content"
              hx-push-url="true"
              hx-swap="innerHTML"
            />
          </label>
          <span class="count">
            <b id="aanestys-count">{d.totalCount}</b> äänestystä
          </span>
        </div>

        <div class="fchips mt-14">
          <button type="button" class="fchip is-active" data-filter="all">
            Kaikki
          </button>
          <button type="button" class="fchip" data-filter="lait">
            Lait
          </button>
          <button type="button" class="fchip" data-filter="selonteot">
            Selonteot
          </button>
          <button type="button" class="fchip" data-filter="luottamus">
            Luottamusäänestykset
          </button>
          <button type="button" class="fchip" data-filter="tiukat">
            Tiukat
          </button>
        </div>

        {d.groups.map((group) => (
          <div class="vgroup">
            <div class="week-head">
              <span class="week-head__k">Istunto</span>
              <span class="week-head__t">{esc(group.sessionDateLabel)}</span>
              <span class="week-head__meta">
                {group.rows.length} äänestystä
              </span>
            </div>
            <div class="vrow-list">
              {group.rows.map((row) => (
                <VoteRowItem row={row} />
              ))}
            </div>
          </div>
        ))}

        {d.groups.length === 0 && (
          <div style="text-align:center;color:var(--muted);padding:40px 0">
            Ei äänestyksiä näillä hakuehdoilla.
          </div>
        )}

        <div class="source-note mt-32">
          <span>Lähde:</span>
          <span class="dset">
            Eduskunnan avoin data · SaliDBAanestys + Vote
          </span>
          <span>·</span>
          <span class="fresh">haettu {d.fetchedAt}</span>
        </div>
      </div>
    </>
  );
}

function VoteRowItem({ row }: { row: VoteRow }) {
  const title = (row.questionText || row.title).toLowerCase();
  const diff = Math.abs(row.nYes - row.nNo);
  const types: string[] = [];
  if (
    title.includes("laki") &&
    !title.includes("luottamus") &&
    !title.includes("selonteko")
  ) {
    types.push("lait");
  }
  if (title.includes("selonteko")) {
    types.push("selonteot");
  }
  if (title.includes("luottamus") || title.includes("välikysymys")) {
    types.push("luottamus");
  }
  if (diff < 20 && row.nTotal > 0) {
    types.push("tiukat");
  }

  return (
    <a
      href={`/aanestys/${row.id}`}
      hx-get={`/aanestys/${row.id}`}
      {...NAV}
      class="vrow"
      data-type={types.join(" ")}
    >
      <div class="vrow__rail">
        <span class="vrow__id">Ä {row.votingNumber}</span>
        <span class="vrow__time">{esc(row.time)}</span>
      </div>
      <div class="vrow__main">
        <span class="vrow__q">{esc(row.questionText || row.title)}</span>
        {row.documents.length > 0 && (
          <div class="vrow__docs">
            {row.documents.map((doc) => (
              <span class={clsx("ag-doc", doc.isCommittee && "cmt")}>
                {esc(doc.label)}
              </span>
            ))}
          </div>
        )}
        {row.references.length > 0 && (
          <div class="vrow__links">
            {row.references.map((ref, i) => (
              <>
                {i > 0 && " · "}
                <span class="ref">{esc(ref.label)}</span>
              </>
            ))}
          </div>
        )}
      </div>
      <div class="vrow__res">
        <div class="vrow__nums">
          <span class="j">{row.nYes}</span>
          <span class="dash">–</span>
          <span class="e">{row.nNo}</span>
        </div>
        <div class="vrow__bar">
          <span class="j" style={`width:${row.yesPct.toFixed(1)}%`}></span>
          <span class="e" style={`width:${row.noPct.toFixed(1)}%`}></span>
        </div>
        <span class={clsx("vrow__out", row.outcome)}>{row.outcomeLabel}</span>
      </div>
      <span class="vrow__go">→</span>
    </a>
  );
}
