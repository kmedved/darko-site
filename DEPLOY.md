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
