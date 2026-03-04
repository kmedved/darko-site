# DARKO Supabase Schema Reference

Reference for the Supabase (Postgres) tables powering darko-site. Use this when debugging data issues, adding columns, or modifying API routes.

## Architecture

```
Python pipeline (local)
  → parquet files (calculated_data/, calculated_data/temp/)
  → build_supabase_tables.py joins them into supabase_tables/*.parq
  → upload_to_supabase.py loads to Postgres via COPY

SvelteKit (darko-site/, deployed on Vercel)
  → queries Supabase via PostgREST (supabase-js client)
  → src/lib/server/supabase.js — all DB access, caching, field mapping
  → API routes in src/routes/api/ serve JSON to frontend components
```

---

## Tables

### player_ratings

Core fact table. One row per player per game-date.

- **Primary key:** `(nba_id, date)`
- **Indexes:** `date DESC`, `season`, `nba_id`
- **Rows:** ~1,089,000
- **Update strategy:** DELETE current season + INSERT current season (atomic transaction). Historical seasons are only re-uploaded if the table is dropped.

Built by `build_supabase_tables.py` which left-joins six source files on `(nba_id, date)`:

| Source parquet | Join type | Columns contributed |
|---|---|---|
| `temp/spm_outputs.parq` | base table | nba_id, date, season, team_name, tm_id, future_game, active_roster, available, poss, dpm/o_dpm/d_dpm, box_dpm/box_odpm/box_ddpm, on_off_dpm/on_off_odpm/on_off_ddpm |
| `5_assembled_features.parq` | left join | age, career_game_num, seconds_played, position, position_num, x_position |
| `bayes_rapm_ratings.parq` | left join (semi-join filtered) | bayes_rapm_off, bayes_rapm_def, bayes_rapm_total, rapm_exposure |
| `talent_game_predictions.parq` | left join | x_minutes, x_pace, x_{stat}_100 columns, x_{pct} columns, tr_minutes, tr_starter, tr_fg3_pct, tr_ft_pct |
| `temp/nba_survivorship.parq` | left join | projected_years_remaining, projected_years_remaining_cal, x_retirement_age, x_retirement_age_cal, s1–s15 |
| `dpm_salary.parq` | left join | game_value, wins_pg, warp, sal_market_fixed, actual_salary, surplus_value |

**All 72 columns (exact Postgres types):**

