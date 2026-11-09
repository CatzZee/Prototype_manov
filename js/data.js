/* Priora — data contoh prototipe (satu sumber untuk semua layar).
   Semua nilai turunan (sisa waktu, skor, kuadran, slack) dihitung oleh engine.js dari data ini.
   Jam prototipe dibekukan pada Senin, 19 Oktober 2026 pukul 09.40 agar setiap layar konsisten.
   SEMUA ISI DI SINI ADALAH CONTOH — ganti dengan data nyata sebelum uji pengguna. */
(function (root) {
  var data = {
    seedVersion: 1,
    now: '2026-10-19T09:40',
    user: { name: 'Dimas Arya', email: 'dimas.arya@student.um.ac.id' },
    settings: {
      productiveHours: 6,           // H, jam produktif per hari (SDD 3.3.1, default)
      activeStart: '07:00', activeEnd: '22:00',
      quietHours: [{ name: 'Tidur', start: '22:00', end: '06:00', days: 'Setiap hari', on: true },
                   { name: 'Istirahat siang', start: '12:00', end: '13:00', days: 'Sen–Jum', on: true }],
      failsafeEmail: true,
      lastSync: '09.38'
    },
    // Bobot kategori W (SDD 3.3.1) dan estimasi default per kategori [ASUMSI tim]
    categories: {
      'Ujian':              { w: 1.0, est: 8 },
      'Tugas Besar/Proyek': { w: 0.9, est: 6 },
      'Tugas Mingguan':     { w: 0.6, est: 2 },
      'Organisasi':         { w: 0.5, est: 1 },
      'Pribadi':            { w: 0.4, est: 1 }
    },
    courses: {
      'Praktikum Basis Data': { tone: 'a' },
      'Statistika':           { tone: 'b' },
      'Pemrograman Web':      { tone: 'c' },
      'Kepanitiaan BEM':      { tone: 'd' },
      'Pribadi':              { tone: 'e' }
    },
    tasks: [
      { id: 'laporan', title: 'Laporan Praktikum Basis Data', course: 'Praktikum Basis Data', category: 'Tugas Besar/Proyek',
        deadline: '2026-10-20T06:00', est: 6, progress: 0, importance: 4, status: 'todo' },
      { id: 'uas', title: 'Belajar UAS Statistika', course: 'Statistika', category: 'Ujian',
        deadline: '2026-10-29T09:40', est: 12, progress: 25, importance: 5, status: 'todo' },
      { id: 'berkas', title: 'Kirim berkas panitia', course: 'Kepanitiaan BEM', category: 'Organisasi',
        deadline: '2026-10-19T15:40', est: 1, progress: 0, importance: 2, status: 'todo' },
      { id: 'catatan', title: 'Rapikan catatan kuliah', course: 'Pribadi', category: 'Pribadi',
        deadline: '2026-10-24T09:40', est: 2, progress: 0, importance: 2, status: 'todo' },
      { id: 'kuis', title: 'Kuis Online Pemrograman Web', course: 'Pemrograman Web', category: 'Tugas Mingguan',
        deadline: '2026-10-18T21:00', est: 1, progress: 0, importance: 3, status: 'todo' }
    ],
    // Perlakuan notifikasi per tier (SDD 3.3.2): sinyal, pengulangan, cadangan
    tiers: {
      Q1: ['Nada Kritis · getar 3× panjang · tetap berbunyi walau HP senyap', 'Diulang tiap 30 menit sampai kamu merespons; 15 menit pada 3 jam terakhir', 'Email cadangan bila 15 menit tidak ada respons (maks. 5 per hari)'],
      Q2: ['Nada Penting · getar 2× sedang · notifikasi heads-up', 'Diulang tiap 3 jam di jam aktif (07.00–22.00)', 'Masuk ringkasan email harian, bila diaktifkan'],
      Q3: ['Nada Ringan · getar 1× singkat', 'Diingatkan 2× per hari', 'Tanpa email'],
      Q4: ['Tanpa suara · tampil di badge dan ringkasan harian', 'Sekali sehari dalam ringkasan pagi', 'Tanpa email'],
      OD: ['Nada Kritis dengan pembuka berbeda · tetap berbunyi walau HP senyap', 'Diulang tiap 60 menit, maks. 6× per hari', 'Email cadangan bila tidak ada respons']
    },
    // Jadwal hari ini (Senin): kegiatan rutin + blok kerja tugas
    events: [
      { id: 'kuliah-stat', kind: 'rutin', title: 'Kuliah Statistika', where: 'R. 3.2', start: '07:00', end: '09:30' },
      { id: 'rapat-org', kind: 'rutin', title: 'Rapat organisasi', where: 'Sekretariat BEM', start: '19:00', end: '20:00' }
    ],
    blocks: [
      { task: 'laporan', start: '13:00', end: '15:00' },
      { task: 'uas', start: '15:00', end: '16:00' }
    ],
    // Skenario J4: kejadian mendadak & usulan Reschedule Planner (rule-based, SDD 3.3.5)
    sudden: { title: 'Rapat BEM', start: '13:00', end: '16:00' },
    plan: [
      { task: 'berkas',  from: null,            to: { day: 'Hari ini', start: '10:00', end: '11:00' },
        alt: [{ day: 'Hari ini', start: '11:00', end: '12:00' }],
        why: 'Selesai sebelum deadline 15.40, yang kini jatuh di tengah rapat' },
      { task: 'laporan', from: { day: 'Hari ini', start: '13:00', end: '15:00' }, to: { day: 'Hari ini', start: '16:00', end: '18:00' },
        alt: [{ day: 'Hari ini', start: '20:00', end: '22:00' }],
        why: 'Slot kosong terdekat setelah rapat' },
      { task: 'uas',     from: { day: 'Hari ini', start: '15:00', end: '16:00' }, to: { day: 'Besok', start: '10:00', end: '11:00' },
        alt: [{ day: 'Hari ini', start: '20:00', end: '21:00' }],
        why: 'Deadline masih 10 hari; hari ini diberikan ke tugas yang lebih genting' }
    ]
  };
  root.PrioraData = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
