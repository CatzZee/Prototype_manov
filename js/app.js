/* Priora — interaksi prototipe. Tanpa framework; berjalan dari file:// maupun server.
   Data pengguna ada di PrioraStore (js/store.js). Layar S04, S07, S10, S11c digambar dari data itu oleh PrioraViews;
   HTML hasil build hanyalah keadaan awal (data contoh) dan cadangan bila JavaScript mati. */
(function () {
  'use strict';
  var Seed = window.PrioraData, E = window.PrioraEngine, R = window.PrioraRender, V = window.PrioraViews, Store = window.PrioraStore;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);
  var NOW = E.parse(Seed.now), NOWH = NOW.getHours() + NOW.getMinutes() / 60;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var addMin = function (m) { return E.clock(new Date(NOW.getTime() + m * 60000)); };
  var hmNow = function () { return E.clock(NOW).replace('.', ':'); };

  Store.init(Seed);
  var bootEl = $('#screen-root[data-boot="s06"]');
  var screen = bootEl ? 's06' : ((document.querySelector('[data-screen]') || {}).getAttribute ? document.querySelector('[data-screen]').getAttribute('data-screen') : '');
  var D, M, TASKS, byId;
  function load() {
    var d = Store.data();
    // S11c dibuka tanpa menerapkan apa pun (galeri, tautan langsung): tampilkan rencana contoh, tanpa menyimpannya
    if (screen === 's11c' && !d.applied) d = Store.data({ simulate: {} });
    D = d; M = V.model(D); TASKS = M.TASKS; byId = M.byId;
  }
  load();

  /* ---------- S06: satu halaman, isinya dirender dari ?id= (views.detail) ---------- */
  if (bootEl) {
    var bootTask = byId[params.get('id')];
    bootEl.outerHTML = bootTask
      ? V.detail(bootTask, NOW, D)
      : '<div class="app" data-screen="s06-kosong"><div class="bar"><a class="icon-btn" href="s07-daftar-tugas.html" aria-label="Kembali ke daftar tugas">' + R.icon('arrow_back') + '</a><span class="bar__title">Detail tugas</span></div>' +
        '<main class="section"><div class="panel"><h1 style="font-size:var(--fs-card)">Tugas ini tidak ditemukan</h1><p>Mungkin tugasnya sudah dihapus. Kamu bisa kembali ke daftar tugas.</p>' +
        '<a class="btn btn--secondary" href="s07-daftar-tugas.html" style="justify-self:start">Lihat semua tugas</a></div></main></div>';
    if (bootTask) document.title = bootTask.title + ' · Priora';
    if (location.hash) { var hashEl = document.getElementById(location.hash.slice(1)); if (hashEl) hashEl.scrollIntoView(); }
  }

  /* ---------- tinggi dock → ruang bawah konten ---------- */
  var dock = $('body > .dock');
  function syncDock() { if (dock) document.body.style.setProperty('--dock', dock.offsetHeight + 'px'); }
  syncDock();
  if (dock && window.ResizeObserver) new ResizeObserver(syncDock).observe(dock);

  /* ---------- snackbar ---------- */
  var snackEl = $('body > .snack'), snackTimer;
  function snack(text, o) {
    if (!snackEl) return;
    o = o || {};
    $('[data-snack-text]', snackEl).textContent = text;
    var undo = $('[data-snack-undo]', snackEl);
    if (undo) {
      undo.hidden = !o.undo;
      undo.onclick = function () { snackEl.hidden = true; if (o.undo) o.undo(); };
    }
    snackEl.hidden = false;
    clearTimeout(snackTimer);
    snackTimer = setTimeout(function () { snackEl.hidden = true; }, o.ms || 6000);
  }
  // Pesan yang dititipkan layar sebelumnya (Store.say), dengan tombol Urungkan bila ada
  function showQueued() {
    var q = Store.takeMessage(); if (!q) return;
    snack(q.text, { ms: 7000, undo: q.undo ? function () { Store.run(q.undo); refresh(); snack('Dikembalikan.'); } : null });
  }

  /* ---------- gambar ulang layar dari data tersimpan ---------- */
  var s07 = { fq: 'all', fc: 'all', term: '' };
  function mount() {
    var app = $('.app');
    if (screen === 's04') { app.innerHTML = V.hariIniMain(M); applyS04State(); bindSwipe(); }
    else if (screen === 's07') { app.innerHTML = V.daftarMain(M); initS07(); }
    else if (screen === 's10') { app.innerHTML = V.kalenderMain(M); initS10(); }
    else if (screen === 's11c') { app.innerHTML = V.diterapkanMain(M); }
    var behind = $('.behind .app'); if (behind) behind.innerHTML = V.hariIniMain(M, { behind: true });
  }
  function refresh() { load(); mount(); }

  /* ---------- aksi pada kartu & dock (data-act) ---------- */
  function cardOf(el) { return el.closest('[data-task]'); }
  function detailId() { var d = $('[data-detail]'); return d ? d.getAttribute('data-detail') : null; }
  function stateLine(scope) { return $('[data-state-line]', scope) || $('[data-state-line]'); }
  // Menutup tugas (selesai / sudah dikumpulkan / dibatalkan): kartu keluar, data disimpan, ada Urungkan
  function closeTask(card, id, how, text) {
    Store.setStatus(id, 'done', how);
    var undoSpec = { fn: 'setStatus', args: [id, 'todo'] };
    var inList = card && (screen === 's04' || screen === 's07');
    var go = function () {
      if (inList) { refresh(); snack(text, { undo: function () { Store.run(undoSpec); refresh(); } }); }
      else { Store.say(text, undoSpec); location.href = 's04-hari-ini.html'; }
    };
    if (inList) { card.style.opacity = '0'; card.style.transform = 'translateX(24px)'; setTimeout(go, reduce ? 0 : 220); } else go();
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-act]');
    if (!b) return;
    var card = cardOf(b), id = card ? card.getAttribute('data-task') : detailId();
    var t = byId[id] || {};
    var act = b.getAttribute('data-act');
    if (act === 'start') {
      var on = Store.toggleStart(id, hmNow());
      if (screen === 's06') {
        var line = stateLine(document);
        b.setAttribute('aria-pressed', on);
        b.lastChild.textContent = on ? 'Jeda' : 'Mulai mengerjakan';
        b.firstChild.innerHTML = window.PrioraIcons[on ? 'pause' : 'play_arrow'];
        if (line) { line.hidden = !on; line.innerHTML = R.icon('play_arrow', 'icon--xs') + 'Sedang dikerjakan sejak ' + E.clock(NOW) + ' · pengingat dijeda sampai ' + addMin(120); }
      } else refresh();
      snack(on ? 'Selamat mengerjakan. Pengingat dijeda 2 jam.' : 'Dijeda. Pengingat aktif lagi.');
    } else if (act === 'done') {
      closeTask(card, id, 'done', (t.title || 'Tugas') + ' ditandai selesai. Pengingatnya dibatalkan.');
    } else if (act === 'snooze') {
      var sn = Store.snooze(id, 30, hmNow());
      if (screen === 's06') { Store.say('Ditunda 30 menit. Pengingat berbunyi lagi ' + E.hm(sn.until) + '.', { fn: 'clearSnooze', args: [id] }); location.href = 's04-hari-ini.html'; return; }
      refresh();
      snack('Ditunda 30 menit. Pengingat berbunyi lagi ' + E.hm(sn.until) + '.' + (sn.count >= 3 ? ' Sepertinya waktunya kurang pas. Mau atur ulang jadwal?' : ''), { undo: function () { Store.clearSnooze(id); refresh(); } });
    } else if (act === 'submitted') {
      closeTask(card, id, 'submitted', (t.title || 'Tugas') + ' ditandai sudah dikumpulkan.');
    } else if (act === 'cancel') {
      closeTask(card, id, 'cancelled', 'Tugas dibatalkan. Tetap tercatat untuk refleksi mingguan.');
    } else if (act === 'newdeadline') {
      var v = $('#nd').value; if (!v) return;
      Store.setDeadline(id, v);
      Store.say('Deadline baru disimpan: ' + E.deadlineText({ deadline: v }, NOW) + '. Prioritas dihitung ulang.');
      location.reload();
    }
  });

  /* ---------- tautan yang melakukan sesuatu sebelum pindah layar (data-do) ---------- */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-do]'); if (!a) return;
    var what = a.getAttribute('data-do'), id = a.getAttribute('data-id'), t = byId[id] || {};
    if (what === 'start') {
      var on = Store.toggleStart(id, hmNow());
      Store.say(on ? 'Mulai mengerjakan ' + (t.title || 'tugas') + '. Pengingat dijeda sampai ' + addMin(120) + '.' : 'Dijeda. Pengingat aktif lagi.');
    } else if (what === 'done') {
      Store.setStatus(id, 'done');
      Store.say((t.title || 'Tugas') + ' ditandai selesai. Pengingatnya dibatalkan.', { fn: 'setStatus', args: [id, 'todo'] });
    } else if (what === 'snooze') {
      var min = Number(a.getAttribute('data-min')) || 15, sn = Store.snooze(id, min, hmNow());
      Store.say('Ditunda ' + min + ' menit. Pengingat berbunyi lagi ' + E.hm(sn.until) + '.' + (sn.count >= 3 ? ' Sepertinya waktunya kurang pas. Mau atur ulang jadwal?' : ''), { fn: 'clearSnooze', args: [id] });
    } else if (what === 'resched') {
      Store.moveBlock(id, a.getAttribute('data-start'), a.getAttribute('data-end'));
      Store.say('Blok kerja dipindah. Pengingat diatur ulang.');
    } else if (what === 'undoplan') {
      Store.undoPlan(); Store.say('Jadwal dikembalikan seperti semula.');
    }
  });

  /* ---------- geser kartu fokus (kanan = selesai, kiri = tunda); tombol tetap tersedia ---------- */
  function bindSwipe() {
    $$('[data-swipe]').forEach(function (card) {
      var x0 = null, dx = 0, moved = false;
      card.addEventListener('pointerdown', function (e) { if (e.target.closest('button')) return; x0 = e.clientX; dx = 0; moved = false; });
      card.addEventListener('pointermove', function (e) {
        if (x0 === null) return; dx = e.clientX - x0;
        if (Math.abs(dx) > 10) { moved = true; card.style.transition = 'none'; card.style.transform = 'translateX(' + dx * 0.6 + 'px)'; }
      });
      function end() {
        if (x0 === null) return; card.style.transition = ''; card.style.transform = '';
        if (dx > 90) $('[data-act="done"]', card).click();
        else if (dx < -90) $('[data-act="snooze"]', card).click();
        x0 = null;
      }
      card.addEventListener('pointerup', end); card.addEventListener('pointercancel', end); card.addEventListener('pointerleave', end);
      card.addEventListener('click', function (e) { if (moved) { e.preventDefault(); moved = false; } }, true);
    });
  }

  /* ---------- grup radio umum (chips, seg) ---------- */
  function radioGroup(root, cb) {
    if (!root) return;
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[role="radio"]'); if (!b || !root.contains(b)) return;
      $$('[role="radio"]', root).forEach(function (x) { x.setAttribute('aria-checked', x === b); });
      if (cb) cb(b.getAttribute('data-v') || b.getAttribute('data-dl'), b);
    });
  }

  /* ---------- sheet & dialog ---------- */
  var lastFocus = null;
  function openSheet(id) {
    var s = document.getElementById(id); if (!s) return;
    lastFocus = document.activeElement;
    $('.scrim[data-close]').hidden = false; s.hidden = false;
    var f = $('a, button, input', s); if (f) f.focus();
  }
  function closeSheets() {
    $$('.sheet[id]').forEach(function (s) { s.hidden = true; });
    var sc = $('.scrim[data-close]'); if (sc) sc.hidden = true;
    if (lastFocus) lastFocus.focus();
  }
  document.addEventListener('click', function (e) {
    var o = e.target.closest('[data-open]'); if (o) { openSheet(o.getAttribute('data-open')); return; }
    if (e.target.closest('[data-close]')) closeSheets();
    var dlg = e.target.closest('[data-dlg]'); if (dlg) { var d = document.getElementById(dlg.getAttribute('data-dlg')); if (d && d.showModal) d.showModal(); }
    var to = e.target.closest('[data-close-to]'); if (to) location.href = to.getAttribute('data-close-to');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if ($('.sheet[id]:not([hidden])')) { closeSheets(); return; }
    if (document.body.classList.contains('is-sheet')) { var c = $('.sheet .sheet__head .icon-btn'); if (c) c.click(); }
  });
  // fokus pertama di halaman sheet
  if (document.body.classList.contains('is-sheet')) { var first = $('.sheet input, .sheet button'); if (first && !params.get('nofocus')) first.focus({ preventScroll: true }); }

  /* ================= S04 Hari Ini ================= */
  function applyS04State() {
    var st = params.get('state'), status = $('[data-sync]');
    var swap = function (sel, tpl) { var el = $(sel), t = document.getElementById(tpl); if (el && t) el.innerHTML = t.innerHTML; };
    var hide = function (sel) { var el = $(sel); if (el) el.hidden = true; };
    if (st === 'kosong' || st === 'memuat') {
      hide('.summary'); hide('#lain'); hide('#terlewat');
      swap('#fokus .section__body', 'tpl-' + st + '-fokus'); swap('#jadwal .section__body', 'tpl-' + st + '-jadwal');
    }
    if (st === 'offline') { $('[data-notice]').innerHTML = $('#tpl-offline').innerHTML; status.innerHTML = R.icon('cloud_off') + 'Offline'; status.classList.add('status--warn'); }
    if (st === 'error') {
      $('[data-notice]').innerHTML = $('#tpl-error').innerHTML; status.innerHTML = R.icon('sync_problem') + 'Belum tersinkron'; status.classList.add('status--warn');
      $('[data-retry]').addEventListener('click', function () { $('[data-notice]').innerHTML = ''; status.innerHTML = R.icon('sync') + 'Tersinkron ' + E.clock(NOW); status.classList.remove('status--warn'); snack('Tersinkron. Semua perubahan sudah di cloud.'); });
    }
    // Penyimpanan tidak tersedia (mis. mode privat yang menolak localStorage dan window.name): katakan apa adanya
    if (!st && Store.mode() === 'memory') $('[data-notice]').innerHTML = '<div class="notice" role="status">' + R.icon('info') + '<span>Penyimpanan di peramban ini tidak tersedia. Perubahan hanya bertahan selama halaman ini terbuka.</span></div>';
  }

  /* ================= S05a Quick Add ================= */
  var qa = $('#qa');
  if (qa) {
    var title = $('#qa-title'), cat = $('#qa-cat'), est = $('#qa-est'), date = $('#qa-date');
    var dl = 'today', imp = 3, catTouched = false, estTouched = false;
    var DL = { today: '2026-10-19T23:59', tomorrow: '2026-10-20T23:59', week: '2026-10-25T23:59' };
    var RULES = [[/\b(uts|uas|ujian)\b/i, 'Ujian'], [/\b(laporan|proyek|makalah|skripsi)\b/i, 'Tugas Besar/Proyek'], [/\b(kuis|quiz|latihan|pr|tugas)\b/i, 'Tugas Mingguan'], [/\b(rapat|panitia|proposal|bem|ukm)\b/i, 'Organisasi']];
    function suggest() {
      var v = title.value, hit = null, word = '';
      RULES.some(function (r) { var mm = v.match(r[0]); if (mm) { hit = r[1]; word = mm[0]; return true; } return false; });
      if (!catTouched) {
        cat.value = hit || 'Tugas Mingguan';
        $('[data-cat-hint]').textContent = hit ? 'Disarankan dari kata "' + word + '"; bisa diganti.' : 'Bawaan; bisa diganti.';
      }
      if (!estTouched) est.value = String(D.categories[cat.value].est);
      return hit ? word : '';
    }
    function preview() {
      var word = suggest();
      var deadline = dl === 'pick' ? date.value : DL[dl];
      var T = E.hoursBetween(NOW, E.parse(deadline)), c = cat.value, e = Number(est.value);
      var r = E.score({ T: T, H: D.settings.productiveHours, E: e, p: 0, I: imp, W: D.categories[c].w });
      var has = title.value.trim().length > 0;
      $('[data-pv-badge]').innerHTML = has ? R.badge(r.quadrant) : '';
      $('[data-preview]').className = 'preview' + (has ? ' ' + r.quadrant.toLowerCase() : '');
      $('[data-pv-text]').textContent = has
        ? 'Deadline ' + E.durWords(T) + ' lagi, estimasi ' + e + ' jam, kategori ' + c + (word ? ' (dari kata "' + word + '")' : '') + '. ' + (r.A < r.R ? 'Waktu produktif sebelum deadline ±' + R.durH(r.A) + ', kurang dari estimasi.' : 'Waktu produktif sebelum deadline ±' + R.durH(r.A) + '.')
        : 'Tulis judul untuk melihat perkiraan prioritas.';
      return r;
    }
    title.addEventListener('input', function () { $('[data-err]').hidden = true; title.removeAttribute('aria-invalid'); preview(); });
    cat.addEventListener('change', function () { catTouched = true; if (!estTouched) est.value = String(D.categories[cat.value].est); preview(); });
    est.addEventListener('change', function () { estTouched = true; preview(); });
    date.addEventListener('change', preview);
    radioGroup($('[data-deadline]').parentNode, function (v) { dl = v; date.hidden = v !== 'pick'; if (v === 'pick') date.focus(); preview(); });
    radioGroup($('[data-imp]'), function (v) { imp = Number(v); preview(); });
    qa.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!title.value.trim()) { $('[data-err]').hidden = false; title.setAttribute('aria-invalid', 'true'); title.focus(); return; }
      var deadline = dl === 'pick' ? (date.value || DL.week) : DL[dl];
      var task = Store.addTask({ title: title.value, course: $('#qa-course').value, category: cat.value, est: est.value, importance: imp, deadline: deadline });
      load();
      Store.say('Tersimpan sebagai ' + E.QUAD[byId[task.id].quadrant].label + '. Pengingat diatur.');
      location.href = 's04-hari-ini.html';
    });
    preview();
  }

  /* ================= S06 Detail ================= */
  var det = $('[data-detail]');
  if (det) {
    var t = byId[det.getAttribute('data-detail')], prog = t.progress / 100, lock = t.override || null;
    function recalc() {
      var r = E.score({ T: t.T, H: D.settings.productiveHours, E: t.est, p: prog, I: t.importance, W: t.W });
      var q = lock || r.quadrant;
      if (!t.overdue) {
        $('[data-badge]').innerHTML = R.badge(q);
        $('.detail-head').className = 'detail-head ' + q.toLowerCase();
        $('[data-lock]').hidden = !lock;
        $('[data-why]').innerHTML = lock
          ? (lock === r.quadrant ? 'Dikunci ke <b>' + E.QUAD[lock].label + '</b>, sama dengan hasil perhitungan saat ini.' : 'Kamu mengunci prioritas ke <b>' + E.QUAD[lock].label + '</b>. Menurut perhitungan, tugas ini ' + E.QUAD[r.quadrant].label + '.')
          : '<b>' + E.QUAD[r.quadrant].label + '</b>: tugas ini ' + R.quadWhy(r.quadrant) + '.';
        $('[data-reason]').textContent = 'Deadline ' + E.durWords(t.T) + ' lagi; estimasi ' + R.durH(r.R) + ' tersisa; kategori ' + t.category + '.';
        $('[data-slack-wrap]').innerHTML = R.slack(r.A, r.R, { key: true, quadrant: q });
        $('[data-u] .bullet__fill').style.width = Math.round(Math.min(r.U, 1) * 100) + '%';
        $('[data-u-word]').textContent = r.U >= 0.5 ? 'Mendesak' : 'Belum mendesak';
        var tier = D.tiers[q];
        $$('[data-tier] dd').forEach(function (dd, i) { dd.textContent = tier[i]; });
      }
      return r;
    }
    if (!t.overdue) recalc(); // tampilkan keadaan tersimpan (progres, kunci prioritas) sejak awal
    radioGroup($('[data-progress]'), function (v) {
      var before = recalc().quadrant; prog = Number(v) / 100; var after = recalc().quadrant;
      Store.setProgress(t.id, Number(v));
      snack('Progres ' + v + '%. ' + (before !== after ? 'Prioritas berubah ke ' + E.QUAD[after].label + '.' : 'Prioritas tetap ' + E.QUAD[after].label + '.'));
    });
    radioGroup($('[data-override]'), function (v) {
      lock = v === 'auto' ? null : v; recalc(); Store.setOverride(t.id, lock);
      $('[data-ov-hint]').textContent = lock ? 'Dikunci ke ' + E.QUAD[lock].label + ' sampai deadline atau kepentingan diubah. Pengingat mengikuti tier ini.' : 'Otomatis mengikuti perhitungan. Kunci bila menurutmu sistem keliru.';
    });
  }

  /* ================= S07 Daftar tugas ================= */
  function initS07() {
    var search = $('#cari'), courseSel = $('[data-course]');
    var QLABEL = { all: 'semua tugas', OD: 'Terlewat', Q1: 'Kerjakan Sekarang', Q2: 'Jadwalkan', Q3: 'Selesaikan Cepat', Q4: 'Bisa Ditunda' };
    function apply() {
      var term = s07.term.trim().toLowerCase(), any = false;
      $$('[data-grp]').forEach(function (g) {
        var n = 0;
        $$('[data-task]', g).forEach(function (c) {
          var ok = (s07.fq === 'all' || c.getAttribute('data-q') === s07.fq) && (s07.fc === 'all' || c.getAttribute('data-course') === s07.fc) &&
            (!term || c.textContent.toLowerCase().indexOf(term) > -1);
          c.hidden = !ok; if (ok) n++;
        });
        g.hidden = n === 0; $('[data-grp-count]', g).textContent = n; if (n) any = true;
      });
      var empty = $('[data-empty]'); empty.hidden = any && $$('[data-grp]').length > 0;
      $('[data-filter-label]').textContent = (s07.fq === 'all' && s07.fc === 'all') ? QLABEL.all : [s07.fq === 'all' ? '' : QLABEL[s07.fq], s07.fc === 'all' ? '' : s07.fc].filter(Boolean).join(' · ');
    }
    // pulihkan saringan sebelum gambar ulang (mis. setelah menandai selesai)
    search.value = s07.term; courseSel.value = $$('option', courseSel).some(function (o) { return o.value === s07.fc || o.textContent === s07.fc; }) ? s07.fc : 'all';
    if (courseSel.value === 'all') s07.fc = 'all';
    $$('[data-filter] [role="radio"]').forEach(function (x) { x.setAttribute('aria-checked', x.getAttribute('data-v') === s07.fq); });
    radioGroup($('[data-filter]'), function (v) { s07.fq = v; apply(); });
    courseSel.addEventListener('change', function () { s07.fc = courseSel.value; apply(); });
    search.addEventListener('input', function () { s07.term = search.value; apply(); });
    $('[data-reset]').addEventListener('click', function () { s07.fq = 'all'; s07.fc = 'all'; s07.term = ''; search.value = ''; courseSel.value = 'all'; $$('[data-filter] [role="radio"]').forEach(function (x) { x.setAttribute('aria-checked', x.getAttribute('data-v') === 'all'); }); apply(); });
    apply();
  }

  /* ================= S10 Kalender: Hari / Minggu / Bulan ================= */
  var HARI = { Min: 18, Sen: 19, Sel: 20, Rab: 21, Kam: 22, Jum: 23, Sab: 24 };
  var cal = { view: ['day', 'week', 'month'].indexOf(params.get('view')) > -1 ? params.get('view') : 'day', day: Number(params.get('d')) || HARI[params.get('hari')] || NOW.getDate() };
  function initS10() {
    var TODAY = NOW.getDate();
    var panels = { day: $('[data-panel="day"]'), week: $('[data-panel="week"]'), month: $('[data-panel="month"]') };
    var subEl = $('[data-cal-sub]'), weekbar = $('[data-weekbar]'), soloEl = $('[data-day-solo]'), todayEl = $('[data-day-today]');
    function paintCal() {
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== cal.view; });
      weekbar.hidden = cal.view !== 'day';
      $$('[data-view] [role="radio"]').forEach(function (b) { b.setAttribute('aria-checked', b.getAttribute('data-v') === cal.view); });
      $$('.week__d', weekbar).forEach(function (a) {
        var on = Number(a.getAttribute('data-day')) === cal.day;
        a.classList.toggle('week__d--curr', on);
        if (on) a.setAttribute('aria-current', 'date'); else a.removeAttribute('aria-current');
      });
      var d = new Date(2026, 9, cal.day);
      subEl.textContent = cal.view === 'day' ? E.dayLong(d) + ' 2026' : cal.view === 'week' ? '18–24 Oktober 2026' : 'Oktober 2026';
      var other = cal.day !== TODAY;
      todayEl.hidden = other; soloEl.hidden = !other;
      $('.legend', panels.day).hidden = other;
      if (other) soloEl.innerHTML = '<div class="wk-day__body" style="margin-top:12px">' + V.dayAgenda(cal.day, TASKS, NOW, D) + '</div>';
      try { history.replaceState(null, '', '?view=' + cal.view + '&d=' + cal.day); } catch (e) { /* file:// tertentu menolak; tidak penting */ }
    }
    radioGroup($('[data-view]'), function (v) { cal.view = v; paintCal(); });
    weekbar.addEventListener('click', function (e) {
      var a = e.target.closest('a.week__d'); if (!a) return;
      e.preventDefault(); cal.day = Number(a.getAttribute('data-day')); paintCal();
    });
    panels.month.addEventListener('click', function (e) {
      var b = e.target.closest('.mo__d[data-day]'); if (!b) return;
      cal.day = Number(b.getAttribute('data-day')); cal.view = 'day'; paintCal(); window.scrollTo(0, 0);
    });
    paintCal();
  }

  /* ================= S11a Kejadian mendadak ================= */
  var km = $('#km');
  if (km) {
    var s = $('#km-start'), en = $('#km-end');
    var toH = function (v) { return E.toH(v || '00:00'); };
    function impact() {
      var a = toH(s.value), b = toH(en.value), box = $('[data-impact]'), btn = $('[data-km-submit]');
      if (b <= a) { box.innerHTML = '<p style="color:var(--text)">Jam selesai harus setelah jam mulai.</p>'; btn.setAttribute('aria-disabled', 'true'); return 'bad'; }
      btn.removeAttribute('aria-disabled');
      var hits = D.blocks.filter(function (x) { return toH(x.start) < b && toH(x.end) > a; });
      var dues = TASKS.filter(function (x) { var d = E.parse(x.deadline); return !x.overdue && x.status !== 'done' && d.toDateString() === NOW.toDateString() && (d.getHours() + d.getMinutes() / 60) >= a && (d.getHours() + d.getMinutes() / 60) <= b; });
      if (!hits.length && !dues.length) {
        box.innerHTML = '<p style="color:var(--text)"><b>Tidak ada yang bertabrakan.</b> Simpan saja sebagai kegiatan.</p>';
        btn.textContent = 'Simpan kegiatan'; return 'free';
      }
      btn.textContent = 'Lihat usulan jadwal';
      var h = '<p style="color:var(--text);font-weight:600">' + (hits.length ? hits.length + ' blok kerja bertabrakan' : '') + (hits.length && dues.length ? ' dan ' : '') + (dues.length ? dues.length + ' deadline jatuh di dalamnya' : '') + '</p><ul style="margin:0;padding-left:18px;font-size:14px">';
      hits.forEach(function (x) { var tt = byId[x.task]; h += '<li>' + R.esc(tt.title) + ' · <span class="num">' + E.hm(x.start) + '–' + E.hm(x.end) + '</span></li>'; });
      dues.forEach(function (x) { h += '<li>Deadline ' + R.esc(x.title) + ' · <span class="num">' + E.clock(E.parse(x.deadline)) + '</span></li>'; });
      box.innerHTML = h + '</ul>';
      return 'hit';
    }
    radioGroup($('[data-dur]'), function (v) {
      var a = toH(s.value), b = v === '22' ? 22 : Math.min(a + Number(v), 22);
      en.value = R.hhmm(b).replace('.', ':'); impact();
    });
    s.addEventListener('change', impact); en.addEventListener('change', function () { $$('[data-dur] [role="radio"]').forEach(function (x) { x.setAttribute('aria-checked', 'false'); }); impact(); });
    km.addEventListener('submit', function (e) {
      e.preventDefault(); var r = impact(); if (r === 'bad') return;
      if (r === 'free') { Store.say('Kegiatan disimpan. Tidak ada yang bertabrakan.'); location.href = 's04-hari-ini.html'; return; }
      location.href = 's11b-pratinjau-jadwal-ulang.html' + (s.value !== D.sudden.start || en.value !== D.sudden.end ? '?beda=1' : '');
    });
    impact();
  }

  /* ================= S11b Pratinjau ================= */
  if (screen === 's11b') {
    if (params.get('beda')) {
      var n = document.createElement('div'); n.className = 'notice'; n.setAttribute('role', 'status');
      n.innerHTML = R.icon('info') + '<span>Prototipe ini memakai skenario Rapat BEM 13.00–16.00 untuk usulan di bawah.</span>';
      $('main').insertBefore(n, $('main').firstChild);
    }
    // Tugas yang sudah selesai tidak perlu dipindahkan: lewati usulannya, dan sembunyikan "kurang waktu" bila Laporan sudah selesai
    $$('[data-move]').forEach(function (m) { var tt = byId[m.getAttribute('data-move')]; if (!tt || tt.status === 'done') m.hidden = true; });
    var nPlan = $$('[data-move]').filter(function (m) { return !m.hidden; }).length;
    $('[data-plan-count]').textContent = nPlan + ' perubahan';
    if (!nPlan) { var none = document.createElement('p'); none.className = 'field__hint'; none.textContent = 'Semua tugas yang terdampak sudah selesai, jadi tidak ada yang perlu dipindahkan.'; $('[data-move]').parentNode.appendChild(none); }
    if (!byId.laporan || byId.laporan.status === 'done') $('#rk').hidden = true;
    var swapped = {}, fix = {};
    $$('[data-move]').forEach(function (m) {
      var alt = JSON.parse(m.getAttribute('data-alt'))[0], orig = m.getAttribute('data-to'), id = m.getAttribute('data-move');
      $('[data-swap]', m).addEventListener('click', function () {
        swapped[id] = !swapped[id];
        $('[data-to-text]', m).textContent = swapped[id] ? alt : orig;
        snack('Slot ' + byId[id].title + ' diganti ke ' + (swapped[id] ? alt : orig) + '.');
      });
    });
    var FIX = { malam: 'Blok tambahan 20.00–22.00 ikut dijadwalkan (total 4 j dari 6 j yang dibutuhkan).', estimasi: 'Estimasi diturunkan ke 4 jam; waktu tersedia cukup.', perpanjang: 'Catatan dibuat: hubungi asisten praktikum untuk minta perpanjangan.' };
    $$('[data-fix] .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        var v = c.getAttribute('data-v'); fix[v] = !fix[v]; c.setAttribute('aria-pressed', fix[v]);
        var txt = Object.keys(fix).filter(function (k) { return fix[k]; }).map(function (k) { return FIX[k]; }).join(' ');
        $('[data-fix-text]').textContent = txt || 'Belum ada yang dipilih.';
      });
    });
    // Terapkan: rencana + pilihan disimpan, lalu S11c membacanya dari penyimpanan
    $('[data-apply]').addEventListener('click', function () {
      Store.applyPlan({ ganti: Object.keys(swapped).filter(function (k) { return swapped[k]; }), malam: !!fix.malam });
    });
  }

  /* ================= S11c Setelah diterapkan ================= */
  if (screen === 's11c') {
    var sn = $('[data-autostart]'), timer = $('[data-timer]');
    if (sn && timer && timer.animate && !reduce) timer.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], { duration: 10000, easing: 'linear', fill: 'forwards' });
    if (sn) setTimeout(function () { sn.hidden = true; }, 10000);
  }

  /* ================= S14 Profil ================= */
  if (screen === 's14') {
    var swEl = $('[data-switch]'); if (swEl) swEl.setAttribute('aria-checked', String(!!D.settings.failsafeEmail));
    $$('[data-switch]').forEach(function (sw) { sw.addEventListener('click', function () { var on = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', on); Store.setSetting('failsafeEmail', on); snack(on ? 'Email fail-safe aktif.' : 'Email fail-safe dimatikan. Pengingat merah hanya lewat HP.'); }); });
    $('[data-export]').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify({ diekspor: D.now, pengguna: D.user, pengaturan: D.settings, tugas: D.tasks }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'priora-data.json'; document.body.appendChild(a); a.click(); a.remove();
      snack('priora-data.json diunduh.');
    });
    var del = $('#del-confirm'), ok = $('[data-del-ok]');
    del.addEventListener('input', function () { ok.disabled = del.value.trim().toUpperCase() !== 'HAPUS'; });
    $('#dlg-del').addEventListener('close', function () { if (this.returnValue === 'ok') snack('Ini prototipe: tidak ada data yang dihapus.'); del.value = ''; ok.disabled = true; });
    var rs = $('#dlg-reset');
    if (rs) rs.addEventListener('close', function () { if (this.returnValue === 'ok') { Store.reset(); Store.say('Data contoh dikembalikan. Semua perubahanmu dihapus dari peramban ini.'); location.href = 's04-hari-ini.html'; } });
  }

  /* ---------- mulai: gambar dari data tersimpan, lalu tampilkan pesan titipan ---------- */
  if (screen === 's04' || screen === 's07' || screen === 's10' || screen === 's11c' || $('.behind .app')) mount();
  showQueued();
})();
