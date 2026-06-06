/** @jsxImportSource ../../src/jsx */

/** Period selector dropdown container.
 *  Menu items are injected by the client island (period-island.tsx)
 *  which fetches real government periods from /api/hallituskaudet. */
export default function PeriodSelector() {
  return (
    <div class="period" data-period>
      <button class="period__btn" aria-expanded="false" aria-haspopup="true">
        <span class="period__k">Tietojakso</span>
        <span class="period__v" data-period-v></span>
        <span class="period__badge" data-period-badge></span>
        <span class="period__caret">▾</span>
      </button>
      <div class="period__menu" hidden role="menu">
        <div class="period__menu-head">Valitse hallituskaudet</div>
        <div class="period__menu-list" data-period-menu-list></div>
        <div class="period__note">
          Valitse yksi tai useampi hallituskausi. Pitämällä Shift-näppäintä
          pohjassa voit valita peräkkäisiä kausia. Oletuksena nykyinen kausi.
        </div>
      </div>
    </div>
  );
}
