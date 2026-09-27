/**
 * Rewind: DARKO's weekly top players since 1996-97. Frames come from the rating_frames table,
 * sent to the browser as [{ date, season, players: [[nba_id, dpm*100, o_dpm*100, tm_id]] }].
 */

export const RACE_SIZE = 15;
export const RACE_SPEEDS = Object.freeze([1, 2, 4]);
export const RACE_STEP_MS = 820;

// Weeks worth a jump: the late-90s Jordan Bulls through the Jokic years.
export const REWIND_JUMPS = Object.freeze([
	'1998-03-05',
	'2003-03-13',
	'2009-03-12',
	'2016-03-10',
	'2020-02-06',
	'2023-03-09',
	'2026-03-12'
]);

/** Week number within its season and the season's number of frames. */
export function seasonWeek(frames, index) {
	const frame = frames[index];
	if (!frame) return null;
	let first = index;
	while (first > 0 && frames[first - 1].season === frame.season) first -= 1;
	let last = index;
	while (last < frames.length - 1 && frames[last + 1].season === frame.season) last += 1;
	return { season: frame.season, week: index - first + 1, weeks: last - first + 1, first, last };
}

/** Frames spent at No. 1 by each player through `index`, most first: [[nba_id, weeks]]. */
export function reignsThrough(frames, index) {
	const counts = new Map();
	for (let i = 0; i <= index && i < frames.length; i += 1) {
		const leader = frames[i].players[0]?.[0];
		if (leader !== undefined) counts.set(leader, (counts.get(leader) ?? 0) + 1);
	}
	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
}

export function firstFrameOfSeason(frames, season) {
	return frames.findIndex((frame) => frame.season === season);
}

export function lastName(name) {
	const parts = String(name ?? '').trim().split(/\s+/);
	if (parts.length < 2) return parts[0] ?? '';
	const suffix = /^(jr\.?|sr\.?|ii|iii|iv)$/i;
	if (suffix.test(parts.at(-1)) && parts.length > 2) return parts.slice(-2).join(' ');
	return parts.slice(1).join(' ');
}
