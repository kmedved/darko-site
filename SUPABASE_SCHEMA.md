# DARKO Supabase Schema Reference

Reference for the Supabase (Postgres) tables powering darko-site. Use this when debugging data issues, adding columns, or modifying API routes.

## Architecture

```
Python pipeline (nba_darko, run on the writer Mac)
  → pipeline_scripts/publish/website.py builds each website table as a Polars frame
  → uploads each table (for player_ratings, only its changed days unless it is rebuilt)
    into a "<table>__next" staging table the site cannot read
  → one short transaction swaps the staged tables in (plain DROP TABLE + RENAME),
    re-applies row-level security, records the publication, and NOTIFYs PostgREST
  → calls the Vercel deploy hook so the site redeploys with an empty cache

SvelteKit (darko-site/, deployed on Vercel)
  → queries Supabase via PostgREST (supabase-js client)
  → src/lib/server/supabase.js — all DB access, caching, field mapping
  → API routes in src/routes/api/ serve JSON to frontend components
```

The publisher is `pipeline_scripts/publish/website.py` in `nba_darko` (formerly
`1_historic_darko/push_website.py`, which the Part A pipeline branch
`codex/website-function-ownership-20260928-v1` still uses); see
[Pipeline publisher](#pipeline-publisher). The WOWY tables have their own publishers.

**Ownership.** `nba_darko` owns the tables it publishes: columns, indexes, staging and
swap, and the read policies on tables the swap recreates. `darko-site` owns application
state (the Elo vote path and `elo_rate_limits`) and every Postgres function, through
`supabase/migrations/`. The publisher never issues `CREATE OR REPLACE FUNCTION`, and a
publish never removes a function: string-bodied SQL functions record no dependency on the
tables they name. `supabase/migrations/20260929_001_reassert_function_ownership.sql` put
production at this repository's definitions as of that migration. It is a point-in-time
reassertion: later migrations redefine or drop some of those functions, so re-running 001
must be followed by re-running, in filename order, every later migration that touches them.

**Nothing may depend on a table the publisher replaces.** Every publish replaces
`player_ratings` (on a full rebuild), `lineup_ratings`, `season_calendar`, `rating_frames`,
`player_comps`, `player_seasons`, `game_updates` and `rating_moves` with a plain
`DROP TABLE`, without `CASCADE`. If any other database object depends on one of them, that
drop fails, the whole publication rolls back, and every later publish fails the same way
until the dependent is removed. These create such a dependency:

- a view or materialized view that reads the table;
- a foreign key in another table that references it;
- a rule, a policy on another table whose expression reads it, or a constraint trigger on
  another table declared `FROM` it;
- a function or column whose type is the table's row type or an array of it, such as
  `returns setof public.player_ratings` or an argument of type `public.player_ratings`;
- a function or procedure with a SQL-standard `BEGIN ATOMIC` body that reads the table.

Safe: a string-bodied (`as $function$ ... $function$`) `language sql` or `language plpgsql`
function that returns a scalar (`text`, `boolean`, ...), `jsonb`, `setof record`, or
`table(...)` with explicit column types.
Postgres records no dependency from a string body on the tables it names, so the drop goes
through and the function reads the new table on its next call. Every function in
`supabase/migrations/` follows this pattern. Anything attached to one of those tables itself
(an index, trigger, policy, grant or comment added by a migration) is dropped with the old
table at the next replacement and not recreated: indexes belong in `TABLE_INDEXES` in the
publisher, and the swap re-applies only row-level security, the `allow_public_read` policy
and `SELECT` for `anon` and `authenticated`. `npm run migrations:replay` fails, naming the
dependent, if a migration creates one on any of these eight tables.

---

## Tables

### player_ratings

Core fact table. One row per player per game-date.

- **Primary key:** `(nba_id, date)` (`pk_player_ratings`)
- **Indexes** (`TABLE_INDEXES` in the publisher): `date DESC`; `season`; `nba_id`;
  `(season DESC, active_roster, nba_id, date DESC)`; `(season, team_name, date)`;
  `(nba_id, date DESC) INCLUDE (team_name, tm_id)` where `team_name` is set and `tm_id > 0`
  (the last also created by `20260710_004_add_latest_team_index.sql`)
- **Rows:** ~1,089,000
- **Update strategy:** only the days whose fingerprints changed are replaced (row locks, readers never wait); a full staged rebuild and swap when `--full-player-ratings` is passed, nothing is published yet, more than a quarter of the rows changed, or the columns or fingerprints no longer match.
- **Site reads:** every column reaches the server, because `get_active_player_ratings` and
  `get_season_start_player_ratings` return whole rows (`pr.*`). The direct selects and filters
  in `src/lib/server/supabase.js` (`RATING_COLUMNS`, `TRAJECTORY_RATING_COLUMNS`,
  `PLAYER_PROFILE_RATING_COLUMNS`, `PLAYERS_AS_OF_COLUMNS`, `SEASON_ROW_COLUMNS`,
  `FROZEN_RATING_FIELDS` from `src/lib/utils/frozenRatings.js`, and literal selects) name 71 of the
  76: all but `game_value`, `wins_pg`, `sal_poolshare`, `sal_vetfloor` and `sal_market`, which no
  page uses.

Built by `build_supabase_tables()` in `pipeline_scripts/publish/website.py`, which left-joins six
source files on `(nba_id, date)`, each filtered to the base table's keys before it is collected:

| Source parquet | Join type | Columns contributed |
|---|---|---|
| `temp/spm_outputs.parq` | base table | nba_id, date, season, team_name, tm_id, opp_id, future_game, active_roster, available, poss, dpm/o_dpm/d_dpm, box_dpm/box_odpm/box_ddpm, on_off_dpm/on_off_odpm/on_off_ddpm |
| `5_assembled_features.parq` | left join | age, career_game_num, seconds_played, position, position_num, x_position |
| `bayes_rapm_ratings.parq` | left join | bayes_rapm_off, bayes_rapm_def, bayes_rapm_total, rapm_exposure |
| `talent_game_predictions.parq` | left join | x_minutes, x_pace, x_{stat}_100 columns, x_{pct} columns, tr_minutes, tr_starter, tr_fg3_pct, tr_ft_pct |
| `temp/nba_survivorship.parq` | left join | projected_years_remaining, projected_years_remaining_cal, x_retirement_age, x_retirement_age_cal, s1–s15 |
| `dpm_salary.parq` | left join | game_value, wins_pg, warp, sal_poolshare, sal_vetfloor, sal_market, sal_market_fixed, actual_salary, surplus_value (a null in the last three takes the player-season's last row that has all three) |

**All 76 columns, in published order.** The builder casts `nba_id` (bigint), `date` (date),
`season`, `tm_id`, `opp_id`, `future_game`, `career_game_num` and `seconds_played` (integer),
`active_roster` (smallint) and `poss` (real); every other column keeps its source parquet's
type (Float32 is `real`, Float64 `double precision`, strings and categoricals `text`). These
are the types of the bundle the builder writes on nba_darko's `codex/wowy-import-20260928-v1`;
the Part A pipeline branch's `1_historic_darko/push_website.py` publishes the same columns with
the same types.

| # | Column | Postgres type | Source | Notes |
|---|---|---|---|---|
| 1 | nba_id | bigint | spm | Player NBA ID |
| 2 | date | date | spm | Game date |
| 3 | season | integer | spm | NBA season ending year, e.g. 2026 for 2025-26 |
| 4 | team_name | text | spm | Team abbreviation |
| 5 | tm_id | integer | spm | Team NBA ID |
| 6 | opp_id | integer | spm | Opponent's team NBA ID; -999 on offseason rows, like `tm_id` |
| 7 | future_game | integer | spm | 1 = projected future game |
| 8 | active_roster | smallint | spm | 1 = on active roster |
| 9 | available | real | spm | Availability probability [0,1] |
| 10 | poss | real | spm | Possessions played |
| 11 | dpm | real | spm | Full DPM (o_dpm + d_dpm) |
| 12 | o_dpm | real | spm | Offensive DPM |
| 13 | d_dpm | real | spm | Defensive DPM |
| 14 | box_dpm | real | spm | Box-score DPM |
| 15 | box_odpm | real | spm | Box-score offensive DPM |
| 16 | box_ddpm | real | spm | Box-score defensive DPM |
| 17 | on_off_dpm | real | spm | On/off DPM |
| 18 | on_off_odpm | real | spm | On/off offensive DPM |
| 19 | on_off_ddpm | real | spm | On/off defensive DPM |
| 20 | age | double precision | bio | Player age at game date |
| 21 | career_game_num | integer | bio | Career game count |
| 22 | seconds_played | integer | bio | Seconds played in game |
| 23 | position | text | bio | Position label |
| 24 | position_num | double precision | bio | Numeric position (1–5 continuous) |
| 25 | x_position | text | bio | Model-predicted position |
| 26 | bayes_rapm_off | real | rapm | Bayesian RAPM offensive (pts/100 poss above avg) |
| 27 | bayes_rapm_def | real | rapm | Bayesian RAPM defensive |
| 28 | bayes_rapm_total | real | rapm | Bayesian RAPM total |
| 29 | rapm_exposure | real | rapm | Exponentially-weighted accumulated possessions |
| 30 | x_minutes | real | projections | Projected minutes per game |
| 31 | x_pace | real | projections | Projected pace |
| 32 | x_pts_100 | real | projections | Projected pts/100 poss |
| 33 | x_ast_100 | real | projections | Projected ast/100 poss |
| 34 | x_orb_100 | real | projections | Projected orb/100 poss |
| 35 | x_drb_100 | real | projections | Projected drb/100 poss |
| 36 | x_stl_100 | real | projections | Projected stl/100 poss |
| 37 | x_blk_100 | real | projections | Projected blk/100 poss |
| 38 | x_tov_100 | real | projections | Projected tov/100 poss |
| 39 | x_fga_100 | real | projections | Projected fga/100 poss |
| 40 | x_fg3a_100 | real | projections | Projected fg3a/100 poss |
| 41 | x_fta_100 | real | projections | Projected fta/100 poss |
| 42 | x_fg_pct | real | projections | Projected FG% |
| 43 | x_fg3_pct | real | projections | Projected 3P% |
| 44 | x_ft_pct | real | projections | Projected FT% |
| 45 | tr_minutes | real | projections | Time-decayed running avg minutes |
| 46 | tr_starter | real | projections | Time-decayed starter probability |
| 47 | tr_fg3_pct | real | projections | Time-decayed 3P% |
| 48 | tr_ft_pct | real | projections | Time-decayed FT% |
| 49 | projected_years_remaining | real | survivorship | Coherent expected years = sum(S(t)), curve-calibrated |
| 50 | projected_years_remaining_cal | real | survivorship | Presentation-calibrated expected years (non-coherent, better per age cohort) |
| 51 | x_retirement_age | double precision | survivorship | age + projected_years_remaining |
| 52 | x_retirement_age_cal | double precision | survivorship | age + projected_years_remaining_cal |
| 53 | s1 | real | survivorship | P(plays ≥1 more season) |
| 54 | s2 | real | survivorship | P(plays ≥2 more seasons) |
| 55 | s3 | real | survivorship | P(plays ≥3 more seasons) |
| 56 | s4 | real | survivorship | P(plays ≥4 more seasons) |
| 57 | s5 | real | survivorship | P(plays ≥5 more seasons) |
| 58 | s6 | real | survivorship | P(plays ≥6 more seasons) |
| 59 | s7 | real | survivorship | P(plays ≥7 more seasons) |
| 60 | s8 | real | survivorship | P(plays ≥8 more seasons) |
| 61 | s9 | real | survivorship | P(plays ≥9 more seasons) |
| 62 | s10 | real | survivorship | P(plays ≥10 more seasons) |
| 63 | s11 | real | survivorship | P(plays ≥11 more seasons) |
| 64 | s12 | real | survivorship | P(plays ≥12 more seasons) |
| 65 | s13 | real | survivorship | P(plays ≥13 more seasons) |
| 66 | s14 | real | survivorship | P(plays ≥14 more seasons) |
| 67 | s15 | real | survivorship | P(plays ≥15 more seasons) |
| 68 | game_value | double precision | salary | Per-game dollar value based on DPM and minutes |
| 69 | wins_pg | double precision | salary | Wins produced per game |
| 70 | warp | double precision | salary | Wins above replacement player |
| 71 | sal_poolshare | double precision | salary | Annualized salary from the player's share of his game's positive value (82 games × the per-game cap pool) |
| 72 | sal_vetfloor | double precision | salary | Veteran minimum plus his positive-value share of the per-game surplus, annualized |
| 73 | sal_market | double precision | salary | Market salary from his share of the game's total value (negatives allowed), annualized |
| 74 | sal_market_fixed | double precision | salary | Fair market salary estimate (dollars); a null takes the value from the player-season's last row that has all three of `sal_market_fixed`, `actual_salary` and `surplus_value` |
| 75 | actual_salary | double precision | salary | Actual contract salary (dollars); a null takes the value from the player-season's last row that has all three of `sal_market_fixed`, `actual_salary` and `surplus_value` |
| 76 | surplus_value | double precision | salary | sal_market_fixed − actual_salary (positive = underpaid); a null takes the value from the player-season's last row that has all three of `sal_market_fixed`, `actual_salary` and `surplus_value` |

---

### wowy_ratings

Synthetic WOWY RAPM history for the Trajectories page. One row per mapped player appearance from
the 1956-57 season onward, including NBA and ABA postseason games and with no exposure minimum.

- **Primary key:** `(nba_id, game_id)`
- **Unique constraints:** `(nba_id, date)`, `(nba_id, career_game_num)`
- **Indexes:** `(nba_id, date)`, `(nba_id, career_game_num)`, `season`
- **Current unified artifact:** 1,198,710 rows; the exact player count is
  recorded in its publication manifest
- **Update strategy:** validated staging COPY followed by transactional table replacement
- **Source:** the WOWY program's certified player-game export, published by
  `nba_darko/pipeline_scripts/publish/wowy/publish_wowy_site.py` from
  `$NBA_DARKO_RUNTIME_ROOT/wowy_rapm/derived/publication/current/wowy_player_game.parquet`
  (the program was imported into `nba_darko` on 2026-09-28; its publishers live in
  `pipeline_scripts/publish/wowy/` and run from the `nba_darko` root as
  `python -m pipeline_scripts.publish.wowy.<module>`)
- **RLS:** Read-only for `anon` and `authenticated` via
  `supabase/migrations/20260710_001_add_wowy_ratings.sql`.

| Column | Postgres type | Notes |
|---|---|---|
| nba_id | bigint | Official positive NBA ID, or stable negative project ID when no NBA ID exists; zero is forbidden |
| player_name | text | Publication-owned display identity; required on unified 1957 artifacts |
| game_id | text | Canonical model game ID |
| date | date | Same-date postgame rating date |
| season | integer | NBA season ending year |
| career_game_num | integer | Sample-relative played-game number, starting at 1 |
| age | double precision | Player age on game date; nullable when the historical biography is unavailable |
| wowy_rapm | double precision | Synthetic total RAPM |
| wowy_orapm | double precision | Synthetic offensive RAPM |
| wowy_drapm | double precision | Synthetic defensive RAPM; positive is better defense |
| exposure | double precision | Model exposure at the snapshot |
| league | text | `NBA`, `ABA`, or a slash-joined within-season league label |
| cross_league_level_identified | boolean | False for ABA observations before the 1971-72 identified linkage period |

### wowy_publication

Singleton freshness and provenance row for the public WOWY table. `id` is constrained to `1`.
It records the publication ID, composite/output hashes, data-through date and season, counts, and
publication timestamp. `season_from`, `season_adjusted_from`, and
`aba_cross_league_identified_from` separately record the Daily/Final Cut floor, the unchanged
Season-Adjusted floor, and the first identified ABA-to-NBA linkage season. The Trajectories page
uses `season_through` for its freshness label.

### Active WOWY leaderboard snapshot

`get_active_wowy_player_ratings()` is a security-invoker RPC added by
`supabase/migrations/20260710_007_add_active_wowy_leaderboard_rpc.sql`. It derives the current
active roster from the latest `player_ratings` season, keeps current roster identity/team/position,
and uses a per-player latest-row lookup in `wowy_ratings` for the observed RAPM values. Active
players without a WOWY observation are omitted. The server helper fills placeholder current-team
metadata from `get_latest_player_teams()` before rendering.

`supabase/migrations/20260711_001_add_wowy_leaderboard_bio_filters.sql` also exposes two
filter-only attributes on every WOWY leaderboard row: `filter_position` and `height_inches`.
`filter_position` is normalized to one of `G`, `G-F`, `F`, `F-C`, or `C`; Current uses the current
roster classification with a player-dimension fallback. `height_inches` comes only from
`players.height` and is `NULL` unless the listed value is in the plausible 60–96-inch range.

### Historical WOWY leaderboard season averages

`supabase/migrations/20260710_011_add_wowy_season_player_averages.sql` provisions the all-era
`wowy_season_player_averages` table, one row per player-season. Its WOWY RAPM, O-RAPM, D-RAPM,
and exposure values are the **unweighted arithmetic mean** of every certified player-game
observation published for that player in the selected NBA season; they are not a single-game
snapshot and are not exposure- or minutes-weighted.

This was an intentional two-phase publication: 011 provisioned the table, the checked model
publisher loaded the averages, the context-aware `/wowy` UI was deployed, and then the manual
operation `supabase/operations/20260710_activate_wowy_season_player_averages.sql` activated them,
once, on 2026-07-10. It is a historical record now and must not be re-run: it would put back its
July definitions of the `/wowy` season RPCs, undoing `20260929_001` (and `20260929_002`), and it
refuses to run once its marker row exists. The operation owned its own transaction. The UI reads
`snapshot_context`, so it truthfully presented opening-game rows until the cutover and averages
afterward. The operation failed closed unless the average table covered every contiguous
published WOWY season from its recorded lower bound through the source maximum, and every
`(season, nba_id)` group matched the raw player-game source on row presence, game count, first
and last game dates, and unweighted RAPM/O-RAPM/D-RAPM/exposure means. It recorded that verified
cutover in the private singleton `wowy_season_average_activation` table, then redirected the
historical `/wowy` RPCs from migration 010's opening-game artifact to season averages. Keeping
this data-dependent activation outside the replayable migration chain prevents an empty or
partial table from breaking a normal migration run or later ratings-table rebuild. The
season-average publisher itself is
`python -m pipeline_scripts.publish.wowy.publish_wowy_season_player_averages --publish`, run
from the `nba_darko` root.

Historical team data comes from the BBRef game source and season-bounded team crosswalk, rather
than current DARKO team metadata. This preserves defunct and relocated franchises such as Seattle,
New Jersey, Kansas City, and Washington correctly. A traded player's `team_code` and `team_name`
are slash-joined historical display labels in chronological first-seen order, never a claim that
the average belongs to only one stint. The paired `team_codes` and `team_names` arrays preserve
each individual team for filters and provenance. The historical RPC returns no current `tm_id` or
position, preventing an old team from receiving a modern logo/link; `date` is a compatibility
alias for `last_date`, while seasonal UI should use the explicit date range and game count.

The 20260711 filter fields deliberately do not change that historical identity contract:
`filter_position` and `height_inches` are explicit player-dimension metadata for filtering only.
They are sourced from the current crosswalk, not inferred historical roster, team, or game fields;
the display `position` remains `NULL` for every historical row.

Migration 010's `wowy_season_opening_snapshots` table remains a model publication artifact. After
the guarded manual activation operation, `get_wowy_leaderboard_seasons()` and
`get_wowy_season_player_ratings(p_season)` source only the season-average table and return
`snapshot_context = 'season-average'`.

Migration `20260814_001_publish_unified_wowy_from_1957.sql` lowers only the
Daily/Final Cut and season-average/opening constraints to 1957. Season-Adjusted
and box context stay at 1978. It also embeds historical player and league
identity in each publication-owned table, permits nonzero negative IDs on WOWY
surfaces only, and keeps the incumbent 1978 publication valid before the atomic
data replacement. The model publisher
(`nba_darko/pipeline_scripts/publish/wowy/publish_unified_1957.py`) updates the
private season-average activation marker and publication coverage metadata
atomically with the public tables, so their recorded range and counts cannot lag
the data.

### All-time WOWY season leaderboard

`supabase/migrations/20260710_012_add_wowy_all_time_season_leaderboard.sql` adds
`get_wowy_all_time_player_seasons()`, an invoker-safe RPC over the activated
`wowy_season_player_averages` publication. Because 012 can run before the manual operation creates
its marker table, its narrow `is_wowy_season_average_activated()` helper first checks the catalog,
then dynamically verifies marker `id = 1`. The helper is security-definer only to keep that marker
private under RLS; the leaderboard RPC itself remains security-invoker and returns `[]` without
reading the average table until certification succeeds. The `/wowy` loader treats that empty gated
response as a temporary Current view rather than showing an empty default page.

The original zero-argument RPC returns the 100 highest raw, unweighted
player-season WOWY RAPM averages as a compatibility endpoint. Migration
`20260717_002_paginate_wowy_all_time_leaderboards.sql` adds the endpoint used
by the site: `get_wowy_all_time_player_seasons_page(...)`. It exposes every
published Average or Adjusted season through pages of at most 100 rows, with
optional possession, player, team, position, and height filters and
server-side sorting. There is no implicit minutes, exposure, recency, or
game-count cutoff. Each response includes `total_count`, `loaded_count`, and
`has_more` so the UI can load another page without truncating the all-time
universe. Migration 20260711 adds the same filter-only player-dimension fields
to the leaderboard RPCs without changing ratings or historical team
provenance.
Migration `20260927_001_speed_up_wowy_all_time_page.sql` rewrites the private
base function for speed without changing its output: each listed position is
normalized once instead of once per player-season, only keys and sort fields
pass the filter, the page is a bounded top-N sort, and full rows are built for
the returned page alone.

| Column | Postgres type | Notes |
|---|---|---|
| season, nba_id | integer, bigint | Primary key; NBA season ending year and canonical player ID |
| team_code, team_name | text | Slash-joined historical display labels in first-seen chronological order |
| team_codes, team_names | text[] | Paired individual historical team codes/names, in the same chronological order |
| first_date, last_date | date | First and last published WOWY observations included in the season average |
| season_games | integer | Number of published player-game observations in the unweighted average |
| filter_position | text | Canonical inclusive player-bio filter group: `G`, `G-F`, `F`, `F-C`, or `C`; never a historical roster claim |
| height_inches | double precision | Listed player-dimension height, exposed only when 60–96 inches |
| wowy_rapm, wowy_orapm, wowy_drapm, exposure | double precision | Certified unweighted player-season means |

---

### players

Dimension table. One row per player.

- **Primary key:** `nba_id`
- **Rows:** ~5,347
- **Update strategy:** upserted on `nba_id` every publish (`INSERT ... ON CONFLICT DO UPDATE`); a player the bundle lacks keeps his row
- **Source:** `supabase_tables/players.parq`, built from `player_master_crosswalk.csv` + latest row per player from `spm_outputs` + `rookie_season` from `nba_survivorship`
- **RLS:** Enabled by `supabase/migrations/20260529_001_lock_public_read_tables.sql`; `anon` and `authenticated` keep `SELECT` only.

| # | Column | Postgres type | Notes |
|---|---|---|---|
| 1 | nba_id | bigint | Player NBA ID |
| 2 | player_name | text | From crosswalk, fallback to spm |
| 3 | height | double precision | Inches |
| 4 | weight | double precision | Pounds |
| 5 | dob | text | Date of birth string |
| 6 | draft_year | double precision | |
| 7 | draft_slot | double precision | |
| 8 | position | text | From crosswalk |
| 9 | country | text | |
| 10 | current_team | text | Team on most recent spm date |
| 11 | active_roster | smallint | Status on most recent spm date |
| 12 | season | real | NBA season ending year for most recent spm date |
| 13 | rookie_season | double precision | First NBA season (from survivorship) |

---

### season_sim

Season simulation results. One row per team.

- **Rows:** 30
- **Update strategy:** reloaded on every publish: inside the swap, `TRUNCATE` and `INSERT` from
  its staging table, so the table keeps its definition, grants and policies. Before staging, the
  publish checks that every bundle column exists in the live table with the same type or a
  lossless widening (`smallint` to `integer` to `bigint`, `real` to `double precision`) and
  refuses otherwise, so a new column needs a migration first. Only on a database without the
  table does the publish create it from the bundle's types, with the read policy and grants.
- **Indexes:** none from the publisher
- **Source:** `calculated_data/season_sim.csv`, written by the season-simulation stage
  (`34_season_simulation_work/season_sim/`), read with `pl.read_csv` and published as it is. The
  types below are the bundle's, as Polars reads that file.
- **RLS:** Enabled by `supabase/migrations/20260529_001_lock_public_read_tables.sql`; `anon` and `authenticated` keep `SELECT` only for standings/team pages.
- **Site reads:** all forty (`select('*')`, filtered on `conference` and ordered by `Rk` for
  standings, filtered on `team_name` for team pages)

| # | Column | Type (bundle) | Notes |
|---|---|---|---|
| 1 | conference | text | "East" or "West" |
| 2 | Rk | bigint | Rank within conference |
| 3 | team_name | text | Team abbreviation |
| 4 | W | double precision | Projected wins |
| 5 | L | double precision | Projected losses |
| 6 | W/L% | double precision | Win percentage |
| 7 | SRS | double precision | Simple Rating System |
| 8 | Current | text | Current record string |
| 9 | Remain | text | Remaining record string |
| 10 | Best | text | Best-case record |
| 11 | Worst | text | Worst-case record |
| 12 | Playoffs | double precision | Playoff probability |
| 13 | Division | double precision | Division winner probability |
| 14 | seed_1 | double precision | P(1st seed) |
| 15 | seed_2 | double precision | P(2nd seed) |
| 16 | seed_3 | double precision | P(3rd seed) |
| 17 | seed_4 | double precision | P(4th seed) |
| 18 | seed_5 | double precision | P(5th seed) |
| 19 | seed_6 | double precision | P(6th seed) |
| 20 | seed_7 | double precision | P(7th seed) |
| 21 | seed_8 | double precision | P(8th seed) |
| 22 | seed_9 | double precision | P(9th seed) |
| 23 | seed_10 | double precision | P(10th seed) |
| 24 | 1-6 | double precision | P(top-6 seed, auto-playoff) |
| 25 | 7 | double precision | P(7th seed, play-in) |
| 26 | 8 | double precision | P(8th seed, play-in) |
| 27 | 9 | double precision | P(9th seed, play-in) |
| 28 | 10 | double precision | P(10th seed, play-in) |
| 29 | Out | double precision | P(missing playoffs entirely) |
| 30 | Win Conf | double precision | P(conference champion) |
| 31 | Win Finals | double precision | P(NBA champion) |
| 32 | Lottery% | double precision | P(in draft lottery) |
| 33 | Top4% | double precision | P(top-4 draft pick) |
| 34 | Pick1% | double precision | P(1st overall pick) |
| 35 | Pick2% | double precision | P(2nd overall pick) |
| 36 | Pick3% | double precision | P(3rd overall pick) |
| 37 | ExpPick | double precision | Expected draft pick position |
| 38 | Rem SOS | double precision | Remaining strength of schedule: mean opponent SRS, adjusted for home court (higher is harder) |
| 39 | Rem H | bigint | Remaining home games |
| 40 | Rem A | bigint | Remaining away games |

---

### win_distribution

Win probability distribution. One row per team per simulated win total.

- **Rows:** up to ~525 during a season (30 teams × ~17–18 win totals); 30 once every game is played
- **Update strategy:** reloaded on every publish: inside the swap, `TRUNCATE` and `INSERT` from
  its staging table, so the table keeps its definition, grants and policies. Before staging, the
  publish checks that every bundle column exists in the live table with the same type or a
  lossless widening (`smallint` to `integer` to `bigint`, `real` to `double precision`) and
  refuses otherwise, so a new column needs a migration first. Only on a database without the
  table does the publish create it from the bundle's types, with the read policy and grants.
- **Indexes:** none from the publisher
- **Source:** `calculated_data/win_distribution.parq`, written by the season-simulation stage and
  published as it is; the types below are the bundle's, as Polars reads that file.
- **RLS:** Enabled by `supabase/migrations/20260529_001_lock_public_read_tables.sql`; `anon` and `authenticated` keep `SELECT` only for team win-distribution charts.
- **Site reads:** all five (`select('*')`, filtered on `team_name`, ordered by `wins`)

| # | Column | Type (bundle) | Notes |
|---|---|---|---|
| 1 | tm_id | bigint | Team NBA ID |
| 2 | wins | bigint | Win total |
| 3 | count | integer | Simulations ending with this many wins |
| 4 | prob | double precision | Probability of finishing with this many wins |
| 5 | team_name | text | Team abbreviation |

---

### lineup_ratings

Two- to five-man lineup ratings used by the `/lineups` page and team pages. One row per lineup,
team and variant.

- **Rows:** 145,194 in the current lineup files (72,597 per variant)
- **Update strategy:** rebuilt and swapped in on every publish (`--no-full-reload lineup_ratings`
  refills the existing table instead)
- **Indexes** (`TABLE_INDEXES`): `(variant, lineup_size)`, `(min_season_poss DESC)`, `(tm_id)`
- **Source:** `build_lineup_ratings()` in `pipeline_scripts/publish/website.py`. It stacks every
  column of `external_share/lineup_elo_pi_2pass.parq` and `lineup_elo_npi_2pass.parq` (falling
  back to the files without `_2pass`), renames `Player 1` … `Player 5` to `player_1` …
  `player_5`, adds `computed_on`, and on `raw` rows fills the three `total_*` columns from the
  `*_elo_rating` ones. No pipeline stage rebuilds those files; the current ones were written on
  2026-03-26. The types below are the builder's output from them.
- **RLS:** Enabled by `supabase/migrations/20260616_001_lock_public_fact_tables.sql` and
  re-applied by every swap; `anon` and `authenticated` keep `SELECT` only.
- **Variant note:** the NPI file's rows carry `variant = 'raw'`. The site queries `pi`, `raw` and
  `npi` and puts `raw` and `npi` in its NPI bucket; team names come from `tm_id`.
- **Site reads:** 22 of the 34 columns: `LINEUP_RATING_COLUMNS` in `src/lib/server/supabase.js`
  (`variant`, `lineup_size`, `min_season_poss`, the three `total_*` ratings, the three
  `*_synergy` columns, `tm_id`, `player_1` … `player_5` and `player_1_id` … `player_5_id`), plus
  `group_key` (sort order) and `computed_on`; not `off_elo_rating`, `def_elo_rating`,
  `net_elo_rating`, the four `*_total_poss` and `*_season_poss` columns, the three `*_prior`
  columns, `expansion_mode` or `net_rating_model`

| # | Column | Postgres type | Notes |
|---|---|---|---|
| 1 | off_elo_rating | double precision | The lineup model's offensive rating; the builder copies it into `total_off_rating` on `raw` rows |
| 2 | off_total_poss | double precision | The model's effective sample behind the offensive rating |
| 3 | off_season_poss | double precision | The lineup's offensive possessions this season |
| 4 | player_1_id | bigint | First player NBA ID |
| 5 | player_2_id | bigint | Second player NBA ID |
| 6 | player_1 | text | First player display name |
| 7 | player_2 | text | Second player display name |
| 8 | def_elo_rating | double precision | The lineup model's defensive rating; copied into `total_def_rating` on `raw` rows |
| 9 | def_total_poss | double precision | The model's effective sample behind the defensive rating |
| 10 | def_season_poss | double precision | The lineup's defensive possessions this season |
| 11 | net_elo_rating | double precision | The lineup model's net rating; copied into `total_net_rating` on `raw` rows |
| 12 | min_season_poss | double precision | The smaller of `off_season_poss` and `def_season_poss`; the site filters on it |
| 13 | tm_id | bigint | Team NBA ID |
| 14 | off_synergy | double precision | Offensive rating beyond the players' prior (null on `raw` rows) |
| 15 | def_synergy | double precision | Defensive rating beyond the players' prior (null on `raw` rows) |
| 16 | net_synergy | double precision | `off_synergy + def_synergy` (null on `raw` rows) |
| 17 | off_prior | double precision | Offensive prior from the players (null on `raw` rows) |
| 18 | def_prior | double precision | Defensive prior from the players (null on `raw` rows) |
| 19 | net_prior | double precision | `off_prior + def_prior` (null on `raw` rows) |
| 20 | total_off_rating | double precision | Offensive rating shown as Off +/-: prior plus synergy on `pi` rows, `off_elo_rating` on `raw` rows |
| 21 | total_def_rating | double precision | Defensive rating shown as Def +/-: prior plus synergy on `pi` rows, `def_elo_rating` on `raw` rows |
| 22 | total_net_rating | double precision | Net rating shown as Net +/-: prior plus synergy on `pi` rows, `net_elo_rating` on `raw` rows |
| 23 | group_key | text | Player IDs joined with `|`; a tie-breaker in the site's page order |
| 24 | lineup_size | bigint | Players in the lineup, 2 to 5 |
| 25 | variant | text | `pi` (prior-informed) or `raw` (the NPI file's rows) |
| 26 | expansion_mode | text | `2pass` or `cross`: how the model expanded lineup groups |
| 27 | net_rating_model | text | The net-rating method (`heuristic_2pass` or `joint_cross`) |
| 28 | player_3 | text | Third player display name (null below three players) |
| 29 | player_3_id | bigint | Third player NBA ID (null below three players) |
| 30 | player_4 | text | Fourth player display name (null below four players) |
| 31 | player_4_id | bigint | Fourth player NBA ID (null below four players) |
| 32 | player_5 | text | Fifth player display name (null below five players) |
| 33 | player_5_id | bigint | Fifth player NBA ID (null below five players) |
| 34 | computed_on | date | The day the newer lineup file was written; the files carry no dates |

---

### season_calendar

First game, first team finale, last regular-season game and last game of every season. Built by
`build_season_calendar()` in `pipeline_scripts/publish/website.py`; rebuilt and swapped in on
every publish. Read by `src/lib/server/history.js` for the Time Machine and Rewind.

- **Unique index:** `(season)`
- **Columns:** `season`, `first_game`, `earliest_team_finale` (the first date any team played its
  last regular-season game), `regular_season_end`, `last_game`
- **Site reads:** all five

### rating_frames

The weekly top 20 players by DPM in every regular season since 1996-97, each at his latest
rating as of the frame date. Frames fall on every seventh day of the regular season and on its
last day; a player needs three games that season and a game in the 28 days before the frame.
Built by `build_rating_frames()` in `pipeline_scripts/publish/website.py`; rebuilt and swapped
in on every publish. Read by `src/lib/server/history.js` for Rewind.

- **Unique index:** `(frame_date, rank)`; index on `season`
- **Columns:** `frame_date`, `season`, `rank`, `nba_id`, `player_name`, `tm_id`, `team_name`,
  `dpm`, `o_dpm`, `d_dpm`, `games` (games played that season through the frame)
- **Site reads:** all eleven

### player_comps

Up to 25 historical comps for every current player, closest first, each comp at its
closest season with five finished seasons of futures. Built by `build_player_comps()` in
`pipeline_scripts/publish/website_comps.py`, called by `build_comps_table()` in
`pipeline_scripts/publish/website.py`; rebuilt and swapped in on every publish. Read by
`src/lib/server/comps.js` for player pages and Echoes.

- **Unique index:** `(nba_id, rank)`; index on `comp_id`
- **Columns:** `nba_id`, `season`, `as_of`, `age`, `dpm`, `rank`, `comp_id`, `comp_name`,
  `comp_season`, `comp_age`, `comp_dpm`, `comp_o_dpm`, `comp_d_dpm`, `similarity`, `weight`,
  `dpm_next_1` … `dpm_next_5`
- **Site reads:** all twenty (player pages filter on `nba_id`; Echoes read `nba_id`, `rank`,
  `comp_season` and `similarity` filtered on `comp_id`)

### player_seasons

Every player-season since 1996-97 at its last game day, with regular-season games and minutes,
playoff games, and where its DPM ranks among all seasons at the same whole-year age. Built by
`build_player_seasons()` in `pipeline_scripts/publish/website_daily.py`; rebuilt and swapped in
on every publish. Read by `src/lib/server/daily.js` for The Daily and player-page season
tables.

- **Unique index:** `(nba_id, season)`; index on `(season, age_rank)`
- **Columns:** `nba_id`, `season`, `player_name`, `date`, `tm_id`, `age`, `dpm`, `o_dpm`,
  `d_dpm`, `games` (regular season), `minutes` (regular season), `playoff_games`, `age_rank`,
  `age_count` (both null for a season with fewer than 20 regular-season games or no age)
- **Site reads:** all fourteen

### game_updates

Every game of the latest season each player played, with the rating going into it and coming
out. Built by `build_game_updates()` in `pipeline_scripts/publish/website_daily.py`; rebuilt
and swapped in on every publish. Read by `src/lib/server/daily.js` for The Daily's biggest
updates and its sparklines (also served by `/api/daily/watch`).

- **Unique index:** `(nba_id, date)`; index on `date`
- **Columns:** `nba_id`, `player_name`, `date`, `season`, `player_game`, `game_type`, `tm_id`,
  `opp_id`, `minutes`, `dpm_before`, `o_before`, `d_before`, `dpm_after`, `o_after`,
  `d_after`, `dpm_update`, `o_update`, `d_update`, `abs_update`
- **Site reads:** `nba_id`, `player_name`, `date`, `game_type`, `tm_id`, `opp_id`, `minutes`,
  `dpm_before`, `o_before`, `dpm_after`, `dpm_update`, `o_update`, `d_update`, `abs_update`;
  not `season`, `player_game`, `d_before`, `o_after` or `d_after`

### rating_moves

Each player's rating change into the latest published date over 7 days, 30 days and since the
season began (`period` `'7'`, `'30'` or `'season'`), with the games played in between; a player
with no game in a window is left out of it. Built by `build_rating_moves()` in
`pipeline_scripts/publish/website_daily.py`; rebuilt and swapped in on every publish. Read by
`src/lib/server/daily.js` for The Daily and `/api/daily/watch`.

- **Unique index:** `(period, nba_id)`
- **Columns:** `period`, `start_date`, `end_date`, `nba_id`, `player_name`, `tm_id`, `games`,
  `dpm_from`, `o_from`, `dpm_to`, `o_to`, `delta`, `o_delta`
- **Site reads:** all thirteen

Each **Columns** list above is its builder's exact output, in order; the builder in nba_darko
(`pipeline_scripts/publish/website.py`, formerly `1_historic_darko/push_website.py`, and its
helpers) and its test in `tests/test_website*.py` are the source of truth, and
`TABLE_INDEXES` in `website.py` defines the indexes. **Site reads** names the
columns the site selects or filters on. The builders compute `seconds_played`, `last_played`
and `age_year` along the way but publish none of them.

## SvelteKit Data Access Layer

All Supabase queries go through `src/lib/server/supabase.js`. Key patterns:

### Public table access and RLS

The Supabase Security Advisor check `rls_disabled_in_public` flagged `public.season_sim`, `public.win_distribution`, and `public.players` on 2026-05-29, then `public.player_ratings` and `public.lineup_ratings` on 2026-06-16. The site intentionally exposes these analytics tables for reads through the anon Supabase client, but public clients should not be able to insert, update, delete, or truncate them.

`supabase/migrations/20260529_001_lock_public_read_tables.sql`, `supabase/migrations/20260616_001_lock_public_fact_tables.sql`, and `supabase/migrations/20260710_001_add_wowy_ratings.sql` enable RLS on those tables, recreate stable public-read `SELECT` policies, revoke all table privileges from `public`, `anon`, and `authenticated`, then grant `SELECT` back only to `anon` and `authenticated`. Data upload/reload jobs should continue to use `service_role` or the direct Postgres maintenance connection.

Elo voting remains the only write path. `supabase/migrations/20260617_001_restore_service_role_elo_vote_path.sql` keeps `elo_ratings` and `elo_votes` readable to public clients, revokes public execution of `record_elo_vote`, and leaves vote writes to the SvelteKit `/api/rate/vote` wrapper using `SUPABASE_SERVICE_ROLE_KEY`.

### RATING_COLUMNS

Comma-joined string of 70 of the 76 `player_ratings` columns, selected by the per-player history reads (`getPlayerHistory()`, and `getFullPlayerHistory()` by default). It leaves out `opp_id` (the player-profile history selects it through `PLAYER_PROFILE_RATING_COLUMNS`) and five salary columns no page displays: `game_value`, `wins_pg`, `sal_poolshare`, `sal_vetfloor` and `sal_market`. If you add a column to the DB, add it here (or to the narrower lists) or those reads won't fetch it; the whole-row RPCs return it regardless.

### Core data functions

| Function | Queries | Returns | Used by |
|---|---|---|---|
| `getActivePlayers()` | Finds the latest `player_ratings.season` and calls `get_active_player_ratings(p_season)`, which returns each `active_roster = 1` player's latest row in that season, whole (`pr.*`). This includes `future_game = 1` projection rows, which are the current DARKO snapshot. Merges with current-season `players` dimension via `mergeWithPlayerDim` (`...row` spread — all columns pass through). | Array of full player-rating objects | Leaderboard, longevity, player index, everywhere |
| `getActiveWowyPlayers()` | Calls `get_active_wowy_player_ratings()`, normalizes team IDs/display positions plus explicit bio filter fields, and caches the compact current-active snapshot for five minutes. | One current-identity row per active player with a latest observed WOWY RAPM row, canonical filter position, and plausible listed height | `/wowy` |
| `getWowyAllTimePlayers()` | Calls `get_wowy_all_time_player_seasons()`, preserves its database-owned deterministic top-100 order for one hour, and does not cache an empty pre-activation response. | At most 100 all-time player-season rows with unweighted WOWY averages, ordinal rank, season, historical teams, and explicit bio filter fields | `/wowy` default |
| `getWowyLeaderboardSeasons()` | Calls `get_wowy_leaderboard_seasons()` and caches the season list for one hour. | All published historical season end years (1978 onward) | `/wowy` |
| `getWowySeasonPlayers(season)` | Calls `get_wowy_season_player_ratings(p_season)`, preserves chronological historical team arrays, and caches the selected season for five minutes. | One player-season row with unweighted WOWY means, historical teams, date range, game count, and explicit bio filter fields | `/wowy?season=YYYY` |
| `getPlayersIndex()` | `players` with explicit `PLAYERS_DIM_COLUMNS`, merged with `getActivePlayers()`. **Hardcodes output fields** — does NOT pass through survivorship, projections, or RAPM columns. | Array of player objects (subset of fields) | Player search/index pages |
| `getLongevityRows()` | Calls `getActivePlayers()`, maps DB columns to frontend-aliased keys | Array with aliased longevity fields | `/api/longevity` |
| `getLongevityTrajectory(id)` | `player_ratings` filtered to one player, maps to chart fields | Array of trajectory points | `/api/player/[id]/longevity` |
| `getWowyPlayerHistory(id)` | Paginates `wowy_ratings` in 1,000-row ranges, orders by `career_game_num`, and merges player metadata | `{ rows, truncated, maxRows }` | `/api/player/[id]/wowy-history`, Trajectories |
| `getWowyPublication()` | Reads singleton `wowy_publication` row | Publication freshness/provenance | `/api/wowy-publication`, Trajectories |
| `getLineupRatings({ lineupSize, minPoss })` | `lineup_ratings` with explicit projection for one lineup size above its possession cutoff (default 5-man, `min_season_poss > 100`), variants in `('pi', 'raw', 'npi')`. Fetches its 1,000-row pages in parallel, ordered by `min_season_poss` with `variant`, `group_key` and `tm_id` tie-breakers so no page repeats or skips a row. Resolves team names from `tm_id`, drops rows missing `total_*_rating`, and normalizes `raw` + `npi` into the NPI bucket. | `{ pi: LineupRow[], npi: LineupRow[] }` | `/lineups`, team pages |
| `getLineupSizeCounts()` | Row counts (`count: 'exact', head: true`) of PI and NPI lineups for each lineup size above its cutoff, so `/lineups` loads only the selected size's rows. | `{ [size]: { pi, npi } }` | `/lineups` size tabs |
| `getConferenceStandings()` / `getTeamSimulation()` | `season_sim` with public read-only RLS. Conference standings filter by `conference`; team pages filter by `team_name`. | Standings/team simulation rows | `/standings`, team pages |
| `getTeamWinDistribution()` | `win_distribution` with public read-only RLS, filtered by `team_name` and ordered by `wins`. | Team win-distribution rows | Team pages |

### Helper functions

**`firstFiniteNumber(...values)`** — Tries each argument in order, returns the first that parses to a finite number via `parseFloat`. Returns `null` if none are finite. Used for calibrated-then-raw fallback chains (e.g. `x_retirement_age_cal` → `x_retirement_age`).

**`normalizeProbability(value)`** — Parses to float. If ≤1, multiplies by 100 (converts [0,1] → percentage). If >1, returns as-is. Returns `null` if not finite. Since `s1`–`s15` are stored as probabilities in [0,1], frontend `p1`–`p15` values are percentages (0–100).

### Column name mapping (DB → frontend)

The longevity page uses aliased field names. The mapping happens in `getLongevityRows()`:

| DB column (player_ratings) | Frontend key | Transformation |
|---|---|---|
| x_retirement_age_cal (fallback: x_retirement_age) | est_retirement_age | `firstFiniteNumber()` picks first non-null |
| projected_years_remaining_cal (fallback: projected_years_remaining) | years_remaining | `firstFiniteNumber()` picks first non-null |
| none (`player_seasons.games`) | career_games | Regular-season games: the sum of `player_seasons.games` over the player's seasons (since 1996-97), read by `getCareerGames()` in `src/lib/server/daily.js` and summed by `careerGames()` in `src/lib/utils/playerProfile.js`; `/api/longevity` passes `getCareerGames` in as `loadGames`. `0` for a player with no `player_seasons` row; `null` when `getLongevityRows()` is called without `loadGames`, when `player_seasons` is not published, or when the read fails. Not `career_game_num`, which counts model rows, not games |
| s1–s15 | p1–p15 | `normalizeProbability()` converts [0,1] → percentage |

**Important:** `getPlayersIndex()` does NOT pass through survivorship or projection columns. It hardcodes a specific field list (DPM, position, shooting trends, minutes). If you need survivorship data on a page that uses `getPlayersIndex()`, you must either add the fields explicitly or use `getActivePlayers()` directly.

### Caching

All data functions use `runCached(key, maxAgeMs, loader)` with in-memory store. Cache clears on server restart / Vercel redeploy. The publisher calls the Vercel deploy hook after every publish (see [Pipeline publisher](#pipeline-publisher)). **After any other change to Supabase data, redeploy to Vercel to see it immediately** (otherwise wait for TTL expiry).

| Cache key | TTL |
|---|---|
| activePlayers | 60s |
| playersIndex | 5min |
| longevityRows | 5min |
| longevityTrajectory | 10min |
| lineupRatings | 1h |
| lineupSizeCounts | 1h |
| playerCurrent | 60s |
| playerHistory | 5min |
| activeWowyPlayers | 5min |
| wowyLeaderboardSeasons | 1h |
| wowySeasonPlayers | 5min |
| wowyPlayerHistory | 30min |
| wowyPublication | 5min |

### API routes

| Route | Data function | Notes |
|---|---|---|
| `/api/longevity` | `getLongevityRows({ activeOnly: true })` | Main longevity table |
| `/api/player/[id]/longevity` | `getLongevityTrajectory(nbaId)` | Single player trajectory chart. Queries `player_ratings` for all rows for one player, keeps the **last** row per season (latest date), maps `x_retirement_age_cal` (fallback `x_retirement_age`) → `projected_retirement_age` (rounded to 1 decimal). Output: `[{ season_start, season_start_year, projected_retirement_age }]` |
| `/api/player/[id]/wowy-history` | `getWowyPlayerHistory(nbaId)` | Complete chronological synthetic WOWY history; fails rather than truncating at the 3,000-row safety cap |
| `/api/wowy-publication` | `getWowyPublication()` | Current public WOWY hashes, counts, and data-through metadata |

### Data limits and fetch policy

| Area | Current behavior | Cap | Notes |
|---|---|---:|---|
| Player history API (`/api/player/[id]/history`) | `limit` defaults to `1000`; bounded to max `2000`; `full=1` enables full history path | 2000 (bounded) | Full history path is explicit and uses paginated fetch through `getFullPlayerHistory(...)`. |
| WOWY history API (`/api/player/[id]/wowy-history`) | Always returns the complete server-assembled career; Supabase pagination stays internal | 3000 | Verified launch maximum is 1,923 rows; truncation is an error. |
| Profile page (`/player/[nbaId]`) | Uses `apiPlayerHistory(..., { full: true })` | none (explicit opt-in path) | Profile now opts into full history by design. |
| Compare page history (`/compare`) | Calls `apiPlayerHistory(..., { limit: 300 })` | 300 | Preview mode kept for responsiveness. |
| Player card history (`PlayerCard`) | Calls `apiPlayerHistory(..., { limit: 200 })` | 200 | Small sparkline-focused view, intentionally bounded. |
| Search endpoint (`/api/search-players`) | Returns 15 matches after name filter | 15 | Endpoint hard cap for payload size. |
| Search UI suggestions | Player search lists show up to 8 entries | 8 | UX limit to keep dropdown concise. |
| Compare players | UI max 4 players | 4 | Hard cap in selection guard and URL params. |
| Career trajectory page (`/trajectories`) | `MAX_PLAYERS` constraint | 5 | Multi-player chart stays bounded for readability/perf. |

Safe pattern now:
- Default paths stay capped to avoid unbounded payloads and keep response/render budgets stable.
- Explicit full-history usage is only enabled by `full=1` in the API client (`apiPlayerHistory(id, { full: true })`).

Deferred shifts to evaluate:
- Add cursor pagination for player history instead of all-or-bounded fetch.
- Centralize history caps in one configuration constant to avoid duplicated magic numbers.
- Move player-card and compare history caps behind explicit view modes (`preview` vs full-detail).

---

## Pipeline publisher

Every table documented above except the WOWY tables is published by one script in the
`nba_darko` repository, outside `darko-site/`: `pipeline_scripts/publish/website.py` (formerly
`1_historic_darko/push_website.py`, which the Part A pipeline branch still uses; that copy has
no writer guard on the build or the publish and gives a table it creates no row-level security,
and otherwise behaves the same). It is the source of truth for those tables' data, columns and indexes.
`pipeline_scripts/run_all.py` runs it as the `push-website` stage, in two actions: a build
(`--skip-upload`) and a publish (`--skip-build`). Run by hand from the `nba_darko` root,
`python pipeline_scripts/publish/website.py` does both.

### Build

`build_supabase_tables()` reads the runtime root (`--runtime-root`, default
`NBA_DARKO_RUNTIME_ROOT`) and writes the release bundle to `supabase_tables/`:

- `player_ratings`: the six-source join described under [player_ratings](#player_ratings),
  checked for duplicate `(nba_id, date)` keys and for the base table's row count;
- `players`: `player_master_crosswalk.csv`, each player's latest `spm_outputs` row, and
  `rookie_season` from `nba_survivorship`;
- `lineup_ratings` from the PI and NPI lineup Elo files in `external_share/`;
- `season_calendar`, `rating_frames`, `player_comps`, `player_seasons`, `game_updates` and
  `rating_moves`, by the builders named in their sections above.

`season_sim` and `win_distribution` are published from `calculated_data/` as they are. A
manifest (`supabase_tables/player_ratings.manifest.json`) seals the bundle with the hashes of
its sources, builder code and outputs, and the publish refuses a bundle that changed after it
was read.

**A build into a shared runtime needs the writer.** From the pipeline import branch
(`codex/wowy-import-20260928-v1`) on, a build-only run (`--skip-upload`) takes the writer's
scope (`build_write_scope()`) whenever `<runtime-root>/supabase_tables` lies in a shared runtime,
by the rule of `shared_runtime_containing()` in `pipeline_scripts/lib/shared_runtime.py`: the
path is at or below `NBA_DARKO_RUNTIME_ROOT` (exported, or loaded from the runner's `.env`), or
it or an ancestor directory holds a `WRITER.txt` marker. Under `run_all.py` the `push-website`
build action verifies the runner's inherited lock; run by hand, the build needs the same writer
authorization as a publish (step 1 below) and holds the full-run lock, so on a machine that is
not the writer it is refused before anything is built. A build into a runtime root outside
every shared runtime needs no writer. The Part A pipeline branch's
`1_historic_darko/push_website.py` has no build guard.

### Publish

1. **Writer guard.** The publish runs inside the pipeline's single-writer scope
   (`pipeline_scripts/lib/writer_guard.py`) and fails before connecting when this Mac is not the
   writer. Under `run_all.py` it verifies the runner's inherited full-run lock; run by hand it
   requires `NBA_DARKO_WRITE_ENABLED=1` and an `NBA_DARKO_MACHINE_ID` that matches `WRITER.txt`
   in the runtime root, and holds the full-run lock until it finishes. A build-only run
   (`--skip-upload`) takes the same scope when it writes into a shared runtime; see
   [Build](#build).
2. **Connection.** `SUPABASE_PG_DSN` is required. The session sets a 10-minute
   `statement_timeout` and a 5-minute `idle_in_transaction_session_timeout`, so a stalled
   upload rolls back instead of holding locks.
3. **Changed days of `player_ratings`.** Each publication records the SHA-256 of every day of
   `player_ratings` (of the exact CSV it uploads for that date) in `player_ratings_days`, and
   the table's columns, rows and days in `website_publication`. Both tables are private:
   row-level security on and no grants to `anon` or `authenticated`. The next publication
   uploads only the days whose fingerprint changed and, in the swap, deletes those dates (and
   any that left the bundle) and inserts the new rows: row locks only, so readers never wait.
   It rebuilds the whole table instead when `--full-player-ratings` is passed, nothing is
   published yet, no fingerprints are recorded, the fingerprint method or the columns changed,
   the live rows no longer match their fingerprints, or more than a quarter of the rows changed.
4. **Staging.** Each table is uploaded first into `<table>__next`, which has row-level security
   on and no grants to `anon` or `authenticated`, so the site cannot read it; the published
   tables stay unlocked meanwhile. Rows go in by `COPY ... FROM STDIN` in CSV chunks of 10,000
   rows (`--copy-chunksize`), over up to 8 connections for large tables (`--copy-workers`). A
   table that will be replaced gets its keys and indexes (`TABLE_INDEXES`) and `ANALYZE` while
   still staged.
5. **Swap.** One short transaction (`lock_timeout` 3 s; up to five attempts 15 s apart while
   readers hold the tables) first does the row-lock work (the `players` upsert,
   `player_ratings`' changed days and their fingerprints), then locks every table it replaces or
   refills in one `LOCK TABLE ... IN ACCESS EXCLUSIVE MODE`, then publishes each table:

   | Table | Mode | In the swap |
   |---|---|---|
   | `player_ratings` when rebuilt, `lineup_ratings`, `season_calendar`, `rating_frames`, `player_comps`, `player_seasons`, `game_updates`, `rating_moves` | replace | plain `DROP TABLE` of the published table (no `CASCADE`), `ALTER TABLE <table>__next RENAME TO <table>`, indexes renamed, then row-level security enabled, policy `allow_public_read` (`SELECT` to `anon`, `authenticated`) recreated, `REVOKE ALL` from `PUBLIC`, `anon`, `authenticated`, and `GRANT SELECT` to `anon`, `authenticated` |
   | `player_ratings` otherwise | changed days | `DELETE` the changed and removed dates, `INSERT` the staged rows |
   | `players` | upsert | `INSERT ... ON CONFLICT (nba_id) DO UPDATE`; rows the bundle lacks stay |
   | `season_sim`, `win_distribution` | reload | `TRUNCATE` and `INSERT`; the table keeps its definition, policies and grants |
   | a table that does not exist yet | create | `CREATE TABLE` and `COPY` (and `players`' primary key), then the same row-level security, policy and grants as a replaced table |

   It then checks that `player_ratings` holds exactly the bundle's rows over its fingerprinted
   days, records the publication in `website_publication`, and issues
   `NOTIFY pgrst, 'reload schema'`, which PostgREST receives on commit and which makes it see
   the new relations. Any failure, including a `DROP TABLE` blocked by a dependent object
   (see Ownership under [Architecture](#architecture)), rolls the whole swap back: the old
   tables keep serving and the staging tables are dropped.
6. **Verification.** It prints every published table's row count, the latest date, and the top
   five players by DPM and PI five-man lineups.
7. **Site refresh.** After the publication commits, `refresh_site_cache()`
   (`pipeline_scripts/publish/site_refresh.py`) POSTs the Vercel deploy hook in
   `DARKO_SITE_DEPLOY_HOOK`; the redeploy starts the site with an empty in-memory cache.
   Without the hook, or if the call fails, the publication stands and pages refresh as their
   caches expire.

The publisher never creates, replaces or drops a Postgres function; see Ownership above.

### WOWY publishers

The WOWY tables (`wowy_ratings`, `wowy_publication`, `wowy_season_opening_snapshots`,
`wowy_season_player_averages` and their siblings) are not touched by `website.py`. The WOWY
RAPM program (formerly the separate `33_wowy_rapm` checkout, GitHub `kmedved/wowy-rapm`) was
imported into `nba_darko` as `pipeline_scripts/wowy_rapm/` on 2026-09-28. Its publishers live
in `pipeline_scripts/publish/wowy/` and run from the `nba_darko` root as
`python -m pipeline_scripts.publish.wowy.<module>`.
`pipeline_scripts/publish/wowy/publish_wowy_site.py` independently validates the certified
WOWY manifest, COPY-loads a temporary staging table, verifies keys, counts and date coverage,
and in one transaction replaces the rows of `wowy_ratings` (`TRUNCATE` and `INSERT`) and
upserts the `wowy_publication` row. It never drops a table, so indexes, grants, constraints and
row-level security on the WOWY tables survive publication.

`pipeline_scripts/wowy_rapm/scripts/export_wowy_season_opening_snapshots.py` builds the
matching all-era opening-game artifact from the certified player-game publication plus BBRef
historical team data. `pipeline_scripts/publish/wowy/publish_wowy_season_opening_snapshots.py`
validates season coverage, team context, keys, and RAPM decomposition before atomically
replacing the rows of `wowy_season_opening_snapshots`.

---

## Pipeline Freshness Requirements

**All source parquet files must cover the same date range.** The build (`build_supabase_tables()` in `website.py`) left-joins everything onto `spm_outputs` by `(nba_id, date)`. If any source file lags behind, those columns will be null for all dates beyond that file's max date.

`getActivePlayers()` always returns the most recent active-roster row per player in the latest season, including `future_game = 1` projection rows. If that row has null survivorship/projections/RAPM because the source file was stale at build time, the entire column appears empty on the site — even though older rows in the DB have the data.

The homepage's historical leaderboard uses `get_season_start_player_ratings(p_season)`. It takes the first game date for each team in the selected season and returns the roster rows from those opening games, so a selected `2013` snapshot represents the start of 2012-13 rather than players who joined later that year. `get_leaderboard_seasons()` returns the available season-ending years for that selector.

**Debugging null columns on the site:**
1. Check max dates of all source parquet files — they should match `spm_outputs`
2. If a file is stale, re-run the pipeline stage that writes it (`pipeline_scripts/run_all.py`; `pipeline_scripts/manifest.py` lists each stage's outputs)
3. Rebuild the bundle without publishing and check the `coverage` line it prints: from the `nba_darko` root, `python pipeline_scripts/publish/website.py --skip-upload`. On the writer Mac that writes the shared runtime's `supabase_tables/` under the writer guard. From the pipeline import branch on, any other machine is refused a build into the shared runtime (see [Build](#build)), so there pass `--runtime-root` a scratch runtime root outside `NBA_DARKO_RUNTIME_ROOT`, with no `WRITER.txt` in it or any directory above it, holding copies of the files the build reads from `calculated_data/`, `fixed_data/crosswalks/` and `external_share/`
4. Publish on the writer Mac: `python pipeline_scripts/publish/website.py` builds and publishes, `--skip-build` publishes a bundle already built into its runtime, or leave it to the next `run_all.py`
5. The publish calls the Vercel deploy hook; without one, redeploy on Vercel (or restart the dev server) to clear the in-memory cache
