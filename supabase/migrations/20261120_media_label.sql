-- Tambahkan label per foto/video pada media katalog.
-- Aman dijalankan pada database lama maupun baru.
alter table public.media
  add column if not exists label text not null default '';
