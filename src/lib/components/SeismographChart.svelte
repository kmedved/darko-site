<script>
	import * as d3 from 'd3';
	import { getContext } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
	import { formatGameDate, formatSigned } from '$lib/utils/seismograph.js';
	import { getShinyChartPreset } from '$lib/utils/shinyDesign.js';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import ChartDownloadMenu from '$lib/components/ChartDownloadMenu.svelte';
	import OffenseDefenseGlyph from '$lib/components/OffenseDefenseGlyph.svelte';

	// markerDate: the Time Machine date, drawn as a line when it falls inside the season.
	let { seismograph = null, playerName = '', markerDate = null } = $props();

	let containerEl = $state(null);
	let svgEl = $state(null);
	let tooltip = $state(null);
	let tooltipWidth = $state(0);
	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const shinySeismograph = getShinyChartPreset('seismograph');
	const bisectTime = d3.bisector((point) => point.time).center;
	const CROSS = 'M-4,-4L4,4M-4,4L4,-4';

	// Scales and hover marks from the latest render; not reactive, so hovering never re-renders.
	let chart = null;
	let activeIndex = null;

	const points = $derived(
		(seismograph?.points ?? []).map((point) => ({
			...point,
			time: new Date(`${point.date}T12:00:00`).getTime()
		}))
	);
	const activePoint = $derived(tooltip ? (points[tooltip.index] ?? null) : null);
	// Beside the crosshair when there is room, otherwise centered on it within the chart.
	const tooltipLeft = $derived.by(() => {
		if (!tooltip) return 0;
		const gap = 14;
		const edge = 4;
		const boxWidth = tooltipWidth || 220;
		if (tooltip.anchor + gap + boxWidth <= tooltip.containerWidth - edge) return tooltip.anchor + gap;
		if (tooltip.anchor - gap - boxWidth >= edge) return tooltip.anchor - gap - boxWidth;
		return Math.max(edge, Math.min(tooltip.containerWidth - boxWidth - edge, tooltip.anchor - boxWidth / 2));
	});
	const focusIndex = $derived(tooltip?.index ?? points.length - 1);
	const title = $derived(
		[playerName, seismograph?.label].filter(Boolean).join(' · ')
	);
	const exportFilenameBase = $derived(
		`${playerName ? `${playerName}-` : ''}seismograph-${seismograph?.label ?? 'season'}`
	);

	function statusNote(point) {
		if (point.status === 'upcoming') return "DARKO's forecast for the next game.";
		if (point.status === 'dnp') return 'Did not play. The rating drifts slightly with league-wide adjustments.';
		const minutes = `${Math.round(point.minutes)} min`;
		if (point.status === 'final') {
			return `${minutes}. Last game of the season, so no separate change is shown.`;
		}
		return minutes;
	}

	function matchup(point) {
		const team = point.team ? teamAbbr(point.team) : '';
		const opponent = point.opponent ? `vs ${point.opponent}` : '';
		return [team, opponent].filter(Boolean).join(' ');
	}

	function describe(point) {
		if (!point) return '';
		const team = matchup(point) ? `, ${matchup(point)}` : '';
		const played = `Played ${Math.round(point.minutes)} minutes`;
		const parts = [`${formatGameDate(point.date, { year: true })}${team}.`];
		if (point.status === 'played') parts.push(`${played}.`);
		else if (point.status === 'final') parts.push(`${played} in the last game of the season.`);
		else parts.push(statusNote(point));
		parts.push(
			`Rating going in ${formatSigned(point.dpm)}: offense ${formatSigned(point.o)}, defense ${formatSigned(point.d)}.`
		);
		if (point.update) {
			parts.push(
				`Change after the game ${formatSigned(point.update.dpm)}: offense ${formatSigned(point.update.o)}, defense ${formatSigned(point.update.d)}.`
			);
		}
		return parts.join(' ');
	}

	function signedTick(value, digits) {
		return Math.abs(value) < 1e-9 ? '0' : d3.format(`+.${digits}f`)(value);
	}

	function tickDigits(ticks) {
		const step = ticks.length > 1 ? Math.abs(ticks[1] - ticks[0]) : 1;
		if (step >= 1) return 0;
		return step >= 0.1 ? 1 : 2;
	}

	function timeDomain(series) {
		const first = series[0].time;
		const last = series.at(-1).time;
		const day = 864e5;
		return last - first < day ? [new Date(first - day), new Date(last + day)] : [new Date(first), new Date(last)];
	}

	function showHover(index) {
		activeIndex = index;
		const point = index === null ? null : points[index];
		if (!chart || !point) {
			chart?.hover.attr('display', 'none');
			tooltip = null;
			return;
		}
		const px = chart.x(point.time);
		chart.hover.attr('display', null);
		chart.crosshair.attr('x1', px).attr('x2', px);
		chart.dotDpm.attr('cx', px).attr('cy', chart.y1(point.dpm));
		chart.dotOffense.attr('cx', px).attr('cy', chart.y1(point.o));
		chart.dotDefense.attr('transform', `translate(${px},${chart.y1(point.d)})`);
		tooltip = { index, anchor: chart.margin.left + px, top: chart.margin.top, containerWidth: chart.width };
	}

	function renderChart() {
		const svg = d3.select(svgEl);
		svg.selectAll('*').remove();
		chart = null;

		const width = containerEl?.clientWidth ?? 0;
		if (width === 0 || points.length === 0) {
			tooltip = null;
			return;
		}

		const isMobile = width < 500;
		const isShinyView = displayMode.view === 'shiny';
		const margin = {
			top: isMobile ? 80 : 54,
			right: isMobile ? 14 : 24,
			bottom: 48,
			left: isMobile ? 40 : 50
		};
		const ratingHeight = isMobile ? 170 : 220;
		const gap = 42;
		const updateHeight = isMobile ? 100 : 128;
		const updateTop = ratingHeight + gap;
		const height = margin.top + updateTop + updateHeight + margin.bottom;
		const plotWidth = Math.max(40, width - margin.left - margin.right);
		const axisColor = 'var(--text-muted)';
		const labelColor = isShinyView ? 'var(--text)' : 'var(--text-muted)';
		const fontSize = '11px';
		const lineWidth = isShinyView ? shinySeismograph.lineWidth : 2;
		const splitLineWidth = isShinyView ? shinySeismograph.splitLineWidth : 1.5;

		svg.attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

		const x = d3.scaleTime().domain(timeDomain(points)).range([0, plotWidth]);
		let [low, high] = d3.extent(points.flatMap((point) => [point.dpm, point.o, point.d]));
		if (high - low < 2) {
			const middle = (high + low) / 2;
			low = middle - 1;
			high = middle + 1;
		}
		const pad = (high - low) * 0.08;
		const y1 = d3.scaleLinear().domain([low - pad, high + pad]).nice(4).range([ratingHeight, 0]);

		const games = points.filter((point) => point.update);
		let extent = 0.15;
		for (const game of games) {
			const up = Math.max(0, game.update.o) + Math.max(0, game.update.d);
			const down = Math.min(0, game.update.o) + Math.min(0, game.update.d);
			extent = Math.max(extent, up, -down);
		}
		extent *= 1.1;
		const y2 = d3.scaleLinear().domain([-extent, extent]).range([updateHeight, 0]);

		// Title and legend, drawn in the SVG so downloads keep them.
		svg.append('text')
			.attr('x', margin.left)
			.attr('y', 20)
			.attr('font-size', isMobile ? '13px' : '14px')
			.attr('font-weight', isShinyView ? '400' : '600')
			.style('fill', 'var(--text)')
			.text(title);

		const legend = svg.append('g').attr('class', 'seismo-legend');
		let legendX = 0;
		for (const item of [
			{ key: 'dpm', label: 'DPM' },
			{ key: 'offense', label: 'Offense' },
			{ key: 'defense', label: 'Defense' }
		]) {
			const itemG = legend.append('g').attr('transform', `translate(${legendX},0)`);
			if (item.key === 'dpm') {
				itemG.append('line')
					.attr('x1', 0)
					.attr('x2', 16)
					.attr('stroke', 'var(--text)')
					.attr('stroke-width', lineWidth)
					.attr('stroke-linecap', 'round');
			} else if (item.key === 'offense') {
				itemG.append('line')
					.attr('x1', 0)
					.attr('x2', 16)
					.attr('stroke', 'var(--offense)')
					.attr('stroke-width', splitLineWidth);
				itemG.append('circle')
					.attr('cx', 8)
					.attr('r', 4)
					.attr('fill', 'var(--bg-surface)')
					.attr('stroke', 'var(--offense)')
					.attr('stroke-width', 2);
			} else {
				itemG.append('line')
					.attr('x1', 0)
					.attr('x2', 16)
					.attr('stroke', 'var(--defense)')
					.attr('stroke-width', splitLineWidth);
				itemG.append('path')
					.attr('d', CROSS)
					.attr('transform', 'translate(8,0)')
					.attr('stroke', 'var(--defense)')
					.attr('stroke-width', 2)
					.attr('stroke-linecap', 'round');
			}
			const text = itemG.append('text')
				.attr('x', 22)
				.attr('dy', '0.35em')
				.attr('font-size', fontSize)
				.style('fill', 'var(--text-secondary)')
				.text(item.label);
			legendX += 22 + (text.node()?.getComputedTextLength?.() ?? item.label.length * 6) + 16;
		}
		const legendWidth = legendX - 16;
		if (isMobile) {
			legend.attr('transform', `translate(${margin.left},42)`);
		} else {
			legend.attr('transform', `translate(${width - margin.right - legendWidth},16)`);
		}

		const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
		const ratingG = root.append('g');
		const updateG = root.append('g').attr('transform', `translate(0,${updateTop})`);

		ratingG.append('text')
			.attr('y', -12)
			.attr('font-size', fontSize)
			.style('fill', labelColor)
			.text('Rating going into each game');
		updateG.append('text')
			.attr('y', -12)
			.attr('font-size', fontSize)
			.style('fill', labelColor)
			.text('Change after each game');

		if (isShinyView && shinySeismograph.plotBorder) {
			for (const [group, panelHeight] of [[ratingG, ratingHeight], [updateG, updateHeight]]) {
				group.append('rect')
					.attr('width', plotWidth)
					.attr('height', panelHeight)
					.attr('fill', 'none')
					.attr('stroke', 'var(--shiny-season-rule)')
					.attr('stroke-width', 1);
			}
		}

		const ratingTicks = y1.ticks(isMobile ? 4 : 5);
		const ratingDigits = tickDigits(ratingTicks);
		let updateTicks = d3.ticks(-extent, extent, isMobile ? 2 : 4);
		if (updateTicks.length < 3) {
			const tick = Number(d3.format('.1r')(extent * 0.6));
			updateTicks = [-tick, 0, tick];
		}
		const updateDigits = tickDigits(updateTicks);

		for (const [group, scale, ticks, digits] of [
			[ratingG, y1, ratingTicks, ratingDigits],
			[updateG, y2, updateTicks, updateDigits]
		]) {
			if (!isShinyView) {
				group.selectAll(null)
					.data(ticks.filter((tick) => Math.abs(tick) > 1e-9))
					.join('line')
					.attr('x1', 0)
					.attr('x2', plotWidth)
					.attr('y1', (tick) => scale(tick))
					.attr('y2', (tick) => scale(tick))
					.attr('stroke', 'var(--border-subtle)')
					.attr('stroke-dasharray', '2,3');
			}
			group.selectAll(null)
				.data(ticks)
				.join('text')
				.attr('x', -8)
				.attr('y', (tick) => scale(tick))
				.attr('dy', '0.32em')
				.attr('text-anchor', 'end')
				.attr('font-size', fontSize)
				.style('fill', axisColor)
				.style('font-variant-numeric', 'tabular-nums')
				.text((tick) => signedTick(tick, digits));
		}

		const [ratingLow, ratingHigh] = y1.domain();
		if (ratingLow <= 0 && ratingHigh >= 0) {
			ratingG.append('line')
				.attr('x1', 0)
				.attr('x2', plotWidth)
				.attr('y1', y1(0))
				.attr('y2', y1(0))
				.attr('stroke', isShinyView ? 'var(--shiny-chart-line)' : 'var(--text-muted)')
				.attr('stroke-width', 1)
				.attr('stroke-dasharray', '6,4');
		}
		updateG.append('line')
			.attr('x1', 0)
			.attr('x2', plotWidth)
			.attr('y1', y2(0))
			.attr('y2', y2(0))
			.attr('stroke', isShinyView ? 'var(--shiny-season-rule)' : 'var(--text-muted)')
			.attr('stroke-width', isShinyView ? shinySeismograph.zeroWidth : 1);

		// Per-game updates: positive parts stack up from zero and negative parts down,
		// offense nearest zero, with a 1px gap between parts.
		const days = Math.max(1, (x.domain()[1] - x.domain()[0]) / 864e5);
		const barWidth = Math.max(1.5, Math.min(7, (plotWidth / days) * 0.8));
		const bars = [];
		for (const game of games) {
			const left = x(game.time) - barWidth / 2;
			let up = y2(0);
			let down = y2(0);
			for (const [value, side] of [
				[game.update.o, 'offense'],
				[game.update.d, 'defense']
			]) {
				const size = Math.abs(y2(value) - y2(0));
				if (size < 0.5) continue;
				if (value >= 0) {
					up -= size;
					bars.push({ left, top: up, size, side });
					up -= 1;
				} else {
					bars.push({ left, top: down, size, side });
					down += size + 1;
				}
			}
		}
		updateG.selectAll(null)
			.data(bars)
			.join('rect')
			.attr('x', (bar) => bar.left)
			.attr('y', (bar) => bar.top)
			.attr('width', barWidth)
			.attr('height', (bar) => bar.size)
			.attr('fill', (bar) => `var(--${bar.side})`);

		const line = (accessor) =>
			d3.line()
				.x((point) => x(point.time))
				.y((point) => y1(accessor(point)))
				.curve(d3.curveMonotoneX);
		for (const [accessor, color, strokeWidth] of [
			[(point) => point.d, 'var(--defense)', splitLineWidth],
			[(point) => point.o, 'var(--offense)', splitLineWidth],
			[(point) => point.dpm, 'var(--text)', lineWidth]
		]) {
			ratingG.append('path')
				.datum(points)
				.attr('fill', 'none')
				.attr('stroke', color)
				.attr('stroke-width', strokeWidth)
				.attr('stroke-linejoin', 'round')
				.attr('stroke-linecap', 'round')
				.attr('d', line(accessor));
		}

		// End marks tie each line to its legend shape.
		const last = points.at(-1);
		const lastX = x(last.time);
		ratingG.append('path')
			.attr('d', CROSS)
			.attr('transform', `translate(${lastX},${y1(last.d)})`)
			.attr('stroke', 'var(--defense)')
			.attr('stroke-width', 2)
			.attr('stroke-linecap', 'round');
		ratingG.append('circle')
			.attr('cx', lastX)
			.attr('cy', y1(last.o))
			.attr('r', 4)
			.attr('fill', 'var(--bg-surface)')
			.attr('stroke', 'var(--offense)')
			.attr('stroke-width', 2);
		ratingG.append('circle')
			.attr('cx', lastX)
			.attr('cy', y1(last.dpm))
			.attr('r', 4)
			.attr('fill', 'var(--text)')
			.attr('stroke', 'var(--bg-surface)')
			.attr('stroke-width', 2);

		const tickCount = isMobile ? 6 : 8;
		const xTicks = x.ticks(tickCount);
		const monthFormat = d3.timeFormat('%b');
		const dayFormat = d3.timeFormat('%b %-d');
		const axisY = updateTop + updateHeight;
		root.selectAll(null)
			.data(xTicks)
			.join('text')
			.attr('x', (tick) => x(tick))
			.attr('y', axisY + 18)
			.attr('text-anchor', 'middle')
			.attr('font-size', fontSize)
			.style('fill', axisColor)
			.text((tick) => (d3.timeMonth(tick) < tick ? dayFormat(tick) : monthFormat(tick)));

		if (markerDate) {
			const markerTime = new Date(`${markerDate}T12:00:00`).getTime();
			const [domainStart, domainEnd] = x.domain();
			if (markerTime >= domainStart.getTime() && markerTime <= domainEnd.getTime()) {
				const markerX = x(markerTime);
				root.append('line')
					.attr('class', 'seismo-marker')
					.attr('x1', markerX)
					.attr('x2', markerX)
					.attr('y1', -4)
					.attr('y2', axisY)
					.attr('stroke', 'var(--time)')
					.attr('stroke-width', 1.5)
					.attr('stroke-dasharray', '5,3');
				root.append('text')
					.attr('x', markerX + (markerX > plotWidth - 90 ? -6 : 6))
					.attr('y', 6)
					.attr('text-anchor', markerX > plotWidth - 90 ? 'end' : 'start')
					.attr('font-size', fontSize)
					.attr('font-weight', 600)
					.style('fill', 'var(--time-text)')
					.text(formatGameDate(markerDate));
			}
		}

		svg.append('text')
			.attr('x', margin.left + plotWidth / 2)
			.attr('y', height - 8)
			.attr('text-anchor', 'middle')
			.attr('font-size', '11px')
			.style('fill', 'var(--text-muted)')
			.text('@kmedved | www.darko.app | @anpatt7');

		const hover = root.append('g').attr('display', 'none').style('pointer-events', 'none');
		const crosshair = hover.append('line')
			.attr('y1', -4)
			.attr('y2', axisY)
			.attr('stroke', 'var(--text-muted)')
			.attr('stroke-width', 1)
			.attr('stroke-dasharray', '3,3');
		const dotDefense = hover.append('path')
			.attr('d', CROSS)
			.attr('stroke', 'var(--defense)')
			.attr('stroke-width', 2.5)
			.attr('stroke-linecap', 'round');
		const dotOffense = hover.append('circle')
			.attr('r', 5)
			.attr('fill', 'var(--bg-surface)')
			.attr('stroke', 'var(--offense)')
			.attr('stroke-width', 2.5);
		const dotDpm = hover.append('circle')
			.attr('r', 5)
			.attr('fill', 'var(--text)')
			.attr('stroke', 'var(--bg-surface)')
			.attr('stroke-width', 2);

		root.append('rect')
			.attr('class', 'seismo-overlay')
			.attr('x', -6)
			.attr('y', -6)
			.attr('width', plotWidth + 12)
			.attr('height', axisY + 6)
			.attr('fill', 'transparent')
			.on('pointermove pointerdown', (event) => {
				const [mouseX] = d3.pointer(event);
				showHover(bisectTime(points, x.invert(mouseX).getTime()));
			})
			.on('pointerleave', (event) => {
				if (event.pointerType === 'mouse') showHover(null);
			});

		chart = { x, y1, y2, margin, width, hover, crosshair, dotDpm, dotOffense, dotDefense };
		showHover(activeIndex !== null && activeIndex < points.length ? activeIndex : null);
	}

	function handleKeydown(event) {
		if (points.length === 0) return;
		const current = activeIndex ?? points.length;
		let next;
		if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(points.length - 1, current + 1);
		else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, current - 1);
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = points.length - 1;
		else if (event.key === 'Escape') next = null;
		else return;
		event.preventDefault();
		showHover(next);
	}

	$effect(() => {
		if (!svgEl || !containerEl) return;
		void points;
		void title;
		void markerDate;
		void displayMode.view;
		activeIndex = null;
		renderChart();
		return withResizeObserver({ element: containerEl, onResize: renderChart });
	});
