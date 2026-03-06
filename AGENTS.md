# AGENTS.md

## Agent Playbook

- Use Svelte 5 runes (`$state`, `$effect`, `$derived`, `$props`). Avoid legacy `let`-based `$:` reactive syntax.
- Use kebab-case CSS class names.
- Use theme tokens from `src/app.css` (for example `var(--text)`, `--text-muted`, `--accent`, `--positive`, `--negative`) instead of hardcoded style values.
- For table sorting, use `src/lib/utils/sortableTable.js` and `getSortedRows` with component-level `sortColumn`/`sortDirection` state.
- For data tables, include CSV export via `exportCsvRows` and page-appropriate schemas in `src/lib/utils/csvPresets.js`.
- Sticky tables: `nav` has a sticky height of `var(--nav-sticky-offset)` (210 px), so sticky `<th>` rows use `top: var(--nav-sticky-offset)`.
  - **NEVER** add `overflow-x: auto` (or `scroll`) to `.table-wrapper` **at desktop widths** — the CSS spec normalises `overflow-y` to `auto` as well, creating a scroll container that **breaks `position: sticky` on `<th>`** (headers scroll away instead of sticking). Remove it if you see it.
  - **Exception — mobile breakpoints**: When `<th>` already has `position: static` (e.g. inside `@media (max-width: 768px)`), `overflow-x: auto` on the wrapper is safe and should be used to enable horizontal scrolling. The Legacy leaderboard (`LegacyLeaderboard.svelte`) uses this pattern. Only add `overflow-x: auto` **inside** the same media query where sticky is disabled.
  - Wide tables on desktop are clipped by the body's `overflow-x: clip`; on narrow screens, either hide columns via responsive CSS (`display: none` at breakpoints) or use horizontal scroll (see exception above).
  - **Never** use `box-shadow: 0 calc(-1 * var(--nav-sticky-offset)) …` on `<th>` to fill the gap — it gets clipped by overflow containers.
  - **Never** add a `.sticky-header-bg` (or similar gap-fill div) before `.table-wrapper` — its height + negative margin hides the first rows of the table. The nav's own background already covers the 0–210 px area; no extra gap-fill element is needed.
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
- Legacy leaderboard (dense table view): `src/lib/components/LegacyLeaderboard.svelte`
- Player profile trend chart: `src/lib/components/TalentTrendChart.svelte`
- Client-side API helpers: `src/lib/api.js`
- Metric tooltip definitions: `src/lib/utils/metricDefinitions.js`
- Supabase schema, column mappings, API data layer, pipeline scripts, and freshness: `SUPABASE_SCHEMA.md`

## Workflow Notes

- `npm run dev`: local server
- `npm run build`: production build
- `npm run preview`: preview build
- `npm run context:sync`: regenerate `context/START_HERE.md`, `context/REPO_ARCHITECTURE.md`, `context/REPO_ARCHITECTURE_SYNC.json`, and `context/FILE_INDEX.md`
- `npm run context:build`: regenerate local `context/COMPRESSED_*.md` bundles and `context/CONTEXT_BUDGET.md`

- App is read-only for analytics tables (`player_ratings`, `players`, `season_sim`, `win_distribution`). The Elo voting feature (`elo_ratings`, `elo_votes` tables) is the exception — it performs writes via `/api/rate/vote`.

## LLM Context Artifacts

- LLM context artifacts live in `context/`. If you need a human guide, start at `context/START_HERE.md`.
- Default handoff is `context/REPO_ARCHITECTURE.md` first, then one matching `context/COMPRESSED_*.md` bundle.
- For oracle workflows, pair `context/REPO_ARCHITECTURE.md` with `context/FILE_INDEX.md`.
- For implementation tasks, include raw source for the files you expect to edit; compressed bundles are navigation aids, not a substitute for source.
- Changes touching exposed contracts, routing, module boundaries, cache behavior, or listed invariants must regenerate `context/REPO_ARCHITECTURE.md` and `context/REPO_ARCHITECTURE_SYNC.json` in the same change.
- Use `npm run context:sync` to refresh checked-in context artifacts and `npm run context:build` to refresh local bundles/budgets.
- Version policy is **Policy B**: only shipped/runtime behavior changes bump `package.json`'s version.

## MCP Servers
You have access to:
- **Svelte MCP**: Use to look up Svelte 5 runes, SvelteKit APIs, routing, load functions
- **Supabase MCP**: Use to inspect the database schema, list tables, check migrations
- **Vercel MCP**: Use to check deployment logs and look up Vercel docs
