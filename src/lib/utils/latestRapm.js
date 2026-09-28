/**
 * RAPM hasn't been published with each day's ratings since 2026-03-07 (nba_darko's RAPM file
 * isn't rebuilt), so a player's newest row has none. Until it is, views of a player's current
 * ratings show their latest published RAPM, with its date in `bayes_rapm_date`, instead of a
 * blank, and say how old it is.
 */

export const RAPM_KEYS = Object.freeze(['bayes_rapm_total', 'bayes_rapm_off', 'bayes_rapm_def']);

function hasRapm(row) {
	return Number.isFinite(Number.parseFloat(row?.bayes_rapm_total));
}

function rapmOf(source, date) {
	const values = Object.fromEntries(RAPM_KEYS.map((key) => [key, source?.[key] ?? null]));
	return { ...values, bayes_rapm_date: date ?? null };
}

/** A player's current row with the latest RAPM in their own history (oldest to newest). */
export function withLatestRapm(currentRow, rows = []) {
	if (!currentRow) return currentRow;
	if (hasRapm(currentRow)) return { ...currentRow, bayes_rapm_date: currentRow.date ?? null };
	for (let index = rows.length - 1; index >= 0; index -= 1) {
		if (hasRapm(rows[index])) return { ...currentRow, ...rapmOf(rows[index], rows[index].date) };
	}
	return currentRow;
}

/**
 * Current rows with RAPM from the latest published snapshot: { date, byId: Map(nba_id → row) },
 * each row dated by its own `date` (a player's newest RAPM), else the snapshot's.
 */
export function fillLatestRapm(rows, snapshot) {
	if (!snapshot?.date) return rows;
	return rows.map((row) => {
		if (hasRapm(row)) return { ...row, bayes_rapm_date: row.date ?? null };
		const latest = snapshot.byId.get(Number(row?.nba_id));
		return latest ? { ...row, ...rapmOf(latest, latest.date ? String(latest.date).slice(0, 10) : snapshot.date) } : row;
	});
}

function day(value) {
	return value ? String(value).slice(0, 10) : null;
}

/** The date of the RAPM these rows show when it is older than their ratings, else null. */
export function staleRapmDate(rows) {
	let latest = null;
	for (const row of rows ?? []) {
		const rapmDay = day(row?.bayes_rapm_date);
		if (rapmDay && rapmDay < day(row.date) && (!latest || rapmDay > latest)) latest = rapmDay;
	}
	return latest;
}

export function isRapmMetric(metric) {
	return RAPM_KEYS.includes(metric);
}
