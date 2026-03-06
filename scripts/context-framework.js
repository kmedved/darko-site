import fs from 'node:fs/promises';
import path from 'node:path';
import { getEncoding } from 'js-tiktoken';

export const CONTEXT_DIR = 'context';
export const START_HERE_PATH = `${CONTEXT_DIR}/START_HERE.md`;
export const ARCHITECTURE_DOC_PATH = `${CONTEXT_DIR}/REPO_ARCHITECTURE.md`;
export const ARCHITECTURE_SYNC_PATH = `${CONTEXT_DIR}/REPO_ARCHITECTURE_SYNC.json`;
export const FILE_INDEX_PATH = `${CONTEXT_DIR}/FILE_INDEX.md`;
export const CONTEXT_BUDGET_PATH = `${CONTEXT_DIR}/CONTEXT_BUDGET.md`;
export const CONTEXT_INDEX_PATH = `${CONTEXT_DIR}/CONTEXT_INDEX.md`;

export const REPO_CLASSIFICATION = Object.freeze({
    primary: 'Service / App',
    secondary: ['Data / Workflow / Pipeline'],
    topology: 'single-unit',
    versionPolicy: 'Policy B: only shipped/runtime behavior changes bump version.'
});

export const CORE_ABSTRACTIONS = Object.freeze([
    '`Active player snapshot` - latest deduped `player_ratings` row per active NBA player, merged with `players` metadata.',
    '`Full player history` - chronological career rows, capped and flagged when the API enters explicit full-history mode.',
    '`Team page payload` - `{ teamName, players, sim, winDist }` assembled from active roster, season simulation, and win-distribution tables.',
    '`Longevity row / trajectory` - retirement-age and survival-probability projections for active players or one player over time.',
    '`Elo vote result` - one write transaction plus an immediately refreshed next comparison pair.',
    '`Edge cache policy` - shared cache header contract applied to all read-heavy loaders and API endpoints.'
]);

export const CRITICAL_INVARIANTS = Object.freeze([
    '`/player/:nbaId` always loads full history server-side and turns an empty result into HTTP 404. (`src/lib/server/playerPage.js`, `tests/player-page-server-load.test.js`)',
    '`/compare?ids=` dedupes IDs, preserves first-seen order, and stops at four players. (`src/lib/server/comparePage.js`, `tests/compare-page-server-load.test.js`)',
    '`/api/player/:id/history` defaults to 1000 rows, caps bounded requests at 2000, and only enters paginated full-history mode when `full=1`. (`src/routes/api/player/[id]/history/+server.js`, `src/lib/server/supabase.js`)',
    '`getActivePlayers()` uses the latest active date, a 7-day lookback, dedupes by `nba_id`, and sorts by DPM descending before any page/API consumes it. (`src/lib/server/supabase.js`)',
    'Only `/api/rate/vote` writes state, and it must pass same-origin checks before calling the Supabase RPC. (`src/lib/server/eloSecurity.js`, `src/lib/server/eloService.js`)',
    'Wide-table horizontal scroll is touch/mobile-only; sticky headers remain a desktop behavior. (`AGENTS.md`, `tests/mobile-table-scroll.test.js`, `tests/wide-sticky-table-layout.test.js`)',
    'Both team detail URLs are thin wrappers over the shared team payload/view pipeline. (`src/routes/team/[team]/+page.server.js`, `src/routes/standings/[slug]/+page.server.js`, `tests/team-route-wrappers.test.js`)'
]);

export const CONVENTIONS = Object.freeze([
    'All Supabase access lives in `src/lib/server/supabase.js`; route handlers and page loaders stay thin.',
    'Read endpoints/pages use `setEdgeCache(...)`; fresh Elo surfaces use `no-store` instead of stale edge caching.',
    'Client fetch helpers live in `src/lib/api.js` and normalize API quirks before components consume them.',
    'Shared server-side route logic belongs in `src/lib/server/*.js` so multiple routes/tests can reuse it.',
    'Frontend table sorting/export logic stays in utilities (`sortableTable.js`, `csvPresets.js`) rather than page-local copies.',
    'Context artifacts are generated from `scripts/context-framework.js`; update the generator and rerun it instead of hand-editing drift-prone sections.'
]);

export const WHERE_TO_EDIT_ROWS = Object.freeze([
    {
        task: 'Supabase query shape, cache TTLs, or analytical row assembly',
        startHere: '`src/lib/server/supabase.js`',
        alsoTouch: '`src/routes/api/**/+server.js`, `tests/supabase-query-shape.test.js`, `SUPABASE_SCHEMA.md`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Player page SSR or history contract',
        startHere: '`src/lib/server/playerPage.js`',
        alsoTouch: '`src/routes/player/[nbaId]/+page.server.js`, `src/routes/api/player/[id]/history/+server.js`, `tests/player-page-server-load.test.js`, `tests/api-player-history.test.js`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Compare query parsing or preloaded compare cards',
        startHere: '`src/lib/server/comparePage.js`',
        alsoTouch: '`src/routes/compare/+page.server.js`, `src/lib/utils/compareUtils.js`, `tests/compare-page-server-load.test.js`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Team detail / standings data wiring',
        startHere: '`src/routes/api/standings/+server.js` or `src/routes/api/standings/[slug]/+server.js`',
        alsoTouch: '`src/routes/standings/+page.server.js`, `src/routes/team/[team]/+page.server.js`, `src/lib/server/supabase.js`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Longevity tables or trajectory endpoints',
        startHere: '`src/routes/api/longevity/+server.js` or `src/routes/api/player/[id]/longevity/+server.js`',
        alsoTouch: '`src/lib/server/supabase.js`, `src/routes/longevity/+page.svelte`, `src/lib/components/Longevity*`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Elo voting, pair generation, or leaderboard behavior',
        startHere: '`src/lib/server/eloService.js`',
        alsoTouch: '`src/lib/server/eloSecurity.js`, `src/lib/server/supabase.js`, `src/routes/api/rate/*/+server.js`, `src/routes/rate/+page.svelte`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Search/autocomplete and client fetch helpers',
        startHere: '`src/lib/api.js`',
        alsoTouch: '`src/routes/api/search-players/+server.js`, `src/lib/components/PlayerSearch.svelte`, `src/lib/components/AllPlayerSearch.svelte`',
        primaryBundle: 'COMPRESSED_data_api.md'
    },
    {
        task: 'Charts, D3 responsiveness, or SVG export behavior',
        startHere: '`src/lib/components/*Chart.svelte`',
        alsoTouch: '`src/lib/utils/chartLayout.js`, `src/lib/utils/chartImageExport.js`, `src/lib/utils/chartQuickExport.js`, chart-related tests',
        primaryBundle: 'COMPRESSED_ui_charts.md'
    },
    {
        task: 'Sticky tables, mobile scroll, CSV exports, or metric labels',
        startHere: '`src/lib/components/LegacyLeaderboard.svelte` or page table route',
        alsoTouch: '`src/lib/utils/wideStickyTable.js`, `src/lib/utils/csvPresets.js`, `src/lib/utils/metricDefinitions.js`, table/export tests',
        primaryBundle: 'COMPRESSED_ui_tables.md'
    },
    {
        task: 'Canonical URL cleanup or request-time routing behavior',
        startHere: '`src/hooks.server.js`',
        alsoTouch: '`src/routes/+layout.svelte`, any affected deep-link route tests',
        primaryBundle: 'COMPRESSED_pages_routes.md'
    },
    {
        task: 'LLM context artifacts, bundle splits, or drift tests',
        startHere: '`scripts/context-framework.js`',
        alsoTouch: '`scripts/generate_repo_architecture_sync.js`, `scripts/build_context_bundle.js`, `tests/context-framework.test.js`, `context/REPO_ARCHITECTURE.md`',
        primaryBundle: 'COMPRESSED_tests_context.md'
    }
]);

