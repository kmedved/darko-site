const FIRST_HORIZON = 1;
const LAST_HORIZON = 12;

function clamp(value, minimum, maximum) {
	return Math.max(minimum, Math.min(maximum, value));
}

function thresholdBoundary(data, threshold) {
	const points = data
		.map((point) => ({
			horizon: Number(point?.horizon),
			value: Number(point?.value)
		}))
		.filter(
			(point) =>
				Number.isFinite(point.horizon) &&
				Number.isFinite(point.value) &&
				point.horizon >= FIRST_HORIZON &&
				point.horizon <= LAST_HORIZON
		)
		.sort((a, b) => a.horizon - b.horizon);

	if (points.length === 0) return null;
	if (points[0].value <= threshold) return FIRST_HORIZON;

	for (let index = 1; index < points.length; index += 1) {
		const previous = points[index - 1];
		const current = points[index];
		if (current.value > threshold) continue;

		const valueSpan = previous.value - current.value;
		if (valueSpan <= 0) return clamp(current.horizon, FIRST_HORIZON, LAST_HORIZON);

		const ratio = clamp((previous.value - threshold) / valueSpan, 0, 1);
		return clamp(
			previous.horizon + ratio * (current.horizon - previous.horizon),
			FIRST_HORIZON,
			LAST_HORIZON
		);
	}

	return LAST_HORIZON;
}

export function getProbabilityBands(data) {
	if (!Array.isArray(data) || data.length === 0) {
		return [{ start: FIRST_HORIZON, end: LAST_HORIZON, zone: 'middle' }];
	}

	const highEnd = thresholdBoundary(data, 75);
	const lowStart = thresholdBoundary(data, 25);
	if (highEnd === null || lowStart === null) {
		return [{ start: FIRST_HORIZON, end: LAST_HORIZON, zone: 'middle' }];
	}

	const middleStart = clamp(highEnd, FIRST_HORIZON, LAST_HORIZON);
	const middleEnd = clamp(Math.max(middleStart, lowStart), FIRST_HORIZON, LAST_HORIZON);
	const bands = [
		{ start: FIRST_HORIZON, end: middleStart, zone: 'high' },
		{ start: middleStart, end: middleEnd, zone: 'middle' },
		{ start: middleEnd, end: LAST_HORIZON, zone: 'low' }
	].filter((band) => band.end > band.start);

	return bands.length > 0
		? bands
		: [{ start: FIRST_HORIZON, end: LAST_HORIZON, zone: 'middle' }];
}
