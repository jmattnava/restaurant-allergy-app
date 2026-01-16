-- 1) Join table: dishes ↔ stations (many-to-many)
create table if not exists public.dish_stations (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Prevent duplicates
create unique index if not exists ux_dish_stations_dish_station
  on public.dish_stations(dish_id, station_id);

-- Helpful indexes
create index if not exists ix_dish_stations_dish_id
  on public.dish_stations(dish_id);

create index if not exists ix_dish_stations_station_id
  on public.dish_stations(station_id);

-- 2) RLS (match your existing pattern: authenticated can manage)
alter table public.dish_stations enable row level security;

drop policy if exists "Authenticated can read dish stations" on public.dish_stations;
create policy "Authenticated can read dish stations"
  on public.dish_stations
  for select
  to authenticated
  using (true);

drop policy if exists "Authenticated can insert dish stations" on public.dish_stations;
create policy "Authenticated can insert dish stations"
  on public.dish_stations
  for insert
  to authenticated
  with check (true);

drop policy if exists "Authenticated can update dish stations" on public.dish_stations;
create policy "Authenticated can update dish stations"
  on public.dish_stations
  for update
  to authenticated
  using (true);

drop policy if exists "Authenticated can delete dish stations" on public.dish_stations;
create policy "Authenticated can delete dish stations"
  on public.dish_stations
  for delete
  to authenticated
  using (true);

-- 3) One-time backfill from legacy dishes.station (text) to join table
-- This assumes stations.name matches dishes.station values.
insert into public.dish_stations (dish_id, station_id)
select d.id as dish_id, s.id as station_id
from public.dishes d
join public.stations s on s.name = d.station
where d.station is not null and d.station <> ''
on conflict do nothing;
