/** @jsxImportSource ../../../jsx */
import PageHead from "#server/components/page-head";
import { esc } from "#server/helpers/template-helpers";
import type { PuolueetData, PartyRow } from "./list.view-model";
import i18next from "i18next";

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
      <title>
        {i18next.t("common:page_title_format", {
          title: title || "",
          brand: i18next.t("common:brand_name"),
        })}
      </title>

      <div class="wrap">
        <PageHead
          kicker={i18next.t("puolueet:kicker")}
          heading={i18next.t("puolueet:heading")}
          subtitle={i18next.t("puolueet:subtitle", {
            seats: d.totalSeats,
            groups: d.rows.length,
          })}
        />

        {d.totalSeats > 0 && (
          <>
            <div class="bloc-bar bloc-bar--sm">
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
                {i18next.t("puolueet:gov_seats", { seats: d.govSeats })}
              </span>
              <span>
                <span class="dot" style="background:var(--red)"></span>
                {i18next.t("puolueet:opp_seats", { seats: d.oppSeats })}
              </span>
            </div>
          </>
        )}

        {govRows.length > 0 && (
          <div class="pgroup">
            <div class="week-head">
              <span class="week-head__k">{i18next.t("common:government")}</span>
              <span class="week-head__t">
                {i18next.t("puolueet:gov_label")}
              </span>
              <span class="week-head__meta">
                {i18next.t("puolueet:groups_label", { count: govRows.length })}
              </span>
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
              <span class="week-head__k">{i18next.t("common:opposition")}</span>
              <span class="week-head__t">
                {i18next.t("puolueet:opp_label")}
              </span>
              <span class="week-head__meta">
                {i18next.t("puolueet:groups_label", { count: oppRows.length })}
              </span>
            </div>
            <div class="prow-list">
              {oppRows.map((r) => (
                <PartyRowItem row={r} />
              ))}
            </div>
          </div>
        )}

        <div class="source-note mt-32">
          <span>{i18next.t("common:source")}</span>
          <span class="dset">
            Eduskunnan avoin data · MemberOfParliament + Voting
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
          <span class="prow__sub">
            {i18next.t("puolueet:chair_prefix")} {esc(row.chairName)}
          </span>
        )}
      </div>
      <div class="prow__seats">
        <b>{row.seatCount}</b>
        <small>
          {row.seatShare} {i18next.t("puolueet:share_of_seats")}
        </small>
      </div>
      <div class="prow__coh">
        <span class="prow__coh-k">{i18next.t("puolueet:cohesion_label")}</span>
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