export const BUNDLE_DEFINITIONS = Object.freeze([
    {
        name: 'COMPRESSED_data_api.md',
        purpose: 'config, Supabase access, API handlers, shared server loaders, and persistence-facing contracts',
        taskAreas: [
            'Supabase query shape, cache TTLs, or analytical row assembly',
            'Player page SSR or history contract',
            'Compare query parsing or preloaded compare cards',
            'Team detail / standings data wiring',
            'Longevity tables or trajectory endpoints',
            'Elo voting, pair generation, or leaderboard behavior',
            'Search/autocomplete and client fetch helpers'
        ],
        sourcePaths: [
            'src/lib/server/supabase.js',
            'src/lib/server/playerPage.js',
            'src/lib/server/comparePage.js',
            'src/lib/server/eloService.js',
            'src/lib/server/eloSecurity.js',
            'src/lib/server/cacheHeaders.js',
            'src/lib/api.js',
            'src/routes/api/player/[id]/history/+server.js',
            'src/routes/api/rate/vote/+server.js',
            'src/routes/api/standings/[slug]/+server.js'
        ],
        matcher(relPath) {
            return (
                relPath === 'SUPABASE_SCHEMA.md' ||
                relPath.startsWith('supabase/migrations/') ||
                relPath === 'src/lib/api.js' ||
                relPath.startsWith('src/lib/server/') ||
                relPath.startsWith('src/routes/api/')
            );
        }
    },
    {
        name: 'COMPRESSED_pages_routes.md',
        purpose: 'routing hooks, server load wrappers, route composition, and app-shell navigation behavior',
        taskAreas: [
            'Canonical URL cleanup or request-time routing behavior'
        ],
        sourcePaths: [
            'src/hooks.server.js',
            'src/routes/+layout.svelte',
            'src/routes/+page.server.js',
            'src/routes/player/[nbaId]/+page.server.js',
            'src/routes/compare/+page.server.js',
            'src/routes/standings/+page.server.js',
            'src/routes/standings/[slug]/+page.server.js',
            'src/routes/team/[team]/+page.server.js'
        ],
        matcher(relPath) {
            return (
                relPath === 'src/hooks.server.js' ||
                relPath === 'src/app.html' ||
                relPath === 'src/app.css' ||
                relPath === 'src/routes/+layout.svelte' ||
                relPath.startsWith('src/routes/') && !relPath.startsWith('src/routes/api/')
            );
        }
    },
    {
        name: 'COMPRESSED_ui_charts.md',
        purpose: 'chart components, trend rendering, resize behavior, and image/export support',
        taskAreas: [
            'Charts, D3 responsiveness, or SVG export behavior'
        ],
        sourcePaths: [
            'src/lib/components/TrajectoryChart.svelte',
            'src/lib/components/TalentTrendChart.svelte',
            'src/lib/components/DpmChart.svelte',
            'src/lib/utils/chartLayout.js',
            'src/lib/utils/chartImageExport.js',
            'src/lib/utils/chartQuickExport.js',
            'src/lib/utils/chartResizeObserver.js',
            'src/lib/utils/loess.js'
        ],
        matcher(relPath) {
            return (
                relPath.startsWith('src/lib/components/') && relPath.includes('Chart') ||
                relPath === 'src/lib/components/MetricTooltip.svelte' ||
                relPath.startsWith('src/lib/utils/chart') ||
                relPath === 'src/lib/utils/loess.js' ||
                relPath === 'src/lib/data/longevityScaffold.js'
            );
        }
    },
    {
        name: 'COMPRESSED_ui_tables.md',
        purpose: 'sticky tables, CSV/export helpers, leaderboard/search UI, and metric labeling utilities',
        taskAreas: [
            'Sticky tables, mobile scroll, CSV exports, or metric labels'
        ],
        sourcePaths: [
            'src/lib/components/LegacyLeaderboard.svelte',
            'src/lib/components/PlayerSearch.svelte',
            'src/lib/components/AllPlayerSearch.svelte',
            'src/lib/utils/csvPresets.js',
            'src/lib/utils/sortableTable.js',
            'src/lib/utils/wideStickyTable.js',
            'src/lib/utils/metricDefinitions.js',
            'src/lib/utils/leaderboardCsv.js',
            'src/lib/utils/leaderboardColumns.js',
            'src/lib/utils/longevityTable.js'
        ],
        matcher(relPath) {
            return (
                relPath === 'src/lib/components/LegacyLeaderboard.svelte' ||
                relPath === 'src/lib/components/PlayerSearch.svelte' ||
                relPath === 'src/lib/components/AllPlayerSearch.svelte' ||
                relPath === 'src/lib/components/PlayerCard.svelte' ||
                relPath === 'src/lib/components/RatePlayerCard.svelte' ||
                relPath.startsWith('src/lib/utils/csv') ||
                relPath === 'src/lib/utils/sortableTable.js' ||
                relPath === 'src/lib/utils/wideStickyTable.js' ||
                relPath === 'src/lib/utils/metricDefinitions.js' ||
                relPath.startsWith('src/lib/utils/leaderboard') ||
                relPath === 'src/lib/utils/longevityTable.js' ||
                relPath === 'src/lib/utils/legacyLeaderboard.js' ||
                relPath === 'src/lib/utils/requestSequencer.js' ||
                relPath === 'src/lib/utils/seasonUtils.js'
            );
        }
    },
    {
        name: 'COMPRESSED_tests_context.md',
        purpose: 'tests, governance docs, repo manifests, and the scripts that generate context artifacts',
        taskAreas: [
            'LLM context artifacts, bundle splits, or drift tests'
        ],
        sourcePaths: [
            'tests/context-framework.test.js',
            'scripts/generate_repo_architecture_sync.js',
            'scripts/build_context_bundle.js',
            'AGENTS.md',
            'CLAUDE.md',
            'repomix.config.json',
            '.repomixignore',
            '.gitignore'
        ],
        matcher(relPath) {
            return (
                relPath.startsWith('tests/') ||
                relPath.startsWith('scripts/') ||
                relPath === 'AGENTS.md' ||
                relPath === 'CLAUDE.md' ||
                relPath === '.gitignore' ||
                relPath === '.repomixignore' ||
                relPath === 'package.json' ||
                relPath === 'package-lock.json' ||
                relPath === 'bun.lock' ||
                relPath === 'svelte.config.js' ||
                relPath === 'vite.config.js' ||
                relPath === 'repomix.config.json'
            );
        }
    }
]);

export const BUNDLE_CONTRACT = Object.freeze({
    default_bundle: 'COMPRESSED_data_api.md',
    bundles: BUNDLE_DEFINITIONS.map((definition) => ({
        name: definition.name,
        purpose: definition.purpose
    }))
});

const ROOT_MANIFEST_FILES = new Set([
    '.gitignore',
    '.repomixignore',
    'AGENTS.md',
    'CLAUDE.md',
    'SUPABASE_SCHEMA.md',
    'package.json',
    'repomix.config.json',
    'svelte.config.js',
    'vite.config.js'
]);

const STABLE_CONTEXT_FILES = new Set([
    START_HERE_PATH,
    ARCHITECTURE_DOC_PATH,
    ARCHITECTURE_SYNC_PATH,
    FILE_INDEX_PATH
]);

const WALK_IGNORE_DIRS = new Set([
    '.git',
    '.idea',
    '.svelte-kit',
    '.vercel',
    'build',
    'coverage',
    'dist',
    'node_modules'
]);

const WALK_IGNORE_FILES = new Set([
    '.DS_Store'
]);

let tokenizer;

function getTokenizer() {
    if (!tokenizer) {
        tokenizer = getEncoding('o200k_base');
    }
    return tokenizer;
}

function toPosix(value) {
    return value.split(path.sep).join('/');
}

function sortValue(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortValue(item));
    }

    if (value && typeof value === 'object') {
        const sortedEntries = Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, nested]) => [key, sortValue(nested)]);
        return Object.fromEntries(sortedEntries);
    }

    return value;
}

async function readFile(rootDir, relPath) {
    return fs.readFile(path.join(rootDir, relPath), 'utf8');
}

