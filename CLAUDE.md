# CLAUDE.md

This file is intentionally minimal. See the dedicated references:

- [`AGENTS.md`](AGENTS.md) for agent-facing implementation rules and conventions.
- [`context/START_HERE.md`](context/START_HERE.md) for the canonical context handoff flow.
- [`SUPABASE_SCHEMA.md`](SUPABASE_SCHEMA.md) for Supabase table schemas, DB→frontend column mappings, pipeline scripts (`build_supabase_tables.py` / `upload_to_supabase.py`), and data pipeline debugging.

## Commands

```bash
npm run dev       # Dev server at localhost:5173
npm run build     # Production build
npm run preview   # Preview production build
npm run validate  # test + svelte-check + build
```

## Runtime Notes

- The app is read-only except for the Elo voting write path at `/api/rate/vote`.
- Documented repo commands use `npm run`; Bun is optional if you prefer it locally. Vercel serverless functions run on Node 22.x.
- Elo rate-limit cleanup is handled by the Vercel cron endpoint `/api/internal/maintenance/elo-rate-limits/prune`.

## LLM Context Artifacts

- `context/START_HERE.md` is the human guide if you are unsure what to paste.
- Use `context/REPO_ARCHITECTURE.md` plus one `context/COMPRESSED_*.md` bundle as the default repo handoff.
- For oracle workflows, use `context/REPO_ARCHITECTURE.md` plus `context/FILE_INDEX.md`.
- For implementation work, include raw source for the touched files; compressed bundles are for navigation only.
- Refresh checked-in context artifacts with `npm run context:sync` after changes to contracts, routing, module boundaries, or named invariants.
- Refresh local split bundles and token budgets with `npm run context:build`.
- Version policy is **Policy B**: only shipped/runtime behavior changes bump `package.json`'s version.

## Dev Server
To start the dev server for preview/screenshots:
```bash
npm run dev -- --host --port 5173
```
Key details:
- `npm run dev -- --host --port 5173` keeps the documented workflow aligned with the repo scripts.
- `--host` — Required. Without this, Vite binds to IPv6 localhost only (`::1`), and the preview tool connects to `127.0.0.1`, which will refuse connections.
- `--port 5173` — Explicit port to avoid conflicts.
- If you prefer Bun locally, `bunx vite --host --port 5173` is equivalent.
- Vercel serverless functions run on Node 22.x.
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
