# CLAUDE.md

## Project Overview

Darko Site is an NBA player performance metrics (DPM) dashboard built with SvelteKit, Supabase, and D3. It displays daily player metrics from a PostgreSQL database of ~1M historical rows.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes syntax: `$state`, `$effect`, `$derived`, `$props`)
- **Build**: Vite 6
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Charts**: D3 7.9 for sparkline visualizations
- **Deployment**: Vercel (adapter-vercel), auto-deploys on push to `main`
- **Styling**: Custom CSS with CSS custom properties (dark theme)

## Commands

```bash
npm run dev       # Dev server at localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
```

## Project Structure

```
src/
├── app.html                        # HTML entry point
├── app.css                         # Global styles & design tokens
├── lib/
│   ├── supabase.js                 # Supabase client + API functions
│   └── components/
│       ├── PlayerSearch.svelte     # Search autocomplete
│       ├── PlayerCard.svelte       # Player stats card
│       └── DpmChart.svelte         # D3 sparkline chart
└── routes/
    ├── +layout.svelte              # Root layout with nav
    ├── +page.svelte                # DPM Leaderboard (/)
    └── compare/
        └── +page.svelte            # Player comparison (/compare?ids=...)
```

## Key Files

- `src/lib/supabase.js` — Three API functions: `getActivePlayers()`, `getPlayerHistory(nbaId)`, `getPlayerCurrent(nbaId)`. All read-only.
- `src/app.css` — Design tokens: `--bg`, `--accent`, `--positive`, `--negative`, `--font-sans` (DM Sans), `--font-mono` (DM Mono).
- `1_main.ipynb` — Jupyter notebook for loading parquet data into Supabase.

## Conventions

- **Svelte 5 runes** — Use `$state()`, `$effect()`, `$derived`, `$props()`. No legacy `let`/`$:` reactive syntax.
- **CSS classes** — kebab-case (e.g., `.player-card`, `.search-input`)
- **Color coding** — Positive stats green (`--positive`), negative red (`--negative`)
- **DPM formatting** — Always show sign: `+X.X` / `-X.X`
- **No linter/formatter config** — No .eslintrc or .prettierrc present

## Database

- **Table**: `darko_shiny_history` — columns include `nba_id`, `player_name`, `team_name`, `position`, `dpm`, `o_dpm`, `d_dpm`, `box_dpm`, `date`, `active_roster`, etc.
- **Supabase credentials** are hardcoded public anon keys (safe for client-side read-only access).

## Notes

- App is entirely read-only — no mutations or user auth
- Responsive design: single column below 768px
- Compare page supports up to 4 players via URL params (`?ids=123,456`)
