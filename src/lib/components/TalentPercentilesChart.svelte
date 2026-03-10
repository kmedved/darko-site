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

	const ROW_HEIGHT = 50;
	const BAR_HEIGHT = 18;
	const chartHeight = $derived(55 + selectedMetrics.length * ROW_HEIGHT + 65);

	const ZONE_DEFS = [
		{ min: 0, max: 25, fill: 'rgba(239,68,68,0.22)', label: 'Poor', labelColor: '#ef4444' },
		{ min: 25, max: 50, fill: 'rgba(249,115,22,0.22)', label: 'Below Avg', labelColor: '#f97316' },
		{ min: 50, max: 75, fill: 'rgba(234,179,8,0.22)', label: 'Average', labelColor: '#eab308' },
		{ min: 75, max: 90, fill: 'rgba(34,197,94,0.22)', label: 'Above Avg', labelColor: '#22c55e' },
		{ min: 90, max: 100, fill: 'rgba(59,130,246,0.22)', label: 'Elite', labelColor: '#3b82f6' }
	];

	function getTierDef(pct) {
		for (let i = ZONE_DEFS.length - 1; i >= 0; i--) {
			if (pct >= ZONE_DEFS[i].min) return ZONE_DEFS[i];
		}
		return ZONE_DEFS[0];
	}

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

		const clipId = 'gauge-clip-' + Math.random().toString(36).slice(2, 8);

		const margin = { top: 55, right: 20, bottom: 55, left: 20 };
		const w = width - margin.left - margin.right;

		const g = svg
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		const data = selectedMetrics
			.map((metric) => {
				const p = percentiles.find((d) => d.metric === metric);
				return p ? { ...p } : null;
			})
			.filter(Boolean)
			.sort((a, b) => b.value - a.value);

		if (data.length === 0) return;

		const xScale = d3.scaleLinear().domain([0, 100]).range([0, w]);

		// Render each row
		data.forEach((d, i) => {
			const rowY = i * ROW_HEIGHT;
			const tier = getTierDef(d.value);
			const rowG = g.append('g').attr('transform', `translate(0,${rowY})`);

			// Metric label (above bar, left)
			rowG.append('text')
				.attr('x', 2)
				.attr('y', -6)
				.attr('text-anchor', 'start')
				.attr('font-size', '12px')
				.attr('font-weight', '600')
				.style('fill', 'var(--text)')
				.text(getMetricDisplayLabel(d.metric));

			// Tier label (above bar, right)
			rowG.append('text')
				.attr('x', w)
				.attr('y', -6)
				.attr('text-anchor', 'end')
				.attr('font-size', '11px')
				.attr('font-weight', '600')
				.style('fill', tier.labelColor)
				.text(tier.label);

			// ClipPath for rounded edges
			const rowClipId = clipId + '-' + i;
			const defs = rowG.append('defs');
			defs.append('clipPath')
				.attr('id', rowClipId)
				.append('rect')
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', w)
				.attr('height', BAR_HEIGHT)
				.attr('rx', 4);

			const clipG = rowG.append('g')
				.attr('clip-path', `url(#${rowClipId})`);

			// Zone background rects
			ZONE_DEFS.forEach((zone) => {
				clipG.append('rect')
					.attr('x', xScale(zone.min))
					.attr('y', 0)
					.attr('width', xScale(zone.max) - xScale(zone.min))
					.attr('height', BAR_HEIGHT)
					.attr('fill', zone.fill);
			});

			// Zone boundary lines
			[25, 50, 75, 90].forEach((boundary) => {
				clipG.append('line')
					.attr('x1', xScale(boundary))
					.attr('x2', xScale(boundary))
					.attr('y1', 0)
					.attr('y2', BAR_HEIGHT)
					.attr('stroke', 'var(--border-subtle, #333)')
					.attr('stroke-width', 0.5);
			});

			// Bar outline
			rowG.append('rect')
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', w)
				.attr('height', BAR_HEIGHT)
				.attr('rx', 4)
				.attr('fill', 'none')
				.attr('stroke', 'var(--border-subtle, #333)')
				.attr('stroke-width', 0.5);

			// Marker line at percentile value
			const markerX = xScale(d.value);
			rowG.append('line')
				.attr('x1', markerX)
				.attr('x2', markerX)
				.attr('y1', -3)
				.attr('y2', BAR_HEIGHT + 3)
				.attr('stroke', 'var(--text)')
				.attr('stroke-width', 2.5)
				.attr('stroke-linecap', 'round');

			// Invisible hover rect for tooltip
			rowG.append('rect')
				.attr('x', 0)
				.attr('y', -12)
				.attr('width', w)
				.attr('height', ROW_HEIGHT)
				.attr('fill', 'transparent')
				.attr('cursor', 'pointer')
				.on('mouseenter', function (event) {
					const containerRect = chartRootEl.querySelector('.percentiles-chart-container').getBoundingClientRect();
					const svgRect = svgEl.getBoundingClientRect();
					const px = markerX + margin.left + (svgRect.left - containerRect.left);
					const py = rowY + margin.top + (svgRect.top - containerRect.top);
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
					tooltipData = null;
				});
		});

		// Legend
		const legendItems = [
			{ label: 'Elite 90+', fill: ZONE_DEFS[4].fill, color: ZONE_DEFS[4].labelColor },
			{ label: 'Above Avg 75+', fill: ZONE_DEFS[3].fill, color: ZONE_DEFS[3].labelColor },
			{ label: 'Avg 50+', fill: ZONE_DEFS[2].fill, color: ZONE_DEFS[2].labelColor },
			{ label: 'Below 25+', fill: ZONE_DEFS[1].fill, color: ZONE_DEFS[1].labelColor },
			{ label: 'Poor <25', fill: ZONE_DEFS[0].fill, color: ZONE_DEFS[0].labelColor }
		];

		const legendY = data.length * ROW_HEIGHT + 10;
		const legendG = g.append('g').attr('transform', `translate(0,${legendY})`);

		let legendX = 0;
		legendItems.forEach((item) => {
			const itemG = legendG.append('g').attr('transform', `translate(${legendX},0)`);
			itemG.append('rect')
				.attr('width', 12)
				.attr('height', 12)
				.attr('rx', 2)
				.attr('fill', item.fill)
				.attr('stroke', item.color)
				.attr('stroke-width', 0.5);
			itemG.append('text')
				.attr('x', 16)
				.attr('y', 10)
				.attr('font-size', '10px')
				.style('fill', 'var(--text-muted)')
				.text(item.label);
			legendX += itemG.node().getBBox().width + 14;
		});

		// Center legend
		const legendWidth = legendG.node().getBBox().width;
		legendG.attr('transform', `translate(${(w - legendWidth) / 2},${legendY})`);

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

		// Attribution
		const attrY = margin.top + data.length * ROW_HEIGHT + 45;
		svg.append('text')
			.attr('x', width / 2)
			.attr('y', attrY)
			.attr('text-anchor', 'middle')
			.attr('font-size', '10px')
			.style('fill', 'var(--text-muted)')
			.text('@kmedved | www.darko.app | @anpatt7');
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
		<svg bind:this={svgEl} width="100%" height={chartHeight}></svg>
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
