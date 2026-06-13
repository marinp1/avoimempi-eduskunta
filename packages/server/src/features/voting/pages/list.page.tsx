/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import PageHead from "#server/components/page-head";
import i18next from "i18next";
import type { AanestyksetData, VoteGroup, VoteRow } from "./list.view-model";

const NAV = {
  "hx-target": "#main-content",
  "hx-push-url": "true",
  "hx-swap": "innerHTML",
} as const;

interface Props {
  title?: string;
  data: AanestyksetData;
}

const FILTER_CHIPS: Array<{
  key: string | null;
  labelKey: string;
  dotColor: string | null;
}> = [
  { key: null, labelKey: "votings:filter_all", dotColor: null },
  { key: "lait", labelKey: "votings:filter_laws", dotColor: "var(--hall)" },
  { key: "selonteot", labelKey: "votings:filter_reports", dotColor: "#4caf50" },
  {
    key: "luottamus",
    labelKey: "votings:filter_confidence",
    dotColor: "var(--red)",
  },
  { key: "tiukat", labelKey: "votings:filter_tight", dotColor: "#f90" },
];

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
          kicker={i18next.t("votings:kicker")}
          heading={i18next.t("votings:heading")}
          subtitle={`${i18next.t("votings:subtitle")} · ${i18next.t("votings:count", { count: d.totalCount })}`}
        />

        <div class="toolbar mt-20">
          <label class="search">
            <span class="ic">⌕</span>
            <input
              id="aanestys-search"
              type="search"
              name="q"
              placeholder={i18next.t("votings:search_placeholder")}
              hx-get="/aanestykset"
              hx-trigger="keyup changed delay:300ms"
              hx-target="#main-content"
              hx-push-url="true"
              hx-swap="innerHTML"
            />
          </label>
          <span class="count">
            <b id="aanestys-count">
              {i18next.t("votings:count", { count: d.totalCount })}
            </b>
          </span>
        </div>

        <div class="fchips mt-14">
          {FILTER_CHIPS.map((chip) => {
            const isActive = d.activeFilter === chip.key;
            const href = chip.key
              ? `/aanestykset?type=${chip.key}`
              : "/aanestykset";
            return (
              <a
                href={href}
                hx-get={href}
                {...NAV}
                class={clsx("fchip", isActive && "is-active")}
              >
                {chip.dotColor && (
                  <span
                    class="pdot"
                    style={`background:${chip.dotColor}`}
                  ></span>
                )}
                {i18next.t(chip.labelKey)}
              </a>
            );
          })}
        </div>

        <VoteGroupsAndMore data={d} />

        {d.groups.length === 0 && (
          <div style="text-align:center;color:var(--muted);padding:40px 0">
            {i18next.t("votings:none_found")}
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

function VoteGroupsAndMore({ data }: { data: AanestyksetData }) {
  return (
    <>
      {data.groups.map((group) => (
        <VoteGroupBlock group={group} />
      ))}
      {data.nextCursor && (
        <button
          id="vote-load-more"
          class="load-more-btn"
          hx-get={`/aanestykset?cursor=${encodeURIComponent(data.nextCursor)}${data.activeFilter ? `&type=${data.activeFilter}` : ""}&load_more=1`}
          hx-target="this"
          hx-swap="outerHTML"
          hx-browser-indicator="true"
        >
          {i18next.t("votings:load_more")}
        </button>
      )}
    </>
  );
}

/** Partial fragment returned for click-to-load requests (?load_more=1). */
export function VoteGroupsFragment({ data }: { data: AanestyksetData }) {
  return (
    <>
      {data.groups.map((group) => (
        <VoteGroupBlock group={group} />
      ))}
      {data.nextCursor && (
        <button
          id="vote-load-more"
          class="load-more-btn"
          hx-get={`/aanestykset?cursor=${encodeURIComponent(data.nextCursor)}${data.activeFilter ? `&type=${data.activeFilter}` : ""}&load_more=1`}
          hx-target="this"
          hx-swap="outerHTML"
          hx-browser-indicator="true"
        >
          {i18next.t("votings:load_more")}
        </button>
      )}
    </>
  );
}

function VoteGroupBlock({ group }: { group: VoteGroup }) {
  return (
    <div class="vgroup">
      <div class="week-head">
        <span class="week-head__k">{i18next.t("votings:group_header")}</span>
        <span class="week-head__t">{group.sessionDateLabel}</span>
        <span class="week-head__meta">
          {i18next.t("votings:count", { count: group.rows.length })}
        </span>
      </div>
      <div class="vrow-list">
        {group.rows.map((row) => (
          <VoteRowItem row={row} />
        ))}
      </div>
    </div>
  );
}

function VoteRowItem({ row }: { row: VoteRow }) {
  return (
    <a
      href={`/aanestys/${row.id}`}
      hx-get={`/aanestys/${row.id}`}
      {...NAV}
      class="vrow"
    >
      <div class="vrow__rail">
        <span class="vrow__id">Ä {row.votingNumber}</span>
        <span class="vrow__time">{row.time}</span>
      </div>
      <div class="vrow__main">
        <span class="vrow__q">{row.questionText || row.title}</span>
        {row.documents.length > 0 && (
          <div class="vrow__docs">
            {row.documents.map((doc) => (
              <span class={clsx("ag-doc", doc.isCommittee && "cmt")}>
                {doc.label}
              </span>
            ))}
          </div>
        )}
        {row.references.length > 0 && (
          <div class="vrow__links">
            {row.references.map((ref, i) => (
              <>
                {i > 0 && " · "}
                <span class="ref">{ref.label}</span>
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
