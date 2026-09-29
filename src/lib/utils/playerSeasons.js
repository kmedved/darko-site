/**
 * Player pages' season-by-season table, from nba_darko's `player_seasons` (every player-season
 * since 1996-97 at its last game day), and "Echoes today", from `player_comps` read backwards:
 * the current players whose ten closest comps include one of this player's seasons.
 */

import { AS_OF_PARAM, seasonLabelFromEndYear } from './timeMachine.js';
import { teamAbbrFromId } from './teamAbbreviations.js';

/**
 * The leaderboard on a season's own recorded day, so the player shows the rating the table
 * lists, even for the season still being played; null without a date.
 */
export function seasonBoardHref(row) {
	return row?.date ? `/?${AS_OF_PARAM}=${row.date}` : null;
}

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/**
 * The table's rows, newest first. With `asOf` (the Time Machine), only seasons that had ended by
 * then; `inProgress` marks the season still being played, whose row is its latest game day.
 */
export function seasonRows(seasons, { asOf = null, inProgress = null } = {}) {
	return (seasons ?? [])
		.filter((row) => !asOf || String(row?.date ?? '').slice(0, 10) <= asOf)
		.map((row) => {
			const games = toNumber(row.games) ?? 0;
			const minutes = toNumber(row.minutes);
			const dpm = toNumber(row.dpm);
			const offense = toNumber(row.o_dpm);
			const defense = toNumber(row.d_dpm) ?? (dpm !== null && offense !== null ? dpm - offense : null);
			const age = toNumber(row.age);
			const date = String(row.date ?? '').slice(0, 10);
			return {
				season: Number(row.season),
				label: seasonLabelFromEndYear(row.season),
				// The season's last game day, which opens the leaderboard as it stood then.
				date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
				team: teamAbbrFromId(row.tm_id) || '—',
				age: age === null ? null : Math.floor(age),
				games,
				playoffGames: toNumber(row.playoff_games) ?? 0,
				mpg: games > 0 && minutes !== null ? minutes / games : null,
				dpm,
				offense,
				defense,
				ageRank: toNumber(row.age_rank),
				ageCount: toNumber(row.age_count),
				inProgress: inProgress !== null && Number(row.season) === inProgress
			};
		})
		.sort((a, b) => b.season - a.season);
}

/**
 * "Echoes today": each current player once, at his closest match among this player's seasons,
 * closest first. `playersById` names them (the active leaderboard's rows).
 */
export function echoRows(comps, playersById, limit = 8) {
	const closest = new Map();
	for (const row of comps ?? []) {
		const id = Number(row?.nba_id);
		const previous = closest.get(id);
		if (!previous || Number(row.similarity) > Number(previous.similarity)) closest.set(id, row);
	}
	return [...closest.values()]
		.map((row) => {
			const player = playersById?.get(Number(row.nba_id));
			if (!player) return null;
			return {
				id: Number(row.nba_id),
				name: player.player_name ?? '',
				team: player.team_name ?? null,
				season: Number(row.comp_season),
				seasonLabel: seasonLabelFromEndYear(row.comp_season),
				similarity: Math.round(Number(row.similarity))
			};
		})
		.filter(Boolean)
		.sort((a, b) => b.similarity - a.similarity || a.name.localeCompare(b.name))
		.slice(0, limit);
}
