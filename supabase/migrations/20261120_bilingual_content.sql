-- Susa.Sosa: bilingual content fields
-- Run once in Supabase SQL Editor for an existing database.

alter table public.categories
  add column if not exists name_en text not null default '';

alter table public.projects
  add column if not exists title_en text not null default '',
  add column if not exists summary_en text not null default '',
  add column if not exists description_en text not null default '';

alter table public.media
  add column if not exists label_en text not null default '';

alter table public.testimonials
  add column if not exists role_en text not null default '',
  add column if not exists quote_en text not null default '';

-- English tagline is stored as a settings JSON value.
insert into public.settings (key, value)
values ('tagline_en', '"Explore completed projects, preview them, and order via WhatsApp."'::jsonb)
on conflict (key) do nothing;
