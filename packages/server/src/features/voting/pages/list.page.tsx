/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import PageHead from "#server/components/page-head";
import { esc } from "#server/helpers/template-helpers";
import i18next from "i18next";
import type { AanestyksetData, VoteRow } from "./list.view-model";

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
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <PageHead
          kicker={i18next.t("aanestykset:kicker")}
          heading={i18next.t("aanestykset:heading")}
          subtitle={`${i18next.t("aanestykset:subtitle")} · ${i18next.t("aanestykset:count", { count: d.totalCount })}`}
        />

        <div class="toolbar mt-20">
          <label class="search">
            <span class="ic">⌕</span>
            <input
              id="aanestys-search"
              type="search"
              name="q"
              placeholder={i18next.t("aanestykset:search_placeholder")}
              hx-get="/aanestykset"
              hx-trigger="keyup changed delay:300ms"
              hx-target="#main-content"
              hx-push-url="true"
              hx-swap="innerHTML"
            />
          </label>
          <span class="count">
            <b id="aanestys-count">
              {i18next.t("aanestykset:count", { count: d.totalCount })}
            </b>
          </span>
        </div>

        <div class="fchips mt-14">
          <button type="button" class="fchip is-active" data-filter="all">
            {i18next.t("aanestykset:filter_all")}
          </button>
          <button type="button" class="fchip" data-filter="lait">
            {i18next.t("aanestykset:filter_laws")}
          </button>
          <button type="button" class="fchip" data-filter="selonteot">
            {i18next.t("aanestykset:filter_reports")}
          </button>
          <button type="button" class="fchip" data-filter="luottamus">
            {i18next.t("aanestykset:filter_confidence")}
          </button>
          <button type="button" class="fchip" data-filter="tiukat">
            {i18next.t("aanestykset:filter_tight")}
          </button>
        </div>

        {d.groups.map((group) => (
          <div class="vgroup">
            <div class="week-head">
              <span class="week-head__k">
                {i18next.t("aanestykset:group_header")}
              </span>
              <span class="week-head__t">{esc(group.sessionDateLabel)}</span>
              <span class="week-head__meta">
                {i18next.t("aanestykset:count", { count: group.rows.length })}
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
            {i18next.t("aanestykset:none_found")}
          </div>
        )}

        <div class="source-note mt-32">
          <span>{i18next.t("common:source")}</span>
          <span class="dset">
            Eduskunnan avoin data · SaliDBAanestys + Vote
          </span>
          <span>·</span>
          <span class="fresh">
            {i18next.t("common:fetched", { timestamp: d.fetchedAt })}
          </span>
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
