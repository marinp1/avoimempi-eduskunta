/* Eduskuntapeili — "Toimitukselta" about panel.
   An editorial side drawer: editor's note + portrait + signature.
   All texts are author-editable (contenteditable) and persisted to
   localStorage; the portrait is a drag-drop / click-to-browse slot
   stored as a data URL. Plain JS, no deps. Load with <script defer>.

   Trigger: any element with [data-about-open] opens the panel.
   If none exists, a ghost button is appended to .nav automatically. */
(function () {
  'use strict';

  var KEY = 'peili.about.';
  var SCRIPT = document.currentScript;

  /* signature font — loaded once */
  function loadFont() {
    if (document.getElementById('about-sig-font')) return;
    var l = document.createElement('link');
    l.id = 'about-sig-font';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Mr+Dafoe&display=swap';
    document.head.appendChild(l);
  }

  /* localStorage helpers (fail-soft) */
  function get(k, fallback) {
    try { var v = localStorage.getItem(KEY + k); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function set(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) {} }

  /* ---- default editorial copy (replaceable inline by the author) ---- */
  var DEFAULTS = {
    title: 'Miksi Eduskuntapeili on olemassa',
    name: 'Patrik Marin',
    role: 'Tekijä · Eduskuntapeili',
    date: 'päivitetty 2.6.2026',
    body:
      '<p>Eduskunnan päätökset syntyvät avoimesta datasta — äänestyksistä, pöytäkirjoista, asiakirjoista — mutta data on hajallaan ja vaikealukuista. Eduskuntapeili kokoaa sen yhteen ja esittää luettavassa, journalistisessa muodossa.</p>' +
      '<p>Jokainen luku tällä sivustolla on jäljitettävissä alkuperäiseen lähteeseensä. Emme tulkitse politiikkaa puolueiden puolesta — näytämme, mitä salissa todella tapahtui, ja annamme lukijan tehdä johtopäätökset.</p>' +
      '<p>Sivusto on riippumaton ja ei-kaupallinen. Tiedot haetaan suoraan eduskunnan avoimesta rajapinnasta, ja päivitykset näkyvät sellaisenaan.</p>',
    sig: 'Patrik Marin',
    sigmeta: '<b>Patrik Marin</b> · Eduskuntapeilin tekijä',
    portrait: ''
  };

  /* ---- build panel ---- */
  function build() {
    loadFont();

    var scrim = document.createElement('div');
    scrim.className = 'about-scrim';
    scrim.hidden = true;
    scrim.setAttribute('data-about-scrim', '');

    var panel = document.createElement('aside');
    panel.className = 'about';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Toimitukselta');
    panel.innerHTML =
      '<div class="about__bar">' +
        '<span class="lbl">Toimitukselta</span>' +
        '<span class="edit-hint">tekstit muokattavissa</span>' +
        '<button class="about__close" type="button" aria-label="Sulje">\u00d7</button>' +
      '</div>' +
      '<div class="about__scroll">' +
        '<p class="kicker kicker--red"><span class="dot"></span>Pääkirjoitus</p>' +
        '<h1 class="about__title" contenteditable="true" data-k="title" data-placeholder="Otsikko\u2026"></h1>' +
        '<div class="about__writer">' +
          '<div class="about__portrait" data-portrait title="Raahaa tai valitse kuva">' +
            '<input type="file" accept="image/*" hidden />' +
          '</div>' +
          '<div class="about__byline">' +
            '<div class="name" contenteditable="true" data-k="name" data-placeholder="Nimi"></div>' +
            '<div class="role" contenteditable="true" data-k="role" data-placeholder="Rooli"></div>' +
            '<div class="date" contenteditable="true" data-k="date" data-placeholder="päivitetty\u2026"></div>' +
          '</div>' +
        '</div>' +
        '<div class="about__body" contenteditable="true" data-k="body" data-html="1" data-placeholder="Kirjoita tähän, mistä sivustossa on kyse\u2026"></div>' +
        '<div class="about__sig">' +
          '<div class="about__sig-mark" contenteditable="true" data-k="sig" data-placeholder="Allekirjoitus"></div>' +
          '<div class="about__sig-meta" contenteditable="true" data-k="sigmeta" data-html="1"></div>' +
        '</div>' +
        '<div class="about__colophon">' +
          'Tietolähde: Eduskunnan avoin data · <a href="https://avoindata.eduskunta.fi/" target="_blank" rel="noopener">avoindata.eduskunta.fi</a><br />' +
          'Riippumaton, ei-kaupallinen palvelu.' +
        '</div>' +
      '</div>';

    document.body.appendChild(scrim);
    document.body.appendChild(panel);

    /* hydrate editable fields from storage (or defaults) */
    panel.querySelectorAll('[data-k]').forEach(function (el) {
      var k = el.getAttribute('data-k');
      var val = get(k, DEFAULTS[k] != null ? DEFAULTS[k] : '');
      if (el.getAttribute('data-html')) el.innerHTML = val; else el.textContent = val;
      el.addEventListener('input', function () {
        set(k, el.getAttribute('data-html') ? el.innerHTML : el.textContent);
      });
      /* plain-text paste for single-line fields */
      if (!el.getAttribute('data-html')) {
        el.addEventListener('paste', function (e) {
          e.preventDefault();
          var t = (e.clipboardData || window.clipboardData).getData('text');
          document.execCommand('insertText', false, t.replace(/\s+/g, ' ').trim());
        });
      }
    });

    /* portrait slot */
    var portrait = panel.querySelector('[data-portrait]');
    var fileInput = portrait.querySelector('input[type=file]');
    function paint(url) {
      var img = portrait.querySelector('img');
      if (url) {
        if (!img) { img = document.createElement('img'); portrait.appendChild(img); }
        img.src = url;
        portrait.classList.add('has-img');
      } else if (img) {
        img.remove(); portrait.classList.remove('has-img');
      }
    }
    paint(get('portrait', ''));

    function ingest(file) {
      if (!file || !/^image\//.test(file.type)) return;
      var r = new FileReader();
      r.onload = function () { set('portrait', r.result); paint(r.result); };
      r.readAsDataURL(file);
    }
    portrait.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () { ingest(fileInput.files[0]); });
    ['dragenter', 'dragover'].forEach(function (ev) {
      portrait.addEventListener(ev, function (e) { e.preventDefault(); portrait.classList.add('is-drop'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      portrait.addEventListener(ev, function (e) { e.preventDefault(); portrait.classList.remove('is-drop'); });
    });
    portrait.addEventListener('drop', function (e) {
      var dt = e.dataTransfer; if (dt && dt.files && dt.files[0]) ingest(dt.files[0]);
    });

    return { scrim: scrim, panel: panel };
  }

  /* ---- open / close ---- */
  function wire(refs) {
    var scrim = refs.scrim, panel = refs.panel, lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      scrim.hidden = false; panel.hidden = false;
      requestAnimationFrame(function () {
        document.documentElement.classList.add('about-open');
        scrim.classList.add('is-open'); panel.classList.add('is-open');
      });
      panel.setAttribute('aria-hidden', 'false');
    }
    function close() {
      document.documentElement.classList.remove('about-open');
      scrim.classList.remove('is-open'); panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
      var done = function () {
        scrim.hidden = true; panel.hidden = true;
        panel.removeEventListener('transitionend', done);
      };
      panel.addEventListener('transitionend', done);
      setTimeout(done, 360);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function toggle() { if (panel.classList.contains('is-open')) close(); else open(); }

    panel.querySelector('.about__close').addEventListener('click', close);
    scrim.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    /* triggers */
    document.querySelectorAll('[data-about-open]').forEach(function (t) {
      t.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    });

    /* if author placed no trigger, add one to the nav */
    if (!document.querySelector('[data-about-open]')) {
      var nav = document.querySelector('.nav');
      if (nav) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'nav__about';
        btn.setAttribute('data-about-open', '');
        btn.innerHTML = '<span class="ic">i</span>Tietoa';
        var search = nav.querySelector('.nav__search');
        if (search) nav.insertBefore(btn, search.nextSibling); else nav.appendChild(btn);
        btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
      }
    }
  }

  function init() { wire(build()); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
