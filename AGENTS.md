# AGENTS.md

## Agent Playbook

- Use Svelte 5 runes (`$state`, `$effect`, `$derived`, `$props`). Avoid legacy `let`-based `$:` reactive syntax.
- Use kebab-case CSS class names.
- Use theme tokens from `src/app.css` (for example `var(--text)`, `--text-muted`, `--accent`, `--positive`, `--negative`) instead of hardcoded style values.
- For table sorting, use `src/lib/utils/sortableTable.js` and `getSortedRows` with component-level `sortColumn`/`sortDirection` state.
- For data tables, include CSV export via `exportCsvRows` and page-appropriate schemas in `src/lib/utils/csvPresets.js`.
- Sticky tables: the nav and Time Machine strip have a sticky height of `var(--nav-sticky-offset)` (64 px, plus 36 px while the strip is open), so sticky headers use `top: var(--nav-sticky-offset)`. For a table wider than its box, use the detached header in `src/lib/utils/wideStickyTable.js` (leaderboard, Standings, Lineups, Longevity, WOWY, team pages): the header stays pinned while `.table-body-scroll` scrolls sideways, and the edge that hides columns fades.
  - **NEVER** add `overflow-x: auto` (or `scroll`) to `.table-wrapper` **at desktop widths** — the CSS spec normalises `overflow-y` to `auto` as well, creating a scroll container that **breaks `position: sticky` on `<th>`** (headers scroll away instead of sticking). Remove it if you see it.
  - **Exception — mobile breakpoints**: When `<th>` already has `position: static` (e.g. inside `@media (max-width: 768px)`), `overflow-x: auto` on the wrapper is safe and should be used to enable horizontal scrolling. The active leaderboard (`src/routes/+page.svelte`) uses this pattern. Only add `overflow-x: auto` **inside** the same media query where sticky is disabled.
  - Wide tables on desktop are clipped by the body's `overflow-x: clip`; don't hide columns to make a table fit. Use the detached header above, or horizontal scroll where `<th>` is already static (see exception above).
  - **Never** use `box-shadow: 0 calc(-1 * var(--nav-sticky-offset)) …` on `<th>` to fill the gap — it gets clipped by overflow containers.
  - **Never** add a `.sticky-header-bg` (or similar gap-fill div) before `.table-wrapper` — its height + negative margin hides the first rows of the table. The nav's own background already covers the 0–210 px area; no extra gap-fill element is needed.
- Detached visual headers are presentation-only. The body table must retain a same-table `.table-semantic-row` with `scope="col"` headers; `.table-sizing-row` clones may be visually hidden for sizing but must not replace those associations. Sort with a real `<button>` in the header cell (`aria-sort` on the `<th>`), never a click handler on the `<th>` alone.
- Shared page pieces (see the `src/app.css` sections of the same names): `PageHeader.svelte` for every page title, `StatTile.svelte` in a `.stat-strip` for summary numbers, one `.btn` family (`.btn-primary`, `.btn-sm`, `.btn-icon`), `.info-dot` inside `MetricTooltip` for hints. Table numbers stay in neutral ink; only a table's headline column gets colour, via `divergingTint` (`src/lib/utils/divergingTint.js`) and the `tint-cell` class. Chart series use `getSeriesColor` (`src/lib/utils/chartTheme.js`), never `--positive`/`--negative`. Text is 11 px at the smallest, table cells 13 px.
- The former global “DARKO DPM by …” credits footer is intentionally removed in both Modern and Shiny views; do not restore it as a view-specific exception.
- In D3/SVG chart rendering, avoid hardcoded color literals; prefer CSS variables (`--text`, `--text-muted`, `--border-subtle`) so theme contrast remains correct.
- D3 charts must be mobile-responsive: when `svgEl.clientWidth < 500`, reduce margins (left/right), reduce tick counts (`ticks(5)` instead of `ticks(8)`), and use smaller tick label font sizes. `TrajectoryChart.svelte` uses an `isMobile` flag derived from the SVG width for this. Failing to reduce ticks causes overlapping x-axis labels on narrow viewports.
- Trajectory / trend charts (`TrajectoryChart.svelte`, `TalentTrendChart.svelte`) filter out rows where the selected metric is null (`getY(row)` returns null → row excluded by `prepareRows()`). A column that is only partially populated in the pipeline (e.g. `sal_market_fixed` for recent seasons only) will appear as a sparse chart — this is correct behaviour and **not** a frontend bug. If a chart shows "only a handful of games," check column coverage in Supabase before modifying frontend code.
- When adding a new column to the data pipeline:
  1. Add it to `RATING_COLUMNS` in `src/lib/server/supabase.js` or Supabase won't return it.
  2. Add it to the relevant chart component's metric sets (e.g. `MONEY_METRICS`, `SIGNED_METRICS`, `PERCENT_METRICS`) for correct formatting.
  3. Add metric tooltip text in `src/lib/utils/metricDefinitions.js`.
  4. Add CSV column definition in `src/lib/utils/csvPresets.js`.
  5. Update `SUPABASE_SCHEMA.md` with the column schema.

