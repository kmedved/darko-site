<script>
	import * as d3 from 'd3';
	import { loess } from '$lib/utils/loess.js';

	let {
		players = [],
		timeScale = 'games',
		talentType = 'dpm',
		title = ''
	} = $props();

	let svgEl = $state(null);
	let containerEl = $state(null);
	let tooltipData = $state(null);
	let scalesRef = $state({ x: null, y: null, margin: null });

	const HEIGHT = 500;

	const TALENT_LABELS = {
		dpm: 'DPM',
		o_dpm: 'O-DPM',
		d_dpm: 'D-DPM',
		box_dpm: 'Box DPM',
		box_odpm: 'Box O-DPM',
		box_ddpm: 'Box D-DPM'
	};

	const TIME_LABELS = {
		games: 'Career Game Number',
		age: 'Age',
		seasons: 'Season'
	};

	function getX(row) {
		if (timeScale === 'games') return row.career_game_num;
		if (timeScale === 'age') return parseFloat(row.age);
		if (timeScale === 'seasons') return row._seasonX;
		return 0;
	}

	function getY(row) {
		return parseFloat(row[talentType]) || 0;
	}

	function fmtDpm(val) {
		if (val === null || val === undefined) return '';
		const n = parseFloat(val);
		return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
	}

	$effect(() => {
		if (!svgEl || players.length === 0) return;
		void timeScale;
		void talentType;
		void players;
		renderChart();
	});

	function renderChart() {
		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();

		const width = svgEl.clientWidth;
		if (width === 0) return;

		const margin = { top: 50, right: 30, bottom: 65, left: 60 };
		const w = width - margin.left - margin.right;
		const h = HEIGHT - margin.top - margin.bottom;

		const g = svg
			.append('g')
			.attr('transform', `translate(${margin.left},${margin.top})`);

		// Gather all valid rows across players
		const allRows = players.flatMap((p) =>
			p.rows.filter((r) => getX(r) != null && !isNaN(getY(r)))
		);
		if (allRows.length === 0) return;

		const xExtent = d3.extent(allRows, getX);
		const yExtent = d3.extent(allRows, getY);
		const yPad = Math.max(
			Math.abs(yExtent[1] - yExtent[0]) * 0.1,
			0.5
		);

		const x = d3.scaleLinear().domain(xExtent).range([0, w]).nice();
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

		// Per-player scatter + LOESS
		for (const player of players) {
			const pRows = player.rows
				.filter((r) => getX(r) != null && !isNaN(getY(r)))
				.sort((a, b) => getX(a) - getX(b));

			if (pRows.length < 2) continue;

			const xVals = pRows.map(getX);
			const yVals = pRows.map(getY);

			// Scatter dots
			g.selectAll(null)
				.data(pRows)
				.join('circle')
				.attr('cx', (d) => x(getX(d)))
				.attr('cy', (d) => y(getY(d)))
				.attr('r', 2)
				.attr('fill', player.color)
				.attr('opacity', 0.3);

			// LOESS curve
			const bandwidth = pRows.length > 100 ? 0.25 : 0.35;
			const smoothedY = loess(xVals, yVals, bandwidth);
			const loessData = xVals.map((xv, i) => [xv, smoothedY[i]]);

			const line = d3
				.line()
				.x((d) => x(d[0]))
				.y((d) => y(d[1]))
				.curve(d3.curveMonotoneX);

			g.append('path')
				.datum(loessData)
				.attr('fill', 'none')
				.attr('stroke', player.color)
				.attr('stroke-width', 2.5)
				.attr('stroke-linecap', 'round')
				.attr('stroke-linejoin', 'round')
				.attr('d', line);
		}

		// X axis
		let xAxisCall = d3.axisBottom(x);
		if (timeScale === 'seasons') {
			const maxSeason = d3.max(allRows, (r) => r._seasonIndex) || 1;
			// Show every Nth season tick to avoid crowding
			const step = maxSeason > 15 ? 5 : maxSeason > 8 ? 2 : 1;
			const tickVals = d3.range(step, maxSeason + 1, step);
			xAxisCall = xAxisCall.tickValues(tickVals).tickFormat((d) => d);
		} else if (timeScale === 'age') {
			xAxisCall = xAxisCall
				.ticks(12)
				.tickFormat((d) =>
					Number.isInteger(d) ? d : ''
				);
		} else {
			xAxisCall = xAxisCall.ticks(8);
		}

		const xAxisG = g
			.append('g')
			.attr('transform', `translate(0,${h})`)
			.call(xAxisCall);
		xAxisG.select('.domain').attr('stroke', 'var(--border, #555)');
		xAxisG
			.selectAll('.tick text')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', '11px');
		xAxisG
			.selectAll('.tick line')
			.attr('stroke', 'var(--border, #555)');

		// X axis label
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 38)
			.attr('text-anchor', 'middle')
			.attr('font-size', '13px')
			.attr('font-weight', '600')
			.style('fill', 'var(--text)')
			.text(TIME_LABELS[timeScale] || 'Games');

		// Attribution
		g.append('text')
			.attr('x', w / 2)
			.attr('y', h + 55)
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
			.attr('y', 24)
			.attr('text-anchor', 'middle')
			.attr('font-size', '16px')
			.attr('font-weight', '700')
			.style('fill', 'var(--text)')
			.text(title);

		// Legend
		const legendG = svg
			.append('g')
			.attr(
				'transform',
				`translate(${width / 2}, 38)`
			);

		let legendX = 0;
		const legendItems = [];
		// Measure text widths for centering
		players.forEach((p) => {
			legendItems.push({ player: p, x: legendX });
			legendX += p.player_name.length * 7 + 40;
		});
		const totalLegendWidth = legendX - 10;
		const legendOffset = -totalLegendWidth / 2;

		players.forEach((p, i) => {
			const item = legendItems[i];
			const lg = legendG
				.append('g')
				.attr(
					'transform',
					`translate(${legendOffset + item.x}, 0)`
				);

			// Color line
			lg.append('line')
				.attr('x1', 0)
				.attr('x2', 18)
				.attr('y1', 0)
				.attr('y2', 0)
				.attr('stroke', p.color)
				.attr('stroke-width', 3)
				.attr('stroke-linecap', 'round');

			// Dot on line
			lg.append('circle')
				.attr('cx', 9)
				.attr('cy', 0)
				.attr('r', 3)
				.attr('fill', p.color);

			// Name
			lg.append('text')
				.attr('x', 24)
				.attr('y', 0)
				.attr('dy', '0.35em')
				.attr('font-size', '12px')
				.style('fill', 'var(--text-secondary, var(--text-muted))')
				.text(p.player_name);
		});
	}

	function handleMouseMove(e) {
		if (!scalesRef.x || players.length === 0) return;
		const { x: xScale, y: yScale, margin: m } = scalesRef;
		const rect = svgEl.getBoundingClientRect();
		const mouseX = e.clientX - rect.left - m.left;
		const mouseY = e.clientY - rect.top - m.top;

		const xVal = xScale.invert(mouseX);

		// Find nearest point across all players
		let nearest = null;
		let minDist = Infinity;

		for (const player of players) {
			for (const row of player.rows) {
				const rx = getX(row);
				const ry = getY(row);
				if (rx == null || isNaN(ry)) continue;
				const px = xScale(rx);
				const py = yScale(ry);
				const dist = Math.sqrt(
					(px - mouseX) ** 2 + (py - mouseY) ** 2
				);
				if (dist < minDist) {
					minDist = dist;
					nearest = { row, player, px: px + m.left, py: py + m.top };
				}
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
	class="trajectory-chart-container"
	bind:this={containerEl}
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
	role="img"
	aria-label={title}
>
	<svg bind:this={svgEl} width="100%" height={HEIGHT}></svg>

	{#if tooltipData}
		<div
			class="chart-tooltip trajectory-tooltip"
			style="left: {tooltipData.px}px; top: {tooltipData.py - 10}px;"
		>
			<span
				class="tooltip-player"
				style="color: {tooltipData.player.color}"
				>{tooltipData.player.player_name}</span
			>
			<span class="chart-tooltip-value"
				>{fmtDpm(getY(tooltipData.row))}</span
			>
			<span class="chart-tooltip-date">{tooltipData.row.date}</span>
		</div>
	{/if}
</div>

<style>
	.trajectory-chart-container {
		position: relative;
		width: 100%;
	}

	.trajectory-tooltip {
		pointer-events: none;
		transform: translate(-50%, -100%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.tooltip-player {
		font-weight: 600;
		font-size: 12px;
	}
</style>
