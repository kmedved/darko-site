/**
 * Get the NBA season start year from a date string.
 * July+ belongs to the season starting that year; Jan-June to the previous year.
 * e.g., "2024-01-15" => 2023 (2023-24 season)
 *       "2024-10-22" => 2024 (2024-25 season)
 */
export function getSeasonStartYear(dateStr) {
	if (typeof dateStr !== 'string') return null;
	const normalized = dateStr.trim();
	if (!normalized) return null;

	// Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:MM:SS" formats
	const dateOnly = normalized.includes('T') ? normalized.split('T')[0] : normalized;
	const parts = dateOnly.split('-');
	const year = parseInt(parts[0], 10);
	const month = parseInt(parts[1], 10); // 1-indexed
	if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
		return null;
	}
	return month >= 7 ? year : year - 1;
}

/**
 * Format a season start year as a label: 2023 => "2023-24"
 */
export function formatSeasonLabel(startYear) {
	return `${startYear}-${String(startYear + 1).slice(2)}`;
}

/**
 * Format a season ending year as a label: 2026 => "2025-26"
 */
export function formatSeasonEndYearLabel(endYear) {
	const parsed = Number.parseInt(endYear, 10);
	if (!Number.isFinite(parsed)) return null;
	return formatSeasonLabel(parsed - 1);
}

/**
 * Augment rows with _seasonX (fractional season position) and _seasonIndex.
 * _seasonIndex is the season start year (e.g. 2023 for 2023-24).
 * Points within a season are spread evenly between integer boundaries.
 */
export function computeSeasonX(rows) {
	return computeSeasonXWithResolver(rows, (row) => getSeasonStartYear(row?.date));
}

/**
 * Augment rows using an explicit NBA season-ending year.
 * This avoids date-cutoff errors for delayed seasons such as the 2019-20 Bubble.
 */
export function computeSeasonXFromEndYear(rows) {
	return computeSeasonXWithResolver(rows, (row) => {
		const endYear = Number.parseInt(row?.season, 10);
		return Number.isInteger(endYear) ? endYear - 1 : null;
	});
}

function computeSeasonXWithResolver(rows, resolveSeasonStartYear) {
	const seasons = new Map();
	for (const row of rows || []) {
		const sy = resolveSeasonStartYear(row);
		if (!Number.isInteger(sy)) continue;
		if (!seasons.has(sy)) seasons.set(sy, []);
		seasons.get(sy).push(row);
	}

	const sortedSeasons = [...seasons.keys()].sort((a, b) => a - b);
	const result = [];

	for (let si = 0; si < sortedSeasons.length; si++) {
		const seasonYear = sortedSeasons[si];
		const seasonRows = seasons.get(seasonYear);
		for (let ri = 0; ri < seasonRows.length; ri++) {
			const frac =
				seasonRows.length > 1 ? ri / (seasonRows.length - 1) : 0.5;
			result.push({
				...seasonRows[ri],
				_seasonX: seasonYear + frac * 0.8 - 0.4, // spread within +-0.4 of the year
				_seasonLabel: formatSeasonLabel(seasonYear),
				_seasonIndex: seasonYear
			});
		}
	}

	return result;
}


/** A full regular season: the length a season still being played is drawn against. */
const FULL_SEASON_GAMES = 82;

/**
 * The ending year of the NBA season under way on a date. From July through September it is
 * the coming season, which no one has played yet.
 */
export function currentSeasonEndYear(now = new Date()) {
	return getSeasonStartYear(now.toISOString().slice(0, 10)) + 1;
}

/**
 * Spread a player's played games across one column per official season: the player's age on
 * February 1, rounded to the nearest year (`_seasonAge`), so every player's age-25 season fills
 * 24.5 to 25.5. A finished season fills its column. The season in progress fills only its share
 * of 82 games, so seven November games do not reach the column's end. Keep absent seasons and
 * use the supplied ending year for delayed seasons (including the Bubble). Call before cropping
 * the history. Exact ages and ratings remain untouched; invalid age/date rows cannot be placed.
 */
export function computeSeasonAgeX(rows, { currentSeason = currentSeasonEndYear() } = {}) {
	const day = 86_400_000;
	const year = 365.2425;
	const seasons = new Map();
	const offsets = [];
	for (const [index, row] of rows.entries()) {
		const date = Date.parse(String(row.date || '').slice(0, 10));
		const age = Number.parseFloat(row.age);
		const season = Number.parseInt(row.season, 10) || (getSeasonStartYear(row.date) + 1);
		if (!Number.isFinite(date) || !Number.isFinite(age) || !Number.isInteger(season)) continue;
		offsets.push(age + (Date.UTC(season, 1, 1) - date) / day / year - season);
		if (!seasons.has(season)) seasons.set(season, []);
		seasons.get(season).push({ index, date });
	}
	offsets.sort((a, b) => a - b);
	// One shared offset (age on February 1 minus the season) keeps adjacent seasons exactly one
	// column apart; rounding it rounds every season's age the same way.
	const shift = Math.round(offsets[Math.floor(offsets.length / 2)]);
	const positions = new Map();
	for (const [season, games] of seasons) {
		games.sort((a, b) => a.date - b.date || a.index - b.index);
		const slots = season === currentSeason ? Math.max(games.length, FULL_SEASON_GAMES) : games.length;
		const column = season + shift;
		games.forEach((game, index) => {
			positions.set(game.index, { column, x: column - 0.5 + (index + 0.5) / slots });
		});
	}
	return rows.map((row, index) => ({
		...row,
		_seasonAge: positions.get(index)?.column ?? null,
		_seasonAgeX: positions.get(index)?.x ?? null
	}));
}
