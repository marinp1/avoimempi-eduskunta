/* Eduskuntapeili — data provenance (jäljitettävyys) behaviour.
   - .cite elements open a shared popover built from their data-* attributes
   - .ai-sources-toggle expands a cited-records ledger
   Plain JS, no deps. Safe to load with <script defer>. */
(function () {
  'use strict';

  /* ---------- shared provenance popover ---------- */
  var pop = document.createElement('div');
  pop.className = 'trace-pop';
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Tietolähde');
  document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(pop); });

  var current = null;

  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function build(el) {
    var d = el.dataset;
    var chain = (d.chain || '').split('>').map(function (s) { return s.trim(); }).filter(Boolean);
    // code-style fields render in a tinted, wrapping block; plain fields inline.
    var fields = [
      ['Aineisto', d.set, false],
      ['Taulu', d.table, true],
      ['Rajapintakutsu', d.endpoint, true],
      ['Tietue', d.record, false],
      ['Jakso', d.jakso, false],
      ['Haettu', d.fetched, false]
    ].filter(function (r) { return r[1]; });

    pop.innerHTML =
      '<div class="trace-pop__bar"><span class="lbl">Tietolähde · jäljite</span>' +
        '<button class="trace-pop__close" aria-label="Sulje">\u00d7</button></div>' +
      '<div class="trace-pop__body">' +
        (d.value ? '<div class="trace-pop__value">' + esc(d.value) + '</div>' : '') +
        (d.caption ? '<div class="trace-pop__caption">' + esc(d.caption) + '</div>' : '') +
        '<div class="trace-fields">' +
          fields.map(function (r) {
            return '<div class="trace-field">' +
              '<div class="trace-field__k">' + esc(r[0]) + '</div>' +
              '<div class="trace-field__v' + (r[2] ? ' is-code' : '') + '">' + esc(r[1]) + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
        (chain.length ? '<div class="trace-pop__chain">' + chain.map(function (n, i) {
            return (i ? '<span class="arr">\u2192</span>' : '') + '<span class="node">' + esc(n) + '</span>';
          }).join('') + '</div>' : '') +
        '<div class="trace-pop__foot">' +
          (d.url ? '<a class="trace-pop__orig" href="' + esc(d.url) + '" target="_blank" rel="noopener">' + esc(d.orig || 'Avaa alkuperäinen') + ' \u2197</a>' : '<span></span>') +
          (d.fetched ? '<span class="trace-pop__fresh">tuore</span>' : '') +
        '</div>' +
      '</div>';
    pop.querySelector('.trace-pop__close').addEventListener('click', close);
  }

  function place(el) {
    pop.hidden = false;
    pop.style.left = '0px'; pop.style.top = '0px'; // reset so measurement is clean
    var r = el.getBoundingClientRect();
    var pw = pop.offsetWidth, ph = pop.offsetHeight;
    var sx = window.scrollX, sy = window.scrollY;
    var vw = document.documentElement.clientWidth, vh = window.innerHeight;
    // horizontal: align to cite, clamp inside viewport with 12px margin
    var left = Math.max(sx + 12, Math.min(r.left + sx, sx + vw - pw - 12));
    // vertical: prefer below; flip above if not enough room; clamp
    var below = r.bottom + sy + 8;
    var above = r.top + sy - ph - 8;
    var roomBelow = vh - r.bottom;
    var top = (roomBelow >= ph + 16 || r.top < ph + 16) ? below : above;
    top = Math.max(sy + 12, Math.min(top, sy + vh - ph - 12));
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function open(el) {
    if (current) current.setAttribute('aria-expanded', 'false');
    current = el;
    el.setAttribute('aria-expanded', 'true');
    build(el);
    place(el);
  }
  function close() {
    pop.hidden = true;
    if (current) { current.setAttribute('aria-expanded', 'false'); current = null; }
  }

  document.addEventListener('click', function (e) {
    var c = e.target.closest('.cite');
    if (c) {
      e.preventDefault();
      if (current === c) { close(); } else { open(c); }
      return;
    }
    if (!e.target.closest('.trace-pop')) close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
    var c = e.target.closest && e.target.closest('.cite');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); current === c ? close() : open(c); }
  });
  window.addEventListener('resize', close);
  window.addEventListener('scroll', function () { if (current) place(current); }, true);

  /* make every .cite keyboard-focusable */
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.cite').forEach(function (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-expanded', 'false');
      if (!el.querySelector('.cite__mark') && el.dataset.mark !== 'off') {
        var m = document.createElement('sup');
        m.className = 'cite__mark';
        m.textContent = el.dataset.markText || '\u2217';
        el.appendChild(m);
      }
    });

    /* ---------- AI source ledger toggles ---------- */
    document.querySelectorAll('.ai-sources-toggle').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var scope = btn.closest('.ai, .summary');
        var tgt = btn.dataset.target ? document.getElementById(btn.dataset.target)
                                     : (scope && scope.querySelector('.ai-sources'));
        if (!tgt) return;
        var openNow = tgt.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', openNow ? 'true' : 'false');
        var lbl = btn.querySelector('.lbl');
        if (lbl) lbl.textContent = openNow ? 'Piilota lähteet' : btn.dataset.label;
      });
    });
  });
})();
