// Priora — generator layar statis. Jalankan: node tools/build.mjs
// Menulis js/icons.js, screens/*.html dan index.html dari js/data.js + js/engine.js + js/render.js.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// ---------- ikon (Material Symbols Rounded, Apache-2.0) ----------
const icons = {};
for (const f of readdirSync(join(ROOT, 'tools/icons')).filter(f => f.endsWith('.svg'))) {
  const svg = readFileSync(join(ROOT, 'tools/icons', f), 'utf8');
  icons[f.replace('.svg', '')] = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}
writeFileSync(join(ROOT, 'js/icons.js'),
  '/* Material Symbols Rounded (Apache-2.0), dibangkitkan oleh tools/build.mjs */\n(function (root) {\n  var I = ' +
  JSON.stringify(icons) + ';\n  root.PrioraIcons = I;\n  if (typeof module !== "undefined" && module.exports) module.exports = I;\n})(typeof window !== "undefined" ? window : globalThis);\n');

const D = require(join(ROOT, 'js/data.js'));
const E = require(join(ROOT, 'js/engine.js')).PrioraEngine || require(join(ROOT, 'js/engine.js'));
const R = require(join(ROOT, 'js/render.js'));
const V = require(join(ROOT, 'js/views.js'));
const { icon, badge, overdueBadge, slack, esc, durH, srLabel, quadWhy } = R;


const NOW = E.parse(D.now);
const NOWH = NOW.getHours() + NOW.getMinutes() / 60;
const TASKS = E.enrich(D);
const byId = Object.fromEntries(TASKS.map(t => [t.id, t]));
const active = TASKS.filter(t => !t.overdue && t.status !== 'done').sort((a, b) => b.score - a.score);
const overdue = TASKS.filter(t => t.overdue);
const focus = active.slice(0, 3), others = active.slice(3);
// Jam kerja yang sudah dijadwalkan hari ini: dijumlah dari blok kerja di data, bukan diketik.
const scheduledH = D.blocks.reduce((s, b) => s + (E.toH(b.end) - E.toH(b.start)), 0);
const tone = c => 'tone-' + D.courses[c].tone;

// Pemeriksaan engine terhadap tabel contoh SDD 3.3.1 (satu sumber: tools/check-engine.mjs; gagal = build berhenti)
await import('./check-engine.mjs');

// ---------- kerangka halaman ----------
const MARK = (light) => `<svg class="brand__mark" viewBox="0 0 20 20" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="2" fill="${light ? '#fff' : 'currentColor'}"/><rect x="11.75" y="1.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="1.75" y="11.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="11.75" y="11.75" width="6.5" height="6.5" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;

function page({ file, title, body, bodyClass = '', dock = 0, theme = '#f2f4f7', desc = '' }) {
  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)} · Priora</title>
<meta name="description" content="${esc(desc || title)}">
<meta name="theme-color" content="${theme}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Crect x='1' y='1' width='8' height='8' rx='2' fill='%23111418'/%3E%3Crect x='11.75' y='1.75' width='6.5' height='6.5' rx='1.5' fill='none' stroke='%23111418' stroke-width='1.5'/%3E%3Crect x='1.75' y='11.75' width='6.5' height='6.5' rx='1.5' fill='none' stroke='%23111418' stroke-width='1.5'/%3E%3Crect x='11.75' y='11.75' width='6.5' height='6.5' rx='1.5' fill='none' stroke='%23111418' stroke-width='1.5'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/components.css">
</head>
<body class="${bodyClass}" style="--dock:${dock}px">
${body}
<script src="../js/icons.js"></script>
<script src="../js/data.js"></script>
<script src="../js/engine.js"></script>
<script src="../js/render.js"></script>
<script src="../js/views.js"></script>
<script src="../js/app.js"></script>
</body>
</html>
`;
  writeFileSync(join(ROOT, 'screens', file), html);
}

const NAV = [['Hari Ini', 'home', 's04-hari-ini.html'], ['Kalender', 'calendar_month', 's10-kalender.html'], ['Tugas', 'list', 's07-daftar-tugas.html'], ['Profil', 'person', 's14-profil.html']];
function nav(current) {
  return `<nav class="nav" aria-label="Navigasi utama">${NAV.map(([l, ic, href]) =>
    `<a href="${href}"${l === current ? ' aria-current="page"' : ''}><span class="nav__pill">${icon(ic)}</span>${l}</a>`).join('')}</nav>`;
}
const brandRow = (end = '') => `<div class="top"><a class="brand" href="s04-hari-ini.html">${MARK()}Priora</a><div class="top__end">${end}</div></div>`;
const syncStatus = () => `<span class="status" data-sync>${icon('sync')}Tersinkron ${D.settings.lastSync}</span>`;
const detailHref = t => `s06-detail.html?id=${t.id}`;
const fab = (cls = '') => `<a class="fab ${cls}" href="s05a-quick-add.html" aria-label="Tambah tugas">${icon('add')}</a>`;

// ---------- kartu tugas ----------
function heroCard(t) {
  const left = E.dur(t.T);
  return `<article class="task ${t.quadrant.toLowerCase()} task--hero" data-task="${t.id}" data-swipe aria-label="${esc(srLabel(t))}">
  <div class="task__row">${badge(t.quadrant)}</div>
  <h3 class="task__title"><a href="${detailHref(t)}">${esc(t.title)}</a></h3>
  <div class="task__meta"><i class="dot ${tone(t.course)}"></i><span>${esc(t.course)}</span></div>
  <div class="hero-fig"><span class="fig">${left}</span><span class="sub">lagi · deadline ${E.deadlineText(t, NOW)}</span></div>
  ${slack(t.A, t.R, { tail: ` · <a class="link" href="${detailHref(t)}#mengapa">Mengapa?</a>` })}
  <p class="state-line" data-state-line hidden></p>
  <div class="task__actions">
    <button class="btn btn--primary btn--sm" type="button" data-act="start">${icon('play_arrow')}Mulai</button>
    <button class="btn btn--secondary btn--sm" type="button" data-act="done">Selesai</button>
    <button class="btn btn--ghost btn--sm" type="button" data-act="snooze">Tunda</button>
  </div>
</article>`;
}
function rowCard(t, o = {}) {
  return `<article class="task ${t.quadrant.toLowerCase()}" data-task="${t.id}" data-q="${t.quadrant}" data-group="${o.group || ''}" aria-label="${esc(srLabel(t))}">
  <div class="task__row">${badge(t.quadrant)}<span class="task__left fig">${E.dur(t.T)}</span></div>
  <h3 class="task__title"><a href="${detailHref(t)}">${esc(t.title)}</a></h3>
  <div class="task__meta"><i class="dot ${tone(t.course)}"></i><span>${esc(t.course)} · ${E.deadlineText(t, NOW)}</span></div>
  ${slack(t.A, t.R, { thin: true })}
</article>`;
}
function overdueCard(t, o = {}) {
  return `<article class="task od" data-task="${t.id}" data-q="OD" data-group="${o.group || ''}" aria-label="${esc(srLabel(t))}">
  <div class="task__row">${overdueBadge()}<span class="task__left fig">${E.dur(t.T)} lalu</span></div>
  <h3 class="task__title"><a href="${detailHref(t)}">${esc(t.title)}</a></h3>
  <div class="task__meta"><i class="dot ${tone(t.course)}"></i><span>${esc(t.course)} · ${E.deadlineText(t, NOW)}</span></div>
  ${o.actions === false ? '' : `<p class="od-copy">Tugas ini sudah lewat deadline. Mau tandai selesai atau atur deadline baru?</p>
  <div class="task__actions">
    <button class="btn btn--secondary btn--sm" type="button" data-act="submitted">Sudah dikumpulkan</button>
    <a class="btn btn--ghost btn--sm" href="${detailHref(t)}#deadline-baru">Deadline baru</a>
  </div>`}
</article>`;
}

