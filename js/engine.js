
/* Priora — Priority Engine (SDD 3.3.1) dan format angka/waktu.
   Fungsi murni: masukan yang sama selalu memberi keluaran yang sama. */
var WU = 0.55, WI = 0.45;
var QUAD = {
  Q1: { label: 'Kerjakan Sekarang', icon: 'bolt',           sr: 'Prioritas kritis, merah' },
  Q2: { label: 'Jadwalkan',         icon: 'calendar_month', sr: 'Prioritas penting, kuning' },
  Q3: { label: 'Selesaikan Cepat',  icon: 'fast_forward',   sr: 'Prioritas cepat, biru' },
  Q4: { label: 'Bisa Ditunda',      icon: 'eco',            sr: 'Prioritas ringan, hijau' }
};
var DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
var DAYS_LONG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
var MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function parse(s) { var p = s.split(/[-T:]/).map(Number); return new Date(p[0], p[1] - 1, p[2], p[3] || 0, p[4] || 0); }
function hoursBetween(a, b) { return (b - a) / 3600000; }

function score(input) {
  var T = input.T, H = input.H, E = input.E, p = input.p, I = input.I, W = input.W;
  var A = T * (H / 24);
  var R = Math.max(E * (1 - p), 0.25);
  var S = A / R;
  var U = (T <= 0 || S <= 1) ? 1 : 1 / S;
  if (T > 336) U = Math.min(U, 0.2);
  var Imp = 0.6 * (I - 1) / 4 + 0.4 * W;
  var sc = 100 * (WU * U + WI * Imp);
  var q = U >= 0.5 ? (Imp >= 0.5 ? 'Q1' : 'Q3') : (Imp >= 0.5 ? 'Q2' : 'Q4');
  return { A: A, R: R, S: S, U: U, Imp: Imp, score: Math.round(sc * 100) / 100, quadrant: q };
}

function enrich(data) {
  var now = parse(data.now), H = data.settings.productiveHours;
  return data.tasks.map(function (t) {
    var T = hoursBetween(now, parse(t.deadline));
    var W = data.categories[t.category].w;
    var r = score({ T: T, H: H, E: t.est, p: t.progress / 100, I: t.importance, W: W });
    var o = Object.assign({}, t, r, { T: T, W: W });
    o.overdue = T <= 0 && t.status !== 'done';
    if (t.override) o.quadrant = t.override;
    o.q = QUAD[o.quadrant];
    return o;
  });
}

function dur(h) {
  var m = Math.round(Math.abs(h) * 60);
  if (m >= 48 * 60) return Math.round(m / 1440) + ' hari';
  var hh = Math.floor(m / 60), mm = m % 60;
  if (hh === 0) return mm + ' m';
  return mm === 0 ? hh + ' j' : hh + ' j ' + pad(mm) + ' m';
}
function durWords(h) {
  var m = Math.round(Math.abs(h) * 60);
  if (m >= 48 * 60) return Math.round(m / 1440) + ' hari';
  var hh = Math.floor(m / 60), mm = m % 60;
  return (hh ? hh + ' jam' : '') + (hh && mm ? ' ' : '') + (mm ? mm + ' menit' : '');
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function clock(d) { return pad(d.getHours()) + '.' + pad(d.getMinutes()); }
function hm(s) { return s.replace(':', '.'); }
function dayShort(d) { return DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()]; }
function dayLong(d) { return DAYS_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS_LONG[d.getMonth()]; }
function deadlineText(t, now) {
  var d = parse(t.deadline);
  var same = d.toDateString() === now.toDateString();
  var tmr = new Date(now); tmr.setDate(now.getDate() + 1);
  var prefix = same ? 'Hari ini' : (d.toDateString() === tmr.toDateString() ? 'Besok' : dayShort(d));
  return prefix + ' · ' + clock(d);
}
function toH(s) { var p = s.split(':').map(Number); return p[0] + p[1] / 60; }

var api = { score: score, enrich: enrich, dur: dur, durWords: durWords, parse: parse, clock: clock, hm: hm,
            dayShort: dayShort, dayLong: dayLong, deadlineText: deadlineText, toH: toH, QUAD: QUAD, hoursBetween: hoursBetween };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
if (typeof window !== 'undefined') window.PrioraEngine = api;




