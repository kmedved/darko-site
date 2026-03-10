<script>
	import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
	import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';
	import { getChartLayout } from '$lib/utils/chartLayout.js';
	import ChartDownloadMenu from '$lib/components/ChartDownloadMenu.svelte';

	let {
		players = [],
		xMetric = 'o_dpm',
		yMetric = 'd_dpm',
		colorByPosition = true
	} = $props();

	let containerEl = $state(null);
	let svgEl = $state(null);
	let tooltipData = $state(null);
	let scalesRef = $state({ x: null, y: null, margin: null, w: 0, h: 0 });
	let pointsForTooltip = $state([]);

	const exportFilenameBase = $derived(`scatterplot-${xMetric}-vs-${yMetric}`);

	const HEIGHT = 500;

	const PERCENT_METRICS = new Set(['x_fg_pct', 'x_fg3_pct', 'x_ft_pct', 'tr_fg3_pct', 'tr_ft_pct']);
	const MONEY_METRICS = new Set(['sal_market_fixed']);
	const SIGNED_METRICS = new Set([
		'dpm', 'o_dpm', 'd_dpm',
		'box_dpm', 'box_odpm', 'box_ddpm',
		'on_off_dpm', 'on_off_odpm', 'on_off_ddpm',
		'bayes_rapm_total', 'bayes_rapm_off', 'bayes_rapm_def',
		'surplus_value'
	]);

	const POSITION_COLORS = {
		'G': '#3b82f6',
		'F': '#ef4444',
		'C': '#34d399',
		'G-F': '#f59e0b',
		'F-G': '#f59e0b',
		'F-C': '#a78bfa',
		'C-F': '#a78bfa'
	};
	const POSITION_LEGEND_ITEMS = [
		{ pos: 'G', label: 'Guard', color: '#3b82f6' },
		{ pos: 'F', label: 'Forward', color: '#ef4444' },
		{ pos: 'C', label: 'Center', color: '#34d399' },
		{ pos: 'G-F / F-G', label: 'Wing', color: '#f59e0b' },
		{ pos: 'F-C / C-F', label: 'Big', color: '#a78bfa' }
	];

	function getPositionColor(position) {
		return POSITION_COLORS[position] || '#888';
	}

	function fmtMetricValue(val, metric) {
		if (val === null || val === undefined) return '—';
		const n = Number.parseFloat(val);
		if (!Number.isFinite(n)) return '—';
		if (MONEY_METRICS.has(metric)) return `$${(n / 1e6).toFixed(1)}M`;
		if (metric === 'surplus_value') return `${n >= 0 ? '+' : '-'}$${(Math.abs(n) / 1e6).toFixed(1)}M`;
		if (PERCENT_METRICS.has(metric)) return `${(n * 100).toFixed(1)}%`;
		if (SIGNED_METRICS.has(metric)) return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
		return n.toFixed(1);
	}

	function tickFormat(metric) {
		if (MONEY_METRICS.has(metric)) return (d) => `$${(d / 1e6).toFixed(0)}M`;
		if (metric === 'surplus_value') return (d) => `${d >= 0 ? '+' : '-'}$${(Math.abs(d) / 1e6).toFixed(0)}M`;
		if (PERCENT_METRICS.has(metric)) return (d) => `${(d * 100).toFixed(0)}%`;
		if (SIGNED_METRICS.has(metric)) return (d) => `${d >= 0 ? '+' : ''}${d.toFixed(1)}`;
		return null;
	}

	function clamp(value, min, max) {
		if (!Number.isFinite(value)) return min;
		return Math.min(Math.max(value, min), max);
	}

	function toContainerPoint(px, py) {
		if (!svgEl || !containerEl) return { px, py };
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
		if (!svgEl || !containerEl || players.length === 0) {
			if (svgEl) d3.select(svgEl).selectAll('*').remove();
			pointsForTooltip = [];
			return;
		}
		void xMetric;
		void yMetric;
		void colorByPosition;
		void players;
		renderChart();
		return withResizeObserver({ element: containerEl, onResize: renderChart });
	});

	function renderChart() {
		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();

		const width = containerEl?.clientWidth ?? 0;
		if (!width) return;

		// Prepare data points
		const points = [];
		for (const p of players) {
			const xVal = Number.parseFloat(p[xMetric]);
			const yVal = Number.parseFloat(p[yMetric]);
			if (!Number.isFinite(xVal) || !Number.isFinite(yVal)) continue;
			points.push({ player: p, xVal, yVal });
		}
		pointsForTooltip = points;
		if (points.length === 0) return;

		const layout = getChartLayout(width);
		const { isMobile, margin } = layout;
		const w = width - margin.left - margin.right;
		const h = HEIGHT - margin.top - margin.bottom;

		const g = svg
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Scales with padding
		const xExtent = d3.extent(points, (d) => d.xVal);
		const yExtent = d3.extent(points, (d) => d.yVal);
		const xRange = xExtent[1] - xExtent[0];
		const yRange = yExtent[1] - yExtent[0];
		const xPad = Math.max(xRange * 0.05, 0.1);
		const yPad = Math.max(yRange * 0.05, 0.1);

		const x = d3.scaleLinear()
			.domain([xExtent[0] - xPad, xExtent[1] + xPad])
			.range([0, w])
			.nice();
		const y = d3.scaleLinear()
			.domain([yExtent[0] - yPad, yExtent[1] + yPad])
			.range([h, 0])
			.nice();

		scalesRef = { x, y, margin, w, h };

		// Grid lines
		g.append('g')
			.call(
				d3.axisLeft(y)
					.ticks(layout.yTicks)
					.tickSize(-w)
					.tickFormat(() => '')
			)
			.call((sel) => sel.select('.domain').remove())
			.call((sel) =>
				sel.selectAll('.tick line')
					.attr('stroke', 'var(--border-subtle, #333)')
					.attr('stroke-dasharray', '2,3')
			);

		g.append('g')
			.call(
				d3.axisBottom(x)
					.ticks(layout.xTicks)
					.tickSize(-h)
					.tickFormat(() => '')
			)
			.attr('transform', `translate(0,${h})`)
			.call((sel) => sel.select('.domain').remove())
			.call((sel) =>
				sel.selectAll('.tick line')
					.attr('stroke', 'var(--border-subtle, #333)')
					.attr('stroke-dasharray', '2,3')
			);

		// Zero baselines
		const xDomain = x.domain();
		const yDomain = y.domain();
		if (SIGNED_METRICS.has(xMetric) && xDomain[0] <= 0 && xDomain[1] >= 0) {
			g.append('line')
				.attr('x1', x(0)).attr('x2', x(0))
				.attr('y1', 0).attr('y2', h)
				.attr('stroke', 'var(--text-muted)')
				.attr('stroke-width', 1)
				.attr('stroke-dasharray', '6,4')
				.attr('opacity', 0.5);
		}
		if (SIGNED_METRICS.has(yMetric) && yDomain[0] <= 0 && yDomain[1] >= 0) {
			g.append('line')
				.attr('x1', 0).attr('x2', w)
				.attr('y1', y(0)).attr('y2', y(0))
				.attr('stroke', 'var(--text-muted)')
				.attr('stroke-width', 1)
				.attr('stroke-dasharray', '6,4')
				.attr('opacity', 0.5);
		}

		// Dots
		const dotRadius = isMobile ? 3 : 4;
		g.selectAll('circle.scatter-dot')
			.data(points)
			.join('circle')
			.attr('class', 'scatter-dot')
			.attr('cx', (d) => x(d.xVal))
			.attr('cy', (d) => y(d.yVal))
			.attr('r', dotRadius)
			.attr('fill', (d) =>
				colorByPosition
					? getPositionColor(d.player.position)
					: 'var(--accent)'
			)
			.attr('opacity', 0.6)
			.attr('stroke', 'var(--bg-surface)')
			.attr('stroke-width', 0.5);

		// X axis
		const xAxisCall = d3.axisBottom(x).ticks(layout.xTicks);
		const xFmt = tickFormat(xMetric);
		if (xFmt) xAxisCall.tickFormat(xFmt);
		const xAxisG = g.append('g')
			.attr('transform', `translate(0,${h})`)
			.call(xAxisCall);
		xAxisG.select('.domain').attr('stroke', 'var(--border, #555)');
		xAxisG.selectAll('.tick text')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', layout.tickFontSize);
		xAxisG.selectAll('.tick line')
			.attr('stroke', 'var(--border, #555)');

		// X axis label
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 38)
			.attr('text-anchor', 'middle')
			.attr('font-size', '13px')
			.attr('font-weight', '600')
			.style('fill', 'var(--text)')
			.text(getMetricDisplayLabel(xMetric));

		// Attribution
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 55)
			.attr('text-anchor', 'middle')
			.attr('font-size', '10px')
			.style('fill', 'var(--text-muted)')
			.text('@kmedved | www.darko.app | @anpatt7');

		// Y axis
		const yAxisCall = d3.axisLeft(y).ticks(layout.yTicks);
		const yFmt = tickFormat(yMetric);
		if (yFmt) yAxisCall.tickFormat(yFmt);
		const yAxisG = g.append('g').call(yAxisCall);
		yAxisG.select('.domain').attr('stroke', 'var(--border, #555)');
		yAxisG.selectAll('.tick text')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', '11px');
		yAxisG.selectAll('.tick line')
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
			.text(getMetricDisplayLabel(yMetric));

		// Chart title
		svg.append('text')
			.attr('x', width / 2)
			.attr('y', 24)
			.attr('text-anchor', 'middle')
			.attr('font-size', '16px')
			.attr('font-weight', '700')
			.style('fill', 'var(--text)')
			.text(`${getMetricDisplayLabel(xMetric)} vs ${getMetricDisplayLabel(yMetric)}`);

		// Position legend (inside SVG when coloring)
		if (colorByPosition) {
			const legendG = g.append('g')
				.attr('transform', `translate(${w - (isMobile ? 70 : 90)}, ${isMobile ? 10 : 5})`);

			POSITION_LEGEND_ITEMS.forEach((item, i) => {
				const row = legendG.append('g')
					.attr('transform', `translate(0, ${i * 18})`);

				row.append('circle')
					.attr('cx', 0)
					.attr('cy', 0)
					.attr('r', 4)
					.attr('fill', item.color)
					.attr('opacity', 0.8);

				row.append('text')
					.attr('x', 10)
					.attr('y', 0)
					.attr('dy', '0.35em')
					.attr('font-size', isMobile ? '9px' : '11px')
					.style('fill', 'var(--text-muted)')
					.text(item.label);
			});
		}

		// Player count
		svg.append('text')
			.attr('x', margin.left + 4)
			.attr('y', 24)
			.attr('text-anchor', 'start')
			.attr('font-size', '11px')
			.style('fill', 'var(--text-muted)')
			.text(`${points.length} players`);
	}

	function handleMouseMove(e) {
		if (!scalesRef.x || pointsForTooltip.length === 0 || !svgEl) return;
		const { x: xScale, y: yScale, margin: m } = scalesRef;
		const svgRect = svgEl.getBoundingClientRect();
		const mouseX = e.clientX - svgRect.left - m.left;
		const mouseY = e.clientY - svgRect.top - m.top;

		let nearest = null;
		let minDist = Infinity;

		for (const point of pointsForTooltip) {
			const px = xScale(point.xVal);
			const py = yScale(point.yVal);
			const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
			if (dist < minDist) {
				minDist = dist;
				nearest = { point, px, py };
			}
		}

		if (nearest && minDist < 40) {
			const tooltipPoint = toContainerPoint(nearest.px + m.left, nearest.py + m.top);
			tooltipData = {
				player: nearest.point.player,
				xVal: nearest.point.xVal,
				yVal: nearest.point.yVal,
				px: tooltipPoint.px,
				py: tooltipPoint.py
			};
		} else {
			tooltipData = null;
		}
	}

	function handleMouseLeave() {
		tooltipData = null;
	}
