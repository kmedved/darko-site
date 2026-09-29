/**
 * The leaderboard's leader cards (components/LeaderCards.svelte): the leader in a stat and how far
 * ahead of the next player they are. The lead is read from the figures as the cards print them,
 * as Compare's head-to-head reads its leads, so two players who print the same are level.
 */

import { formatSignedMetric, printedNumber } from './csvPresets.js';

function number(value) {
	const n = Number.parseFloat(value);
	return Number.isFinite(n) ? n : null;
}

/** The leader in `metric` among `rows`, printed with `format`, and their margin over the next player. */
export function leaderCard(rows, title, metric, format = formatSignedMetric) {
	const [leader, next] = rows
		.map((player) => ({ player, value: number(player?.[metric]) }))
		.filter((entry) => entry.value !== null)
		.sort((a, b) => b.value - a.value);
	const displayValue = format(leader?.value ?? null);
	return {
		title,
		metric,
		player: leader?.player ?? null,
		value: leader?.value ?? null,
		displayValue,
		margin: leader && next ? leadMargin(displayValue, format(next.value), next.player, metric) : null
	};
}

/** "1.2 ahead of Gilgeous-Alexander", shooting leads in percentage points, or "Level with Murray". */
export function leadMargin(shownLeader, shownNext, player, metric) {
	const name = String(player?.player_name ?? '').split(' ').slice(1).join(' ') || player?.player_name;
	const amount = (printedNumber(shownLeader) - printedNumber(shownNext)).toFixed(1);
	if (Number(amount) === 0) return `Level with ${name}`;
	return `${amount}${metric.endsWith('_pct') ? ' pp' : ''} ahead of ${name}`;
}
