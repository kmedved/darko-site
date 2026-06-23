-- Close Supabase Security Advisor rls_disabled_in_public findings for
-- public fact tables while preserving the site's intended public read paths.

alter table if exists public.player_ratings
    enable row level security;
alter table if exists public.lineup_ratings
    enable row level security;

drop policy if exists player_ratings_public_read on public.player_ratings;
drop policy if exists allow_public_read on public.player_ratings;
create policy player_ratings_public_read
    on public.player_ratings
    for select
    to anon, authenticated
    using (true);

drop policy if exists lineup_ratings_public_read on public.lineup_ratings;
drop policy if exists allow_public_read on public.lineup_ratings;
create policy lineup_ratings_public_read
    on public.lineup_ratings
    for select
    to anon, authenticated
    using (true);

-- Anonymous and authenticated PostgREST clients should only be able to read
-- these public analytics tables. Pipeline maintenance should use service_role.
revoke all
    on table public.player_ratings, public.lineup_ratings
    from public, anon, authenticated;

grant select
    on table public.player_ratings, public.lineup_ratings
    to anon, authenticated;
