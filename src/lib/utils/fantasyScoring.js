/**
 * Fantasy scoring for DARKO's box-score projections.
 *
 * Per-game lines use the same conversion as the DARKO props stage:
 * possessions = x_minutes * x_pace / 48, and each stat = x_stat_100 * possessions / 100.
 */

export const MIN_PROJECTED_MINUTES = 8;
export const CATEGORY_POOL_SIZE = 156; // a 12-team league rostering 13 players

export const FANTASY_POINT_STATS = Object.freeze([
    { key: 'pts', label: 'PTS' },
    { key: 'reb', label: 'REB' },
    { key: 'ast', label: 'AST' },
    { key: 'stl', label: 'STL' },
    { key: 'blk', label: 'BLK' },
    { key: 'fg3m', label: '3PM' },
    { key: 'tov', label: 'TOV' },
    { key: 'fgm', label: 'FGM' },
    { key: 'fga', label: 'FGA' },
    { key: 'ftm', label: 'FTM' },
    { key: 'fta', label: 'FTA' }
]);

// FG% and FT% are scored by impact (makes above league-average makes on the same attempts),
// so volume counts; turnovers count against.
export const FANTASY_CATEGORIES = Object.freeze([
    { key: 'pts', label: 'PTS' },
    { key: 'reb', label: 'REB' },
    { key: 'ast', label: 'AST' },
    { key: 'stl', label: 'STL' },
    { key: 'blk', label: 'BLK' },
    { key: 'fg3m', label: '3PM' },
    { key: 'fg_pct', label: 'FG%' },
    { key: 'ft_pct', label: 'FT%' },
    { key: 'tov', label: 'TOV' }
]);

const ESPN_WEIGHTS = Object.freeze({
    pts: 1, reb: 1, ast: 2, stl: 4, blk: 4, fg3m: 1, tov: -2, fgm: 2, fga: -1, ftm: 1, fta: -1
});

export const FANTASY_PRESETS = Object.freeze({
    espn: { label: 'ESPN points', weights: ESPN_WEIGHTS },
    yahoo: {
        label: 'Yahoo points',
        weights: Object.freeze({ pts: 1, reb: 1.2, ast: 1.5, stl: 3, blk: 3, fg3m: 0, tov: -1, fgm: 0, fga: 0, ftm: 0, fta: 0 })
    },
    // DraftKings also pays +1.5 for a double-double and +3 for a triple-double. Projected averages
    // cannot say how often a player reaches 10 in two stats, so those bonuses are left out, and
    // the label, a note on the page and the CSV header all say so.
    draftkings: {
        label: 'DraftKings base',
        note: 'DraftKings base scoring: no double-double (+1.5) or triple-double (+3) bonus. DARKO projects per-game averages, which cannot tell how often a player reaches 10 in two stats.',
        csvHeader: 'FP/G (DraftKings base, no bonuses)',
        file: 'draftkings-base',
        weights: Object.freeze({ pts: 1, reb: 1.25, ast: 1.5, stl: 2, blk: 2, fg3m: 0.5, tov: -0.5, fgm: 0, fga: 0, ftm: 0, fta: 0 })
    },
    categories: { label: '9-cat', categories: true },
    custom: { label: 'Custom' }
});

export const DEFAULT_CUSTOM_WEIGHTS = ESPN_WEIGHTS;

function toNumber(value) {
    const n = typeof value === 'number' ? value : Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
}

/** Per-game line from a player's per-100 projections, or null without minutes and pace. */
export function projectPerGame(player) {
    const minutes = toNumber(player?.x_minutes);
    const pace = toNumber(player?.x_pace);
    if (minutes === null || pace === null) return null;

    const mpg = Math.min(Math.max(minutes, 0), 48);
    const possessions = (mpg * pace) / 48;
    const perGame = (key) => ((toNumber(player?.[key]) ?? 0) * possessions) / 100;
    const fgPct = toNumber(player?.x_fg_pct);
    const fg3Pct = toNumber(player?.x_fg3_pct);
    const ftPct = toNumber(player?.x_ft_pct);
    const fga = perGame('x_fga_100');
    const fg3a = perGame('x_fg3a_100');
    const fta = perGame('x_fta_100');

    return {
        minutes: mpg,
        possessions,
        pts: perGame('x_pts_100'),
        reb: perGame('x_orb_100') + perGame('x_drb_100'),
        ast: perGame('x_ast_100'),
        stl: perGame('x_stl_100'),
        blk: perGame('x_blk_100'),
        tov: perGame('x_tov_100'),
        fga,
        fgm: fga * (fgPct ?? 0),
        fg3a,
        fg3m: fg3a * (fg3Pct ?? 0),
        fta,
        ftm: fta * (ftPct ?? 0),
        fg_pct: fgPct,
        ft_pct: ftPct
    };
}

