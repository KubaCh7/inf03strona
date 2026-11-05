alter table public.questions add column if not exists image text;
alter table public.questions add column if not exists image_answers boolean not null default false;
alter table public.questions add column if not exists ocr boolean not null default false;
alter table public.questions add column if not exists sources jsonb not null default '[]'::jsonb;