</script>

<div class="chart-download-shell">
	<div class="chart-download-toolbar">
		<ChartDownloadMenu {svgEl} captureRootEl={containerEl} filenameBase={exportFilenameBase} />
	</div>
	<div
		bind:this={containerEl}
		class="seismo-container"
		role="slider"
		tabindex="0"
		aria-label={title ? `Seismograph for ${title}` : 'Seismograph'}
		aria-roledescription="game-by-game chart"
		aria-valuemin={points.length ? 1 : 0}
		aria-valuemax={points.length}
		aria-valuenow={points.length ? focusIndex + 1 : 0}
		aria-valuetext={describe(activePoint) || 'Use the arrow keys to step through games.'}
		onkeydown={handleKeydown}
		onblur={() => showHover(null)}
	>
		<svg bind:this={svgEl} width="100%" height="420"></svg>

		{#if tooltip && activePoint}
			<div
				class="seismo-tooltip"
				bind:clientWidth={tooltipWidth}
				style:left="{tooltipLeft}px"
				style:top="{tooltip.top}px"
				aria-hidden="true"
			>
				<p class="seismo-tooltip-head">
					{formatGameDate(activePoint.date, { year: true })}{#if matchup(activePoint)}<span class="seismo-tooltip-team">{matchup(activePoint)}</span>{/if}
				</p>
				<p class="seismo-tooltip-note">{statusNote(activePoint)}</p>
				<table>
					<thead>
						<tr>
							<th></th>
							<th>DPM</th>
							<th><OffenseDefenseGlyph side="offense" /> Off</th>
							<th><OffenseDefenseGlyph side="defense" /> Def</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<th scope="row">Going in</th>
							<td>{formatSigned(activePoint.dpm)}</td>
							<td>{formatSigned(activePoint.o)}</td>
							<td>{formatSigned(activePoint.d)}</td>
						</tr>
						{#if activePoint.update}
							<tr class="seismo-tooltip-change">
								<th scope="row">Change</th>
								<td>{formatSigned(activePoint.update.dpm)}</td>
								<td>{formatSigned(activePoint.update.o)}</td>
								<td>{formatSigned(activePoint.update.d)}</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<style>
	.seismo-container {
		position: relative;
		width: 100%;
		border-radius: var(--radius-sm);
		touch-action: pan-y;
	}

	.seismo-container:focus {
		outline: none;
	}

	.seismo-container:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 4px;
	}

	.seismo-tooltip {
		position: absolute;
		z-index: 10;
		width: max-content;
		max-width: 260px;
		padding: 8px 10px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.28);
		pointer-events: none;
		font-size: 12px;
		line-height: 1.35;
		color: var(--text);
	}

	.seismo-tooltip-head {
		display: flex;
		gap: 8px;
		align-items: baseline;
		font-weight: 600;
	}

	.seismo-tooltip-team {
		color: var(--text-secondary);
		font-weight: 500;
	}

	.seismo-tooltip-note {
		margin: 2px 0 6px;
		color: var(--text-muted);
		white-space: normal;
	}

	.seismo-tooltip table {
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}

	.seismo-tooltip th,
	.seismo-tooltip td {
		padding: 2px 0 2px 12px;
		text-align: right;
		white-space: nowrap;
	}

	.seismo-tooltip thead th {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.seismo-tooltip tbody th {
		padding-left: 0;
		text-align: left;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.seismo-tooltip td {
		font-family: var(--font-mono);
	}

	.seismo-tooltip-change td,
	.seismo-tooltip-change th {
		border-top: 1px solid var(--border-subtle);
	}
</style>
