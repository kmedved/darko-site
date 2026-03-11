# FILE_INDEX

Use this for oracle workflows.
Pair with `context/REPO_ARCHITECTURE.md`.
For implementation work, request or paste raw source for the files you expect to change.

## Root Docs & Manifests

- `.gitignore` - Git ignore rules.
- `.repomixignore` - Repomix-specific excludes for generated/local-only artifacts.
- `AGENTS.md` - Repo-specific coding rules and frontend/table invariants.
- `CLAUDE.md` - Contributor/agent command and runtime notes.
- `SUPABASE_SCHEMA.md` - Schema and pipeline-facing data contract reference.
- `package.json` - Version and npm scripts.
- `repomix.config.json` - Repomix root configuration for local bundle generation.
- `svelte.config.js` - SvelteKit adapter/config.
- `vite.config.js` - Vite build config.

## context

- `context/FILE_INDEX.md` - Oracle file catalog.
- `context/REPO_ARCHITECTURE.md` - Primary prompt artifact.
- `context/REPO_ARCHITECTURE_SYNC.json` - Machine-checked sync snapshot.
- `context/START_HERE.md` - Human paste-order guide.

## scripts

- `scripts/build_context_bundle.js` - context script
- `scripts/context-framework.js` - context script
- `scripts/generate_repo_architecture_sync.js` - context script

## src

- `src/app.css` - source
- `src/app.html` - source
- `src/hooks.server.js` - Canonicalizes GET URLs by stripping tracking parameters.

## src/lib

- `src/lib/api.js` - Client-side fetch helpers that normalize API responses.

## src/lib/components

- `src/lib/components/AllPlayerSearch.svelte` - component
- `src/lib/components/ChartDownloadMenu.svelte` - component
- `src/lib/components/ConferenceChart.svelte` - component
- `src/lib/components/DpmChart.svelte` - component
- `src/lib/components/LegacyLeaderboard.svelte` - component
- `src/lib/components/LongevityCareerLengthChart.svelte` - component
- `src/lib/components/LongevityRosterChart.svelte` - component
- `src/lib/components/MetricTooltip.svelte` - component
- `src/lib/components/PlayerCard.svelte` - component
- `src/lib/components/PlayerSearch.svelte` - component
- `src/lib/components/PlayerSearchField.svelte` - component
- `src/lib/components/RatePlayerCard.svelte` - component
- `src/lib/components/ScatterplotChart.svelte` - component
- `src/lib/components/SeedChart.svelte` - component
- `src/lib/components/TalentPercentilesChart.svelte` - component
- `src/lib/components/TalentTrendChart.svelte` - component
- `src/lib/components/TeamDetailView.svelte` - component
- `src/lib/components/TrajectoryChart.svelte` - component
- `src/lib/components/WinDistChart.svelte` - component

## src/lib/data

- `src/lib/data/longevityScaffold.js` - static data

## src/lib/server

- `src/lib/server/cacheHeaders.js` - server helper
- `src/lib/server/comparePage.js` - server helper
- `src/lib/server/eloSecurity.js` - server helper
- `src/lib/server/eloService.js` - server helper
- `src/lib/server/lineupRatings.js` - server helper
- `src/lib/server/lineupsPage.js` - server helper
- `src/lib/server/playerPage.js` - server helper
- `src/lib/server/supabase.js` - Supabase query layer, in-memory caches, and Elo RPC access.
- `src/lib/server/teamPage.js` - server helper

## src/lib/utils

- `src/lib/utils/chartImageExport.js` - util
- `src/lib/utils/chartLayout.js` - util
- `src/lib/utils/chartQuickExport.js` - util
- `src/lib/utils/chartResizeObserver.js` - util
- `src/lib/utils/compareUtils.js` - util
- `src/lib/utils/csv.js` - util
- `src/lib/utils/csvPresets.js` - util
- `src/lib/utils/leaderboardColumns.js` - util
- `src/lib/utils/leaderboardCsv.js` - util
- `src/lib/utils/legacyLeaderboard.js` - util
- `src/lib/utils/loess.js` - util
- `src/lib/utils/longevityTable.js` - util
- `src/lib/utils/metricDefinitions.js` - util
- `src/lib/utils/playerSearch.js` - util
- `src/lib/utils/requestSequencer.js` - util
- `src/lib/utils/seasonUtils.js` - util
- `src/lib/utils/sortableTable.js` - util
- `src/lib/utils/supabaseConfig.js` - util
- `src/lib/utils/teamAbbreviations.js` - util
- `src/lib/utils/teamRouteUtils.js` - util
- `src/lib/utils/wideStickyTable.js` - util

## src/routes

