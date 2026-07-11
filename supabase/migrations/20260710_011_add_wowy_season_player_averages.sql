-- Publish one all-era, unweighted full-season WOWY summary for each
-- player-season. Unlike the opening-game snapshots in migration 010, every
-- metric here is the arithmetic mean of that player's published WOWY
-- player-game observations within the selected NBA season.
--
-- A player can change teams during a season. `team_code` and `team_name` are
-- deliberately slash-joined display labels in first-seen chronological order;
-- `team_codes` and `team_names` retain the paired individual historical values
-- for filters and provenance. They must never be interpreted as a current
-- DARKO team assignment.

create table if not exists public.wowy_season_player_averages (
    season integer not null,
    nba_id bigint not null,
    team_code text not null,
    team_name text not null,
    team_codes text[] not null,
    team_names text[] not null,
    first_date date not null,
    last_date date not null,
    season_games integer not null,
    wowy_rapm double precision not null,
    wowy_orapm double precision not null,
    wowy_drapm double precision not null,
    exposure double precision not null,
    constraint wowy_season_player_averages_pkey primary key (season, nba_id),
    constraint wowy_season_player_averages_season_check check (season >= 1980),
    constraint wowy_season_player_averages_nba_id_check check (nba_id > 0),
    constraint wowy_season_player_averages_team_display_check check (
        length(btrim(team_code)) > 0
        and length(btrim(team_name)) > 0
        and team_code = array_to_string(team_codes, '/')
        and team_name = array_to_string(team_names, ' / ')
    ),
    constraint wowy_season_player_averages_team_arrays_check check (
        array_ndims(team_codes) = 1
        and array_ndims(team_names) = 1
        and cardinality(team_codes) > 0
        and cardinality(team_codes) = cardinality(team_names)
        and array_position(team_codes, null) is null
        and array_position(team_names, null) is null
        and cardinality(array_remove(team_codes, '')) = cardinality(team_codes)
        and cardinality(array_remove(team_names, '')) = cardinality(team_names)
        and array_to_string(team_codes, '/', '') !~ '(^|/)[[:space:]]*(/|$)'
        and array_to_string(team_names, '/', '') !~ '(^|/)[[:space:]]*(/|$)'
    ),
    constraint wowy_season_player_averages_date_range_check check (first_date <= last_date),
    constraint wowy_season_player_averages_games_check check (season_games > 0),
    constraint wowy_season_player_averages_metrics_finite_check check (
        wowy_rapm > '-Infinity'::double precision
        and wowy_rapm < 'Infinity'::double precision
        and wowy_orapm > '-Infinity'::double precision
        and wowy_orapm < 'Infinity'::double precision
        and wowy_drapm > '-Infinity'::double precision
        and wowy_drapm < 'Infinity'::double precision
        and exposure >= 0
        and exposure < 'Infinity'::double precision
    )
);

create index if not exists idx_wowy_season_player_averages_season_rating
    on public.wowy_season_player_averages (season, wowy_rapm desc, nba_id);

alter table public.wowy_season_player_averages enable row level security;

drop policy if exists wowy_season_player_averages_public_read
    on public.wowy_season_player_averages;
create policy wowy_season_player_averages_public_read
    on public.wowy_season_player_averages
    for select
    to anon, authenticated
    using (true);

revoke all on table public.wowy_season_player_averages
    from public, anon, authenticated;
grant select on table public.wowy_season_player_averages
    to anon, authenticated;

-- This is deliberately only the provisioning phase. Applying it must leave the
-- already-published opening-game RPCs intact until the checked average artifact
-- has been loaded. The manually run, guarded operation at
-- `supabase/operations/20260710_activate_wowy_season_player_averages.sql`
-- performs that cutover after
-- `publish_wowy_season_player_averages.py --publish` commits successfully.

notify pgrst, 'reload schema';
