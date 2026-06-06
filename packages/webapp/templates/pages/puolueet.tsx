/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import { esc } from "../helpers";
import type { PuolueetData, PartyRow } from "./puolueet-view-model";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

interface Props {
  title?: string;
  data: PuolueetData;
}

export default function Puolueet({ title, data }: Props) {
  const d = data;
  const govRows = d.rows.filter((r) => r.bloc === "government");
  const oppRows = d.rows.filter((r) => r.bloc === "opposition");

  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <section class="page-head">
          <Kicker text="Puolueet" />
          <h1>Eduskuntaryhmät</h1>
          <p class="sub">
            {d.totalSeats} kansanedustajaa · {d.rows.length} eduskuntaryhmää
          </p>
        </section>

        {d.totalSeats > 0 && (
          <>
            <div class="bloc-bar">
              <span
                class="gov"
                style={`width:${((d.govSeats / d.totalSeats) * 100).toFixed(1)}%`}
              ></span>
              <span
                class="opp"
                style={`width:${((d.oppSeats / d.totalSeats) * 100).toFixed(1)}%`}
              ></span>
            </div>
            <div class="bloc-legend">
              <span>
                <span class="dot" style="background:var(--hall)"></span>
                Hallitus · {d.govSeats} paikkaa
              </span>
              <span>
                <span class="dot" style="background:var(--red)"></span>
                Oppositio · {d.oppSeats} paikkaa
              </span>
            </div>
          </>
        )}

        {govRows.length > 0 && (
          <div class="pgroup">
            <div class="week-head">
              <span class="week-head__k">Hallitus</span>
              <span class="week-head__t">Hallituspuolueet</span>
              <span class="week-head__meta">{govRows.length} ryhmää</span>
            </div>
            <div class="prow-list">
              {govRows.map((r) => (
                <PartyRowItem row={r} />
              ))}
            </div>
          </div>
        )}

        {oppRows.length > 0 && (
          <div class="pgroup">
            <div class="week-head">
              <span class="week-head__k">Oppositio</span>
              <span class="week-head__t">Oppositiopuolueet</span>
              <span class="week-head__meta">{oppRows.length} ryhmää</span>
            </div>
            <div class="prow-list">
              {oppRows.map((r) => (
                <PartyRowItem row={r} />
              ))}
            </div>
          </div>
        )}

        <div class="source-note mt-32">
          <span>Lähde:</span>
          <span class="dset">
            Eduskunnan avoin data · MemberOfParliament + Voting
          </span>
          <span>·</span>
          <span class="fresh">haettu {d.fetchedAt}</span>
        </div>
      </div>
    </>
  );
}

function PartyRowItem({ row }: { row: PartyRow }) {
  return (
    <a
      href={`/puolue/${esc(row.code)}`}
      class="prow"
      hx-get={`/puolue/${esc(row.code)}`}
      {...NAV}
    >
      <div class="prow__sq" style={`--p:${row.color}`}>
        {row.shortName}
      </div>
      <div class="prow__id">
        <span class="prow__name">{esc(row.name)}</span>
        {row.chairName && (
          <span class="prow__sub">pj. {esc(row.chairName)}</span>
        )}
      </div>
      <div class="prow__seats">
        <b>{row.seatCount}</b>
        <small>{row.seatShare} paikoista</small>
      </div>
      <div class="prow__coh">
        <span class="prow__coh-k">Ryhmäkuri</span>
        <span class="prow__track">
          <span
            class="fill"
            style={`width:${row.cohesionPct?.toFixed(0) ?? 0}%;background:var(--blue)`}
          ></span>
        </span>
        <span class="prow__coh-v">{row.cohesionLabel}</span>
      </div>
      <span class="prow__go">→</span>
    </a>
  );
}
