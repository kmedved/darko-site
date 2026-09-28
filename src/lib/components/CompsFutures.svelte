<script>
	import * as d3 from 'd3';
	import { getContext } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { compPath, compsFan, FUTURE_SEASONS, LISTED_COMPS, seasonEndLine } from '$lib/utils/comps.js';
	import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';
	import { formatSigned, seasonLabel } from '$lib/utils/seismograph.js';

	/**
	 * Comps & futures: the player's season-end DPM by age, the range the 25 closest comps took
	 * over the next five seasons, and the closest ten in a table. Hovering or focusing a comp
	 * traces its path on the chart.
	 */
	let { comps = [], history = [], playerName = '' } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const OWN_SEASONS = 7;
	const HEIGHT = 280;
	const M = { top: 18, right: 18, bottom: 58, left: 44 };

	let width = $state(0);
	let highlight = $state(null);
	let hover = $state(null);

	const now = $derived(comps[0]);
	const listed = $derived(comps.slice(0, LISTED_COMPS));
	const fan = $derived(compsFan(comps));
	const drawnFan = $derived(fan.filter((entry) => entry.p50 !== null));
	const own = $derived(
		seasonEndLine(history)
			.filter((point) => point.season <= now.season)
			.slice(-OWN_SEASONS)
	);
	const playerColor = $derived(getSeriesColor(0, displayMode.view));
	const compColor = $derived(getSeriesColor(1, displayMode.view));
	const dpmTint = $derived(tintLimit(listed.map((comp) => comp.comp_dpm)));
	const firstName = $derived(String(playerName).split(/\s+/)[0] || 'He');

	const chart = $derived.by(() => {
		if (!(width > 0) || !now) return null;
		const age0 = now.age;
		const ages = [...own.map((point) => point.age), age0];
		const values = [
			0,
			now.dpm,
			...own.map((point) => point.dpm),
			...drawnFan.flatMap((entry) => [entry.p10, entry.p90]),
			...listed.flatMap((comp) => compPath(comp).map((point) => point.dpm))
		].filter((value) => value !== null);
		const x = d3
			.scaleLinear()
			.domain([Math.min(...ages) - 0.4, age0 + FUTURE_SEASONS + 0.4])
			.range([M.left, width - M.right]);
		const y = d3
			.scaleLinear()
			.domain(d3.extent(values))
			.nice(5)
			.range([HEIGHT - M.bottom, M.top]);
		const from = { age: age0, lo: now.dpm, hi: now.dpm, mid: now.dpm };
		const fanPoints = [
			from,
			...drawnFan.map((entry) => ({ age: age0 + entry.year, entry }))
		];
		const band = (lo, hi) =>
			d3
				.area()
				.x((point) => x(point.age))
				.y0((point) => y(point.entry ? point.entry[lo] : point.lo))
				.y1((point) => y(point.entry ? point.entry[hi] : point.hi))
				.curve(d3.curveMonotoneX)(fanPoints);
		const pathLine = d3
			.line()
			.defined((point) => point.dpm !== null)
			.x((point) => x(age0 + point.year))
			.y((point) => y(point.dpm));
		const firstAge = Math.ceil(x.domain()[0]);
		const lastAge = Math.floor(x.domain()[1]);
		return {
			x,
			y,
			age0,
			outer: drawnFan.length ? band('p10', 'p90') : null,
			inner: drawnFan.length ? band('p25', 'p75') : null,
			median: drawnFan.length
				? d3
						.line()
						.x((point) => x(point.age))
						.y((point) => y(point.entry ? point.entry.p50 : point.mid))
						.curve(d3.curveMonotoneX)(fanPoints)
				: null,
			medianEnd: drawnFan.at(-1) ?? null,
			own: d3
				.line()
				.x((point) => x(point.age))
				.y((point) => y(point.dpm))
				.curve(d3.curveMonotoneX)(own),
			comps: listed.map((comp) => ({ comp, d: pathLine(compPath(comp)), points: compPath(comp) })),
			yTicks: y.ticks(5),
			ages: Array.from({ length: Math.max(0, lastAge - firstAge + 1) }, (_, index) => firstAge + index)
		};
	});

	const sparkScale = $derived.by(() => {
		const values = [0, ...listed.flatMap((comp) => compPath(comp).map((point) => point.dpm))].filter(
			(value) => value !== null
		);
		const [low, high] = d3.extent(values);
		return {
			x: d3.scaleLinear().domain([0, FUTURE_SEASONS]).range([3, 71]),
			y: d3.scaleLinear().domain([low, high === low ? high + 1 : high]).range([19, 3])
		};
	});

	function sparkPath(comp) {
		return d3
			.line()
			.defined((point) => point.dpm !== null)
			.x((point) => sparkScale.x(point.year))
			.y((point) => sparkScale.y(point.dpm))(compPath(comp));
	}

	function lastPoint(points) {
		return points.filter((point) => point.dpm !== null).at(-1) ?? null;
	}

	function percent(share) {
		return `${Math.round(share * 100)}%`;
	}

	function pointerMove(event) {
		if (!chart) return;
		const box = event.currentTarget.ownerSVGElement.getBoundingClientRect();
		const px = event.clientX - box.left;
		const age = chart.x.invert(px);
		const ahead = Math.round(age - chart.age0);
		let at;
		let lines;
		if (ahead >= 1 && ahead <= FUTURE_SEASONS) {
			const entry = fan[ahead - 1];
			at = chart.x(chart.age0 + ahead);
			lines = [
				{ text: `Age ${Math.floor(chart.age0 + ahead)} · ${ahead} season${ahead > 1 ? 's' : ''} ahead`, head: true },
				...(entry.p50 === null
					? [{ text: 'Too few comps still playing' }]
					: [
							{ text: `${formatSigned(entry.p50, 2)} median of comps` },
							{ text: `${formatSigned(entry.p25, 1)} to ${formatSigned(entry.p75, 1)}, middle half`, muted: true },
							{ text: `${formatSigned(entry.p10, 1)} to ${formatSigned(entry.p90, 1)}, 10th–90th percentile`, muted: true }
						]),
				{ text: `${percent(entry.share)} of comps (weighted) played 10+ games`, muted: true },
				{ text: `${entry.count} of ${comps.length} had a rating`, muted: true }
			];
		} else {
			const point = own.reduce(
				(best, candidate) => (Math.abs(candidate.age - age) < Math.abs(best.age - age) ? candidate : best),
				own[own.length - 1]
			);
			if (!point) return;
			at = chart.x(point.age);
			lines = [
				{ text: `${seasonLabel(point.season)} · age ${Math.floor(point.age)}`, head: true },
				{ text: `${formatSigned(point.dpm, 2)} season-end DPM` }
			];
		}
		const half = Math.min(125, box.width / 2);
		hover = { at, x: Math.min(Math.max(at, half), box.width - half), y: event.clientY - box.top, lines };
	}
