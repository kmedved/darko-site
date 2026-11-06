/**
 * Chart layout utilities for responsive D3 charts.
 * Extracted from TrajectoryChart.svelte for testability.
 */

const CHART_HEIGHT = 500;

/** Returns margin, tick counts, and font sizes based on chart width. */
export function getChartLayout(width) {
	const isMobile = width < 500;
	// The left margin fits the rotated y-axis label beside signed ticks such as "+4.0".
	const margin = {
		top: 50,
		right: isMobile ? 15 : 30,
		bottom: 65,
		left: isMobile ? 56 : 60
	};
	return {
		isMobile,
		margin,
		plotWidth: width - margin.left - margin.right,
		plotHeight: CHART_HEIGHT - 115,
		xTicks: isMobile ? 5 : 8,
		yTicks: isMobile ? 6 : 8,
		// 11px is the site's smallest text size, phones included.
		tickFontSize: '11px'
	};
}

/** Returns appropriate season tick step for the given span and mobile flag. */
export function getSeasonTickStep(span, isMobile) {
	if (isMobile) {
		return span > 8 ? 5 : span > 4 ? 3 : 1;
	}
	return span > 15 ? 5 : span > 8 ? 2 : 1;
}

/** Returns age tick count based on mobile flag. */
export function getAgeTickCount(isMobile) {
	return isMobile ? 6 : 12;
}

/**
 * The season-age axis for plotted positions from xMin to xMax: whole season columns (age N spans
 * N - 0.5 to N + 0.5) and a tick in the middle of each column (every second or fourth when they
 * would crowd, always on even ages).
 */
export function getSeasonAgeAxis(xMin, xMax, isMobile = false) {
	const first = Math.round(xMin);
	const last = Math.round(xMax);
	const span = last - first;
	const step = span > (isMobile ? 12 : 24) ? 4 : span > (isMobile ? 6 : 12) ? 2 : 1;
	const ticks = [];
	for (let age = Math.ceil(first / step) * step; age <= last; age += step) ticks.push(age);
	return { domain: [first - 0.5, last + 0.5], ticks };
}
