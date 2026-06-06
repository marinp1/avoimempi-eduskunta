/* ============================================================
   Eduskuntapeili — Aikajana (time-domain scrubber)
   ------------------------------------------------------------
   Core principle: every figure on the page is relative to a point
   in time. The vaalikausi (period.js) sets the outer bounds; this
   module lets you scrub to any sitting day within it and re-renders
   the front page as "Parliament as of that date."

   - Snaps to sitting days (that is where data exists).
   - Drag handle / click track / ‹prev–next› / keyboard arrows.
   - Updates: lead, session line, a time-accruing stat, the AI
     synthesis, and the rail's "term-so-far" facts.
   - Position persists per term in localStorage.

   Plain JS. Load with <script defer src="timeline.js"> AFTER period.js.
   ============================================================ */
(function () {
  'use strict';

  var TODAY = '2026-05-28'; // the live "now" for this prototype

  /* ---- sitting-day datasets, per vaalikausi ----
     Each entry is one täysistunto. Ascending by date.
     stats/ai/agenda etc. are what the page shows "as of" that day. */

  var DATA_2023 = [
    { d:'2023-09-05', id:'2023/40',  type:'vote', wd:'tiistai',   time:'klo 14.00', agenda:'5 kohtaa',
      head:'Hallitusohjelman tiedonanto — luottamusäänestys', sittings:40, aiCount:3,
      ai:'Syysistuntokausi avautui hallitusohjelman tiedonannon käsittelyllä. Eduskunta antoi Orpon hallitukselle luottamuksen äänin 108–92.' },
    { d:'2023-12-15', id:'2023/78',  type:'vote', wd:'perjantai', time:'klo 11.00', agenda:'12 kohtaa',
      head:'Valtion talousarvio 2024 hyväksyttiin', sittings:78, aiCount:5,
      ai:'Eduskunta hyväksyi valtion talousarvion vuodelle 2024. Oppositio jätti lukuisia vastalauseita, jotka äänestettiin nurin loppukäsittelyssä.' },
    { d:'2024-02-28', id:'2024/8',   type:'talk', wd:'keskiviikko', time:'klo 14.00', agenda:'4 kohtaa',
      head:'Lähetekeskustelu: sosiaaliturvauudistus', sittings:96, aiCount:2,
      ai:'Hallituksen esitys sosiaaliturvan uudistamisesta lähetettiin valiokuntaan vilkkaan lähetekeskustelun jälkeen.' },
    { d:'2024-04-17', id:'2024/35',  type:'vote', wd:'keskiviikko', time:'klo 16.00', agenda:'7 kohtaa',
      head:'Työttömyysturvan muutokset hyväksyttiin niukasti', sittings:123, aiCount:4,
      ai:'Työttömyysturvan leikkaukset hyväksyttiin niukalla enemmistöllä. Äänestys oli siihenastisen kauden tiukimpia.' },
    { d:'2024-06-19', id:'2024/68',  type:'vote', wd:'keskiviikko', time:'klo 13.00', agenda:'9 kohtaa',
      head:'Kevätistuntokauden päätös · turvallisuusselonteko', sittings:151, aiCount:4,
      ai:'Kevätistuntokausi päättyi turvallisuuspoliittisen selonteon hyväksymiseen laajalla enemmistöllä.' },
    { d:'2024-09-10', id:'2024/82',  type:'talk', wd:'tiistai',   time:'klo 14.00', agenda:'3 kohtaa',
      head:'Syysistuntokausi alkaa · pääministerin ilmoitus', sittings:170, aiCount:2,
      ai:'Pääministeri antoi ilmoituksen talouden näkymistä syysistuntokauden avajaisissa. Lähetekeskustelu kävi vilkkaana.' },
    { d:'2024-12-18', id:'2024/130', type:'vote', wd:'keskiviikko', time:'klo 11.00', agenda:'14 kohtaa',
      head:'Talousarvio 2025 — vastalauseet hylättiin', sittings:218, aiCount:6,
      ai:'Talousarvio 2025 hyväksyttiin hallituksen esityksen mukaisena. Opposition vaihtoehtobudjetit kaatuivat äänestyksissä.' },
    { d:'2025-03-12', id:'2025/18',  type:'vote', wd:'keskiviikko', time:'klo 16.00', agenda:'8 kohtaa',
      head:'Sote-rahoituslaki läpi äänin 102–95', sittings:236, aiCount:4,
      ai:'Sosiaali- ja terveydenhuollon rahoituslaki hyväksyttiin hallituksen riveillä. Keskustelu kävi kuumana hoitojonoista.' },
    { d:'2025-05-21', id:'2025/52',  type:'talk', wd:'keskiviikko', time:'klo 15.00', agenda:'2 kohtaa',
      head:'Välikysymys terveydenhuollon hoitojonoista', sittings:270, aiCount:3,
      ai:'Oppositio jätti välikysymyksen terveydenhuollon jonoista. Hallitus selvisi luottamusäänestyksestä äänin 107–91.' },
    { d:'2025-06-18', id:'2025/70',  type:'vote', wd:'keskiviikko', time:'klo 13.00', agenda:'10 kohtaa',
      head:'Kevätkauden päätös · ilmastolain muutos', sittings:288, aiCount:4,
      ai:'Kevätistuntokausi päättyi ilmastolain muutosten hyväksymiseen. Tavoiteaikataulusta äänestettiin tiukasti.' },
    { d:'2025-09-09', id:'2025/84',  type:'talk', wd:'tiistai',   time:'klo 14.00', agenda:'3 kohtaa',
      head:'Budjettiriihen jälkeinen lähetekeskustelu', sittings:302, aiCount:2,
      ai:'Syyskausi käynnistyi budjettiriihen linjausten lähetekeskustelulla. Painopisteinä työllisyys ja velkaantuminen.' },
    { d:'2025-12-16', id:'2025/128', type:'vote', wd:'tiistai',   time:'klo 11.00', agenda:'13 kohtaa',
      head:'Talousarvio 2026 hyväksyttiin 105–94', sittings:346, aiCount:5,
      ai:'Talousarvio 2026 hyväksyttiin. Loppuäänestys oli aiempia vuosia tiukempi hallituksen sisäisten erimielisyyksien vuoksi.' },
    { d:'2026-02-25', id:'2026/9',   type:'talk', wd:'keskiviikko', time:'klo 14.00', agenda:'4 kohtaa',
      head:'Lähetekeskustelu: energia- ja ilmastostrategia', sittings:358, aiCount:3,
      ai:'Kansallinen energia- ja ilmastostrategian selonteko lähetettiin valiokuntakäsittelyyn pitkän lähetekeskustelun jälkeen.' },
    { d:'2026-03-11', id:'2026/21',  type:'vote', wd:'keskiviikko', time:'klo 16.00', agenda:'6 kohtaa',
      head:'Lakiehdotusten hyväksyminen — seitsemän äänen ero (83–76)', sittings:370, aiCount:4,
      ai:'Lakiehdotukset hyväksyttiin vain seitsemän äänen erolla — vaalikauden tiukin äänestys tähän mennessä.' },
    { d:'2026-05-13', id:'2026/48',  type:'vote', wd:'keskiviikko', time:'klo 15.00', agenda:'5 kohtaa',
      head:'Luottamuslause / Tuppuraisen ehdotus kaatui 99–86', sittings:397, aiCount:4,
      ai:'Hallitus sai luottamuksen Tuppuraisen epäluottamusehdotuksen kaaduttua äänin 99–86.' },
    { d:'2026-05-28', id:'2026/57',  type:'vote', wd:'torstai',   time:'klo 16.00', agenda:'8 kohtaa · päiväjärjestys lopullinen',
      head:'Ilmastostrategia läpi niukasti, talouspolitiikasta välikysymys', sittings:412, aiCount:4,
      ai:'Viikon istunnoissa painottui talous- ja ilmastopolitiikka. Hallitus vei läpi kansallisen energia- ja ilmastostrategian selonteon niukalla enemmistöllä, ja oppositio jätti välikysymyksen talouspolitiikasta. Äänestyskuri piti molemmissa blokeissa: ryhmäkurin ylityksiä oli vain kuusi.' }
  ];

  // government / opposition figures hold across this term
  DATA_2023.forEach(function (e) { e.stats = { total: '200', hall: '108', opp: '92' }; });

  var DATA_2019 = [
    { d:'2019-06-06', id:'2019/2',   type:'vote', wd:'torstai', time:'klo 12.00', agenda:'3 kohtaa',
      head:'Pääministeri Rinteen hallituksen ohjelman tiedonanto', sittings:2, aiCount:2,
      ai:'Vaalikausi avautui Rinteen hallituksen ohjelman tiedonannolla. Eduskunta antoi hallitukselle luottamuksen.' },
    { d:'2019-12-19', id:'2019/95',  type:'vote', wd:'torstai', time:'klo 11.00', agenda:'11 kohtaa',
      head:'Valtion talousarvio 2020 hyväksyttiin', sittings:95, aiCount:4,
      ai:'Eduskunta hyväksyi talousarvion vuodelle 2020 Marinin hallituksen ensimmäisenä budjettina.' },
    { d:'2021-06-30', id:'2021/86',  type:'vote', wd:'keskiviikko', time:'klo 18.00', agenda:'7 kohtaa',
      head:'EU:n elpymispaketti hyväksyttiin määräenemmistöllä', sittings:86, aiCount:5,
      ai:'Eduskunta hyväksyi EU:n elpymisvälineen omien varojen päätöksen pitkän käsittelyn jälkeen.' },
    { d:'2023-03-01', id:'2023/178', type:'vote', wd:'keskiviikko', time:'klo 14.00', agenda:'9 kohtaa',
      head:'Vaalikauden viimeinen täysistunto', sittings:178, aiCount:3,
      ai:'Vaalikauden viimeinen täysistunto päätti Marinin hallituskauden lainsäädäntötyön ennen kevään vaaleja.' }
  ];
  DATA_2019.forEach(function (e) { e.stats = { total: '200', hall: '117', opp: '83' }; });

  var DATASETS = {
    '2023': DATA_2023,
    '2019': DATA_2019,
    'all':  DATA_2019.concat(DATA_2023)
  };

  /* ---- rail facts that accrue over the term (computed by selected date) ---- */
  function tightestVote(iso) {
    // the tightest vote "so far" as of the selected date
    if (iso >= '2026-03-11') return { n: '7',  when: '11.3.2026',  jaa: 83,  ei: 76 };
    if (iso >= '2025-12-16') return { n: '11', when: '16.12.2025', jaa: 105, ei: 94 };
    if (iso >= '2024-04-17') return { n: '18', when: '17.4.2024',  jaa: 101, ei: 83 };
    return { n: '34', when: '5.9.2023', jaa: 108, ei: 92 };
  }
  function latestInterp(iso) {
    if (iso >= '2026-04-30') return { title:'Välikysymys hallituksen talouspolitiikan epäonnistumisesta', who:'Tytti Tuppurainen (sd)', n:'56 allekirjoittajaa', when:'jätetty 30.4.2026' };
    if (iso >= '2025-05-21') return { title:'Välikysymys terveydenhuollon hoitojonoista', who:'Aino-Kaisa Pekonen (vas)', n:'48 allekirjoittajaa', when:'jätetty 21.5.2025' };
    if (iso >= '2023-09-05') return { title:'Välikysymys valtion velkaantumisesta', who:'Antti Lindtman (sd)', n:'52 allekirjoittajaa', when:'jätetty 14.11.2023' };
    return { title:'—', who:'', n:'ei välikysymyksiä', when:'' };
  }

  /* ---- helpers ---- */
  function fmt(iso) { var p = iso.split('-'); return (+p[2]) + '.' + (+p[1]) + '.' + p[0]; }
  function ms(iso) { return Date.parse(iso + 'T00:00:00'); }
  function $(s, r) { return (r || document).querySelector(s); }
  function setText(sel, txt) { var el = $(sel); if (el) el.textContent = txt; }
  // update a .cite's visible value without destroying trace.js's appended marker
  function setCiteText(sel, txt) {
    var el = $(sel); if (!el) return;
    if (el.firstChild && el.firstChild.nodeType === 3) el.firstChild.nodeValue = txt;
    else el.insertBefore(document.createTextNode(txt), el.firstChild);
    el.setAttribute('data-value', txt);
  }

  var MONTHS = ['tammi','helmi','maalis','huhti','touko','kesä','heinä','elo','syys','loka','marras','joulu'];

  /* ---- scrubber markup (auto-injected after the masthead on every page) ---- */
  var SCRUBBER_HTML =
    '<div class="tl__head">' +
      '<div class="tl__lead">' +
        '<span class="tl__kicker">Tarkasteluhetki</span>' +
        '<span class="tl__date" data-tl-date>28.5.2026</span>' +
        '<span class="tl__rel is-now" data-tl-rel>nykyhetki</span>' +
      '</div>' +
      '<div class="tl__nav">' +
        '<button class="tl__now is-hidden" data-tl-now type="button">Palaa nykyhetkeen →</button>' +
        '<span class="tl__pair">' +
          '<button class="tl__step" data-tl-prev type="button">‹ edellinen</button>' +
          '<button class="tl__step" data-tl-next type="button">seuraava ›</button>' +
        '</span>' +
      '</div>' +
    '</div>' +
    '<div class="tl__track" data-tl-track>' +
      '<div class="tl__grid" data-tl-grid></div>' +
      '<div class="tl__axis"></div>' +
      '<div class="tl__ticks" data-tl-ticks></div>' +
      '<div class="tl__today" data-tl-today></div>' +
      '<div class="tl__handle" data-tl-handle>' +
        '<div class="tl__flag" data-tl-flag>2026/57</div>' +
        '<div class="tl__stem"></div>' +
        '<div class="tl__knob"></div>' +
      '</div>' +
    '</div>' +
    '<div class="tl__legend">' +
      '<span class="it"><span class="k t-vote"></span>äänestyspäivä</span>' +
      '<span class="it"><span class="k t-talk"></span>keskustelu</span>' +
      '<span class="it"><span class="k t-quiet"></span>muu istunto</span>' +
      '<span class="hint">vedä kahvasta · ‹ › · tai napauta janaa</span>' +
    '</div>';

  function injectScrubber() {
    if (document.querySelector('[data-timeline]')) return; // page already has it
    var mast = document.querySelector('header.masthead');
    if (!mast) return;
    var sec = document.createElement('section');
    sec.className = 'timeline';
    sec.setAttribute('data-timeline', '');
    sec.setAttribute('aria-label', 'Selaa vaalikautta');
    sec.innerHTML = SCRUBBER_HTML;
    var hr = document.createElement('hr');
    hr.className = 'rule';
    mast.insertAdjacentElement('afterend', hr);
    mast.insertAdjacentElement('afterend', sec);
  }

  /* ---- state ---- */
  var data = DATA_2023;
  var idx = data.length - 1;
  var t0 = 0, t1 = 1; // term range in ms
  var dragging = false;

  /* ---- DOM refs (filled on init) ---- */
  var root, track, ticksEl, gridEl, handle, flag, todayEl,
      dateEl, relEl, prevBtn, nextBtn, nowBtn;

  function termKey() {
    return (window.EPPeriod && window.EPPeriod.current && window.EPPeriod.current()) || '2023';
  }

  function rangeFrac(iso) {
    if (t1 === t0) return 1;
    return (ms(iso) - t0) / (t1 - t0);
  }

  function buildTrack() {
    t0 = ms(data[0].d);
    t1 = ms(data[data.length - 1].d);

    // ticks
    ticksEl.innerHTML = '';
    data.forEach(function (e, i) {
      var t = document.createElement('span');
      t.className = 'tl__tick t-' + e.type;
      t.style.left = (rangeFrac(e.d) * 100) + '%';
      t.dataset.i = i;
      t.title = fmt(e.d) + ' · ' + e.id;
      ticksEl.appendChild(t);
    });

    // month / year gridlines
    gridEl.innerHTML = '';
    var d = new Date(t0), end = new Date(t1);
    d.setDate(1);
    // step to next month boundary to avoid a label right at the start edge
    while (d <= end) {
      var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
      var f = rangeFrac(iso);
      if (f > 0.015 && f < 0.985) {
        var isYear = d.getMonth() === 0;
        var quarter = d.getMonth() % 3 === 0;
        if (quarter || isYear) {
          var line = document.createElement('span');
          line.className = 'tl__gline' + (isYear ? ' is-year' : '');
          line.style.left = (f * 100) + '%';
          gridEl.appendChild(line);
          var lab = document.createElement('span');
          lab.className = 'tl__glabel' + (isYear ? ' is-year' : '');
          lab.style.left = (f * 100) + '%';
          lab.textContent = isYear ? d.getFullYear() : MONTHS[d.getMonth()];
          gridEl.appendChild(lab);
        }
      }
      d.setMonth(d.getMonth() + 1);
    }

    // today marker (only if this term reaches the present)
    var hasToday = data.some(function (e) { return e.d === TODAY; });
    todayEl.hidden = !hasToday;
    if (hasToday) todayEl.style.left = (rangeFrac(TODAY) * 100) + '%';
  }

  function render() {
    var e = data[idx];
    var isLatest = idx === data.length - 1;
    var isNow = e.d === TODAY;

    // handle + flag + active tick
    var f = rangeFrac(e.d);
    handle.style.left = (f * 100) + '%';
    flag.textContent = e.id;
    // keep the flag from clipping past the track edges (matters on narrow screens)
    var trackW = (track.getBoundingClientRect().width) || 1;
    var flagHalf = (flag.offsetWidth / 2) + 4;
    var px = f * trackW, shift = 0;
    if (px < flagHalf) shift = flagHalf - px;
    else if (px > trackW - flagHalf) shift = (trackW - flagHalf) - px;
    flag.style.transform = 'translateX(calc(-50% + ' + Math.round(shift) + 'px))';
    Array.prototype.forEach.call(ticksEl.children, function (t) {
      t.classList.toggle('is-active', +t.dataset.i === idx);
    });

    // scrubber header
    dateEl.textContent = fmt(e.d);
    if (isNow) { relEl.textContent = 'nykyhetki'; relEl.classList.add('is-now'); }
    else { relEl.textContent = isLatest ? 'kauden viimeinen istunto' : 'arkistonäkymä'; relEl.classList.remove('is-now'); }
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = isLatest;
    nowBtn.classList.toggle('is-hidden', isLatest); // visibility toggle — never reflows the nav
    nowBtn.textContent = data.some(function (x){ return x.d === TODAY; }) ? 'Palaa nykyhetkeen →' : 'Viimeisin istunto →';

    document.body.classList.toggle('is-archive', !isNow);

    /* ---- re-render the front page as of this date ---- */
    // lead kicker
    var kicker = $('[data-tl-kicker]');
    if (kicker) {
      kicker.innerHTML = isNow
        ? '<span class="dot"></span>Eduskunta juuri nyt'
        : 'Arkisto · ' + e.wd + ' ' + fmt(e.d);
    }
    setText('[data-tl-headline]', e.head);
    setText('[data-tl-sessionlabel]', isLatest ? 'Viimeisin istunto' : 'Istunto');
    setText('[data-tl-session]', e.id);
    setText('[data-tl-datetime]', e.wd + ' ' + fmt(e.d) + ' ' + e.time);
    setText('[data-tl-agenda]', e.agenda);

    // stat row — government / opposition + a time-accruing metric
    setText('[data-tl-hall]', e.stats.hall);
    setText('[data-tl-opp]', e.stats.opp);
    setText('[data-tl-statval]', String(e.sittings));

    // AI synthesis
    setText('[data-tl-ai]', e.ai);
    setText('[data-tl-ainote]', 'Koneellisesti tuotettu · pohjautuu ' + e.aiCount + ' tietueeseen');
    var tog = $('[data-tl-aitoggle]');
    if (tog) {
      var lbl = 'Näytä lähteet (' + e.aiCount + ')';
      tog.dataset.label = lbl;
      var lblEl = tog.querySelector('.lbl');
      if (lblEl && !tog.classList.contains('is-open')) lblEl.textContent = lbl;
    }

    // rail — term-so-far facts
    var v = tightestVote(e.d);
    setText('[data-tl-vote-n]', v.n);
    setText('[data-tl-vote-when]', 'äänen ero · ' + v.when);
    setCiteText('[data-tl-vote-jaa]', 'JAA ' + v.jaa);
    setText('[data-tl-vote-ei]', 'EI ' + v.ei);
    var pj = v.jaa / (v.jaa + v.ei) * 100;
    var barJ = $('[data-tl-vote-barj]'), barE = $('[data-tl-vote-bare]');
    if (barJ) barJ.style.width = pj.toFixed(1) + '%';
    if (barE) barE.style.width = (100 - pj).toFixed(1) + '%';

    var ip = latestInterp(e.d);
    setText('[data-tl-interp-title]', ip.title);
    setText('[data-tl-interp-who]', ip.who);
    setText('[data-tl-interp-when]', ip.when);
    setCiteText('[data-tl-interp-n]', ip.n);

    // persist
    try { localStorage.setItem('peili.tl.' + termKey(), e.d); } catch (err) {}

    // generic "as of" reflections used by entity pages (Istunto, Asia, MP, …)
    document.querySelectorAll('[data-tl-asof]').forEach(function (el) { el.textContent = fmt(e.d); });
    document.querySelectorAll('[data-tl-asof-long]').forEach(function (el) { el.textContent = e.wd + ' ' + fmt(e.d); });

    // broadcast so page-specific scripts (e.g. the Istunnot list filter) can react
    document.dispatchEvent(new CustomEvent('peili:date', {
      detail: { iso: e.d, id: e.id, isNow: isNow, isLatest: isLatest, term: termKey() }
    }));
  }

  function select(i, persist) {
    idx = Math.max(0, Math.min(data.length - 1, i));
    render();
  }

  function nearestTo(frac) {
    var target = t0 + frac * (t1 - t0);
    var best = 0, bd = Infinity;
    data.forEach(function (e, i) {
      var dd = Math.abs(ms(e.d) - target);
      if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }

  function fracFromEvent(ev) {
    var r = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
  }

  function rebuild(restore) {
    var key = termKey();
    data = DATASETS[key] || DATA_2023;
    idx = data.length - 1;
    if (restore) {
      var saved = null;
      try { saved = localStorage.getItem('peili.tl.' + key); } catch (e) {}
      if (saved) {
        var i = data.findIndex(function (e) { return e.d === saved; });
        if (i >= 0) idx = i;
      }
    }
    buildTrack();
    render();
  }

  function init() {
    injectScrubber();
    root = $('[data-timeline]');
    if (!root) return;
    track   = $('[data-tl-track]', root);
    ticksEl = $('[data-tl-ticks]', root);
    gridEl  = $('[data-tl-grid]', root);
    handle  = $('[data-tl-handle]', root);
    flag    = $('[data-tl-flag]', root);
    todayEl = $('[data-tl-today]', root);
    dateEl  = $('[data-tl-date]', root);
    relEl   = $('[data-tl-rel]', root);
    prevBtn = $('[data-tl-prev]', root);
    nextBtn = $('[data-tl-next]', root);
    nowBtn  = $('[data-tl-now]', root);

    rebuild(true);

    // click on track → nearest sitting
    track.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest('[data-tl-handle]')) return;
      select(nearestTo(fracFromEvent(ev)));
    });

    // drag handle
    handle.addEventListener('pointerdown', function (ev) {
      ev.preventDefault();
      dragging = true;
      handle.setPointerCapture(ev.pointerId);
    });
    handle.addEventListener('pointermove', function (ev) {
      if (!dragging) return;
      select(nearestTo(fracFromEvent(ev)));
    });
    handle.addEventListener('pointerup', function (ev) {
      dragging = false;
      try { handle.releasePointerCapture(ev.pointerId); } catch (e) {}
    });

    // keyboard on handle
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', 'Selaa istuntopäiviä');
    handle.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { ev.preventDefault(); select(idx - 1); }
      else if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { ev.preventDefault(); select(idx + 1); }
      else if (ev.key === 'Home') { ev.preventDefault(); select(0); }
      else if (ev.key === 'End') { ev.preventDefault(); select(data.length - 1); }
    });

    prevBtn.addEventListener('click', function () { select(idx - 1); });
    nextBtn.addEventListener('click', function () { select(idx + 1); });
    nowBtn.addEventListener('click', function () { select(data.length - 1); });

    // rebuild range on window resize (% positions are fine, but month label cull stays consistent)
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { buildTrack(); render(); }, 120); });

    // react to vaalikausi changes (period.js)
    document.addEventListener('peili:period', function () { rebuild(true); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
