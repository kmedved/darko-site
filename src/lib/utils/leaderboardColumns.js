import {
    formatFixed,
    formatMillions,
    formatOrDash,
    formatPercent,
    formatSignedMetric,
    formatSignedMillions
} from './csvPresets.js';

const DASH = '\u2014';

const COLUMN_DEFINITIONS = Object.freeze({
    _rank: {
        key: '_rank',
        label: '#',
        type: 'number',
        align: 'right',
        alignClass: 'rank',
        dataType: 'number'
    },
    player_name: {
        key: 'player_name',
        label: 'Player',
        type: 'text',
        align: 'left',
        alignClass: 'name',
        dataType: 'text'
    },
    team_name: {
        key: 'team_name',
        label: 'Team',
        type: 'text',
        align: 'left',
        alignClass: 'team',
        dataType: 'text',
        format: 'orDash'
    },
    position: {
        key: 'position',
        label: 'Pos',
        type: 'text',
        align: 'left',
        alignClass: 'position',
        dataType: 'text',
        format: 'orDash'
    },
    dpm: {
        key: 'dpm',
        label: 'DPM',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed',
        metricKey: 'dpm'
    },
    o_dpm: {
        key: 'o_dpm',
        label: 'Off',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed',
        metricKey: 'o_dpm'
    },
    d_dpm: {
        key: 'd_dpm',
        label: 'Def',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed',
        metricKey: 'd_dpm'
    },
    sal_market_fixed: {
        key: 'sal_market_fixed',
        label: 'Fair Salary',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'millions',
        filterScale: 1e-6,
        metricKey: 'sal_market_fixed'
    },
    actual_salary: {
        key: 'actual_salary',
        label: 'Salary',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'millions',
        filterScale: 1e-6
    },
    box_dpm: {
        key: 'box_dpm',
        label: 'Box',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed',
        metricKey: 'box_dpm'
    },
    on_off_dpm: {
        key: 'on_off_dpm',
        label: 'On/Off',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed',
        metricKey: 'on_off_dpm'
    },
    x_minutes: {
        key: 'x_minutes',
        label: 'MPG',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'fixed',
        decimals: 1,
        metricKey: 'x_minutes'
    },
    x_pace: {
        key: 'x_pace',
        label: 'Pace',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'fixed',
        decimals: 1,
        metricKey: 'x_pace'
    },
    x_pts_100: {
        key: 'x_pts_100',
        label: 'Pts/100',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'fixed',
        decimals: 1,
        metricKey: 'x_pts_100'
    },
    x_ast_100: {
        key: 'x_ast_100',
        label: 'Ast/100',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'fixed',
        decimals: 1,
        metricKey: 'x_ast_100'
    },
    x_fg_pct: {
        key: 'x_fg_pct',
        label: 'FG%',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'percent',
        filterScale: 100,
        metricKey: 'x_fg_pct'
    },
    x_fg3_pct: {
        key: 'x_fg3_pct',
        label: '3P%',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'percent',
        filterScale: 100,
        metricKey: 'x_fg3_pct'
    },
    x_ft_pct: {
        key: 'x_ft_pct',
        label: 'FT%',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'percent',
        filterScale: 100,
        metricKey: 'x_ft_pct'
    },
    surplus_value: {
        key: 'surplus_value',
        label: 'Surplus',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signedMillions',
        filterScale: 1e-6,
        metricKey: 'surplus_value'
    },
    // With the Time Machine set: the player's DPM today and the change since the board's date.
    now_dpm: {
        key: 'now_dpm',
        label: 'Now',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed'
    },
    since_dpm: {
        key: 'since_dpm',
        label: 'Since',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed'
    }
});

// A drawn cell that doesn't sort or filter: the season sparkline.
const TREND_COLUMN = Object.freeze({
    key: '_trend',
    label: 'Season',
    kind: 'trend',
    alignClass: 'drawn',
    sortable: false
});

const STANDARD_LEADERBOARD_METRIC_KEYS = Object.freeze([
    'dpm',
    'o_dpm',
    'd_dpm',
    'box_dpm',
    'on_off_dpm',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct',
    'sal_market_fixed',
    'actual_salary',
    'surplus_value'
]);
const SHARED_PLAYER_METRIC_KEYS = Object.freeze([
    'dpm',
    'o_dpm',
    'd_dpm',
    'sal_market_fixed',
    'box_dpm',
    'on_off_dpm',
    'x_minutes',
    'x_pace',
    'x_pts_100',
    'x_ast_100',
    'x_fg_pct',
    'x_fg3_pct',
    'x_ft_pct'
]);

function buildColumns(keys, overrides = {}) {
    return keys.map((key) => ({
        ...COLUMN_DEFINITIONS[key],
        ...(overrides[key] || {})
    }));
}

export function buildPlayerTableSortConfig(columns) {
    return Object.fromEntries(columns.map((column) => [column.key, { type: column.type }]));
}

export const LEADERBOARD_COLUMNS = buildColumns(
    ['_rank', 'player_name', 'team_name', ...STANDARD_LEADERBOARD_METRIC_KEYS],
    {
        sal_market_fixed: { label: '$ Value' },
        o_dpm: { label: 'Off' },
        d_dpm: { label: 'Def' }
    }
);

