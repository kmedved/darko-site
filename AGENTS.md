# AGENTS.md

## Agent Playbook

- Use Svelte 5 runes (`$state`, `$effect`, `$derived`, `$props`). Avoid legacy `let`-based `$:` reactive syntax.
- Use kebab-case CSS class names.
- Use theme tokens from `src/app.css` (for example `var(--text)`, `--text-muted`, `--accent`, `--positive`, `--negative`) instead of hardcoded style values.
- For table sorting, use `src/lib/utils/sortableTable.js` and `getSortedRows` with component-level `sortColumn`/`sortDirection` state.
- For data tables, include CSV export via `exportCsvRows` and page-appropriate schemas in `src/lib/utils/csvPresets.js`.
- Sticky tables: `nav` has a sticky height of 210px, so sticky table headers should use `top: 210px`; avoid `overflow-x: auto` on table wrappers.
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

- App remains read-only; keep changes limited to read/query/export behavior and UI updates.
