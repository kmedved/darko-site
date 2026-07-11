-- Publish a fixed, all-era WOWY leaderboard for the 100 highest unweighted
-- player-season RAPM averages. This reads the already-published season-average
-- table from migration 011; it deliberately does not change the current or
-- selected-season RPC contracts.
--
-- The ranking is deterministic: total WOWY RAPM descending, then the NBA
-- season end year descending, then canonical NBA player ID ascending. The
-- final two fields are stable tie breakers for the table's primary key.

-- The certification marker is intentionally private under RLS. This narrow
-- boolean gate is SECURITY DEFINER solely so the public SECURITY INVOKER RPC
-- can determine whether the manually certified publication is ready without
-- receiving direct marker-table access. Migration 012 runs before the manual
-- operation creates that table, so resolve it dynamically only after the
-- catalog check succeeds.
create or replace function public.is_wowy_season_average_activated()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    activated boolean;
begin
    if to_regclass('public.wowy_season_average_activation') is null then
        return false;
    end if;

    execute $query$
        select exists (
            select 1
            from public.wowy_season_average_activation as activation
            where activation.id = 1
        )
    $query$
    into activated;

    return activated;
end;
$function$;

revoke all on function public.is_wowy_season_average_activated() from public;
grant execute on function public.is_wowy_season_average_activated()
    to anon, authenticated, service_role;

-- Return at most the 100 highest all-era player-season averages. `season`
-- remains the NBA season end year (for example, 2013 is 2012-13). Historical
-- team arrays preserve every contributing team in chronological order; the
-- slash-joined scalar labels are presentation aliases only.
create or replace function public.get_wowy_all_time_player_seasons()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
    if not public.is_wowy_season_average_activated() then
        return '[]'::jsonb;
    end if;

    return (
        with ranked_seasons as (
            select
                row_number() over (
                    order by
                        averages.wowy_rapm desc,
                        averages.season desc,
                        averages.nba_id
                ) as leaderboard_rank,
                averages.season,
                averages.nba_id,
                players.player_name,
                averages.team_code,
                averages.team_name,
                averages.team_codes,
                averages.team_names,
                null::integer as tm_id,
                null::text as position,
                averages.wowy_rapm,
                averages.wowy_orapm,
                averages.wowy_drapm,
                averages.exposure,
                averages.first_date,
                averages.last_date,
                averages.last_date as date,
                averages.season_games,
                null::integer as career_game_num,
                'season-average'::text as snapshot_context
            from public.wowy_season_player_averages as averages
            left join public.players as players
                on players.nba_id = averages.nba_id
        ),
        top_seasons as (
            select *
            from ranked_seasons
            order by leaderboard_rank
            limit 100
        )
        select coalesce(
            jsonb_agg(
                to_jsonb(top_seasons)
                order by top_seasons.leaderboard_rank
            ),
            '[]'::jsonb
        )
        from top_seasons
    );
end;
$function$;

revoke all on function public.get_wowy_all_time_player_seasons() from public;
grant execute on function public.get_wowy_all_time_player_seasons()
    to anon, authenticated, service_role;

notify pgrst, 'reload schema';
