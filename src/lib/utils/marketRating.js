/**
 * The market rating: a player rating implied by closing betting spreads, which nba_darko fits
 * jointly each day (experimental), in points per 100 possessions. `market_as_of` is the date of
 * the fit behind a row's values; the fit uses games before it. Rows before the first fit
 * (2026-10-26), and players with no market history, have none.
 */
import { getMetricDefinition } from './metricDefinitions.js';
import { formatAsOfDate } from './timeMachine.js';

function finite(value) {
	if (value === null || value === undefined || value === '') return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}

/** A row's market ratings, { regular, playoff, asOf }, or null when it has none. */
export function marketRating(row) {
	const regular = finite(row?.market_rating);
	if (regular === null) return null;
	return {
		regular,
		playoff: finite(row?.market_playoff_rating),
		asOf: row?.market_as_of ? String(row.market_as_of).slice(0, 10) : null
	};
}

/** The newest fit date among rows with a market rating, or null. */
export function latestMarketAsOf(rows) {
	let latest = null;
	for (const row of rows ?? []) {
		const asOf = marketRating(row)?.asOf;
		if (asOf && (!latest || asOf > latest)) latest = asOf;
	}
	return latest;
}

/** The metric's definition, ending "Experimental; as of Oct 26, 2026." when the fit's date is known. */
export function describeMarket(asOf, metric = 'market_rating') {
	const definition = getMetricDefinition(metric);
	return asOf ? definition.replace(/\.$/, `; as of ${formatAsOfDate(asOf, { short: true })}.`) : definition;
}