async function walk(rootDir, currentRel = '', acc = []) {
    const currentPath = currentRel ? path.join(rootDir, currentRel) : rootDir;
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
        if (WALK_IGNORE_FILES.has(entry.name)) {
            continue;
        }

        const relPath = currentRel ? toPosix(path.join(currentRel, entry.name)) : entry.name;

        if (entry.isDirectory()) {
            if (WALK_IGNORE_DIRS.has(entry.name)) {
                continue;
            }

            await walk(rootDir, relPath, acc);
            continue;
        }

        if (isArchitectureRelevant(relPath)) {
            acc.push(relPath);
        }
    }

    return acc;
}

function isArchitectureRelevant(relPath) {
    if (ROOT_MANIFEST_FILES.has(relPath) || STABLE_CONTEXT_FILES.has(relPath)) {
        return true;
    }

    return (
        relPath.startsWith('supabase/migrations/') ||
        relPath.startsWith('src/') ||
        relPath.startsWith('tests/') ||
        relPath.startsWith('scripts/')
    );
}

function routePathFromFile(relPath) {
    const withoutRoutesPrefix = relPath.replace(/^src\/routes/, '').replace(/\/\+page\.server\.js$/, '').replace(/\/\+server\.js$/, '').replace(/\/\+page\.svelte$/, '');
    if (!withoutRoutesPrefix) {
        return '/';
    }

    return (
        withoutRoutesPrefix
            .split('/')
            .filter(Boolean)
            .map((segment) => {
                const dynamic = segment.match(/^\[(.+)\]$/);
                if (dynamic) {
                    return `:${dynamic[1]}`;
                }

                return segment;
            })
            .join('/')
            .replace(/^/, '/')
    );
}

function normalizeWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function readBalancedValue(source, startIndex, openChar = '(', closeChar = ')') {
    let depth = 0;

    for (let index = startIndex; index < source.length; index += 1) {
        const char = source[index];

        if (char === openChar) {
            depth += 1;
        } else if (char === closeChar) {
            depth -= 1;
            if (depth === 0) {
                return source.slice(startIndex + 1, index);
            }
        }
    }

    return '';
}

