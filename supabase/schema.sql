-- ==========================================================================
-- Susa.Sosa - Skema database (Supabase / PostgreSQL)
-- Jalankan di Supabase: SQL Editor > New query > paste > Run.
-- Buat user admin secara manual, lalu beri app_metadata role=admin.
-- Jangan mengandalkan "Allow new users to sign up" sebagai satu-satunya pagar.
-- ==========================================================================

-- ---------- Tabel ----------

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort int not null default 0
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  title text not null,
  slug text not null unique,
  summary text not null default '',
  description text not null default '',
  price bigint not null default 0 check (price >= 0),
  demo_url text,
  featured boolean not null default false,
  featured_order int not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  sort int not null default 0
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  author text not null,
  role text not null default '',
  quote text not null,
  photo_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value jsonb not null
);

create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bank', 'ewallet')),
  name text not null,
  account_number text not null,
  account_name text not null,
  qr_url text,
  active boolean not null default true,
  sort int not null default 0
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  project_id uuid not null references projects(id),
  buyer_name text,
  buyer_wa text,
  amount bigint not null default 0,
  method text not null check (method in ('manual', 'gateway')),
  status text not null default 'menunggu'
    check (status in ('menunggu', 'dibayar', 'selesai', 'dibatalkan', 'kedaluwarsa')),
  created_at timestamptz not null default now()
);

create index if not exists projects_featured_idx on projects (featured, featured_order);
create index if not exists media_project_idx on media (project_id, sort);
create index if not exists orders_status_created_idx on orders (status, created_at desc);

-- ---------- Keamanan harga pesanan ----------
-- Harga diambil dari proyek yang masih dipublikasikan; status dipaksa menunggu.
create or replace function orders_before_insert() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  select price into new.amount from public.projects
    where id = new.project_id and published;
  if new.amount is null then
    raise exception 'Proyek tidak valid atau tidak dipublikasikan';
  end if;
  new.status := 'menunggu';
  return new;
end;
$$;

drop trigger if exists orders_before_insert on orders;
create trigger orders_before_insert before insert on orders
  for each row execute function orders_before_insert();

-- ---------- Row Level Security ----------

alter table categories enable row level security;
alter table projects enable row level security;
alter table media enable row level security;
alter table testimonials enable row level security;
alter table settings enable row level security;
alter table payment_methods enable row level security;
alter table orders enable row level security;

-- Hapus policy versi sebelumnya agar skrip aman dijalankan ulang dan
-- policy admin lama yang terlalu luas tidak tertinggal.
drop policy if exists "public read categories" on categories;
drop policy if exists "public read projects" on projects;
drop policy if exists "public read media" on media;
drop policy if exists "public read testimonials" on testimonials;
drop policy if exists "public read settings" on settings;
drop policy if exists "public read payments" on payment_methods;
drop policy if exists "public create manual order" on orders;
drop policy if exists "admin all categories" on categories;
drop policy if exists "admin all projects" on projects;
drop policy if exists "admin all media" on media;
drop policy if exists "admin all testimonials" on testimonials;
drop policy if exists "admin all settings" on settings;
drop policy if exists "admin all payments" on payment_methods;
drop policy if exists "admin all orders" on orders;
drop policy if exists "admin media write" on storage.objects;
drop policy if exists "media public read" on storage.objects;
drop policy if exists "media admin write" on storage.objects;

-- Pengunjung hanya membaca data yang memang publik.
create policy "public read categories" on categories
  for select to anon, authenticated using (true);
create policy "public read projects" on projects
  for select to anon, authenticated using (published);
create policy "public read media" on media
  for select to anon, authenticated using (
    exists (select 1 from projects p where p.id = media.project_id and p.published)
  );
create policy "public read testimonials" on testimonials
  for select to anon, authenticated using (published);
create policy "public read settings" on settings
  for select to anon, authenticated using (true);
create policy "public read payments" on payment_methods
  for select to anon, authenticated using (active);

-- Pengunjung hanya boleh membuat pesanan manual. Trigger mengunci harga/status.
create policy "public create manual order" on orders
  for insert to anon with check (method = 'manual');

-- Hak admin hanya diberikan kepada JWT dengan app_metadata.role = admin.
-- app_metadata tidak dapat diubah oleh pengguna melalui API user biasa.
create policy "admin all categories" on categories
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin all projects" on projects
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin all media" on media
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin all testimonials" on testimonials
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin all settings" on settings
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin all payments" on payment_methods
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admin all orders" on orders
  for all to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ---------- Storage ----------
-- Bucket media tetap public agar URL gambar dapat dibuka oleh website publik.
-- Karena bucket public melewati RLS saat mengunduh objek, jangan unggah file
-- rahasia ke bucket ini. Hak upload/ubah/hapus dibatasi untuk admin.
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;

create policy "admin media write" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'media'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  with check (
    bucket_id = 'media'
    and (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ---------- Data awal ----------
insert into settings (key, value) values
  ('brand', '"Susa.Sosa"'),
  ('tagline', '"Lihat proyek yang sudah jadi, coba preview-nya, lalu pesan lewat WhatsApp."'),
  ('whatsapp', '"6285158884404"'),
  ('socials', '{"instagram":"","tiktok":"","youtube":"","github":""}'),
  ('services', '[{"name":"Website Company Profile","price":750000,"desc":"Desain responsif, cepat, siap online."},{"name":"Website + Dashboard Admin","price":1500000,"desc":"Kelola konten sendiri tanpa coding."},{"name":"Aplikasi Custom","price":2500000,"desc":"Dibuat sesuai kebutuhan bisnismu."}]'),
  ('payment_manual_enabled', 'true'),
  ('payment_gateway_enabled', 'false')
on conflict (key) do nothing;