// ---------- jadwal hari ini ----------
const DAY0 = 7, DAY1 = 22;
const pct = h => ((h - DAY0) / (DAY1 - DAY0) * 100).toFixed(2) + '%';
function scheduleItems({ withBlocks = true, sudden = false, plan = false } = {}) {
  const items = D.events.map(e => ({ kind: 'rutin', title: e.title, sub: e.where, s: E.toH(e.start), e: E.toH(e.end) }));
  if (withBlocks) {
    const blocks = plan ? planBlocks() : D.blocks;
    for (const b of blocks) {
      const t = byId[b.task];
      items.push({ kind: 'blk', q: t.quadrant, task: t.id, title: t.title, sub: b.sub || ('Blok kerja · ' + t.q.label), s: E.toH(b.start), e: E.toH(b.end), isNew: b.isNew });
    }
  }
  if (sudden) items.push({ kind: 'mendadak', title: D.sudden.title + ' (mendadak)', sub: 'Kejadian mendadak', s: E.toH(D.sudden.start), e: E.toH(D.sudden.end) });
  return items.sort((a, b) => a.s - b.s);
}
function planBlocks() {
  return D.plan.filter(p => p.to.day === 'Hari ini').map(p => ({ task: p.task, start: p.to.start, end: p.to.end, isNew: true,
    sub: p.from ? 'Dipindah dari ' + E.hm(p.from.start) + ' · ' + byId[p.task].q.label : 'Dijadwalkan baru · ' + byId[p.task].q.label }));
}
const dueToday = () => active.filter(t => E.parse(t.deadline).toDateString() === NOW.toDateString());
function strip(opts = {}) {
  const items = scheduleItems(opts);
  let h = `<div class="strip" role="img" aria-label="Jadwal hari ini dari pukul 07.00 sampai 22.00">`;
  for (const it of items) {
    const cls = it.kind === 'blk' ? `blk ${it.q.toLowerCase()}` : it.kind;
    h += `<span class="strip__seg ${cls}${it.e <= NOWH ? ' past' : ''}" style="left:${pct(it.s)};width:calc(${pct(it.e)} - ${pct(it.s)})"></span>`;
  }
  if (opts.withBlocks !== false) for (const t of dueToday()) { const d = E.parse(t.deadline); h += `<span class="strip__due" style="left:${pct(d.getHours() + d.getMinutes() / 60)}"></span>`; }
  h += `<span class="strip__now" style="left:${pct(NOWH)}"></span></div>`;
  h += `<div class="strip__axis num" aria-hidden="true">${[7, 10, 13, 16, 19, 22].map(x => `<span>${String(x).padStart(2, '0')}.00</span>`).join('')}</div>`;
  return h;
}
function agenda(opts = {}) {
  const rows = scheduleItems(opts).map(it => ({ ...it, time: E.hm(fmtH(it.s)) + '–' + E.hm(fmtH(it.e)) }));
  if (opts.withBlocks !== false) for (const t of dueToday()) { const d = E.parse(t.deadline); rows.push({ kind: 'due', s: d.getHours() + d.getMinutes() / 60, time: E.clock(d), title: 'Deadline: ' + t.title, sub: t.q.label }); }
  rows.sort((a, b) => a.s - b.s);
  return `<div class="agenda">${rows.map(r => {
    const past = r.e !== undefined && r.e <= NOWH;
    const sub = r.kind === 'rutin' ? `${esc(r.sub)}${past ? ' · selesai' : ''}` : r.kind === 'blk' ? 'Blok kerja · ' + byId[r.task].q.label : esc(r.sub);
    return `<div class="agenda__row${past ? ' past' : ''}"><span class="agenda__time num">${r.time}</span><span class="agenda__what"><b>${r.kind === 'blk' ? esc(r.title) : esc(r.title)}</b><span>${sub}</span></span></div>`;
  }).join('')}</div>`;
}
function fmtH(h) { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
const scheduleLegend = (due = true) => `<p class="legend"><span><i class="lg-rutin"></i>Kuliah & kegiatan</span><span><i class="lg-blk"></i>Blok kerja</span>${due ? '<span><i class="lg-due"></i>Deadline</span>' : ''}<span><i class="lg-now"></i>Sekarang ${E.clock(NOW)}</span></p>`;

// ---------- S04 Hari Ini ----------
function hariIniMain({ behind = false } = {}) {
  const H = behind ? 'p' : 'h1';
  const H2 = behind ? 'p' : 'h2';
  const sec = (id, title, aside, inner) => `<section class="section" id="${id}" aria-labelledby="${id}-h"><div class="section__head"><${H2} id="${id}-h" class="h2">${title}</${H2}>${aside}</div><div class="section__body">${inner}</div></section>`;
  return `${brandRow(syncStatus())}
<header class="head"><${H} class="h1">Hari Ini</${H}><p class="head__sub">${E.dayLong(NOW)} · ${E.clock(NOW)}</p>
${V.week('Sen')}
${V.summary(focus, scheduledH, D.settings.productiveHours)}
</header>
<div data-notice></div>
<main>
${sec('fokus', 'Fokus Hari Ini', `<span class="meta">urut prioritas</span>`, `<div class="stack">${V.heroCard(focus[0], NOW, D)}${focus.slice(1).map(t => V.rowCard(t, {}, NOW, D)).join('')}</div>`)}
${sec('jadwal', 'Jadwal Hari Ini', `<a href="s10-kalender.html">Kalender</a>`, strip() + scheduleLegend() + agenda())}
${sec('lain', 'Tugas Lain', `<a href="s07-daftar-tugas.html">Semua tugas</a>`, `<div class="stack">${others.map(t => V.rowCard(t, {}, NOW, D)).join('')}</div>`)}
${sec('terlewat', `Terlewat <span class="num">(${overdue.length})</span>`, '', `<div class="stack">${overdue.map(t => V.overdueCard(t, {}, NOW, D)).join('')}</div>`)}
</main>`.replace(/class="h1"/g, behind ? 'class="h1" style="font-size:24px;font-weight:700"' : 'class="h1"').replace(/<p id="([a-z]+)-h" class="h2">/g, '<p id="$1-h" class="h2" style="font-size:17px;font-weight:600">');
}

const hariIniDock = () => `<div class="dock">
  <div class="dock__actions"><a class="btn btn--secondary grow" href="s11a-kejadian-mendadak.html">${icon('event_repeat')}Ada Kejadian Mendadak</a>${fab()}</div>
  ${nav('Hari Ini')}
</div>`;

const skeletonCard = (h) => `<div class="task" aria-hidden="true" style="border-left-color:var(--border)"><span class="sk" style="width:120px;height:24px"></span><span class="sk" style="width:80%;height:22px"></span>${h ? '<span class="sk" style="width:140px;height:36px"></span><span class="sk" style="width:100%;height:10px"></span><span class="sk" style="width:220px;height:44px;border-radius:999px"></span>' : '<span class="sk" style="width:60%;height:16px"></span>'}</div>`;
const S04_TEMPLATES = `
<template id="tpl-kosong-fokus"><div class="panel"><p style="font-size:16px"><b>Belum ada tugas.</b> Tambah tugas pertamamu; Priora akan mengurutkannya untukmu.</p><a class="btn btn--primary" href="s05a-quick-add.html" style="justify-self:start">${icon('add')}Tambah tugas</a></div></template>
<template id="tpl-kosong-jadwal">${strip({ withBlocks: false })}${scheduleLegend(false)}${agenda({ withBlocks: false })}</template>
<template id="tpl-memuat-fokus"><div class="stack" aria-busy="true"><p class="sr">Memuat tugas…</p>${skeletonCard(true)}${skeletonCard()}${skeletonCard()}</div></template>
<template id="tpl-memuat-jadwal"><div aria-busy="true"><span class="sk" style="height:28px"></span><div class="agenda">${[1, 2, 3, 4].map(() => '<div class="agenda__row"><span class="sk" style="width:80px;height:16px"></span><span class="sk" style="width:70%;height:20px"></span></div>').join('')}</div></div></template>
<template id="tpl-offline"><div class="notice" role="status">${icon('cloud_off')}<span>Tersimpan di HP-mu. Akan disinkronkan saat online.</span></div></template>
<template id="tpl-error"><div class="notice" role="status">${icon('sync_problem')}<span>Sinkronisasi belum berhasil. Semua perubahan aman di HP-mu. Terakhir tersinkron ${D.settings.lastSync}.</span><button class="link" type="button" data-retry style="margin-left:auto;min-height:24px;white-space:nowrap">Coba lagi</button></div></template>`;

page({ file: 's04-hari-ini.html', title: 'Hari Ini', desc: 'Beranda Priora: fokus hari ini, jadwal, tugas lain, dan tugas terlewat.', dock: 138,
  body: `<div class="app" data-screen="s04">${hariIniMain()}</div>${hariIniDock()}${S04_TEMPLATES}
<div class="snack" role="status" aria-live="polite" hidden><p data-snack-text></p><button class="btn btn--ghost btn--sm" type="button" data-snack-undo hidden>Urungkan</button></div>` });

// ---------- lapisan belakang untuk sheet ----------
const behindS04 = () => `<div class="behind" aria-hidden="true" inert><div class="app">${hariIniMain({ behind: true })}</div><div class="dock" style="z-index:5"><div class="dock__actions"><span class="btn btn--secondary grow">${icon('event_repeat')}Ada Kejadian Mendadak</span><span class="fab">${icon('add')}</span></div>${nav('Hari Ini')}</div></div><div class="scrim" data-close-to="s04-hari-ini.html"></div>`;

// ---------- S05a Quick Add ----------
const cats = Object.keys(D.categories);
page({ file: 's05a-quick-add.html', title: 'Tambah tugas', desc: 'Quick Add: judul dan deadline, prioritas dihitung langsung.', bodyClass: 'is-sheet',
  body: `${behindS04()}
<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="qa-h" data-screen="s05a">
  <div class="sheet__grip" aria-hidden="true"></div>
  <div class="sheet__head"><h1 id="qa-h">Tambah tugas</h1><a class="icon-btn" href="s04-hari-ini.html" aria-label="Tutup">${icon('close')}</a></div>
  <form id="qa" class="sheet__body" novalidate>
    <div class="field">
      <label for="qa-title">Judul tugas</label>
      <input class="input" id="qa-title" name="title" autocomplete="off" placeholder="Mis. Laporan UTS Basis Data" aria-describedby="qa-title-err" required>
      <p class="field__hint" id="qa-title-err" data-err hidden>Tulis judul tugas dulu.</p>
    </div>
    <div class="field" role="radiogroup" aria-labelledby="qa-dl">
      <span class="field__label" id="qa-dl">Deadline</span>
      <div class="chips" data-deadline>
        <button type="button" class="chip" role="radio" aria-checked="true" data-dl="today">Hari ini 23.59</button>
        <button type="button" class="chip" role="radio" aria-checked="false" data-dl="tomorrow">Besok 23.59</button>
        <button type="button" class="chip" role="radio" aria-checked="false" data-dl="week">Minggu ini</button>
        <button type="button" class="chip" role="radio" aria-checked="false" data-dl="pick">Pilih tanggal</button>
      </div>
      <input class="input" type="datetime-local" id="qa-date" aria-label="Tanggal dan jam deadline" value="2026-10-22T23:59" min="2026-10-19T09:45" hidden>
    </div>
    <details class="more">
      <summary>${icon('keyboard_arrow_down')}Atur detail (opsional)</summary>
      <div class="more__body">
        <div class="field"><label for="qa-cat">Kategori</label>
          <select class="input" id="qa-cat">${cats.map(c => `<option${c === 'Tugas Mingguan' ? ' selected' : ''}>${c}</option>`).join('')}</select>
          <p class="field__hint" data-cat-hint>Terisi otomatis dari judul; bisa diganti.</p></div>
        <div class="field"><label for="qa-course">Mata kuliah</label>
          <select class="input" id="qa-course"><option value="">Tanpa mata kuliah</option>${Object.keys(D.courses).filter(c => c !== 'Pribadi').map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label for="qa-est">Estimasi durasi</label>
          <select class="input" id="qa-est">${[1, 2, 3, 4, 6, 8, 10, 12].map(n => `<option value="${n}">${n} jam</option>`).join('')}</select>
          <p class="field__hint">Bawaan mengikuti kategori.</p></div>
        <div class="field" role="radiogroup" aria-labelledby="qa-imp-l"><span class="field__label" id="qa-imp-l">Kepentingan menurutmu</span>
          <div class="seg" data-imp>${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" aria-checked="${n === 3}" data-v="${n}">${n}</button>`).join('')}</div></div>
      </div>
    </details>
    <div class="preview" aria-live="polite" data-preview>
      <div class="preview__row"><span style="font-size:14px;font-weight:600">Prioritas</span><span data-pv-badge>${badge('Q4')}</span></div>
      <p data-pv-text>Tulis judul untuk melihat perkiraan prioritas.</p>
    </div>
    <button class="btn btn--primary btn--block" type="submit">Simpan</button>
  </form>
</section>` });

// ---------- S06 Detail tugas (satu halaman, dirender dari ?id= oleh app.js lewat views.detail) ----------
page({ file: 's06-detail.html', title: 'Detail tugas', desc: 'Detail tugas dan alasan prioritasnya.', dock: 70,
  body: `<div id="screen-root" data-boot="s06"></div>
<noscript><p style="padding:16px">Halaman ini perlu JavaScript untuk menampilkan detail tugas. <a href="s04-hari-ini.html">Kembali ke Hari Ini</a></p></noscript>` });

// Nama lama (s06-detail-<id>.html) tetap hidup sebagai pengalih, supaya tautan dan catatan lama tidak putus.
for (const t of TASKS) {
  const to = `s06-detail.html?id=${t.id}`;
  writeFileSync(join(ROOT, 'screens', `s06-detail-${t.id}.html`), `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><title>Detail tugas · Priora</title>
<meta http-equiv="refresh" content="0; url=${to}">
<script>location.replace('${to}' + location.hash);</script></head>
<body><p><a href="${to}">Buka detail tugas</a></p></body></html>
`);
}

// ---------- S07 Daftar tugas ----------
function groupOf(t) {
  if (t.overdue) return 'Terlewat';
  const days = (E.parse(t.deadline) - new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate())) / 864e5;
  if (days < 2) return 'Hari ini & besok';
  if (days < 7) return 'Minggu ini';
  return 'Nanti';
}
const GROUPS = ['Terlewat', 'Hari ini & besok', 'Minggu ini', 'Nanti'];
const all = [...overdue, ...active];
const counts = { all: all.length, OD: overdue.length, Q1: active.filter(t => t.quadrant === 'Q1').length, Q2: active.filter(t => t.quadrant === 'Q2').length, Q3: active.filter(t => t.quadrant === 'Q3').length, Q4: active.filter(t => t.quadrant === 'Q4').length };
page({ file: 's07-daftar-tugas.html', title: 'Tugas', desc: 'Daftar semua tugas dengan filter kuadran dan status.', dock: 65,
  body: `<div class="app" data-screen="s07">${brandRow(syncStatus())}
<header class="head head--row"><div><h1>Tugas</h1><p class="head__sub"><span class="num">${all.length}</span> tugas · <span class="num">${overdue.length}</span> terlewat</p></div><a class="btn btn--primary btn--sm" href="s05a-quick-add.html">${icon('add')}Tambah</a></header>
<main>
<div class="section" style="padding-top:16px">
  <div class="field"><label for="cari">Cari tugas</label><input class="input" id="cari" type="search" placeholder="Judul atau mata kuliah" autocomplete="off"></div>
  <details class="more" data-saring>
    <summary>${icon('keyboard_arrow_down')}Saring: <span data-filter-label>semua tugas</span></summary>
    <div class="more__body">
      <div class="field"><span class="field__label" id="sf-l">Prioritas</span>
        <div class="chips" role="radiogroup" aria-labelledby="sf-l" data-filter>
          ${[['all', 'Semua'], ['OD', 'Terlewat'], ['Q1', 'Kerjakan Sekarang'], ['Q2', 'Jadwalkan'], ['Q3', 'Selesaikan Cepat'], ['Q4', 'Bisa Ditunda']].map(([v, l]) => `<button type="button" class="chip" role="radio" aria-checked="${v === 'all'}" data-v="${v}">${l} <span class="num">${counts[v]}</span></button>`).join('')}
        </div></div>
      <div class="field"><label for="mk">Mata kuliah</label>
        <select class="input" id="mk" data-course><option value="all">Semua mata kuliah</option>${[...new Set(all.map(t => t.course))].map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
    </div>
  </details>
</div>
${GROUPS.map(g => { const ts = all.filter(t => groupOf(t) === g); if (!ts.length) return ''; const id = 'g-' + g.toLowerCase().replace(/[^a-z]+/g, '-');
    return `<section class="section" data-grp aria-labelledby="${id}"><div class="section__head"><h2 id="${id}">${g}</h2><span class="meta num" data-grp-count>${ts.length}</span></div><div class="stack">${ts.map(t => t.overdue ? V.overdueCard(t, { actions: false, group: g }, NOW, D) : V.rowCard(t, { group: g }, NOW, D)).join('')}</div></section>`; }).join('')}
<section class="section" data-empty hidden aria-live="polite"><div class="panel"><p>Tidak ada tugas yang cocok dengan saringan ini.</p><button class="btn btn--secondary" type="button" data-reset style="justify-self:start">Tampilkan semua</button></div></section>
<div style="height:24px" aria-hidden="true"></div>
</main></div>
<div class="dock">${nav('Tugas')}</div>` });

// ---------- Kalender hari (S10, S11c) ----------
function dayView({ plan = false, sudden = false } = {}) {
  return R.dayView(scheduleItems({ plan, sudden }), { nowH: NOWH, nowText: E.clock(NOW) });
}
const calLegend = (sudden) => `<p class="legend"><span><i class="lg-rutin"></i>Kuliah & kegiatan</span><span><i class="lg-blk"></i>Blok kerja (tepi = prioritas)</span>${sudden ? '<span><i class="lg-mendadak"></i>Kejadian mendadak</span>' : ''}</p>`;
page({ file: 's10-kalender.html', title: 'Kalender', desc: 'Kalender dengan tampilan Hari, Minggu, dan Bulan; slot kosong bisa diisi tugas.', dock: 65,
  body: `<div class="app" data-screen="s10">${brandRow(syncStatus())}
<header class="head head--row"><div><h1>Kalender</h1><p class="head__sub" data-cal-sub>${E.dayLong(NOW)} 2026</p></div><a class="btn btn--primary btn--sm" href="s05a-quick-add.html">${icon('add')}Tambah</a></header>
<main class="section" style="padding-top:12px">
  <div class="seg cal-view" role="radiogroup" aria-label="Tampilan kalender" data-view>${[['day', 'Hari'], ['week', 'Minggu'], ['month', 'Bulan']].map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === 'day'}" data-v="${v}">${l}</button>`).join('')}</div>
  <div data-weekbar>${V.week('Sen')}</div>
  <section data-panel="day" aria-label="Hari">${calLegend(false)}<div data-day-solo hidden></div><div data-day-today>${dayView()}</div></section>
  <section data-panel="week" aria-label="Minggu" hidden>${V.weekList(TASKS, NOW, D)}</section>
  <section data-panel="month" aria-label="Bulan" hidden>${V.monthGrid(TASKS, NOW)}</section>
  <div style="height:24px" aria-hidden="true"></div>
</main></div>
<div class="dock">${nav('Kalender')}</div>` });
function MONTHS_LONG() { return 'Oktober'; }

// ---------- S11a Kejadian mendadak ----------
const TIMES = []; for (let m = 7 * 60; m <= 22 * 60; m += 15) TIMES.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'));
const timeSelect = (id, val) => `<select class="input num" id="${id}">${TIMES.map(t => `<option value="${t}"${t === val ? ' selected' : ''}>${E.hm(t)}</option>`).join('')}</select>`;

page({ file: 's11a-kejadian-mendadak.html', title: 'Ada kejadian mendadak', desc: 'Catat kejadian mendadak dan lihat apa yang bertabrakan.', bodyClass: 'is-sheet',
  body: `${behindS04()}
<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="km-h" data-screen="s11a">
  <div class="sheet__grip" aria-hidden="true"></div>
  <div class="sheet__head"><h1 id="km-h">Ada kejadian mendadak</h1><a class="icon-btn" href="s04-hari-ini.html" aria-label="Tutup">${icon('close')}</a></div>
  <form class="sheet__body" id="km" action="s11b-pratinjau-jadwal-ulang.html">
    <div class="field"><label for="km-title">Apa yang terjadi?</label><input class="input" id="km-title" value="${esc(D.sudden.title)}" autocomplete="off" placeholder="Mis. rapat BEM, antar keluarga"></div>
    <div class="row2">
      <div class="field"><label for="km-start">Mulai</label>${timeSelect('km-start', D.sudden.start)}</div>
      <div class="field"><label for="km-end">Selesai</label>${timeSelect('km-end', D.sudden.end)}</div>
    </div>
    <div class="chips" role="radiogroup" aria-label="Durasi cepat" data-dur>
      ${[['1', '1 jam'], ['2', '2 jam'], ['3', '3 jam'], ['22', 'Sampai 22.00']].map(([v, l]) => `<button type="button" class="chip" role="radio" aria-checked="${v === '3'}" data-v="${v}">${l}</button>`).join('')}
    </div>
    <div class="preview" aria-live="polite" data-impact></div>
    <button class="btn btn--primary btn--block" type="submit" data-km-submit>Lihat usulan jadwal</button>
  </form>
</section>` });

// ---------- S11b Pratinjau jadwal ulang ----------
const lap = byId.laporan;
const T_after = lap.T - (E.toH(D.sudden.end) - E.toH(D.sudden.start));
const A_after = T_after * D.settings.productiveHours / 24;
page({ file: 's11b-pratinjau-jadwal-ulang.html', title: 'Pratinjau jadwal ulang', desc: 'Usulan jadwal baru setelah kejadian mendadak, sebelum diterapkan.', dock: 73,
  body: `<div class="app" data-screen="s11b">
<div class="bar"><a class="icon-btn" href="s11a-kejadian-mendadak.html" aria-label="Kembali ke kejadian mendadak">${icon('arrow_back')}</a><span class="bar__title">Jadwal ulang</span></div>
<header class="head" style="padding-top:0"><h1>Usulan jadwal baru</h1><p class="head__sub">Belum ada yang berubah sampai kamu menekan Terapkan.</p></header>
<main>
<section class="section" aria-labelledby="imp-h" style="padding-top:16px"><div class="panel">
  <h2 id="imp-h" class="num">${esc(D.sudden.title)} · ${E.hm(D.sudden.start)}–${E.hm(D.sudden.end)}</h2>
  <p style="font-size:16px">2 blok kerja bertabrakan, dan <b>Kirim berkas panitia</b> jadi berisiko: deadline-nya ${E.clock(E.parse(byId.berkas.deadline))}, di tengah rapat.</p>
</div></section>
<section class="section" aria-labelledby="us-h"><div class="section__head"><h2 id="us-h">Usulan</h2><span class="meta num">${D.plan.length} perubahan</span></div><div class="stack">
${D.plan.map((p, i) => { const t = byId[p.task]; const slot = s => `${s.day} ${E.hm(s.start)}–${E.hm(s.end)}`;
    return `<article class="move ${t.quadrant.toLowerCase()}" data-move="${p.task}" data-alt='${JSON.stringify(p.alt.map(slot))}' data-to="${slot(p.to)}">
  <div class="task__row">${badge(t.quadrant)}</div>
  <h3 class="move__title">${esc(t.title)}</h3>
  <p class="move__slots num">${p.from ? `<span class="move__from"><span class="sr">Semula </span>${slot(p.from)}</span>${icon('chevron_right', 'icon--xs')}` : '<span class="move__from" style="text-decoration:none">Belum dijadwalkan</span>' + icon('chevron_right', 'icon--xs')}<span class="move__to" data-to-text>${slot(p.to)}</span></p>
  <p class="move__why">${esc(p.why)}.</p>
  <button class="btn btn--ghost btn--sm" type="button" data-swap aria-describedby="us-h">${icon('edit_calendar', 'icon--sm')}Ganti slot</button>
</article>`; }).join('')}
</div></section>
<section class="section" aria-labelledby="rk-h" style="padding-bottom:24px"><div class="section__head"><h2 id="rk-h">Masih kurang waktu</h2><span class="meta num">1 tugas</span></div>
<div class="move q1">
  <div class="task__row">${badge('Q1')}</div>
  <h3 class="move__title">${esc(lap.title)}</h3>
  ${slack(A_after, lap.R, { key: false })}
  <p class="move__why">Rapat memakan waktu sebelum deadline ${E.deadlineText(lap, NOW)}. Pilih yang ingin ikut diterapkan:</p>
  <div class="chips" data-fix>
    <button type="button" class="chip" aria-pressed="false" data-v="malam">Tambah blok 20.00–22.00</button>
    <button type="button" class="chip" aria-pressed="false" data-v="estimasi">Turunkan estimasi ke 4 jam</button>
    <button type="button" class="chip" aria-pressed="false" data-v="perpanjang">Catat: minta perpanjangan</button>
  </div>
  <p class="move__why" aria-live="polite" data-fix-text>Belum ada yang dipilih.</p>
</div></section>
</main></div>
<div class="dock dock--actions-only"><div class="dock__actions"><a class="btn btn--secondary" href="s04-hari-ini.html">Batal</a><a class="btn btn--primary grow" href="s11c-jadwal-diterapkan.html" data-apply>${icon('check')}Terapkan</a></div></div>` });

// ---------- S11c Kalender setelah diterapkan ----------
page({ file: 's11c-jadwal-diterapkan.html', title: 'Jadwal baru diterapkan', desc: 'Kalender setelah jadwal ulang diterapkan, dengan Urungkan selama 10 detik.', dock: 65,
  body: `<div class="app" data-screen="s11c">${brandRow(syncStatus())}
<header class="head"><h1>Kalender</h1><p class="head__sub">${E.dayLong(NOW)} · jadwal baru diterapkan ${E.clock(NOW)}</p></header>
<main class="section" style="padding-top:16px">${V.week('Sen')}
<div class="notice" style="margin:16px 0 0">${icon('info')}<span data-moved-out>Belajar UAS Statistika dipindah ke besok 10.00–11.00.</span></div>
<div style="margin-top:16px">${calLegend(true)}</div>${dayView({ plan: true, sudden: true })}<div style="height:24px" aria-hidden="true"></div></main></div>
<div class="dock">${nav('Kalender')}</div>
<div class="snack" role="status" aria-live="polite" data-autostart><p data-snack-text>Jadwal baru diterapkan. Pengingat diatur ulang.</p><a class="btn btn--ghost btn--sm" href="s04-hari-ini.html?msg=undo">Urungkan</a><span class="snack__timer" data-timer></span></div>` });

// ---------- S08a Alarm Q1 ----------
const altSlots = [['10:00', '12:00'], ['16:00', '18:00'], ['20:00', '22:00']];
page({ file: 's08a-alarm-q1.html', title: 'Pengingat kritis', desc: 'Alarm layar penuh untuk tugas Kerjakan Sekarang.', bodyClass: 'alarm', theme: '#121416',
  body: `<main class="alarm__screen" data-screen="s08a" aria-labelledby="al-h">
  <div class="alarm__top"><span class="brand">${MARK()}Priora</span><span class="num">${E.clock(NOW)}</span></div>
  <p class="alarm__tag">${icon('bolt')}Pengingat kritis · Kerjakan Sekarang</p>
  <div class="alarm__spacer"></div>
  <p class="alarm__due">Deadline ${E.deadlineText(lap, NOW)}</p>
  <h1 id="al-h">${esc(lap.title)}</h1>
  <p class="alarm__fig"><span class="fig">${E.dur(lap.T)}</span> lagi</p>
  ${slack(lap.A, lap.R)}
  <p class="alarm__ask">Estimasi 6 jam. Mulai sekarang?</p>
  <div class="alarm__spacer"></div>
  <div class="alarm__actions">
    <a class="btn btn--light" href="s04-hari-ini.html?msg=started">${icon('play_arrow')}Mulai</a>
    <a class="btn btn--outline" href="s04-hari-ini.html?msg=done">Selesai</a>
    <button class="btn btn--outline" type="button" data-open="tunda">${icon('snooze')}Tunda</button>
    <button class="btn btn--outline" type="button" data-open="ulang">Jadwal ulang</button>
  </div>
  <p class="alarm__note">Nada Kritis · getar 3× panjang · berbunyi walau HP senyap. Pengingat ke-1; diulang 10.10 bila belum direspons.</p>
</main>
<div class="scrim" data-close hidden></div>
<section class="sheet" id="tunda" role="dialog" aria-modal="true" aria-labelledby="tu-h" hidden>
  <div class="sheet__grip" aria-hidden="true"></div>
  <div class="sheet__head"><h2 id="tu-h">Tunda berapa lama?</h2><button class="icon-btn" type="button" data-close aria-label="Tutup">${icon('close')}</button></div>
  <div class="sheet__body"><div class="stack">${[15, 30, 60].map(m => `<a class="btn btn--secondary btn--block" href="s04-hari-ini.html?msg=snooze${m}">${m} menit · berbunyi lagi ${E.clock(new Date(NOW.getTime() + m * 60000))}</a>`).join('')}</div>
  <p class="field__hint">Kalau sudah ditunda 3 kali, Priora akan menawarkan atur ulang jadwal.</p></div>
</section>
<section class="sheet" id="ulang" role="dialog" aria-modal="true" aria-labelledby="ul-h" hidden>
  <div class="sheet__grip" aria-hidden="true"></div>
  <div class="sheet__head"><h2 id="ul-h">Pindahkan ke slot kosong</h2><button class="icon-btn" type="button" data-close aria-label="Tutup">${icon('close')}</button></div>
  <div class="sheet__body"><p class="field__hint">Slot 2 jam yang masih kosong hari ini, sebelum deadline ${E.deadlineText(lap, NOW)}.</p><div class="stack">${altSlots.map(([s, e]) => `<a class="btn btn--secondary btn--block num" href="s04-hari-ini.html?msg=resched">Hari ini ${E.hm(s)}–${E.hm(e)}</a>`).join('')}</div></div>
</section>` });

// ---------- S08d Notifikasi per tier (layar kunci) ----------
const notifs = [
  { t: lap, when: 'sekarang', body: `${E.dur(lap.T)} lagi · estimasi 6 jam. Mulai sekarang?`, acts: [['Mulai', 'started'], ['Selesai', 'done'], ['Tunda', 'snooze15'], ['Jadwal ulang', 'resched']], href: 's08a-alarm-q1.html' },
  { t: byId.berkas, when: '09.10', body: `Deadline hari ini 15.40 · cukup 1 jam.`, acts: [['Selesai', 'done'], ['Tunda', 'snooze30']], href: detailHref(byId.berkas) },
  { t: byId.uas, when: '07.00', body: `Blok belajar hari ini 15.00–16.00. Deadline ${E.deadlineText(byId.uas, NOW)}.`, acts: [['Mulai', 'started'], ['Tunda', 'snooze60']], href: detailHref(byId.uas) },
];
page({ file: 's08d-notifikasi.html', title: 'Notifikasi per tier', desc: 'Notifikasi Priora di layar kunci, dibedakan per tier.', bodyClass: 'lock', theme: '#dfe3e8',
  body: `<main class="lock__screen" data-screen="s08d" aria-labelledby="lk-h">
  <div class="lock__top"><span>${icon('lock', 'icon--xs')}</span><span>${E.dayLong(NOW)}</span></div>
  <h1 id="lk-h" class="sr">Notifikasi Priora di layar kunci</h1><p class="lock__clock num" aria-label="Pukul ${E.clock(NOW)}">${E.clock(NOW)}</p>
  <div class="lock__list">
  ${notifs.map(n => `<article class="notif ${n.t.quadrant.toLowerCase()}" aria-label="${esc(srLabel(n.t))}">
    <div class="notif__head">${MARK()}<span>Priora</span><span class="qb ${n.t.quadrant.toLowerCase()}">${icon(n.t.q.icon)}${n.t.q.label}</span><span class="notif__when num">${n.when}</span></div>
    <h2 class="notif__title"><a href="${n.href}">${esc(n.t.title)}</a></h2>
    <p class="notif__body">${n.body}</p>
    <div class="notif__acts">${n.acts.map(([l, m]) => `<a href="s04-hari-ini.html?msg=${m}">${l}</a>`).join('')}</div>
  </article>`).join('')}
  <article class="notif q4" aria-label="Ringkasan pagi, prioritas ringan">
    <div class="notif__head">${MARK()}<span>Priora</span><span class="qb q4">${icon('eco')}Ringkasan pagi</span><span class="notif__when num">06.00</span></div>
    <h2 class="notif__title"><a href="s04-hari-ini.html">4 tugas aktif, 1 terlewat</a></h2>
    <p class="notif__body">Bisa ditunda: Rapikan catatan kuliah (deadline ${E.deadlineText(byId.catatan, NOW)}). Tugas Bisa Ditunda tidak berbunyi; cukup masuk ringkasan ini.</p>
  </article>
  </div>
</main>` });

// ---------- S14 Profil ----------
page({ file: 's14-profil.html', title: 'Profil', desc: 'Profil, pengaturan pengingat, dan data akun.', dock: 65,
  body: `<div class="app" data-screen="s14">${brandRow(syncStatus())}
<header class="head"><h1>Profil</h1></header>
<main>
<section class="section" aria-label="Akun" style="padding-top:16px"><div class="panel"><div class="ident"><span class="avatar" aria-hidden="true">DA</span><div class="list__text"><b>${esc(D.user.name)}</b><span>${esc(D.user.email)}</span></div></div></div></section>
<section class="section" aria-labelledby="pg-h"><div class="section__head"><h2 id="pg-h">Pengingat</h2></div><div class="list">
  <div class="list__row">${icon('volume_up')}<div class="list__text"><b>Nada & getar</b><span>Bawaan per tier: Kritis, Penting, Ringan, tanpa suara</span></div></div>
  <div class="list__row">${icon('bedtime')}<div class="list__text"><b>Waktu istirahat</b><span class="num">${D.settings.quietHours.map(q => `${q.name} ${E.hm(q.start)}–${E.hm(q.end)}`).join(' · ')}</span></div></div>
  <div class="list__row">${icon('mail')}<div class="list__text"><b id="fs-l">Email fail-safe</b><span id="fs-d">Email bila pengingat merah tidak direspons 15 menit; maks. 5 per hari</span></div><button class="switch" type="button" role="switch" aria-checked="${D.settings.failsafeEmail}" aria-labelledby="fs-l" aria-describedby="fs-d" data-switch></button></div>
</div></section>
<section class="section" aria-labelledby="wk-h"><div class="section__head"><h2 id="wk-h">Waktu</h2></div><div class="list">
  <div class="list__row">${icon('schedule')}<div class="list__text"><b>Jam aktif</b><span>Pengingat hanya dijadwalkan di rentang ini</span></div><span class="list__val num">${E.hm(D.settings.activeStart)}–${E.hm(D.settings.activeEnd)}</span></div>
  <div class="list__row">${icon('school')}<div class="list__text"><b>Jam produktif per hari</b><span>Dipakai menghitung waktu yang benar-benar tersedia</span></div><span class="list__val num">${D.settings.productiveHours} jam</span></div>
</div></section>
<section class="section" aria-labelledby="dt-h" style="padding-bottom:24px"><div class="section__head"><h2 id="dt-h">Akun & data</h2></div><div class="list">
  <div class="list__row">${icon('download')}<div class="list__text"><b>Ekspor data</b><span>Unduh semua tugas dan pengaturan (JSON)</span></div><button class="btn btn--secondary btn--sm" type="button" data-export>Unduh</button></div>
  <div class="list__row">${icon('logout')}<div class="list__text"><b>Keluar</b><span>Data yang belum tersinkron tetap di HP ini</span></div><button class="btn btn--secondary btn--sm" type="button" data-dlg="dlg-out">Keluar</button></div>
  <div class="list__row">${icon('delete')}<div class="list__text"><b>Hapus akun & semua data</b><span>Permanen, sesuai UU PDP</span></div><button class="btn btn--danger btn--sm" type="button" data-dlg="dlg-del">Hapus</button></div>
</div></section>
</main></div>
<div class="dock">${nav('Profil')}</div>
<dialog class="dlg" id="dlg-out" aria-labelledby="dlg-out-h"><h2 id="dlg-out-h">Keluar dari Priora?</h2><p>Tugas yang belum tersinkron tetap tersimpan di HP ini dan terkirim saat kamu masuk lagi.</p><form method="dialog" class="dlg__actions"><button class="btn btn--ghost" value="cancel">Batal</button><a class="btn btn--primary" href="../index.html">Keluar</a></form></dialog>
<dialog class="dlg" id="dlg-del" aria-labelledby="dlg-del-h"><h2 id="dlg-del-h">Hapus akun ${esc(D.user.email)}?</h2><p>${TASKS.length} tugas, jadwal, dan pengaturanmu akan dihapus permanen. Ketik HAPUS untuk melanjutkan.</p>
<div class="field" style="margin-top:16px"><label for="del-confirm">Ketik HAPUS</label><input class="input" id="del-confirm" autocomplete="off"></div>
<form method="dialog" class="dlg__actions"><button class="btn btn--ghost" value="cancel">Batal</button><button class="btn btn--primary" value="ok" data-del-ok disabled>Hapus akun</button></form>
<p data-del-note hidden style="margin-top:12px">Ini prototipe: tidak ada data yang dihapus.</p></dialog>
<div class="snack" role="status" aria-live="polite" hidden><p data-snack-text></p></div>` });

console.log('OK', readdirSync(join(ROOT, 'screens')).length, 'layar');

// ---------- index.html: galeri presentasi ----------
const FLOWS = [
  ['Inti: Hari Ini & tugas', 'J2 · FR-03, 04, 06, 07, 08, 14', [
    ['s04-hari-ini.html', 'S04', 'Hari Ini', 'Hari ini saya harus mengerjakan apa dulu, dan cukupkah waktunya?', [['?state=kosong', 'kosong'], ['?state=memuat', 'memuat'], ['?state=offline', 'offline'], ['?state=error', 'gagal sinkron']]],
    ['s05a-quick-add.html?nofocus=1', 'S05a', 'Quick Add', 'Seberapa genting tugas baru ini? Prioritas muncul selagi mengetik.'],
    ['s06-detail.html?id=laporan', 'S06', 'Detail + "Mengapa?"', 'Kenapa tugas ini Kerjakan Sekarang? Ubah progres untuk melihat prioritas dihitung ulang.'],
    ['s07-daftar-tugas.html', 'S07', 'Daftar tugas', 'Apa saja tugasku, dan mana yang genting?']]],
  ['Pengingat kritis', 'J3, J5 · FR-09 s.d. FR-13', [
    ['s08d-notifikasi.html', 'S08d', 'Notifikasi per tier', 'Mana yang genting di antara notifikasi? Ikon, label, dan tepi membedakan tier.'],
    ['s08a-alarm-q1.html', 'S08a', 'Alarm Q1 layar penuh', 'Apa yang kulakukan dengan pengingat ini sekarang? Mulai, Selesai, Tunda, atau Jadwal ulang.']]],
  ['Kejadian mendadak & jadwal ulang', 'J4 · FR-20, 21, 22', [
    ['s10-kalender.html', 'S10', 'Kalender hari', 'Kapan waktu kosongku hari ini?'],
    ['s11a-kejadian-mendadak.html?nofocus=1', 'S11a', 'Kejadian mendadak', 'Apa yang bertabrakan? Dampak dihitung langsung saat jam diubah.'],
    ['s11b-pratinjau-jadwal-ulang.html', 'S11b', 'Pratinjau jadwal ulang', 'Bagaimana jadwalku setelah ditata ulang, dan apa yang masih berisiko?'],
    ['s11c-jadwal-diterapkan.html', 'S11c', 'Setelah Terapkan', 'Jadwal baru sudah benar? Urungkan tersedia 10 detik.']]],
  ['Profil', 'FR-17, 18, 27', [
    ['s14-profil.html', 'S14', 'Profil & data', 'Pengaturan apa yang aktif? Ekspor data berfungsi.']]],
];
writeFileSync(join(ROOT, 'index.html'), `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Priora · Prototipe hi-fi</title>
<meta name="description" content="Galeri layar hi-fi Priora gelombang 1 untuk presentasi.">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/components.css">
<style>
  body { background: var(--ground); }
  .gal { max-width: 1240px; margin: 0 auto; padding: 32px var(--m) 64px; }
  .gal__head { display: grid; gap: 8px; max-width: 760px; }
  .gal__head h1 { font-size: var(--fs-title); font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .gal__head h1 svg { width: 24px; height: 24px; }
  .gal__head p { color: var(--muted); }
  .flow { margin-top: 48px; }
  .flow__head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .flow__head h2 { font-size: var(--fs-card); font-weight: 600; }
  .flow__head span { color: var(--muted); font-size: var(--fs-meta); }
  .frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(390px, 1fr)); gap: 32px 24px; }
  .frame { display: grid; gap: 12px; align-content: start; justify-items: center; }
  .frame iframe { width: 390px; height: 844px; border: 1px solid var(--border); border-radius: 24px; background: var(--surface); }
  .frame__cap { width: 390px; display: grid; gap: 4px; }
  .frame__cap b { font-size: var(--fs-body); }
  .frame__cap p { font-size: var(--fs-meta); color: var(--muted); }
  .frame__links { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: var(--fs-meta); }
  .frame__links a { font-weight: 600; min-height: 32px; display: inline-flex; align-items: center; }
  @media (max-width: 430px) { .frame iframe, .frame__cap { width: 100%; } .frames { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="gal">
  <header class="gal__head">
    <h1>${MARK().replace('class="brand__mark"', '')}Priora · prototipe hi-fi</h1>
    <p>Gelombang 1: ${FLOWS.reduce((n, f) => n + f[2].length, 0)} layar dari lo-fi dan SDD v1.0, mode terang, gaya pastel, lebar dasar 390 px. Jam prototipe dibekukan Senin 19 Okt 2026, 09.40. Semua isi adalah data contoh.</p>
  </header>
  ${FLOWS.map(([name, refs, items]) => `<section class="flow" aria-labelledby="f-${items[0][1]}"><div class="flow__head"><h2 id="f-${items[0][1]}">${name}</h2><span>${refs}</span></div><div class="frames">
    ${items.map(([href, code, nm, q, states]) => `<figure class="frame" style="margin:0"><iframe src="screens/${href}" title="${code} ${nm}" loading="lazy"></iframe><figcaption class="frame__cap"><b>${code} · ${nm}</b><p>${q}</p><span class="frame__links"><a href="screens/${href.replace(/\?.*/, '')}">Buka layar penuh</a>${(states || []).map(([s, l]) => `<a href="screens/${href}${s}">State: ${l}</a>`).join('')}</span></figcaption></figure>`).join('')}
  </div></section>`).join('')}
</div>
</body>
</html>
`);
console.log('index.html OK');
