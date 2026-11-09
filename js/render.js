/* Priora — pembangun potongan HTML bersama (dipakai build dan browser). */
(function (root) {
  var E = root.PrioraEngine || (typeof require !== 'undefined' ? require('./engine.js') : null);
  var I = root.PrioraIcons || (typeof require !== 'undefined' ? require('./icons.js') : {});

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(name, cls) {
    return '<svg class="icon' + (cls ? ' ' + cls : '') + '" viewBox="0 -960 960 960" aria-hidden="true" focusable="false">' + (I[name] || '') + '</svg>';
  }
  function badge(qk) {
    var q = E.QUAD[qk];
    return '<span class="qb ' + qk.toLowerCase() + '">' + icon(q.icon) + q.label + '</span>';
  }
  function overdueBadge() { return '<span class="qb od">' + icon('warning') + 'Terlewat</span>'; }
  // Jam tanpa diubah ke hari: "60 j", "5 j 05 m", "45 m"
  function durH(h) {
    var m = Math.round(Math.abs(h) * 60), hh = Math.floor(m / 60), mm = m % 60;
    if (hh === 0) return mm + ' m';
    return mm === 0 ? hh + ' j' : hh + ' j ' + (mm < 10 ? '0' : '') + mm + ' m';
  }
  // Elemen khas: bilah "cukup waktu?" — trek = waktu produktif tersedia (A), isi = usaha tersisa (R)
  function slack(A, R, o) {
    o = o || {};
    var scale = Math.max(A, R, 0.25), over = R > A;
    var availPct = Math.max(A, 0) / scale * 100, needPct = Math.min(R, Math.max(A, 0)) / scale * 100;
    var overPct = over ? (R - Math.max(A, 0)) / scale * 100 : 0;
    var qk = (o.quadrant || 'q1').toLowerCase();
    var label = 'Butuh ' + durH(R) + ', tersedia sekitar ' + durH(Math.max(A, 0)) + ' waktu produktif' + (over ? ', kurang ' + durH(R - A) : '');
    var h = '<div class="slack' + (o.thin ? ' slack--thin' : '') + (o.dark ? ' slack--dark' : '') + ' ' + qk + '" data-slack>';
    h += '<div class="slack__track" role="img" aria-label="' + esc(label) + '" style="width:100%">';
    h += '<div class="slack__need" style="width:' + needPct.toFixed(1) + '%"></div>';
    if (over) h += '<div class="slack__over" style="left:' + availPct.toFixed(1) + '%;width:' + overPct.toFixed(1) + '%"></div>';
    if (over) h += '<div class="slack__cap" style="left:calc(' + availPct.toFixed(1) + '% - 1px)"></div>';
    h += '</div>';
    if (o.thin) {
      h += '<p class="slack__text">Butuh ' + durH(R) + ' dari ±' + durH(Math.max(A, 0)) + ' waktu produktif</p>';
    } else {
      h += '<p class="slack__text">Butuh <b class="fig">' + durH(R) + '</b> · tersedia <b class="fig">±' + durH(Math.max(A, 0)) + '</b> sebelum deadline' +
        (over ? ' · <span class="neg fig">kurang ±' + durH(R - A) + '</span>' : '') + (o.tail || '') + '</p>';
    }
    if (o.key) h += '<p class="slack__key"><span><i class="k-avail"></i>Waktu produktif tersedia</span><span><i class="k-need"></i>Usaha tersisa</span>' + (over ? '<span><i class="k-over"></i>Kekurangan</span>' : '') + '</p>';
    return h + '</div>';
  }

  function quadWhy(qk) {
    return { Q1: 'mendesak dan penting', Q2: 'penting, tetapi belum mendesak', Q3: 'mendesak, tetapi kurang penting', Q4: 'belum mendesak dan kurang penting' }[qk];
  }
  function srLabel(t) { return t.q.sr + '. ' + t.title + ', ' + (t.overdue ? 'lewat ' + E.durWords(t.T) : E.durWords(t.T) + ' lagi') + '.'; }

  // Kalender satu hari. items: {kind:'rutin'|'blk'|'mendadak', title, sub, s, e, q, task, isNew}
  function hhmm(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh++; mm = 0; } return (hh < 10 ? '0' : '') + hh + '.' + (mm < 10 ? '0' : '') + mm; }
  function dayView(items, o) {
    var D0 = o.day0 || 7, D1 = o.day1 || 22, PX = o.pxh || 52, nowH = o.nowH;
    items = items.slice().sort(function (a, b) { return a.s - b.s; });
    var h = '<div class="day" style="height:' + ((D1 - D0) * PX + 12) + 'px" data-day>';
    for (var x = D0; x <= D1; x++) h += '<div class="day__hour" style="top:' + (x - D0) * PX + 'px"><span class="num">' + (x < 10 ? '0' : '') + x + '.00</span></div>';
    var cur = Math.ceil(nowH * 4) / 4, free = [];
    items.forEach(function (i) { if (i.e <= cur) return; if (i.s - cur >= 1) free.push([cur, i.s]); cur = Math.max(cur, i.e); });
    if (D1 - cur >= 1) free.push([cur, D1]);
    free.forEach(function (f) {
      h += '<a class="ev free" style="top:' + ((f[0] - D0) * PX + 2) + 'px;height:' + ((f[1] - f[0]) * PX - 4) + 'px" href="s05a-quick-add.html">' + icon('add', 'icon--xs') + 'Kosong ' + hhmm(f[0]) + '–' + hhmm(f[1]) + '</a>';
    });
    items.forEach(function (it) {
      var top = (it.s - D0) * PX + 2, ht = (it.e - it.s) * PX - 4;
      var cls = it.kind === 'blk' ? 'blk ' + it.q.toLowerCase() + (it.isNew ? ' new' : '') + (ht >= 90 ? ' tall' : '') : it.kind + (ht >= 90 ? ' tall' : '') + (it.e <= nowH ? ' past' : '');
      var tag = it.kind === 'blk' ? 'a' : 'div';
      var href = it.kind === 'blk' ? ' href="s06-detail.html?id=' + it.task + '"' : '';
      h += '<' + tag + ' class="ev ' + cls + '"' + href + ' data-task="' + (it.task || '') + '" style="top:' + top + 'px;height:' + ht + 'px"><b>' + esc(it.title) + '</b>' +
        (ht > 34 ? '<span class="num">' + (it.isNew ? '<strong class="ev__new">Baru</strong> · ' : '') + hhmm(it.s) + '–' + hhmm(it.e) + ' · ' + esc(it.sub) + '</span>' : '') + '</' + tag + '>';
    });
    h += '<div class="day__now" style="top:' + (nowH - D0) * PX + 'px" role="img" aria-label="Sekarang ' + o.nowText + '"></div></div>';
    return h;
  }

  var api = { dayView: dayView, hhmm: hhmm, esc: esc, icon: icon, badge: badge, overdueBadge: overdueBadge, durH: durH, slack: slack, quadWhy: quadWhy, srLabel: srLabel };
  root.PrioraRender = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
