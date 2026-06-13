/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import type { RosterRow } from "#server/types/webapp";
import PageHead from "#server/components/page-head";
import i18next from "i18next";
import {
  type RosterParams,
  buildBlocBar,
  partyShortName,
} from "#server/helpers/template-helpers";
import RosterContent from "../fragments/roster-content.fragment";

interface Props {
  /** Page `<title>` suffix. */
  title?: string;
  /** All roster rows before filtering. */
  allRows: RosterRow[];
  /** Rows after applying the current filter/sort params. */
  filtered: RosterRow[];
  /** Current filter and sort parameters from the URL query string. */
  params: RosterParams;
  /** Pre-rendered HTML for the composition change detail section. */
  compDetailHtml?: string;
}

/** MP roster page with bloc bar, search, party filters, and sortable table. */
export default function Edustajat({
  title,
  allRows,
  filtered,
  params,
  compDetailHtml,
}: Props) {
  const q = params.q || "";
  const bloc = buildBlocBar(allRows, partyShortName);

  return (
    <>
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <PageHead
          kicker={i18next.t("persons:kicker")}
          heading={i18next.t("persons:heading", { count: allRows.length })}
          subtitle={i18next.t("persons:subtitle")}
        />
      </div>

      <div class="wrap pb-8">
        <div class="bloc-bar">
          {bloc.segments.map((seg) => (
            <span
              class={clsx("seg", `seg-${seg.side}`)}
              style={`width:${seg.width};background:${seg.color}`}
              title={`${seg.label} ${seg.count}`}
            ></span>
          ))}
        </div>
        <div class="bloc-legend">
          <span class="item">
            <span class="swatch" style="background:var(--hall)"></span>
            {i18next.t("common:government")} <b>{bloc.govTotal}</b>
          </span>
          <span class="item">
            <span class="swatch" style="background:var(--opp)"></span>
            {i18next.t("common:opposition")} <b>{bloc.oppTotal}</b>
          </span>
          <span class="note">
            {i18next.t("persons:count", { count: bloc.total })}
          </span>
        </div>
      </div>

      {compDetailHtml ? (
        compDetailHtml
      ) : (
        <div
          id="comp-detail"
          class="wrap"
          hx-get="/koostumusmuutos"
          hx-trigger="tl:ready from:document, tl:commit from:document"
          hx-include="#tl-date-input, #tl-period-input"
          hx-swap="outerHTML"
          hx-indicator="#comp-detail"
        ></div>
      )}

      <div class="wrap">
        <div class="toolbar">
          <label class="search">
            <span class="ic">⌕</span>
            <input
              id="mp-search"
              name="q"
              type="text"
              value={q}
              placeholder={i18next.t("persons:search_placeholder")}
              hx-get="/edustajat"
              hx-trigger="input changed delay:300ms"
              hx-target="#roster-content"
              hx-include="#sort-field,#dir-field"
              hx-push-url="true"
              hx-indicator="#roster-content"
              hx-sync="#roster-content:abort"
            />
          </label>
          <span class="count" id="mp-count">
            {i18next.t("persons:count_of", {
              filtered: filtered.length,
              total: allRows.length,
            })}
          </span>
        </div>
      </div>

      <div id="roster-content" class="wrap loading-overlay">
        <div class="htmx-indicator loading-spinner">
          {i18next.t("common:loading")}
        </div>
        <RosterContent allRows={allRows} filtered={filtered} params={params} />
      </div>
    </>
  );
}
