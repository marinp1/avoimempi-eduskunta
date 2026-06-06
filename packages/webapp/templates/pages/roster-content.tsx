/** @jsxImportSource ../../src/jsx */
import type { RosterRow } from "../../../server/database/repositories/person-repository";
import {
  CHIP_PARTIES,
  type RosterParams,
  age,
  buildHref,
  districtShort,
  esc,
  partyColor,
  partyShortName,
  sortClass,
  sortHref,
} from "../helpers";

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
          <b>{filtered.length}</b> / {allRows.length} edustajaa
        </span>
      )}

      <div class="fchips">
        <a
          class={`fchip${!activeParty || activeParty === "all" ? " is-active" : ""}`}
          href="/edustajat"
          hx-get="/edustajat"
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          Kaikki
        </a>

        <a
          class={`fchip${activeBloc === "hallitus" ? " is-active" : ""}`}
          href={hallHref}
          hx-get={hallHref}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          <span class="pdot" style="background:var(--hall)"></span>Hallitus
        </a>

        <a
          class={`fchip${activeBloc === "oppositio" ? " is-active" : ""}`}
          href={oppHref}
          hx-get={oppHref}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          <span class="pdot" style="background:var(--opp)"></span>Oppositio
        </a>

        {CHIP_PARTIES.map((cp) => {
          const cpHref = buildHref({
            ...params,
            party: cp.code,
            bloc: undefined,
          });
          return (
            <a
              class={`fchip${activeParty === cp.code ? " is-active" : ""}`}
              href={cpHref}
              hx-get={cpHref}
              hx-target="#roster-content"
              hx-push-url="true"
              hx-indicator="#roster-content"
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

      <div class="mp-table-head">
        <span></span>
        <a
          class={sortClass(params, "name")}
          href={sortHref(params, "name")}
          hx-get={sortHref(params, "name")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          Edustaja <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "party")}
          href={sortHref(params, "party")}
          hx-get={sortHref(params, "party")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          Ryhmä <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "district")}
          href={sortHref(params, "district")}
          hx-get={sortHref(params, "district")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          Vaalipiiri <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "age", true)}
          href={sortHref(params, "age")}
          hx-get={sortHref(params, "age")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          Ikä <span class="ar"></span>
        </a>
        <a
          class={sortClass(params, "att", true)}
          href={sortHref(params, "att")}
          hx-get={sortHref(params, "att")}
          hx-target="#roster-content"
          hx-push-url="true"
          hx-indicator="#roster-content"
        >
          Läsnäolo <span class="ar"></span>
        </a>
      </div>

      <div id="mp-list">
        {filtered.map((r) => {
          const color = partyColor(r.group_abbreviation || "");
          const shortParty = partyShortName(r.group_abbreviation || "");
          const bloc = r.is_in_government === 1 ? "Hallitus" : "Oppositio";
          const firstName = esc(r.first_name);
          const lastName = esc(r.last_name);
          const district = esc(districtShort(r.district_name));
          const grp = r.group_abbreviation || "unknown";
          const attW = Math.min(100, Math.max(0, r.participation_rate));

          return (
            <a
              class="mp-row"
              href={`/edustaja/${r.person_id}`}
              data-name={`${r.first_name} ${r.last_name}`.toLowerCase()}
              data-party={grp}
              data-bloc={bloc.toLowerCase()}
              data-district={r.district_name?.toLowerCase() ?? ""}
            >
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
