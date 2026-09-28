/**
 * A player's projected box score: DARKO's per-100 projections, and per game at his projected
 * minutes and pace, with the Fantasy Lab's conversion (projectPerGame).
 */

import { projectPerGame } from './fantasyScoring.js';

const ROWS = Object.freeze([
	{ label: 'Points', keys: ['x_pts_100'] },
	{ label: 'Rebounds', keys: ['x_orb_100', 'x_drb_100'] },
	{ label: 'Offensive', keys: ['x_orb_100'], sub: true },
	{ label: 'Defensive', keys: ['x_drb_100'], sub: true },
	{ label: 'Assists', keys: ['x_ast_100'] },
	{ label: 'Steals', keys: ['x_stl_100'] },
	{ label: 'Blocks', keys: ['x_blk_100'] },
	{ label: 'Turnovers', keys: ['x_tov_100'] },
	{ label: '3-pt attempts', keys: ['x_fg3a_100'] },
	{ label: 'FG attempts', keys: ['x_fga_100'] },
	{ label: 'FT attempts', keys: ['x_fta_100'] }
]);

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/** The box score, or null without projected minutes and pace. */
export function projectedBoxScore(player) {
	const line = projectPerGame(player);
	if (!line) return null;
	return {
		minutes: line.minutes,
		pace: toNumber(player.x_pace),
		rows: ROWS.map(({ label, keys, sub = false }) => {
			const per100 = keys.reduce((total, key) => total + (toNumber(player[key]) ?? 0), 0);
			return { label, sub, per100, perGame: (per100 * line.possessions) / 100 };
		}),
		shooting: {
			fg: toNumber(player.x_fg_pct),
			fg3: toNumber(player.x_fg3_pct),
			ft: toNumber(player.x_ft_pct)
		}
	};
}
