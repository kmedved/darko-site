<script>
	import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
	import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';
	import ChartDownloadMenu from '$lib/components/ChartDownloadMenu.svelte';

	let {
		playerName = '',
		position = '',
		date = '',
		percentiles = [],
		selectedMetrics = [],
		rawValues = {}
	} = $props();

	let chartRootEl = $state(null);
	let svgEl = $state(null);
	let tooltipData = $state(null);
	const exportFilenameBase = $derived(playerName ? `${playerName}-talent-percentiles` : 'talent-percentiles');

	const HEIGHT = 420;

	const METRIC_COLORS = {
		dpm: '#ef4444',
		o_dpm: '#3b82f6',
		d_dpm: '#22c55e',
		tr_fg3_pct: '#a855f7',
		tr_ft_pct: '#f97316',
		on_off_dpm: '#14b8a6',
		bayes_rapm_total: '#f59e0b',
		x_pts_100: '#38bdf8',
		x_ast_100: '#60a5fa',
		x_fg_pct: '#34d399',
		x_fg3_pct: '#a78bfa',
		x_ft_pct: '#fb7185'
	};

	const PERCENT_METRICS = new Set(['tr_fg3_pct', 'tr_ft_pct', 'x_fg_pct', 'x_fg3_pct', 'x_ft_pct']);
	const MONEY_METRICS = new Set(['sal_market_fixed']);
	const SIGNED_METRICS = new Set([
		'dpm', 'o_dpm', 'd_dpm', 'box_dpm', 'box_odpm', 'box_ddpm',
		'on_off_dpm', 'on_off_odpm', 'on_off_ddpm',
		'bayes_rapm_total', 'bayes_rapm_off', 'bayes_rapm_def'
	]);

	function fmtRawValue(metric, val) {
		const n = Number.parseFloat(val);
		if (!Number.isFinite(n)) return '';
		if (MONEY_METRICS.has(metric)) return '$' + (n / 1e6).toFixed(1) + 'M';
		if (PERCENT_METRICS.has(metric)) return (n * 100).toFixed(1) + '%';
		if (SIGNED_METRICS.has(metric)) return (n >= 0 ? '+' : '') + n.toFixed(1);
		return n.toFixed(1);
	}

	function ordinal(n) {
		const mod100 = n % 100;
		if (mod100 >= 11 && mod100 <= 13) return n + 'th';
		const mod10 = n % 10;
		if (mod10 === 1) return n + 'st';
		if (mod10 === 2) return n + 'nd';
		if (mod10 === 3) return n + 'rd';
		return n + 'th';
	}

	$effect(() => {
		if (!svgEl || !chartRootEl || selectedMetrics.length === 0) return;
		void percentiles;
		void selectedMetrics;
		void playerName;
		renderChart();
		return withResizeObserver({ element: chartRootEl, onResize: renderChart });
	});

	function renderChart() {
		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();
		tooltipData = null;

		const width = chartRootEl?.clientWidth ?? 0;
		if (width === 0) return;

		const margin = { top: 60, right: 30, bottom: 70, left: 60 };
		const w = width - margin.left - margin.right;
		const h = HEIGHT - margin.top - margin.bottom;

		const g = svg
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const data = selectedMetrics
			.map((metric) => {
				const p = percentiles.find((d) => d.metric === metric);
				return p ? { ...p, color: METRIC_COLORS[metric] || '#888' } : null;
			})
			.filter(Boolean);

		if (data.length === 0) return;

		const x = d3
			.scaleBand()
			.domain(data.map((d) => d.metric))
			.range([0, w])
			.padding(0.35);

		const y = d3.scaleLinear().domain([0, 100]).range([h, 0]);

		// Grid lines
		g.append('g')
			.call(
				d3
					.axisLeft(y)
					.ticks(10)
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

		// Bars
		g.selectAll(null)
			.data(data)
			.join('rect')
			.attr('x', (d) => x(d.metric))
			.attr('y', (d) => y(d.value))
			.attr('width', x.bandwidth())
			.attr('height', (d) => h - y(d.value))
			.attr('fill', (d) => d.color)
			.attr('rx', 3)
			.attr('cursor', 'pointer')
			.on('mouseenter', function (event, d) {
				d3.select(this).attr('opacity', 0.8);
				const barX = x(d.metric) + x.bandwidth() / 2 + margin.left;
				const barY = y(d.value) + margin.top;
				const containerRect = chartRootEl.querySelector('.percentiles-chart-container').getBoundingClientRect();
				const svgRect = svgEl.getBoundingClientRect();
				const px = barX + (svgRect.left - containerRect.left);
				const py = barY + (svgRect.top - containerRect.top);
				const rawFormatted = fmtRawValue(d.metric, rawValues[d.metric]);
				tooltipData = {
					metric: d.metric,
					percentile: d.value,
					raw: rawFormatted,
					label: getMetricDisplayLabel(d.metric),
					px,
					py
				};
			})
			.on('mouseleave', function () {
				d3.select(this).attr('opacity', 1);
				tooltipData = null;
			});

		// Y axis
		const yAxisG = g.append('g').call(
			d3
				.axisLeft(y)
				.ticks(10)
				.tickFormat((d) => d + '%')
		);
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
			.text('Percentile (vs. Position)');

		// X axis
			const xAxisG = g
				.append('g')
				.attr('transform', `translate(0,${h})`)
				.call(d3.axisBottom(x).tickFormat((d) => getMetricDisplayLabel(d)));
		xAxisG.select('.domain').attr('stroke', 'var(--border, #555)');
		xAxisG
			.selectAll('.tick text')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', '12px')
			.attr('font-weight', '500');
		xAxisG
			.selectAll('.tick line')
			.attr('stroke', 'var(--border, #555)');

		// X axis label
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 40)
			.attr('text-anchor', 'middle')
			.attr('font-size', '14px')
			.attr('font-weight', '700')
			.style('fill', 'var(--text)')
			.text('DARKO Talents');

		// Attribution
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 58)
			.attr('text-anchor', 'middle')
			.attr('font-size', '10px')
			.style('fill', 'var(--text-muted)')
			.text('@kmedved | www.darko.app | @anpatt7');

		// Chart title
		svg.append('text')
			.attr('x', width / 2)
			.attr('y', 22)
			.attr('text-anchor', 'middle')
			.attr('font-size', '18px')
			.attr('font-weight', '700')
			.style('fill', 'var(--text)')
			.text(playerName + ' \u2014 Talent Percentiles');

		// Subtitle
		const posLabel = position ? `${position} Only` : 'All Positions';
		const dateLabel = date || '';
		svg.append('text')
			.attr('x', width / 2)
			.attr('y', 42)
			.attr('text-anchor', 'middle')
			.attr('font-size', '13px')
			.attr('font-weight', '600')
			.style('fill', 'var(--text-secondary)')
			.text(`${posLabel} (${dateLabel})`);
	}