| # | Column | Postgres type | Source | Notes |
|---|---|---|---|---|
| 1 | nba_id | bigint | spm | Player NBA ID |
| 2 | date | timestamp without time zone | spm | Game date |
| 3 | season | real | spm | e.g. 2026.0 |
| 4 | team_name | text | spm | Team abbreviation |
| 5 | tm_id | bigint | spm | Team NBA ID |
| 6 | future_game | integer | spm | 1 = projected future game |
| 7 | active_roster | smallint | spm | 1 = on active roster |
| 8 | available | real | spm | Availability probability [0,1] |
| 9 | poss | real | spm | Possessions played |
| 10 | dpm | real | spm | Full DPM (o_dpm + d_dpm) |
| 11 | o_dpm | real | spm | Offensive DPM |
| 12 | d_dpm | real | spm | Defensive DPM |
| 13 | box_dpm | real | spm | Box-score DPM |
| 14 | box_odpm | real | spm | Box-score offensive DPM |
| 15 | box_ddpm | real | spm | Box-score defensive DPM |
| 16 | on_off_dpm | real | spm | On/off DPM |
| 17 | on_off_odpm | real | spm | On/off offensive DPM |
| 18 | on_off_ddpm | real | spm | On/off defensive DPM |
| 19 | age | double precision | bio | Player age at game date |
| 20 | career_game_num | bigint | bio | Career game count |
| 21 | seconds_played | double precision | bio | Seconds played in game |
| 22 | position | text | bio | Position label |
| 23 | position_num | double precision | bio | Numeric position (1–5 continuous) |
| 24 | x_position | text | bio | Model-predicted position |
| 25 | bayes_rapm_off | real | rapm | Bayesian RAPM offensive (pts/100 poss above avg) |
| 26 | bayes_rapm_def | real | rapm | Bayesian RAPM defensive |
| 27 | bayes_rapm_total | real | rapm | Bayesian RAPM total |
| 28 | rapm_exposure | real | rapm | Exponentially-weighted accumulated possessions |
| 29 | x_minutes | real | projections | Projected minutes per game |
| 30 | x_pace | real | projections | Projected pace |
| 31 | x_pts_100 | real | projections | Projected pts/100 poss |
| 32 | x_ast_100 | real | projections | Projected ast/100 poss |
| 33 | x_orb_100 | real | projections | Projected orb/100 poss |
| 34 | x_drb_100 | real | projections | Projected drb/100 poss |
| 35 | x_stl_100 | real | projections | Projected stl/100 poss |
| 36 | x_blk_100 | real | projections | Projected blk/100 poss |
| 37 | x_tov_100 | real | projections | Projected tov/100 poss |
| 38 | x_fga_100 | real | projections | Projected fga/100 poss |
| 39 | x_fg3a_100 | real | projections | Projected fg3a/100 poss |
| 40 | x_fta_100 | real | projections | Projected fta/100 poss |
| 41 | x_fg_pct | real | projections | Projected FG% |
| 42 | x_fg3_pct | real | projections | Projected 3P% |
| 43 | x_ft_pct | real | projections | Projected FT% |
| 44 | tr_minutes | real | projections | Time-decayed running avg minutes |
| 45 | tr_starter | real | projections | Time-decayed starter probability |
| 46 | tr_fg3_pct | real | projections | Time-decayed 3P% |
| 47 | tr_ft_pct | real | projections | Time-decayed FT% |
| 48 | projected_years_remaining | real | survivorship | Coherent expected years = sum(S(t)), curve-calibrated |
| 49 | projected_years_remaining_cal | real | survivorship | Presentation-calibrated expected years (non-coherent, better per age cohort) |
| 50 | x_retirement_age | double precision | survivorship | age + projected_years_remaining |
| 51 | x_retirement_age_cal | double precision | survivorship | age + projected_years_remaining_cal |
| 52 | s1 | real | survivorship | P(plays ≥1 more season) |
| 53 | s2 | real | survivorship | P(plays ≥2 more seasons) |
| 54 | s3 | real | survivorship | P(plays ≥3 more seasons) |
| 55 | s4 | real | survivorship | P(plays ≥4 more seasons) |
| 56 | s5 | real | survivorship | P(plays ≥5 more seasons) |
| 57 | s6 | real | survivorship | P(plays ≥6 more seasons) |
| 58 | s7 | real | survivorship | P(plays ≥7 more seasons) |
| 59 | s8 | real | survivorship | P(plays ≥8 more seasons) |
| 60 | s9 | real | survivorship | P(plays ≥9 more seasons) |
| 61 | s10 | real | survivorship | P(plays ≥10 more seasons) |
| 62 | s11 | real | survivorship | P(plays ≥11 more seasons) |
| 63 | s12 | real | survivorship | P(plays ≥12 more seasons) |
| 64 | s13 | real | survivorship | P(plays ≥13 more seasons) |
| 65 | s14 | real | survivorship | P(plays ≥14 more seasons) |
| 66 | s15 | real | survivorship | P(plays ≥15 more seasons) |
| 67 | game_value | double precision | salary | Per-game dollar value based on DPM and minutes |
| 68 | wins_pg | double precision | salary | Wins produced per game |
| 69 | warp | double precision | salary | Wins above replacement player |
| 70 | sal_market_fixed | double precision | salary | Fair market salary estimate (dollars) |
| 71 | actual_salary | double precision | salary | Actual contract salary (dollars) |
| 72 | surplus_value | double precision | salary | sal_market_fixed − actual_salary (positive = underpaid) |

---

### players

Dimension table. One row per player.

- **Primary key:** `nba_id`
- **Rows:** ~5,347
- **Update strategy:** TRUNCATE + reload every run
- **Source:** `supabase_tables/players.parq`, built from `player_master_crosswalk.csv` + latest row per player from `spm_outputs` + `rookie_season` from `nba_survivorship`

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
| 12 | season | real | Season of most recent spm date |
| 13 | rookie_season | double precision | First NBA season (from survivorship) |

---

### season_sim

Season simulation results. One row per team.

- **Rows:** 30
- **Update strategy:** TRUNCATE + reload every run
- **Source:** `calculated_data/season_sim.csv`

| # | Column | Postgres type | Notes |
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

---

### win_distribution

