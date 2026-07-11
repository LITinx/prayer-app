-- Run this in the Supabase SQL editor (or `supabase db push`).

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  initials   text not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  hue        smallint not null check (hue between 0 and 360),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.prayers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  text        text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);

create table public.prayer_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  prayer_id  uuid not null references public.prayers(id) on delete cascade,
  prayed_on  date not null,
  created_at timestamptz not null default now(),
  unique (prayer_id, prayed_on)
);

create index prayers_user_idx on public.prayers(user_id);
create index prayer_logs_user_idx on public.prayer_logs(user_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.prayers enable row level security;
alter table public.prayer_logs enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own categories" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own prayers" on public.prayers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own logs" on public.prayer_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Signup: create profile from Google metadata and seed the 8 default categories.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  full_name text := coalesce(new.raw_user_meta_data ->> 'full_name', 'Friend');
begin
  insert into public.profiles (id, name, initials)
  values (
    new.id,
    split_part(full_name, ' ', 1),
    upper(left(split_part(full_name, ' ', 1), 1) ||
          coalesce(left(split_part(full_name, ' ', 2), 1), ''))
  );
  insert into public.categories (user_id, name, hue) values
    (new.id, 'Health', 12), (new.id, 'Family', 300), (new.id, 'Gratitude', 150),
    (new.id, 'Guidance', 258), (new.id, 'Provision', 55), (new.id, 'Friends', 210),
    (new.id, 'Work', 30), (new.id, 'Church', 285);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
