# How to Deploy Changes

```bash
cd C:\Users\kmedv\OneDrive\github\darko\darko-site
npm run validate:local
git add .
git commit -m "description of what you changed"
git push
```

Vercel auto-deploys on push to `main` (~30 seconds). That's it.

## validate vs validate:local

| Script | Runs | Use when |
|---|---|---|
| `npm run validate:local` | tests + svelte-check | **Default for Windows dev** |
| `npm run validate` | tests + svelte-check + build | CI / Linux (adapter-vercel symlinks fail on Windows) |

The full `npm run build` uses `adapter-vercel` which creates symlinks that Windows blocks with `EPERM` unless Developer Mode is enabled. Since Vercel builds on Linux, the build step is only needed for local verification of the production bundle — `validate:local` is sufficient for everyday deploys.

If you want to preview changes before pushing, run `npm run dev` and check `localhost:5173` first.

Required private Vercel environment variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ELO_SIGNING_SECRET`
- `ELO_RATE_LIMIT_SALT`
- `CRON_SECRET`

Vercel serverless functions should run on Node 22.x. Documented local commands use `npm run`; Bun is optional if you prefer it.

The Elo rate-limit prune job is configured in `vercel.json` and calls `/api/internal/maintenance/elo-rate-limits/prune` daily.

## Before applying a migration to production

```bash
npm run migrations:replay
```

`scripts/replay-migrations.mjs` replays every file in `supabase/migrations/`, in filename order, on an in-memory Postgres 17.5 (PGlite, a pinned devDependency), with stand-ins for the roles and tables that Supabase and the nba_darko publisher create. It needs no network or credentials and exits non-zero if any check fails. It checks that:

- every migration applies in order;
- the functions `20260929_001_reassert_function_ownership.sql` defines match that file, and each is present or absent according to later migrations (a later `drop function` must leave it gone);
- each surviving function is executable by `anon`, `authenticated` and `service_role`, and not by PUBLIC;
- re-applying 20260929_001 on its own succeeds without widening those grants, and re-applying it with the later migrations that touch its functions restores the same function catalog;
- `get_wowy_leaderboard_seasons()` lists opening-snapshot seasons before activation and season-average seasons once the activation marker exists.

Run it after adding or editing a migration and before applying any migration to production. It is deliberately not part of `validate:local`.