</script>

<div class="chart-download-shell" bind:this={chartRootEl}>
	<div class="chart-download-toolbar">
		<ChartDownloadMenu
			{svgEl}
			captureRootEl={chartRootEl}
			filenameBase={exportFilenameBase}
		/>
	</div>
	<div
		class="percentiles-chart-container"
		role="img"
		aria-label={playerName ? `${playerName} talent percentiles` : 'Talent percentiles'}
	>
		<svg bind:this={svgEl} width="100%" height={HEIGHT}></svg>
		{#if tooltipData}
			<div
				class="chart-tooltip percentile-tooltip"
				style="left: {tooltipData.px}px; top: {tooltipData.py - 10}px;"
			>
				<span class="chart-tooltip-label">{tooltipData.label}</span>
				{#if tooltipData.raw}
					<span class="chart-tooltip-value">{tooltipData.raw}</span>
				{/if}
				<span class="chart-tooltip-date">{ordinal(tooltipData.percentile)} percentile</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.percentiles-chart-container {
		position: relative;
		width: 100%;
	}

	.percentile-tooltip {
		pointer-events: none;
		transform: translate(-50%, -100%);
	}

	.chart-tooltip-label {
		font-weight: 600;
		font-size: 12px;
		color: var(--text);
	}
</style>
