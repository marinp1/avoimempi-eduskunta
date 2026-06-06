/** @jsxImportSource ../../src/jsx */
import Kicker from "../components/kicker";
import { esc, formatDate } from "../helpers";

export interface QuestionRow {
  id: number;
  parliamentIdentifier: string;
  title: string;
  submissionDate: string;
  firstSignerName: string;
  firstSignerParty: string;
  firstSignerPartyColor: string;
  answerDate: string | null;
  answerMinisterTitle: string | null;
  subjects: string[];
}

export interface AsiakirjatIndexData {
  questions: QuestionRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  fetchedAt: string;
}

interface Props {
  title?: string;
  data?: AsiakirjatIndexData;
  query?: string;
}

export default function Asiakirjat({ title, data, query }: Props) {
  return (
    <>
      <title>{title} — Eduskuntapeili</title>

      <div class="wrap">
        <section class="page-head">
          <Kicker text="Asiakirjat" />
          <h1>Asiakirjat</h1>
          <p class="sub">
            Lakiehdotukset, kirjalliset kysymykset, aloitteet ja muut
            parlamenttiasiakirjat. Jokainen luku avautuu alkuperäiseen
            asiakirjaan ja sen käsittelytietoihin.
          </p>
        </section>
      </div>

      <hr class="rule" />

      <AsiakirjatList data={data} query={query} />
    </>
  );
}

function AsiakirjatList({
  data,
  query,
}: {
  data?: AsiakirjatIndexData;
  query?: string;
}) {
  return (
    <div
      id="tl-reactive"
      class="wrap loading-overlay"
      hx-get="/asiakirjat"
      hx-trigger="tl:commit from:document"
      hx-include:inherited="#tl-date-input"
      hx-swap="outerHTML"
      hx-push-url="true"
      hx-indicator="#tl-reactive"
    >
      <div class="htmx-indicator loading-spinner">Ladataan…</div>
      <div class="toolbar">
        <label class="search">
          <span class="ic">⌕</span>
          <input
            id="doc-search"
            type="text"
            autocomplete="off"
            placeholder="Hae asiakirjoista — tunnus, otsikko tai aihe…"
            name="q"
            value={query ?? ""}
            hx-get="/asiakirjat"
            hx-trigger="input changed delay:200ms"
            hx-target="#doc-root"
            hx-select="#doc-root"
            hx-swap="outerHTML"
            hx-push-url="true"
            hx-indicator="#doc-root"
          />
        </label>
        {data && (
          <span class="count">
            <b id="doc-count">{data.totalCount}</b> asiakirjaa
          </span>
        )}
      </div>

      <div class="fchips">
        <a class="fchip is-active" href="/asiakirjat">
          Kaikki
        </a>
        <a class="fchip" href="/asiakirjat?kind=kk">
          <span class="pdot" style="background:var(--blue)"></span>
          Kirjalliset kysymykset
        </a>
        <a class="fchip" href="/asiakirjat?kind=initiative">
          <span class="pdot" style="background:var(--hall)"></span>
          Aloitteet
        </a>
        <a class="fchip" href="/asiakirjat?kind=he">
          <span class="pdot" style="background:var(--opp)"></span>
          Hallituksen esitykset
        </a>
      </div>

      <div id="doc-root" class="loading-overlay">
        <div class="htmx-indicator loading-spinner">Ladataan…</div>
        {data ? (
          data.questions.length > 0 ? (
            <div class="doc-list">
              {data.questions.map((q) => (
                <a
                  class="doc-row"
                  href={`/asiakirja/${q.id}`}
                  data-id={String(q.id)}
                >
                  <div class="doc-row__left">
                    <span class="doc-row__id">
                      {esc(q.parliamentIdentifier)}
                    </span>
                    <span
                      class="pdot"
                      style={`background:${q.firstSignerPartyColor}`}
                    ></span>
                  </div>
                  <div class="doc-row__main">
                    <div class="doc-row__title">{esc(q.title)}</div>
                    <div class="doc-row__sub">
                      <span>{esc(q.firstSignerName)}</span>
                      <span class="sep"></span>
                      <span>Jätetty {formatDate(q.submissionDate)}</span>
                      {q.answerDate && (
                        <>
                          <span class="sep"></span>
                          <span>Vastattu {formatDate(q.answerDate)}</span>
                        </>
                      )}
                    </div>
                    {q.subjects.length > 0 && (
                      <div class="doc-row__tags">
                        {q.subjects.slice(0, 4).map((s) => (
                          <span class="topic-tag">{esc(s)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div class="doc-row__right">
                    {q.answerDate ? (
                      <span class="spill spill--done">Vastattu</span>
                    ) : (
                      <span class="spill spill--draft">Vireillä</span>
                    )}
                    <span class="sit-go">Avaa →</span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div
              id="doc-empty"
              style="display:block;text-align:center;color:var(--muted);padding:40px 0"
            >
              Ei asiakirjoja näillä hakuehdoilla.
            </div>
          )
        ) : (
          <div
            id="doc-empty"
            style="display:block;text-align:center;color:var(--muted);padding:40px 0"
          >
            Ladataan…
          </div>
        )}
      </div>

      {data && (
        <div class="wrap" style="padding:0">
          <div class="source-note">
            <span>Lähde:</span>
            <span class="dset">
              Eduskunnan avoin data · VaskiData · WrittenQuestion
            </span>
            <span>·</span>
            <span class="fresh">haettu {data.fetchedAt}</span>
            <span>·</span>
            <span
              class="cite verify"
              data-mark="off"
              data-value={`${data.totalCount} asiakirjaa`}
              data-caption="Kirjalliset kysymykset — parlamenttiaineisto"
              data-set="Eduskunnan avoin data · VaskiData"
              data-table="WrittenQuestion"
              data-endpoint="SELECT * FROM WrittenQuestion ORDER BY submission_date DESC"
              data-record={`WrittenQuestion · ${data.totalCount} kpl`}
              data-jakso="Vaalikausi 2023–2027"
              data-fetched={data.fetchedAt}
              data-chain="avoindata.eduskunta.fi > WrittenQuestion > Asiakirjalista"
              data-url="https://avoindata.eduskunta.fi/"
              data-orig="Avaa aineisto"
            >
              varmenna jäljite
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