function extractFunctionExports(source) {
    const exports = [];
    const functionRegex = /export\s+(async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;

    for (const match of source.matchAll(functionRegex)) {
        const name = match[2];
        const openParenIndex = source.indexOf('(', match.index);
        const params = normalizeWhitespace(readBalancedValue(source, openParenIndex));
        exports.push({
            kind: 'function',
            async: Boolean(match[1]),
            name,
            signature: `${name}(${params})`
        });
    }

    const arrowRegex = /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(async\s*)?\(/g;
    for (const match of source.matchAll(arrowRegex)) {
        const name = match[1];
        const openParenIndex = source.indexOf('(', match.index);
        const params = normalizeWhitespace(readBalancedValue(source, openParenIndex));
        exports.push({
            kind: 'function',
            async: Boolean(match[2]),
            name,
            signature: `${name}(${params})`
        });
    }

    const constRegex = /export\s+const\s+([A-Za-z0-9_]+)\s*=\s*([^;\n]+)/g;
    for (const match of source.matchAll(constRegex)) {
        const name = match[1];
        if (exports.some((entry) => entry.name === name)) {
            continue;
        }

        exports.push({
            kind: 'const',
            name,
            signature: `${name} = ${normalizeWhitespace(match[2])}`
        });
    }

    return exports.sort((left, right) => left.name.localeCompare(right.name));
}

function extractImportSpecifiers(source) {
    const specifiers = [];
    const importRegex = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

    for (const match of source.matchAll(importRegex)) {
        specifiers.push(match[1]);
    }

    return specifiers;
}

function resolveInternalImport(relPath, specifier) {
    if (specifier.startsWith('$lib/')) {
        return specifier.replace(/^\$lib\//, 'src/lib/');
    }

    if (specifier.startsWith('./') || specifier.startsWith('../')) {
        return toPosix(path.normalize(path.join(path.dirname(relPath), specifier)));
    }

    return null;
}

function groupForPath(relPath) {
    if (relPath.startsWith('context/')) return 'context:artifacts';
    if (relPath.startsWith('supabase/migrations/')) return 'database:migrations';
    if (relPath.startsWith('src/routes/api/')) return 'routes:api';
    if (relPath.startsWith('src/routes/') && relPath.endsWith('+page.server.js')) return 'routes:page-loaders';
    if (relPath.startsWith('src/routes/')) return 'routes:pages';
    if (relPath === 'src/lib/api.js') return 'client:api';
    if (relPath === 'src/lib/server/supabase.js') return 'server:data';
    if (relPath.startsWith('src/lib/server/')) return 'server:helpers';
    if (relPath.startsWith('src/lib/components/')) return 'ui:components';
    if (relPath.startsWith('src/lib/utils/')) return 'ui:utils';
    if (relPath.startsWith('src/lib/data/')) return 'data:static';
    if (relPath === 'src/hooks.server.js') return 'platform:hooks';
    if (relPath.startsWith('tests/')) return 'tests';
    if (relPath.startsWith('scripts/')) return 'tooling:context';
    if (relPath === 'AGENTS.md' || relPath === 'CLAUDE.md') return 'governance';
    if (relPath.endsWith('.json') || relPath.endsWith('.lock') || relPath.endsWith('.js')) return 'tooling:repo';
    return 'misc';
}

function extractCachePolicy(source) {
    if (/cache-control': 'no-store'/.test(source) || /"cache-control": "no-store"/.test(source)) {
        return {
            type: 'no-store'
        };
    }

    const match = source.match(/setEdgeCache\(setHeaders,\s*\{([\s\S]*?)\}\s*\)/);
    if (!match) {
        return {
            type: 'unspecified'
        };
    }

    const block = match[1];
    const edgeSMaxAge = Number.parseInt(block.match(/edgeSMaxAge:\s*(\d+)/)?.[1] || '3600', 10);
    const swr = Number.parseInt(block.match(/swr:\s*(\d+)/)?.[1] || '86400', 10);
    const sie = Number.parseInt(block.match(/sie:\s*(\d+)/)?.[1] || '86400', 10);

    return {
        type: 'edge',
        edgeSMaxAge,
        swr,
        sie
    };
}

function extractConstObject(source, constName) {
    const startMatch = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\{`));
    if (!startMatch) {
        return null;
    }

    const openBraceIndex = source.indexOf('{', startMatch.index);
    const block = readBalancedValue(source, openBraceIndex, '{', '}');
    const edgeSMaxAge = Number.parseInt(block.match(/edgeSMaxAge:\s*(\d+)/)?.[1] || '3600', 10);
    const swr = Number.parseInt(block.match(/swr:\s*(\d+)/)?.[1] || '86400', 10);
    const sie = Number.parseInt(block.match(/sie:\s*(\d+)/)?.[1] || '86400', 10);

    return {
        type: 'edge',
        edgeSMaxAge,
        swr,
        sie
    };
}

function extractSearchParams(source) {
    return [...new Set([...source.matchAll(/searchParams\.get\('([^']+)'\)/g)].map((match) => match[1]))].sort();
}

function extractPathParams(source) {
    return [...new Set([...source.matchAll(/params\.([A-Za-z0-9_]+)/g)].map((match) => match[1]))].sort();
}

function extractBodyFields(source) {
    const fields = new Set();
    for (const match of source.matchAll(/body\?\.(\w+)/g)) {
        fields.add(match[1]);
    }
    for (const match of source.matchAll(/JSON\.stringify\(\{\s*([^}]+)\}\)/g)) {
        const entries = match[1].split(',').map((part) => part.trim());
        for (const entry of entries) {
            const key = entry.split(':')[0]?.trim();
            if (key) {
                fields.add(key.replace(/['"]/g, ''));
            }
        }
    }
    return [...fields].sort();
}

function summarizeRouteDataSources(source) {
    return [...new Set(
        [...source.matchAll(/import\s+\{([^}]+)\}\s+from\s+['"]\$lib\/([^'"]+)['"]/g)]
            .flatMap((match) =>
                match[1]
                    .split(',')
                    .map((part) => normalizeWhitespace(part))
                    .filter(Boolean)
                    .map((name) => `$lib/${match[2]}:${name}`)
            )
    )].sort();
}

async function collectRouteManifest(rootDir) {
    const inventory = await getFileInventory(rootDir);
    const apiFiles = inventory.filter((file) => file.startsWith('src/routes/api/') && file.endsWith('+server.js'));
    const pageLoaderFiles = inventory.filter((file) => file.startsWith('src/routes/') && file.endsWith('+page.server.js'));

    const apiRoutes = [];
    for (const relPath of apiFiles) {
        const source = await readFile(rootDir, relPath);
        const exports = extractFunctionExports(source)
            .filter((entry) => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(entry.name))
            .map((entry) => entry.name);
        let bodyFields = extractBodyFields(source);
        let cache = extractCachePolicy(source);

        if (bodyFields.length === 0 && source.includes('handleRateVoteRequest')) {
            const eloServiceSource = await readFile(rootDir, 'src/lib/server/eloService.js');
            bodyFields = extractBodyFields(eloServiceSource);
        }

        if (cache.type === 'unspecified' && source.includes('handleRateVoteRequest')) {
            cache = {
                type: 'no-store'
            };
        }

        apiRoutes.push({
            file: relPath,
            route: routePathFromFile(relPath),
            methods: exports,
            cache,
            queryParams: extractSearchParams(source),
            pathParams: extractPathParams(source),
            bodyFields,
            dataSources: summarizeRouteDataSources(source),
            writesState: exports.some((method) => method !== 'GET')
        });
    }

    const pageLoaders = [];
    for (const relPath of pageLoaderFiles) {
        const source = await readFile(rootDir, relPath);
        const loadExport = extractFunctionExports(source).find((entry) => entry.name === 'load');
        let cache = extractCachePolicy(source);

        if (cache.type === 'unspecified' && source.includes('loadPlayerPageData')) {
            const playerPageSource = await readFile(rootDir, 'src/lib/server/playerPage.js');
            cache = extractConstObject(playerPageSource, 'PLAYER_HISTORY_CACHE') || cache;
        }

        pageLoaders.push({
            file: relPath,
            route: routePathFromFile(relPath),
            signature: loadExport?.signature || 'load(...)',
            cache,
            pathParams: extractPathParams(source),
            dataSources: summarizeRouteDataSources(source)
        });
    }

    return {
        apiRoutes: apiRoutes.sort((left, right) => left.route.localeCompare(right.route)),
        pageLoaders: pageLoaders.sort((left, right) => left.route.localeCompare(right.route))
    };
}

async function collectQueryLimits(rootDir) {
    const compareSource = await readFile(rootDir, 'src/lib/server/comparePage.js');
    const historySource = await readFile(rootDir, 'src/routes/api/player/[id]/history/+server.js');
    const supabaseSource = await readFile(rootDir, 'src/lib/server/supabase.js');
    const searchRouteSource = await readFile(rootDir, 'src/routes/api/search-players/+server.js');
    const leaderboardSource = await readFile(rootDir, 'src/routes/api/rate/leaderboard/+server.js');

    return sortValue({
        activePlayers: {
            lookbackDays: Number.parseInt(supabaseSource.match(/weekAgo\.setDate\(weekAgo\.getDate\(\)\s*-\s*(\d+)\)/)?.[1] || '7', 10),
            dedupeKey: 'nba_id',
            sortOrder: 'dpm desc'
        },
        comparePage: {
            maxPlayers: Number.parseInt(compareSource.match(/ids\.length === (\d+)/)?.[1] || '4', 10)
        },
        eloLeaderboard: {
            defaultLimit: Number.parseInt(leaderboardSource.match(/searchParams\.get\('limit'\) \|\| '(\d+)'/)?.[1] || '50', 10),
            maxLimit: Number.parseInt(leaderboardSource.match(/,\s*(\d+)\s*\)\s*$/m)?.[1] || '200', 10)
        },
        playerHistory: {
            defaultLimit: Number.parseInt(historySource.match(/: (\d+);\s*\n\s*const limit =/m)?.[1] || '1000', 10),
            boundedMaxLimit: Number.parseInt(historySource.match(/Math\.min\((\d+), limit\)/)?.[1] || '2000', 10),
            fullMaxRows: Number.parseInt(supabaseSource.match(/export const MAX_FULL_HISTORY_ROWS = ([\d_]+)/)?.[1]?.replace(/_/g, '') || '5000', 10)
        },
        searchPlayers: {
            minimumQueryLength: Number.parseInt(searchRouteSource.match(/q\.length < (\d+)/)?.[1] || '2', 10),
            maxResults: Number.parseInt(searchRouteSource.match(/slice\(0, (\d+)\)/)?.[1] || '15', 10)
        }
    });
}

function getApiRouteSummary(route) {
    if (route === '/api/active-players') return 'current active roster snapshot';
    if (route === '/api/search-players') return 'typeahead search results';
    if (route === '/api/players-index') return 'full player index';
    if (route === '/api/player/:id/history') return 'bounded or full career history';
    if (route === '/api/player/:id/longevity') return 'player longevity trajectory';
    if (route === '/api/longevity') return 'active-player longevity table';
    if (route === '/api/standings') return 'conference standings payload';
    if (route === '/api/standings/:slug') return 'team detail payload';
    if (route === '/api/rate/pair') return 'random Elo comparison pair';
    if (route === '/api/rate/leaderboard') return 'Elo leaderboard';
    if (route === '/api/rate/vote') return 'vote result plus next pair';
    if (route === '/api/docs') return 'public API contract document';
    return 'JSON route payload';
}

function getPageLoaderSummary(route) {
    if (route === '/') return 'homepage active-player leaderboard';
    if (route === '/compare') return 'preloaded compare cards from `?ids=`';
    if (route === '/player/:nbaId') return 'full player profile payload';
    if (route === '/standings') return 'east/west standings split';
    if (route === '/standings/:slug') return 'team detail wrapper payload';
    if (route === '/team/:team') return 'legacy team detail wrapper payload';
    return 'server-rendered page payload';
}

async function collectPublicContracts(rootDir) {
    const routeManifest = await collectRouteManifest(rootDir);
    const clientApiSource = await readFile(rootDir, 'src/lib/api.js');
    const sharedServerSources = await Promise.all([
        'src/lib/server/playerPage.js',
        'src/lib/server/comparePage.js',
        'src/lib/server/cacheHeaders.js',
        'src/lib/server/eloSecurity.js',
        'src/lib/server/eloService.js',
        'src/lib/server/supabase.js'
    ].map(async (relPath) => ({
        module: relPath,
        exports: extractFunctionExports(await readFile(rootDir, relPath))
    })));

    return sortValue({
        apiRoutes: routeManifest.apiRoutes.map((route) => ({
            route: route.route,
            methods: route.methods,
            queryParams: route.queryParams,
            pathParams: route.pathParams,
            bodyFields: route.bodyFields,
            returns: getApiRouteSummary(route.route)
        })),
        clientApi: extractFunctionExports(clientApiSource)
            .filter((entry) => !entry.name.startsWith('__'))
            .map((entry) => ({
                name: entry.name,
                signature: entry.signature
            })),
        pageLoaders: routeManifest.pageLoaders.map((loader) => ({
            route: loader.route,
            signature: loader.signature,
            returns: getPageLoaderSummary(loader.route)
        })),
        sharedServer: sharedServerSources.map((module) => ({
            module: module.module,
            exports: module.exports
                .filter((entry) => entry.kind === 'function' || entry.kind === 'const' && /MAX_FULL_HISTORY_ROWS/.test(entry.name))
                .map((entry) => ({
                    name: entry.name,
                    signature: entry.signature
                }))
        }))
    });
}

async function collectModuleDependencies(rootDir) {
    const inventory = await getFileInventory(rootDir);
    const edges = new Map();
    const reverseEdges = new Map();

    for (const relPath of inventory) {
        const source = await readFile(rootDir, relPath);
        const sourceGroup = groupForPath(relPath);
        const targets = new Set();

        for (const specifier of extractImportSpecifiers(source)) {
            const resolved = resolveInternalImport(relPath, specifier);
            if (!resolved) continue;

            const targetGroup = groupForPath(resolved);
            if (!targetGroup || targetGroup === sourceGroup) continue;
            targets.add(targetGroup);
        }

        if (targets.size === 0) continue;
        edges.set(sourceGroup, new Set([...(edges.get(sourceGroup) || []), ...targets]));

        for (const target of targets) {
            reverseEdges.set(target, new Set([...(reverseEdges.get(target) || []), sourceGroup]));
        }
    }

    return sortValue({
        edges: Object.fromEntries(
            [...edges.entries()]
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([group, targets]) => [group, [...targets].sort()])
        ),
        reverseEdges: Object.fromEntries(
            [...reverseEdges.entries()]
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([group, sources]) => [group, [...sources].sort()])
        )
    });
}

export async function getFileInventory(rootDir = process.cwd()) {
    const files = await walk(rootDir);
    return files.sort();
}

export async function getPackageVersion(rootDir = process.cwd()) {
    const pkg = JSON.parse(await readFile(rootDir, 'package.json'));
    return pkg.version;
}

export async function buildSyncArtifact(rootDir = process.cwd()) {
    const [archVersion, fileInventory, routeManifest, queryLimits, moduleDependencies, publicContracts] = await Promise.all([
        getPackageVersion(rootDir),
        getFileInventory(rootDir),
        collectRouteManifest(rootDir),
        collectQueryLimits(rootDir),
        collectModuleDependencies(rootDir),
        collectPublicContracts(rootDir)
    ]);

    return sortValue({
        arch_version: archVersion,
        repo_archetype: {
            primary: REPO_CLASSIFICATION.primary,
            secondary: REPO_CLASSIFICATION.secondary,
            topology: REPO_CLASSIFICATION.topology
        },
        version_policy: REPO_CLASSIFICATION.versionPolicy,
        bundle_contract: BUNDLE_CONTRACT,
        file_inventory: fileInventory,
        behavior_snapshot: {
            runtime: {
                framework: 'SvelteKit 2 on Svelte 5',
                local_dev: 'Bun-powered local workflow',
                deploy_target: 'Vercel serverless / edge cache',
                write_paths: ['/api/rate/vote']
            },
            page_loaders: routeManifest.pageLoaders,
            api_routes: routeManifest.apiRoutes,
            query_limits: queryLimits,
            persistence_surface: {
                read_tables: ['player_ratings', 'players', 'season_sim', 'win_distribution'],
                write_tables: ['elo_ratings', 'elo_votes']
            }
        },
        module_dependencies: moduleDependencies,
        public_contracts: publicContracts
    });
}

function groupTitle(groupKey) {
    if (groupKey === 'Root Docs & Manifests') return groupKey;
    return groupKey;
}

function fileIndexGroup(relPath) {
    if (ROOT_MANIFEST_FILES.has(relPath)) return 'Root Docs & Manifests';
    if (relPath.startsWith('context/')) return 'context';
    if (relPath.startsWith('supabase/migrations/')) return 'supabase/migrations';
    if (relPath.startsWith('src/lib/server/')) return 'src/lib/server';
    if (relPath.startsWith('src/lib/components/')) return 'src/lib/components';
    if (relPath.startsWith('src/lib/utils/')) return 'src/lib/utils';
    if (relPath.startsWith('src/lib/data/')) return 'src/lib/data';
    if (relPath.startsWith('src/routes/api/')) return 'src/routes/api';
    if (relPath.startsWith('src/routes/')) return 'src/routes';
    if (relPath.startsWith('tests/')) return 'tests';
    if (relPath.startsWith('scripts/')) return 'scripts';
    return path.dirname(relPath);
}

function describeFile(relPath) {
    if (relPath === START_HERE_PATH) return 'Human paste-order guide.';
    if (relPath === ARCHITECTURE_DOC_PATH) return 'Primary prompt artifact.';
    if (relPath === ARCHITECTURE_SYNC_PATH) return 'Machine-checked sync snapshot.';
    if (relPath === FILE_INDEX_PATH) return 'Oracle file catalog.';
    if (relPath === '.gitignore') return 'Git ignore rules.';
    if (relPath === 'src/lib/server/supabase.js') return 'Supabase query layer, in-memory caches, and Elo RPC access.';
    if (relPath === 'src/lib/api.js') return 'Client-side fetch helpers that normalize API responses.';
    if (relPath === 'src/hooks.server.js') return 'Canonicalizes GET URLs by stripping tracking parameters.';
    if (relPath === 'AGENTS.md') return 'Repo-specific coding rules and frontend/table invariants.';
    if (relPath === 'CLAUDE.md') return 'Contributor/agent command and runtime notes.';
    if (relPath === 'SUPABASE_SCHEMA.md') return 'Schema and pipeline-facing data contract reference.';
    if (relPath === 'package.json') return 'Version and npm scripts.';
    if (relPath === 'repomix.config.json') return 'Repomix root configuration for local bundle generation.';
    if (relPath === 'svelte.config.js') return 'SvelteKit adapter/config.';
    if (relPath === 'vite.config.js') return 'Vite build config.';
    if (relPath === '.repomixignore') return 'Repomix-specific excludes for generated/local-only artifacts.';
    if (relPath.startsWith('supabase/migrations/')) return 'Supabase SQL migration.';

    if (relPath.endsWith('+server.js')) {
        return `API ${routePathFromFile(relPath)}`;
    }

    if (relPath.endsWith('+page.server.js')) {
        return `load ${routePathFromFile(relPath)}`;
    }

    if (relPath.endsWith('+page.svelte')) {
        return `page ${routePathFromFile(relPath)}`;
    }

    if (relPath.endsWith('.test.js')) {
        return 'test';
    }

    if (relPath.startsWith('src/lib/components/')) {
        return 'component';
    }

    if (relPath.startsWith('src/lib/utils/')) {
        return 'util';
    }

    if (relPath.startsWith('src/lib/server/')) {
        return 'server helper';
    }

    if (relPath.startsWith('src/lib/data/')) {
        return 'static data';
    }

    if (relPath.startsWith('scripts/')) {
        return 'context script';
    }

    return 'source';
}

export async function renderFileIndex(rootDir = process.cwd()) {
    const files = await getFileInventory(rootDir);
    const grouped = new Map();

    for (const relPath of files) {
        const group = fileIndexGroup(relPath);
        grouped.set(group, [...(grouped.get(group) || []), relPath]);
    }

    const lines = [
        '# FILE_INDEX',
        '',
        'Use this for oracle workflows.',
        'Pair with `context/REPO_ARCHITECTURE.md`.',
        'For implementation work, request or paste raw source for the files you expect to change.',
        ''
    ];

    for (const group of [...grouped.keys()].sort()) {
        lines.push(`## ${groupTitle(group)}`);
        lines.push('');

        for (const relPath of grouped.get(group).sort()) {
            lines.push(`- \`${relPath}\` - ${describeFile(relPath)}`);
        }

        lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
}

export function renderStartHere(defaultBundle = BUNDLE_CONTRACT.default_bundle) {
    return [
        '# Start Here',
        '',
        'Default:',
        '1. Paste `context/REPO_ARCHITECTURE.md`.',
        `2. Paste \`context/${defaultBundle}\` or another matching \`context/COMPRESSED_*.md\` bundle.`,
        '3. Ask your question.',
        '',
        'Oracle:',
        '1. Paste `context/REPO_ARCHITECTURE.md`.',
        '2. Paste `context/FILE_INDEX.md`.',
        '3. Let the model request files by path.',
        '',
        "If the task changes behavior, logic, routing, retries, serialization, or data contracts, also paste raw source of the files you're editing.",
        '',
        `If unsure which bundle to use, start with \`context/${defaultBundle}\`.`,
        ''
    ].join('\n');
}

function renderContractTableRows(rows) {
    return rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
}

function formatCache(cache) {
    if (cache.type === 'no-store') return '`no-store`';
    if (cache.type === 'edge') return `edge ${cache.edgeSMaxAge}s / swr ${cache.swr}s`;
    return 'unspecified';
}

function selectTopReverseEdges(moduleDependencies) {
    return Object.entries(moduleDependencies.reverseEdges)
        .sort((left, right) => right[1].length - left[1].length || left[0].localeCompare(right[0]))
        .slice(0, 4);
}

export function renderArchitectureDoc(syncArtifact) {
    const bundleContract = syncArtifact.bundle_contract || BUNDLE_CONTRACT;
    const topClientApi = syncArtifact.public_contracts.clientApi
        .filter((entry) => [
            'apiActivePlayers',
            'apiPlayerHistory',
            'apiPlayersIndex',
            'apiLongevity',
            'apiPlayerLongevity',
            'apiSearchPlayers',
            'apiRateVote',
            'apiRateLeaderboard'
        ].includes(entry.name))
        .sort((left, right) => left.name.localeCompare(right.name));

    const topSharedServer = syncArtifact.public_contracts.sharedServer
        .filter((module) => [
            'src/lib/server/playerPage.js',
            'src/lib/server/comparePage.js',
            'src/lib/server/eloService.js',
            'src/lib/server/supabase.js'
        ].includes(module.module));

    const apiRows = syncArtifact.public_contracts.apiRoutes
        .filter((route) => route.route !== '/api/docs')
        .map((route) => [
            `\`${route.route}\``,
            `\`${route.methods.join(', ')}\``,
            route.queryParams.length ? `query: ${route.queryParams.join(', ')}` : route.pathParams.length ? `path: ${route.pathParams.join(', ')}` : route.bodyFields.length ? `body: ${route.bodyFields.join(', ')}` : 'none',
            route.returns
        ]);

    const pageLoaderRows = syncArtifact.public_contracts.pageLoaders.map((loader) => [
        `\`${loader.route}\``,
        `\`${loader.signature}\``,
        loader.returns
    ]);

    const clientRows = topClientApi.map((entry) => [
        `\`${entry.name}\``,
        `\`${entry.signature}\``
    ]);

    const sharedRows = topSharedServer.flatMap((module) =>
        module.exports
            .slice(0, module.module.endsWith('supabase.js') ? 5 : module.exports.length)
            .map((entry) => [
                `\`${path.basename(module.module)}\``,
                `\`${entry.signature}\``
            ])
    );

    const moduleEdgeLines = Object.entries(syncArtifact.module_dependencies.edges)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([group, targets]) => `- \`${group}\` -> ${targets.map((target) => `\`${target}\``).join(', ')}`);

    const reverseEdgeLines = selectTopReverseEdges(syncArtifact.module_dependencies)
        .map(([group, sources]) => `- \`${group}\` <- ${sources.map((source) => `\`${source}\``).join(', ')}`);

    const whereToEditRows = WHERE_TO_EDIT_ROWS
        .map((row) => `| ${row.task} | ${row.startHere} | ${row.alsoTouch} | \`${row.primaryBundle}\` |`)
        .join('\n');

    const bundleRows = bundleContract.bundles
        .map((bundle) => `| ${bundle.purpose} | \`${bundle.name}\` |`)
        .join('\n');

    const lines = [
        'Paste this first.',
        'Pair with one `context/COMPRESSED_*.md` bundle for guided context, or with `context/FILE_INDEX.md` for oracle workflows.',
        'For implementation tasks, also paste raw source of the files you expect to edit.',
        '',
        `Architecture sync version: ${syncArtifact.arch_version}`,
        `Archetype: ${REPO_CLASSIFICATION.primary} | Secondary: ${REPO_CLASSIFICATION.secondary.join(', ')} | Topology: ${REPO_CLASSIFICATION.topology} | ${REPO_CLASSIFICATION.versionPolicy}`,
        '',
        '## TL;DR',
        '',
        "Darko Site is a single SvelteKit application for NBA analytics pages and JSON APIs. The durable center is `src/lib/server/supabase.js`: route loaders and API handlers stay thin, shared server helpers own behavior, and Svelte/D3 components plus UI utilities own chart and table presentation.",
        '',
        '## Behavior / Routing Matrix',
        '',
        '| Surface | Route(s) | Backend path | Cache / mode | Notes |',
        '|---|---|---|---|---|',
        '| Homepage leaderboard | `/` | `getActivePlayers()` | edge 3600s / swr 86400s | Active roster snapshot ranked by DPM. |',
        '| Player detail | `/player/:nbaId` | `loadPlayerPageData()` + `getFullPlayerHistory()` | edge 3600s / swr 86400s | Full history is SSR-first. |',
        '| Compare | `/compare?ids=` | `loadComparePageData()` | uncached page loader | Dedupes IDs, preserves order, max 4 players. |',
        '| Standings / team detail | `/standings`, `/standings/:slug`, `/team/:team` | `getConferenceStandings()`, `getTeamPageData()` | edge 3600s / swr 86400s | Dual team-detail URL surfaces share one payload builder. |',
        '| Read APIs | `/api/*` except Elo fresh paths | shared Supabase helpers | mostly edge cache | Search is shorter-lived; players index/docs are 24h edge cached. |',
        '| Elo voting | `/api/rate/pair`, `/api/rate/vote`, `/api/rate/leaderboard` | `eloService.js` + RPCs | `no-store` on fresh endpoints | Only vote writes state. |',
        '',
        '### Critical Invariants',
        '',
        ...CRITICAL_INVARIANTS.map((line) => `- ${line}`),
        '',
        '### Conventions',
        '',
        ...CONVENTIONS.map((line) => `- ${line}`),
        '',
        '## Public Contract Snapshot',
        '',
        '### HTTP Surface',
        '',
        '| Route | Methods | Inputs | Returns |',
        '|---|---|---|---|',
        renderContractTableRows(apiRows),
        '',
        '### Page Loaders',
        '',
        '| Route | Signature | Returns |',
        '|---|---|---|',
        renderContractTableRows(pageLoaderRows),
        '',
        '### Client Fetch Helpers',
        '',
        '| Export | Signature |',
        '|---|---|',
        renderContractTableRows(clientRows),
        '',
        '### Shared Server Helpers',
        '',
        '| Module | Export |',
        '|---|---|',
        renderContractTableRows(sharedRows),
        '',
        '## Core Abstractions',
        '',
        ...CORE_ABSTRACTIONS.map((line) => `- ${line}`),
        '',
        '## Module Dependency Map',
        '',
        ...moduleEdgeLines,
        '',
        'High-fan-in reverse edges:',
        '',
        ...reverseEdgeLines,
        '',
        '## Interface Surface',
        '',
        '- Pages: home leaderboard, player profile, compare, standings, team detail, longevity, trajectories, projections, lineups, rate, about.',
        '- JSON APIs: active players, search, players index, player history, player longevity, longevity table, standings/team detail, Elo pair/vote/leaderboard, docs.',
        '- Public machine-readable API documentation is served by `/api/docs` and should stay consistent with real handlers.',
        '',
        '## Persistence / Side Effects',
        '',
        '- Read-heavy data comes from Supabase tables `player_ratings`, `players`, `season_sim`, and `win_distribution`.',
        '- Elo state changes happen through the Supabase RPCs behind `getRandomPair()` and `recordVote()`, surfaced only via `/api/rate/*`.',
        '- Request-time side effects are limited to cache headers, canonical GET redirects in `src/hooks.server.js`, and client-side CSV/image downloads.',
        '',
        '## Where To Edit',
        '',
        '| Task | Start here | Also touch | Primary bundle |',
        '|---|---|---|---|',
        whereToEditRows,
        '',
        '## Bundle Picker',
        '',
        '| Task area | Bundle |',
        '|---|---|',
        bundleRows,
        '',
        `Default: \`context/REPO_ARCHITECTURE.md\` + \`context/${bundleContract.default_bundle}\` + your question.`,
        "For implementation tasks, also paste raw source of the files you're editing.",
        '',
        '## Module Catalog',
        '',
        '- `src/lib/server/` is the service layer: query composition, cache helpers, shared page loaders, and Elo security/write orchestration.',
        '- `src/routes/` is composition-first: page shells plus thin `+page.server.js` or `+server.js` wrappers around shared helpers.',
        '- `src/lib/components/` and `src/lib/utils/` hold the behavior-rich frontend logic: D3 rendering, responsive chart layout, sticky tables, CSV export, and quick image export.',
        '- `supabase/migrations/` captures the write-path and permission history for the Elo feature; `SUPABASE_SCHEMA.md` is the higher-level schema contract.',
        '- `tests/` covers routing contracts, sticky/mobile table invariants, chart responsiveness, export flows, and context-framework drift. `scripts/` owns generation of the context layer.'
    ];

    return `${lines.join('\n')}\n`;
}

