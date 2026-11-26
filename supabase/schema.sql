-- Waste Collection Survey: database schema for Supabase (Postgres).

-- Bin registry: one row per physical container (from the Service Overview).
create table if not exists bins (
  bin_id           text primary key,              -- e.g. 201003-T1
  account_number   text not null,
  location         text not null,
  waste_stream     text not null check (waste_stream in ('Trash', 'Recycling', 'Organics')),
  container_size   text not null,
  pickups_per_week integer,                       -- null = no regular schedule
  service_days     text,                          -- e.g. MON/WED/FRI
  notes            text,
  active           boolean not null default true
);

--one row per pickup submitted through the survey. bin details are copied in during submission time so history stays accurate if a bin changes later.
create table if not exists collections (
  id                  bigint generated always as identity primary key,
  driver_name         text not null,
  collected_date      date not null,              -- driver's local date
  collected_time      text not null,              -- driver's local time, HH:MM
  bin_id              text not null references bins(bin_id),
  account_number      text,
  location            text,
  waste_stream        text,
  container_size      text,
  fullness            integer check (fullness in (0, 25, 50, 75, 100)),
  service_completed   text not null check (service_completed in ('Yes', 'Partial', 'No')),
  service_issue       text,
  overflow            boolean not null default false,
  contamination       boolean not null default false,
  contamination_types text[] not null default '{}',
  damaged             boolean not null default false,
  maintenance_issue   text,
  comments            text,
  photo_paths         text[] not null default '{}', -- paths in the "photos" storage bucket
  created_at          timestamptz not null default now()
);

create index if not exists collections_date_idx on collections (collected_date);

--lock the tables down: with row-level security on and no policies, only the server (using the secret service-role key) can read or write
alter table collections enable row level security;

--private bucket for collection photos
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;


--   driver     -> survey only,       supervisor -> everything 

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'driver' check (role in ('driver', 'supervisor')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 'driver')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into profiles (id, full_name, role)
select id, split_part(email, '@', 1), 'driver' from auth.users
on conflict (id) do nothing;

alter table collections add column if not exists submitted_by uuid references auth.users(id);

alter table bins enable row level security;
alter table profiles enable row level security;

-- To make someone a supervisor, run:
--   update profiles set role = 'supervisor'
--   where id = (select id from auth.users where email = 'someone@csus.edu');