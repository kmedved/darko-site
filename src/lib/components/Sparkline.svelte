<script>
	// A small line of values with a dot at the latest one. Decorative unless given a label.
	let { values = [], width = 80, height = 22, zero = false, color = 'var(--text-secondary)', label = '' } = $props();

	const shape = $derived.by(() => {
		const points = values.filter((value) => Number.isFinite(value));
		if (points.length < 2) return null;
		let low = Math.min(...points);
		let high = Math.max(...points);
		if (zero) {
			low = Math.min(low, 0);
			high = Math.max(high, 0);
		}
		if (high === low) {
			high += 0.5;
			low -= 0.5;
		}
		const x = (index) => 2 + (index / (points.length - 1)) * (width - 4);
		const y = (value) => 2 + (1 - (value - low) / (high - low)) * (height - 4);
		return {
			d: points.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(''),
			zeroY: zero ? y(0) : null,
			end: { x: x(points.length - 1), y: y(points.at(-1)) }
		};
	});
</script>

<svg
	class="sparkline"
	{width}
	{height}
	viewBox="0 0 {width} {height}"
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
>
	{#if shape}
		{#if shape.zeroY !== null}
			<line class="sparkline-zero" x1="0" x2={width} y1={shape.zeroY} y2={shape.zeroY} />
		{/if}
		<path class="sparkline-line" d={shape.d} style:stroke={color} />
		<circle cx={shape.end.x} cy={shape.end.y} r="2" style:fill={color} />
	{/if}
</svg>

<style>
	.sparkline {
		display: block;
		overflow: visible;
	}

	.sparkline-line {
		fill: none;
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.sparkline-zero {
		stroke: var(--border);
		stroke-dasharray: 2 2;
	}
</style>