Win probability distribution. One row per team per win count.

- **Rows:** ~525 (30 teams × ~17–18 win buckets)
- **Update strategy:** TRUNCATE + reload every run
- **Source:** `calculated_data/win_distribution.parq`

| # | Column | Postgres type | Notes |
|---|---|---|---|
| 1 | tm_id | integer | Team NBA ID |
| 2 | wins | bigint | Win count |
| 3 | count | integer | Simulation count for this bucket |
| 4 | prob | double precision | Probability of finishing with this many wins |
| 5 | team_name | text | Team abbreviation |

---

## SvelteKit Data Access Layer

All Supabase queries go through `src/lib/server/supabase.js`. Key patterns:

### RATING_COLUMNS

Comma-joined string of all 68 fetched `player_ratings` column names (66 original + `sal_market_fixed`, `surplus_value`), used by `getActivePlayers()` in `.select(RATING_COLUMNS)`. If you add a column to the DB, you must also add it here or it won't be fetched. Note: 4 salary columns (`game_value`, `wins_pg`, `warp`, `actual_salary`) exist in the DB but are not in RATING_COLUMNS since they aren't displayed on the frontend.

### Core data functions

| Function | Queries | Returns | Used by |
|---|---|---|---|
| `getActivePlayers()` | `player_ratings` with RATING_COLUMNS, `active_roster=1`, last 7 days, deduped to latest row per player. Merges with `players` dimension via `mergeWithPlayerDim` (`...row` spread — all columns pass through). | Array of full player-rating objects | Leaderboard, longevity, player index, everywhere |
| `getPlayersIndex()` | `players` with `SELECT *`, merged with `getActivePlayers()`. **Hardcodes output fields** — does NOT pass through survivorship, projections, or RAPM columns. | Array of player objects (subset of fields) | Player search/index pages |
| `getLongevityRows()` | Calls `getActivePlayers()`, maps DB columns to frontend-aliased keys | Array with aliased longevity fields | `/api/longevity` |
| `getLongevityTrajectory(id)` | `player_ratings` filtered to one player, maps to chart fields | Array of trajectory points | `/api/player/[id]/longevity` |

### Helper functions

**`firstFiniteNumber(...values)`** — Tries each argument in order, returns the first that parses to a finite number via `parseFloat`. Returns `null` if none are finite. Used for calibrated-then-raw fallback chains (e.g. `x_retirement_age_cal` → `x_retirement_age`).

**`normalizeProbability(value)`** — Parses to float. If ≤1, multiplies by 100 (converts [0,1] → percentage). If >1, returns as-is. Returns `null` if not finite. Since `s1`–`s15` are stored as probabilities in [0,1], frontend `p1`–`p15` values are percentages (0–100).

### Column name mapping (DB → frontend)

The longevity page uses aliased field names. The mapping happens in `getLongevityRows()`:

| DB column (player_ratings) | Frontend key | Transformation |
|---|---|---|
| x_retirement_age_cal (fallback: x_retirement_age) | est_retirement_age | `firstFiniteNumber()` picks first non-null |
| projected_years_remaining_cal (fallback: projected_years_remaining) | years_remaining | `firstFiniteNumber()` picks first non-null |
| career_game_num | career_games | Direct rename |
| s1–s15 | p1–p15 | `normalizeProbability()` converts [0,1] → percentage |

**Important:** `getPlayersIndex()` does NOT pass through survivorship or projection columns. It hardcodes a specific field list (DPM, position, shooting trends, minutes). If you need survivorship data on a page that uses `getPlayersIndex()`, you must either add the fields explicitly or use `getActivePlayers()` directly.

### Caching

All data functions use `runCached(key, maxAgeMs, loader)` with in-memory store. Cache clears on server restart / Vercel redeploy. **After uploading new data to Supabase, you must redeploy to Vercel to see changes immediately** (otherwise wait for TTL expiry).

| Cache key | TTL |
|---|---|
| activePlayers | 60s |
| playersIndex | 5min |
| longevityRows | 5min |
| longevityTrajectory | 10min |
| playerCurrent | 60s |
| playerHistory | 5min |

### API routes

