-- Cover latest-team fallback lookups without scanning player rating rows.

create index if not exists idx_ratings_player_team_latest
    on public.player_ratings (nba_id, date desc)
    include (team_name, tm_id)
    where team_name is not null and tm_id > 0;
