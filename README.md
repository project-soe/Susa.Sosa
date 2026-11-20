# Susa.Sosa

Website katalog untuk menjual proyek website dan aplikasi yang sudah jadi. Dibuat tanpa framework (HTML, CSS, JavaScript murni) agar cepat, ringan, dan mudah dipelihara.

## Menjalankan di Termux / proot

```bash
cd susa-sosa
python3 -m http.server 8080
```

Buka `http://localhost:8080` di browser HP. Jangan buka `index.html` langsung dari file manager, karena module JavaScript butuh server.

Tanpa konfigurasi Supabase, website memakai data contoh dari `data/demo.json`.

## Struktur proyek

```
susa-sosa/
├─ index.html              Halaman publik
├─ admin/index.html        Dashboard admin
├─ design-system.html      Preview komponen
├─ assets/logo.svg         Logo
├─ css/                    Tokens, base, components, animations, layout, admin
├─ js/
│  ├─ config.js            URL dan publishable/anon key Supabase
│  ├─ api.js               Lapisan data website publik
│  ├─ ui.js                Interaksi dan animasi
│  ├─ app.js               Logika halaman publik
│  └─ admin/               Login, akses database, helper, dan modul dashboard
├─ data/demo.json          Data contoh
├─ supabase/schema.sql     Skema database, RLS, Storage, data awal
└─ docs/alur-pembayaran.md Dokumentasi pembayaran
```

## Menghubungkan database Supabase

1. Buat project di Supabase.
2. Buka **SQL Editor**, jalankan isi terbaru `supabase/schema.sql`.
3. Di **Authentication > Providers**, nonaktifkan pendaftaran pengguna baru.
4. Buat akun admin secara manual di **Authentication > Users**.
5. Beri akun tersebut role admin melalui SQL Editor (ganti email dengan email akun admin):

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@domainmu.com';
```

6. Salin **Project URL** dan **publishable key** (atau legacy anon key) dari **Project Settings > API Keys** ke `js/config.js`.
7. Keluar lalu masuk kembali ke dashboard setelah mengubah app metadata agar JWT baru memuat role admin.

**Penting:** jangan memberi role admin kepada pengguna biasa. Dashboard dan seluruh operasi tulis database/storage hanya diizinkan untuk JWT dengan `app_metadata.role = admin`. Jangan memakai `user_metadata` untuk pemeriksaan hak admin karena metadata itu dapat diubah oleh pemilik akun.

Publishable/anon key memang berada di browser dan bukan rahasia. Keamanan data bergantung pada Row Level Security di `schema.sql`; jangan pernah menaruh service-role key atau secret gateway di file frontend.

### Catatan Storage

Bucket `media` dibuat public agar gambar proyek, QR, dan foto yang dipakai website dapat dimuat langsung. Unduhan dari bucket public dapat diakses siapa pun yang mengetahui URL, jadi unggah hanya aset yang memang boleh dipublikasikan. Operasi upload, ubah, dan hapus dibatasi untuk admin.

### Mengatasi error RLS saat menambah kategori/data

Jika dashboard menampilkan pesan `new row violates row-level security policy`, login berhasil tetapi token yang dipakai belum dikenali sebagai admin oleh kebijakan RLS. Di **Supabase > SQL Editor**, jalankan perintah berikut dengan email akun admin yang benar:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'EMAIL_ADMIN_KAMU';
```

Pastikan perintah mengubah tepat satu akun. Setelah itu **logout dari dashboard, lalu login kembali** agar access token baru memuat role tersebut. Jangan mengatasi error ini dengan membuka izin INSERT untuk semua pengguna atau menonaktifkan RLS.

Jika tetap gagal, pastikan skema dan policy terbaru sudah dijalankan dari `supabase/schema.sql`, lalu periksa bahwa akun yang dipakai login memang akun yang diberi role admin.

## Dashboard admin

Buka `/admin/` dan masuk dengan akun admin Supabase yang sudah diberi `app_metadata.role = admin`.

| Tab | Fungsi |
|---|---|
| Proyek | Tambah/edit/hapus, harga, publikasi, unggulan, foto, dan video |
| Kategori | Tambah, ubah, urutkan, dan hapus kategori |
| Testimoni | Tambah/edit/hapus, foto, dan publikasi |
| Pembayaran | Kelola bank/e-wallet dan QR |
| Pesanan | Lihat pesanan dan ubah status |
| Pengaturan | WhatsApp, tagline, sosial media, layanan, dan saklar pembayaran |

Perubahan saklar dan urutan disimpan langsung. Halaman admin memakai `noindex`, tetapi keamanan sesungguhnya tetap berasal dari autentikasi dan RLS, bukan dari URL yang tersembunyi.

## Konvensi pengembangan

- Tampilan: ubah token desain di `css/tokens.css`.
- Data publik: akses Supabase melalui `js/api.js`.
- Data admin: akses Supabase melalui `js/admin/db.js`.
- Teks dari database harus di-escape sebelum dimasukkan ke HTML.
- Mobile-first: gaya dasar untuk layar kecil, media query untuk layar lebih besar.

## Status pengerjaan

- [x] Tahap 1: logo dan design system
- [x] Tahap 2: skema database, halaman publik, preview, pesanan manual
- [x] Tahap 3: dashboard admin
- [ ] Tahap 4: pembayaran otomatis (gateway)
- [ ] Tahap 5: optimasi performa, pengujian, rilis
