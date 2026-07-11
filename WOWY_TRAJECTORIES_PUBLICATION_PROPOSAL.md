# Publishing Synthetic WOWY RAPM on DARKO Trajectories

**Status:** Implemented and live. Retained as the publication architecture and
provenance record; the 2026 source block below is binding.

## Implemented Boundary

The game-level export, separate Supabase `wowy_ratings` table, paginated API,
and Trajectories integration are implemented. The separate-table decision is
settled. Future work should preserve this boundary rather than reopening
`player_ratings` expansion.

This page publishes the canonical daily/game-level WOWY path only. The
single-season v1/v2 calibration studies are independent research products and
are not site fields. V2 killed the global linear de-lag; no retrospective
single-season WOWY RAPM may be added unless a later preregistered smoother
passes its gates and receives a separate owner promotion decision. Existing
season leaderboards are plain averages of published game-level WOWY values,
not the withheld retrospective season estimator.

## Product Decision

Publish the certified synthetic WOWY ratings on the DARKO site's
**Trajectories** tab as **WOWY RAPM**.

The intended display rules are:

- Use the synthetic rating in every era, including the real-play-by-play era.
  Do not stitch production RAPM onto the modern end of the series.
- Display seasons beginning in 1980. The 1977-79 observations remain model
  burn-in and must affect the 1980 ratings, but must not appear publicly.
- Plot one point after each game in which the player appeared, rather than one
  point for every league game-day snapshot.
- Publish every mapped player and played player-game in the display sample.
  Apply no minimum exposure, possessions, games, minutes beyond the played-game
  definition, or rating-quality threshold.
- Publish WOWY in a separate Supabase `wowy_ratings` table. Do not add sparse
  historical WOWY rows or fields to `player_ratings`.
- Include regular-season, play-in, and playoff appearances used by the
  canonical model. Every included postseason appearance increments
  `career_game_num`; preseason and All-Star games remain excluded.
- Support the existing Games, Age, and Seasons trajectory views.
- In the Games view, use `career_game_num` with the same sample-relative
  convention as existing DARKO data. Number games from the first available
  WOWY appearance, so Kareem Abdul-Jabbar correctly begins at game 1 in the
  1979-80 WOWY sample.
- Use `player_master_crosswalk.csv` as the identity and date-of-birth source.
  The old `nbaid_crosswalk.csv` is frozen legacy compatibility data and must
  not become a new dependency.

Expose all three synthetic ratings in the initial UI:

- **WOWY RAPM** (`combo_T`) as the default and headline metric.
- **WOWY O-RAPM** (`combo_O`) for offensive impact.
- **WOWY D-RAPM** (`combo_D`) for defensive impact, with positive values
  consistently meaning better defense.

The metric definitions should explain that offensive/defensive attribution is
less stable than total impact. This is a precision caveat, not a reason to hide
the splits.

## Certified Source

The source model artifact is:

```text
33_wowy_rapm/composite_rapm.parquet
SHA-256: ef5e1b5f99c0fa3e5b9913582ee5c3612b2ac4fc31667444dab085e43d5d4a40
Rows: 4,126,431
Dates: 1979-10-12 through 2026-06-13
```

The displayed values are:

| Public field | Canonical source column |
|---|---|
| `wowy_orapm` | `combo_O` |
| `wowy_drapm` | `combo_D` |
| `wowy_rapm` | `combo_T` |
| `exposure` | `exposure` |

The canonical parquet contains one rating snapshot per player on each selected
**league game day**, including days on which that player did not play. It is
therefore not itself the website payload. The publication export must select
only snapshots corresponding to that player's actual game appearances.

The frozen production stack has now been rerun through the completed 2025-26
season and promoted with canonical SHA-256
`ef5e1b5f99c0fa3e5b9913582ee5c3612b2ac4fc31667444dab085e43d5d4a40`.
The website uploader must never extrapolate or silently carry the final value
forward beyond June 13, 2026.

This was a production-data refresh, not a new model search. It reused the pinned
production parameters and rebuilt every data-dependent feature/cache. All
4,003,047 pre-2026 keys were preserved; the mean absolute total-rating revision
was 0.0189 points (p99 0.1308). The new battery is YELLOW for the same disclosed
2020-24 chaining issue as candidate E, improved from +0.0416 to +0.0379; every
Packet D, fringe, star-tail, backcast, and reverse-era gate passed.

The verified publication population is 1,161,172 mapped played player-games
from season ending 1980 onward. All of them join to exactly one same-date
composite snapshot, with zero missing or ambiguous joins. The longest player
history is 1,923 games, so the endpoint must paginate beyond Supabase's default
1,000-row response without dropping shorter or lower-exposure careers.

