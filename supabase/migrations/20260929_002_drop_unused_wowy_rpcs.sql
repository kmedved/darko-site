-- Drop two public WOWY functions nothing calls. Apply after
-- 20260929_001_reassert_function_ownership.sql, which re-created
-- get_wowy_season_player_ratings on purpose so production would first match this
-- repository; this migration then removes it (nba_darko
-- docs/migration/supabase-function-ownership-and-wowy-import.md, C.3).
--
-- get_wowy_season_player_ratings(integer): its only caller was the site helper
-- getWowySeasonPlayers, which no page has used since /wowy season views switched to
-- Season-Adjusted ratings (get_wowy_adjusted_season_player_ratings). The helper is
-- removed in the same change. The nba_darko publisher no longer defines it.
--
-- get_wowy_adjusted_all_time_player_seasons(): the zero-argument top-100 Adjusted RPC
-- from 20260717_001. The site reads Adjusted all-time pages through
-- get_wowy_all_time_player_seasons_page, and no other function calls this one; its only
-- references are its own definition and grants.
--
-- Idempotent. Nothing depends on either function, so no CASCADE.

begin;

drop function if exists public.get_wowy_season_player_ratings(integer);
drop function if exists public.get_wowy_adjusted_all_time_player_seasons();

commit;

notify pgrst, 'reload schema';
