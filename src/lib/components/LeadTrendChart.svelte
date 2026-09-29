<script>
	// The Daily's featured chart: one player's DPM through the season, game by game, with a light
	// value scale, month labels and the latest value and date. `points` is [[YYYY-MM-DD, dpm], ...]
	// with dates that never repeat (datedSeriesFrom in utils/daily.js).
	import * as d3 from 'd3';
	import { formatSigned } from '$lib/utils/seismograph.js';

	let { points = [], label = '', color = 'var(--accent)', height = 150 } = $props();

	let width = $state(0);
	let hovered = $state(null);

	const MARGIN = { top: 10, right: 62, bottom: 22, left: 36 };
	const MONTH_GAP = 44;
	const monthName = d3.utcFormat('%b');
	const dayName = d3.utcFormat('%b %-d');
	const toDate = (date) => new Date(`${date}T00:00:00Z`);

	const chart = $derived.by(() => {
		if (width <= MARGIN.left + MARGIN.right || points.length < 2) return null;
		const data = points.map(([date, value]) => ({ date: toDate(date), value }));
		const x = d3
			.scaleUtc()
			.domain([data[0].date, data.at(-1).date])
			.range([MARGIN.left, width - MARGIN.right]);

		// A flat stretch still gets a point of range, and a little room above and below the line.
		let low = d3.min(data, (d) => d.value);
		let high = d3.max(data, (d) => d.value);
		if (high - low < 1) {
			const middle = (high + low) / 2;
			low = middle - 0.5;
			high = middle + 0.5;
		}
		const pad = (high - low) * 0.08;
		const y = d3
			.scaleLinear()
			.domain([low - pad, high + pad])
			.nice(4)
			.range([height - MARGIN.bottom, MARGIN.top]);
		const [bottom, top] = y.domain();
		const digits = top - bottom <= 2.5 ? 1 : 0;

		// Month names where there's room for them, a month's width apart at least.
		const months = [];
		let lastAt = -Infinity;
		for (const month of d3.utcMonth.range(d3.utcMonth.ceil(data[0].date), data.at(-1).date)) {
			const at = x(month);
			if (at - lastAt < MONTH_GAP) continue;
			months.push({ key: month.getTime(), at, text: monthName(month) });
			lastAt = at;
		}

		const end = data.at(-1);
		const endY = Math.min(Math.max(y(end.value), MARGIN.top + 6), height - MARGIN.bottom - 12);
		return {
			data,
			x,
			y,
			ticks: y.ticks(4).map((value) => ({ value, at: y(value), text: formatSigned(value, digits) })),
			months,
			path: d3
				.line()
				.x((d) => x(d.date))
				.y((d) => y(d.value))
				.curve(d3.curveMonotoneX)(data),
			end: { x: x(end.date), y: y(end.value), labelY: endY, value: end.value, date: end.date }
		};
	});

	const findDate = d3.bisector((d) => d.date).center;

	function hover(event) {
		if (!chart) return;
		const box = event.currentTarget.getBoundingClientRect();
		const index = findDate(chart.data, chart.x.invert(event.clientX - box.left + MARGIN.left));
		hovered = chart.data[index] ?? null;
	}
</script>

<div class="lead-trend" bind:clientWidth={width} style:height="{height}px">
	{#if chart}
		<svg {width} {height} role="img" aria-label={label}>
			{#each chart.ticks as tick (tick.value)}
				<line class="lt-grid" class:lt-zero={tick.value === 0} x1={MARGIN.left} x2={width - MARGIN.right} y1={tick.at} y2={tick.at} />
				<text class="lt-axis" x={MARGIN.left - 6} y={tick.at + 4} text-anchor="end">{tick.text}</text>
			{/each}
			{#each chart.months as month (month.key)}
				<text class="lt-axis" x={month.at} y={height - 6} text-anchor="middle">{month.text}</text>
			{/each}
			<path class="lt-line" d={chart.path} style:stroke={color} />
			<circle class="lt-end" cx={chart.end.x} cy={chart.end.y} r="4" style:fill={color} />
			<text class="lt-end-value" x={chart.end.x + 10} y={chart.end.labelY + 4}>{formatSigned(chart.end.value, 1)}</text>
			<text class="lt-axis" x={chart.end.x + 10} y={chart.end.labelY + 17}>{dayName(chart.end.date)}</text>
			{#if hovered}
				<line class="lt-crosshair" x1={chart.x(hovered.date)} x2={chart.x(hovered.date)} y1={MARGIN.top} y2={height - MARGIN.bottom} />
				<circle class="lt-hover" cx={chart.x(hovered.date)} cy={chart.y(hovered.value)} r="4" style:stroke={color} />
			{/if}
			<rect
				class="lt-hit"
				x={MARGIN.left}
				y="0"
				width={Math.max(0, width - MARGIN.left - MARGIN.right)}
				height={height - MARGIN.bottom}
				role="presentation"
				onpointermove={hover}
				onpointerleave={() => (hovered = null)}
			/>
		</svg>
		{#if hovered}
			<div class="chart-tooltip" style:left="{chart.x(hovered.date)}px" style:top="{chart.y(hovered.value)}px">
				<span class="chart-tooltip-value">{formatSigned(hovered.value, 2)}</span>
				<span class="chart-tooltip-date">{dayName(hovered.date)}</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.lead-trend {
		position: relative;
		width: 100%;
	}

	svg {
		display: block;
		overflow: visible;
	}

	.lt-grid {
		stroke: var(--border-subtle);
		stroke-width: 1;
	}

	.lt-grid.lt-zero {
		stroke: var(--border);
	}

	.lt-axis {
		fill: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}

	.lt-line {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.lt-end {
		stroke: var(--bg-surface);
		stroke-width: 2;
	}

	.lt-end-value {
		fill: var(--text);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: var(--figure-weight-strong);
		font-variant-numeric: tabular-nums;
	}

	.lt-crosshair {
		stroke: var(--graphic-muted);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.lt-hover {
		fill: var(--bg-surface);
		stroke-width: 2;
	}

	.lt-hit {
		fill: transparent;
		cursor: crosshair;
	}
</style>
