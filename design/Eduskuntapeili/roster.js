/* Eduskuntapeili — kansanedustajalistan suodatus & lajittelu.
   Toimii data-attribuuteilla (.mp-row[data-party][data-bloc][data-name][data-district]).
   Plain JS, defer. */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var rows = Array.prototype.slice.call(document.querySelectorAll('.mp-row'));
    var chips = document.querySelectorAll('.fchip');
    var search = document.getElementById('mp-search');
    var count = document.getElementById('mp-count');
    var sortBtns = document.querySelectorAll('.mp-sort');
    var list = document.querySelector('.mp-list');
    var activeParty = 'all';
    var q = '';

    function apply() {
      var shown = 0;
      rows.forEach(function (r) {
        var okP = activeParty === 'all' || r.dataset.party === activeParty || r.dataset.bloc === activeParty;
        var okQ = !q || r.dataset.name.indexOf(q) > -1 || (r.dataset.district || '').indexOf(q) > -1;
        var vis = okP && okQ;
        r.style.display = vis ? '' : 'none';
        if (vis) shown++;
      });
      if (count) count.textContent = shown;
    }

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        chips.forEach(function (x) { x.classList.remove('is-active'); });
        c.classList.add('is-active');
        activeParty = c.dataset.filter;
        apply();
      });
    });
    if (search) search.addEventListener('input', function () { q = search.value.trim().toLowerCase(); apply(); });

    var sortState = {};
    sortBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var key = b.dataset.sort;
        var dir = sortState[key] = (sortState[key] === 'asc' ? 'desc' : 'asc');
        sortBtns.forEach(function (x) { x.classList.remove('is-asc', 'is-desc'); });
        b.classList.add(dir === 'asc' ? 'is-asc' : 'is-desc');
        var sorted = rows.slice().sort(function (a, z) {
          var va = a.dataset[key] || '', vz = z.dataset[key] || '';
          var na = parseFloat(va), nz = parseFloat(vz);
          var cmp = (!isNaN(na) && !isNaN(nz)) ? na - nz : va.localeCompare(vz, 'fi');
          return dir === 'asc' ? cmp : -cmp;
        });
        sorted.forEach(function (r) { list.appendChild(r); });
      });
    });
  });
})();
