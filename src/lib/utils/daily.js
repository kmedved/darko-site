/**
 * The Daily: the front page DARKO's ratings write for themselves. Everything here is a plain
 * function of the published tables (see src/lib/server/daily.js), so the page's content (which
 * windows, how many rows, the thresholds, the words) can change without touching the pipeline.
 */

export const WINDOWS = Object.freeze([
	{ key: '7', label: '7 days', text: 'over the past week', riser: "the week's biggest riser", days: 7 },
	{ key: '30', label: '30 days', text: 'over the past 30 days', riser: "the month's biggest riser", days: 30 },
	{ key: 'season', label: 'Season', text: 'since opening night', riser: "the season's biggest riser", days: null }
]);
export const DEFAULT_WINDOW = '7';
export const BOARD_SIZE = 10;
export const MOVERS_SHOWN = 6;
export const UPDATES_SHOWN = 7;
// Single-game updates count only games of this many minutes, so short stints don't crowd out
// the rotation.
export const UPDATE_MIN_MINUTES = 10;
export const EDITIONS = Object.freeze({
	season: 'Game-day edition',
	playoffs: 'Playoff edition',
	offseason: 'Offseason edition'
});
const DAY_MS = 86_400_000;
// Playoff and play-in games (game_id // 10,000,000).
const POSTSEASON_TYPES = new Set([4, 5]);

// Between seasons The Daily is off the menus, What's new and Ask DARKO. It comes back the morning
// after opening night (2026-27 opens Tuesday, October 20, 2026), once the first games' ratings
// are in. The page itself still opens at /daily.
export const DAILY_RETURNS = '2026-10-21T12:00:00Z';

/** Whether the site lists The Daily at `now`. */
export function dailyListed(now = new Date()) {
	return now.getTime() >= Date.parse(DAILY_RETURNS);
}

function toNumber(value) {
	const n = typeof value === 'number' ? value : Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

export function windowFor(key) {
	return WINDOWS.find((entry) => entry.key === key) ?? WINDOWS[0];
}

function daysBetween(start, end) {
	return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS);
}

/**
 * Games a mover needs in a window: 2 in a week, 5 in a month, and over the season about a
 * fifth of the days since opening night, between 2 and 20.
 */
export function minGamesFor(key, { start = null, end = null } = {}) {
	if (key === '7') return 2;
	if (key === '30') return 5;
	const days = start && end ? daysBetween(start, end) : 170;
	return Math.min(Math.max(Math.round(Math.min(days, 170) * 0.22), 2), 20);
}

/** rating_moves rows grouped by period, with each period's dates. */
export function movesByWindow(rows) {
	const byWindow = {};
	for (const row of rows ?? []) {
		const entry = (byWindow[row.period] ??= { start: row.start_date, end: row.end_date, rows: [] });
		entry.rows.push({
			id: Number(row.nba_id),
			name: row.player_name ?? '',
			tmId: toNumber(row.tm_id),
			games: toNumber(row.games) ?? 0,
			from: toNumber(row.dpm_from),
			to: toNumber(row.dpm_to),
			delta: toNumber(row.delta),
			offenseDelta: toNumber(row.o_delta)
		});
	}
	return byWindow;
}

/** Risers and fallers in one window among players with enough games. */
export function pickMovers(window, key) {
	if (!window) return { risers: [], fallers: [], minGames: minGamesFor(key), eligible: 0 };
	const minGames = minGamesFor(key, window);
	const eligible = window.rows.filter((row) => row.games >= minGames && row.delta !== null);
	return {
		risers: [...eligible].sort((a, b) => b.delta - a.delta).slice(0, MOVERS_SHOWN),
		fallers: [...eligible].sort((a, b) => a.delta - b.delta).slice(0, MOVERS_SHOWN),
		minGames,
		eligible: eligible.length
	};
}

/** The window to show: the one asked for, or the season when it has too few movers. */
export function chooseWindow(byWindow, requested) {
	const key = WINDOWS.some((entry) => entry.key === requested) ? requested : DEFAULT_WINDOW;
	if (key === 'season') return { key, fellBack: false };
	return pickMovers(byWindow[key], key).eligible >= MOVERS_SHOWN ? { key, fellBack: false } : { key: 'season', fellBack: true };
}

/** Which edition: games this past week make a game-day or playoff edition, else offseason. */
export function editionPhase(weekUpdates) {
	if (!weekUpdates?.length) return 'offseason';
	return weekUpdates.some((row) => POSTSEASON_TYPES.has(toNumber(row.game_type))) ? 'playoffs' : 'season';
}

/** "Wembanyama", "Jackson Jr.": the name after the first, keeping a suffix with its surname. */
export function lastName(name) {
	const parts = String(name ?? '').trim().split(/\s+/);
	if (parts.length < 2) return parts[0] ?? '';
	const suffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
	return suffix.test(parts.at(-1)) && parts.length > 2 ? parts.slice(-2).join(' ') : parts.slice(1).join(' ');
}

