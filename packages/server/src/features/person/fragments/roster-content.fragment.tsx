/** @jsxImportSource ../../../jsx */
import { clsx } from "clsx";
import type { RosterRow } from "#server/features/person/person.repository";
import i18next from "i18next";
import {
  CHIP_PARTIES,
  type RosterParams,
  age,
  buildHref,
  districtShort,
  partyColor,
  partyShortName,
  sortClass,
  sortHref,
} from "#server/helpers/template-helpers";

interface Props {
  /** All roster rows before filtering. */
  allRows: RosterRow[];
  /** Rows after applying the current filter/sort params. */
  filtered: RosterRow[];
  /** Current filter and sort parameters from the URL query string. */
  params: RosterParams;
  /** When true, emits the MP count span with `hx-swap-oob="true"` for out-of-band updates. */
  oob?: boolean;
}

function sortAria(params: RosterParams, key: string) {
  const active = params.sort === key || (!params.sort && key === "name");
  if (!active) return "none";
  return params.dir === "desc" ? "descending" : "ascending";
}

/** Roster table body with party filter chips, sortable headers, and MP rows. */
export default function RosterContent({
  allRows,
  filtered,
  params,
  oob,
}: Props) {
  const activeParty = params.party || "all";
  const activeBloc = params.bloc || "";

  const hallHref = buildHref({ ...params, bloc: "hallitus", party: undefined });
  const oppHref = buildHref({ ...params, bloc: "oppositio", party: undefined });

  return (
    <>
      {oob && (
        <span id="mp-count" hx-swap-oob="true">
          {i18next.t("persons:count_of", {
            filtered: filtered.length,
            total: allRows.length,
          })}
        </span>
      )}

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

      <div class="fchips" hx-sync="#roster-content:abort">
        <a
          class={clsx("fchip", {
            "is-active": !activeParty || activeParty === "all",
          })}
          href="/edustajat"
          hx-get="/edustajat"
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-current={
            !activeParty || activeParty === "all" ? "page" : undefined
          }
        >
          {i18next.t("common:all")}
        </a>

        <a
          class={clsx("fchip", { "is-active": activeBloc === "hallitus" })}
          href={hallHref}
          hx-get={hallHref}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-current={activeBloc === "hallitus" ? "page" : undefined}
        >
          <span class="pdot" style="background:var(--hall)"></span>
          {i18next.t("common:government")}
        </a>

        <a
          class={clsx("fchip", { "is-active": activeBloc === "oppositio" })}
          href={oppHref}
          hx-get={oppHref}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-current={activeBloc === "oppositio" ? "page" : undefined}
        >
          <span class="pdot" style="background:var(--opp)"></span>
          {i18next.t("common:opposition")}
        </a>

        {CHIP_PARTIES.map((cp) => {
          const cpHref = buildHref({
            ...params,
            party: cp.code,
            bloc: undefined,
          });
          return (
            <a
              class={clsx("fchip", { "is-active": activeParty === cp.code })}
              href={cpHref}
              hx-get={cpHref}
              hx-target="#roster-content"
              hx-push-url="true"
              hx-indicator="#roster-content"
              aria-current={activeParty === cp.code ? "page" : undefined}
            >
              <span
                class="pdot"
                style={`background:${partyColor(cp.code)}`}
              ></span>
              {cp.label}
            </a>
          );
        })}
      </div>

      <div class="mp-table-head" hx-sync="#roster-content:abort">
        <span></span>
        <a
          class={sortClass(params, "name")}
          href={sortHref(params, "name")}
          hx-get={sortHref(params, "name")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-sort={sortAria(params, "name")}
        >
          {i18next.t("persons:col_name")} <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "party")}
          href={sortHref(params, "party")}
          hx-get={sortHref(params, "party")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-sort={sortAria(params, "party")}
        >
          {i18next.t("persons:col_party")} <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "district")}
          href={sortHref(params, "district")}
          hx-get={sortHref(params, "district")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-sort={sortAria(params, "district")}
        >
          {i18next.t("persons:col_district")} <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "age", true)}
          href={sortHref(params, "age")}
          hx-get={sortHref(params, "age")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-sort={sortAria(params, "age")}
        >
          {i18next.t("persons:col_age")} <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "att", true)}
          href={sortHref(params, "att")}
          hx-get={sortHref(params, "att")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
          aria-sort={sortAria(params, "att")}
        >
          {i18next.t("persons:col_attendance")} <span class="ar"></span>
        </a>
      </div>

      <div id="mp-list">
        {filtered.map((r) => {
          const color = partyColor(r.group_abbreviation || "");
          const shortParty = partyShortName(r.group_abbreviation || "");
          const bloc =
            r.is_in_government === 1
              ? i18next.t("common:government")
              : i18next.t("common:opposition");
          const firstName = r.first_name;
          const lastName = r.last_name;
          const district = districtShort(r.district_name);
          const attW = Math.min(100, Math.max(0, r.participation_rate));

          return (
            <a class="mp-row" href={`/edustaja/${r.person_id}`}>
              <span class="c-dot">
                <span style={`background:${color}`}></span>
              </span>
              <span class="mp-name">
                {firstName} {lastName}
              </span>
              <span class="mp-party">
                {shortParty} <small>{bloc}</small>
              </span>
              <span class="mp-district">{district}</span>
              <span class="mp-age">{age(r.birth_year)}</span>
              <span class="mp-att">
                <span class="track">
                  <span class="fill" style={`width:${attW.toFixed(0)}%`}></span>
                </span>
                <span class="pct">{r.participation_rate.toFixed(0)} %</span>
              </span>
            </a>
          );
        })}
      </div>
    </>
  );
}
