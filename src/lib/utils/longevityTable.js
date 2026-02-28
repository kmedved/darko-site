const PROJECTION_COLUMNS = Array.from({ length: 15 }, (_, index) => `p${index + 1}`);

export const LONGEVITY_COLUMNS = [
    'player_name',
    'rookie_season',
    'career_games',
    'age',
    'est_retirement_age',
    'years_remaining',
    ...PROJECTION_COLUMNS
];

function parseNumeric(value) {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (value === null || value === undefined) return null;
    const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
}

function formatFixed(value, decimals = 1) {
    const n = parseNumeric(value);
    if (n === null) return '—';
    return n.toFixed(decimals);
}

export function formatLongevityDisplayValue(row, column) {
    if (!row) return '';

    if (column === 'player_name') {
        return String(row.player_name ?? '');
    }

    if (column === 'rookie_season' || column === 'career_games') {
        const n = parseNumeric(row[column]);
        if (n === null) return '—';
        return String(Math.round(n));
    }

    if (column === 'age' || column === 'est_retirement_age' || column === 'years_remaining') {
        return formatFixed(row[column], 1);
    }

    if (/^p\d+$/.test(column)) {
        return `${formatFixed(row[column], 1)}%`;
    }

    return String(row[column] ?? '');
}

function containsQuery(value, query) {
    if (!query) return true;
    return String(value).toLowerCase().includes(query);
}

export function filterLongevityRows(rows = [], globalQuery = '', columnFilters = {}) {
    const normalizedGlobalQuery = String(globalQuery || '').trim().toLowerCase();

    return rows.filter((row) => {
        const visibleColumns = LONGEVITY_COLUMNS.map((column) =>
            formatLongevityDisplayValue(row, column).toLowerCase()
        );

        if (normalizedGlobalQuery) {
            const globalMatch = visibleColumns.some((value) => containsQuery(value, normalizedGlobalQuery));
            if (!globalMatch) return false;
        }

        for (const [column, rawFilter] of Object.entries(columnFilters || {})) {
            if (!LONGEVITY_COLUMNS.includes(column)) continue;
            const normalizedColumnFilter = String(rawFilter || '').trim().toLowerCase();
            if (!normalizedColumnFilter) continue;

            const displayValue = formatLongevityDisplayValue(row, column).toLowerCase();
            if (!containsQuery(displayValue, normalizedColumnFilter)) return false;
        }

        return true;
    });
}

export function paginateRows(rows = [], page = 1, pageSize = 20) {
    const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const start = (safePage - 1) * safePageSize;

    if (!rows.length || start >= rows.length) return [];
    return rows.slice(start, start + safePageSize);
}

export function getLongevitySortConfig() {
    const config = {
        player_name: { type: 'text' },
        rookie_season: { type: 'number' },
        career_games: { type: 'number' },
        age: { type: 'number' },
        est_retirement_age: { type: 'number' },
        years_remaining: { type: 'number' }
    };

    for (const column of PROJECTION_COLUMNS) {
        config[column] = { type: 'number' };
    }

    return config;
}

export function resolveActiveLongevityPlayer(rows = [], activePlayerId = null) {
    if (!rows.length) return null;

    const selected = rows.find((row) => row.nba_id === activePlayerId);
    if (selected) return selected;

    return rows[0];
}