function detectLanguage(relPath) {
    if (relPath.endsWith('.svelte')) return 'svelte';
    if (relPath.endsWith('.js')) return 'js';
    if (relPath.endsWith('.json')) return 'json';
    if (relPath.endsWith('.md')) return 'md';
    if (relPath.endsWith('.css')) return 'css';
    if (relPath.endsWith('.html')) return 'html';
    return '';
}

function compressSource(source) {
    return source
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd();
}

function compactList(values = [], maxItems = 4) {
    if (!values || values.length === 0) {
        return 'none';
    }

    if (values.length <= maxItems) {
        return values.join(', ');
    }

    return `${values.slice(0, maxItems).join(', ')}, +${values.length - maxItems} more`;
}

function splitBundleSection(relPath) {
    if (relPath.startsWith('src/routes/api/')) return 'API Routes';
    if (relPath.startsWith('src/lib/server/')) return 'Server Helpers';
    if (relPath === 'src/lib/api.js') return 'Client API';
    if (relPath === 'SUPABASE_SCHEMA.md') return 'Data Contract Docs';
    if (relPath === 'src/hooks.server.js') return 'Hooks';
    if (relPath.startsWith('src/routes/') && relPath.endsWith('+page.server.js')) return 'Page Loaders';
    if (relPath.startsWith('src/routes/')) return 'Pages';
    if (relPath.startsWith('src/lib/components/')) return 'Components';
    if (relPath.startsWith('src/lib/utils/')) return 'Utilities';
    if (relPath.startsWith('src/lib/data/')) return 'Static Data';
    if (relPath.startsWith('tests/')) return 'Tests';
    if (relPath.startsWith('scripts/')) return 'Scripts';
    return 'Docs & Config';
}

