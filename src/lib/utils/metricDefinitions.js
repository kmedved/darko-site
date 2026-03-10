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
    x_ft_pct: 'Projected free-throw percentage.',
    sal_market_fixed: 'Estimated fair market salary based on projected on-court value.',
    surplus_value: 'Difference between fair salary and actual salary. Positive means underpaid.',
    lineup_net_pm: 'Projected net plus/minus per 100 possessions for this lineup, relative to league average.',
    lineup_off_pm: 'Projected offensive plus/minus per 100 possessions for this lineup, relative to league average.',
    lineup_def_pm: 'Projected defensive plus/minus per 100 possessions for this lineup, relative to league average.',
    lineup_poss: 'Number of possessions this lineup has played together this season.',
    lineup_off_synergy: 'Offensive synergy — the gap between this lineup\'s projected offensive rating and the sum of its individual players\' offensive ratings.',
    lineup_def_synergy: 'Defensive synergy — the gap between this lineup\'s projected defensive rating and the sum of its individual players\' defensive ratings.'
};

export function getMetricDefinition(metric) {
    return metricDefinitions[metric];
}
