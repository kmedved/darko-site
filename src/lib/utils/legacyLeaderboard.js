/**
 * Legacy leaderboard utility functions.
 * Extracted from LegacyLeaderboard.svelte for testability.
 */

export const LEGACY_COLUMNS = [
	{ key: 'team_name', label: 'Team', type: 'text', align: 'left' },
	{ key: 'player_name', label: 'Player', type: 'text', align: 'left' },
	{ key: '_experience', label: 'Experience', type: 'text', align: 'center' },
	{ key: 'dpm', label: 'DPM', type: 'number', align: 'right', format: 'signed' },
	{ key: 'o_dpm', label: 'O-DPM', type: 'number', align: 'right', format: 'signed' },
	{ key: 'd_dpm', label: 'D-DPM', type: 'number', align: 'right', format: 'signed' },
	{ key: 'box_dpm', label: 'Box DPM', type: 'number', align: 'right', format: 'signed' },
	{ key: 'box_odpm', label: 'Box O-DPM', type: 'number', align: 'right', format: 'signed' },
	{ key: 'box_ddpm', label: 'Box D-DPM', type: 'number', align: 'right', format: 'signed' },
	{ key: 'x_fga_100', label: 'FGA/100', type: 'number', align: 'right' },
	{ key: 'x_fg_pct', label: 'FG%', type: 'number', align: 'right', format: 'percent' },
	{ key: 'x_fg3a_100', label: 'FG3A/100', type: 'number', align: 'right' },
	{ key: 'x_fg3_pct', label: 'FG3%', type: 'number', align: 'right', format: 'percent' },
	{ key: '_fg3a_rate', label: 'FG3ARate%', type: 'number', align: 'right', format: 'percent' },
	{ key: 'x_fta_100', label: 'FTA/100', type: 'number', align: 'right' },
	{ key: 'x_ft_pct', label: 'FT%', type: 'number', align: 'right', format: 'percent' },
	{ key: '_fta_rate', label: 'FTARate%', type: 'number', align: 'right', format: 'percent' }
];

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
