export const metricDefinitions = {
    dpm: 'Full Daily Plus Minus, combining offensive and defensive contributions.',
    o_dpm: 'Offensive DPM, representing projected offensive impact on scoreboard differential.',
    d_dpm: 'Defensive DPM, representing projected defensive impact on scoreboard differential.',
    box_dpm: 'Box-score-only DPM, built from core on-court box-score components.',
    on_off_dpm: 'On/off DPM, incorporating team-level impact when a player is on vs. off the court.',
    bayes_rapm_total: 'Bayesian RAPM total estimate, in points per 100 possessions above league average.',
    tr_minutes: 'Time-decayed running-average minutes.',
    x_minutes: 'Projected minutes per game.',
    x_pace: 'Projected possession pace (higher values indicate faster-paced play).',
    x_pts_100: 'Projected points per 100 possessions.',
    x_ast_100: 'Projected assists per 100 possessions.',
    x_fg_pct: 'Projected field-goal percentage.',
    x_fg3_pct: 'Projected three-point percentage.',
    x_ft_pct: 'Projected free-throw percentage.'
};

export function getMetricDefinition(metric) {
    return metricDefinitions[metric];
}
