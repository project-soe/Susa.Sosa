# Alur Pembayaran Susa.Sosa (Manual + Otomatis)

Pengunjung memilih satu dari dua jalur di dialog preview proyek. Admin menentukan jalur mana yang aktif lewat dashboard.

## Jalur A: Manual (Rp0, tanpa biaya transaksi)

1. Pengunjung klik **Pesan** di dialog preview.
2. Muncul daftar metode pembayaran (bank dan e-wallet) yang diatur admin: nama, nomor, atas nama, QR.
3. Pengunjung transfer, lalu klik **Konfirmasi via WhatsApp**. Pesan otomatis berisi judul proyek, harga, dan kode pesanan.
4. Admin cek mutasi, ubah status pesanan di dashboard menjadi **Lunas**, lalu kirim proyek lewat WA.

## Jalur B: Otomatis (payment gateway)

1. Pengunjung klik **Bayar Otomatis**, mengisi nama dan WhatsApp.
2. Website membuat pesanan berstatus `menunggu` dan meminta halaman bayar ke gateway (QRIS, e-wallet, virtual account).
3. Pengunjung membayar di halaman gateway.
4. Gateway mengirim notifikasi (webhook) ke fungsi server gratis (Supabase Edge Function). Fungsi memverifikasi tanda tangan lalu mengubah status menjadi `lunas`.
5. Pengunjung langsung melihat tombol **Terima Proyek / Hubungi Admin**, dan admin mendapat penanda pesanan baru.

## Status pesanan (berlaku untuk kedua jalur)

`menunggu` -> `dibayar` -> `selesai` (atau `dibatalkan` / `kedaluwarsa`)

## Tabel baru di database

| Tabel | Isi utama |
|---|---|
| `orders` | id, kode, project_id, nama, wa, harga, metode (`manual`/`gateway`), status, dibuat |
| `payment_methods` | tipe (`bank`/`ewallet`), nama, nomor, atas_nama, qr_url, aktif |
| `settings` | `payment_manual_enabled`, `payment_gateway_enabled`, provider gateway |

## Biaya (perlu diketahui)

- Jalur A: Rp0.
- Jalur B: gateway di Indonesia (mis. Midtrans, Xendit, Tripay) umumnya tanpa biaya bulanan, tetapi memotong persentase per transaksi (QRIS sekitar 0,7%, VA dan e-wallet lebih tinggi). Cek tarif terbaru saat mendaftar. Biaya hanya muncul saat ada penjualan.
- Pendaftaran gateway butuh verifikasi identitas/usaha, jadi lakukan lebih awal. Selama belum aktif, website tetap jalan penuh dengan Jalur A.

## Keamanan

- Kunci rahasia gateway hanya di fungsi server, tidak pernah di kode website.
- Status `lunas` hanya boleh diubah oleh webhook terverifikasi atau admin.
- Harga dihitung ulang di server dari tabel proyek, bukan dari kiriman browser.
