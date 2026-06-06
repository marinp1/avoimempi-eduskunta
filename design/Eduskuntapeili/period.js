/* Eduskuntapeili — tietojakso (data period) selector.
   Default = current electoral term / Orpo government. Choice syncs the
   masthead button, the footer statement, and persists across pages.
   Plain JS. Load with <script defer src="period.js">. */
(function () {
  'use strict';

  var PERIODS = {
    '2023': { label: 'Vaalikausi 2023–2027', gov: 'Orpon hallitus', badge: 'nykyinen',
              detail: '20.6.2023 – kesken · 200 paikkaa · hallitus 108 / oppositio 92' },
    '2019': { label: 'Vaalikausi 2019–2023', gov: 'Marinin / Rinteen hallitus', badge: 'päättynyt',
              detail: '6.6.2019 – 20.6.2023 · 200 paikkaa' },
    'all':  { label: 'Kaikki vaalikaudet', gov: 'koko avoin data', badge: 'koko aineisto',
              detail: '1907 – 2026 · kaikki kaudet ja jäsenyydet' }
  };
  var DEFAULT = '2023';
  var KEY = 'peili.period';

  function current() {
    var v = null;
    try { v = localStorage.getItem(KEY); } catch (e) {}
    return PERIODS[v] ? v : DEFAULT;
  }

  function apply(val) {
    var p = PERIODS[val] || PERIODS[DEFAULT];
    try { localStorage.setItem(KEY, val); } catch (e) {}

    // masthead button
    document.querySelectorAll('[data-period-v]').forEach(function (el) { el.textContent = p.label; });
    document.querySelectorAll('[data-period-badge]').forEach(function (el) {
      el.textContent = p.badge;
      el.classList.toggle('is-now', val === '2023');
    });
    // footer / inline statements
    document.querySelectorAll('[data-period-label]').forEach(function (el) { el.textContent = p.label + ' · ' + p.gov; });
    document.querySelectorAll('[data-period-detail]').forEach(function (el) { el.textContent = p.detail; });
    // trace popovers can read the active period from the body
    document.body.setAttribute('data-active-period', p.label);
    // menu selected state
    document.querySelectorAll('.period__opt').forEach(function (opt) {
      opt.classList.toggle('is-selected', opt.dataset.val === val);
      opt.setAttribute('aria-checked', opt.dataset.val === val ? 'true' : 'false');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    apply(current());

    var root = document.querySelector('[data-period]');
    if (!root) return;
    var btn = root.querySelector('.period__btn');
    var menu = root.querySelector('.period__menu');

    function openMenu() { menu.hidden = false; btn.setAttribute('aria-expanded', 'true'); }
    function closeMenu() { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      menu.hidden ? openMenu() : closeMenu();
    });
    root.querySelectorAll('.period__opt').forEach(function (opt) {
      opt.addEventListener('click', function () { apply(opt.dataset.val); closeMenu(); });
    });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) closeMenu(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  });

  window.EPPeriod = { apply: apply, current: current, PERIODS: PERIODS };
})();
