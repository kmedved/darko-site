# README_CONTEXT.md

## Darko Site

Darko Site is an NBA DPM dashboard powered by SvelteKit, Supabase, and D3.

## Tech Stack

- SvelteKit 2
- Svelte 5 (runes)
- Vite 6
- Supabase PostgreSQL (`@supabase/supabase-js`)
- D3 7.9 charts
- Vercel deployment (`adapter-vercel`)

## Source Layout

- `src/app.html`
- `src/app.css`
- `src/lib/` (API clients, utils, components)
- `src/routes/` (pages, including leaderboard, comparison, standings)

## Commands

```bash
bun run dev
bun run build
bun run preview
bun run validate
```

## Runtime Notes

- App is read-only except for the Elo voting feature (`/api/rate/vote`).
- The app includes responsive behavior for sub-768px layouts.
- Compare supports up to four players via `?ids=...` query params.
- Local development uses Bun. Vercel serverless functions run on Node 22.x.
- Elo rate-limit cleanup runs daily through the Vercel cron endpoint at `/api/internal/maintenance/elo-rate-limits/prune`.

## Data retrieval limits (current behavior)

- Most routes use capped dataset fetches for performance by default (search, compare, player cards).
- Player profile pages now server-render full history through `+page.server.js`.
- Compare page preloads requested `?ids=...` players server-side so same-route URL changes stay in sync.
- Full history remains an explicit opt-in path so default requests stay bounded.
- For future expansion: prioritize full-history enablement for profile-like pages first, then paginate elsewhere.
