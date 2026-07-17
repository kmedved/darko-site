/**
 * Approximate the uncertainty ribbon around an already-computed LOESS fit.
 *
 * Keeping this separate from chart components ensures every Shiny-style
 * single-player chart uses the same ribbon geometry. Inputs must be sorted by
 * x and `smoothedValues` must correspond one-for-one with them.
 */
export function buildLoessConfidenceBand(
	xValues,
	yValues,
	smoothedValues,
	bandwidth = 0.75
) {
	const count = Math.min(xValues.length, yValues.length, smoothedValues.length);
	if (count === 0) return [];

	const windowSize = Math.min(count, Math.max(3, Math.ceil(bandwidth * count)));
	const halfWindow = Math.floor((windowSize - 1) / 2);

	return Array.from({ length: count }, (_, index) => {
		const start = Math.max(0, Math.min(index - halfWindow, count - windowSize));
		const end = start + windowSize;
		const localX = xValues.slice(start, end);
		const localResiduals = yValues
			.slice(start, end)
			.map((value, localIndex) => value - smoothedValues[start + localIndex]);
		const meanX = localX.reduce((sum, value) => sum + value, 0) / localX.length;
		const centeredXSum = localX.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
		const residualSum = localResiduals.reduce((sum, residual) => sum + residual ** 2, 0);
		const sigma = Math.sqrt(residualSum / Math.max(1, localResiduals.length - 2));
		const leverage =
			1 / localX.length
			+ (centeredXSum > 0 ? (xValues[index] - meanX) ** 2 / centeredXSum : 0);
		const margin = 1.96 * sigma * Math.sqrt(leverage);
		const mean = smoothedValues[index];

		return {
			x: xValues[index],
			mean,
			lower: mean - margin,
			upper: mean + margin
		};
	});
}
