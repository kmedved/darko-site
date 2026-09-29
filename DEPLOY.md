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
- nothing depends on a table the publisher replaces, for each such table the replay contains (`player_ratings` and `lineup_ratings`; the other six are not in it): `pg_depend` lists no normal dependent of the table, its row type or that type's array type, and a plain `DROP TABLE` of it succeeds inside a rolled-back transaction. A failure names each dependent;
- each surviving function is executable by `anon`, `authenticated` and `service_role`, and not by PUBLIC;
- re-applying 20260929_001 on its own succeeds without widening those grants, and re-applying it followed by every later migration that re-creates, drops, alters, grants or revokes on its functions restores, for each function 20260929_001 defines or a later migration drops, the post-replay catalog entry in all of: signature, arguments with defaults (`pg_get_function_arguments`), return type (`pg_get_function_result`), language, body (`prosrc`), settings such as `search_path` (`proconfig`), security definer (`prosecdef`), volatility (`provolatile`), strict (`proisstrict`), parallel safety (`proparallel`), leakproof (`proleakproof`), ACL (`proacl`) and owner;
- `get_wowy_leaderboard_seasons()` lists opening-snapshot seasons before activation and season-average seasons once the activation marker exists.

Run it after adding or editing a migration and before applying any migration to production. It is deliberately not part of `validate:local`.

### Never make anything depend on a table the publisher replaces

Every publish from nba_darko (`pipeline_scripts/publish/website.py`) replaces `player_ratings` (on a full rebuild), `lineup_ratings`, `season_calendar`, `rating_frames`, `player_comps`, `player_seasons`, `game_updates` and `rating_moves` with a plain `DROP TABLE`, without `CASCADE`. A migration that makes any other object depend on one of them makes that drop fail: the publication rolls back, and every later publish fails the same way until the dependent is dropped. Do not create, on or over those tables:

- a view or materialized view;
- a foreign key from another table;
- a rule, a policy on another table whose expression reads one, or a constraint trigger on another table declared `FROM` one;
- a function or column of the table's row type (`returns setof public.player_ratings`, `returns public.player_ratings`, an argument of that type or an array of it);
- a function or procedure with a SQL-standard `BEGIN ATOMIC` body that reads one.

Write functions string-bodied (`as $function$ ... $function$`), in `language sql` or `language plpgsql`, returning `jsonb`, `setof record` or `table(...)` with explicit column types, as every function in `supabase/migrations/` does; Postgres records no dependency from a string body, so a publish leaves them in place. An index, trigger, policy or grant a migration adds to one of these tables is lost when the table is next replaced; the publisher owns their indexes (`TABLE_INDEXES`) and re-applies only row-level security, the `allow_public_read` policy and `SELECT` for `anon` and `authenticated`. The replay's dependency check catches a dependent on `player_ratings` or `lineup_ratings`. It has no copy of the other six, so a dependent on one of them (a view, key, row type or SQL-language body that names it) fails the replay earlier, at "relation does not exist"; add a stub for that table to `TABLE_STUBS` in the replay before a migration needs to read it.
