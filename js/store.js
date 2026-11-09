/* Priora — penyimpanan prototipe (FR-15: tetap berfungsi tanpa internet).
   Menyimpan perubahan pengguna di atas data contoh (data.js) supaya bertahan antarlayar:
   tugas baru, Selesai, Tunda, Mulai, progres, kunci prioritas, jadwal ulang, pengaturan.
   Tidak ada jaringan. Urutan penyimpanan: localStorage → window.name (selama tab terbuka) → memori. */
(function (root) {
  'use strict';
  var KEY = 'priora:v1', NAMEKEY = 'priora-state:';
  var seed = null, state = null, mode = 'memory', listeners = [];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toH(s) { var p = String(s).split(':').map(Number); return p[0] + p[1] / 60; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(h) { var hh = Math.floor(h + 1e-9), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return pad(hh) + ':' + pad(mm); }
  function addMin(s, m) { return hhmm(toH(s) + m / 60); }

  function canLocal() {
    try { var k = '__priora_probe'; root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k); return true; } catch (e) { return false; }
  }
  function canName() { try { return typeof root.name === 'string'; } catch (e) { return false; } }

  function fresh() {
    return {
      v: 1, seedVersion: seed.seedVersion,
      tasks: clone(seed.tasks), blocks: clone(seed.blocks),
      settings: { failsafeEmail: seed.settings.failsafeEmail },
      snoozes: {}, started: {}, applied: null, queue: [], nextId: 1
    };
  }
  function valid(s) {
    return s && s.v === 1 && s.seedVersion === seed.seedVersion && Array.isArray(s.tasks) && Array.isArray(s.blocks) &&
      s.settings && typeof s.snoozes === 'object' && typeof s.started === 'object' && Array.isArray(s.queue);
  }
  function read() {
    var raw = null;
    if (mode === 'local') { try { raw = root.localStorage.getItem(KEY); } catch (e) { raw = null; } }
    else if (mode === 'name') { try { if (root.name.indexOf(NAMEKEY) === 0) raw = root.name.slice(NAMEKEY.length); } catch (e) { raw = null; } }
    if (!raw) return null;
    try { var s = JSON.parse(raw); return valid(s) ? s : null; } catch (e) { return null; }
  }
  function write() {
    var raw = JSON.stringify(state);
    if (mode === 'local') {
      try { root.localStorage.setItem(KEY, raw); return; }
      catch (e) { mode = canName() ? 'name' : 'memory'; } // penuh / ditolak di tengah jalan
    }
    if (mode === 'name') { try { root.name = NAMEKEY + raw; } catch (e) { mode = 'memory'; } }
  }
  // Setiap aksi melapor ke pendengar (Store.on) dengan jenis dan rinciannya; dipakai pencatat uji di Fase 5
  function changed(type, detail) { write(); listeners.forEach(function (fn) { try { fn({ type: type, detail: detail || {} }); } catch (e) { /* pendengar tidak boleh merusak penyimpanan */ } }); }

  function find(id) { for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === id) return state.tasks[i]; return null; }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'tugas'; }
  function isOpen(t) { return t && t.status !== 'done'; }

  /* Jadwal ulang (SDD 3.3.5, rule-based): rencana contoh dari data.js, diterapkan pada blok kerja yang ada.
     simulate() hanya menghitung; applyPlan() menyimpan. */
  function plan(opt) {
    opt = opt || {};
    var ganti = (opt.ganti || []).slice(), blocks = clone(state.blocks), movedOut = [];
    seed.plan.forEach(function (p) {
      var t = find(p.task); if (!isOpen(t)) return;
      blocks = blocks.filter(function (b) { return b.task !== p.task; });
      var slot = ganti.indexOf(p.task) > -1 ? p.alt[0] : p.to;
      if (slot.day === 'Hari ini') blocks.push({ task: p.task, start: slot.start, end: slot.end, isNew: true, from: p.from ? p.from.start : null });
      else movedOut.push({ task: p.task, day: slot.day, start: slot.start, end: slot.end });
    });
    if (opt.malam && isOpen(find('laporan')) && !blocks.some(function (b) { return b.task === 'laporan' && b.start === '20:00'; }))
      blocks.push({ task: 'laporan', start: '20:00', end: '22:00', isNew: true, extra: true });
    // blok yang bertumpuk tidak boleh diam-diam saling menutupi: yang belakangan mulai setelah yang depan selesai
    blocks.sort(function (a, b) { return toH(a.start) - toH(b.start); });
    for (var i = 1; i < blocks.length; i++) if (toH(blocks[i].start) < toH(blocks[i - 1].end)) blocks[i].start = blocks[i - 1].end;
    blocks = blocks.filter(function (b) { return toH(b.end) > toH(b.start); });
    return { blocks: blocks, applied: { ganti: ganti, malam: !!opt.malam, movedOut: movedOut } };
  }

  var api = {
    /* init(seedData, opts): opts.storage = 'memory' memaksa tanpa penyimpanan (dipakai build di Node) */
    init: function (data, opts) {
      seed = data; opts = opts || {};
      mode = opts.storage === 'memory' ? 'memory' : (canLocal() ? 'local' : (canName() ? 'name' : 'memory'));
      state = read() || fresh();
      return api;
    },
    mode: function () { return mode; },
    on: function (fn) { listeners.push(fn); },

    /* data(): bentuk sama dengan PrioraData, sehingga engine.enrich(data) dan semua tampilan dapat memakainya langsung */
    data: function (o) {
      o = o || {};
      var d = clone(seed), sim = o.simulate ? plan(o.simulate) : null;
      d.tasks = clone(state.tasks).map(function (t) {
        var sn = state.snoozes[t.id]; if (sn) { t.snoozedUntil = sn.until; t.snoozeCount = sn.count; }
        if (state.started[t.id]) t.startedAt = state.started[t.id];
        return t;
      });
      var open = {}; d.tasks.forEach(function (t) { if (isOpen(t)) open[t.id] = true; });
      var blocks = sim ? sim.blocks : state.blocks;
      d.blocks = clone(blocks).filter(function (b) { return open[b.task]; });
      d.applied = sim ? sim.applied : (state.applied ? { ganti: state.applied.ganti, malam: state.applied.malam, movedOut: state.applied.movedOut } : null);
      d.settings.failsafeEmail = state.settings.failsafeEmail;
      return d;
    },

    /* ---- aksi ---- */
    addTask: function (t) {
      var cats = seed.categories, cat = cats[t.category] ? t.category : 'Tugas Mingguan';
      var base = slug(t.title), id = base + '-' + state.nextId++;
      while (find(id)) id = base + '-' + state.nextId++;
      var task = {
        id: id, title: String(t.title).trim().slice(0, 120), course: seed.courses[t.course] ? t.course : 'Pribadi', category: cat,
        deadline: t.deadline, est: Number(t.est) > 0 ? Number(t.est) : cats[cat].est, progress: 0,
        importance: Math.min(5, Math.max(1, Math.round(Number(t.importance)) || 3)), status: 'todo'
      };
      state.tasks.push(task); changed('addTask', { id: task.id, title: task.title, category: task.category, deadline: task.deadline }); return task;
    },
    setStatus: function (id, status, how) {
      var t = find(id); if (!t) return;
      t.status = status; if (how) t.closedAs = how; else delete t.closedAs;
      if (status === 'done') { delete state.snoozes[id]; delete state.started[id]; }
      changed('setStatus', { id: id, status: status, how: how || null });
    },
    snooze: function (id, minutes, nowHM) {
      var sn = state.snoozes[id] || { count: 0 };
      state.snoozes[id] = { count: sn.count + 1, until: addMin(nowHM || '09:40', minutes) };
      changed('snooze', { id: id, minutes: minutes, count: state.snoozes[id].count }); return state.snoozes[id];
    },
    clearSnooze: function (id) { delete state.snoozes[id]; changed('clearSnooze', { id: id }); },
    toggleStart: function (id, nowHM) {
      var on = !state.started[id];
      if (on) state.started[id] = nowHM || '09:40'; else delete state.started[id];
      changed('toggleStart', { id: id, on: on }); return on;
    },
    setProgress: function (id, pct) { var t = find(id); if (!t) return; t.progress = Math.max(0, Math.min(100, Number(pct) || 0)); changed('setProgress', { id: id, progress: t.progress }); },
    setOverride: function (id, q) { var t = find(id); if (!t) return; if (q) t.override = q; else delete t.override; changed('setOverride', { id: id, override: q || null }); },
    /* FR-08: kunci prioritas berlaku sampai deadline atau kepentingan diubah, jadi deadline baru melepasnya */
    setDeadline: function (id, deadline) { var t = find(id); if (!t) return; t.deadline = deadline; delete t.override; changed('setDeadline', { id: id, deadline: deadline }); },
    moveBlock: function (id, start, end) {
      var moved = false;
      state.blocks.forEach(function (b) { if (b.task === id && !moved) { b.start = start; b.end = end; b.isNew = true; b.from = b.from || null; moved = true; } });
      if (!moved) state.blocks.push({ task: id, start: start, end: end, isNew: true, from: null });
      changed('moveBlock', { id: id, start: start, end: end });
    },
    simulate: function (opt) { return plan(opt); },
    applyPlan: function (opt) {
      if (state.applied) state.blocks = state.applied.snapshot; // menerapkan ulang: mulai dari jadwal sebelum diterapkan, bukan menumpuk
      var r = plan(opt), snapshot = clone(state.blocks);
      state.blocks = r.blocks; state.applied = { ganti: r.applied.ganti, malam: r.applied.malam, movedOut: r.applied.movedOut, snapshot: snapshot };
      changed('applyPlan', { ganti: r.applied.ganti, malam: r.applied.malam }); return r.applied;
    },
    undoPlan: function () {
      if (!state.applied) return false;
      state.blocks = state.applied.snapshot; state.applied = null; changed('undoPlan'); return true;
    },
    setSetting: function (k, v) { state.settings[k] = v; changed('setSetting', { key: k, value: v }); },
    reset: function () { state = fresh(); changed('reset'); },

    /* pesan sekali tampil, dibawa ke layar berikutnya (pengganti ?msg=); undo = {fn, args} dijalankan lewat run() */
    say: function (text, undo) { state.queue.push({ text: text, undo: undo || null }); write(); },
    takeMessage: function () { if (!state.queue.length) return null; var m = state.queue.shift(); write(); return m; },
    run: function (spec) { // hanya aksi pembatalan yang dikenal; spesifikasi ikut tersimpan sehingga tidak dipercaya mentah
      var ok = ['setStatus', 'clearSnooze', 'undoPlan', 'toggleStart', 'setProgress', 'setOverride'];
      if (spec && ok.indexOf(spec.fn) > -1) return api[spec.fn].apply(api, spec.args || []);
    }
  };

  root.PrioraStore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
