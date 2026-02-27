/**
 * LOESS (Locally Estimated Scatterplot Smoothing).
 * Fits weighted local linear regressions with tricube weights.
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

	const k = Math.max(2, Math.ceil(bandwidth * n));
	const halfWindow = Math.floor((k - 1) / 2);
	const maxWindowStart = Math.max(0, n - k);
	const smoothed = new Array(n);

	for (let i = 0; i < n; i++) {
		const xi = xVals[i];
		let start = i - halfWindow;
		if (start < 0) start = 0;
		if (start > maxWindowStart) start = maxWindowStart;
		let end = Math.min(n - 1, start + k - 1);
		if (end - start + 1 < k && start > 0) {
			start = Math.max(0, end - k + 1);
		}

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
