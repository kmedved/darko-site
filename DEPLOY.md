# How to Deploy Changes

```bash
cd C:\Users\kmedv\OneDrive\github\darko\darko-site
npm run validate
git add .
git commit -m "description of what you changed"
git push
```

Vercel auto-redeploys in ~30 seconds. That's it.

If you want to preview changes before pushing, run `npm run dev` and check `localhost:5173` first.

Required private Vercel environment variables:

- `SUPABASE_SERVICE_ROLE_KEY`
- `ELO_SIGNING_SECRET`
- `ELO_RATE_LIMIT_SALT`
- `CRON_SECRET`

Vercel serverless functions should run on Node 22.x. Documented local commands use `npm run`; Bun is optional if you prefer it.

The Elo rate-limit prune job is configured in `vercel.json` and calls `/api/internal/maintenance/elo-rate-limits/prune` daily.
