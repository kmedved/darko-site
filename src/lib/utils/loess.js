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
	const smoothed = new Array(n);

	for (let i = 0; i < n; i++) {
		const xi = xVals[i];

		// Compute distances from xi to all points
		const dists = new Array(n);
		for (let j = 0; j < n; j++) {
			dists[j] = { j, dist: Math.abs(xVals[j] - xi) };
		}

		// Partial sort: find k nearest neighbors
		dists.sort((a, b) => a.dist - b.dist);
		const neighbors = dists.slice(0, k);

		const maxDist = neighbors[neighbors.length - 1].dist || 1;

		// Tricube weights: w(u) = (1 - |u|^3)^3
		let sumW = 0,
			sumWx = 0,
			sumWy = 0,
			sumWxx = 0,
			sumWxy = 0;

		for (let ni = 0; ni < neighbors.length; ni++) {
			const j = neighbors[ni].j;
			const u = neighbors[ni].dist / (maxDist * 1.001);
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