The existing season-level publication table is useful for validation but not
for the Trajectories chart, which needs game-level points:

```text
33_wowy_rapm/reports/publication/player_season_display_synthetic.tsv
```

## Existing Site Contract

The site currently reads ordinary DARKO history from Supabase
`player_ratings` through `src/lib/server/supabase.js` and
`/api/player/[id]/history`. The Trajectories page loads a player's history once
and selects a metric column client-side.

`player_ratings` is a broad production fact table:

- Approximately 1.1 million rows and 72 columns.
- Primary key `(nba_id, date)`.
- Contains DARKO, box, on/off, production RAPM, projections, availability,
  salary, and survivorship fields.
- Includes projected future-game rows.
- Uses `spm_outputs.parq` as its base relation.
- Routine uploads replace the current season, while historical seasons are
  normally left alone.

The site working tree currently contains unrelated, uncommitted active-roster
selection changes. Those should be committed separately before WOWY work so
the feature has a clean implementation boundary.

## Proposed Publication Export

Add a model-owned exporter, tentatively:

```text
33_wowy_rapm/scripts/export_wowy_site.py
```

It should produce:

```text
33_wowy_rapm/reports/publication/wowy_player_game.parquet
33_wowy_rapm/reports/publication/wowy_player_game_manifest.json
```

The exporter should:

1. Verify the canonical composite SHA-256 before reading it.
2. Load actual player-game appearances from the same BBRef database and player
   preparation rules used by the composite pipeline.
3. Exclude DNP, inactive, and zero-minute rows.
4. Retain regular-season and postseason games from the canonical observation
   population, including play-in and playoff games; exclude preseason and
   All-Star exhibitions.
5. Collapse or reject duplicate `(game_id, nba_id)` rows using the canonical
   same-game handling already used by `5e_composite.py`.
6. Resolve `player_basic.player_id` through the master crosswalk's
   `bbr_id -> nba_id` mapping. Do not apply the 23 `alt_nba_id` mappings here;
   those are NBA/TPDEV aliases, not BBRef identities.
7. Join each appearance to the same-date postgame composite snapshot on
   `(nba_id, date)` and fail if any expected snapshot is missing or ambiguous.
8. Restrict the public result to season ending 1980 and later after the join.
9. Assign `career_game_num = 1..N` within each player over the displayed sample,
   counting both regular-season and postseason appearances.
10. Compute age from the corrected master-crosswalk DOB and the game date.
11. Write only the narrow publication columns and a machine-readable manifest.

Proposed columns:

| Column | Type | Meaning |
|---|---|---|
| `nba_id` | int64 | Canonical NBA player ID |
| `game_id` | string | Canonical BBRef game ID |
| `date` | date | Game/postgame rating date |
| `season` | int16/int32 | NBA season ending year |
| `career_game_num` | int32 | Sequential game number within the available WOWY sample |
| `age` | float64 | Age on game date |
| `wowy_rapm` | float32/float64 | Synthetic total WOWY RAPM (`combo_T`) |
| `wowy_orapm` | float32/float64 | Synthetic offensive WOWY RAPM (`combo_O`) |
| `wowy_drapm` | float32/float64 | Synthetic defensive WOWY RAPM (`combo_D`) |
| `exposure` | float32/float64 | Model exposure at that snapshot |

The manifest should record input hashes, output hash, row and player counts,
date and season ranges, duplicate counts, missing-join counts, age range, and
sentinel summaries.

## Proposed Supabase Boundary

Create a narrow, independently replaceable table:

```sql
create table public.wowy_ratings (
    nba_id bigint not null,
    game_id text not null,
    date date not null,
    season integer not null,
    career_game_num integer not null,
    age double precision not null,
    wowy_rapm real not null,
    wowy_orapm real not null,
    wowy_drapm real not null,
    exposure real not null,
    primary key (nba_id, game_id)
);

create index idx_wowy_ratings_player_date
    on public.wowy_ratings (nba_id, date);
```

Enable RLS and grant anonymous/authenticated users `SELECT` only, matching the
other public analytical tables. Do not expose insert, update, delete, or
truncate permissions to public clients.

Integrate the export into `1_historic_darko/push_website.py`. Upload into a
staging table first. After the staging checks pass, replace the contents of
`public.wowy_ratings` inside one transaction (`TRUNCATE` followed by
`INSERT ... SELECT` from staging) so a failure rolls back to the old public
contents while preserving the table's indexes, grants, and RLS policies. WOWY
should be a full-table replacement when a new certified model is published,
not part of the ordinary current-season DARKO refresh.

