/**
 * The Teams overview: all 30 teams by DARKO rating (leagueTeamRatings: each roster's DPM weighted
 * by DARKO's projected minutes), with each one's record, SRS and finish from the season
 * simulation. A finished season shows how it ended (finalStandings.js); a season in progress,
 * the playoff odds.
 */

import { isSeasonComplete, seasonResult } from './finalStandings.js';
import { NBA_TEAMS } from './teamAbbreviations.js';

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

function record(current) {
	const [wins, losses] = String(current ?? '').split('-').map((part) => Number.parseInt(part, 10));
	return Number.isInteger(wins) && Number.isInteger(losses) ? { wins, losses } : { wins: null, losses: null };
}

/** How closely the ratings track win percentage (Pearson r), once every team has 20+ games. */
export function winFit(rows) {
	const points = rows
		.filter((row) => row.wins !== null && row.losses !== null && row.wins + row.losses >= 20)
		.map((row) => [row.rating, row.wins / (row.wins + row.losses)]);
	if (points.length < rows.length || points.length < 10) return null;
	const mean = (index) => points.reduce((total, point) => total + point[index], 0) / points.length;
	const [mx, my] = [mean(0), mean(1)];
	let sxy = 0;
	let sxx = 0;
	let syy = 0;
	for (const [x, y] of points) {
		sxy += (x - mx) * (y - my);
		sxx += (x - mx) ** 2;
		syy += (y - my) ** 2;
	}
	return sxx > 0 && syy > 0 ? { r: sxy / Math.sqrt(sxx * syy), teams: points.length } : null;
}

export function teamsOverview(ratings, simRows) {
	const byAbbr = new Map((ratings ?? []).map((row) => [row.abbr, row]));
	const simByName = new Map((simRows ?? []).map((row) => [row.team_name, row]));
	const complete = isSeasonComplete(simRows ?? []);
	const rows = NBA_TEAMS.map((team) => {
		const rating = byAbbr.get(team.abbr);
		const sim = simByName.get(team.name) ?? null;
		return {
			abbr: team.abbr,
			name: team.name,
			id: team.id,
			rating: toNumber(rating?.rating),
			offense: toNumber(rating?.offense),
			defense: toNumber(rating?.defense),
			record: sim?.Current ?? null,
			...record(sim?.Current),
			srs: toNumber(sim?.SRS),
			finish: sim && complete ? seasonResult(sim) : null,
			playoffOdds: sim && !complete ? toNumber(sim.Playoffs) : null
		};
	})
		.filter((row) => row.rating !== null)
		.sort((a, b) => b.rating - a.rating)
		.map((row, index) => ({ ...row, rank: index + 1 }));
	return { rows, complete, fit: winFit(rows) };
}
