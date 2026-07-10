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
