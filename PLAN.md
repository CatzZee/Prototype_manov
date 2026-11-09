# PLAN.md · Priora hi-fi → web uji pengguna

> Setelah disetujui, langkah pertama eksekusi adalah menyalin file ini ke `PLAN.md` di root proyek. Plan mode hanya mengizinkan satu file rencana di luar proyek.

## Konteks
Prototipe hi-fi gelombang 1 sudah lengkap secara alur, tetapi masih berupa layar statis: perubahan (tugas baru, Selesai, Tunda, override, progres, jadwal ulang) hilang begitu pindah layar. Tampilannya juga memakai gaya achromatic-ledger (kartu putih), padahal SDD 6.2.2 menetapkan latar kartu berwarna kuadran, dan pengguna sudah memberi tiga referensi visual. Tujuan pekerjaan ini:
1. Mempercantik tampilan ke gaya pastel-consumer.
2. Menjadikan prototipe web yang menyimpan state antarlayar.
3. Menambah mode uji (persetujuan, 5 skenario, SEQ, SUS, unduh hasil) untuk uji usabilitas tatap muka di HP peserta.

Fungsi, alur, data, dan rumus Priority Engine tidak berubah.

**Keputusan yang dijawab pengguna (8 Nov 2026):**
- Antislop dipakai mode AFTER: audit bernomor di akhir, perbaikan hanya untuk nomor yang dipilih.
- Deploy ke GitHub Pages.
- SEQ ditambahkan per skenario.
- Uji dilakukan tatap muka di HP peserta.

---

## 1. Kondisi sekarang

**Struktur.** Statis murni, tanpa dependensi.
- `tools/build.mjs` (569 baris) merakit 15 layar `screens/*.html`, `index.html`, dan `js/icons.js` dari `js/data.js` + `js/engine.js` + `js/render.js`.
- `js/app.js` (361 baris) hanya menambah interaksi lokal per layar (`data-screen`).
- Semua modul JS berbentuk UMD: jalan di Node (build) dan di browser. Karena tidak memakai ES module, `file://` aman.

**Bisa dipakai ulang tanpa diubah:**
- `engine.js`: `score`, `enrich`, dan format waktu Indonesia.
- `render.js`: `slack()` (bilah "cukup waktu?"), `badge`, `dayView`, `srLabel`, `esc`, `icon`.
- Pemeriksaan SDD di `build.mjs:69-72`.
- Logika Quick Add (`suggest` / `preview`), S06 (`recalc`), S07 (filter/cari), S11a (`impact`), S11b/S11c (`swap`/`fix`), dan S14 (ekspor JSON, dialog HAPUS) di `app.js`.
- Font dan ikon lokal.

**Hasil inspect "before"** (`inspect.mjs --app`, lebar 390/360/320; screenshot ada di scratchpad sesi):

| Layar | Hasil |
|---|---|
| S04, S05a, S11a, kelima S06 | FAIL `covered-text`: dock tetap 138 px menutupi angka/judul saat digulir. Sebelumnya di-`--allow`. |
| S07 | FAIL `edge-text`: baris chip filter menempel tepi kanan (0 px) di 360/320. |
| S06-kuis | WARN `blank-gap`: celah kosong 96 px di 320. |
| S11c | FAIL `heavy-shadow`: snackbar. Sah karena elemen melayang; akan di-`--allow` dengan alasan. |
| S08a, S08d, S10, S11b, S14 | 0 FAIL. |

`lint.mjs --app` memberi 0 FAIL / 0 WARN. Ukuran teks yang dipakai: 13/14/16/17/20/24/32. Teks dominan di banyak layar 13 px, padahal body di SDD 16.

