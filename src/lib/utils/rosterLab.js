/**
 * Roster Lab: rebuild rotations and trade between two teams.
 *
 * A team's DARKO rating is its players' DPM weighted by minutes and scaled to 240 team minutes,
 * so +5 means five points per 100 possessions better than an average team. Wins come from a
 * simple rule rather than a DARKO output: 41 plus 2.7 per point above the league's average team.
 */

import { teamAbbr } from './teamAbbreviations.js';

export const TEAM_MINUTES = 240;
export const MAX_PLAYER_MINUTES = 42;
export const SLIDER_MAX_MINUTES = 44;
export const ROSTER_LIMIT = 15;
export const WINS_PER_POINT = 2.7;
export const GAME_MARGIN_SD = 12.5;
const DEFAULT_ADDED_MINUTES = [6, 34];

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

function round1(value) {
	return Math.round(value * 10) / 10;
}

export function playersByTeam(players) {
	const teams = new Map();
	for (const player of players ?? []) {
		const abbr = teamAbbr(player.team_name);
		if (!abbr) continue;
		if (!teams.has(abbr)) teams.set(abbr, []);
		teams.get(abbr).push(player);
	}
	return teams;
}

/**
 * Scale minutes so the roster totals 240, holding `fixedId` where it is and capping everyone
 * at 42. Returns a new roster.
 */
export function rebalance(roster, fixedId = null) {
	const next = roster.map((row) => ({ ...row }));
	const fixed = next.find((row) => row.id === fixedId);
	const others = next.filter((row) => row !== fixed && row.minutes > 0);
	const target = Math.max(0, TEAM_MINUTES - (fixed?.minutes ?? 0));
	for (let pass = 0; pass < 6; pass += 1) {
		const capped = others.filter((row) => row.minutes >= MAX_PLAYER_MINUTES);
		const free = others.filter((row) => row.minutes < MAX_PLAYER_MINUTES);
		const freeTotal = free.reduce((total, row) => total + row.minutes, 0);
		const cappedTotal = capped.reduce((total, row) => total + row.minutes, 0);
		if (freeTotal <= 0) break;
		const scale = (target - cappedTotal) / freeTotal;
		for (const row of free) row.minutes = Math.min(Math.max(row.minutes * scale, 0), MAX_PLAYER_MINUTES);
		const total = others.reduce((sum, row) => sum + row.minutes, 0);
		if (Math.abs(total - target) < 0.05) break;
	}
	for (const row of next) row.minutes = round1(row.minutes);
	return next;
}

/** A team's rotation from DARKO's projected minutes, scaled to 240. */
export function defaultRoster(teamPlayers) {
	const rotation = [...(teamPlayers ?? [])]
		.sort((a, b) => (toNumber(b.x_minutes) ?? 0) - (toNumber(a.x_minutes) ?? 0))
		.slice(0, ROSTER_LIMIT)
		.map((player) => ({
			id: player.nba_id,
			minutes: Math.min(Math.max(toNumber(player.x_minutes) ?? 0, 0), MAX_PLAYER_MINUTES)
		}));
	return rebalance(rotation);
}

export function addedPlayerMinutes(player) {
	const [low, high] = DEFAULT_ADDED_MINUTES;
	return round1(Math.min(Math.max(toNumber(player?.x_minutes) ?? 18, low), high));
}

/** { rating, offense, defense, minutes } for a roster of { id, minutes }. */
export function rateRoster(roster, playersById) {
	let minutes = 0;
	let total = 0;
	let offense = 0;
	for (const row of roster ?? []) {
		const player = playersById.get(row.id);
		const dpm = toNumber(player?.dpm);
		if (dpm === null || !(row.minutes > 0)) continue;
		minutes += row.minutes;
		total += dpm * row.minutes;
		offense += (toNumber(player.o_dpm) ?? 0) * row.minutes;
	}
	if (minutes <= 0) return { rating: 0, offense: 0, defense: 0, minutes: 0 };
	const scale = 5 / minutes;
	return {
		rating: total * scale,
		offense: offense * scale,
		defense: (total - offense) * scale,
		minutes
	};
}

export function winsFor(rating, leagueMean) {
	return Math.min(Math.max(41 + WINS_PER_POINT * (rating - leagueMean), 0), 82);
}

export function leagueRank(rating, otherRatings) {
	return 1 + otherRatings.filter((other) => other > rating).length;
}

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error below 1.5e-7). */
export function normalCdf(z) {
	const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
	const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
	const erf = 1 - poly * Math.exp(-(z * z) / 2);
	return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/** Neutral-floor odds that A beats B in one game, from the rating gap in points per 100. */
export function gameWinProbability(ratingA, ratingB, pace = 100) {
	const margin = ((ratingA - ratingB) * pace) / 100;
	return { probability: normalCdf(margin / GAME_MARGIN_SD), margin };
}

/** Odds of winning a best-of-(2 * wins - 1) series with per-game odds p. */
export function seriesWinProbability(p, wins = 4) {
	let total = 0;
	let combinations = 1;
	for (let losses = 0; losses < wins; losses += 1) {
		if (losses > 0) combinations = (combinations * (wins - 1 + losses)) / losses;
		total += combinations * p ** wins * (1 - p) ** losses;
	}
	return total;
}
