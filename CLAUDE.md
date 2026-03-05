# CLAUDE.md

This file is intentionally minimal. See the dedicated references:

- [`AGENTS.md`](AGENTS.md) for agent-facing implementation rules and conventions.
- [`README_CONTEXT.md`](README_CONTEXT.md) for project context, stack, and layout.
- [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) for Supabase table schemas, DB→frontend column mappings, pipeline scripts (`build_supabase_tables.py` / `upload_to_supabase.py`), and data pipeline debugging.

## Commands

```bash
bun run dev       # Dev server at localhost:5173
bun run build     # Production build
bun run preview   # Preview production build
bun run validate  # test + svelte-check + build
```

## Runtime Notes

- The app is read-only except for the Elo voting write path at `/api/rate/vote`.
- Local development uses Bun; Vercel serverless functions run on Node 22.x.
- Elo rate-limit cleanup is handled by the Vercel cron endpoint `/api/internal/maintenance/elo-rate-limits/prune`.

## Dev Server
This is a SvelteKit project using Bun (not Node). To start the dev server for preview/screenshots:
```bash
bunx vite --host --port 5173
```
Key details:
- `bunx vite` — Node is not installed, so `npx`/`vite` won't work. Use `bunx`.
- `--host` — Required. Without this, Vite binds to IPv6 localhost only (`::1`), and the preview tool connects to `127.0.0.1`, which will refuse connections.
- `--port 5173` — Explicit port to avoid conflicts.
- Vercel serverless functions run on Node 22.x even though the local workflow uses Bun.
- If the port is busy, kill stale processes first: `lsof -ti:5173 | xargs kill -9`
- After starting, wait a couple seconds before taking screenshots.

## Browsing Live DARKO.app
The live site (darko.app) is a Shiny app — fully JS-rendered. `web_fetch` returns empty HTML.
To inspect it, connect to the Chrome extension and use `read_page` (accessibility tree). Screenshots of the Chrome extension URL may fail, but `read_page` gives enough structural info.

## MCP Servers
You have access to:
- **Svelte MCP**: Use to look up Svelte 5 runes, SvelteKit APIs, routing, load functions
- **Supabase MCP**: Use to inspect the database schema, list tables, check migrations
- **Vercel MCP**: Use to check deployment logs and look up Vercel docs
