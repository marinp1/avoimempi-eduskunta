/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import i18next from "i18next";
import Kicker from "../components/kicker";
import { esc } from "../helpers";

export interface DocumentRow {
  id: number;
  linkId: number;
  hasDetail: boolean;
  kind: string;
  identifier: string;
  title: string;
  date: string;
  dateLabel: string;
  authorName: string | null;
  authorParty: string | null;
  authorPartyColor: string;
  statusLabel: string | null;
  statusClass: string;
  subjects: string[];
  highlight: string | null;
}

export interface AsiakirjatIndexData {
  rows: DocumentRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  kind: string;
  fetchedAt: string;
}

export interface DocKindChip {
  key: string;
  chipLabel: string;
  dotColor: string;
}

export const DOC_KIND_CHIPS: DocKindChip[] = [
  {
    key: "kk",
    chipLabel: i18next.t("asiakirjat:chip_labels.kk"),
    dotColor: "var(--blue)",
  },
  {
    key: "suullinen",
    chipLabel: i18next.t("asiakirjat:chip_labels.suullinen"),
    dotColor: "var(--blue)",
  },
  {
    key: "valikysymys",
    chipLabel: i18next.t("asiakirjat:chip_labels.valikysymys"),
    dotColor: "var(--red)",
  },
  {
    key: "vastaus",
    chipLabel: i18next.t("asiakirjat:chip_labels.vastaus"),
    dotColor: "var(--hall)",
  },
  {
    key: "he",
    chipLabel: i18next.t("asiakirjat:chip_labels.he"),
    dotColor: "var(--opp)",
  },
  {
    key: "aloite",
    chipLabel: i18next.t("asiakirjat:chip_labels.aloite"),
    dotColor: "var(--hall)",
  },
  {
    key: "mietinto",
    chipLabel: i18next.t("asiakirjat:chip_labels.mietinto"),
    dotColor: "var(--muted)",
  },
  {
    key: "asiantuntija",
    chipLabel: i18next.t("asiakirjat:chip_labels.asiantuntija"),
    dotColor: "var(--faint)",
  },
  {
    key: "vastaus-edk",
    chipLabel: i18next.t("asiakirjat:chip_labels.vastaus-edk"),
    dotColor: "var(--hall)",
  },
];

interface Props {
  title?: string;
  data?: AsiakirjatIndexData;
  query?: string;
  kind?: string;
}

export default function Asiakirjat({ title, data, query, kind }: Props) {
  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <section class="page-head">
          <Kicker text={i18next.t("asiakirjat:kicker")} />
          <h1>{i18next.t("asiakirjat:heading")}</h1>
          <p class="sub">{i18next.t("asiakirjat:subtitle")}</p>
        </section>
      </div>

      <hr class="rule" />

      <AsiakirjatList data={data} query={query} kind={kind} />
    </>
  );
}

