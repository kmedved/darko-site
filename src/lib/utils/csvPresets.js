import { downloadCsv } from './csv.js';

const DASH = '—';

export function formatMinutes(seconds) {
    if (!seconds) return DASH;
    return (seconds / 60).toFixed(1);
}

export function formatSignedMetric(value, decimals = 1) {
    if (value === null || value === undefined) return DASH;
    const n = parseFloat(value);
    return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}`;
}

export function formatPercent(value) {
    if (value === null || value === undefined) return DASH;
    return (parseFloat(value) * 100).toFixed(1) + '%';
}

export function formatOrDash(value) {
    return value || DASH;
}

export function formatNullable(value, fallback = DASH) {
    return value ?? fallback;
}

export function formatFixed(value, decimals = 1) {
    if (value === null || value === undefined) return DASH;
    return parseFloat(value).toFixed(decimals);
}

export function exportCsvRows({ rows = [], columns = [], filename }) {
    downloadCsv({ rows, columns, filename });
}

export const leaderboardCsvColumns = [
    { header: '#', accessor: 'rank' },
    { header: 'Player', accessor: 'player_name' },
    { header: 'Team', accessor: 'team_name' },
    { header: 'Pos', accessor: 'position', format: formatOrDash },
    { header: 'Min', accessor: 'tr_minutes', format: formatMinutes },
    { header: 'DPM', accessor: 'dpm', format: formatSignedMetric },
    { header: 'ODPM', accessor: 'o_dpm', format: formatSignedMetric },
    { header: 'DDPM', accessor: 'd_dpm', format: formatSignedMetric },
    { header: 'Box', accessor: 'box_dpm', format: formatSignedMetric },
];

export const compareCsvColumns = [
    { header: 'Player', accessor: 'player_name' },
    { header: 'Team', accessor: 'team_name' },
    { header: 'Pos', accessor: 'position', format: formatOrDash },
    { header: 'Age', accessor: 'age', format: formatNullable },
    { header: 'Min', accessor: 'tr_minutes', format: formatMinutes },
    { header: 'Career Games', accessor: 'career_game_num', format: formatNullable },
    { header: 'DPM', accessor: 'dpm', format: formatSignedMetric },
    { header: 'ODPM', accessor: 'o_dpm', format: formatSignedMetric },
    { header: 'DDPM', accessor: 'd_dpm', format: formatSignedMetric },
    { header: 'Box', accessor: 'box_dpm', format: formatSignedMetric },
    { header: 'Box Off', accessor: 'box_odpm', format: formatSignedMetric },
    { header: 'Box Def', accessor: 'box_ddpm', format: formatSignedMetric },
    { header: '3P% (trend)', accessor: 'tr_fg3_pct', format: formatPercent },
    { header: 'FT% (trend)', accessor: 'tr_ft_pct', format: formatPercent },
];

export const standingsCsvColumns = [
    { header: '#', accessor: 'Rk' },
    { header: 'Team', accessor: 'team_name' },
    { header: 'Conference', accessor: 'conference' },
    { header: 'Current', accessor: 'Current' },
    { header: 'W', accessor: 'W', format: (v) => formatFixed(v, 1) },
    { header: 'L', accessor: 'L', format: (v) => formatFixed(v, 1) },
    { header: 'SRS', accessor: 'SRS', format: (v) => formatFixed(v, 2) },
    { header: 'Playoff%', accessor: 'Playoffs', format: (v) => formatFixed(v, 1) },
    { header: 'Win Conf%', accessor: 'Win Conf', format: (v) => formatFixed(v, 1) },
    { header: 'Win Finals%', accessor: 'Win Finals', format: (v) => formatFixed(v, 1) },
    { header: 'Lottery%', accessor: 'Lottery%', format: (v) => formatFixed(v, 1) },
    { header: 'E[Pick]', accessor: 'ExpPick', format: (v) => formatFixed(v, 1) },
];

export const longevityCsvColumns = [
    { header: 'Player', accessor: 'player_name' },
    { header: 'Rookie Season', accessor: 'rookie_season', format: (v) => formatNullable(v) },
    { header: 'Career Games', accessor: 'career_games', format: (v) => formatNullable(v) },
    { header: 'Age', accessor: 'age', format: (v) => formatFixed(v, 1) },
    { header: 'Est. Retirement Age', accessor: 'est_retirement_age', format: (v) => formatFixed(v, 1) },
    { header: 'Years Remaining', accessor: 'years_remaining', format: (v) => formatFixed(v, 1) },
    { header: '+1', accessor: 'p1', format: (v) => formatFixed(v, 1) },
    { header: '+2', accessor: 'p2', format: (v) => formatFixed(v, 1) },
    { header: '+3', accessor: 'p3', format: (v) => formatFixed(v, 1) },
    { header: '+4', accessor: 'p4', format: (v) => formatFixed(v, 1) },
    { header: '+5', accessor: 'p5', format: (v) => formatFixed(v, 1) },
    { header: '+6', accessor: 'p6', format: (v) => formatFixed(v, 1) },
    { header: '+7', accessor: 'p7', format: (v) => formatFixed(v, 1) },
    { header: '+8', accessor: 'p8', format: (v) => formatFixed(v, 1) },
    { header: '+9', accessor: 'p9', format: (v) => formatFixed(v, 1) },
    { header: '+10', accessor: 'p10', format: (v) => formatFixed(v, 1) },
    { header: '+11', accessor: 'p11', format: (v) => formatFixed(v, 1) },
    { header: '+12', accessor: 'p12', format: (v) => formatFixed(v, 1) }
];

export const teamPlayersCsvColumns = [
    { header: 'Player', accessor: 'player_name' },
    { header: 'Pos', accessor: 'position', format: formatOrDash },
    { header: 'Min', accessor: 'tr_minutes', format: formatMinutes },
    { header: 'DPM', accessor: 'dpm', format: formatSignedMetric },
    { header: 'ODPM', accessor: 'o_dpm', format: formatSignedMetric },
    { header: 'DDPM', accessor: 'd_dpm', format: formatSignedMetric },
    { header: 'Box', accessor: 'box_dpm', format: formatSignedMetric },
];
