/**
 * Players in the news, for Career Trajectories. A daily Codex automation writes
 * src/lib/data/trending.json ({ date, players: [{ nba_id, name, reason }] }) and pushes it,
 * which redeploys the site. The page opens on these players while the file is current and on a
 * random active player once it goes stale.
 */

export const MAX_NEWS_PLAYERS = 5;

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EASTERN_DATE = new Intl.DateTimeFormat('en-US', {
	timeZone: 'America/New_York',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** The date in US Eastern time, as YYYY-MM-DD. */
export function easternDate(now = new Date()) {
	const parts = Object.fromEntries(EASTERN_DATE.formatToParts(now).map((part) => [part.type, part.value]));
	return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * The file's players, as { nbaId, label, detail }, while its date is today or yesterday in
 * US Eastern time (or tomorrow, for a file dated in UTC); none once it is older. Entries
 * without a usable ID or name are skipped.
 */
export function newsPlayers(file, now = new Date()) {
	if (!DATE_PATTERN.test(file?.date ?? '') || !Array.isArray(file?.players)) return [];
	const age = (Date.parse(`${easternDate(now)}T00:00:00Z`) - Date.parse(`${file.date}T00:00:00Z`)) / DAY_MS;
	if (!(age >= -1 && age <= 1)) return [];

	const players = [];
	for (const entry of file.players) {
		const nbaId = typeof entry?.nba_id === 'string' ? Number(entry.nba_id) : entry?.nba_id;
		const label = typeof entry?.name === 'string' ? entry.name.trim() : '';
		if (!Number.isInteger(nbaId) || nbaId <= 0 || !label) continue;
		if (players.some((player) => player.nbaId === nbaId)) continue;
		players.push({ nbaId, label, detail: typeof entry.reason === 'string' ? entry.reason.trim() : '' });
		if (players.length === MAX_NEWS_PLAYERS) break;
	}
	return players;
}