### Why a Separate Table Is Recommended

The separate table is not required merely for aesthetic normalization. It
avoids concrete conflicts with the existing table contract:

1. **Historical coverage:** `player_ratings` uses `spm_outputs` as its base and
   does not naturally provide rows back to 1980. Adding WOWY there would require
   unioning sparse WOWY-only rows into the base relation, with most of the other
   72 columns null.
2. **Refresh safety:** the routine `player_ratings` upload deletes and reinserts
   the current season. Unless every ordinary website refresh also carried WOWY,
   it could silently erase current-season WOWY fields or rows.
3. **Different row semantics:** ordinary DARKO history includes projections and
   future-game rows; WOWY is an observed-game-only historical series.
4. **Independent rollback:** a WOWY publication can be replaced or rolled back
   without touching the leaderboard, player pages, projections, longevity,
   salary, or production RAPM.
5. **Query shape:** the WOWY endpoint needs roughly ten columns, not the broad
   `RATING_COLUMNS` projection used throughout the application.
6. **Provenance:** the table cleanly communicates that these are synthetic WOWY
   estimates, including in years where production RAPM also exists.

The main cost is one additional table, endpoint, and frontend data branch.

### Alternative: Expand `player_ratings`

This is feasible and should be considered by the reviewer. It would add
`wowy_rapm`, `wowy_orapm`, `wowy_drapm`, and `wowy_exposure`, reuse
`career_game_num`, then union pre-existing-era WOWY-only rows into the table.

Advantages:

- The existing player-history endpoint and client row model could be reused.
- Switching metrics would not require a second request.
- Same-date modern rows could carry both DARKO and WOWY fields.

Costs and required safeguards:

- The build must define how WOWY-only historical rows coexist with the current
  `(nba_id, date)` primary key.
- The normal current-season refresh must always preserve/rejoin WOWY.
- Generic player-history consumers would receive sparse synthetic-only rows.
- `RATING_COLUMNS`, schema documentation, upload DDL, and all relevant query
  tests would grow.
- A WOWY failure would become capable of blocking or damaging the main ratings
  upload.

If this alternative is selected, the implementation should first redesign and
test the refresh contract. It should not be implemented as a casual left join
onto current `spm_outputs`, because that would omit the pre-`spm` history that
is the main reason for publishing WOWY.

### Rejected Alternative: Static File from Vercel

Shipping the complete player-game history as a static frontend asset would
create a large download, duplicate server filtering in the browser, and make
cache invalidation and atomic replacement harder. It offers no meaningful
advantage over a narrow Supabase table.

## Proposed API and Frontend Flow

Add a server helper and endpoint:

```text
getWowyPlayerHistory(nbaId)
GET /api/player/[id]/wowy-history
```

The query should select explicit columns, filter by `nba_id`, order by date,
and use the site's normal server and edge-cache conventions. Supabase responses
must be paginated until the player's complete history is returned; pagination
is a transport detail, not a player or exposure filter. Any defensive safety
cap must exceed the verified maximum career history and must fail loudly rather
than silently truncate a player.

On `src/routes/trajectories/+page.svelte`:

- Add `{ key: 'wowy_rapm', label: 'WOWY RAPM' }`,
  `{ key: 'wowy_orapm', label: 'WOWY O-RAPM' }`, and
  `{ key: 'wowy_drapm', label: 'WOWY D-RAPM' }` to Talent Type.
- Add all three WOWY fields to signed-metric formatting.
- Keep total WOWY RAPM as the default WOWY selection and primary presentation.
- Fetch WOWY history lazily when the metric is selected, or fetch it in parallel
  when a player is added. Lazy loading is preferable if it remains simple.
- Store ordinary DARKO rows and WOWY rows separately on each selected player.
- Feed WOWY rows to `TrajectoryChart` only for the WOWY metric.
- For Games, use the exported `career_game_num` and the existing **Career Game
  Number** axis treatment.
- For Age, use the exported `age`.
- For Seasons, continue deriving the season from `date`.
- Add the metric label/definition and CSV-export metadata in the site's shared
  utility files.

The player search can continue using the existing `players` dimension, which
already includes retired players.

## Validation and Acceptance Criteria

### Export

- Input is a newly certified artifact through the completed 2026 season; its
  hash and certification references replace the certified-E placeholders in
  the publication manifest.
- Max source and exported dates equal the final included 2025-26 game date, and
  season 2026 is present.
- No rows before the 1980 display season.
- No duplicate `(nba_id, game_id)` keys.
- No null key, rating, exposure, or age fields.
- Export row count equals the complete mapped played-game population; no row is
  removed for low exposure, low possessions, short career, or extreme rating.
