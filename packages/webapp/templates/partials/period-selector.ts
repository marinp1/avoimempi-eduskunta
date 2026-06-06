/** Tagged template helper for raw HTML string building. */
const html = (strings: TemplateStringsArray, ...values: unknown[]) =>
  String.raw({ raw: strings }, ...values);

/** Period selector dropdown rendered as a static HTML string (no JSX). */
export default () => html`
  <div class="period" data-period>
    <button class="period__btn" aria-expanded="false" aria-haspopup="true">
      <span class="period__k">Tietojakso</span>
      <span class="period__v" data-period-v></span>
      <span class="period__badge" data-period-badge></span>
      <span class="period__caret">▾</span>
    </button>
    <div class="period__menu" hidden role="menu">
      <div class="period__menu-head">Valitse tietojakso</div>
      <button
        class="period__opt"
        role="menuitemradio"
        aria-checked="false"
        data-val="2023"
      >
        <span class="period__opt-main">Vaalikausi 2023 - 2027</span>
        <span class="period__opt-sub">Orpon hallitus · nykyinen</span>
      </button>
      <button
        class="period__opt"
        role="menuitemradio"
        aria-checked="false"
        data-val="2019"
      >
        <span class="period__opt-main">Vaalikausi 2019 - 2023</span>
        <span class="period__opt-sub">Marinin / Rinteen hallitus</span>
      </button>
      <button
        class="period__opt"
        role="menuitemradio"
        aria-checked="false"
        data-val="all"
      >
        <span class="period__opt-main">Kaikki vaalikaudet</span>
        <span class="period__opt-sub">koko avoin data</span>
      </button>
      <div class="period__note">
        Tietojakso rajaa kaikki sivun luvut ja koosteet. Oletuksena nykyinen
        kausi.
      </div>
    </div>
  </div>
`;