function trimModuleName(relPath) {
    return path.basename(relPath);
}

function collectInternalImports(relPath, source) {
    return extractImportSpecifiers(source)
        .map((specifier) => resolveInternalImport(relPath, specifier))
        .filter(Boolean)
        .map((specifier) => trimModuleName(specifier))
        .filter((specifier, index, values) => values.indexOf(specifier) === index)
        .sort();
}

function buildBundleContextLines(definition, syncArtifact) {
    if (definition.name === 'COMPRESSED_data_api.md') {
        const limits = syncArtifact.behavior_snapshot.query_limits;
        return [
            `- Write path: ${syncArtifact.behavior_snapshot.runtime.write_paths.join(', ')}`,
            `- Player history: default ${limits.playerHistory.defaultLimit}, bounded max ${limits.playerHistory.boundedMaxLimit}, full max ${limits.playerHistory.fullMaxRows}`,
            `- Search: min query ${limits.searchPlayers.minimumQueryLength}, max results ${limits.searchPlayers.maxResults}`,
            `- Compare preload cap: ${limits.comparePage.maxPlayers} players`
        ];
    }

    if (definition.name === 'COMPRESSED_pages_routes.md') {
        return [
            `- Page loaders: ${syncArtifact.behavior_snapshot.page_loaders.map((loader) => loader.route).join(', ')}`,
            '- Canonical GET URLs are normalized in `src/hooks.server.js` before route resolution.'
        ];
    }

    if (definition.name === 'COMPRESSED_ui_charts.md') {
        return [
            '- This bundle centers the chart primitives that set mobile margins, tick density, resize behavior, and export support.',
            '- Additional chart/page files are summarized after the included source blocks.'
        ];
    }

    if (definition.name === 'COMPRESSED_ui_tables.md') {
        return [
            '- This bundle centers sticky-table rules, CSV schemas, metric labels, and the main leaderboard/search components.',
            '- Desktop sticky headers and mobile horizontal scroll must stay separated exactly as documented in `AGENTS.md`.'
        ];
    }

    if (definition.name === 'COMPRESSED_tests_context.md') {
        return [
            '- Tests are behavioral regressions, not snapshot-heavy fixtures.',
            '- Context tooling and governance docs live alongside the test inventory in this bundle; use raw source for `scripts/context-framework.js` edits.'
        ];
    }

    return [];
}