- Every player with at least one mapped played game from season ending 1980
  onward is queryable on Trajectories, even with no ordinary DARKO history.
- `wowy_orapm + wowy_drapm` equals `wowy_rapm` within the source artifact's
  floating-point tolerance on every row.
- Positive `wowy_drapm` is verified to preserve the canonical convention that
  higher values represent better defensive impact.
- Every player maps to the master crosswalk.
- Every included row corresponds to a played game, not a DNP or league-only
  snapshot.
- Postseason row counts reconcile with the canonical `playoffs_fl`/schedule
  classification, and postseason games increment `career_game_num` without a
  reset at the regular-season boundary.
- No preseason or All-Star exhibition appears in the export.
- `career_game_num` is contiguous and strictly increasing within player,
  beginning at 1 for each player's first available WOWY appearance.
- Ages are within the observed plausible NBA range; failures print player ID,
  name, DOB, game date, and computed age.
- Every exported value exactly matches the canonical composite on the same
  `(nba_id, date)`. Season-end summaries are compared separately to
  `player_season_display_synthetic.tsv`; differences after a player's final
  game are expected when league-game-day decay continues through the published
  season-end snapshot and must be reported rather than forced to zero.
- Sentinel histories are checked for Kareem Abdul-Jabbar, Michael Jordan,
  Dennis Rodman, Ben Wallace, LeBron James, Carmelo Anthony, Kawhi Leonard,
  and Nikola Jokic.
- Offensive and defensive sentinel checks include defense-first players
  (Rodman and Wallace), offense-first players, and balanced stars; the report
  must show O, D, and total together so split anomalies are visible.
- Corey Williams resolves to DOB `1970-04-24`, height 74 inches in the master,
  and plausible game ages.

### Supabase

- Local parquet row count equals uploaded table row count.
- Min/max dates, player count, checksum sample, and sentinel rows reconcile.
- Public anon can select but cannot write.
- The table replacement is atomic and has a documented rollback command.
- Existing `player_ratings` row counts and hashes/summary metrics are unchanged.

### Site

- `WOWY RAPM` appears on Trajectories and nowhere that implies it is ordinary
  production RAPM.
- Games, Age, and Seasons render correctly for both pre-1998 and modern players.
- Kareem's first available WOWY appearance is plotted at career game number 1,
  consistent with the existing sample-relative DARKO convention.
- Modern players use synthetic values, not production RAPM.
- Empty/error/loading states work for players without WOWY history.
- Desktop and mobile charts render without overlap.
- Existing trajectory metrics and history APIs remain unchanged.
- No Supabase query or client-side chart path applies an exposure threshold to
  WOWY rows.
- Relevant unit tests, `npm test`, and `npm run build` pass.

## Proposed Execution Order

1. Resolve and separately commit the site's existing active-roster working-tree
   changes.
2. **Completed:** refresh the 2025-26 BBRef inputs through the completed Finals
   and build a candidate WOWY DuckDB without modifying the certified source database.
3. **Completed:** rebuild the quarter-minute prediction cache through the candidate database's
   latest season, then run BPM, manifest-pinned Elo, manifest-pinned WHR, the
   inline composite, and the promoted Packet D blend with no retuning.
4. **Completed:** certify and promote the 2026 candidate: reconcile source coverage, compare the complete
   pre-2026 overlap against certified E, run the battery and acceptance panel,
   and record the new canonical hash. Keep certified E available for rollback.
5. Implement the model-owned game-level exporter and manifest against the new
   certified artifact.
6. Review the exported schema, counts, sentinel histories, and season-end
   reconciliation before touching Supabase.
7. Add the Supabase migration, read-only policy, staging upload, and verification.
8. Upload to Supabase and verify independently.
9. Add the server helper, API route, client helper, and Trajectories option.
10. Add tests and schema/context documentation.
11. Run the local site, inspect desktop/mobile behavior, and compare named players.
12. Deploy, smoke-test production, and record the published artifact hash.

## Questions for the Reviewer

1. Should WOWY history load lazily on metric selection or in parallel when a
   player is selected?
2. Is `(nba_id, game_id)` the right primary key, with `(nba_id, date)` indexed,
   or is the site's existing `(nba_id, date)` convention preferable?
3. Should the endpoint return the database field names directly or map them to
   a generic chart-row contract?
4. Are there any routine website-publish workflows that would make a separate,
   less-frequently-refreshed table operationally awkward?
5. Is any additional provenance needed beyond the canonical input hash, export
   hash, source-code commit, row diagnostics, and upload verification?
