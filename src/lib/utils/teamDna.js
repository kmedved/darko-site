/**
 * Team DNA: where a team's DARKO rating comes from, what its payroll buys and how long its core
 * lasts. The rating is the Roster Lab's: each player's DPM weighted by DARKO's projected minutes,
 * scaled to 240 team minutes, so the team page and the Lab always agree.
 */

import { NBA_TEAMS } from './teamAbbreviations.js';
import { defaultRoster, leagueRank, playersByTeam, rateRoster, winsFor } from './rosterLab.js';

export const PAYROLL_PLAYERS = 12;
export const CORE_PLAYERS = 9;

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/** Every team's default-rotation rating: [{ abbr, rating, offense, defense, minutes }]. */
export function leagueTeamRatings(players) {
	const byTeam = playersByTeam(players);
	const byId = new Map((players ?? []).map((player) => [player.nba_id, player]));
	return NBA_TEAMS.map((team) => {
		const roster = defaultRoster(byTeam.get(team.abbr) ?? []);
		return { abbr: team.abbr, ...rateRoster(roster, byId) };
	});
}

/**
 * The team's rating with its league context: rank of 30 and the Lab's wins over 82 games.
 * `league` is leagueTeamRatings() for all teams; teams without minutes sit out of the mean.
 */
export function teamRatingSummary(abbr, players, league) {
	const byId = new Map((players ?? []).map((player) => [player.nba_id, player]));
	const roster = defaultRoster(players);
	const rating = rateRoster(roster, byId);
	const rated = (league ?? []).filter((team) => team.minutes > 0);
	if (!(rating.minutes > 0) || rated.length === 0) return null;
	const leagueMean = rated.reduce((total, team) => total + team.rating, 0) / rated.length;
	const others = rated.filter((team) => team.abbr !== abbr).map((team) => team.rating);
	return {
		...rating,
		rank: leagueRank(rating.rating, others),
		teams: others.length + 1,
		wins: winsFor(rating.rating, leagueMean)
	};
}

/**
 * Each rotation player's share of the team rating: DPM times their share of the team's minutes,
 * split into offense and defense. The totals add up to the team rating.
 */
export function ratingContributions(players) {
	const byId = new Map((players ?? []).map((player) => [player.nba_id, player]));
	const roster = defaultRoster(players).filter((row) => row.minutes > 0);
	const minutes = roster.reduce((total, row) => total + row.minutes, 0);
	if (minutes <= 0) return [];
	const scale = 5 / minutes;
	return roster
		.map((row) => {
			const player = byId.get(row.id);
			const dpm = toNumber(player?.dpm);
			if (dpm === null) return null;
			const offense = (toNumber(player.o_dpm) ?? 0) * row.minutes * scale;
			const total = dpm * row.minutes * scale;
			const oDpm = toNumber(player.o_dpm) ?? 0;
			return {
				id: row.id,
				name: player.player_name,
				minutes: row.minutes,
				dpm,
				oDpm,
				dDpm: dpm - oDpm,
				offense,
				defense: total - offense,
				total
			};
		})
		.filter(Boolean)
		.sort((a, b) => b.total - a.total);
}

/**
 * A waterfall of one component ('total', 'offense' or 'defense') of the contributions: largest
 * first, each step starting where the one before ended, so the steps walk from zero to the
 * team's rating for that component. `low` and `high` bound every step and the total.
 */
export function ratingWaterfall(rows, component = 'total') {
	const steps = [];
	let running = 0;
	for (const row of [...(rows ?? [])].sort((a, b) => b[component] - a[component])) {
		const start = running;
		running += row[component];
		steps.push({ ...row, value: row[component], start, end: running });
	}
	const ends = [0, ...steps.map((step) => step.end)];
	return { steps, total: running, low: Math.min(...ends), high: Math.max(...ends) };
}

/** Round tick values covering [low, high], about `count` of them. */
export function niceTicks(low, high, count = 5) {
	const span = Math.max(high - low, 1e-9);
	const raw = span / count;
	const power = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= raw) ?? power * 10;
	const ticks = [];
	for (let index = Math.ceil(low / step - 1e-9); index * step <= high + step * 1e-9; index += 1) {
		// Round away float noise (0.6000000000000001) and negative zero.
		ticks.push(Number((index * step).toFixed(10)) || 0);
	}
	return ticks;
}

/**
 * Salary against DARKO's fair value for the best-paid players with both numbers, plus the
 * team's totals. Negative fair values count as zero toward the value total.
 */
export function payrollRows(players, limit = PAYROLL_PLAYERS) {
	const priced = (players ?? [])
		.map((player) => ({
			id: player.nba_id,
			name: player.player_name,
			salary: toNumber(player.actual_salary),
			value: toNumber(player.sal_market_fixed)
		}))
		.filter((row) => row.salary !== null && row.value !== null);
	const payroll = (players ?? []).reduce((total, player) => total + (toNumber(player.actual_salary) ?? 0), 0);
	const value = (players ?? []).reduce((total, player) => total + Math.max(0, toNumber(player.sal_market_fixed) ?? 0), 0);
	const rows = priced
		.sort((a, b) => b.salary - a.salary)
		.slice(0, limit)
		.map((row) => ({ ...row, surplus: row.value - row.salary }));
	return { rows, payroll, value };
}

/** Rotation players by projected minutes: age, rating and how long they are projected to last. */
export function coreOutlook(players, limit = CORE_PLAYERS) {
	const byId = new Map((players ?? []).map((player) => [player.nba_id, player]));
	return defaultRoster(players)
		.filter((row) => row.minutes > 0)
		.sort((a, b) => b.minutes - a.minutes)
		.slice(0, limit)
		.map((row) => {
			const player = byId.get(row.id);
			const onRoster = toNumber(player?.s3);
			return {
				id: row.id,
				name: player?.player_name ?? '',
				minutes: row.minutes,
				age: toNumber(player?.age),
				dpm: toNumber(player?.dpm),
				seasonsLeft: toNumber(player?.projected_years_remaining_cal) ?? toNumber(player?.projected_years_remaining),
				// s3 is a probability; older bundles stored percentages.
				onRosterIn3: onRoster === null ? null : onRoster <= 1 ? onRoster * 100 : onRoster
			};
		});
}
