create table if not exists public.social_issues (
  id bigint generated always as identity primary key,
  term text not null,
  normalized_term text not null unique,
  count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_issues_count_idx
  on public.social_issues (count desc, updated_at desc);

alter table public.social_issues enable row level security;

create policy "public can read social issues"
  on public.social_issues
  for select
  to anon
  using (true);

create policy "public can insert social issues"
  on public.social_issues
  for insert
  to anon
  with check (true);

create policy "public can update social issues"
  on public.social_issues
  for update
  to anon
  using (true)
  with check (true);

create or replace function public.set_social_issues_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists social_issues_set_updated_at on public.social_issues;

create trigger social_issues_set_updated_at
before update on public.social_issues
for each row
execute function public.set_social_issues_updated_at();
