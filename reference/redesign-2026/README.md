# DARKO redesign prototype (September 2026)

Reference only. Nothing in this folder is built, tested or deployed by the site.

- Live prototype: https://claude.ai/artifact/Gdac1cNaPRp4zvoF1DKXcM (private to the owner's
  claude.ai account; share it from the artifact's Share menu before sending the link).
- Built on the published DARKO tables as of Jul 26, 2026.
- A single, framework-free page: plain JavaScript, D3 7 and a hash router, bundled with its
  data into one HTML file. It is a design and behavior reference for porting features into
  this SvelteKit app, not code to copy verbatim.

## The ten features and where they live

| Feature | Prototype source | Port target |
|---|---|---|
| The Daily: headline, movers, single-game shocks, age records, watchlist | `src/10-today.js` | Live at `/daily` (`utils/daily.js`), from nba_darko's `rating_moves`, `game_updates` and `player_seasons` tables |
| Rewind: global date scrubber and weekly top-15 race since 1996-97 | `src/03-floor.js`, `src/16-rewind.js` | `/rewind` and the Time Machine strip, on the `rating_frames` table |
| Seismograph: every game's DPM update, split offense/defense | `drawSeismo` in `src/12-player.js` | Live on player pages, with opponents from `player_ratings.opp_id` |
| Comps & Futures: historical matches and a five-year fan chart | `comps.py`, `drawFan` in `src/12-player.js` | Live on player pages: `CompsFutures.svelte`, `utils/comps.js`, from nba_darko's `player_comps` table |
| Roster Lab: two-team trades, minutes, rating, wins, matchup odds | `src/14-lab.js` | `/lab`, today's rosters or any Time Machine date |
| Team DNA: rating contributions, lineups, payroll vs value, core outlook | `src/13-teams.js` | Live in `TeamDetailView.svelte`: Players, Build-up and Minutes views (`RatingBreakdown.svelte`, `MinutesChart.svelte`, `utils/teamDna.js`); the Minutes chart is in the Roster Lab too |
| Fantasy Lab: ESPN, Yahoo, DraftKings, 9-cat or custom scoring, draft board | `src/15-fantasy.js` | Live at `/projections`; the draft board is dropped (2026-09-28) |
| Ask DARKO: command bar for players, filters, trades and time travel | `src/19-ask.js` | Live site-wide: `AskDarko.svelte`, `utils/askDarko.js` |
| DARKOdle: daily mystery player from a career DPM curve | `src/17-darkodle.js` | Dropped (2026-09-28): not porting |
| Card Studio: shareable PNG player cards | `src/18-card.js` | Dropped (2026-09-28): not porting |
| What's new: the new features, with links in | `src/20-new.js` | Live at `/new` (`utils/whatsNew.js`): ported features only, each for 30 days after launch |

Shared pieces: `src/01-data.js` (as-of lookups, movers, skill percentiles, team ratings),
`src/02-ui.js` (O/X split bar, sparkline, skill fingerprint glyph, tooltip) and
`src/04-charts.js` (time-series chart with crosshair).

## Agreed port order

1. Fantasy Lab into `/projections` (done).
2. Design foundations (offense/defense tokens for every theme, wide numerals, O/X split,
   sparkline, fingerprint glyph) and the Seismograph on player pages (done: tokens, O/X
   split and split bar; the sparkline waits for the features that use it, and the
   fingerprint glyph is dropped).
3. Ask DARKO (done).
4. Team DNA additions, then Roster Lab (both done).
5. Pipeline-backed features: Rewind and the site-wide date (done, as the Time Machine),
   Comps & Futures and The Daily (done).

DARKOdle, Card Studio, the Fantasy Lab's draft board and the skill fingerprint glyph are
dropped: `src/17-darkodle.js`, `src/18-card.js`, the draft board in `src/15-fantasy.js` and
`glyph()` in `src/02-ui.js` stay as reference only. The player page's percentile bars
already carry the skill percentiles.

## Porting notes

- `player_ratings` rows are forecasts going into each day's game, so a game's update is the
  next row minus that row. The prototype's `gameUpdates` used the change into the game's own
  row, which is one game early; `src/lib/utils/seismograph.js` has the corrected version.
- Fantasy per-game values use the same conversion as `nba_darko`'s props stage:
  `poss = x_minutes * x_pace / 48`, `stat = x_stat_100 * poss / 100`.
- Each publish (`nba_darko/1_historic_darko/push_website.py`) drops the old `player_ratings`
  with CASCADE when it swaps the new one in, and recreates only the functions in
  `restore_player_ratings_rpcs()`. Any new Postgres function built on that table must be added
  there, or the next publish removes it. The function it restores must match the site's latest
  migration: an older copy of `get_wowy_season_player_ratings` there undid migration
  20260814_001 on every publish until it was replaced with the migration's own definition.
- Until the fix in `push_website.py`, every publish left `players.draft_year` and `draft_slot`
  empty (a float-text-to-integer cast nulled all 3,704) and gave 403 of 530 active players no
  `current_team` (the offseason placeholder rows have none), so Rate a Player showed everyone as
  "Undrafted" and most teams as "?". Draft pick 0 is a territorial pick.
- The Jul 26 offseason rows in `player_ratings` have no team (`tm_id = -999`), so the Roster
  Lab starts from each team's late-season rotation.
- Season-end rows in the prototype count playoff games in games and minutes.
- Comps, Roster Lab team ratings and fantasy values are prototype calculations, not DARKO
  outputs. nba_darko builds comps with the prototype's method (`pipeline_scripts/publish/
  website_comps.py`, called by `push_website.py`); on the same bundle it reproduced the
  prototype exactly, and it then counts only regular-season games toward a season's games,
  which left 475 of 530 top-ten lists unchanged (99.3% of comps). The page draws the fan
  from the 25 published comps (`utils/comps.js`, matching the prototype to 1e-14). The team-rating wins fit is computed in the page from the ratings it shows.

## Color tokens

Validated for color-vision deficiency and contrast with the dataviz palette checker.
Offense is always paired with a circle glyph and defense with a cross, so color is never
the only cue.

| Token | Light | Dark |
|---|---|---|
| Offense | `#eb6834` | `#d95926` |
| Defense | `#2a78d6` | `#3987e5` |
| Maple (time, highlights) | `#B8812F` (text `#9A6A26`) | `#D9A566` |

The site's themes (dark, black, light, white) need their own check before these tokens are
added to `src/app.css`.

Maple stayed in the prototype: on the site, the Time Machine and its as-of marks use each
theme's accent (`--time: var(--accent)` in `src/app.css`).

## Rebuilding and viewing

Requires the DARKO Python environment (polars, numpy) and read access to the shared runtime.

```bash
NBA_DARKO_RUNTIME_ROOT=/path/to/nba_darko_live python build_data.py   # writes data.json
python build.py                                                      # writes dist/
python -m http.server 8765 --directory dist
```

Then open http://localhost:8765/preview-std.html. `dist/darko-redesign.html` is the
artifact version (no doctype or viewport tag; the artifact viewer adds them).
`data.json` and `dist/` are ignored by git.
