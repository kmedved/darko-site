/**
 * The 2026 redesign's ten player skills (reference/redesign-2026/src/01-data.js, SKILLS), as
 * metrics for the player page's percentile chart. Most are DARKO per-100 projections; efficiency
 * (true shooting) and ball security (turnovers per play) are rates built from them.
 */

// The ten, in the prototype's order: offense first, then defense.
export const SKILL_METRICS = Object.freeze([
	'x_pts_100',
	'ts_pct',
	'x_ft_pct',
	'x_fg3a_100',
	'x_ast_100',
	'tov_pct',
	'x_orb_100',
	'x_drb_100',
	'x_blk_100',
	'x_stl_100'
]);

// The chart's names for them, which say the skill rather than the stat.
export const SKILL_LABELS = Object.freeze({
	x_pts_100: 'Scoring (pts per 100)',
	ts_pct: 'Efficiency (TS%)',
	x_ft_pct: 'Touch (FT%)',
	x_fg3a_100: '3PT volume (3PA per 100)',
	x_ast_100: 'Playmaking (ast per 100)',
	tov_pct: 'Ball security (TOV%)',
	x_orb_100: 'Off. boards (per 100)',
	x_drb_100: 'Def. boards (per 100)',
	x_blk_100: 'Rim protection (blk per 100)',
	x_stl_100: 'Steals (per 100)'
});

// Fewer turnovers per play is better, so its percentile counts the players with more.
export const LOWER_IS_BETTER = new Set(['tov_pct']);

// The fields a row needs for every skill, for the active-player view the page ranks against.
export const SKILL_FIELDS = Object.freeze([
	'x_pts_100',
	'x_ast_100',
	'x_ft_pct',
	'x_fga_100',
	'x_fta_100',
	'x_fg3a_100',
	'x_tov_100',
	'x_orb_100',
	'x_drb_100',
	'x_blk_100',
	'x_stl_100'
]);

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/**
 * A row with its true shooting (points over 2 x true-shot attempts, FGA + 0.44 x FTA) and its
 * turnovers per play (turnovers over true-shot attempts plus turnovers), from per-100 projections.
 */
export function withSkillRates(row) {
	if (!row) return row;
	const points = toNumber(row.x_pts_100);
	const shots = toNumber(row.x_fga_100);
	const freeThrows = toNumber(row.x_fta_100);
	const turnovers = toNumber(row.x_tov_100);
	const trueShots = shots === null || freeThrows === null ? null : shots + 0.44 * freeThrows;
	return {
		...row,
		ts_pct: points === null || !trueShots ? null : points / (2 * trueShots),
		tov_pct: turnovers === null || trueShots === null || trueShots + turnovers <= 0 ? null : turnovers / (trueShots + turnovers)
	};
}

/** Share of `values` a player's value beats, 0-100 (for lower-is-better metrics, the share it's under). */
export function percentileAmong(value, values, metric) {
	if (value === null || !values.length) return null;
	const beaten = LOWER_IS_BETTER.has(metric)
		? values.filter((other) => other > value).length
		: values.filter((other) => other < value).length;
	return Math.round((beaten / values.length) * 100);
}
