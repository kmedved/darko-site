/**
 * Win distributions from the season simulation: for each team, the share of the 10,000 simulated
 * seasons that ended on each win total. The published table lists only totals some simulation
 * reached (30, 35, 36, …), so totals are numbers on a wins axis, never categories.
 */

/** The middle 80% of simulated seasons: the 10th to the 90th percentile. */
export const WIN_RANGE_LOW = 0.1;
export const WIN_RANGE_HIGH = 0.9;

/** A team's rows as [{ wins, prob }], sorted by wins, without unusable or empty totals. */
export function winPoints(rows) {
    return (rows || [])
        .map((row) => (Array.isArray(row) ? { wins: Number(row[0]), prob: Number(row[1]) } : { wins: Number(row?.wins), prob: Number(row?.prob) }))
        .filter((point) => Number.isFinite(point.wins) && Number.isFinite(point.prob) && point.prob > 0)
        .sort((a, b) => a.wins - b.wins);
}

/**
 * The smallest win total that at least `share` of the simulated seasons reached or stayed under.
 * Shares are rounded in the table, so they are read relative to their own total.
 */
export function winQuantile(points, share) {
    const total = points.reduce((sum, point) => sum + point.prob, 0);
    if (!(total > 0)) return null;
    let cumulative = 0;
    for (const point of points) {
        cumulative += point.prob / total;
        if (cumulative >= share - 1e-9) return point.wins;
    }
    return points[points.length - 1].wins;
}

/** The win totals that bound the middle of the simulated seasons (80% by default). */
export function winRange(points, low = WIN_RANGE_LOW, high = WIN_RANGE_HIGH) {
    if (!points?.length) return null;
    return { low: winQuantile(points, low), high: winQuantile(points, high) };
}

/** "47–61", or a single total once the simulations agree on it late in a season. */
export function formatWinRange(range) {
    if (!range || range.low === null || range.high === null) return '—';
    return range.low === range.high ? String(range.low) : `${range.low}–${range.high}`;
}

/** The average simulated win total. */
export function meanWins(points) {
    const total = points.reduce((sum, point) => sum + point.prob, 0);
    if (!(total > 0)) return null;
    return points.reduce((sum, point) => sum + point.wins * point.prob, 0) / total;
}

/**
 * Every team's distribution as compact [wins, prob] pairs, keyed by team name, or null when the
 * set is incomplete: a team missing, or one whose shares don't add up to its simulations. A read
 * cut short by a row cap returns no error, and drawn anyway it would show clipped tails.
 */
export function leagueWinDistributions(rows, teamNames) {
    if (!rows?.length || !teamNames?.length) return null;
    const byTeam = new Map();
    for (const row of rows) {
        const name = row?.team_name;
        if (!name) continue;
        if (!byTeam.has(name)) byTeam.set(name, []);
        byTeam.get(name).push(row);
    }
    const distributions = {};
    for (const name of teamNames) {
        const points = winPoints(byTeam.get(name));
        const total = points.reduce((sum, point) => sum + point.prob, 0);
        if (!points.length || Math.abs(total - 1) > 0.01) return null;
        distributions[name] = points.map((point) => [point.wins, point.prob]);
    }
    return distributions;
}
