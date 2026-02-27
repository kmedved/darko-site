<script>
	import * as d3 from 'd3';

	let {
		playerName = '',
		position = '',
		date = '',
		percentiles = [],
		selectedMetrics = []
	} = $props();

	let svgEl = $state(null);

	const HEIGHT = 420;

	const METRIC_COLORS = {
		dpm: '#ef4444',
		o_dpm: '#3b82f6',
		d_dpm: '#22c55e',
		tr_fg3_pct: '#a855f7',
		tr_ft_pct: '#f97316'
	};

	const METRIC_LABELS = {
		dpm: 'DPM',
		o_dpm: 'O-DPM',
		d_dpm: 'D-DPM',
		tr_fg3_pct: 'FG3%',
		tr_ft_pct: 'FTARate%'
	};

	$effect(() => {
		if (!svgEl || selectedMetrics.length === 0) return;
		void percentiles;
		void selectedMetrics;
		void playerName;
		renderChart();
	});

	function renderChart() {
		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();

		const width = svgEl.clientWidth;
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
			.attr('rx', 3);

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
			.text('Percentile');

		// X axis
		const xAxisG = g
			.append('g')
			.attr('transform', `translate(0,${h})`)
			.call(d3.axisBottom(x).tickFormat((d) => METRIC_LABELS[d] || d));
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
			.text(playerName);

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

<div class="percentiles-chart-container" role="img" aria-label="{playerName} talent percentiles">
	<svg bind:this={svgEl} width="100%" height={HEIGHT}></svg>
</div>

<style>
	.percentiles-chart-container {
		position: relative;
		width: 100%;
	}
</style>
