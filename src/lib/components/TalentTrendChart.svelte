<script>
	import * as d3 from 'd3';
	import { loess } from '$lib/utils/loess.js';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
	import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';

	let {
		rows = [],
		talentType = 'dpm',
		playerName = '',
		playerColor = '#5b8def'
	} = $props();

	let containerEl = $state(null);
	let svgEl = $state(null);
	let tooltipData = $state(null);
	let scalesRef = $state({ x: null, y: null, margin: null });
	let chartPoints = $state([]);
	const pointBisector = d3.bisector((point) => point.time).left;

	const HEIGHT = 400;

	const PERCENT_METRICS = new Set(['tr_fg3_pct', 'tr_ft_pct', 'x_fg_pct', 'x_fg3_pct', 'x_ft_pct']);
	const SIGNED_METRICS = new Set([
		'dpm',
		'o_dpm',
		'd_dpm',
		'box_dpm',
		'box_odpm',
		'box_ddpm',
		'on_off_dpm',
		'on_off_odpm',
		'on_off_ddpm',
		'bayes_rapm_total',
		'bayes_rapm_off',
		'bayes_rapm_def'
	]);

	function getY(row) {
		const n = Number.parseFloat(row?.[talentType]);
		return Number.isFinite(n) ? n : null;
	}

	function parseDate(row) {
		const s = row.date;
		if (!s) return null;
		const dateOnly = s.includes('T') ? s.split('T')[0] : s;
		const parsed = new Date(dateOnly + 'T12:00:00');
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function fmtMetric(val) {
		if (val === null || val === undefined) return '';
		const n = parseFloat(val);
		if (!Number.isFinite(n)) return '';
		if (PERCENT_METRICS.has(talentType)) return `${(n * 100).toFixed(1)}%`;
		if (SIGNED_METRICS.has(talentType)) return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
		return n.toFixed(1);
	}

	function fmtDate(d) {
		if (!d) return '';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	function clamp(value, min, max) {
		if (!Number.isFinite(value)) return min;
		return Math.min(Math.max(value, min), max);
	}

	function toContainerPoint(px, py) {
		if (!svgEl || !containerEl) {
			return { px, py };
		}

		const svgRect = svgEl.getBoundingClientRect();
		const containerRect = containerEl.getBoundingClientRect();
		const rawX = svgRect.left - containerRect.left + px;
		const rawY = svgRect.top - containerRect.top + py;

		return {
			px: clamp(rawX, 16, Math.max(16, containerRect.width - 16)),
			py: clamp(rawY, 16, Math.max(16, containerRect.height - 8))
		};
	}

	$effect(() => {
		if (!svgEl || rows.length === 0) {
			if (svgEl) d3.select(svgEl).selectAll('*').remove();
			tooltipData = null;
			chartPoints = [];
			scalesRef = { x: null, y: null, margin: null };
			return;
		}
		void talentType;
		void rows;
		renderChart();
		return withResizeObserver({ element: svgEl, onResize: renderChart });
	});

	function renderChart() {
		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();

		const width = svgEl.clientWidth;
		if (width === 0) return;

		const margin = { top: 40, right: 30, bottom: 55, left: 60 };
		const w = width - margin.left - margin.right;
		const h = HEIGHT - margin.top - margin.bottom;

		const g = svg
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const validRows = rows
			.map((row) => {
				const date = parseDate(row);
				const value = getY(row);
				if (!date || value === null) return null;
				return {
					row,
					date,
					time: date.getTime(),
					value
				};
			})
			.filter((entry) => entry !== null)
			.sort((a, b) => a.time - b.time);

		if (validRows.length === 0) {
			tooltipData = null;
			chartPoints = [];
			scalesRef = { x: null, y: null, margin: null };
			return;
		}

		chartPoints = validRows;

		const dates = validRows.map((entry) => entry.date);
		const yVals = validRows.map((entry) => entry.value);

		const xExtent = d3.extent(dates);
		const yExtent = d3.extent(yVals);
		const yPad = Math.max(Math.abs(yExtent[1] - yExtent[0]) * 0.1, 0.5);

		const x = d3.scaleTime().domain(xExtent).range([0, w]);
		const y = d3
			.scaleLinear()
			.domain([yExtent[0] - yPad, yExtent[1] + yPad])
			.range([h, 0]);

		scalesRef = { x, y, margin, w, h };

		// Grid lines
		g.append('g')
			.call(
				d3
					.axisLeft(y)
					.ticks(8)
					.tickSize(-w)
					.tickFormat(() => '')
			)
			.call((sel) => sel.select('.domain').remove())
			.call((sel) =>
				sel
					.selectAll('.tick line')
					.attr('stroke', 'var(--border-subtle, #333)')
					.attr('stroke-dasharray', '2,3')
			);

		// Zero baseline
		if (yExtent[0] - yPad <= 0 && yExtent[1] + yPad >= 0) {
			g.append('line')
				.attr('class', 'chart-zero')
				.attr('x1', 0)
				.attr('x2', w)
				.attr('y1', y(0))
				.attr('y2', y(0))
				.attr('stroke', 'var(--text)')
				.attr('stroke-width', 1.5)
				.attr('stroke-dasharray', '6,4');
		}

		// Scatter dots
		g.selectAll(null)
			.data(validRows)
			.join('circle')
			.attr('cx', (d) => x(d.date))
			.attr('cy', (d) => y(d.value))
			.attr('r', 2)
			.attr('fill', playerColor)
			.attr('opacity', 0.3);

		// LOESS curve
		const xNumeric = validRows.map((entry) => entry.time);
		const bandwidth = validRows.length > 100 ? 0.25 : 0.35;
		const smoothedY = loess(xNumeric, yVals, bandwidth);
		const loessData = xNumeric.map((xv, i) => [new Date(xv), smoothedY[i]]);

		const line = d3
			.line()
			.x((d) => x(d[0]))
			.y((d) => y(d[1]))
			.curve(d3.curveMonotoneX);

		g.append('path')
			.datum(loessData)
			.attr('fill', 'none')
			.attr('stroke', playerColor)
			.attr('stroke-width', 2.5)
			.attr('stroke-linecap', 'round')
			.attr('stroke-linejoin', 'round')
			.attr('d', line);

		// X axis
		const xAxisG = g
			.append('g')
			.attr('transform', `translate(0,${h})`)
			.call(d3.axisBottom(x).ticks(6));
		xAxisG.select('.domain').attr('stroke', 'var(--border, #555)');
		xAxisG
			.selectAll('.tick text')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', '11px');
		xAxisG
			.selectAll('.tick line')
			.attr('stroke', 'var(--border, #555)');

		// Attribution
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 45)
			.attr('text-anchor', 'middle')
			.attr('font-size', '10px')
			.style('fill', 'var(--text-muted)')
			.text('@kmedved | www.darko.app | @anpatt7');

		// Y axis
		const yAxisG = g.append('g').call(d3.axisLeft(y).ticks(8));
		yAxisG.select('.domain').attr('stroke', 'var(--border, #555)');
		yAxisG
			.selectAll('.tick text')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', '11px');
		yAxisG
			.selectAll('.tick line')
			.attr('stroke', 'var(--border, #555)');

		// Y axis label
		g.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('x', -h / 2)
			.attr('y', -45)
			.attr('text-anchor', 'middle')
				.attr('font-size', '13px')
				.attr('font-weight', '600')
				.style('fill', 'var(--text)')
				.text(`DARKO ${getMetricDisplayLabel(talentType)}`);

		// Chart title
		svg.append('text')
			.attr('x', width / 2)
			.attr('y', 20)
			.attr('text-anchor', 'middle')
				.attr('font-size', '16px')
				.attr('font-weight', '700')
				.style('fill', 'var(--text)')
				.text(`${playerName} — ${getMetricDisplayLabel(talentType)} Trend`);
	}

	function handleMouseMove(e) {
		if (!scalesRef.x || chartPoints.length === 0 || !svgEl) return;
		const { x: xScale, y: yScale, margin: m } = scalesRef;
		const svgRect = svgEl.getBoundingClientRect();
		const mouseX = e.clientX - svgRect.left - m.left;
		const mouseY = e.clientY - svgRect.top - m.top;

		const hoveredTime = xScale.invert(mouseX).getTime();
		const insertion = pointBisector(chartPoints, hoveredTime);
		const prev = chartPoints[Math.max(0, insertion - 1)];
		const next = chartPoints[Math.min(chartPoints.length - 1, insertion)];
		const candidates = [prev, next].filter(Boolean);

		let nearest = null;
		let minDist = Infinity;
		for (const point of candidates) {
			const px = xScale(point.date);
			const py = yScale(point.value);
			const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
			if (dist < minDist) {
				const tooltipPoint = toContainerPoint(px + m.left, py + m.top);
				minDist = dist;
				nearest = {
					row: point.row,
					date: point.date,
					px: tooltipPoint.px,
					py: tooltipPoint.py
				};
			}
		}

		tooltipData = nearest && minDist < 30 ? nearest : null;
	}

	function handleMouseLeave() {
		tooltipData = null;
	}
</script>

<div
	bind:this={containerEl}
	class="trend-chart-container"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	role="img"
	aria-label={
		playerName
			? `${playerName} ${getMetricDisplayLabel(talentType)} trend`
			: `${getMetricDisplayLabel(talentType)} trend`
	}
>
	<svg bind:this={svgEl} width="100%" height={HEIGHT}></svg>

	{#if tooltipData}
		<div
			class="chart-tooltip trend-tooltip"
			style="left: {tooltipData.px}px; top: {tooltipData.py - 10}px;"
		>
				<span class="chart-tooltip-value">{fmtMetric(getY(tooltipData.row))}</span>
			<span class="chart-tooltip-date">{fmtDate(tooltipData.date)}</span>
		</div>
	{/if}
</div>

<style>
	.trend-chart-container {
		position: relative;
		width: 100%;
	}

	.trend-tooltip {
		pointer-events: none;
		transform: translate(-50%, -100%);
	}
</style>
