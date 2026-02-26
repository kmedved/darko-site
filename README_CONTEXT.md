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
npm run dev
npm run build
npm run preview
```

## Runtime Notes

- App is read-only (no mutations/auth flows).
- The app includes responsive behavior for sub-768px layouts.
- Compare supports up to four players via `?ids=...` query params.
