# Alur Pembayaran Susa.Sosa (Manual + Otomatis)

Website saat ini mendukung konfirmasi pembayaran manual. Integrasi payment gateway masih berupa rencana dan belum aktif.

## Jalur A: Manual

1. Pengunjung membuka dialog preview proyek dan memilih **Pesan Sekarang**.
2. Website menampilkan metode pembayaran bank/e-wallet aktif yang diatur admin.
3. Pengunjung transfer, lalu klik **Konfirmasi via WhatsApp**.
4. Website mencatat pesanan berstatus `menunggu` dan membuat pesan WhatsApp berisi judul proyek, harga, serta kode pesanan.
5. Admin memeriksa pembayaran secara manual, lalu memperbarui status pesanan menjadi `dibayar` atau `dibatalkan`. Setelah pekerjaan diserahkan, status dapat diubah menjadi `selesai`.

## Jalur B: Otomatis (belum diimplementasikan)

Rencana integrasi gateway membutuhkan server-side endpoint (misalnya Supabase Edge Function), penyimpanan secret hanya di server, verifikasi tanda tangan webhook, dan pembaruan status pesanan yang tervalidasi. Saklar gateway di dashboard belum mengaktifkan alur pembayaran otomatis.

## Status pesanan

`menunggu` -> `dibayar` -> `selesai` (atau `dibatalkan` / `kedaluwarsa`).

## Keamanan

- Kunci publishable/anon boleh berada di frontend; service-role key dan secret gateway tidak boleh.
- Harga pesanan dihitung ulang oleh trigger database dari proyek yang masih dipublikasikan.
- Status awal pesanan dipaksa menjadi `menunggu` oleh trigger.
- Akses admin dibatasi melalui `app_metadata.role = admin` pada JWT.
- Bucket `media` bersifat public untuk mendukung URL gambar langsung; jangan simpan dokumen atau file rahasia di dalamnya.
