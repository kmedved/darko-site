/**
 * The Roster Lab's saved scenarios: each date keeps its own edits (today's under 'current'), so a
 * look at another date in the Time Machine doesn't erase today's scenario. Besides today's, the
 * MAX_SAVED_DATES most recently saved dates are kept.
 */

export const MAX_SAVED_DATES = 5;

/** Saved edits by date. Saves before 2026-09-28 held one scenario, for one date (`key`). */
export function savedEditsByKey(saved) {
	if (saved?.editsByKey && typeof saved.editsByKey === 'object') return saved.editsByKey;
	return saved?.key && saved?.edits ? { [saved.key]: saved.edits } : {};
}

/** The stored edits with this date's replaced (or dropped when it has none), oldest dates trimmed. */
export function mergeSavedEdits(stored, key, edits, max = MAX_SAVED_DATES) {
	const editsByKey = { ...savedEditsByKey(stored) };
	delete editsByKey[key];
	if (Object.keys(edits ?? {}).length > 0) editsByKey[key] = edits;
	const dated = Object.keys(editsByKey).filter((savedKey) => savedKey !== 'current');
	for (const oldest of dated.slice(0, Math.max(0, dated.length - max))) delete editsByKey[oldest];
	return editsByKey;
}
