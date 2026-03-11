import { downloadCsv } from './csv.js';

const DASH = '\u2014';

export function formatMinutes(seconds) {
    if (seconds === null || seconds === undefined) return DASH;
    const n = Number.parseFloat(seconds);
    if (!Number.isFinite(n)) return DASH;
    return (n / 60).toFixed(1);
}

export function formatSignedMetric(value, decimals = 1) {
    if (value === null || value === undefined) return DASH;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return DASH;
    return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}`;
}

export function formatPercent(value) {
    if (value === null || value === undefined) return DASH;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return DASH;
    return (n * 100).toFixed(1) + '%';
}

export function formatOrDash(value) {
    return value || DASH;
}

export function formatNullable(value, fallback = DASH) {
    return value ?? fallback;
}

export function formatFixed(value, decimals = 1) {
    if (value === null || value === undefined) return DASH;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return DASH;
    return n.toFixed(decimals);
}

export function formatMillions(value) {
    if (value === null || value === undefined) return DASH;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return DASH;
    return `$${(n / 1e6).toFixed(1)}M`;
}

export function formatSignedMillions(value) {
    if (value === null || value === undefined) return DASH;
    const n = Number.parseFloat(value);
    if (!Number.isFinite(n)) return DASH;
    return `${n >= 0 ? '+' : '-'}$${(Math.abs(n) / 1e6).toFixed(1)}M`;
}

function formatConference(value) {
    if (value === 'East') return 'Eastern Conference';
    if (value === 'West') return 'Western Conference';
    return value || DASH;
}

export function exportCsvRows({ rows = [], columns = [], filename }) {
    downloadCsv({ rows, columns, filename });
}

export const metricDisplayLabels = Object.freeze({
    dpm: 'DPM',
    o_dpm: 'ODPM',
    d_dpm: 'DDPM',
    box_dpm: 'Box DPM',
    box_odpm: 'Box Off',
    box_ddpm: 'Box Def',
    on_off_dpm: 'On/Off DPM',
    on_off_odpm: 'On/Off Off',
    on_off_ddpm: 'On/Off Def',
    bayes_rapm_total: 'RAPM',
    bayes_rapm_off: 'RAPM Off',
    bayes_rapm_def: 'RAPM Def',
    rapm_exposure: 'RAPM Exposure',
    tr_minutes: 'Min',
    x_minutes: 'MPG',
    x_pace: 'Pace',
    x_pts_100: 'Pts per 100',
    x_ast_100: 'Ast per 100',
    x_orb_100: 'ORB per 100',
    x_drb_100: 'DRB per 100',
    x_stl_100: 'Stl per 100',
    x_blk_100: 'Blk per 100',
    x_tov_100: 'TOV per 100',
    x_fga_100: 'FGA per 100',
    x_fg3a_100: '3PA per 100',
    x_fta_100: 'FTA per 100',
    x_fg_pct: 'FG%',
    x_fg3_pct: '3P%',
    x_ft_pct: 'FT%',
    tr_fg3_pct: '3P% (trend)',
    tr_ft_pct: 'FT% (trend)',
    projected_years_remaining: 'Years remaining',
    projected_years_remaining_cal: 'Years remaining (cal)',
    x_retirement_age: 'Retirement age',
    x_retirement_age_cal: 'Retirement age (cal)',
    sal_market_fixed: 'Fair Salary',
    surplus_value: 'Surplus Value'
});

export function getMetricDisplayLabel(metric) {
    return metricDisplayLabels[metric] || metric;
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
    { header: 'On/Off DPM', accessor: 'on_off_dpm', format: formatSignedMetric },
    { header: 'RAPM', accessor: 'bayes_rapm_total', format: formatSignedMetric },
    { header: 'MPG', accessor: 'x_minutes', format: (v) => formatFixed(v, 1) },
    { header: 'Pace', accessor: 'x_pace', format: (v) => formatFixed(v, 1) },
    { header: 'Pts per 100', accessor: 'x_pts_100', format: (v) => formatFixed(v, 1) },
    { header: 'Ast per 100', accessor: 'x_ast_100', format: (v) => formatFixed(v, 1) },
    { header: 'FG%', accessor: 'x_fg_pct', format: formatPercent },
    { header: '3P%', accessor: 'x_fg3_pct', format: formatPercent },
    { header: 'FT%', accessor: 'x_ft_pct', format: formatPercent },
    { header: '$ Value', accessor: 'sal_market_fixed', format: formatMillions },
    { header: 'Salary', accessor: 'actual_salary', format: formatMillions },
    { header: 'Surplus Value', accessor: 'surplus_value', format: formatSignedMillions }
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
    { header: 'On/Off DPM', accessor: 'on_off_dpm', format: formatSignedMetric },
    { header: 'RAPM', accessor: 'bayes_rapm_total', format: formatSignedMetric },
    { header: 'MPG', accessor: 'x_minutes', format: (v) => formatFixed(v, 1) },
    { header: 'Pace', accessor: 'x_pace', format: (v) => formatFixed(v, 1) },
    { header: 'Pts per 100', accessor: 'x_pts_100', format: (v) => formatFixed(v, 1) },
    { header: 'Ast per 100', accessor: 'x_ast_100', format: (v) => formatFixed(v, 1) },
    { header: 'FG%', accessor: 'x_fg_pct', format: formatPercent },
    { header: '3P%', accessor: 'x_fg3_pct', format: formatPercent },
    { header: 'FT%', accessor: 'x_ft_pct', format: formatPercent },
    { header: '3P% (trend)', accessor: 'tr_fg3_pct', format: formatPercent },
    { header: 'FT% (trend)', accessor: 'tr_ft_pct', format: formatPercent },
    { header: 'Fair Salary', accessor: 'sal_market_fixed', format: formatMillions },
    { header: 'Surplus Value', accessor: 'surplus_value', format: formatSignedMillions },
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

export const standingsExpandedCsvColumns = [
    { header: '#', accessor: 'Rk' },
    { header: 'Team', accessor: 'team_name' },
    { header: 'Conference', accessor: 'conference', format: formatConference },
    { header: 'Current', accessor: 'Current' },
    { header: 'W', accessor: 'W', format: (v) => formatFixed(v, 1) },
    { header: 'L', accessor: 'L', format: (v) => formatFixed(v, 1) },
    { header: 'SRS', accessor: 'SRS', format: (v) => formatFixed(v, 2) },
    { header: 'Playoff%', accessor: 'Playoffs', format: (v) => formatFixed(v, 1) },
    { header: 'Win Conf%', accessor: 'Win Conf', format: (v) => formatFixed(v, 1) },
    { header: 'Win Finals%', accessor: 'Win Finals', format: (v) => formatFixed(v, 1) },
    { header: 'Lottery%', accessor: 'Lottery%', format: (v) => formatFixed(v, 1) },
    { header: 'E[Pick]', accessor: 'ExpPick', format: (v) => formatFixed(v, 1) },
    { header: 'W/L%', accessor: 'W/L%', format: (v) => formatFixed(v, 1) },
    { header: 'Remain', accessor: 'Remain' },
    { header: 'Best', accessor: 'Best' },
    { header: 'Worst', accessor: 'Worst' },
    { header: 'Division%', accessor: 'Division', format: (v) => formatFixed(v, 1) },
    { header: '1', accessor: 'seed_1', format: (v) => formatFixed(v, 1) },
    { header: '2', accessor: 'seed_2', format: (v) => formatFixed(v, 1) },
    { header: '3', accessor: 'seed_3', format: (v) => formatFixed(v, 1) },
    { header: '4', accessor: 'seed_4', format: (v) => formatFixed(v, 1) },
    { header: '5', accessor: 'seed_5', format: (v) => formatFixed(v, 1) },
    { header: '6', accessor: 'seed_6', format: (v) => formatFixed(v, 1) },
    { header: '7', accessor: 'seed_7', format: (v) => formatFixed(v, 1) },
    { header: '8', accessor: 'seed_8', format: (v) => formatFixed(v, 1) },
    { header: '9', accessor: 'seed_9', format: (v) => formatFixed(v, 1) },
    { header: '10', accessor: 'seed_10', format: (v) => formatFixed(v, 1) },
    { header: '1-6', accessor: '1-6', format: (v) => formatFixed(v, 1) },
    { header: '7', accessor: '7', format: (v) => formatFixed(v, 1) },
    { header: '8', accessor: '8', format: (v) => formatFixed(v, 1) },
    { header: '9', accessor: '9', format: (v) => formatFixed(v, 1) },
    { header: '10', accessor: '10', format: (v) => formatFixed(v, 1) },
    { header: 'Out', accessor: 'Out', format: (v) => formatFixed(v, 1) }
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
    { header: '+12', accessor: 'p12', format: (v) => formatFixed(v, 1) },
    { header: '+13', accessor: 'p13', format: (v) => formatFixed(v, 1) },
    { header: '+14', accessor: 'p14', format: (v) => formatFixed(v, 1) },
    { header: '+15', accessor: 'p15', format: (v) => formatFixed(v, 1) }
];

export const teamPlayersCsvColumns = [
    { header: 'Player', accessor: 'player_name' },
    { header: 'Pos', accessor: 'position', format: formatOrDash },
    { header: 'Min', accessor: 'tr_minutes', format: formatMinutes },
    { header: 'DPM', accessor: 'dpm', format: formatSignedMetric },
    { header: 'ODPM', accessor: 'o_dpm', format: formatSignedMetric },
    { header: 'DDPM', accessor: 'd_dpm', format: formatSignedMetric },
    { header: 'Box', accessor: 'box_dpm', format: formatSignedMetric },
    { header: 'On/Off DPM', accessor: 'on_off_dpm', format: formatSignedMetric },
    { header: 'RAPM', accessor: 'bayes_rapm_total', format: formatSignedMetric },
    { header: 'MPG', accessor: 'x_minutes', format: (v) => formatFixed(v, 1) },
    { header: 'Pace', accessor: 'x_pace', format: (v) => formatFixed(v, 1) },
    { header: 'Pts per 100', accessor: 'x_pts_100', format: (v) => formatFixed(v, 1) },
    { header: 'Ast per 100', accessor: 'x_ast_100', format: (v) => formatFixed(v, 1) },
    { header: 'FG%', accessor: 'x_fg_pct', format: formatPercent },
    { header: '3P%', accessor: 'x_fg3_pct', format: formatPercent },
    { header: 'FT%', accessor: 'x_ft_pct', format: formatPercent },
    { header: 'Fair Salary', accessor: 'sal_market_fixed', format: formatMillions },
    { header: 'Surplus Value', accessor: 'surplus_value', format: formatSignedMillions }
];

export const lineupsCsvColumns = [
    { header: 'Variant', accessor: 'variant', format: (v) => String(v || '').toUpperCase() || DASH },
    { header: 'Team', accessor: 'team_name', format: formatOrDash },
    { header: 'Poss', accessor: 'possessions', format: (v) => formatFixed(v, 0) },
    { header: 'Net +/-', accessor: 'net_pm', format: formatSignedMetric },
    { header: 'Off +/-', accessor: 'off_pm', format: formatSignedMetric },
    { header: 'Def +/-', accessor: 'def_pm', format: formatSignedMetric },
    { header: 'Off Synergy', accessor: 'off_synergy', format: formatSignedMetric },
    { header: 'Def Synergy', accessor: 'def_synergy', format: formatSignedMetric },
    { header: 'Player 1', accessor: 'player_1', format: formatOrDash },
    { header: 'Player 2', accessor: 'player_2', format: formatOrDash },
    { header: 'Player 3', accessor: 'player_3', format: formatOrDash },
    { header: 'Player 4', accessor: 'player_4', format: formatOrDash },
    { header: 'Player 5', accessor: 'player_5', format: formatOrDash }
];
