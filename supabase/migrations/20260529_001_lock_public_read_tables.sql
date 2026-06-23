-- Close Supabase Security Advisor rls_disabled_in_public findings while
-- preserving the site's intended public read paths.

alter table if exists public.players
    enable row level security;
alter table if exists public.season_sim
    enable row level security;
alter table if exists public.win_distribution
    enable row level security;

drop policy if exists players_public_read on public.players;
drop policy if exists allow_public_read on public.players;
create policy players_public_read
    on public.players
    for select
    to anon, authenticated
    using (true);

drop policy if exists season_sim_public_read on public.season_sim;
drop policy if exists allow_public_read on public.season_sim;
create policy season_sim_public_read
    on public.season_sim
    for select
    to anon, authenticated
    using (true);

drop policy if exists win_distribution_public_read on public.win_distribution;
drop policy if exists allow_public_read on public.win_distribution;
create policy win_distribution_public_read
    on public.win_distribution
    for select
    to anon, authenticated
    using (true);

-- Anonymous and authenticated PostgREST clients should only be able to read
-- these public analytics tables. Pipeline maintenance should use service_role.
revoke all
    on table public.players, public.season_sim, public.win_distribution
    from public, anon, authenticated;

grant select
    on table public.players, public.season_sim, public.win_distribution
    to anon, authenticated;
