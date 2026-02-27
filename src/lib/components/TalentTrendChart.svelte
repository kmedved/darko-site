<script>
	import * as d3 from 'd3';
	import { loess } from '$lib/utils/loess.js';

	let {
		rows = [],
		talentType = 'dpm',
		playerName = '',
		playerColor = '#5b8def'
	} = $props();

	let svgEl = $state(null);
	let tooltipData = $state(null);
	let scalesRef = $state({ x: null, y: null, margin: null });

	const HEIGHT = 400;

	const TALENT_LABELS = {
		dpm: 'DPM',
		o_dpm: 'O-DPM',
		d_dpm: 'D-DPM',
		box_dpm: 'Box DPM',
		box_odpm: 'Box O-DPM',
		box_ddpm: 'Box D-DPM'
	};

	function getY(row) {
		return parseFloat(row[talentType]) || 0;
	}

	function parseDate(row) {
		const s = row.date;
		if (!s) return null;
		const dateOnly = s.includes('T') ? s.split('T')[0] : s;
		return new Date(dateOnly + 'T12:00:00');
	}

	function fmtDpm(val) {
		if (val === null || val === undefined) return '';
		const n = parseFloat(val);
		return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
	}

	function fmtDate(d) {
		if (!d) return '';
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	$effect(() => {
		if (!svgEl || rows.length === 0) return;
		void talentType;
		void rows;
		renderChart();
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
			.filter((r) => parseDate(r) != null && !isNaN(getY(r)))
			.sort((a, b) => parseDate(a) - parseDate(b));

		if (validRows.length === 0) return;

		const dates = validRows.map(parseDate);
		const yVals = validRows.map(getY);

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
			.attr('cx', (d) => x(parseDate(d)))
			.attr('cy', (d) => y(getY(d)))
			.attr('r', 2)
			.attr('fill', playerColor)
			.attr('opacity', 0.3);

		// LOESS curve
		const xNumeric = dates.map((d) => d.getTime());
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
			.text(`DARKO ${TALENT_LABELS[talentType] || 'DPM'}`);

		// Chart title
		svg.append('text')
			.attr('x', width / 2)
			.attr('y', 20)
			.attr('text-anchor', 'middle')
			.attr('font-size', '16px')
			.attr('font-weight', '700')
			.style('fill', 'var(--text)')
			.text(`${playerName} — ${TALENT_LABELS[talentType] || 'DPM'} Trend`);
	}

	function handleMouseMove(e) {
		if (!scalesRef.x || rows.length === 0) return;
		const { x: xScale, y: yScale, margin: m } = scalesRef;
		const rect = svgEl.getBoundingClientRect();
		const mouseX = e.clientX - rect.left - m.left;
		const mouseY = e.clientY - rect.top - m.top;

		const validRows = rows
			.filter((r) => parseDate(r) != null && !isNaN(getY(r)));

		let nearest = null;
		let minDist = Infinity;

		for (const row of validRows) {
			const d = parseDate(row);
			const ry = getY(row);
			const px = xScale(d);
			const py = yScale(ry);
			const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
			if (dist < minDist) {
				minDist = dist;
				nearest = { row, px: px + m.left, py: py + m.top, date: d };
			}
		}

		if (nearest && minDist < 30) {
			tooltipData = nearest;
		} else {
			tooltipData = null;
		}
	}

	function handleMouseLeave() {
		tooltipData = null;
	}
</script>

<div
	class="trend-chart-container"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	role="img"
	aria-label="{playerName} {TALENT_LABELS[talentType] || 'DPM'} trend"
>
	<svg bind:this={svgEl} width="100%" height={HEIGHT}></svg>

	{#if tooltipData}
		<div
			class="chart-tooltip trend-tooltip"
			style="left: {tooltipData.px}px; top: {tooltipData.py - 10}px;"
		>
			<span class="chart-tooltip-value">{fmtDpm(getY(tooltipData.row))}</span>
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
