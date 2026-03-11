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
        label: 'ODPM',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'signed',
        metricKey: 'o_dpm'
    },
    d_dpm: {
        key: 'd_dpm',
        label: 'DDPM',
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
        metricKey: 'sal_market_fixed'
    },
    actual_salary: {
        key: 'actual_salary',
        label: 'Salary',
        type: 'number',
        align: 'right',
        alignClass: 'num',
        dataType: 'number',
        format: 'millions'
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
        metricKey: 'surplus_value'
    }
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
    ['_rank', 'player_name', ...STANDARD_LEADERBOARD_METRIC_KEYS],
    {
        sal_market_fixed: { label: '$ Value' },
        o_dpm: { label: 'Off' },
        d_dpm: { label: 'Def' }
    }
);

export const LEGACY_LEADERBOARD_COLUMNS = buildColumns(
    ['_rank', 'player_name', 'team_name', ...SHARED_PLAYER_METRIC_KEYS, 'surplus_value'],
    {
        o_dpm: { label: 'Off' },
        d_dpm: { label: 'Def' }
    }
);

export const TEAM_PLAYER_COLUMNS = buildColumns(
    ['player_name', 'position', ...SHARED_PLAYER_METRIC_KEYS]
);

export const leaderboardSortConfig = buildPlayerTableSortConfig(LEADERBOARD_COLUMNS);
export const legacyLeaderboardSortConfig = buildPlayerTableSortConfig(LEGACY_LEADERBOARD_COLUMNS);
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