</script>

<div class="comps">
<div class="comps-grid">
	<div class="comps-chart-col">
		<div class="comps-chart" bind:clientWidth={width}>
			{#if chart}
				<svg
					width={width}
					height={HEIGHT}
					viewBox="0 0 {width} {HEIGHT}"
					role="img"
					aria-label="{playerName}'s season-end DPM by age, and the range his {comps.length} comps took over the next five seasons"
				>
					{#each chart.yTicks as tick (tick)}
						<line class="cf-grid" class:zero={tick === 0} x1={M.left} x2={width - M.right} y1={chart.y(tick)} y2={chart.y(tick)} />
						<text class="cf-axis" x={M.left - 8} y={chart.y(tick) + 4} text-anchor="end">{tick > 0 ? `+${tick}` : tick}</text>
					{/each}
					{#each chart.ages as age (age)}
						<text class="cf-axis" x={chart.x(age)} y={HEIGHT - M.bottom + 16} text-anchor="middle">{age}</text>
					{/each}
					<text class="cf-axis" x={M.left - 8} y={HEIGHT - M.bottom + 16} text-anchor="end">Age</text>

					{#if chart.outer}
						<path class="cf-band cf-band--outer" d={chart.outer} style:fill={playerColor} />
						<path class="cf-band cf-band--inner" d={chart.inner} style:fill={playerColor} />
					{/if}
					{#each chart.comps as path, index (path.comp.comp_id)}
						{#if index !== highlight && path.d}
							<path class="cf-ghost" d={path.d} />
						{/if}
					{/each}
					{#if chart.median}
						<path class="cf-median" d={chart.median} />
						<text
							class="cf-label"
							x={chart.x(chart.age0 + chart.medianEnd.year) - 4}
							y={chart.y(chart.medianEnd.p50) - 10}
							text-anchor="end">Comps' median</text
						>
					{/if}
					{#if highlight !== null && chart.comps[highlight]}
						{@const path = chart.comps[highlight]}
						{@const end = lastPoint(path.points)}
						<path class="cf-highlight" d={path.d} style:stroke={compColor} />
						{#each path.points.filter((point) => point.dpm !== null) as point (point.year)}
							<circle cx={chart.x(chart.age0 + point.year)} cy={chart.y(point.dpm)} r="3.5" style:fill={compColor} />
						{/each}
						{#if end}
							<text
								class="cf-label cf-label--strong"
								x={Math.min(chart.x(chart.age0 + end.year) + 8, width - M.right)}
								y={chart.y(end.dpm) - 8}
								text-anchor="end">{path.comp.comp_name} {seasonLabel(path.comp.comp_season)}</text
							>
						{/if}
					{/if}
					{#if own.length}
						<path class="cf-own" d={chart.own} style:stroke={playerColor} />
						{#each own as point (point.season)}
							<circle cx={chart.x(point.age)} cy={chart.y(point.dpm)} r="3.5" style:fill={playerColor} />
						{/each}
					{/if}
					<text
						class="cf-label cf-label--strong"
						x={chart.x(chart.age0) - 8}
						y={chart.y(now.dpm) - 10}
						text-anchor="end">{seasonLabel(now.season)} {formatSigned(now.dpm, 2)}</text
					>

					<text class="cf-axis" x={M.left - 8} y={HEIGHT - 12} text-anchor="end">In NBA</text>
					{#each fan as entry (entry.year)}
						<text class="cf-axis cf-share" x={chart.x(chart.age0 + entry.year)} y={HEIGHT - 12} text-anchor="middle">{percent(entry.share)}</text>
					{/each}

					{#if hover}
						<line class="cf-crosshair" x1={hover.at} x2={hover.at} y1={M.top} y2={HEIGHT - M.bottom} />
					{/if}
					<rect
						class="cf-hit"
						x={M.left}
						y="0"
						width={Math.max(width - M.left - M.right, 0)}
						height={HEIGHT - M.bottom}
						role="presentation"
						onpointermove={pointerMove}
						onpointerleave={() => (hover = null)}
					/>
				</svg>
				{#if hover}
					<div class="chart-tooltip cf-tip" style:left="{hover.x}px" style:top="{hover.y}px">
						{#each hover.lines as line, index (index)}
							<span class:cf-tip-head={line.head} class:cf-tip-muted={line.muted}>{line.text}</span>
						{/each}
					</div>
				{/if}
			{/if}
		</div>
		<p class="cf-legend" aria-hidden="true">
			<span><i class="cf-key-line" style:background={playerColor}></i>{playerName}</span>
			<span><i class="cf-key-dash"></i>Median of {comps.length} comps</span>
			<span><i class="cf-key-box cf-key-box--inner" style:background={playerColor}></i>Middle half</span>
			<span><i class="cf-key-box" style:background={playerColor}></i>10th–90th percentile</span>
			<span><i class="cf-key-line" style:background={compColor}></i>Highlighted comp</span>
		</p>
	</div>

	<div class="comps-table-col">
		<div class="comps-table-wrap" data-shiny-table>
			<table class="comps-table">
				<thead>
					<tr>
						<th scope="col">Comp</th>
						<th scope="col" class="num comp-age">Age</th>
						<th scope="col" class="num">DPM then</th>
						<th scope="col">Next {FUTURE_SEASONS} seasons</th>
						<th scope="col" class="num">Match</th>
					</tr>
				</thead>
				<tbody>
					{#each listed as comp, index (comp.comp_id)}
						<tr
							class:active={highlight === index}
							onpointerenter={() => (highlight = index)}
							onpointerleave={() => (highlight = null)}
						>
							<td class="comp-name">
								<a
									href="/player/{comp.comp_id}"
									onfocus={() => (highlight = index)}
									onblur={() => (highlight = null)}>{comp.comp_name}</a
								>
								<span class="comp-season">{seasonLabel(comp.comp_season)}</span>
							</td>
							<td class="num comp-age">{Math.floor(comp.comp_age)}</td>
							<td class="num tint-cell" style={divergingTint(comp.comp_dpm, dpmTint)}>{formatSigned(comp.comp_dpm, 1)}</td>
							<td>
								<svg class="comp-spark" width="74" height="22" viewBox="0 0 74 22" aria-hidden="true">
									<line class="spark-zero" x1="3" x2="71" y1={sparkScale.y(0)} y2={sparkScale.y(0)} />
									<path class="spark-line" d={sparkPath(comp)} style:stroke={highlight === index ? compColor : undefined} />
									{#each compPath(comp).filter((point) => point.dpm !== null) as point (point.year)}
										<circle class="spark-dot" cx={sparkScale.x(point.year)} cy={sparkScale.y(point.dpm)} r="1.6" />
									{/each}
								</svg>
								<span class="sr-only">
									{compPath(comp)
										.slice(1)
										.map((point) => (point.dpm === null ? 'out of the league' : formatSigned(point.dpm, 1)))
										.join(', ')}
								</span>
							</td>
							<td class="num">
								<span class="match" aria-hidden="true"><i style:width="{Math.max(0, Math.min(100, comp.similarity))}%"></i></span>
								{Math.round(comp.similarity)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="cf-note">
			The {comps.length} player-seasons since 1996-97 closest to {firstName}'s {seasonLabel(now.season)} at
			the same age: DPM and its offense/defense split, the two seasons before, box-score profile, height,
			experience and age. Each comp counts once, at his closest season, weighted by the match. Hover or
			focus a comp to trace his next five seasons. A website presentation, not a DARKO model output.
		</p>
	</div>
</div>
</div>

<style>
	/* The table sits beside the chart only where both fit; otherwise it goes below. */
	.comps {
		container-type: inline-size;
	}

	.comps-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 20px;
		align-items: start;
	}

	@container (min-width: 900px) {
		.comps-grid {
			grid-template-columns: minmax(0, 11fr) minmax(0, 9fr);
			gap: 24px;
		}
	}

	.comps-chart {
		position: relative;
		min-width: 0;
	}

	.comps-chart svg {
		display: block;
		overflow: visible;
	}

	.cf-grid {
		stroke: var(--border-subtle);
	}

	.cf-grid.zero {
		stroke: var(--text-muted);
	}

	.cf-axis {
		fill: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.cf-share {
		font-weight: 600;
		fill: var(--text-secondary);
	}

	.cf-band--outer {
		fill-opacity: 0.12;
	}

	.cf-band--inner {
		fill-opacity: 0.22;
	}

	.cf-ghost {
		fill: none;
		stroke: var(--text-muted);
		stroke-opacity: 0.35;
		stroke-width: 1;
	}

	.cf-median {
		fill: none;
		stroke: var(--text);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
	}

	.cf-own,
	.cf-highlight {
		fill: none;
		stroke-width: 2;
	}

	.cf-label {
		fill: var(--text-secondary);
		font-size: 11px;
		paint-order: stroke;
		stroke: var(--cf-halo, var(--bg-surface));
		stroke-width: 4px;
		stroke-linejoin: round;
	}

	.cf-label--strong {
		fill: var(--text);
		font-weight: 600;
	}

	:global(:root[data-view='shiny']) .comps-chart {
		--cf-halo: var(--shiny-panel-bg);
	}

	.cf-crosshair {
		stroke: var(--text-muted);
		stroke-dasharray: 2 3;
	}

	.cf-hit {
		fill: transparent;
	}

	.cf-tip {
		z-index: 5;
		align-items: flex-start;
		max-width: 250px;
		font-size: 12px;
		white-space: normal;
	}

	.cf-tip-head {
		font-weight: 700;
	}

	.cf-tip-muted {
		color: var(--text-secondary);
	}

	.cf-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.cf-legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.cf-key-line,
	.cf-key-dash {
		display: inline-block;
		width: 16px;
		height: 2px;
	}

	.cf-key-dash {
		background: repeating-linear-gradient(90deg, var(--text) 0 5px, transparent 5px 9px);
	}

	.cf-key-box {
		display: inline-block;
		width: 12px;
		height: 10px;
		opacity: 0.18;
		border-radius: 2px;
	}

	.cf-key-box--inner {
		opacity: 0.34;
	}

	.comps-table-wrap {
		overflow-x: auto;
	}

	.comps-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: 13px;
	}

	.comps-table th {
		padding: 8px 6px;
		text-align: left;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
		white-space: nowrap;
		border-bottom: 1px solid var(--border);
	}

	.comps-table td {
		padding: 5px 6px;
		border-bottom: 1px solid var(--border-subtle);
		white-space: nowrap;
	}

	.comps-table .num {
		text-align: right;
		font-family: var(--font-mono);
	}

	.comps-table td.tint-cell {
		font-weight: 700;
	}

	.comps-table tr.active td {
		background: var(--bg-hover);
	}

	.comp-name a {
		color: var(--text);
		font-weight: 600;
	}

	.comp-name a:hover {
		color: var(--accent);
	}

	.comp-name {
		line-height: 1.25;
	}

	.comp-season {
		display: block;
		font-size: 11px;
		color: var(--text-muted);
	}

	.comp-spark {
		display: block;
	}

	.spark-zero {
		stroke: var(--border);
	}

	.spark-line {
		fill: none;
		stroke: var(--text-secondary);
		stroke-width: 1.5;
	}

	.spark-dot {
		fill: var(--text-secondary);
	}

	.match {
		display: inline-block;
		width: 28px;
		height: 6px;
		margin-right: 6px;
		overflow: hidden;
		vertical-align: middle;
		background: var(--border-subtle);
		border-radius: 3px;
	}

	.match i {
		display: block;
		height: 100%;
		background: var(--text-secondary);
	}

	.cf-note {
		margin: 10px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	/* Phones: every comp is within nine months of the player's age, so the age column goes,
	   and the sparkline and match bar shrink so the table fits without scrolling. */
	@container (max-width: 480px) {
		.comp-age,
		.match {
			display: none;
		}

		.comp-spark {
			width: 58px;
			height: 22px;
		}

		.comp-name a {
			display: block;
			max-width: 15ch;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.comps-table th,
		.comps-table td {
			padding-inline: 4px;
		}

		.comps-table th {
			white-space: normal;
			vertical-align: bottom;
		}
	}
</style>
