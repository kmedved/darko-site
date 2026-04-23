Paste this first.
Pair with one `context/COMPRESSED_*.md` bundle for guided context, or with `context/FILE_INDEX.md` for oracle workflows.
For implementation tasks, also paste raw source of the files you expect to edit.

Architecture sync version: 0.1.14
Archetype: Service / App | Secondary: Data / Workflow / Pipeline | Topology: single-unit | Policy B: only shipped/runtime behavior changes bump version.

## TL;DR

Darko Site is a single SvelteKit application for NBA analytics pages and JSON APIs. The durable center is `src/lib/server/supabase.js`: route loaders and API handlers stay thin, shared server helpers own behavior, and Svelte/D3 components plus UI utilities own chart and table presentation.

## Behavior / Routing Matrix

| Surface | Route(s) | Backend path | Cache / mode | Notes |
|---|---|---|---|---|
| Homepage leaderboard | `/` | `getActivePlayers()` | edge 3600s / swr 86400s | Active roster snapshot ranked by DPM. |
| Player detail | `/player/:nbaId` | `loadPlayerPageData()` + `getFullPlayerHistory()` | edge 3600s / swr 86400s | Full history is SSR-first. |
| Compare | `/compare?ids=` | `loadComparePageData()` | uncached page loader | Dedupes IDs, preserves order, max 4 players. |
| Standings / team detail | `/standings`, `/standings/:slug`, `/team/:team` | `getConferenceStandings()`, `getTeamPageData()` | edge 3600s / swr 86400s | Dual team-detail URL surfaces share one payload builder. |
| Read APIs | `/api/*` except Elo fresh paths | shared Supabase helpers | mostly edge cache | Search is shorter-lived; players index/docs are 24h edge cached. |
| Elo voting | `/api/rate/pair`, `/api/rate/vote`, `/api/rate/leaderboard` | `eloService.js` + RPCs | `no-store` on fresh endpoints | Only vote writes state. |

### Critical Invariants

- `/player/:nbaId` always loads full history server-side and turns an empty result into HTTP 404. (`src/lib/server/playerPage.js`, `tests/player-page-server-load.test.js`)
- `/compare?ids=` dedupes IDs, preserves first-seen order, and stops at four players. (`src/lib/server/comparePage.js`, `tests/compare-page-server-load.test.js`)
- `/api/player/:id/history` defaults to 1000 rows, caps bounded requests at 2000, and only enters paginated full-history mode when `full=1`. (`src/routes/api/player/[id]/history/+server.js`, `src/lib/server/supabase.js`)
- `getActivePlayers()` uses the latest active date, a 7-day lookback, dedupes by `nba_id`, and sorts by DPM descending before any page/API consumes it. (`src/lib/server/supabase.js`)
- Only `/api/rate/vote` writes state, and it must pass same-origin checks before calling the Supabase RPC. (`src/lib/server/eloSecurity.js`, `src/lib/server/eloService.js`)
- Wide-table horizontal scroll is touch/mobile-only; sticky headers remain a desktop behavior. (`AGENTS.md`, `tests/mobile-table-scroll.test.js`, `tests/wide-sticky-table-layout.test.js`)
- Both team detail URLs are thin wrappers over the shared team payload/view pipeline. (`src/routes/team/[team]/+page.server.js`, `src/routes/standings/[slug]/+page.server.js`, `tests/team-route-wrappers.test.js`)

### Conventions

- All Supabase access lives in `src/lib/server/supabase.js`; route handlers and page loaders stay thin.
- Read endpoints/pages use `setEdgeCache(...)`; fresh Elo surfaces use `no-store` instead of stale edge caching.
- Client fetch helpers live in `src/lib/api.js` and normalize API quirks before components consume them.
- Shared server-side route logic belongs in `src/lib/server/*.js` so multiple routes/tests can reuse it.
- Frontend table sorting/export logic stays in utilities (`sortableTable.js`, `csvPresets.js`) rather than page-local copies.
- Context artifacts are generated from `scripts/context-framework.js`; update the generator and rerun it instead of hand-editing drift-prone sections.

## Public Contract Snapshot

### HTTP Surface

| Route | Methods | Inputs | Returns |
|---|---|---|---|
| `/api/active-players` | `GET` | query: team | current active roster snapshot |
| `/api/img/:type/:id` | `GET` | none | JSON route payload |
| `/api/internal/cache-bust` | `POST` | body: tags | JSON route payload |
| `/api/longevity` | `GET` | none | active-player longevity table |
| `/api/player/:id/history` | `GET` | query: full, limit | bounded or full career history |
| `/api/player/:id/longevity` | `GET` | path: id | player longevity trajectory |
| `/api/players-index` | `GET` | none | full player index |
| `/api/rate/leaderboard` | `GET` | query: limit | Elo leaderboard |
| `/api/rate/pair` | `GET` | none | random Elo comparison pair |
| `/api/rate/vote` | `POST` | body: loser_id, winner_id | vote result plus next pair |
| `/api/search-players` | `GET` | query: q | typeahead search results |
| `/api/standings` | `GET` | query: conference | conference standings payload |
| `/api/standings/:slug` | `GET` | path: slug | team detail payload |

