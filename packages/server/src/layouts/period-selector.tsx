/** @jsxImportSource ../../src/jsx */
import { clsx } from "clsx";
import i18next from "i18next";
import type { PeriodSelectorData } from "../helpers/period-selector-data";

/** Renders the full period selector menu with checkboxes pre-checked
 *  from the server-side period selection. Falls back to the static
 *  skeleton when no periodData is provided.
 *
 *  Applying a selection is an htmx swap (no full reload): the Apply button
 *  GETs the current page with the chosen `period` and targets `#main-content`.
 *  When `oob` is set the whole selector is rendered as an out-of-band swap so
 *  the masthead badge/label re-render from server state after the swap. */
export default function PeriodSelector({
  periodData,
  activePath = "/",
  oob = false,
}: {
  periodData?: PeriodSelectorData;
  activePath?: string;
  oob?: boolean;
}) {
  const govs = periodData?.governments ?? [];
  const selected = new Set(periodData?.selectedIds ?? []);
  const desc = periodData?.description ?? {
    btnLabel: "",
    badge: "",
    badgeClass: "",
  };
  const hasData = govs.length > 0;
  const allSelected = hasData && selected.size === govs.length;
  // The `period` value submitted with the Apply button: "all" when every
  // government is selected, otherwise the sorted, comma-joined ids — matching
  // what the server's parsePeriod() expects. The island keeps this hidden
  // input in sync as checkboxes change; htmx submits it via hx-include.
  const periodValue = allSelected
    ? "all"
    : [...selected].sort((a, b) => a - b).join(",");

  return (
    <div
      class="period"
      id="period-selector"
      data-period
      hx-swap-oob={oob ? "true" : undefined}
    >
      <button class="period__btn" aria-expanded="false" aria-haspopup="true">
        <span class="period__k">
          {i18next.t("components:period_selector.label")}
        </span>
        <span class="period__v" data-period-v>
          {desc.btnLabel}
        </span>
        <span class={clsx("period__badge", desc.badgeClass)} data-period-badge>
          {desc.badge}
        </span>
        <span class="period__caret">▾</span>
      </button>
      <div class="period__menu" hidden role="menu">
        <div class="period__menu-head">
          {i18next.t("components:period_selector.select_heading")}
        </div>
        <div class="period__menu-list" data-period-menu-list>
          {hasData && (
            <>
              <label class="period__opt">
                <input
                  type="checkbox"
                  class="period__cb"
                  data-period-all
                  checked={allSelected}
                />
                <div class="period__opt-text">
                  <span class="period__opt-main">Kaikki hallituskaudet</span>
                  <span class="period__opt-sub">koko avoin data</span>
                </div>
              </label>
              {govs.map((gov) => (
                <label
                  class={clsx(
                    "period__opt",
                    selected.has(gov.id) && "is-selected",
                  )}
                >
                  <input
                    type="checkbox"
                    class="period__cb"
                    value={String(gov.id)}
                    checked={selected.has(gov.id)}
                  />
                  <div class="period__opt-text">
                    <span class="period__opt-main">{gov.name}</span>
                    <span class="period__opt-sub">{gov.dateRange}</span>
                  </div>
                </label>
              ))}
            </>
          )}
        </div>
        {hasData && (
          <>
            <input
              type="hidden"
              name="period"
              id="period-value"
              value={periodValue}
            />
            <button
              type="button"
              class="period__apply"
              hx-get={activePath}
              hx-target="#main-content"
              hx-swap="innerHTML"
              hx-push-url="true"
              hx-include="#period-value"
              hx-browser-indicator="true"
            >
              {i18next.t("components:period_selector.apply")}
            </button>
          </>
        )}
        <div class="period__note">
          {i18next.t("components:period_selector.note")}
        </div>
      </div>
    </div>
  );
}
