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
  - A `.sticky-header-bg` div (defined in `app.css`) is placed before each `.table-wrapper` as a safety belt — it fills the gap between the nav and the `<th>` row with the page background. Keep it in place.
  - **Never** use `box-shadow: 0 calc(-1 * var(--nav-sticky-offset)) …` on `<th>` to fill the gap — it gets clipped.
- In D3/SVG chart rendering, avoid hardcoded color literals; prefer CSS variables (`--text`, `--text-muted`, `--border-subtle`) so theme contrast remains correct.

## File Pointers

- Data/API helpers: `src/lib/supabase.js`
- Shared sorting utility: `src/lib/utils/sortableTable.js`
- Shared CSV utility + presets: `src/lib/utils/csvPresets.js`
- Standings page implementation: `src/routes/standings/+page.svelte`
- Conference chart component: `src/lib/components/ConferenceChart.svelte`
- Supabase schema, column mappings, API data layer, and pipeline freshness: `SUPABASE_SCHEMA.md`

## Workflow Notes

- `npm run dev`: local server
- `npm run build`: production build
- `npm run preview`: preview build

- App is read-only for analytics tables (`player_ratings`, `players`, `season_sim`, `win_distribution`). The Elo voting feature (`elo_ratings`, `elo_votes` tables) is the exception — it performs writes via `/api/rate/vote`.
