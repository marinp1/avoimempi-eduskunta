/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";

/** Period selector dropdown container.
 *  Menu items are injected by the client island (period-island.tsx)
 *  which fetches real government periods from /api/hallituskaudet. */
export default function PeriodSelector() {
  return (
    <div class="period" data-period>
      <button class="period__btn" aria-expanded="false" aria-haspopup="true">
        <span class="period__k">
          {i18next.t("components:period_selector.label")}
        </span>
        <span class="period__v" data-period-v></span>
        <span class="period__badge" data-period-badge></span>
        <span class="period__caret">▾</span>
      </button>
      <div class="period__menu" hidden role="menu">
        <div class="period__menu-head">
          {i18next.t("components:period_selector.select_heading")}
        </div>
        <div class="period__menu-list" data-period-menu-list></div>
        <div class="period__note">
          {i18next.t("components:period_selector.note")}
        </div>
      </div>
    </div>
  );
}