### Page Loaders

| Route | Signature | Returns |
|---|---|---|
| `/` | `load({ setHeaders })` | homepage active-player leaderboard |
| `/compare` | `load({ url })` | preloaded compare cards from `?ids=` |
| `/lineups` | `load({ url, setHeaders })` | server-rendered page payload |
| `/player/:nbaId` | `load({ params, setHeaders })` | full player profile payload |
| `/scatterplot` | `load({ setHeaders })` | server-rendered page payload |
| `/standings` | `load({ setHeaders })` | east/west standings split |
| `/standings/:slug` | `load({ params, setHeaders })` | team detail wrapper payload |
| `/team/:team` | `load({ params, setHeaders })` | legacy team detail wrapper payload |

### Client Fetch Helpers

| Export | Signature |
|---|---|
| `apiActivePlayers` | `apiActivePlayers({ team } = {})` |
| `apiLongevity` | `apiLongevity()` |
| `apiPlayerHistory` | `apiPlayerHistory(nbaId, { limit, full = false, includeMetadata = false } = {})` |
| `apiPlayerLongevity` | `apiPlayerLongevity(nbaId)` |
| `apiPlayersIndex` | `apiPlayersIndex()` |
| `apiRateLeaderboard` | `apiRateLeaderboard(limit = 50)` |
| `apiRateVote` | `apiRateVote(winnerId, loserId)` |
| `apiSearchPlayers` | `apiSearchPlayers(query)` |

### Shared Server Helpers

| Module | Export |
|---|---|
| `playerPage.js` | `loadPlayerPageData({ nbaIdParam, setHeaders, setCacheHeaders, loadFullHistory })` |
| `playerPage.js` | `parsePlayerRouteId(nbaIdParam)` |
| `comparePage.js` | `loadComparePageData({ rawIds, loadFullHistory, buildComparePlayer, getComparePlayerColors })` |
| `comparePage.js` | `parseCompareIds(rawIds)` |
| `eloService.js` | `handleRatePairRequest()` |
| `eloService.js` | `handleRateVoteRequest({ request, headers, url })` |
| `supabase.js` | `clearAllCaches()` |
| `supabase.js` | `getActivePlayers(options = {})` |
| `supabase.js` | `getConferenceStandings(conference)` |
| `supabase.js` | `getEloLeaderboard(limit = 50)` |
| `supabase.js` | `getFullPlayerHistory(nbaId, options = {})` |

## Core Abstractions

- `Active player snapshot` - latest deduped `player_ratings` row per active NBA player, merged with `players` metadata.
- `Full player history` - chronological career rows, capped and flagged when the API enters explicit full-history mode.
- `Team page payload` - `{ teamName, players, sim, winDist }` assembled from active roster, season simulation, and win-distribution tables.
- `Longevity row / trajectory` - retirement-age and survival-probability projections for active players or one player over time.
- `Elo vote result` - one write transaction plus an immediately refreshed next comparison pair.
- `Edge cache policy` - shared cache header contract applied to all read-heavy loaders and API endpoints.

## Module Dependency Map

- `routes:api` -> `server:data`, `server:helpers`, `ui:utils`
- `routes:page-loaders` -> `server:data`, `server:helpers`, `ui:utils`
- `routes:pages` -> `client:api`, `ui:components`, `ui:utils`
- `server:data` -> `server:helpers`, `ui:utils`
- `server:helpers` -> `server:data`
- `tests` -> `client:api`, `server:helpers`, `tooling:context`, `ui:utils`
- `ui:components` -> `client:api`, `ui:utils`

High-fan-in reverse edges:

- `ui:utils` <- `routes:api`, `routes:page-loaders`, `routes:pages`, `server:data`, `tests`, `ui:components`
- `server:helpers` <- `routes:api`, `routes:page-loaders`, `server:data`, `tests`
- `client:api` <- `routes:pages`, `tests`, `ui:components`
- `server:data` <- `routes:api`, `routes:page-loaders`, `server:helpers`

## Interface Surface

- Pages: home leaderboard, player profile, compare, standings, team detail, longevity, trajectories, projections, lineups, rate, about.
- JSON APIs: active players, search, players index, player history, player longevity, longevity table, standings/team detail, Elo pair/vote/leaderboard, docs.
- Public machine-readable API documentation is served by `/api/docs` and should stay consistent with real handlers.

## Persistence / Side Effects

- Read-heavy data comes from Supabase tables `player_ratings`, `players`, `season_sim`, and `win_distribution`.
- Elo state changes happen through the Supabase RPCs behind `getRandomPair()` and `recordVote()`, surfaced only via `/api/rate/*`.
- Request-time side effects are limited to cache headers, canonical GET redirects in `src/hooks.server.js`, and client-side CSV/image downloads.