## File Pointers

- Data/API helpers: `src/lib/server/supabase.js`
- Shared sorting utility: `src/lib/utils/sortableTable.js`
- Shared CSV utility + presets: `src/lib/utils/csvPresets.js`
- Standings page implementation: `src/routes/standings/+page.svelte`
- Conference chart component: `src/lib/components/ConferenceChart.svelte`
- Trajectory chart component: `src/lib/components/TrajectoryChart.svelte`
- Active leaderboard: `src/routes/+page.svelte`
- Player profile trend chart: `src/lib/components/TalentTrendChart.svelte`
- Client-side API helpers: `src/lib/api.js`
- Metric tooltip definitions: `src/lib/utils/metricDefinitions.js`
- Fantasy Lab (`/projections`) scoring and per-game conversion: `src/lib/utils/fantasyScoring.js`
- Player-page Seismograph: `src/lib/utils/seismograph.js`. Each `player_ratings` row is the forecast going
  into that day's game, so a game's update is the next row minus that row; offseason rows (`tm_id` -999) end a season.
  Opponents come from `opp_id`, published by nba_darko's `push_website.py`.
- Time Machine (`?asof=YYYY-MM-DD`): helpers in `src/lib/utils/timeMachine.js`, the strip in
  `src/lib/components/TimeMachine.svelte`, kept across navigation by `beforeNavigate` in `+layout.svelte`.
  Date-aware routes: `/`, `/player/*`, `/lab`, `/rewind`; snapshots come from `getPlayersAsOf` in `supabase.js`.
  The strip folds into a nav button. It starts folded and opens by itself while a date is set or on
  `/rewind` (`isTimeMachineFolded`); a reader's own choice (`darko-time-machine` in localStorage) wins.
  `app.html` applies the same rule before first paint, and `--time-machine-height` drops to 0 so sticky
  offsets follow. Its colour, `--time`, is each theme's `--accent` by design.
- History tables `season_calendar` and `rating_frames` (Rewind, the strip's trace) come from nba_darko's
  `push_website.py` (`build_season_calendar`, `build_rating_frames`), read in `src/lib/server/history.js`.
  In `npm run dev` only, `DARKO_LOCAL_DATA_DIR` points at JSON files from the same builder.
- Roster Lab math: `src/lib/utils/rosterLab.js`; Rewind helpers: `src/lib/utils/rewind.js`.
- The leaderboard's players and a player page's career history ship column by column
  (`packRows` in the loader, `unpackRows` in the page; `src/lib/utils/columnar.js`).
- `/lineups` loads the selected size's rows plus every size's counts (`getLineupSizeCounts`), and ships
  them packed (`packLineups` / `unpackLineups` in `src/lib/utils/lineupTransport.js`).
- Supabase schema, column mappings, API data layer, pipeline scripts, and freshness: `SUPABASE_SCHEMA.md`

## Workflow Notes

- `npm run dev`: local server
- `npm run build`: production build
- `npm run preview`: preview build
- Version policy is **Policy B**: only shipped/runtime behavior changes bump `package.json`'s version.

- App is read-only for analytics tables (`player_ratings`, `players`, `season_sim`, `win_distribution`). The Elo voting feature (`elo_ratings`, `elo_votes` tables) is the exception — it performs writes via `/api/rate/vote`.

## MCP Servers
You have access to:
- **Svelte MCP**: Use to look up Svelte 5 runes, SvelteKit APIs, routing, load functions
- **Supabase MCP**: Use to inspect the database schema, list tables, check migrations
- **Vercel MCP**: Use to check deployment logs and look up Vercel docs