- `src/routes/+layout.svelte` - source
- `src/routes/+page.server.js` - load /
- `src/routes/+page.svelte` - page /
- `src/routes/about/+page.svelte` - page /about
- `src/routes/compare/+page.server.js` - load /compare
- `src/routes/compare/+page.svelte` - page /compare
- `src/routes/favicon.ico/+server.js` - API /favicon.ico
- `src/routes/lineups/+page.server.js` - load /lineups
- `src/routes/lineups/+page.svelte` - page /lineups
- `src/routes/longevity/+page.svelte` - page /longevity
- `src/routes/player/[nbaId]/+page.server.js` - load /player/:nbaId
- `src/routes/player/[nbaId]/+page.svelte` - page /player/:nbaId
- `src/routes/projections/+page.svelte` - page /projections
- `src/routes/rate/+page.svelte` - page /rate
- `src/routes/scatterplot/+page.server.js` - load /scatterplot
- `src/routes/scatterplot/+page.svelte` - page /scatterplot
- `src/routes/standings/+page.server.js` - load /standings
- `src/routes/standings/+page.svelte` - page /standings
- `src/routes/standings/[slug]/+page.server.js` - load /standings/:slug
- `src/routes/standings/[slug]/+page.svelte` - page /standings/:slug
- `src/routes/team/[team]/+page.server.js` - load /team/:team
- `src/routes/team/[team]/+page.svelte` - page /team/:team
- `src/routes/trajectories/+page.svelte` - page /trajectories

## src/routes/api

- `src/routes/api/active-players/+server.js` - API /api/active-players
- `src/routes/api/docs/+server.js` - API /api/docs
- `src/routes/api/img/[type]/[id]/+server.js` - API /api/img/:type/:id
- `src/routes/api/internal/cache-bust/+server.js` - API /api/internal/cache-bust
- `src/routes/api/longevity/+server.js` - API /api/longevity
- `src/routes/api/player/[id]/history/+server.js` - API /api/player/:id/history
- `src/routes/api/player/[id]/longevity/+server.js` - API /api/player/:id/longevity
- `src/routes/api/players-index/+server.js` - API /api/players-index
- `src/routes/api/rate/leaderboard/+server.js` - API /api/rate/leaderboard
- `src/routes/api/rate/pair/+server.js` - API /api/rate/pair
- `src/routes/api/rate/vote/+server.js` - API /api/rate/vote
- `src/routes/api/search-players/+server.js` - API /api/search-players
- `src/routes/api/standings/+server.js` - API /api/standings
- `src/routes/api/standings/[slug]/+server.js` - API /api/standings/:slug

## supabase/migrations

- `supabase/migrations/20260303_001_enable_players_rls.sql` - Supabase SQL migration.
- `supabase/migrations/20260303_002_harden_elo_vote_path.sql` - Supabase SQL migration.
- `supabase/migrations/20260305_001_secure_elo_vote_and_rate_limits.sql` - Supabase SQL migration.
- `supabase/migrations/20260306_001_simplify_elo_permissions.sql` - Supabase SQL migration.

## tests

- `tests/api-active-players-cache.test.js` - test
- `tests/api-player-history.test.js` - test
- `tests/aria-label-bindings.test.js` - test
- `tests/chart-download-integration.test.js` - test
- `tests/chart-image-export.test.js` - test
- `tests/chart-layout.test.js` - test
- `tests/chart-quick-export.test.js` - test
- `tests/chart-resize-hosts.test.js` - test
- `tests/compare-page-server-load.test.js` - test
- `tests/compare-utils.test.js` - test
- `tests/context-framework.test.js` - test
- `tests/csv-formatters.test.js` - test
- `tests/d3-theme-colors.test.js` - test
- `tests/leaderboard-export.test.js` - test
- `tests/legacy-leaderboard.test.js` - test
- `tests/lineup-ratings.test.js` - test
- `tests/lineups-csv.test.js` - test
- `tests/lineups-page-loader.test.js` - test
- `tests/longevity-csv.test.js` - test
- `tests/longevity-table.test.js` - test
- `tests/mobile-table-scroll.test.js` - test
- `tests/package-json-hygiene.test.js` - test
- `tests/player-page-server-load.test.js` - test
- `tests/player-search-contracts.test.js` - test
- `tests/player-search.test.js` - test
- `tests/request-sequencer.test.js` - test
- `tests/season-utils.test.js` - test
- `tests/sticky-header-overflow.test.js` - test
- `tests/supabase-config.test.js` - test
- `tests/supabase-query-shape.test.js` - test
- `tests/team-page-loader-contracts.test.js` - test
- `tests/team-route-utils.test.js` - test
- `tests/team-route-wrappers.test.js` - test
- `tests/trajectories-mobile-layout.test.js` - test
- `tests/wide-sticky-table-layout.test.js` - test