| Route | Data function | Notes |
|---|---|---|
| `/api/longevity` | `getLongevityRows({ activeOnly: true })` | Main longevity table |
| `/api/player/[id]/longevity` | `getLongevityTrajectory(nbaId)` | Single player trajectory chart. Queries `player_ratings` for all rows for one player, keeps the **last** row per season (latest date), maps `x_retirement_age_cal` (fallback `x_retirement_age`) → `projected_retirement_age` (rounded to 1 decimal). Output: `[{ season_start, season_start_year, projected_retirement_age }]` |

### Data limits and fetch policy

| Area | Current behavior | Cap | Notes |
|---|---|---:|---|
| Player history API (`/api/player/[id]/history`) | `limit` defaults to `1000`; bounded to max `2000`; `full=1` enables full history path | 2000 (bounded) | Full history path is explicit and uses paginated fetch through `getFullPlayerHistory(...)`. |
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

## Pipeline Scripts

The two Python scripts that build and upload data live in the DARKO pipeline repo (outside `darko-site/`). They are **not** part of the SvelteKit project but are the sole source of truth for Supabase data.

### `build_supabase_tables.py` — Build parquet files

Joins six source parquet files into two Supabase-ready tables using Polars lazy scans + semi-joins (avoids eagerly loading the 15.7 M-row RAPM table).

**Inputs** (all relative to the DARKO project root):

| File | Approx rows | Role |
|---|---:|---|
| `calculated_data/temp/spm_outputs.parq` | 1,089,000 | Base grain (defines the key space) |
| `calculated_data/5_assembled_features.parq` | 1,089,000 | Bio columns: age, career_game_num, position, etc. |
| `calculated_data/bayes_rapm_ratings.parq` | 15,700,000 | RAPM ratings (semi-join filtered before collect) |
| `calculated_data/talent_game_predictions.parq` | 1,089,000 | Projected per-100, shooting, minutes, pace |
| `calculated_data/temp/nba_survivorship.parq` | 1,084,000 | Survivorship curves s1–s15, retirement age |
| `calculated_data/dpm_salary.parq` | varies | DPM-based salary valuation (game_value, warp, sal_market_fixed, surplus_value) |

**Outputs:**
- `supabase_tables/players.parq` — dimension (one row per player)
- `supabase_tables/player_ratings.parq` — fact (one row per player per date, 72 columns)

**Validation:** Asserts no duplicate `(nba_id, date)` rows and that row count equals the base table after all joins.

### `upload_to_supabase.py` — Upload to Supabase Postgres

Loads parquet files to Supabase via `psycopg2` COPY FROM STDIN (CSV), chunked at 50,000 rows with `tqdm` progress.

**Upload modes per table:**

| Table | `full_reload=True` (default for player_ratings) | `full_reload=False` | Fresh (table missing) |
|---|---|---|---|
| `players` | TRUNCATE + reload (CASCADE to elo_ratings) | same | CREATE + bulk load + PK |
| `player_ratings` | DROP + CREATE + bulk load + indexes + RLS | DELETE current season + INSERT (atomic) | CREATE + bulk load + indexes + RLS |
| `season_sim` | TRUNCATE + reload | same | CREATE + bulk load |
| `win_distribution` | TRUNCATE + reload | same | CREATE + bulk load |

**Indexes created on `player_ratings`:**
- `pk_player_ratings PRIMARY KEY (nba_id, date)`
- `idx_ratings_date (date DESC)`
- `idx_ratings_season (season)`
- `idx_ratings_nba_id (nba_id)`
- Row Level Security: `allow_public_read` policy for SELECT

**Connection:** Uses `SUPABASE_PG_DSN` env var, falling back to `fixed_data/supabase_secret.json`.

---

## Pipeline Freshness Requirements

**All source parquet files must cover the same date range.** The build script left-joins everything onto `spm_outputs` by `(nba_id, date)`. If any source file lags behind, those columns will be null for all dates beyond that file's max date.

`getActivePlayers()` always returns the most recent row per player (within the last 7 days). If that row has null survivorship/projections/RAPM because the source file was stale at build time, the entire column appears empty on the site — even though older rows in the DB have the data.

**Debugging null columns on the site:**
1. Check max dates of all source parquet files — they should match `spm_outputs`
2. If a file is stale, re-run its pipeline notebook
3. Run `build_supabase_tables.py` — check the coverage line in output
4. Run `upload_to_supabase.py`
5. Redeploy on Vercel (or restart dev server) to clear in-memory cache
