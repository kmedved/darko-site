// Contemporary version of the historical comps' standardized, weighted distance.
// Uses only features published for every current profile, without a same-age cutoff
// or past-season trajectory. This is a comparison score, not a probability/model output.
const WEIGHTS = {
    dpm: 3, o_dpm: 1.4, d_dpm: 1.4, age: 1.6,
    x_pts_100: 0.9, x_ast_100: 0.9, reb_100: 0.9,
    x_blk_100: 0.6, x_stl_100: 0.4, tpa_rate: 0.8,
    fta_rate: 0.4, x_tov_100: 0.3
};

function numeric(value) {
    if (value === null || value === undefined || value === '') return NaN;
    return Number(value);
}

function profile(player) {
    const row = Object.fromEntries(Object.keys(WEIGHTS).map((key) => [key, numeric(player[key])]));
    row.reb_100 = numeric(player.x_orb_100) + numeric(player.x_drb_100);
    const shots = numeric(player.x_fga_100);
    row.tpa_rate = shots > 0 ? numeric(player.x_fg3a_100) / shots : NaN;
    row.fta_rate = shots > 0 ? numeric(player.x_fta_100) / shots : NaN;
    return Object.values(row).every(Number.isFinite) ? row : null;
}

/** The ten closest current players to the reference's latest recorded profile.
 * Current players include themselves, first even in an exact tie. Missing profiles
 * never turn into zero-valued players; fewer than ten available matches stay fewer.
 */
export function currentPlayerComps(reference, players, limit = 10) {
    if (!reference || !players?.length) return [];
    const unique = [...new Map(players.map((player) => [Number(player.nba_id), player])).values()];
    const targetPlayer = unique.find((player) => Number(player.nba_id) === Number(reference.nba_id)) ?? reference;
    const target = profile(targetPlayer);
    if (!target) return [];
    const pool = unique.map((player) => ({ player, features: profile(player) })).filter((row) => row.features);
    if (!pool.length) return [];
    const scales = Object.keys(WEIGHTS).map((key) => {
        const mean = pool.reduce((sum, row) => sum + row.features[key], 0) / pool.length;
        const variance = pool.reduce((sum, row) => sum + (row.features[key] - mean) ** 2, 0) / pool.length;
        return { key, sd: Math.sqrt(variance), weight: WEIGHTS[key] };
    });
    return pool.map(({ player, features }) => {
        const distance = Math.sqrt(scales.reduce((sum, { key, sd, weight }) =>
            sum + (sd > 0 ? ((features[key] - target[key]) / sd * weight) ** 2 : 0), 0));
        return {
            id: Number(player.nba_id), name: player.player_name, team: player.team_name,
            self: Number(player.nba_id) === Number(reference.nba_id), distance,
            similarity: Math.max(0, 100 - 8 * distance),
            age: features.age, dpm: features.dpm, offense: features.o_dpm, defense: features.d_dpm,
            points: features.x_pts_100, assists: features.x_ast_100, rebounds: features.reb_100
        };
    }).sort((a, b) => a.distance - b.distance || Number(b.self) - Number(a.self) || a.name.localeCompare(b.name))
        .slice(0, limit);
}
