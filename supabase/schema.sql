create table public.meet_results (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  division text not null,
  athlete_name text not null,
  class_name text not null,
  result numeric(10,3) not null check (result >= 0),
  record_level text not null default 'none' check (record_level in ('none', 'school', 'grade')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meet_results_event_division_unique_entry unique (event_name, division, athlete_name, class_name)
);

create index meet_results_event_division_result_idx on public.meet_results (event_name, division, result);
alter table public.meet_results enable row level security;
revoke all on public.meet_results from anon, authenticated;