## Where To Edit

| Task | Start here | Also touch | Primary bundle |
|---|---|---|---|
| Supabase query shape, cache TTLs, or analytical row assembly | `src/lib/server/supabase.js` | `src/routes/api/**/+server.js`, `tests/supabase-query-shape.test.js`, `SUPABASE_SCHEMA.md` | `COMPRESSED_data_api.md` |
| Player page SSR or history contract | `src/lib/server/playerPage.js` | `src/routes/player/[nbaId]/+page.server.js`, `src/routes/api/player/[id]/history/+server.js`, `tests/player-page-server-load.test.js`, `tests/api-player-history.test.js` | `COMPRESSED_data_api.md` |
| Compare query parsing or preloaded compare cards | `src/lib/server/comparePage.js` | `src/routes/compare/+page.server.js`, `src/lib/utils/compareUtils.js`, `tests/compare-page-server-load.test.js` | `COMPRESSED_data_api.md` |
| Team detail / standings data wiring | `src/routes/api/standings/+server.js` or `src/routes/api/standings/[slug]/+server.js` | `src/routes/standings/+page.server.js`, `src/routes/team/[team]/+page.server.js`, `src/lib/server/supabase.js` | `COMPRESSED_data_api.md` |
| Longevity tables or trajectory endpoints | `src/routes/api/longevity/+server.js` or `src/routes/api/player/[id]/longevity/+server.js` | `src/lib/server/supabase.js`, `src/routes/longevity/+page.svelte`, `src/lib/components/Longevity*` | `COMPRESSED_data_api.md` |
| Elo voting, pair generation, or leaderboard behavior | `src/lib/server/eloService.js` | `src/lib/server/eloSecurity.js`, `src/lib/server/supabase.js`, `src/routes/api/rate/*/+server.js`, `src/routes/rate/+page.svelte` | `COMPRESSED_data_api.md` |
| Search/autocomplete and client fetch helpers | `src/lib/api.js` | `src/routes/api/search-players/+server.js`, `src/lib/components/PlayerSearch.svelte`, `src/lib/components/AllPlayerSearch.svelte` | `COMPRESSED_data_api.md` |
| Charts, D3 responsiveness, or SVG export behavior | `src/lib/components/*Chart.svelte` | `src/lib/utils/chartLayout.js`, `src/lib/utils/chartImageExport.js`, `src/lib/utils/chartQuickExport.js`, chart-related tests | `COMPRESSED_ui_charts.md` |
| Sticky tables, mobile scroll, CSV exports, or metric labels | `src/lib/components/LegacyLeaderboard.svelte` or page table route | `src/lib/utils/wideStickyTable.js`, `src/lib/utils/csvPresets.js`, `src/lib/utils/metricDefinitions.js`, table/export tests | `COMPRESSED_ui_tables.md` |
| Canonical URL cleanup or request-time routing behavior | `src/hooks.server.js` | `src/routes/+layout.svelte`, any affected deep-link route tests | `COMPRESSED_pages_routes.md` |
| LLM context artifacts, bundle splits, or drift tests | `scripts/context-framework.js` | `scripts/generate_repo_architecture_sync.js`, `scripts/build_context_bundle.js`, `tests/context-framework.test.js`, `context/REPO_ARCHITECTURE.md` | `COMPRESSED_tests_context.md` |

## Bundle Picker

| Task area | Bundle |
|---|---|
| config, Supabase access, API handlers, shared server loaders, and persistence-facing contracts | `COMPRESSED_data_api.md` |
| routing hooks, server load wrappers, route composition, and app-shell navigation behavior | `COMPRESSED_pages_routes.md` |
| chart components, trend rendering, resize behavior, and image/export support | `COMPRESSED_ui_charts.md` |
| sticky tables, CSV/export helpers, leaderboard/search UI, and metric labeling utilities | `COMPRESSED_ui_tables.md` |
| tests, governance docs, repo manifests, and the scripts that generate context artifacts | `COMPRESSED_tests_context.md` |

Default: `context/REPO_ARCHITECTURE.md` + `context/COMPRESSED_data_api.md` + your question.
For implementation tasks, also paste raw source of the files you're editing.

## Module Catalog

- `src/lib/server/` is the service layer: query composition, cache helpers, shared page loaders, and Elo security/write orchestration.
- `src/routes/` is composition-first: page shells plus thin `+page.server.js` or `+server.js` wrappers around shared helpers.
- `src/lib/components/` and `src/lib/utils/` hold the behavior-rich frontend logic: D3 rendering, responsive chart layout, sticky tables, CSV export, and quick image export.
- `supabase/migrations/` captures the write-path and permission history for the Elo feature; `SUPABASE_SCHEMA.md` is the higher-level schema contract.
- `tests/` covers routing contracts, sticky/mobile table invariants, chart responsiveness, export flows, and context-framework drift. `scripts/` owns generation of the context layer.
