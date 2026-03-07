/**
 * Legacy leaderboard utility functions.
 * Extracted from LegacyLeaderboard.svelte for testability.
 */

import { LEGACY_LEADERBOARD_COLUMNS } from './leaderboardColumns.js';

export const LEGACY_COLUMNS = LEGACY_LEADERBOARD_COLUMNS;

/** Derive _experience, _fg3a_rate, _fta_rate from raw player data. */
export function enrichPlayer(p) {
	const fga = parseFloat(p.x_fga_100);
	const fg3a = parseFloat(p.x_fg3a_100);
	const fta = parseFloat(p.x_fta_100);
	const games = parseFloat(p.career_game_num);
	return {
		...p,
		_experience: Number.isFinite(games) && games >= 164 ? 'Vet' : 'Rk',
		_fg3a_rate: Number.isFinite(fga) && fga > 0 && Number.isFinite(fg3a) ? fg3a / fga : null,
		_fta_rate: Number.isFinite(fga) && fga > 0 && Number.isFinite(fta) ? fta / fga : null
	};
}

/** Filter players by column filters. Supports text substring, >N, <N, and exact match for numbers. */
export function filterPlayers(players, columns, columnFilters) {
	return players.filter((p) => {
		for (const col of columns) {
			const filter = (columnFilters[col.key] || '').trim();
			if (!filter) continue;

			const val = p[col.key];

			if (col.type === 'text') {
				if (!String(val || '').toLowerCase().includes(filter.toLowerCase())) return false;
			} else {
				const num = parseFloat(val);
				if (filter.startsWith('>')) {
					const threshold = parseFloat(filter.slice(1));
					if (!Number.isFinite(threshold) || !Number.isFinite(num) || num <= threshold)
						return false;
				} else if (filter.startsWith('<')) {
					const threshold = parseFloat(filter.slice(1));
					if (!Number.isFinite(threshold) || !Number.isFinite(num) || num >= threshold)
						return false;
				} else {
					const threshold = parseFloat(filter);
					if (Number.isFinite(threshold)) {
						if (!Number.isFinite(num) || Math.abs(num - threshold) > 0.05) return false;
					}
				}
			}
		}
		return true;
	});
}