function AsiakirjatList({
  data,
  query,
  kind,
}: {
  data?: AsiakirjatIndexData;
  query?: string;
  kind?: string;
}) {
  const activeKind = kind ?? "";
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
      <div class="htmx-indicator loading-spinner">
        {i18next.t("common:loading")}
      </div>
      <div class="toolbar">
        <label class="search">
          <span class="ic">⌕</span>
          <input
            id="doc-search"
            type="text"
            autocomplete="off"
            placeholder={i18next.t("asiakirjat:search_placeholder")}
            name="q"
            value={query ?? ""}
            hx-get={`/asiakirjat${activeKind ? `?kind=${activeKind}` : ""}`}
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
            <b id="doc-count">{data.totalCount}</b>{" "}
            {i18next.t("asiakirjat:count", { count: data.totalCount })}
          </span>
        )}
      </div>

      <div class="fchips">
        <a
          class={clsx("fchip", { "is-active": !activeKind })}
          href="/asiakirjat"
        >
          {i18next.t("common:all")}
        </a>
        {DOC_KIND_CHIPS.map((chip) => (
          <a
            class={clsx("fchip", { "is-active": activeKind === chip.key })}
            href={`/asiakirjat?kind=${chip.key}`}
          >
            <span class="pdot" style={`background:${chip.dotColor}`}></span>
            {chip.chipLabel}
          </a>
        ))}
      </div>

      <div id="doc-root" class="loading-overlay">
        <div class="htmx-indicator loading-spinner">
          {i18next.t("common:loading")}
        </div>
        {data ? (
          data.rows.length > 0 ? (
            <div class="doc-list">
              {data.rows.map((row) => (
                <DocumentRowComponent row={row} />
              ))}
            </div>
          ) : (
            <div
              id="doc-empty"
              style="display:block;text-align:center;color:var(--muted);padding:40px 0"
            >
              {i18next.t("asiakirjat:none_found")}
            </div>
          )
        ) : (
          <div
            id="doc-empty"
            style="display:block;text-align:center;color:var(--muted);padding:40px 0"
          >
            {i18next.t("common:loading")}
          </div>
        )}
      </div>

      {data && (
        <div class="wrap" style="padding:0">
          <div class="source-note">
            <span>{i18next.t("common:source")}</span>
            <span class="dset">
              Eduskunnan avoin data · VaskiData
              {activeKind ? ` · ${currentChipLabel(activeKind)}` : ""}
            </span>
            <span>·</span>
            <span class="fresh">
              {i18next.t("common:fetched", { timestamp: data.fetchedAt })}
            </span>
            <span>·</span>
            <span
              class="cite verify"
              data-mark="off"
              data-value={`${data.totalCount} asiakirjaa`}
              data-caption="Parlamenttiasiakirjat"
              data-set="Eduskunnan avoin data · VaskiData"
              data-table="WrittenQuestion + muut asiakirjatyypit"
              data-endpoint="SELECT * FROM asiakirjat ORDER BY date DESC"
              data-record={`${data.totalCount} kpl`}
              data-jakso="Vaalikausi 2023–2027"
              data-fetched={data.fetchedAt}
              data-chain="avoindata.eduskunta.fi > Asiakirjat"
              data-url="https://avoindata.eduskunta.fi/"
              data-orig={i18next.t("common:open_original")}
            >
              {i18next.t("common:verify_trace")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentRowComponent({ row }: { row: DocumentRow }) {
  const href = row.hasDetail
    ? row.kind === "written_question"
      ? `/asiakirja/${row.linkId}`
      : `/asiakirja/${row.linkId}?kind=${row.kind}`
    : undefined;
  const inner = (
    <>
      <div class="doc-row__left">
        <span class="doc-row__id">{esc(row.identifier)}</span>
        <span class="pdot" style={`background:${row.authorPartyColor}`}></span>
      </div>
      <div class="doc-row__main">
        <div class="doc-row__title">{esc(row.title)}</div>
        <div class="doc-row__sub">
          {row.authorName && <span>{esc(row.authorName)}</span>}
          {row.date && (
            <>
              {row.authorName && <span class="sep"></span>}
              <span>{row.dateLabel}</span>
            </>
          )}
          {row.highlight && (
            <>
              <span class="sep"></span>
              <span>{esc(row.highlight)}</span>
            </>
          )}
        </div>
        {row.subjects.length > 0 && (
          <div class="doc-row__tags">
            {row.subjects.slice(0, 4).map((s) => (
              <span class="topic-tag">{esc(s)}</span>
            ))}
          </div>
        )}
      </div>
      <div class="doc-row__right">
        {row.statusLabel && (
          <span class={clsx("spill", row.statusClass)}>{row.statusLabel}</span>
        )}
        {row.hasDetail && (
          <span class="sit-go">{i18next.t("common:open")}</span>
        )}
      </div>
    </>
  );

  return row.hasDetail ? (
    <a class="doc-row" href={href} data-id={String(row.id)}>
      {inner}
    </a>
  ) : (
    <div class="doc-row">{inner}</div>
  );
}

function currentChipLabel(key: string): string {
  const chip = DOC_KIND_CHIPS.find((c) => c.key === key);
  return chip?.chipLabel ?? key;
}
