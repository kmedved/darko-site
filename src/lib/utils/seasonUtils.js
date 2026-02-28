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
 * Augment rows with _seasonX (fractional season position) and _seasonIndex.
 * Season 1 starts at x=1, Season 2 at x=2, etc.
 * Points within a season are spread evenly between integer boundaries.
 */
export function computeSeasonX(rows) {
	const seasons = new Map();
	for (const row of rows || []) {
		const sy = getSeasonStartYear(row?.date);
		if (!Number.isInteger(sy)) continue;
		if (!seasons.has(sy)) seasons.set(sy, []);
		seasons.get(sy).push(row);
	}

	const sortedSeasons = [...seasons.keys()].sort((a, b) => a - b);
	const result = [];

	for (let si = 0; si < sortedSeasons.length; si++) {
		const seasonRows = seasons.get(sortedSeasons[si]);
		for (let ri = 0; ri < seasonRows.length; ri++) {
			const frac =
				seasonRows.length > 1 ? ri / (seasonRows.length - 1) : 0.5;
			result.push({
				...seasonRows[ri],
				_seasonX: si + 1 + frac * 0.8 - 0.4, // spread within +-0.4 of integer
				_seasonLabel: formatSeasonLabel(sortedSeasons[si]),
				_seasonIndex: si + 1
			});
		}
	}

	return result;
}
