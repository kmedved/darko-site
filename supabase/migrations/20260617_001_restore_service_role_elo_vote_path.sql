-- Keep public Elo voting behind the SvelteKit service-role wrapper.
-- This restores the execute restrictions that were relaxed in 20260306_001.

alter table if exists public.elo_ratings enable row level security;
alter table if exists public.elo_votes enable row level security;

revoke insert, update, delete, truncate, references, trigger
    on table public.elo_ratings
    from public, anon, authenticated;
revoke insert, update, delete, truncate, references, trigger
    on table public.elo_votes
    from public, anon, authenticated;

grant select on table public.elo_ratings to anon, authenticated;
grant select on table public.elo_votes to anon, authenticated;

revoke execute on function public.record_elo_vote(bigint, bigint, numeric)
    from public, anon, authenticated;
grant execute on function public.record_elo_vote(bigint, bigint, numeric)
    to service_role;

alter table if exists public.elo_rate_limits enable row level security;
revoke all on table public.elo_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.elo_rate_limits to service_role;

revoke all on function public.check_elo_rate_limit(text, text, timestamptz)
    from public, anon, authenticated;
grant execute on function public.check_elo_rate_limit(text, text, timestamptz) to service_role;
