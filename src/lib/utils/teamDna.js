/**
 * Team DNA: where a team's DARKO rating comes from, what its payroll buys and how long its core
 * lasts. The rating is the Roster Lab's: each player's DPM weighted by DARKO's projected minutes,
 * scaled to 240 team minutes, so the team page and the Lab always agree.
 */

import { NBA_TEAMS } from './teamAbbreviations.js';
import { defaultRoster, leagueRank, playersByTeam, rateRoster, winsFor } from './rosterLab.js';

export const PAYROLL_PLAYERS = 12;
export const CORE_PLAYERS = 9;
/** Players projected for fewer minutes than this share one "Deep bench" row. */
export const DEEP_BENCH_MINUTES = 5;

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
 * Each player's share of a roster's rating: DPM times their share of the roster's minutes (as
 * rateRoster() counts them), split into offense and defense. The totals add up to the rating.
 * `roster` is [{ id, minutes }], so this works for the Roster Lab's edited rosters too.
 */
export function rosterContributions(roster, playersById) {
	const rated = (roster ?? [])
		.map((row) => ({ row, player: playersById.get(row.id) }))
		.filter(({ row, player }) => row.minutes > 0 && toNumber(player?.dpm) !== null);
	const minutes = rated.reduce((total, { row }) => total + row.minutes, 0);
	if (minutes <= 0) return [];
	const scale = 5 / minutes;
	return rated
		.map(({ row, player }) => {
			const dpm = toNumber(player.dpm);
			const oDpm = toNumber(player.o_dpm) ?? 0;
			const total = dpm * row.minutes * scale;
			const offense = oDpm * row.minutes * scale;
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
		.sort((a, b) => b.total - a.total);
}

/** The contributions for a team's default rotation, largest first. */
export function ratingContributions(players) {
	const byId = new Map((players ?? []).map((player) => [player.nba_id, player]));
	return rosterContributions(defaultRoster(players), byId);
}

/**
 * Fold players under `under` minutes into one deep-bench row, last, when two or more qualify.
 * Folding goes by minutes, never by contribution, so no one who plays real minutes disappears.
 */
export function foldDeepBench(rows, under = DEEP_BENCH_MINUTES) {
	const bench = (rows ?? []).filter((row) => row.minutes < under);
	if (bench.length < 2) return [...(rows ?? [])];
	const sum = (key) => bench.reduce((total, row) => total + row[key], 0);
	const minutes = sum('minutes');
	const weighted = (key) => bench.reduce((total, row) => total + row[key] * row.minutes, 0) / minutes;
	return [
		...rows.filter((row) => row.minutes >= under),
		{
			id: 'deep-bench',
			name: 'Deep bench',
			bench: true,
			players: bench.map(({ id, name, minutes: playerMinutes, dpm }) => ({ id, name, minutes: playerMinutes, dpm })),
			minutes,
			dpm: weighted('dpm'),
			oDpm: weighted('oDpm'),
			dDpm: weighted('dDpm'),
			offense: sum('offense'),
			defense: sum('defense'),
			total: sum('total')
		}
	];
}

/** Rows sorted by one column, largest first, with the deep bench kept last. */
export function sortContributions(rows, key = 'total') {
	const list = rows ?? [];
	return [...list.filter((row) => !row.bench).sort((a, b) => b[key] - a[key]), ...list.filter((row) => row.bench)];
}

/**
 * What the players above average add and what the ones below take away, from every player
 * (before any folding): { above, below, total, aboveCount, belowCount }.
 */
export function contributionSummary(rows) {
	const summary = { above: 0, below: 0, total: 0, aboveCount: 0, belowCount: 0 };
	for (const row of rows ?? []) {
		if (row.total > 0) {
			summary.above += row.total;
			summary.aboveCount += 1;
		} else if (row.total < 0) {
			summary.below += row.total;
			summary.belowCount += 1;
		}
		summary.total += row.total;
	}
	return summary;
}

/** One range for the offense, defense and net columns: every value, and zero. */
export function contributionExtent(rows) {
	let low = 0;
	let high = 0;
	for (const row of rows ?? []) {
		for (const value of [row.offense, row.defense, row.total]) {
			low = Math.min(low, value);
			high = Math.max(high, value);
		}
	}
	return { low, high };
}

/**
 * A waterfall of one component ('total', 'offense' or 'defense') of the contributions: largest
 * first and the deep bench last, each step starting where the one before ended, so the steps
 * walk from zero to the team's rating for that component. `low` and `high` bound every step and
 * the total; `peak` is the running total's high point when later steps take some of it back.
 */
export function ratingWaterfall(rows, component = 'total') {
	const steps = [];
	let running = 0;
	for (const row of sortContributions(rows, component)) {
		const start = running;
		running += row[component];
		steps.push({ ...row, value: row[component], start, end: running });
	}
	const ends = [0, ...steps.map((step) => step.end)];
	const low = Math.min(...ends);
	const high = Math.max(...ends);
	return { steps, total: running, low, high, peak: high > Math.max(0, running) + 1e-9 ? high : null };
}

/**
 * The Minutes chart: each player's DPM (height) over their share of the roster's minutes
 * (width), best DPM first and the deep bench last. A bar's area is the player's contribution;
 * the bars add up to the rating, which is five times the minutes-weighted DPM (`mean`), because
 * the Lab rates any roster as if its minutes filled 240.
 */
export function minutesProfile(rows) {
	const list = rows ?? [];
	const minutes = list.reduce((total, row) => total + row.minutes, 0);
	if (!(minutes > 0)) return { bars: [], minutes: 0, mean: 0, rating: 0, low: 0, high: 0 };
	let at = 0;
	const sorted = sortContributions(list, 'dpm');
	const bars = sorted.map((row, index) => {
		const share = row.minutes / minutes;
		const bar = { ...row, share, x0: at, x1: index === sorted.length - 1 ? 1 : at + share };
		at += share;
		return bar;
	});
	const mean = list.reduce((total, row) => total + row.dpm * row.minutes, 0) / minutes;
	const values = list.map((row) => row.dpm);
	return { bars, minutes, mean, rating: mean * 5, low: Math.min(0, ...values), high: Math.max(0, ...values) };
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

/** A tick label: 0, +2, -1.5. */
export function formatTick(value) {
	if (value === 0) return '0';
	const text = Number.isInteger(value) ? String(Math.abs(value)) : Math.abs(value).toFixed(1);
	return `${value > 0 ? '+' : '-'}${text}`;
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
