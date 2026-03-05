import {
    formatFixed,
    formatMillions,
    formatPercent,
    formatSignedMetric,
    formatSignedMillions
} from './csvPresets.js';

const DASH = '—';

export const LEADERBOARD_COLUMNS = [
    { key: '_rank', label: '#', type: 'number', align: 'right', alignClass: 'rank', dataType: 'number' },
    { key: 'player_name', label: 'Player', type: 'text', align: 'left', alignClass: 'name', dataType: 'text' },
    { key: 'team_name', label: 'Team', type: 'text', align: 'left', alignClass: 'team', dataType: 'text' },
    { key: 'dpm', label: 'DPM', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'signed', metricKey: 'dpm' },
    { key: 'o_dpm', label: 'Offense', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'signed', metricKey: 'o_dpm' },
    { key: 'd_dpm', label: 'Defense', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'signed', metricKey: 'd_dpm' },
    { key: 'sal_market_fixed', label: 'Fair Salary', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'millions', metricKey: 'sal_market_fixed' },
    { key: 'box_dpm', label: 'Box', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'signed', metricKey: 'box_dpm' },
    { key: 'on_off_dpm', label: 'On/Off', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'signed', metricKey: 'on_off_dpm' },
    { key: 'x_minutes', label: 'MPG', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'fixed', decimals: 1, metricKey: 'x_minutes' },
    { key: 'x_pace', label: 'Pace', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'fixed', decimals: 1, metricKey: 'x_pace' },
    { key: 'x_pts_100', label: 'Pts/100', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'fixed', decimals: 1, metricKey: 'x_pts_100' },
    { key: 'x_ast_100', label: 'Ast/100', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'fixed', decimals: 1, metricKey: 'x_ast_100' },
    { key: 'x_fg_pct', label: 'FG%', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'percent', metricKey: 'x_fg_pct' },
    { key: 'x_fg3_pct', label: '3P%', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'percent', metricKey: 'x_fg3_pct' },
    { key: 'x_ft_pct', label: 'FT%', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'percent', metricKey: 'x_ft_pct' },
    { key: 'surplus_value', label: 'Surplus', type: 'number', align: 'right', alignClass: 'num', dataType: 'number', format: 'signedMillions', metricKey: 'surplus_value' }
];

export const leaderboardSortConfig = Object.fromEntries(
    LEADERBOARD_COLUMNS.map((column) => [column.key, { type: column.type }])
);

export function getLeaderboardCellValue(player, column, index) {
    if (column.key === '_rank') return index + 1;
    return player?.[column.key];
}

export function formatLeaderboardCell(column, value) {
    if (value === null || value === undefined) return DASH;

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
        default:
            return String(value ?? DASH);
    }
}