</script>

<div class="chart-download-shell">
	<div class="chart-download-toolbar">
		<ChartDownloadMenu
			{svgEl}
			captureRootEl={containerEl}
			filenameBase={exportFilenameBase}
		/>
	</div>
	<div
		bind:this={containerEl}
		class="scatterplot-chart-container"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
		role="img"
		aria-label="Player scatterplot"
	>
		<svg bind:this={svgEl} width="100%" height={HEIGHT}></svg>

		{#if tooltipData}
			<div
				class="chart-tooltip scatterplot-tooltip"
				style="left: {tooltipData.px}px; top: {tooltipData.py - 10}px;"
			>
				<span class="tooltip-player-name">{tooltipData.player.player_name || '—'}</span>
				<span class="tooltip-meta">
					{[tooltipData.player.position, tooltipData.player.team_name].filter(Boolean).join(' · ')}
				</span>
				<span class="chart-tooltip-value">
					{getMetricDisplayLabel(xMetric)}: {fmtMetricValue(tooltipData.xVal, xMetric)}
				</span>
				<span class="chart-tooltip-value">
					{getMetricDisplayLabel(yMetric)}: {fmtMetricValue(tooltipData.yVal, yMetric)}
				</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.scatterplot-chart-container {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.scatterplot-tooltip {
		pointer-events: none;
		transform: translate(-50%, -100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		white-space: nowrap;
	}

	.tooltip-player-name {
		font-weight: 600;
		font-size: 13px;
	}

	.tooltip-meta {
		font-size: 11px;
		color: var(--text-muted);
	}
</style>
