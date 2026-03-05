/**
 * Chart layout utilities for responsive D3 charts.
 * Extracted from TrajectoryChart.svelte for testability.
 */

const CHART_HEIGHT = 500;

/** Returns margin, tick counts, and font sizes based on chart width. */
export function getChartLayout(width) {
	const isMobile = width < 500;
	return {
		isMobile,
		margin: {
			top: 50,
			right: isMobile ? 15 : 30,
			bottom: 65,
			left: isMobile ? 45 : 60
		},
		plotWidth: width - (isMobile ? 60 : 90),
		plotHeight: CHART_HEIGHT - 115,
		xTicks: isMobile ? 5 : 8,
		yTicks: isMobile ? 6 : 8,
		tickFontSize: isMobile ? '9px' : '11px'
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