export function ordinal(n) {
	const suffixes = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return `${n}${suffixes[(v - 20) % 10] ?? suffixes[v] ?? suffixes[0]}`;
}

function signed(value, digits = 2) {
	const n = toNumber(value);
	if (n === null) return '—';
	const rounded = Number(n.toFixed(digits));
	return `${rounded > 0 ? '+' : ''}${rounded.toFixed(digits)}`;
}

/** The headline: who is on top, and who is rising fastest. */
export function headline({ leader, riser, phase, key }) {
	if (!leader) return 'The Daily';
	const lead = `${lastName(leader.name)} ${phase === 'offseason' ? 'finishes on top' : 'leads the league'}`;
	return riser ? `${lead}; ${lastName(riser.name)} is ${windowFor(key).riser}` : lead;
}

/** The lede under the headline, in whole sentences. */
export function lede({ leader, riser, faller, phase, key, minGames, nextSeasonLabel }) {
	const text = windowFor(key).text;
	// In the offseason the ratings include DARKO's offseason update, so they look ahead.
	const where = phase === 'offseason' ? `heads into ${nextSeasonLabel} atop DARKO` : 'sits atop DARKO';
	return [
		leader
			? `${leader.name} ${where} at ${signed(leader.dpm)} per 100 possessions (${signed(leader.offense)} offense, ${signed(leader.defense)} defense).`
			: '',
		riser ? `${riser.name} has climbed ${signed(riser.delta)} ${text}, the biggest rise among players with ${minGames}+ games.` : '',
		faller ? `${faller.name} has slid ${signed(faller.delta)}.` : ''
	]
		.filter(Boolean)
		.join(' ');
}

/** "the best", "the 3rd-best" age-22 season. */
export function ageRecordText(row) {
	const age = Math.floor(toNumber(row.age) ?? 0);
	const rank = toNumber(row.age_rank);
	const place = rank === 1 ? 'the best' : `the ${ordinal(rank)}-best`;
	return `posted ${signed(row.dpm)} at age ${age}, ${place} age-${age} season in DARKO's history.`;
}

/** A player's ratings from `start` on, for a sparkline: series is [[date, dpm], ...]. */
export function seriesFrom(series, start) {
	return (series ?? []).filter(([date]) => !start || date >= start).map(([, value]) => value);
}

/**
 * The same ratings with their dates, for a chart with a time axis. Each game's date has the rating
 * going into it; the rating out of the latest game shares that date, so it is placed a day later,
 * when it takes effect. Dates never repeat.
 */
export function datedSeriesFrom(series, start) {
	const points = [];
	for (const [date, value] of series ?? []) {
		if ((start && date < start) || !Number.isFinite(value)) continue;
		const previous = points.at(-1)?.[0];
		points.push([previous && date <= previous ? daysBefore(previous, -1) : date, value]);
	}
	return points;
}

/** The board's rows from ratings rows (active players, or any date's), best first. */
export function boardRows(rows, size = BOARD_SIZE) {
	return (rows ?? [])
		.map((row) => {
			const dpm = toNumber(row.dpm);
			const offense = toNumber(row.o_dpm);
			const defense = toNumber(row.d_dpm) ?? (dpm !== null && offense !== null ? dpm - offense : null);
			return { id: Number(row.nba_id), name: row.player_name ?? '', team: row.team_name ?? null, dpm, offense, defense };
		})
		.filter((row) => row.dpm !== null)
		.sort((a, b) => b.dpm - a.dpm)
		.slice(0, size);
}

/** 2026 for a season that opened in October 2025. */
export function seasonFromStart(start) {
	const year = Number.parseInt(String(start ?? '').slice(0, 4), 10);
	return Number.isInteger(year) ? year + 1 : null;
}

/** The date `days` before `date` (YYYY-MM-DD). */
export function daysBefore(date, days) {
	return new Date(Date.parse(`${date}T00:00:00Z`) - days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Watchlist cards: each player's rating now, rank among active players, and change in every
 * window (null where they played no game in it).
 */
export function watchCards(ids, { players, byWindow, series }) {
	const ranked = boardRows(players, Infinity);
	const rankOf = new Map(ranked.map((row, index) => [row.id, index + 1]));
	const byId = new Map(ranked.map((row) => [row.id, row]));
	return ids
		.map((id) => {
			const player = byId.get(id);
			if (!player) return null;
			const changes = {};
			for (const { key } of WINDOWS) {
				const move = byWindow?.[key]?.rows.find((row) => row.id === id) ?? null;
				changes[key] = move ? { delta: move.delta, games: move.games } : null;
			}
			return { ...player, rank: rankOf.get(id), changes, series: series?.[id] ?? [] };
		})
		.filter(Boolean);
}
