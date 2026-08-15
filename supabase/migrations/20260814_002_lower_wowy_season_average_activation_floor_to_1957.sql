-- Align the private season-average activation marker with the unified
-- 1957-current Daily and season-average publication range.

do $activation_constraint$
begin
    if to_regclass('public.wowy_season_average_activation') is not null then
        alter table public.wowy_season_average_activation
            drop constraint if exists wowy_season_average_activation_minimum_check;
        alter table public.wowy_season_average_activation
            add constraint wowy_season_average_activation_minimum_check
            check (source_min_season >= 1957);
    end if;
end;
$activation_constraint$;