export function pointsPerGame(line, weights) {
    return FANTASY_POINT_STATS.reduce(
        (total, { key }) => total + (toNumber(weights?.[key]) ?? 0) * line[key],
        0
    );
}

function sumOf(items, pick) {
    return items.reduce((total, item) => total + pick(item), 0);
}

function categoryInput(line, key, leagueFg, leagueFt) {
    if (key === 'fg_pct') return line.fgm - leagueFg * line.fga;
    if (key === 'ft_pct') return line.ftm - leagueFt * line.fta;
    return line[key];
}

/**
 * 9-cat z-scores for every line against a draftable pool. The pool starts as the players with
 * the most minutes and is re-picked from the top totals, which settles in a few passes.
 * Returns [{ z: { [category]: number }, total }] aligned with `lines`.
 */
export function categoryScores(lines, { poolSize = CATEGORY_POOL_SIZE, passes = 3 } = {}) {
    if (!lines.length) return [];

    let pool = lines
        .map((line, index) => ({ line, index }))
        .sort((a, b) => b.line.minutes - a.line.minutes)
        .slice(0, Math.max(1, poolSize));
    let scores = [];

    for (let pass = 0; pass < passes; pass += 1) {
        const poolFga = sumOf(pool, (item) => item.line.fga);
        const poolFta = sumOf(pool, (item) => item.line.fta);
        const leagueFg = poolFga > 0 ? sumOf(pool, (item) => item.line.fgm) / poolFga : 0;
        const leagueFt = poolFta > 0 ? sumOf(pool, (item) => item.line.ftm) / poolFta : 0;

        const spread = {};
        for (const { key } of FANTASY_CATEGORIES) {
            const values = pool.map((item) => categoryInput(item.line, key, leagueFg, leagueFt));
            const mean = sumOf(values, (value) => value) / values.length;
            const variance = sumOf(values, (value) => (value - mean) ** 2) / values.length;
            spread[key] = { mean, sd: Math.sqrt(variance) || 1 };
        }

        scores = lines.map((line) => {
            const z = {};
            let total = 0;
            for (const { key } of FANTASY_CATEGORIES) {
                const raw = (categoryInput(line, key, leagueFg, leagueFt) - spread[key].mean) / spread[key].sd;
                z[key] = key === 'tov' ? -raw : raw;
                total += z[key];
            }
            return { z, total };
        });

        pool = scores
            .map((score, index) => ({ line: lines[index], index, total: score.total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, Math.max(1, poolSize));
    }

    return scores;
}

/**
 * Ranked fantasy board: per-game lines plus a value (fantasy points per game, or total z for
 * 9-cat) for every player projected for at least `minMinutes`.
 */
export function buildFantasyBoard(
    players,
    { preset = 'espn', customWeights = DEFAULT_CUSTOM_WEIGHTS, minMinutes = MIN_PROJECTED_MINUTES } = {}
) {
    const config = FANTASY_PRESETS[preset] ?? FANTASY_PRESETS.espn;
    const entries = [];
    for (const player of players ?? []) {
        const line = projectPerGame(player);
        if (line && line.minutes >= minMinutes) entries.push({ player, line });
    }

    let values;
    if (config.categories) {
        values = categoryScores(entries.map((entry) => entry.line)).map((score) => ({
            value: score.total,
            z: score.z
        }));
    } else {
        const weights = config.weights ?? customWeights;
        values = entries.map((entry) => ({ value: pointsPerGame(entry.line, weights), z: null }));
    }

    const board = entries.map((entry, index) => ({
        nba_id: entry.player.nba_id,
        player_name: entry.player.player_name,
        team_name: entry.player.team_name,
        tm_id: entry.player.tm_id,
        position: entry.player.position,
        ...entry.line,
        value: values[index].value,
        z: values[index].z
    }));
    board.sort((a, b) => b.value - a.value || String(a.player_name).localeCompare(String(b.player_name)));
    board.forEach((row, index) => {
        row.rank = index + 1;
    });
    return board;
}
