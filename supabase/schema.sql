-- ==========================================================================
-- Susa.Sosa - Skema database (Supabase / PostgreSQL)
-- Jalankan sekali di Supabase: SQL Editor > New query > paste > Run.
-- Setelah itu: Authentication > Providers > matikan "Allow new users to sign up",
-- lalu buat 1 user admin secara manual (Authentication > Users > Add user).
-- ==========================================================================

-- ---------- Tabel ----------

create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort       int  not null default 0
);

create table if not exists projects (
  id             uuid primary key default gen_random_uuid(),
  category_id    uuid references categories(id) on delete set null,
  title          text not null,
  slug           text not null unique,
  summary        text not null default '',
  description    text not null default '',
  price          bigint not null default 0 check (price >= 0),
  demo_url       text,
  featured       boolean not null default false,   -- tampil di Beranda
  featured_order int not null default 0,
  published      boolean not null default true,
  created_at     timestamptz not null default now()
);

create table if not exists media (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind       text not null check (kind in ('image', 'video')),
  url        text not null,                        -- file Storage atau link YouTube
  sort       int  not null default 0
);

create table if not exists testimonials (
  id         uuid primary key default gen_random_uuid(),
  author     text not null,
  role       text not null default '',
  quote      text not null,
  photo_url  text,
  published  boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pengaturan umum: whatsapp, socials, services (harga jasa), payment_*_enabled
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

create table if not exists payment_methods (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('bank', 'ewallet')),
  name           text not null,                    -- BCA, DANA, GoPay, ...
  account_number text not null,
  account_name   text not null,
  qr_url         text,
  active         boolean not null default true,
  sort           int not null default 0
);

create table if not exists orders (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,                 -- kode pesanan, dibuat di browser
  project_id uuid not null references projects(id),
  buyer_name text,
  buyer_wa   text,
  amount     bigint not null default 0,            -- diisi trigger, bukan dari browser
  method     text not null check (method in ('manual', 'gateway')),
  status     text not null default 'menunggu'
             check (status in ('menunggu', 'dibayar', 'selesai', 'dibatalkan', 'kedaluwarsa')),
  created_at timestamptz not null default now()
);

create index if not exists projects_featured_idx on projects (featured, featured_order);
create index if not exists media_project_idx on media (project_id, sort);

-- ---------- Keamanan harga pesanan ----------
-- Harga selalu diambil dari tabel proyek, status awal selalu 'menunggu'.

create or replace function orders_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select price into new.amount from projects where id = new.project_id and published;
  if new.amount is null then
    raise exception 'Proyek tidak valid';
  end if;
  new.status := 'menunggu';
  return new;
end $$;

drop trigger if exists orders_before_insert on orders;
create trigger orders_before_insert before insert on orders
  for each row execute function orders_before_insert();

-- ---------- Row Level Security ----------

alter table categories      enable row level security;
alter table projects        enable row level security;
alter table media           enable row level security;
alter table testimonials    enable row level security;
alter table settings        enable row level security;
alter table payment_methods enable row level security;
alter table orders          enable row level security;

-- Pengunjung: hanya baca data publik
create policy "public read categories"   on categories      for select using (true);
create policy "public read projects"     on projects        for select using (published);
create policy "public read media"        on media           for select using (true);
create policy "public read testimonials" on testimonials    for select using (published);
create policy "public read settings"     on settings        for select using (true);
create policy "public read payments"     on payment_methods for select using (active);

-- Pengunjung: boleh membuat pesanan manual (harga dikunci trigger), tidak boleh membaca
create policy "public create manual order" on orders
  for insert to anon with check (method = 'manual');

-- Admin (user yang login): akses penuh
create policy "admin all categories"   on categories      for all to authenticated using (true) with check (true);
create policy "admin all projects"     on projects        for all to authenticated using (true) with check (true);
create policy "admin all media"        on media           for all to authenticated using (true) with check (true);
create policy "admin all testimonials" on testimonials    for all to authenticated using (true) with check (true);
create policy "admin all settings"     on settings        for all to authenticated using (true) with check (true);
create policy "admin all payments"     on payment_methods for all to authenticated using (true) with check (true);
create policy "admin all orders"       on orders          for all to authenticated using (true) with check (true);

-- ---------- Storage (foto, video, QR, foto testimoni) ----------

insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media admin write" on storage.objects
  for all to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');

-- ---------- Data awal ----------

insert into settings (key, value) values
  ('brand',      '"Susa.Sosa"'),
  ('tagline',    '"Lihat proyek yang sudah jadi, coba preview-nya, lalu pesan lewat WhatsApp."'),
  ('whatsapp',   '"6285158884404"'),
  ('socials',    '{"instagram":"","tiktok":"","youtube":"","github":""}'),
  ('services',   '[{"name":"Website Company Profile","price":750000,"desc":"Desain responsif, cepat, siap online."},{"name":"Website + Dashboard Admin","price":1500000,"desc":"Kelola konten sendiri tanpa coding."},{"name":"Aplikasi Custom","price":2500000,"desc":"Dibuat sesuai kebutuhan bisnismu."}]'),
  ('payment_manual_enabled',  'true'),
  ('payment_gateway_enabled', 'false')
on conflict (key) do nothing;