export const TEAM_PLAYER_COLUMNS = buildColumns(
    ['player_name', 'position', ...SHARED_PLAYER_METRIC_KEYS]
);

// The leaderboard's column groups, named in a heading row over the columns they cover.
export const COLUMN_GROUPS = Object.freeze({
    impact: 'Impact',
    role: 'Role',
    per100: 'Per 100',
    shooting: 'Shooting',
    value: 'Value'
});

const COLUMN_GROUP_BY_KEY = Object.freeze({
    dpm: 'impact',
    o_dpm: 'impact',
    d_dpm: 'impact',
    _trend: 'impact',
    now_dpm: 'impact',
    since_dpm: 'impact',
    box_dpm: 'impact',
    on_off_dpm: 'impact',
    x_minutes: 'role',
    x_pace: 'role',
    x_pts_100: 'per100',
    x_ast_100: 'per100',
    x_fg_pct: 'shooting',
    x_fg3_pct: 'shooting',
    x_ft_pct: 'shooting',
    sal_market_fixed: 'value',
    actual_salary: 'value',
    surplus_value: 'value'
});

/** The column sets the Modern leaderboard can narrow to. Each keeps the player and DPM. */
export const COLUMN_SETS = Object.freeze([
    { key: 'all', label: 'All stats', columns: null },
    { key: 'impact', label: 'Impact', columns: ['dpm', 'o_dpm', 'd_dpm', 'box_dpm', 'on_off_dpm', 'x_minutes'] },
    { key: 'box', label: 'Box score', columns: ['dpm', 'x_minutes', 'x_pace', 'x_pts_100', 'x_ast_100'] },
    { key: 'shooting', label: 'Shooting', columns: ['dpm', 'x_pts_100', 'x_fg_pct', 'x_fg3_pct', 'x_ft_pct'] },
    { key: 'value', label: 'Value', columns: ['dpm', 'x_minutes', 'sal_market_fixed', 'actual_salary', 'surplus_value'] }
]);

// Every set keeps who the player is, and the season line and Time Machine columns beside DPM.
const ALWAYS_SHOWN = new Set(['_rank', 'player_name', 'team_name', '_trend', 'now_dpm', 'since_dpm']);

/**
 * The leaderboard as drawn: after Def, the season sparkline when shown ("To date" with the
 * Time Machine set), then with the Time Machine set each player's DPM now and the change
 * since. The offense/defense split is drawn in the DPM cell, so it costs no width. `set`
 * narrows the stat columns to one of COLUMN_SETS.
 */
export function leaderboardTableColumns({ trends = false, asOf = false, set = 'all' } = {}) {
    const keep = COLUMN_SETS.find((entry) => entry.key === set)?.columns ?? null;
    return LEADERBOARD_COLUMNS.flatMap((column) => {
        if (column.key !== 'd_dpm') return [column];
        return [
            column,
            ...(trends ? [{ ...TREND_COLUMN, label: asOf ? 'To date' : 'Season' }] : []),
            ...(asOf ? [COLUMN_DEFINITIONS.now_dpm, COLUMN_DEFINITIONS.since_dpm] : [])
        ];
    })
        .filter((column) => !keep || ALWAYS_SHOWN.has(column.key) || keep.includes(column.key))
        .map((column) => (COLUMN_GROUP_BY_KEY[column.key] ? { ...column, group: COLUMN_GROUP_BY_KEY[column.key] } : column));
}

/**
 * The heading row over the columns: one cell per run of columns in the same group, and an
 * empty cell for each column outside a group, with that column's class so it hides with it.
 */
export function columnGroupCells(columns) {
    const cells = [];
    for (const column of columns) {
        const last = cells[cells.length - 1];
        if (column.group && last?.group === column.group) {
            last.span += 1;
        } else {
            cells.push({
                key: column.key,
                group: column.group ?? null,
                label: column.group ? COLUMN_GROUPS[column.group] : '',
                span: 1,
                alignClass: column.group ? 'group' : column.alignClass
            });
        }
    }
    return cells;
}

export const leaderboardSortConfig = buildPlayerTableSortConfig(LEADERBOARD_COLUMNS);
export const teamPlayerSortConfig = buildPlayerTableSortConfig(TEAM_PLAYER_COLUMNS);

export function getPlayerTableCellValue(player, column, index) {
    if (column.key === '_rank') return index + 1;
    return player?.[column.key];
}

export function formatPlayerTableCell(column, value) {
    if (value === null || value === undefined || value === '') return DASH;

    switch (column.format) {
        case 'signed':
            return formatSignedMetric(value);
        case 'percent':
            return formatPercent(value);
        case 'millions':
            return formatMillions(value);
        case 'signedMillions':
            return formatSignedMillions(value);
        case 'fixed':
            return formatFixed(value, column.decimals ?? 1);
        case 'orDash':
            return formatOrDash(value);
        default:
            return String(value ?? DASH);
    }
}

export const getLeaderboardCellValue = getPlayerTableCellValue;
export const formatLeaderboardCell = formatPlayerTableCell;
