alter table public.social_issues
add column if not exists yearly_counts jsonb not null default '{}'::jsonb;

update public.social_issues
set yearly_counts = jsonb_build_object(to_char(updated_at, 'YYYY'), count)
where yearly_counts = '{}'::jsonb;
