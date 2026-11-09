# Priora hi-fi · catatan kerja (gelombang 1)

## Inventaris data & pekerjaan
- Objek: tugas (judul, mata kuliah, kategori+bobot W, deadline, estimasi jam, progres %, kepentingan 1–5, kuadran, skor), blok kerja (tugas, mulai–selesai), event rutin (kuliah, rapat), kejadian mendadak, pengingat (tier, interval, percobaan ke-n).
- Besaran nyata: 3–8 tugas aktif per mahasiswa; estimasi 1–12 jam; deadline jam s.d. 2 minggu; jam produktif 6 j/hari; jam aktif 07.00–22.00.
- Orang: satu mahasiswa (Dimas), membuka aplikasi berkali-kali sehari, sekilas, di HP Android, satu tangan.
- Pekerjaan berikutnya: mulai mengerjakan tugas teratas (paling sering), tandai selesai, tambah tugas cepat, menata ulang saat ada kejadian mendadak, menutup tugas terlewat.
- Milik produk: nama Priora + tanda 2×2 kuadran; empat kuadran berwarna dari SDD; slack (waktu produktif tersedia vs usaha tersisa) dari Priority Engine.
- Jam prototipe: Senin 19 Okt 2026, 09.40. (Lo-fi memakai Minggu dengan kuliah 07.00 — tidak konsisten; diperbaiki ke Senin.)

## Pertanyaan tiap layar
- S04 Hari Ini: "Hari ini saya harus mengerjakan apa dulu, dan cukupkah waktunya?" → terbesar: kartu fokus utama (Q1) dengan bilah waktu.
- S05a Quick Add: "Seberapa genting tugas baru ini?" → pratinjau kuadran langsung.
- S06 Detail: "Kenapa tugas ini Kerjakan Sekarang?" → panel Mengapa dengan bilah urgensi & kepentingan vs batas kuadran.
- S07 Daftar: "Apa saja tugasku, dan mana yang genting?"
- S08a Alarm: "Apa yang harus kulakukan dengan pengingat ini sekarang?"
- S08d Notifikasi: "Mana yang genting di antara notifikasi?"
- S10 Kalender: "Kapan waktu kosongku hari ini?"
- S11a: "Apa yang bertabrakan dengan urusan mendadak ini?"
- S11b: "Bagaimana jadwalku setelah ditata ulang, dan apa yang masih berisiko?"
- S11c: "Jadwal baru sudah benar? Bisa diurungkan?"
- S14: "Pengaturan apa yang aktif?"

## Temuan (finding) utama data
Laporan Praktikum Basis Data butuh 6 j, waktu produktif sebelum deadline ±5 j 05 m → kurang ±55 m.

## Gaya
achromatic-ledger (seed 488942582). Alasan: Priora dibuka sekilas berkali-kali sehari; krom tanpa warna membuat empat warna kuadran menjadi satu-satunya warna di layar, sesuai SDD "merah hanya untuk Q1/Overdue, latar netral".

## Wajah (face)
Ground biru-abu #f2f4f7 (kertas agenda/ledger), kartu putih. Warna hanya pada data: tepi kiri & badge kuadran, overrun bilah waktu.

## Elemen khas
"Bilah cukup waktu" (slack bar): trek = waktu produktif tersedia sebelum deadline, isi = usaha tersisa, kelebihan = merah. Visualisasi langsung rumus A vs R Priority Engine. Muncul di kartu fokus, detail, pratinjau jadwal ulang.

## Ide
Di Priora, rasio waktu tersedia vs usaha (slack) dari Priority Engine menjadi bilah "cukup waktu?" di setiap tugas.

## Penyimpangan dari house rule (disengaja)
- 4 hue kuadran (SDD 6.2.2) — status semantik.
- Radius kartu 12 (SDD 6.2.3), tombol pill.
- Tepi kiri berwarna pada kartu tugas: membawa status kuadran (SDD).

## Kritik putaran terakhir (app-screens §2.7)
1. Pertanyaan dijawab elemen terbesar? Ya: S04 kartu fokus Q1 + angka 20 j 20 m (32 px) terbaca pertama; S06 panel Mengapa; S11b ringkasan dampak.
2. Tepi blok sejajar? Ya; satu margin 16 px, kartu satu lebar. Slot kosong kalender menyisakan ruang (tinggi = durasi; dipertahankan, WARN panel-void dibela).
3. Warna hanya pada data? Ya: krom hitam-abu; hue hanya kuadran (tepi, badge) dan kekurangan waktu (merah Q1). Wajah = ground #f2f4f7 terlihat di layar pertama.
4. Angka konsisten? Ya: skor dihitung engine, sama dengan tabel SDD; slack 5 j 05 m vs 6 j → kurang 55 m tampil sama di S04, S06, S08a; setelah rapat 4 j 20 m (S11b).
5. Nol/kosong jujur? State kosong/memuat/offline/error S04 diperiksa.
6. Legenda = tanda? Ya: legenda jadwal & bilah waktu memakai tanda yang sama.
7. HP: nav bawah 4 tab; dicek 320/360/412 tanpa overflow (chip filter S07 menggulir di barisnya sendiri).
Sisa: S10/S11c belum punya tampilan Bulan/Minggu; tombol nav Tugas/Kalender/Profil mengarah ke layar gelombang 1 yang sudah ada.

## --allow yang dipakai
- covered-text: dock bawah (bar aksi + navigasi, SDD 6.2.4) memang tetap; konten bergulir di bawahnya. Saat diam, padding bawah = tinggi dock sehingga tidak ada yang tertutup.
- hero-void: prototipe khusus HP; di layar lebar kolom 440 px ditaruh di tengah.
