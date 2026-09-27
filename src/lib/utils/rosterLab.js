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
 * Scale minutes so the roster totals 240, holding `fixedId` where it is. A roster over 240 comes
 * down in proportion (which never pushes anyone past a cap, so players at 42 shrink too); one
 * under 240 goes up in proportion with everyone capped at 42. A rounding residue goes to the
 * player with the most room. Returns a new roster; one too short to reach 240 stays short.
 */
export function rebalance(roster, fixedId = null) {
	const next = roster.map((row) => ({ ...row }));
	const fixed = next.find((row) => row.id === fixedId);
	const others = next.filter((row) => row !== fixed && row.minutes > 0);
	const target = Math.max(0, TEAM_MINUTES - (fixed?.minutes ?? 0));
	const current = others.reduce((total, row) => total + row.minutes, 0);
	if (current > target) {
		for (const row of others) row.minutes *= target / current;
	} else if (current < target) {
		for (let pass = 0; pass < others.length; pass += 1) {
			const free = others.filter((row) => row.minutes < MAX_PLAYER_MINUTES);
			const freeTotal = free.reduce((total, row) => total + row.minutes, 0);
			const heldTotal = others.reduce((total, row) => total + row.minutes, 0) - freeTotal;
			if (freeTotal <= 0) break;
			const scale = (target - heldTotal) / freeTotal;
			for (const row of free) row.minutes = Math.min(row.minutes * scale, MAX_PLAYER_MINUTES);
			if (Math.abs(others.reduce((total, row) => total + row.minutes, 0) - target) < 0.05) break;
		}
	}
	for (const row of next) row.minutes = round1(row.minutes);
	const residue = round1(target - others.reduce((total, row) => total + row.minutes, 0));
	if (residue !== 0 && Math.abs(residue) < 1) {
		const roomy = others
			.filter((row) => (residue > 0 ? row.minutes + residue <= MAX_PLAYER_MINUTES : row.minutes + residue >= 0))
			.sort((a, b) => (residue > 0 ? a.minutes - b.minutes : b.minutes - a.minutes))[0];
		if (roomy) roomy.minutes = round1(roomy.minutes + residue);
	}
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

// A Lab scenario is a set of edited rosters keyed by team. A player belongs to at most one team:
// an edited roster claims its players, and every other team's roster drops them.

/** Which edited roster holds each player, as id -> team. */
export function claimedPlayers(edits) {
	const claimed = new Map();
	for (const [abbr, roster] of Object.entries(edits ?? {})) {
		for (const row of roster ?? []) claimed.set(row.id, abbr);
	}
	return claimed;
}

/** A team's roster in the scenario: its edit, or its default rotation minus claimed players. */
export function scenarioRoster(abbr, edits, baseRosters, auto = true) {
	if (edits?.[abbr]) return edits[abbr];
	const base = baseRosters.get(abbr) ?? [];
	const claimed = claimedPlayers(edits);
	const kept = base.filter((row) => (claimed.get(row.id) ?? abbr) === abbr);
	if (kept.length === base.length) return base;
	return auto ? rebalance(kept) : kept;
}

/** The team whose scenario roster holds `id`, or null. `homeOf(id)` is the player's own team. */
export function scenarioOwner(id, edits, baseRosters, homeOf, auto = true) {
	const claimed = claimedPlayers(edits).get(id);
	if (claimed) return claimed;
	const home = homeOf(id);
	return home && scenarioRoster(home, edits, baseRosters, auto).some((row) => row.id === id) ? home : null;
}

/**
 * Put `id` on team `to`, taking them off whichever roster holds them, on screen or not. They keep
 * their minutes from that roster (else `minutes`, else `defaultMinutes`). Returns new edits.
 */
export function addToScenario(edits, baseRosters, { to, id, minutes = null, defaultMinutes = 0, homeOf, auto = true }) {
	const current = scenarioRoster(to, edits, baseRosters, auto);
	if (current.some((row) => row.id === id)) return edits;
	const next = { ...edits };
	const owner = scenarioOwner(id, edits, baseRosters, homeOf, auto);
	let carried = minutes;
	if (owner) {
		const ownerRoster = scenarioRoster(owner, edits, baseRosters, auto);
		carried ??= ownerRoster.find((row) => row.id === id)?.minutes ?? null;
		// An edited owner loses the player here; an unedited one drops them once `to` claims them.
		if (edits[owner]) {
			const remaining = ownerRoster.filter((row) => row.id !== id);
			next[owner] = auto ? rebalance(remaining) : remaining;
		}
	}
	const home = homeOf(id);
	const roster = [...current, { id, minutes: carried ?? defaultMinutes, from: home && home !== to ? home : 'FA' }];
	next[to] = auto ? rebalance(roster, id) : roster;
	return next;
}

/**
 * Restore `abbr` to its default rotation and undo every transfer involving it: its own players
 * leave the other edited rosters, and players it acquired go back to their teams.
 */
export function resetScenarioTeam(edits, baseRosters, abbr, { homeOf, auto = true }) {
	const next = { ...edits };
	const acquired = (edits?.[abbr] ?? []).filter((row) => homeOf(row.id) !== abbr).map((row) => row.id);
	delete next[abbr];
	const own = new Set((baseRosters.get(abbr) ?? []).map((row) => row.id));
	for (const [team, roster] of Object.entries(next)) {
		if (!roster.some((row) => own.has(row.id))) continue;
		const kept = roster.filter((row) => !own.has(row.id));
		next[team] = auto ? rebalance(kept) : kept;
	}
	for (const id of acquired) {
		const home = homeOf(id);
		// An unedited home team takes the player back on its own.
		if (!home || !next[home] || next[home].some((row) => row.id === id)) continue;
		const baseRow = (baseRosters.get(home) ?? []).find((row) => row.id === id);
		if (!baseRow) continue;
		const roster = [...next[home], { ...baseRow }];
		next[home] = auto ? rebalance(roster, id) : roster;
	}
	return next;
}

/** Saved edits from before ownership was enforced can list a player twice; keep the first. */
export function dedupeEdits(edits) {
	const seen = new Set();
	const next = {};
	for (const [abbr, roster] of Object.entries(edits ?? {})) {
		next[abbr] = (roster ?? []).filter((row) => {
			if (seen.has(row.id)) return false;
			seen.add(row.id);
			return true;
		});
	}
	return next;
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
