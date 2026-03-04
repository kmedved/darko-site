# AGENTS.md

## Agent Playbook

- Use Svelte 5 runes (`$state`, `$effect`, `$derived`, `$props`). Avoid legacy `let`-based `$:` reactive syntax.
- Use kebab-case CSS class names.
- Use theme tokens from `src/app.css` (for example `var(--text)`, `--text-muted`, `--accent`, `--positive`, `--negative`) instead of hardcoded style values.
- For table sorting, use `src/lib/utils/sortableTable.js` and `getSortedRows` with component-level `sortColumn`/`sortDirection` state.
- For data tables, include CSV export via `exportCsvRows` and page-appropriate schemas in `src/lib/utils/csvPresets.js`.
- Sticky tables: `nav` has a sticky height of `var(--nav-sticky-offset)` (210 px), so sticky `<th>` rows use `top: var(--nav-sticky-offset)`.
  - **NEVER** add `overflow-x: auto` (or `scroll`) to `.table-wrapper` — the CSS spec normalises `overflow-y` to `auto` as well, creating a scroll container that **breaks `position: sticky` on `<th>`** (headers scroll away instead of sticking). Remove it if you see it.
  - Wide tables are clipped by the body's `overflow-x: clip`; on narrow screens, hide columns via responsive CSS (`display: none` at breakpoints) instead.
  - **Never** use `box-shadow: 0 calc(-1 * var(--nav-sticky-offset)) …` on `<th>` to fill the gap — it gets clipped by overflow containers.
  - **Never** add a `.sticky-header-bg` (or similar gap-fill div) before `.table-wrapper` — its height + negative margin hides the first rows of the table. The nav's own background already covers the 0–210 px area; no extra gap-fill element is needed.
- In D3/SVG chart rendering, avoid hardcoded color literals; prefer CSS variables (`--text`, `--text-muted`, `--border-subtle`) so theme contrast remains correct.
- Trajectory / trend charts (`TrajectoryChart.svelte`, `TalentTrendChart.svelte`) filter out rows where the selected metric is null (`getY(row)` returns null → row excluded by `prepareRows()`). A column that is only partially populated in the pipeline (e.g. `sal_market_fixed` for recent seasons only) will appear as a sparse chart — this is correct behaviour and **not** a frontend bug. If a chart shows "only a handful of games," check column coverage in Supabase before modifying frontend code.
- When adding a new column to the data pipeline:
  1. Add it to `RATING_COLUMNS` in `src/lib/server/supabase.js` or Supabase won't return it.
  2. Add it to the relevant chart component's metric sets (e.g. `MONEY_METRICS`, `SIGNED_METRICS`, `PERCENT_METRICS`) for correct formatting.
  3. Add metric tooltip text in `src/lib/utils/metricDefinitions.js`.
  4. Add CSV column definition in `src/lib/utils/csvPresets.js`.
  5. Update `SUPABASE_SCHEMA.md` with the column schema.

## File Pointers

- Data/API helpers: `src/lib/supabase.js`
- Shared sorting utility: `src/lib/utils/sortableTable.js`
- Shared CSV utility + presets: `src/lib/utils/csvPresets.js`
- Standings page implementation: `src/routes/standings/+page.svelte`
- Conference chart component: `src/lib/components/ConferenceChart.svelte`
- Trajectory chart component: `src/lib/components/TrajectoryChart.svelte`
- Player profile trend chart: `src/lib/components/TalentTrendChart.svelte`
- Client-side API helpers: `src/lib/api.js`
- Metric tooltip definitions: `src/lib/utils/metricDefinitions.js`
- Supabase schema, column mappings, API data layer, pipeline scripts, and freshness: `SUPABASE_SCHEMA.md`

## Workflow Notes

- `npm run dev`: local server
- `npm run build`: production build
- `npm run preview`: preview build

- App is read-only for analytics tables (`player_ratings`, `players`, `season_sim`, `win_distribution`). The Elo voting feature (`elo_ratings`, `elo_votes` tables) is the exception — it performs writes via `/api/rate/vote`.
