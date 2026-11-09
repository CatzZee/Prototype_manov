/* Priora — pembangun tampilan (views). Dipakai di build.mjs dan di browser (app.js). */
(function (root) {
  var E = root.PrioraEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var R = root.PrioraRender || (typeof require !== 'undefined' ? require('./render.js') : null);
  var icon = R.icon, badge = R.badge, overdueBadge = R.overdueBadge, slack = R.slack, esc = R.esc, durH = R.durH, srLabel = R.srLabel, quadWhy = R.quadWhy;

  var MARK = function (light) {
    return '<svg class="brand__mark" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="2" fill="' + (light ? '#fff' : 'currentColor') + '"/><rect x="11.75" y="1.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1.75" y="11.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="11.75" y="11.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';
  };

  var NAV = [['Hari Ini', 'home', 's04-hari-ini.html'], ['Kalender', 'calendar_month', 's10-kalender.html'], ['Tugas', 'list', 's07-daftar-tugas.html'], ['Profil', 'person', 's14-profil.html']];
  function nav(current) {
    return '<nav class="nav" aria-label="Navigasi utama">' + NAV.map(function (item) {
      var l = item[0], ic = item[1], href = item[2];
      return '<a href="' + href + '"' + (l === current ? ' aria-current="page"' : '') + '><span class="nav__pill">' + icon(ic) + '</span>' + l + '</a>';
    }).join('') + '</nav>';
  }

  function brandRow(end) {
    return '<div class="top"><a class="brand" href="s04-hari-ini.html">' + MARK() + 'Priora</a><div class="top__end">' + (end || '') + '</div></div>';
  }

  function syncStatus(D) {
    return '<span class="status" data-sync>' + icon('sync') + 'Tersinkron ' + D.settings.lastSync + '</span>';
  }

  function detailHref(t) {
    return 's06-detail.html?id=' + t.id;
  }

  function fab(cls) {
    return '<a class="fab ' + (cls || '') + '" href="s05a-quick-add.html" aria-label="Tambah tugas">' + icon('add') + '</a>';
  }

  function tone(c, D) {
    return 'tone-' + (D.courses[c] ? D.courses[c].tone : 'e');
  }

  // Baris meta kartu: chip mata kuliah (titik nada + nama) dan, bila perlu, deadline
  function meta(t, D, now, withDeadline) {
    return '<div class="task__meta"><span class="course"><i class="dot ' + tone(t.course, D) + '"></i>' + esc(t.course) + '</span>' +
      (withDeadline ? '<span class="task__due">' + E.deadlineText(t, now) + '</span>' : '') + '</div>';
  }

  // Komponen kartu tugas
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function addMinHM(hm, m) { var p = hm.split(':').map(Number), x = p[0] * 60 + p[1] + m; return pad2(Math.floor(x / 60) % 24) + ':' + pad2(x % 60); }
  // Tombol Mulai/Jeda: keadaan "sedang dikerjakan" berasal dari penyimpanan (t.startedAt)
  function startButton(t, small, idleLabel) {
    var on = !!t.startedAt;
    return '<button class="btn btn--primary' + (small ? ' btn--sm' : '') + '" type="button" data-act="start" aria-pressed="' + on + '">' + icon(on ? 'pause' : 'play_arrow') + (on ? 'Jeda' : idleLabel) + '</button>';
  }
  function stateLine(t) {
    if (t.startedAt) return icon('play_arrow', 'icon--xs') + 'Sedang dikerjakan sejak ' + E.hm(t.startedAt) + ' · pengingat dijeda sampai ' + E.hm(addMinHM(t.startedAt, 120));
    if (t.snoozedUntil) return icon('snooze', 'icon--xs') + 'Ditunda · pengingat berbunyi lagi ' + E.hm(t.snoozedUntil);
    return '';
  }
  function heroCard(t, now, D) {
    var left = E.dur(t.T), line = stateLine(t);
    return '<article class="task task--hero ' + t.quadrant.toLowerCase() + '" data-task="' + t.id + '" data-swipe aria-label="' + esc(srLabel(t)) + '">\n' +
      '  <div class="task__row">' + badge(t.quadrant) + '</div>\n' +
      '  <h3 class="task__title"><a href="' + detailHref(t) + '">' + esc(t.title) + '</a></h3>\n' +
      '  ' + meta(t, D, now, false) + '\n' +
      '  <div class="hero-fig"><span class="fig">' + left + '</span><span class="sub">lagi · deadline ' + E.deadlineText(t, now) + '</span></div>\n' +
      '  ' + slack(t.A, t.R, { dark: true, quadrant: t.quadrant, tail: ' · <a class="link" href="' + detailHref(t) + '#mengapa">Mengapa?</a>' }) + '\n' +
      '  <p class="state-line" data-state-line' + (line ? '' : ' hidden') + '>' + line + '</p>\n' +
      '  <div class="task__actions">\n' +
      '    ' + startButton(t, true, 'Mulai') + '\n' +
      '    <button class="btn btn--secondary btn--sm" type="button" data-act="done">Selesai</button>\n' +
      '    <button class="btn btn--ghost btn--sm" type="button" data-act="snooze">Tunda</button>\n' +
      '  </div>\n' +
      '</article>';
  }

  function rowCard(t, o, now, D) {
    o = o || {};
    return '<article class="task ' + t.quadrant.toLowerCase() + '" data-task="' + t.id + '" data-q="' + t.quadrant + '" data-course="' + esc(t.course) + '" data-group="' + (o.group || '') + '" aria-label="' + esc(srLabel(t)) + '">\n' +
      '  <div class="task__row">' + badge(t.quadrant) + '<span class="task__left fig">' + E.dur(t.T) + '</span>' +
      '    <button class="task__done" type="button" data-act="done" data-task-id="' + t.id + '" aria-label="Tandai selesai">' + icon('check') + '</button>' +
      '  </div>\n' +
      '  <h3 class="task__title"><a href="' + detailHref(t) + '">' + esc(t.title) + '</a></h3>\n' +
      '  ' + meta(t, D, now, true) + '\n' +
      '  ' + slack(t.A, t.R, { thin: true, quadrant: t.quadrant }) + '\n' +
      '</article>';
  }
  function overdueCard(t, o, now, D) {
    o = o || {};
    return '<article class="task od" data-task="' + t.id + '" data-q="OD" data-course="' + esc(t.course) + '" data-group="' + (o.group || '') + '" aria-label="' + esc(srLabel(t)) + '">\n' +
      '  <div class="task__row">' + overdueBadge() + '<span class="task__left fig">' + E.dur(t.T) + ' lalu</span></div>\n' +
      '  <h3 class="task__title"><a href="' + detailHref(t) + '">' + esc(t.title) + '</a></h3>\n' +
      '  ' + meta(t, D, now, true) + '\n' +
      (o.actions === false ? '' : '  <p class="od-copy">Tugas ini sudah lewat deadline. Mau tandai selesai atau atur deadline baru?</p>\n' +
      '  <div class="task__actions">\n' +
      '    <button class="btn btn--secondary btn--sm" type="button" data-act="submitted">Sudah dikumpulkan</button>\n' +
      '    <a class="btn btn--ghost btn--sm" href="' + detailHref(t) + '#deadline-baru">Deadline baru</a>\n' +
      '  </div>\n') +
      '</article>';
  }

  var DAY0 = 7, DAY1 = 22;
  function pct(h) { return ((h - DAY0) / (DAY1 - DAY0) * 100).toFixed(2) + '%'; }

  function week(curDay) {
    curDay = curDay || 'Sen';
    var days = [
      ['Min', '18'],
      ['Sen', '19'],
      ['Sel', '20'],
      ['Rab', '21'],
      ['Kam', '22'],
      ['Jum', '23'],
      ['Sab', '24']
    ];
    return '<nav class="week" aria-label="Pilih hari">' + days.map(function (d) {
      var isCur = d[0] === curDay;
      return '<a class="week__d' + (isCur ? ' week__d--curr' : '') + '" href="s10-kalender.html?hari=' + d[0] + '" data-day="' + d[1] + '"' + (isCur ? ' aria-current="date"' : '') + '>' +
        '<span>' + d[0] + '</span><b class="num">' + d[1] + '</b></a>';
    }).join('') + '</nav>';
  }

  function summary(focusTasks, scheduledHours, totalProdHours) {
    var doneCount = (focusTasks || []).filter(function (t) { return t.status === 'done'; }).length;
    var totalCount = Math.max((focusTasks || []).length, 1);
    var segs = '';
    for (var i = 0; i < totalCount; i++) {
      segs += '<span class="summary__seg' + (i < doneCount ? ' done' : '') + '"></span>';
    }
    return '<section class="summary" aria-label="Ringkasan harian">\n' +
      '  <div class="summary__row">\n' +
      '    <div class="summary__col">\n' +
      '      <span class="summary__label">Fokus selesai</span>\n' +
      '      <b class="summary__val num">' + doneCount + ' dari ' + totalCount + '</b>\n' +
      '      <div class="summary__bar">' + segs + '</div>\n' +
      '    </div>\n' +
      '    <div class="summary__col">\n' +
      '      <span class="summary__label">Waktu produktif</span>\n' +
      '      <b class="summary__val num">' + String(scheduledHours).replace('.', ',') + ' j <span class="summary__sub">dari ' + totalProdHours + ' j</span></b>\n' +
      '      <div class="summary__bar"><span class="summary__track"><span class="summary__fill" style="width:' + Math.min(100, Math.round(scheduledHours / totalProdHours * 100)) + '%"></span></span></div>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '</section>';
  }
  function detail(t, now, D) {
    var qk = t.overdue ? 'OD' : t.quadrant;
    var reason = 'Deadline ' + (t.overdue ? 'sudah lewat ' + E.durWords(t.T) : E.durWords(t.T) + ' lagi') + '; estimasi ' + durH(t.R) + ' tersisa; kategori ' + t.category + '.';
    var U = Math.min(t.U, 1), Imp = t.Imp;
    var TIER = D.tiers;
    var mendesak = '<div class="bullet"><div class="bullet__label"><span>Seberapa mendesak</span><b data-u-word>' + (U >= 0.5 ? 'Mendesak' : 'Belum mendesak') + '</b></div>' +
      '<div class="bullet__track" role="img" aria-label="Tingkat mendesak" data-u><div class="bullet__fill" style="width:' + (U * 100).toFixed(0) + '%"></div><div class="bullet__tick" style="left:calc(50% - 1px)" data-label="batas"></div></div></div>';
    var penting = '<div class="bullet"><div class="bullet__label"><span>Seberapa penting</span><b data-i-word>' + (Imp >= 0.5 ? 'Penting' : 'Kurang penting') + '</b></div>' +
      '<div class="bullet__track" role="img" aria-label="Tingkat kepentingan" data-i><div class="bullet__fill" style="width:' + (Imp * 100).toFixed(0) + '%"></div><div class="bullet__tick" style="left:calc(50% - 1px)" data-label="batas"></div></div></div>';
    var kunciField = t.overdue ? '' : '<div class="field" role="radiogroup" aria-labelledby="ov-l"><span class="field__label" id="ov-l">Kunci prioritas sendiri</span>' +
      '<div class="seg" data-override>' + ['auto', 'Q1', 'Q2', 'Q3', 'Q4'].map(function (v) { return '<button type="button" role="radio" aria-checked="' + (v === (t.override || 'auto')) + '" data-v="' + v + '">' + (v === 'auto' ? 'Otomatis' : v) + '</button>'; }).join('') + '</div>' +
      '<p class="field__hint" data-ov-hint>' + (t.override ? 'Dikunci ke ' + E.QUAD[t.override].label + ' sampai deadline atau kepentingan diubah. Pengingat mengikuti tier ini.' : 'Otomatis mengikuti perhitungan. Kunci bila menurutmu sistem keliru.') + '</p></div>';
    var progresField = t.overdue ? '' : '<div class="field" role="radiogroup" aria-labelledby="pr-l"><span class="field__label" id="pr-l">Progres</span>' +
      '<div class="seg" data-progress>' + [0, 25, 50, 75].map(function (v) { return '<button type="button" role="radio" aria-checked="' + (v === t.progress) + '" data-v="' + v + '" class="num">' + v + '%</button>'; }).join('') + '</div>' +
      '<p class="field__hint">Prioritas dihitung ulang saat progres berubah.</p></div>';
    var deadlineField = t.overdue ? '<div class="field" id="deadline-baru"><label for="nd">Dapat perpanjangan? Set deadline baru</label><input class="input" type="datetime-local" id="nd" value="2026-10-21T23:59" min="2026-10-19T09:45"><button class="btn btn--secondary" type="button" data-act="newdeadline" style="justify-self:start">Simpan deadline baru</button></div>' : '';
    var tierRows = (TIER[qk] || []).map(function (x, i) { return '<div class="kv__row"><dt>' + ['Sinyal', 'Pengulangan', 'Cadangan'][i] + '</dt><dd style="font-weight:400">' + x + '</dd></div>'; }).join('');
    var dock = '<div class="dock dock--actions-only"><div class="dock__actions">' + (t.overdue
      ? '<button class="btn btn--secondary" type="button" data-act="cancel">Batalkan tugas</button><button class="btn btn--primary grow" type="button" data-act="submitted">Sudah dikumpulkan</button>'
      : '<button class="btn btn--secondary" type="button" data-act="done">Selesai</button>' + startButton(t, false, 'Mulai mengerjakan').replace('class="btn btn--primary"', 'class="btn btn--primary grow"')) + '</div></div>';

    return '<div class="app" data-screen="s06" data-detail="' + t.id + '">' +
      '<div class="bar"><a class="icon-btn" href="s04-hari-ini.html" aria-label="Kembali ke Hari Ini">' + icon('arrow_back') + '</a><span class="bar__title">Detail tugas</span></div>' +
      '<header class="detail-head ' + qk.toLowerCase() + '">' +
      '<div class="task__row"><span data-badge>' + (t.overdue ? overdueBadge() : badge(t.quadrant)) + '</span><span class="task__lock" data-lock' + (t.override ? '' : ' hidden') + '>' + icon('lock', 'icon--sm') + '<span class="sr">Prioritas dikunci manual</span></span></div>' +
      '<h1>' + esc(t.title) + '</h1>' +
      '<div class="hero-fig"><span class="fig" style="font-size:32px;font-weight:600">' + E.dur(t.T) + '</span><span class="sub">' + (t.overdue ? 'lalu' : 'lagi') + ' · deadline ' + E.deadlineText(t, now) + '</span></div>' +
      '<p class="state-line" data-state-line' + (stateLine(t) ? '' : ' hidden') + '>' + stateLine(t) + '</p></header>' +
      '<main class="detail-panel">' +
      '<section class="section" id="mengapa" aria-labelledby="why-h"><div class="panel">' +
      '<h2 id="why-h">Mengapa prioritas ini?</h2>' +
      '<p data-why style="font-size:16px">' + (t.overdue ? 'Tugas ini sudah lewat deadline.' : '<b>' + t.q.label + '</b>: tugas ini ' + quadWhy(t.quadrant) + '.') + '</p>' +
      '<p class="slack__text" data-reason>' + reason + '</p>' +
      '<div data-slack-wrap>' + slack(t.A, t.R, { key: true, quadrant: t.quadrant }) + '</div>' +
      '<div style="padding:6px 0 18px">' + mendesak + penting + '</div>' + kunciField + '</div></section>' +
      '<section class="section" aria-labelledby="det-h"><div class="panel"><h2 id="det-h">Detail</h2>' +
      '<dl class="kv"><div class="kv__row"><dt>Mata kuliah</dt><dd><i class="dot ' + tone(t.course, D) + '" style="margin-right:6px"></i>' + esc(t.course) + '</dd></div>' +
      '<div class="kv__row"><dt>Kategori</dt><dd>' + esc(t.category) + '</dd></div>' +
      '<div class="kv__row"><dt>Estimasi</dt><dd class="num">' + t.est + ' jam</dd></div>' +
      '<div class="kv__row"><dt>Kepentingan</dt><dd class="num">' + t.importance + ' dari 5</dd></div></dl>' +
      progresField + deadlineField + '</div></section>' +
      '<section class="section" aria-labelledby="rem-h" style="padding-bottom:24px"><div class="panel">' +
      '<h2 id="rem-h">Pengingat</h2><dl class="kv" data-tier>' + tierRows + '</dl></div></section>' +
      '</main></div>' + dock +
      '<div class="snack" role="status" aria-live="polite" hidden><p data-snack-text></p><button class="btn btn--ghost btn--sm" type="button" data-snack-undo hidden>Urungkan</button></div>';
  }

  /* ---------- Kalender: tampilan Minggu dan Bulan (S10) ----------
     Data nyata saja: deadline tiap tugas, dan kegiatan/blok kerja hari ini dari D. Tidak ada jadwal berulang yang
     dikarang; hari tanpa data ditulis apa adanya. */
  var DAYNAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var MONTH_NAME = 'Oktober 2026';
  function dayOf(t) { return E.parse(t.deadline).getDate(); }
  function isToday(day, now) { return day === now.getDate(); }
  function deadlinesOn(tasks, day) {
    return tasks.filter(function (t) { return t.status !== 'done' && dayOf(t) === day; })
      .sort(function (a, b) { return E.parse(a.deadline) - E.parse(b.deadline); });
  }
  function dlItem(t) {
    var cls = t.overdue ? 'od' : t.quadrant.toLowerCase();
    var tag = t.overdue ? icon('warning') + 'Terlewat' : icon(t.q.icon) + t.q.label;
    return '<a class="wk-item ' + cls + '" href="' + detailHref(t) + '"><span class="wk-item__t num">' + E.clock(E.parse(t.deadline)) + '</span>' +
      '<span class="wk-item__w"><b>' + esc(t.title) + '</b><span class="wk-item__q">' + tag + ' · deadline</span></span></a>';
  }
  function todayRows(D) {
    var rows = [];
    D.events.forEach(function (e) { rows.push({ s: E.toH(e.start), html: '<div class="wk-item rutin"><span class="wk-item__t num">' + E.hm(e.start) + '</span><span class="wk-item__w"><b>' + esc(e.title) + '</b><span class="wk-item__q">' + esc(e.where) + ' · sampai ' + E.hm(e.end) + '</span></span></div>' }); });
    if (D.applied) rows.push({ s: E.toH(D.sudden.start), html: '<div class="wk-item rutin"><span class="wk-item__t num">' + E.hm(D.sudden.start) + '</span><span class="wk-item__w"><b>' + esc(D.sudden.title) + ' (mendadak)</b><span class="wk-item__q">Kejadian mendadak · sampai ' + E.hm(D.sudden.end) + '</span></span></div>' });
    return rows;
  }
  function blockRows(tasksById, D) {
    return D.blocks.map(function (b) {
      var t = tasksById[b.task];
      return { s: E.toH(b.start), html: '<a class="wk-item ' + t.quadrant.toLowerCase() + '" href="' + detailHref(t) + '"><span class="wk-item__t num">' + E.hm(b.start) + '</span><span class="wk-item__w"><b>' + esc(t.title) + '</b><span class="wk-item__q">Blok kerja · sampai ' + E.hm(b.end) + '</span></span></a>' };
    });
  }
  // Isi satu hari (selain tampilan jam): kegiatan, blok kerja, dan deadline pada tanggal itu
  function dayAgenda(day, tasks, now, D) {
    var byId = {}; tasks.forEach(function (t) { byId[t.id] = t; });
    var rows = [];
    if (isToday(day, now)) rows = rows.concat(todayRows(D), blockRows(byId, D));
    deadlinesOn(tasks, day).forEach(function (t) { rows.push({ s: E.parse(t.deadline).getHours() + E.parse(t.deadline).getMinutes() / 60, html: dlItem(t) }); });
    rows.sort(function (a, b) { return a.s - b.s; });
    return rows.length ? rows.map(function (r) { return r.html; }).join('') : '<p class="wk-empty">Belum ada kegiatan atau deadline.</p>';
  }
  function weekList(tasks, now, D) {
    var days = [18, 19, 20, 21, 22, 23, 24];
    return '<div class="wk">' + days.map(function (day, i) {
      var today = isToday(day, now);
      return '<section class="wk-day" aria-labelledby="wk-' + day + '"><h3 class="wk-day__h" id="wk-' + day + '"><span class="wk-day__pill' + (today ? ' wk-day__pill--now' : '') + '"' + (today ? ' aria-current="date"' : '') + '>' + DAYNAMES[i] + ' <b class="num">' + day + '</b></span></h3>' +
        '<div class="wk-day__body">' + dayAgenda(day, tasks, now, D) + '</div></section>';
    }).join('') + '</div>';
  }
  function monthGrid(tasks, now) {
    var lead = 4; // 1 Okt 2026 jatuh pada Kamis; minggu dimulai Minggu (sama dengan strip tanggal)
    var cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="mo__d mo__d--blank" aria-hidden="true"></span>';
    for (var day = 1; day <= 31; day++) {
      var ds = deadlinesOn(tasks, day), today = isToday(day, now);
      var dots = ds.map(function (t) { return '<i class="mo__dot ' + (t.overdue ? 'od' : t.quadrant.toLowerCase()) + '"></i>'; }).join('');
      var label = day + ' Oktober' + (today ? ', hari ini' : '') + (ds.length ? ', ' + ds.length + ' deadline' : ', tidak ada deadline');
      cells += '<button type="button" class="mo__d' + (today ? ' mo__d--now' : '') + '" data-day="' + day + '" aria-label="' + label + '"><span class="num">' + day + '</span><span class="mo__dots">' + dots + '</span></button>';
    }
    var head = DAYNAMES.map(function (n) { return '<span class="mo__h" aria-hidden="true">' + n + '</span>'; }).join('');
    var list = tasks.filter(function (t) { return t.status !== 'done'; }).sort(function (a, b) { return E.parse(a.deadline) - E.parse(b.deadline); })
      .map(function (t) {
        var d = E.parse(t.deadline), cls = t.overdue ? 'od' : t.quadrant.toLowerCase();
        return '<a class="mo-row ' + cls + '" href="' + detailHref(t) + '"><span class="mo-row__d num">' + d.getDate() + '</span><span class="mo-row__w"><b>' + esc(t.title) + '</b>' +
          '<span>' + (t.overdue ? icon('warning') + 'Terlewat' : icon(t.q.icon) + t.q.label) + ' · ' + E.clock(d) + '</span></span></a>';
      }).join('');
    return '<div class="mo" role="group" aria-label="' + MONTH_NAME + '"><div class="mo__grid">' + head + cells + '</div></div>' +
      '<h3 class="mo-list__h">Deadline bulan ini</h3><div class="mo-list">' + list + '</div>';
  }

  /* ---------- Model dan layar penuh ----------
     model(D) menurunkan semua yang dibutuhkan layar dari satu objek data (data.js atau Store.data()).
     Pembangun *Main menghasilkan isi .app; dipakai build (data contoh) dan app.js (data tersimpan). */
  function model(D) {
    var NOW = E.parse(D.now), TASKS = E.enrich(D), byId = {};
    TASKS.forEach(function (t) { byId[t.id] = t; });
    function byScore(a, b) { return b.score - a.score; }
    var active = TASKS.filter(function (t) { return !t.overdue && t.status !== 'done'; }).sort(byScore);
    return {
      D: D, NOW: NOW, NOWH: NOW.getHours() + NOW.getMinutes() / 60, TASKS: TASKS, byId: byId,
      active: active, overdue: TASKS.filter(function (t) { return t.overdue; }),
      focus: active.slice(0, 3), others: active.slice(3),
      // "Fokus selesai x dari 3": tiga tugas teratas menurut skor, termasuk yang sudah ditutup (deadline belum lewat)
      focusSet: TASKS.filter(function (t) { return t.T > 0; }).sort(byScore).slice(0, 3),
      scheduledH: D.blocks.reduce(function (s, b) { return s + (E.toH(b.end) - E.toH(b.start)); }, 0)
    };
  }
  function fmtH(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return pad2(hh) + ':' + pad2(mm); }

  function scheduleItems(M, o) {
    o = o || {};
    var D = M.D, items = D.events.map(function (e) { return { kind: 'rutin', title: e.title, sub: e.where, s: E.toH(e.start), e: E.toH(e.end) }; });
    if (o.withBlocks !== false) D.blocks.forEach(function (b) {
      var t = M.byId[b.task]; if (!t) return;
      var sub = b.isNew ? (b.extra ? 'Blok tambahan · ' : b.from ? 'Dipindah dari ' + E.hm(b.from) + ' · ' : 'Dijadwalkan baru · ') + t.q.label : 'Blok kerja · ' + t.q.label;
      items.push({ kind: 'blk', q: t.quadrant, task: t.id, title: t.title, sub: sub, s: E.toH(b.start), e: E.toH(b.end), isNew: b.isNew });
    });
    if (o.sudden !== undefined ? o.sudden : !!D.applied) items.push({ kind: 'mendadak', title: D.sudden.title + ' (mendadak)', sub: 'Kejadian mendadak', s: E.toH(D.sudden.start), e: E.toH(D.sudden.end) });
    return items.sort(function (a, b) { return a.s - b.s; });
  }
  function dueToday(M) { return M.active.filter(function (t) { return E.parse(t.deadline).toDateString() === M.NOW.toDateString(); }); }
  function strip(M, o) {
    o = o || {};
    var h = '<div class="strip" role="img" aria-label="Jadwal hari ini dari pukul 07.00 sampai 22.00">';
    scheduleItems(M, o).forEach(function (it) {
      var cls = it.kind === 'blk' ? 'blk ' + it.q.toLowerCase() : it.kind;
      h += '<span class="strip__seg ' + cls + (it.e <= M.NOWH ? ' past' : '') + '" style="left:' + pct(it.s) + ';width:calc(' + pct(it.e) + ' - ' + pct(it.s) + ')"></span>';
    });
    if (o.withBlocks !== false) dueToday(M).forEach(function (t) { var d = E.parse(t.deadline); h += '<span class="strip__due" style="left:' + pct(d.getHours() + d.getMinutes() / 60) + '"></span>'; });
    h += '<span class="strip__now" style="left:' + pct(M.NOWH) + '"></span></div>';
    h += '<div class="strip__axis num" aria-hidden="true">' + [7, 10, 13, 16, 19, 22].map(function (x) { return '<span>' + pad2(x) + '.00</span>'; }).join('') + '</div>';
    return h;
  }
  function agenda(M, o) {
    o = o || {};
    var rows = scheduleItems(M, o).map(function (it) { var r = {}; for (var k in it) r[k] = it[k]; r.time = E.hm(fmtH(it.s)) + '–' + E.hm(fmtH(it.e)); return r; });
    if (o.withBlocks !== false) dueToday(M).forEach(function (t) { var d = E.parse(t.deadline); rows.push({ kind: 'due', s: d.getHours() + d.getMinutes() / 60, time: E.clock(d), title: 'Deadline: ' + t.title, sub: t.q.label }); });
    rows.sort(function (a, b) { return a.s - b.s; });
    return '<div class="agenda">' + rows.map(function (r) {
      var past = r.e !== undefined && r.e <= M.NOWH;
      var sub = r.kind === 'rutin' ? esc(r.sub) + (past ? ' · selesai' : '') : r.kind === 'blk' ? esc(r.sub) : esc(r.sub);
      return '<div class="agenda__row' + (past ? ' past' : '') + '"><span class="agenda__time num">' + r.time + '</span><span class="agenda__what"><b>' + esc(r.title) + '</b><span>' + sub + '</span></span></div>';
    }).join('') + '</div>';
  }
  function scheduleLegend(M, due) {
    return '<p class="legend"><span><i class="lg-rutin"></i>Kuliah &amp; kegiatan</span><span><i class="lg-blk"></i>Blok kerja</span>' + (due === false ? '' : '<span><i class="lg-due"></i>Deadline</span>') + '<span><i class="lg-now"></i>Sekarang ' + E.clock(M.NOW) + '</span></p>';
  }
  function calLegend(sudden) {
    return '<p class="legend"><span><i class="lg-rutin"></i>Kuliah &amp; kegiatan</span><span><i class="lg-blk"></i>Blok kerja (tepi = prioritas)</span>' + (sudden ? '<span><i class="lg-mendadak"></i>Kejadian mendadak</span>' : '') + '</p>';
  }
  function dayViewM(M, o) { return R.dayView(scheduleItems(M, o), { nowH: M.NOWH, nowText: E.clock(M.NOW) }); }

  function emptyFokus() {
    return '<div class="panel"><p style="font-size:16px"><b>Belum ada tugas aktif.</b> Tambah tugas baru bila ada yang perlu dicatat; Priora akan mengurutkannya untukmu.</p><a class="btn btn--primary" href="s05a-quick-add.html" style="justify-self:start">' + icon('add') + 'Tambah tugas</a></div>';
  }
  function hariIniMain(M, o) {
    o = o || {};
    var behind = !!o.behind, D = M.D, NOW = M.NOW, H = behind ? 'p' : 'h1', H2 = behind ? 'p' : 'h2';
    function sec(id, title, aside, inner) { return '<section class="section" id="' + id + '" aria-labelledby="' + id + '-h"><div class="section__head"><' + H2 + ' id="' + id + '-h" class="h2">' + title + '</' + H2 + '>' + aside + '</div><div class="section__body">' + inner + '</div></section>'; }
    var fokus = M.focus.length ? '<div class="stack">' + heroCard(M.focus[0], NOW, D) + M.focus.slice(1).map(function (t) { return rowCard(t, {}, NOW, D); }).join('') + '</div>' : emptyFokus();
    var html = brandRow(syncStatus(D)) +
      '\n<header class="head"><' + H + ' class="h1">Hari Ini</' + H + '><p class="head__sub">' + E.dayLong(NOW) + ' · ' + E.clock(NOW) + '</p>\n' +
      week('Sen') + '\n' + summary(M.focusSet, M.scheduledH, D.settings.productiveHours) + '\n</header>\n<div data-notice></div>\n<main>\n' +
      sec('fokus', 'Fokus Hari Ini', '<span class="meta">urut prioritas</span>', fokus) + '\n' +
      sec('jadwal', 'Jadwal Hari Ini', '<a href="s10-kalender.html">Kalender</a>', strip(M) + scheduleLegend(M) + agenda(M)) + '\n' +
      (M.others.length ? sec('lain', 'Tugas Lain', '<a href="s07-daftar-tugas.html">Semua tugas</a>', '<div class="stack">' + M.others.map(function (t) { return rowCard(t, {}, NOW, D); }).join('') + '</div>') + '\n' : '') +
      (M.overdue.length ? sec('terlewat', 'Terlewat <span class="num">(' + M.overdue.length + ')</span>', '', '<div class="stack">' + M.overdue.map(function (t) { return overdueCard(t, {}, NOW, D); }).join('') + '</div>') + '\n' : '') +
      '</main>';
    if (behind) html = html.replace(/class="h1"/g, 'class="h1" style="font-size:24px;font-weight:700"').replace(/<p id="([a-z]+)-h" class="h2">/g, '<p id="$1-h" class="h2" style="font-size:17px;font-weight:600">');
    return html;
  }

  var GROUPS = ['Terlewat', 'Hari ini & besok', 'Minggu ini', 'Nanti'];
  function groupOf(t, NOW) {
    if (t.overdue) return 'Terlewat';
    var days = (E.parse(t.deadline) - new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())) / 864e5;
    return days < 2 ? 'Hari ini & besok' : days < 7 ? 'Minggu ini' : 'Nanti';
  }
  function daftarMain(M) {
    var D = M.D, NOW = M.NOW, all = M.overdue.concat(M.active);
    var counts = { all: all.length, OD: M.overdue.length };
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(function (q) { counts[q] = M.active.filter(function (t) { return t.quadrant === q; }).length; });
    var courses = []; all.forEach(function (t) { if (courses.indexOf(t.course) < 0) courses.push(t.course); });
    var chips = [['all', 'Semua'], ['OD', 'Terlewat'], ['Q1', 'Kerjakan Sekarang'], ['Q2', 'Jadwalkan'], ['Q3', 'Selesaikan Cepat'], ['Q4', 'Bisa Ditunda']].map(function (c) {
      return '<button type="button" class="chip" role="radio" aria-checked="' + (c[0] === 'all') + '" data-v="' + c[0] + '">' + c[1] + ' <span class="num">' + counts[c[0]] + '</span></button>';
    }).join('');
    var groups = GROUPS.map(function (g) {
      var ts = all.filter(function (t) { return groupOf(t, NOW) === g; }); if (!ts.length) return '';
      var id = 'g-' + g.toLowerCase().replace(/[^a-z]+/g, '-');
      return '<section class="section" data-grp aria-labelledby="' + id + '"><div class="section__head"><h2 id="' + id + '">' + g + '</h2><span class="meta num" data-grp-count>' + ts.length + '</span></div><div class="stack">' +
        ts.map(function (t) { return t.overdue ? overdueCard(t, { actions: false, group: g }, NOW, D) : rowCard(t, { group: g }, NOW, D); }).join('') + '</div></section>';
    }).join('');
    return brandRow(syncStatus(D)) +
      '\n<header class="head head--row"><div><h1>Tugas</h1><p class="head__sub"><span class="num">' + all.length + '</span> tugas · <span class="num">' + M.overdue.length + '</span> terlewat</p></div><a class="btn btn--primary btn--sm" href="s05a-quick-add.html">' + icon('add') + 'Tambah</a></header>\n<main>\n' +
      '<div class="section" style="padding-top:16px">\n  <div class="field"><label for="cari">Cari tugas</label><input class="input" id="cari" type="search" placeholder="Judul atau mata kuliah" autocomplete="off"></div>\n' +
      '  <details class="more" data-saring>\n    <summary>' + icon('keyboard_arrow_down') + 'Saring: <span data-filter-label>semua tugas</span></summary>\n    <div class="more__body">\n' +
      '      <div class="field"><span class="field__label" id="sf-l">Prioritas</span>\n        <div class="chips" role="radiogroup" aria-labelledby="sf-l" data-filter>' + chips + '</div></div>\n' +
      '      <div class="field"><label for="mk">Mata kuliah</label>\n        <select class="input" id="mk" data-course><option value="all">Semua mata kuliah</option>' + courses.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>\n' +
      '    </div>\n  </details>\n</div>\n' + groups +
      '<section class="section" data-empty ' + (all.length ? 'hidden ' : '') + 'aria-live="polite"><div class="panel"><p>' + (all.length ? 'Tidak ada tugas yang cocok dengan saringan ini.' : 'Belum ada tugas aktif.') + '</p><button class="btn btn--secondary" type="button" data-reset style="justify-self:start">Tampilkan semua</button></div></section>\n' +
      '<div style="height:24px" aria-hidden="true"></div>\n</main>';
  }

  function kalenderMain(M) {
    var D = M.D, NOW = M.NOW;
    return brandRow(syncStatus(D)) +
      '\n<header class="head head--row"><div><h1>Kalender</h1><p class="head__sub" data-cal-sub>' + E.dayLong(NOW) + ' 2026</p></div><a class="btn btn--primary btn--sm" href="s05a-quick-add.html">' + icon('add') + 'Tambah</a></header>\n' +
      '<main class="section" style="padding-top:12px">\n  <div class="seg cal-view" role="radiogroup" aria-label="Tampilan kalender" data-view>' +
      [['day', 'Hari'], ['week', 'Minggu'], ['month', 'Bulan']].map(function (v) { return '<button type="button" role="radio" aria-checked="' + (v[0] === 'day') + '" data-v="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>\n' +
      '  <div data-weekbar>' + week('Sen') + '</div>\n' +
      '  <section data-panel="day" aria-label="Hari">' + calLegend(!!D.applied) + '<div data-day-solo hidden></div><div data-day-today>' + dayViewM(M) + '</div></section>\n' +
      '  <section data-panel="week" aria-label="Minggu" hidden>' + weekList(M.TASKS, NOW, D) + '</section>\n' +
      '  <section data-panel="month" aria-label="Bulan" hidden>' + monthGrid(M.TASKS, NOW) + '</section>\n  <div style="height:24px" aria-hidden="true"></div>\n</main>';
  }

  function diterapkanMain(M) {
    var D = M.D, NOW = M.NOW, A = D.applied || { movedOut: [] };
    var moved = A.movedOut.length ? A.movedOut.map(function (m) { return esc(M.byId[m.task].title) + ' dipindah ke ' + m.day.toLowerCase() + ' ' + E.hm(m.start) + '–' + E.hm(m.end) + '.'; }).join(' ') : 'Semua usulan dijadwalkan hari ini.';
    return brandRow(syncStatus(D)) +
      '\n<header class="head"><h1>Kalender</h1><p class="head__sub">' + E.dayLong(NOW) + ' · jadwal baru diterapkan ' + E.clock(NOW) + '</p></header>\n' +
      '<main class="section" style="padding-top:16px">' + week('Sen') + '\n<div class="notice" style="margin:16px 0 0">' + icon('info') + '<span data-moved-out>' + moved + '</span></div>\n' +
      '<div style="margin-top:16px">' + calLegend(true) + '</div>' + dayViewM(M, { sudden: true }) + '<div style="height:24px" aria-hidden="true"></div></main>';
  }

  var api = {
    model: model, scheduleItems: scheduleItems, scheduleLegend: scheduleLegend, calLegend: calLegend, dayViewM: dayViewM,
    hariIniMain: hariIniMain, daftarMain: daftarMain, kalenderMain: kalenderMain, diterapkanMain: diterapkanMain, groupOf: groupOf,
    dayAgenda: dayAgenda, weekList: weekList, monthGrid: monthGrid,
    MARK: MARK, nav: nav, brandRow: brandRow, syncStatus: syncStatus, detailHref: detailHref, fab: fab, tone: tone,
    heroCard: heroCard, rowCard: rowCard, overdueCard: overdueCard, strip: strip, agenda: agenda, week: week, summary: summary,
    detail: detail
  };

  root.PrioraViews = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