async function summarizeFileForSplitBundle(rootDir, relPath, syncArtifact) {
    const source = await readFile(rootDir, relPath);
    const routeLookup = new Map(syncArtifact.behavior_snapshot.api_routes.map((route) => [route.file, route]));
    const pageLoaderLookup = new Map(syncArtifact.behavior_snapshot.page_loaders.map((loader) => [loader.file, loader]));
    const routeEntry = routeLookup.get(relPath);
    const pageLoaderEntry = pageLoaderLookup.get(relPath);
    const exports = extractFunctionExports(source)
        .filter((entry) => entry.kind === 'function')
        .map((entry) => entry.name);
    const internalImports = collectInternalImports(relPath, source);

    if (routeEntry) {
        const inputs = [
            routeEntry.queryParams.length ? `query ${compactList(routeEntry.queryParams)}` : null,
            routeEntry.pathParams.length ? `path ${compactList(routeEntry.pathParams)}` : null,
            routeEntry.bodyFields.length ? `body ${compactList(routeEntry.bodyFields)}` : null
        ].filter(Boolean).join('; ');
        return `- \`${relPath}\` - ${routeEntry.methods.join(', ')} ${routeEntry.route}; cache ${formatCache(routeEntry.cache)}; ${inputs || 'no inputs'}; deps ${compactList(routeEntry.dataSources.map((sourceName) => sourceName.split(':').at(-1)), 5)}`;
    }

    if (pageLoaderEntry) {
        return `- \`${relPath}\` - load ${pageLoaderEntry.route}; cache ${formatCache(pageLoaderEntry.cache)}; params ${compactList(pageLoaderEntry.pathParams)}; deps ${compactList(pageLoaderEntry.dataSources.map((sourceName) => sourceName.split(':').at(-1)), 5)}`;
    }

    if (relPath.endsWith('.svelte')) {
        return `- \`${relPath}\` - imports ${compactList(internalImports)}.`;
    }

    if (relPath.startsWith('src/lib/server/') || relPath === 'src/lib/api.js' || relPath.startsWith('src/lib/utils/')) {
        return `- \`${relPath}\` - exports ${compactList(exports, 6)}; internal deps ${compactList(internalImports)}.`;
    }

    if (relPath.startsWith('tests/')) {
        return `- \`${relPath}\` - regression test.`;
    }

    if (relPath.startsWith('scripts/')) {
        return `- \`${relPath}\` - context/tooling script.`;
    }

    return `- \`${relPath}\``;
}

async function renderBundleSourceBlock(rootDir, relPath) {
    const source = compressSource(await readFile(rootDir, relPath));

    return [
        `### ${relPath}`,
        '',
        `\`\`\`${detectLanguage(relPath)}`,
        source,
        '```',
        ''
    ];
}

