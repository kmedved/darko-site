-- Build the small season selector from indexed range lookups instead of
-- scanning every player_ratings row through a correlated EXISTS predicate.

create or replace function public.get_wowy_leaderboard_seasons()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
    with season_bounds as (
        select
            (
                select min(pr.season)::integer
                from public.player_ratings as pr
                where pr.season is not null
            ) as first_season,
            (
                select max(pr.season)::integer
                from public.player_ratings as pr
                where pr.season is not null
            ) as last_season
    )
    select coalesce(
        jsonb_agg(series.season order by series.season desc),
        '[]'::jsonb
    )
    from season_bounds as bounds
    cross join lateral generate_series(bounds.first_season, bounds.last_season) as series(season)
    where exists (
        select 1
        from public.player_ratings as pr
        where pr.season = series.season
    )
      and exists (
        select 1
        from public.wowy_ratings as wr
        where wr.season = series.season
    );
$function$;

revoke all on function public.get_wowy_leaderboard_seasons() from public;
grant execute on function public.get_wowy_leaderboard_seasons()
    to anon, authenticated, service_role;

notify pgrst, 'reload schema';
