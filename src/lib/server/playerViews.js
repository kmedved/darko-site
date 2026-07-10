const PLAYER_VIEW_FIELDS = Object.freeze({
    search: ['nba_id', 'player_name', 'team_name', 'position', 'dpm'],
    random: ['nba_id', 'player_name', 'team_name', 'position', 'dpm'],
    percentiles: [
        'nba_id',
        'position',
        'dpm',
        'o_dpm',
        'd_dpm',
        'on_off_dpm',
        'bayes_rapm_total',
        'x_pts_100',
        'x_ast_100',
        'x_fg_pct',
        'x_fg3_pct',
        'x_ft_pct',
        'tr_fg3_pct',
        'tr_ft_pct'
    ],
    leaderboard: [
        'nba_id',
        'player_name',
        'team_name',
        'tm_id',
        'position',
        'season',
        'career_game_num',
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
    ],
    scatterplot: [
        'nba_id',
        'player_name',
        'team_name',
        'position',
        'dpm',
        'o_dpm',
        'd_dpm',
        'box_dpm',
        'box_odpm',
        'box_ddpm',
        'on_off_dpm',
        'on_off_odpm',
        'on_off_ddpm',
        'bayes_rapm_total',
        'bayes_rapm_off',
        'bayes_rapm_def',
        'x_pts_100',
        'x_ast_100',
        'x_orb_100',
        'x_drb_100',
        'x_stl_100',
        'x_blk_100',
        'x_tov_100',
        'x_fg_pct',
        'x_fg3_pct',
        'x_ft_pct',
        'x_fga_100',
        'x_fg3a_100',
        'x_fta_100',
        'x_minutes',
        'x_pace',
        'age',
        'sal_market_fixed',
        'surplus_value'
    ]
});

export const ACTIVE_PLAYER_VIEWS = Object.freeze(Object.keys(PLAYER_VIEW_FIELDS));

export function projectPlayers(rows, view) {
    const fields = PLAYER_VIEW_FIELDS[view];
    if (!fields) return rows || [];

    return (rows || []).map((row) =>
        Object.fromEntries(fields.map((field) => [field, row?.[field] ?? null]))
    );
}
