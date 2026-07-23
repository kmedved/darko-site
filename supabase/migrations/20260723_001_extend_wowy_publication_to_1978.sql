-- Permit the unified WOWY publication to begin with the 1977-78 season.
--
-- The relaxed lower bound deliberately accepts both the incumbent 1980
-- publication and the 1978 successor. That keeps the migration independently
-- deployable and preserves the rollback path during the publication
-- transaction. Artifact publishers continue to require exact season coverage.

alter table public.wowy_season_opening_snapshots
    drop constraint if exists wowy_season_opening_snapshots_season_check;
alter table public.wowy_season_opening_snapshots
    add constraint wowy_season_opening_snapshots_season_check
    check (season >= 1978);

alter table public.wowy_season_player_averages
    drop constraint if exists wowy_season_player_averages_season_check;
alter table public.wowy_season_player_averages
    add constraint wowy_season_player_averages_season_check
    check (season >= 1978);

alter table public.wowy_season_adjusted_ratings
    drop constraint if exists wowy_season_adjusted_ratings_season_check;
alter table public.wowy_season_adjusted_ratings
    add constraint wowy_season_adjusted_ratings_season_check
    check (season >= 1978);

alter table public.wowy_season_box_context
    drop constraint if exists wowy_season_box_context_season_check;
alter table public.wowy_season_box_context
    add constraint wowy_season_box_context_season_check
    check (season >= 1978);

alter table public.wowy_season_adjusted_publication
    drop constraint if exists wowy_season_adjusted_publication_range_check;
alter table public.wowy_season_adjusted_publication
    add constraint wowy_season_adjusted_publication_range_check
    check (season_from >= 1978 and season_through >= season_from);

-- This private marker was created by a one-time activation operation rather
-- than a migration, so it may not exist in a fresh database. When present, it
-- must describe either the incumbent or successor publication exactly.
do $activation_constraint$
begin
    if to_regclass('public.wowy_season_average_activation') is not null then
        alter table public.wowy_season_average_activation
            drop constraint if exists wowy_season_average_activation_minimum_check;
        alter table public.wowy_season_average_activation
            add constraint wowy_season_average_activation_minimum_check
            check (source_min_season >= 1978);
    end if;
end;
$activation_constraint$;
