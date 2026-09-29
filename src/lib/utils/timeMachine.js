/**
 * Time Machine: one site-wide "as of" date, carried in the URL as ?asof=YYYY-MM-DD.
 *
 * Date-aware pages (the leaderboard, player pages, Roster Lab and Rewind) show DARKO as it
 * stood on that date. Every other page shows today's data and says so. The date sticks
 * across in-app navigation until the reader returns to today.
 */

export const AS_OF_PARAM = 'asof';
export const HISTORY_START = '1996-11-01';
const DAY_MS = 86_400_000;

const DATE_AWARE_PATHS = [
	(path) => path === '/',
	(path) => path.startsWith('/player/'),
	(path) => path === '/lab',
	(path) => path === '/rewind',
	(path) => path === '/daily'
];

export function isDateAwarePath(pathname) {
	return DATE_AWARE_PATHS.some((matches) => matches(pathname ?? ''));
}

/**
 * Whether the Time Machine strip is folded into its nav button. A reader's own choice
 * ('collapsed' or 'open', remembered in localStorage) always wins. Without one the strip stays
 * folded, and opens by itself while a date is set or on Rewind. app.html repeats this rule
 * before first paint.
 */
export function isTimeMachineFolded(choice, { rewound = false, pathname = '' } = {}) {
	if (choice === 'collapsed') return true;
	if (choice === 'open') return false;
	return !rewound && pathname !== '/rewind';
}

/** A real calendar date as YYYY-MM-DD, or null. */
export function parseAsOfDate(value) {
	if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
	const date = value.trim();
	const parsed = new Date(`${date}T00:00:00Z`);
	if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
	return date >= HISTORY_START ? date : null;
}

export function addDays(date, days) {
	const parsed = new Date(`${date}T00:00:00Z`);
	return new Date(parsed.getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
	return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/** The same URL with the Time Machine set to `date`, or cleared when `date` is null. */
// On the leaderboard a Time Machine date stands in for the season picker, so setting or clearing
// the date drops a leftover ?season= (else "Back to today" would reopen that old season).
export function withAsOf(url, date) {
	const next = new URL(url);
	if (date) next.searchParams.set(AS_OF_PARAM, date);
	else next.searchParams.delete(AS_OF_PARAM);
	if (next.pathname === '/') next.searchParams.delete('season');
	return next;
}

export function relativeHref(url) {
	return `${url.pathname}${url.search}${url.hash}`;
}

export function formatAsOfDate(date, { weekday = false, short = false } = {}) {
	if (!date) return '';
	const parsed = new Date(`${date}T12:00:00Z`);
	if (Number.isNaN(parsed.getTime())) return date;
	return parsed.toLocaleDateString('en-US', {
		timeZone: 'UTC',
		month: short ? 'short' : 'long',
		day: 'numeric',
		year: 'numeric',
		...(weekday ? { weekday: 'short' } : {})
	});
}

export function seasonLabelFromEndYear(season) {
	const year = Number.parseInt(season, 10);
	return Number.isInteger(year) ? `${year - 1}-${String(year).slice(2)}` : '';
}

/**
 * Where a date falls in DARKO's history, from the season calendar
 * ([{ season, first_game, regular_season_end, last_game }]).
 * phase: 'preseason' (before a season's first game), 'regular', 'playoffs' or 'offseason'.
 */
export function locateDate(calendar, date) {
	const seasons = [...(calendar ?? [])].sort((a, b) => a.season - b.season);
	if (!date || seasons.length === 0) return null;
	let current = null;
	for (const row of seasons) {
		if (row.first_game <= date) current = row;
	}
	if (!current) return { season: seasons[0].season, phase: 'preseason', row: seasons[0] };
	if (date <= current.regular_season_end) return { season: current.season, phase: 'regular', row: current };
	if (date <= current.last_game) return { season: current.season, phase: 'playoffs', row: current };
	const next = seasons.find((row) => row.season === current.season + 1);
	const nearNext = next && daysBetween(date, next.first_game) <= 21;
	return { season: current.season, phase: nearNext ? 'preseason' : 'offseason', row: current };
}

/**
 * Earliest date whose rows can still describe a player's standing on `anchorDate`: four weeks
 * of play, reaching back past every team's final regular-season game once one has ended its
 * season, so eliminated teams (and the 2019-20 teams left out of the bubble) keep their players.
 */
export function asOfWindowStart(anchorDate, calendarRow, recentDays = 28) {
	const finale = calendarRow?.earliest_team_finale ?? calendarRow?.regular_season_end;
	const end = finale && anchorDate > finale ? finale : anchorDate;
	const start = addDays(end, -(recentDays - 1));
	return calendarRow?.first_game && start < calendarRow.first_game ? calendarRow.first_game : start;
}

/** Index of the latest frame on or before `date` (frames sorted by date), or -1. */
export function frameIndexAtOrBefore(frameDates, date) {
	let low = 0;
	let high = frameDates.length - 1;
	let answer = -1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		if (frameDates[middle] <= date) {
			answer = middle;
			low = middle + 1;
		} else {
			high = middle - 1;
		}
	}
	return answer;
}