export async function buildBundleOutputs(rootDir = process.cwd()) {
    const inventory = await getFileInventory(rootDir);
    const syncArtifact = await buildSyncArtifact(rootDir);
    const sourceFiles = inventory.filter((relPath) => {
        if (relPath.startsWith('context/')) return false;
        return true;
    });

    const bundles = [];
    for (const definition of BUNDLE_DEFINITIONS) {
        const files = sourceFiles.filter((relPath) => definition.matcher(relPath)).sort();
        const sourcePathSet = new Set(definition.sourcePaths.filter((relPath) => files.includes(relPath)));
        const summaryFiles = files.filter((relPath) => !sourcePathSet.has(relPath));
        const grouped = new Map();
        for (const relPath of summaryFiles) {
            const section = splitBundleSection(relPath);
            grouped.set(section, [...(grouped.get(section) || []), relPath]);
        }

        const contentParts = [
            `# ${definition.name}`,
            '',
            `Use this for ${definition.purpose}.`,
            'Pair with `context/REPO_ARCHITECTURE.md`.',
            'For implementation tasks, also paste raw source of the files you expect to edit.',
            '',
            '## Key Notes',
            '',
            ...buildBundleContextLines(definition, syncArtifact),
            ''
        ];

        if (sourcePathSet.size > 0) {
            contentParts.push('## Included Source');
            contentParts.push('');

            for (const relPath of definition.sourcePaths.filter((candidate) => sourcePathSet.has(candidate))) {
                contentParts.push(...await renderBundleSourceBlock(rootDir, relPath));
            }
        }

        if (summaryFiles.length > 0) {
            contentParts.push('## Additional Files In Scope');
            contentParts.push('');
        }

        for (const section of [...grouped.keys()].sort()) {
            contentParts.push(`### ${section}`);
            contentParts.push('');

            for (const relPath of grouped.get(section)) {
                contentParts.push(await summarizeFileForSplitBundle(rootDir, relPath, syncArtifact));
            }

            contentParts.push('');
        }

        bundles.push({
            ...definition,
            files,
            path: `${CONTEXT_DIR}/${definition.name}`,
            content: contentParts.join('\n').trimEnd() + '\n'
        });
    }

    const fullBundleParts = [
        '# COMPRESSED_SRC.md',
        '',
        'Optional whole-repo compressed reference bundle.',
        'Pair with `context/REPO_ARCHITECTURE.md`.',
        'For implementation tasks, raw source of touched files still wins.',
        ''
    ];

    for (const relPath of sourceFiles.sort()) {
        const source = compressSource(await readFile(rootDir, relPath));
        fullBundleParts.push(`## ${relPath}`);
        fullBundleParts.push('');
        fullBundleParts.push(`\`\`\`${detectLanguage(relPath)}`);
        fullBundleParts.push(source);
        fullBundleParts.push('```');
        fullBundleParts.push('');
    }

    return {
        fullBundle: {
            name: 'COMPRESSED_SRC.md',
            path: `${CONTEXT_DIR}/COMPRESSED_SRC.md`,
            files: sourceFiles.sort(),
            content: fullBundleParts.join('\n').trimEnd() + '\n'
        },
        splitBundles: bundles
    };
}

export function countTokens(text) {
    return getTokenizer().encode(text).length;
}

export async function writeGeneratedContextFiles(rootDir = process.cwd()) {
    await fs.mkdir(path.join(rootDir, CONTEXT_DIR), { recursive: true });
    await fs.writeFile(
        path.join(rootDir, START_HERE_PATH),
        renderStartHere(BUNDLE_CONTRACT.default_bundle)
    );

    let syncArtifact = await buildSyncArtifact(rootDir);
    let architectureDoc = renderArchitectureDoc(syncArtifact);
    let fileIndex = await renderFileIndex(rootDir);

    await fs.writeFile(path.join(rootDir, ARCHITECTURE_SYNC_PATH), `${JSON.stringify(syncArtifact, null, 2)}\n`);
    await fs.writeFile(path.join(rootDir, ARCHITECTURE_DOC_PATH), architectureDoc);
    await fs.writeFile(path.join(rootDir, FILE_INDEX_PATH), fileIndex);

    syncArtifact = await buildSyncArtifact(rootDir);
    architectureDoc = renderArchitectureDoc(syncArtifact);
    fileIndex = await renderFileIndex(rootDir);
    const startHere = renderStartHere(syncArtifact.bundle_contract?.default_bundle || BUNDLE_CONTRACT.default_bundle);

    await fs.writeFile(path.join(rootDir, START_HERE_PATH), startHere);
    await fs.writeFile(path.join(rootDir, ARCHITECTURE_SYNC_PATH), `${JSON.stringify(syncArtifact, null, 2)}\n`);
    await fs.writeFile(path.join(rootDir, ARCHITECTURE_DOC_PATH), architectureDoc);
    await fs.writeFile(path.join(rootDir, FILE_INDEX_PATH), fileIndex);

    return {
        syncArtifact,
        architectureDoc,
        fileIndex,
        startHere
    };
}

export async function writeBundleFiles(rootDir = process.cwd()) {
    const bundleOutputs = await buildBundleOutputs(rootDir);
    await fs.mkdir(path.join(rootDir, CONTEXT_DIR), { recursive: true });

    const existingContextFiles = await fs.readdir(path.join(rootDir, CONTEXT_DIR));
    const nextCompressedNames = new Set([
        bundleOutputs.fullBundle.name,
        ...bundleOutputs.splitBundles.map((bundle) => bundle.name)
    ]);

    for (const entry of existingContextFiles) {
        if (!entry.startsWith('COMPRESSED_') || !entry.endsWith('.md')) {
            continue;
        }

        if (nextCompressedNames.has(entry)) {
            continue;
        }

        await fs.unlink(path.join(rootDir, CONTEXT_DIR, entry));
    }

    await fs.writeFile(path.join(rootDir, bundleOutputs.fullBundle.path), bundleOutputs.fullBundle.content);

    for (const bundle of bundleOutputs.splitBundles) {
        await fs.writeFile(path.join(rootDir, bundle.path), bundle.content);
    }

    const architectureDoc = await readFile(rootDir, ARCHITECTURE_DOC_PATH);
    const architectureTokens = countTokens(architectureDoc);
    const fullBundleTokens = countTokens(bundleOutputs.fullBundle.content);
    const splitStats = bundleOutputs.splitBundles.map((bundle) => {
        const tokens = countTokens(bundle.content);
        const combined = architectureTokens + tokens;
        let band = 'Green';
        if (combined > 18000) {
            band = 'Red';
        } else if (combined > 15000) {
            band = 'Yellow';
        }

        return {
            name: bundle.name,
            tokens,
            combined,
            band,
            purpose: bundle.purpose
        };
    });

    const budgetLines = [
        '# CONTEXT_BUDGET',
        '',
        'Token counts use `o200k_base`.',
        'Default workflow: `REPO_ARCHITECTURE.md` + one split bundle + your question.',
        'For implementation tasks, raw source of the touched files still wins.',
        '',
        `- \`REPO_ARCHITECTURE.md\`: ${architectureTokens} tokens`,
        `- \`COMPRESSED_SRC.md\`: ${fullBundleTokens} tokens`,
        '',
        '| Bundle | Tokens | Combined w/ architecture doc | Band | Use for |',
        '|---|---:|---:|---|---|',
        ...splitStats.map((stat) => `| \`${stat.name}\` | ${stat.tokens} | ${stat.combined} | ${stat.band} | ${stat.purpose} |`),
        '',
        'Bands: Green <= 15000, Yellow 15001-18000, Red > 18000.',
        `If unsure, start with \`context/${BUNDLE_CONTRACT.default_bundle}\`.`
    ];

    await fs.writeFile(path.join(rootDir, CONTEXT_BUDGET_PATH), `${budgetLines.join('\n')}\n`);

    try {
        await fs.unlink(path.join(rootDir, CONTEXT_INDEX_PATH));
    } catch (error) {
        if (error?.code !== 'ENOENT') {
            throw error;
        }
    }

    return {
        architectureTokens,
        fullBundleTokens,
        splitStats
    };
}
