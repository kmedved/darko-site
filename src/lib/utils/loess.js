/**
 * LOESS (Locally Estimated Scatterplot Smoothing).
 * Fits weighted local linear regressions with tricube weights over each point's k nearest
 * neighbours in x, where k = bandwidth × n. The window is chosen by distance, not by index:
 * an index-centred window jumps where the data have gaps (the months between NBA seasons),
 * which drew visible steps into career curves.
 *
 * @param {number[]} xVals - x values (sorted ascending)
 * @param {number[]} yVals - corresponding y values
 * @param {number} bandwidth - fraction of data to use per local fit (0 < bandwidth <= 1)
 * @returns {number[]} smoothed y values at each x
 */
export function loess(xVals, yVals, bandwidth = 0.3) {
	const n = xVals.length;
	if (n === 0) return [];
	if (n === 1) return [...yVals];

	const k = Math.min(n, Math.max(2, Math.ceil(bandwidth * n)));
	const smoothed = new Array(n);
	let start = 0;

	for (let i = 0; i < n; i++) {
		const xi = xVals[i];
		// The k nearest points are contiguous in sorted x. Slide the window right while the
		// point just past it is nearer than its first point; the window only ever moves right.
		while (start + k < n && xVals[start + k] - xi < xi - xVals[start]) start += 1;
		// Tied x values can stop the slide short of i; keep i inside its own window.
		if (start < i - k + 1) start = i - k + 1;
		const end = start + k - 1;

		const maxDist = Math.max(Math.abs(xVals[start] - xi), Math.abs(xVals[end] - xi)) || 1;

		// Tricube weights: w(u) = (1 - |u|^3)^3
		let sumW = 0,
			sumWx = 0,
			sumWy = 0,
			sumWxx = 0,
			sumWxy = 0;

		for (let j = start; j <= end; j++) {
			const u = Math.abs(xVals[j] - xi) / (maxDist * 1.001);
			const w = u < 1 ? Math.pow(1 - Math.pow(u, 3), 3) : 0;
			const x = xVals[j];
			const y = yVals[j];
			sumW += w;
			sumWx += w * x;
			sumWy += w * y;
			sumWxx += w * x * x;
			sumWxy += w * x * y;
		}

		const denom = sumW * sumWxx - sumWx * sumWx;
		if (Math.abs(denom) < 1e-10) {
			smoothed[i] = sumW > 0 ? sumWy / sumW : yVals[i];
		} else {
			const a = (sumWxx * sumWy - sumWx * sumWxy) / denom;
			const b = (sumW * sumWxy - sumWx * sumWy) / denom;
			smoothed[i] = a + b * xi;
		}
	}

	return smoothed;
}