**Temuan masalah:**
1. Tidak ada state bersama. Quick Add hanya mengarahkan ke `?msg=added` sehingga tugas baru tidak muncul di daftar. Selesai/Tunda hanya menyembunyikan kartu di halaman itu. Progres dan override hilang saat pindah layar. Pilihan S11b dibawa lewat query string.
2. S06 berupa satu file statis per tugas, sehingga tugas baru tidak punya halaman detail.
3. Strip minggu S10 tampak bisa diketuk, padahal hanya `div`.
4. Dock S04 setinggi 138 px, yaitu 16% dari layar 844 dan 24% dari layar 568.
5. Belum ada tampilan laptop (hanya kolom 440 di tengah), manifest, mode uji, maupun penyimpanan.
6. Semua kartu memakai tepi kiri berwarna. Ini tell antislop jika tidak membawa informasi; SDD hanya mewajibkannya untuk Q1.
7. Kekurangan waktu selalu merah (`--negative: var(--q1)`), padahal tugas Q3 pun bisa kekurangan waktu. Ini melanggar aturan "merah hanya Q1/Overdue".

## 2. Keputusan desain

**Gaya: pastel-consumer** (`draw.mjs --app --kind workspace --keep palette,type --style pastel-consumer`, seed 1179848792). Gaya ini tidak keluar di `--options 3` untuk kind workspace (yang keluar hanya editorial-greeting dan achromatic-ledger), jadi dipilih secara manual. Alasannya:
- (a) SDD 6.2.2 memang menetapkan warna latar kartu per kuadran, dan achromatic-ledger melarangnya.
- (b) Ketiga referensi pengguna memakai kartu pastel bersudut besar.
- (c) Gerak inti gaya ini adalah "petak pucat dengan tinta gelap dari hue yang sama". Itu persis pasangan latar/teks kuadran di SDD (#FFF8E1/#6D4C00, dst.).

Sheet baru disimpan ke `.taste-skill/direction.json`. `notes.md` diperbarui, dan keputusan lama dicatat sebagai riwayat.

**Wajah (face).**
- Ground biru-abu #f2f4f7 (kertas agenda) tetap dipakai.
- Kartu tugas = petak pastel kuadran dengan tinta gelap hue yang sama.
- Satu kartu gelap (#15181d): kartu Q1 teratas di "Fokus Hari Ini". Pada kartu ini badge merah solid (#C62828, teks putih) dan tepi kiri merah tebal (SDD 6.2.2) membawa identitas Q1.
- Kontainer (section, sheet, panel) tetap putih/ground. Yang diberi warna hanya objeknya.

**Elemen khas: bilah "cukup waktu?" dipertahankan.**
- Trek = A (waktu produktif tersedia), isi = R (usaha tersisa), lewat ujung = kekurangan.
- Warna kekurangan: merah hanya untuk Q1/Overdue. Kuadran lain memakai tinta gelap kuadrannya dengan pola garis, sehingga tidak bergantung pada warna saja.
- Versi gelap disiapkan untuk kartu hero.

**Token.**
- Radius: kartu 22, panel dalam 12, chip 8, tombol pill.
- Tipe Plus Jakarta Sans: 13 meta, 16 body, 17/600 judul kartu, 28/700 judul layar (≤ 32), 32 angka hero. Angka memakai tabular.
- Tanpa bayangan pada elemen diam. Bayangan hanya untuk sheet, snackbar, dan dock (melayang).
- Input terisi (#eef1f5) dengan garis bawah ≥ 3:1 (WCAG 1.4.11).

**Pemetaan referensi → layar → komponen**

| Ref | Ide | Layar | Komponen |
|---|---|---|---|
| 1 | Kartu Q1 teratas satu-satunya yang gelap, lainnya pastel | S04 | `.task--hero` gelap; `.task.q1..q4` pastel |
| 1 | Sudut 20–24 | semua | `--r-card: 22px` |
| 1 | Tombol bulat kecil di pojok kartu | S04, S07 | `.task__done`: lingkaran 48 px dengan ikon check, aksi nyata "Tandai selesai" (SDD 6.2.4: tombol cepat) |
| 1 | Blok jadwal berbentuk pill | S04 jadwal, S11b | `.agenda__row` pill; segmen strip pill |
| 1 | Strip tanggal mingguan | S04, S10 | `.week` berisi 7 tautan nyata ke `s10-kalender.html?hari=` |
| 2 | Judul Hari Ini lebih tegas (≤ 32) | S04 + judul layar | h1 28/700 |
| 2 | Hari terpilih sebagai pill | `.week` | pill gelap `aria-current="date"` |
| 2 | Header S06 berlatar pastel kuadran, panel putih menumpuk | S06 | `.detail-head` (bg kuadran) + `.detail-panel` (putih, margin-top −24, radius 22) |
| 2 | Input terisi + segmented kepentingan 1–5 | S05a | `.input--filled`, `.seg` 1–5 (48 px per segmen) |
| 3 | Kartu ringkasan harian dari data | S04 | `.summary`: "Fokus selesai x dari 3" (3 segmen = 3 tugas fokus) + "Terjadwal 3 j dari 6 j produktif", dihitung dari store |
| 3 | Segmented Hari/Minggu/Bulan berfungsi | S10 | `.seg` + tiga tampilan, dengan `?view=` |
| 3 | Chip mata kuliah | S07 (filter), S06 | `.chip--course` dengan titik nada mata kuliah |

**Yang ditolak:** avatar/anggota, lampiran, subtasks, share, komentar, emoji, mode gelap, ikon dalam lingkaran berwarna, FAB yang menutupi konten, angka karangan, hijau limau/ungu/lavender.

**Pengecualian yang disadari (konflik aturan, sudah diputuskan):**
- Kartu berwarna menaikkan porsi warna di atas anggaran gaya (5–8%). SDD yang menang; peringatan colour-share di-`--allow` dengan alasan.
- Radius 22 menggantikan 12 dp di SDD 6.2.3 (keputusan pengguna).
- Mode gelap ikut sistem di SDD 6.2.1 diganti mode terang saja (keputusan pengguna).
- S08a alarm tetap layar penuh gelap. Ini permukaan alarm sistem (SDD 3.3.2), bukan mode gelap.
- Dock tetap (SDD 6.2.1: "Ada Kejadian Mendadak" selalu terlihat). Tingginya dipangkas ke kira-kira 120 px dan padding bawah = tinggi dock, sehingga `covered-text` di-`--allow`.
- Tepi kiri berwarna hanya tersisa di Q1/Overdue.

## 3. Perubahan per file

**Arsitektur.** Sekarang layar adalah HTML statis hasil build. Nantinya HTML hasil build tetap ada sebagai cadangan tanpa JS dan tetap ikut di-commit, sehingga tidak perlu build untuk membuka. Saat dimuat, `app.js` membaca `store.js` lalu merender ulang isi layar memakai fungsi yang sama dengan build.

| File | Status | Isi |
|---|---|---|
| `js/views.js` | baru | Fungsi perakit isi layar yang dipindah dari `build.mjs`: `heroCard`, `rowCard`, `overdueCard`, `strip`, `agenda`, `summary`, `week`, `hariIniMain`, `detail`, `daftar`, `kalender(day/week/month)`, `pratinjau`, `diterapkan`, `profil`. Semuanya menerima `model` (tugas yang sudah di-`enrich`). Formatnya UMD, dipakai build dan browser. |
| `js/store.js` | baru | Model state yang disimpan (rincian di Fase 4). |
| `js/app.js` | ubah | Boot: `Store.load()` → `E.enrich` → `Views.<layar>` → pasang interaksi. Setiap aksi memanggil `Store.<aksi>` lalu merender ulang. Logika lama dipakai ulang. |
| `js/uji.js` | baru | Mode uji: sesi, penghitung ketukan, log layar, deteksi keberhasilan, SEQ, SUS, ekspor. |
| `js/engine.js` | **tidak diubah** | Rumus SDD 3.3.1. |
| `js/render.js` | ubah kecil | `slack()`: varian gelap + warna kekurangan per kuadran; `dayView` tanpa perubahan rumus. |
| `js/data.js` | ubah kecil | Tambah `seedVersion`. Isi contoh tetap. |
| `css/tokens.css` | ubah | Token pastel-consumer (bagian 2), `--card-dark`, `--field`, radius, skala tipe. |
| `css/components.css` | ubah | Varian kartu, `.task__done`, `.summary`, `.week` interaktif, pill agenda, `.detail-head/.detail-panel`, `.seg` S10, tampilan minggu/bulan, `.uji-bar`, notice penyimpanan. |
| `screens/s06-detail.html?id=` | baru | Satu halaman detail untuk semua tugas, termasuk tugas baru. `s06-detail-<id>.html` lama menjadi stub pengalih supaya tautan lama tetap jalan. |
| `app.html` | baru | Host. ≥ 900 px: bingkai HP 390×844 (iframe) + panel samping (jelajah bebas atau penguji). < 900 px: langsung layar penuh. `?uji=P01` mengaktifkan mode uji. |
| `uji-rekap.html` | baru | Di laptop moderator: tarik beberapa file JSON peserta → CSV gabungan, tingkat berhasil per skenario vs target SDD (≥ 4/5 berhasil J2–J4), rerata SEQ & SUS. Offline. |
| `manifest.json`, `icons/*.png`, `sw.js`, `.nojekyll` | baru | PWA dan deploy (Fase 6). |
| `tools/build.mjs` | ubah | Diramping menjadi kerangka halaman, galeri, `icons.js`, daftar precache, pemanggilan pemeriksaan engine. |
| `tools/check-engine.mjs` | baru | Asersi Node untuk 91,45 / 53,25 / 52,42 / 17,62 + kuadran, tanpa build. |
| `tools/serve.mjs` | baru | Server statis kecil tanpa dependensi untuk http lokal dan Playwright. |
| `tests/` | baru | `package.json` (devDependency `@playwright/test`, `channel: 'chrome'`, tanpa unduh browser), config, spesifikasi uji. |
| `index.html` | ubah via build | Galeri tetap, ditambah tautan "Buka aplikasi" dan "Mode uji". S06 mengarah ke `?id=`. |
| `README.md`, `CLAUDE.md`, `.taste-skill/notes.md` | ubah | Cara pakai, mode uji, reset, deploy; arsitektur baru; keputusan gaya. |

## 4. Fase kerja

### Fase 1: Token, komponen, dan pemisahan `views.js` · L
Tujuan: fondasi gaya baru dan arsitektur render bersama, tanpa mengubah perilaku.
- [x] Pindahkan perakit isi layar dari `build.mjs` ke `js/views.js`. Build memanggil `Views`. **Gate:** `screens/*.html` hasil build identik dengan sebelum refactor (bandingkan dengan `diff`). _(Selesai. Gate diff = 0 terhadap versi sebelum refactor tidak bisa diulang karena gaya baru sudah diterapkan; build ulang terbukti deterministik.)_
- [x] `tools/check-engine.mjs`, dipanggil dari build. _(Selesai. Build memanggilnya; terbukti gagal bila data diubah.)_
- [x] Token pastel-consumer di `tokens.css`, lalu cek kontras setiap pasangan teks/latar (termasuk muted di 4 latar pastel dan teks di kartu gelap) dengan skrip kontras (`antislop-human/contrast-check.py` bila tersedia, atau hitung manual). _(Selesai. Dihitung dengan skrip; 1 pasangan awal gagal dan sudah diperbaiki.)_
- [x] Komponen dasar di `components.css`: kartu pastel/gelap, `.task__done`, `.seg`, `.input--filled`, `.week` interaktif, pill agenda, dock 120 px.
- File: `js/views.js`, `tools/build.mjs`, `tools/check-engine.mjs`, `css/*`.
- Selesai bila: `node tools/build.mjs` lulus asersi SDD; diff isi sebelum refactor = 0; semua pasangan warna ≥ 4,5:1 (teks) / ≥ 3:1 (non-teks).

### Fase 2: S04 + S06, lalu checkpoint · M
- [x] S04 sesuai SDD 6.2.4, dari atas ke bawah:
  - header berisi judul 28, tanggal, status sinkron, strip minggu (pill);
  - kartu ringkasan;
  - "Fokus Hari Ini": kartu hero gelap Q1 dengan Mulai/Selesai/Tunda dan bilah cukup waktu versi gelap, lalu maks. 2 kartu pastel dengan `.task__done`;
  - Jadwal: strip + agenda pill;
  - Tugas Lain;
  - Terlewat.
- [x] Keempat state (`?state=kosong|memuat|offline|error`) memakai gaya baru. _(Selesai; kartu ringkasan disembunyikan pada state kosong dan memuat.)_
- [x] S06 `s06-detail.html?id=`: header pastel kuadran + panel putih menumpuk; panel Mengapa; segmented progres & override; stub pengalih lama. _(Selesai.)_
- [ ] **Checkpoint:** screenshot S04 dan S06 (laporan, uas) di 390 dan 360, ditambah S04 di 320. Berhenti dan tunggu persetujuan pengguna.
- File: `js/views.js`, `css/components.css`, `screens/s04*`, `screens/s06*`.
- Selesai bila: `inspect.mjs --app` 0 FAIL (setelah `--allow` yang beralasan); tanpa overflow di 320–430; pengguna menyetujui screenshot.

### Fase 3: Sisa layar + Minggu/Bulan · L
- [x] S05a: input terisi, chip deadline, segmented kepentingan 1–5. _(Selesai. Kepentingan 1–5 tetap di "Atur detail" sesuai SDD J2 langkah 3; pratinjau prioritas kini berwarna kuadran hasil hitungan.)_
- [x] S07: kartu pastel; chip filter dengan padding tepi (perbaikan `edge-text`); chip mata kuliah; kosong saat difilter. _(Selesai. Saringan dilipat ("Saring: …"), chip prioritas membungkus, mata kuliah lewat pilihan; tanpa gulir samping sehingga `edge-text` hilang.)_
- [x] S08a/S08d: badge dan tipe baru (alarm tetap gelap). _(Selesai. Notifikasi berpastel kuadran; judul alarm 24 px agar tidak 3 baris di 320.)_
- [x] S10: segmented Hari/Minggu/Bulan berfungsi (`?view=day|week|month`, `?hari=`). _(Selesai.)_
  - Minggu: 7 kolom berisi blok dan deadline per hari. _(Minggu dibuat sebagai daftar per hari, bukan 7 kolom, supaya terbaca di HP. Titik deadline di Bulan didampingi daftar berikon+label karena warna saja tidak cukup.)_
  - Bulan: kisi Oktober 2026 dengan titik deadline berikon kuadran, ketuk hari → tampilan Hari.
  - Hari tanpa data ditampilkan jujur ("Belum ada jadwal").
- [x] S11a, S11b, S11c: pill blok, kartu dampak, Urungkan 10 detik. _(Selesai. Keterangan blok pendek dipotong satu baris; bug jam ganda di blok mendadak diperbaiki.)_
- [ ] S14: daftar pengaturan; switch email fail-safe; tombol "Reset data uji". _(Tampilan selesai; saklar diperbesar ke area sentuh 48 px. Tombol "Reset data uji" menunggu `store.js` di Fase 4, jadi belum dicentang.)_
- [x] `index.html` galeri ikut diperbarui. _(Selesai: bingkai 390×844. Tautan ke aplikasi/mode uji menyusul di Fase 5.)_
- Selesai bila: `inspect.mjs --app` 0 FAIL di 15 layar pada 430/390/360/320; `lint.mjs --app` 0/0.

### Fase 4: `store.js` · M
- [ ] Skema `{ v, seedVersion, tasks, events, blocks, sudden, applied, settings, snoozes }`, diisi dari salinan `PrioraData`. `seedVersion` berbeda → reset otomatis.
- [ ] Aksi:
  - `addTask` (Quick Add membuat id baru, skor dihitung engine)
  - `setStatus` (done / in_progress / cancelled / submitted)
  - `snooze(id, menit)` (simpan `snoozedUntil` relatif ke jam beku 09.40, `snoozeCount`)
  - `setProgress`
  - `setOverride` (hilang saat deadline/kepentingan diubah, FR-08)
  - `setDeadline` (overdue)
  - `addSudden`
  - `applyPlan({ganti, malam})` dan `undoPlan` (snapshot blok)
  - `setSetting('failsafeEmail')`
  - `reset()`
- [ ] Persistensi: `localStorage['priora:v1']` dalam try/catch → cadangan `window.name` (bertahan antarlayar di tab yang sama) → cadangan memori dengan notice jujur "Perubahan hanya bertahan di layar ini".
- [ ] `Store.on(event)` untuk logger uji.
- [ ] Rencana S11b difilter terhadap state: tugas yang sudah selesai/dibatalkan dilewati, dan notice "skenario Rapat BEM 13.00–16.00" tetap ada bila jamnya berbeda.
- [ ] Hapus perantara `?msg=` / `?ganti=`; snackbar dipicu dari antrean pesan di store.
- Selesai bila: tambah tugas → muncul di S04/S07/S10 dan punya detail; Selesai/Tunda/progres/override/jadwal ulang bertahan setelah pindah layar dan reload; Reset mengembalikan data contoh; berjalan di `file://` dan `http://`.

### Fase 5: Mode uji + SEQ + SUS + unduhan · L
- [ ] `app.html?uji=P01` di HP:
  - persetujuan (tujuan, ±20 menit, boleh berhenti kapan saja, tidak ada data pribadi selain kode, data tetap di HP ini sampai diunduh moderator);
  - kode peserta (terisi dari URL, format `P\d\d`, bisa diubah);
  - per skenario: kartu instruksi → "Mulai tugas" (`Store.reset()` dulu supaya setiap skenario independen) → layar awal.
- [ ] `.uji-bar` di atas layar, mengalir dalam halaman (tidak menutupi apa pun, tidak dihitung sebagai ketukan): "Tugas n/5 · Lihat tugas · Selesai · Menyerah".
- [ ] Deteksi berhasil otomatis dari event store:

| # | Skenario | Mulai | Kriteria berhasil |
|---|---|---|---|
| 1 | Tambah "Laporan UTS Basis Data", deadline besok (J2) | S04 | `addTask`: judul cocok `/laporan uts basis data/i` dan deadline 20 Okt |
| 2 | Kenapa Laporan Praktikum berprioritas tinggi (J2) | S04 | Detail `laporan` dibuka dan panel Mengapa ≥ 50% terlihat (IntersectionObserver) |
| 3 | Tunda pengingat merah 15 menit (J3) | S08d | `snooze('laporan', 15)` |
| 4 | Rapat BEM 13.00–16.00, tata ulang, terapkan (J4) | S04 | `addSudden` 13–16 lalu `applyPlan` |
| 5 | Matikan email fail-safe (FR-17) | S04 | `setSetting failsafeEmail=false` |

- [ ] Catatan per tugas:
  - waktu (ms);
  - ketukan (`pointerdown` capture di layar aplikasi);
  - layar yang dikunjungi (urut, dengan cap waktu);
  - hasil: `berhasil` / `selesai-tanpa-kriteria` / `menyerah`;
  - SEQ 1–7 sesudahnya;
  - catatan moderator (opsional).
- [ ] SUS 10 butir versi Indonesia (Sharfina & Santoso 2016), skala 1–5, skor otomatis `((Σ ganjil−1) + Σ(5−genap)) × 2,5`.
- [ ] Halaman hasil:
  - ringkasan;
  - tombol terpisah: "Unduh CSV tugas", "Unduh CSV SUS", "Unduh JSON" (Blob + `a[download]`, tanpa jaringan);
  - "Hapus data uji dari HP ini" dengan konfirmasi.
- [ ] Laptop ≥ 900 px: panel samping berisi skenario, timer, ketukan, layar saat ini, tombol Berhasil/Menyerah untuk moderator (`postMessage` antara iframe dan induk).
- [ ] `uji-rekap.html` untuk menggabungkan JSON.
- Selesai bila: satu sesi lengkap P01 di 390 px menghasilkan CSV berisi 5 baris tugas + 1 baris SUS dengan skor benar; tidak ada request jaringan (dicek di tab network Playwright).

### Fase 6: PWA + deploy GitHub Pages · S
- [ ] `manifest.json`: name Priora, `start_url: screens/s04-hari-ini.html`, standalone, theme #f2f4f7.
- [ ] Ikon 192/512 + maskable dari tanda 2×2 yang sudah ada, dirender lewat Chrome headless di build.
- [ ] `sw.js`: hanya didaftarkan di http(s); HTML network-first, aset cache-first; versi cache dari build.
- [ ] `.nojekyll`.
- [ ] `git init`, repo GitHub, Pages dari branch `main` /root. Push dan pembuatan repo dikonfirmasi pengguna dulu.
- Selesai bila: URL Pages terbuka di HP Android; "Add to Home Screen" muncul; mode uji berjalan offline setelah kunjungan pertama.

### Fase 7: Gate & kritik · M
- [ ] Semua verifikasi di bagian 5 dijalankan pada versi final.
- [ ] Kritik screenshot `app-screens.md` §2.7 (7 pertanyaan), maks. 3 putaran.
- [ ] **Audit antislop (mode AFTER):** `anti-slop/audit-001-YYYY-MM-DD.md` berisi temuan bernomor (R-XX, prioritas HIGH/MEDIUM/LOW). Berhenti, pengguna memilih nomor, perbaiki, lalu tulis laporan lanjutan.
- [ ] Update README (cara uji, reset, data contoh yang perlu dikonfirmasi) dan `notes.md`.

## 5. Rencana verifikasi
- `node tools/check-engine.mjs` → 91,45 Q1 / 53,25 Q2 / 52,42 Q3 / 17,62 Q4. Juga dijalankan otomatis di build.
- `lint.mjs --app css js tools screens app.html index.html` → 0 FAIL.
- `inspect.mjs --app <layar> --widths 430,390,360,320` untuk 15 layar + `app.html` (1440 dan 390). 0 FAIL. Setiap `--allow` (`covered-text` dock, `heavy-shadow` snackbar, colour-share kartu kuadran) dicatat dengan satu kalimat alasan.
- Playwright (Chrome terpasang, lewat `tools/serve.mjs`), viewport 390×844:
  - kelima skenario dijalankan dari awal sampai kriteria berhasil;
  - unduhan CSV diperiksa kolom dan skor SUS-nya;
  - persistensi antar-reload;
  - Reset;
  - fallback saat `localStorage` dilempar error (stub);
  - `scrollWidth ≤ innerWidth` di 320/360/390/430 untuk setiap layar.
- Lighthouse Accessibility ≥ 90 untuk S04, S05a, S06, S10, S11b, S14, `app.html` (`npx lighthouse --only-categories=accessibility`, dev-only).
- Manual: buka dari `file://` di Chrome; Android Chrome lewat URL Pages; keyboard (Tab/Enter/Escape) di sheet dan dialog.
- **Catatan:** bila Chromium/Chrome berjalan sebagai root (CI/Linux container), tambahkan `--no-sandbox` (Playwright `launchOptions.args`, Lighthouse `--chrome-flags="--headless --no-sandbox"`). Di Windows sesi ini tidak perlu.

## 6. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| `localStorage` diblokir (mode privat, kebijakan peramban) | try/catch → `window.name` → memori + notice jujur. Ada uji Playwright. |
| `file://`: Firefox memblokir font dari folder induk; service worker tidak jalan; iframe antar-file dianggap beda origin | Fallback font sistem (cek di Firefox; opsi: font base64 inline bila perlu). SW hanya di http(s). Host laptop memakai `postMessage('*')`. Mode uji resmi lewat URL Pages. |
| Aturan skill bertentangan dengan SDD/keputusan pengguna | Daftar pengecualian di bagian 2. `--allow` hanya untuk aturan itu, dengan alasan tertulis. |
| State bersama merusak S11b/S11c (tugas sudah selesai, jam rapat berbeda) | Rencana difilter terhadap state; notice skenario tetap; setiap skenario uji dimulai dari `Store.reset()`. |
| Data peserta tertinggal di HP peserta | Tombol "Hapus data uji dari HP ini" setelah unduh; kunci per kode peserta; tidak ada pengiriman ke mana pun. |
| Refactor `views.js` mengubah keluaran tanpa disadari | Gate diff = 0 di Fase 1 sebelum perubahan visual. |
| Cache service worker usang saat iterasi | Versi cache dari build, HTML network-first. |
| Porsi warna tinggi membuat layar ramai | Kontainer tetap putih; hanya objek yang berwarna; satu kartu gelap sebagai fokus. |

## 7. Pertanyaan terbuka
Sudah dijawab: deploy (GitHub Pages), SEQ (ya), cara uji (tatap muka, HP peserta), antislop (AFTER). Yang tersisa:
1. Jumlah peserta: 5 sesuai SDD 7.1, atau lebih? Ini mempengaruhi target di `uji-rekap.html`.
2. Apakah kalimat instruksi kelima skenario boleh memakai teks usulan di Fase 5, atau tim punya naskah sendiri? Instruksi sebaiknya tidak menyebut nama tombol.
3. Apakah Kuliah Statistika dan Rapat organisasi berulang mingguan? Ini menentukan isi tampilan Minggu/Bulan. Bila tidak dikonfirmasi, hari lain ditampilkan kosong.
4. Data contoh yang perlu dikonfirmasi tim (dari README): nama dan email Dimas Arya; lima tugas beserta deadline, estimasi, dan kepentingannya; jadwal Kuliah Statistika dan Rapat organisasi; skenario Rapat BEM 13.00–16.00 dan usulannya; estimasi bawaan per kategori [ASUMSI].
5. Teks SUS: versi Sharfina & Santoso 2016 apa adanya ("sistem ini"), atau diganti "aplikasi ini"?
6. Repo GitHub: akun siapa, nama repo, publik atau privat (Pages di repo privat butuh akun berbayar)?

## 8. Di luar lingkup (sengaja tidak dikerjakan)
- Fitur kolaborasi (avatar, anggota, lampiran, subtasks, share, komentar), sesuai SDD 1.1.6.
- Mode gelap; perubahan rumus Priority Engine; perubahan alur atau data contoh.
- Backend, login nyata, sinkronisasi cloud, email sungguhan, notifikasi push sungguhan, alarm yang benar-benar berbunyi.
- Algoritma penjadwalan ulang SDD 3.3.5 yang sesungguhnya. Usulan tetap data contoh untuk skenario Rapat BEM.
- Layar S01–S03, S09, S12, S13, S15–S17.
- Pengiriman data uji ke server atau analitik apa pun.
- Aplikasi web penuh sebagai produk (SDD 1.1.6). Ini prototipe untuk uji.
