# Susa.Sosa

Website katalog untuk menjual proyek website dan aplikasi yang sudah jadi.
Dibuat tanpa framework (HTML, CSS, JavaScript murni) agar cepat, ringan, dan mudah dipelihara.

## Menjalankan di Termux / proot

```bash
cd susa-sosa
python3 -m http.server 8080
```

Buka `http://localhost:8080` di browser HP. Jangan buka `index.html` langsung dari file manager,
karena module JavaScript butuh server (bahkan server lokal sederhana seperti di atas).

Tanpa konfigurasi apa pun, website memakai data contoh dari `data/demo.json`.

## Struktur proyek

```
susa-sosa/
├─ index.html              Halaman publik (intro, beranda, katalog, layanan, testimoni, kontak)
├─ admin/index.html        Dashboard admin (alamat: /admin/)
├─ design-system.html      Halaman preview komponen (untuk pengembang)
├─ assets/logo.svg         Logo (mengikuti warna tema)
├─ css/
│  ├─ tokens.css           Warna, font, spasi, animasi (ubah tampilan dari sini)
│  ├─ base.css             Reset dan elemen dasar
│  ├─ components.css       Tombol, chip, kartu, dialog
│  ├─ animations.css       Keyframes, intro, transisi halaman
│  ├─ layout.css           Header, hero, section, grid, footer
│  └─ admin.css            Tampilan dashboard admin
├─ js/
│  ├─ config.js            URL dan kunci Supabase
│  ├─ api.js               Satu-satunya lapisan pengambilan data
│  ├─ ui.js                Riak klik, animasi scroll, dialog, intro
│  ├─ app.js               Logika halaman publik
│  └─ admin/               Dashboard: main (login, tab), db (Supabase), helpers,
│                          projects, categories, testimonials, payments, settings, orders
├─ data/demo.json          Data contoh (dipakai jika Supabase belum diisi)
├─ supabase/schema.sql     Skema database, keamanan (RLS), dan data awal
└─ docs/alur-pembayaran.md Alur pembayaran manual dan otomatis
```

## Menghubungkan database (Supabase, gratis)

1. Buat project di supabase.com.
2. Buka **SQL Editor**, tempel isi `supabase/schema.sql`, lalu **Run**.
3. **Authentication > Providers**: matikan pendaftaran pengguna baru, lalu buat satu user admin.
4. Salin **Project URL** dan **anon key** (Project Settings > API) ke `js/config.js`.

Kunci `anon` memang publik. Keamanan dijaga oleh Row Level Security di `schema.sql`:
pengunjung hanya bisa membaca data publik dan membuat pesanan manual; hanya admin yang bisa mengubah data.

## Dashboard admin

Buka `/admin/` (contoh `http://localhost:8080/admin/`) lalu masuk dengan email dan kata sandi user admin Supabase.

| Tab | Fungsi |
|---|---|
| Proyek | Tambah/edit/hapus, judul, deskripsi, harga, tampil atau sembunyikan, unggulan di Beranda + urutan, foto (dikompres otomatis ke WebP), video YouTube |
| Kategori | Tambah, ganti nama, urutan, hapus |
| Testimoni | Tambah/edit/hapus, foto opsional, tampil atau sembunyikan |
| Pembayaran | Bank dan e-wallet: nama, nomor, atas nama, QR, aktif atau nonaktif |
| Pesanan | Daftar pesanan dan ubah status (menunggu, dibayar, selesai, dibatalkan, kedaluwarsa) |
| Pengaturan | Nomor WhatsApp, kalimat Beranda, link sosmed, harga jasa, saklar metode pembayaran |

Perubahan pada saklar dan urutan langsung tersimpan. Halaman `/admin/` memakai `noindex` dan tidak ditautkan dari website publik.

## Konvensi

- Gaya: ubah nilai di `css/tokens.css`, jangan menulis warna atau ukuran langsung di komponen.
- Data: semua akses data lewat `js/api.js`.
- Teks dari database selalu di-escape (`esc()` di `app.js`) sebelum masuk HTML.
- Mobile-first: gaya dasar untuk layar kecil, `@media (min-width)` untuk layar besar.

## Status pengerjaan

- [x] Tahap 1: logo, design system
- [x] Tahap 2: skema database, halaman publik, dialog preview, pesanan manual
- [x] Tahap 3: dashboard admin
- [ ] Tahap 4: pembayaran otomatis (gateway)
- [ ] Tahap 5: optimasi performa, pengujian, rilis
# Susa.Sosa
