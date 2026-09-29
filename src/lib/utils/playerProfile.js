/**
 * Pieces of the player page from the 2026 redesign's profile (reference/redesign-2026/src/
 * 12-player.js): the DPM rank in the header, the contract and longevity figures, the line that
 * opens Comps & futures, and the jump menu over the page's sections.
 */

import { formatMillions, formatSignedMillions } from './csvPresets.js';
import { ordinal } from './daily.js';
import { seasonLabelFromEndYear } from './timeMachine.js';

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

function firstNumber(...values) {
	for (const value of values) {
		const n = toNumber(value);
		if (n !== null) return n;
	}
	return null;
}

function signed(value, digits = 1) {
	const text = value.toFixed(digits);
	return value > 0 && Number(text) !== 0 ? `+${text}` : text;
}

/** 82 inches as 6'10". */
export function formatHeight(inches) {
	const n = toNumber(inches);
	if (n === null || n <= 0) return null;
	const total = Math.round(n);
	return `${Math.floor(total / 12)}'${total % 12}"`;
}

/**
 * Career games from the season table (player_seasons): regular-season and playoff games.
 * player_ratings' career_game_num counts more than games played, so it isn't used.
 */
export function careerGames(seasons) {
	let regular = 0;
	let playoffs = 0;
	for (const row of seasons ?? []) {
		regular += toNumber(row?.games) ?? 0;
		playoffs += toNumber(row?.playoff_games) ?? 0;
	}
	return { regular, playoffs };
}

/** careerGames for every player in a run of season rows, as a Map by nba_id. */
export function careerGamesById(seasonRows) {
	const seasonsById = new Map();
	for (const row of seasonRows ?? []) {
		const id = Number(row?.nba_id);
		if (!Number.isInteger(id)) continue;
		if (!seasonsById.has(id)) seasonsById.set(id, []);
		seasonsById.get(id).push(row);
	}
	return new Map([...seasonsById].map(([id, seasons]) => [id, careerGames(seasons)]));
}

/** Where a current player's DPM ranks among everyone on today's board: { rank, of }. */
export function dpmRank(nbaId, activePlayers) {
	const ranked = (activePlayers ?? [])
		.map((player) => ({ id: Number(player?.nba_id), dpm: toNumber(player?.dpm) }))
		.filter((player) => player.dpm !== null)
		.sort((a, b) => b.dpm - a.dpm);
	const index = ranked.findIndex((player) => player.id === Number(nbaId));
	return index < 0 ? null : { rank: index + 1, of: ranked.length };
}

/**
 * The contract and longevity tiles: fair value, salary, surplus, WARP, projected seasons left and
 * retirement age (calibrated where published). Tiles without a value are left out. `inSeason`:
 * the offseason's placeholder rows publish WARP at about a tenth of the season's (Jokic 1.7 on
 * 2026-07-26 against 15.8 at the season's end), so WARP waits for the season.
 */
export function contractTiles(info, { inSeason = true } = {}) {
	if (!info) return [];
	const fair = toNumber(info.sal_market_fixed);
	const salary = toNumber(info.actual_salary);
	const surplus = toNumber(info.surplus_value);
	const warp = inSeason ? toNumber(info.warp) : null;
	const seasonsLeft = firstNumber(info.projected_years_remaining_cal, info.projected_years_remaining);
	const retiresAt = firstNumber(info.x_retirement_age_cal, info.x_retirement_age);
	return [
		fair === null ? null : { key: 'fair', label: 'Fair value', value: formatMillions(fair), note: "DARKO's market estimate" },
		salary === null ? null : { key: 'salary', label: 'Salary', value: formatMillions(salary), note: 'Actual' },
		surplus === null
			? null
			: { key: 'surplus', label: 'Surplus', value: formatSignedMillions(surplus), note: 'Value minus salary', tone: surplus >= 0 ? 'up' : 'down' },
		warp === null ? null : { key: 'warp', label: 'WARP', value: warp.toFixed(1), note: 'Wins above replacement' },
		seasonsLeft === null ? null : { key: 'seasons', label: 'Seasons left', value: seasonsLeft.toFixed(1), note: 'Projected' },
		retiresAt === null ? null : { key: 'retires', label: 'Retires at', value: retiresAt.toFixed(1), note: 'Projected age' }
	].filter(Boolean);
}

/**
 * The line that opens Comps & futures: how the player's latest season ranks among every season
 * at the same age since 1996-97, and the closest comp. `seasons` are seasonRows (newest first),
 * `comps` normalized comps (closest first). Null without a ranked season.
 */
export function compsSummary(seasons, comps) {
	const latest = (seasons ?? [])[0];
	if (!latest || latest.dpm === null || latest.ageRank === null || latest.ageCount === null || latest.age === null) return null;
	const top = (comps ?? [])[0];
	return {
		dpm: signed(latest.dpm),
		age: latest.age,
		season: latest.label,
		inProgress: Boolean(latest.inProgress),
		rank: ordinal(latest.ageRank),
		count: latest.ageCount.toLocaleString('en-US'),
		closest: top?.comp_name ? { id: top.comp_id, name: top.comp_name, season: seasonLabelFromEndYear(top.comp_season) } : null
	};
}

/** The jump menu: the page's sections in order, each only when the page shows it. */
export function profileSections(shown) {
	return [
		['seismograph', 'Seismograph'],
		['comps', 'Comps & futures'],
		['echoes', 'Echoes today'],
		['career', 'Career'],
		['contract', 'Contract & longevity'],
		['seasons', 'Season by season'],
		['percentiles', 'Percentiles'],
		['box-score', 'Box score']
	]
		.filter(([id]) => shown[id])
		.map(([id, label]) => ({ id, label }));
}
