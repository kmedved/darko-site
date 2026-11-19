<script>
	// The 2013 Lakers practice board as a dumbbell chart: each player's practice percentage against
	// his game projection, with a tick at what dividing the practice odds by three predicts.
	import { getContext } from 'svelte';
	import { scaleLinear } from 'd3';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { count, placeTooltip } from '$lib/utils/freeThrowCharts.js';

	let { rows, title, caption = '' } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const practiceColor = $derived(getSeriesColor(0, displayMode.view));
	const gameColor = $derived(getSeriesColor(1, displayMode.view));

	let width = $state(720);
	let figureEl = $state();
	let active = $state(null);
	let tooltip = $state(null);

	// On a phone the names sit above each row so the plot gets the full width.
	const narrow = $derived(width < 520);
	const rowH = $derived(narrow ? 44 : 32);
	const nameW = $derived(narrow ? 0 : 136);
	const margin = $derived({ top: 22, right: 38, bottom: 36, left: nameW + 36 });
	const height = $derived(margin.top + rows.length * rowH + margin.bottom);
	const x = $derived(scaleLinear().domain([40, 100]).range([margin.left, width - margin.right]));
	const ticks = [40, 50, 60, 70, 80, 90, 100];
	// Row centre; on a phone the dots sit in the lower part of the row, under the name.
	const cy = (i) => margin.top + i * rowH + (narrow ? 29 : rowH / 2);

	// The game label sits left of the game dot, or left of the tick when the tick is just left of
	// the dot and the label would run over it.
	const gameLabelX = (d) => {
		const room = x(d.game) - x(d.div3);
		return room > 0 && room < 44 ? x(d.div3) - 6 : x(d.game) - 9;
	};
	const pct = (v) => `${v.toFixed(1)}%`;
	const short = (v) => v.toFixed(1);

	function show(d, event) {
		active = d.name;
		tooltip = { d, ...placeTooltip(figureEl, event, 260) };
	}

	function hide() {
		active = null;
		tooltip = null;
	}
</script>

<figure class="ft-figure" bind:this={figureEl}>
	<h3 class="ft-title">{title}</h3>

	<div class="ft-legend">
		<span><i class="dot" style:background={practiceColor}></i>In practice</span>
		<span><i class="dot" style:background={gameColor}></i>In games</span>
		<span><i class="tick"></i>Practice odds ÷ 3</span>
	</div>

	<div class="ft-plot" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			role="img"
			aria-label="Dot chart of 14 Lakers: practice free-throw percentage through the 2013 All-Star break against the game projection. {rows
				.map((d) => `${d.name}, ${pct(d.practice)} in practice, ${pct(d.game)} in games`)
				.join('; ')}."
			onpointerleave={hide}
		>
			{#each ticks as t (t)}
				<line class="grid" x1={x(t)} x2={x(t)} y1={margin.top - 4} y2={height - margin.bottom + 4} />
				<text class="t-axis" x={x(t)} y={height - margin.bottom + 18} text-anchor="middle">{t}%</text>
			{/each}
			<text class="t-axis-title" x={(margin.left + width - margin.right) / 2} y={height - 2} text-anchor="middle">Free-throw percentage</text>

			{#each rows as d, i (d.name)}
				<g class="row" class:dim={active && active !== d.name}>
					{#if narrow}
						<text class="t-name" x={margin.left} y={cy(i) - 13}>{d.name}</text>
					{:else}
						<text class="t-name" x={nameW} y={cy(i)} dy="0.32em" text-anchor="end">{d.name}</text>
					{/if}
					<line class="link" x1={x(d.game)} x2={x(d.practice)} y1={cy(i)} y2={cy(i)} />
					<line class="pred" x1={x(d.div3)} x2={x(d.div3)} y1={cy(i) - 7} y2={cy(i) + 7} />
					<circle cx={x(d.game)} cy={cy(i)} r="5" fill={gameColor} class="pt" />
					<circle cx={x(d.practice)} cy={cy(i)} r="5" fill={practiceColor} class="pt" />
					<text class="t-val" x={gameLabelX(d)} y={cy(i)} dy="0.32em" text-anchor="end">{short(d.game)}</text>
					<text class="t-val" x={x(d.practice) + 9} y={cy(i)} dy="0.32em">{short(d.practice)}</text>
				</g>
			{/each}

			{#each rows as d, i (d.name)}
				<rect
					class="hit"
					x="0"
					y={margin.top + i * rowH}
					{width}
					height={rowH}
					role="button"
					tabindex="0"
					aria-label="{d.name}: {count(d.practiceMade)} of {count(d.practiceAtt)} in practice, {pct(d.practice)}; game projection {pct(d.game)}; practice odds {d.ratio.toFixed(1)} times game odds"
					onpointerenter={(event) => show(d, event)}
					onpointermove={(event) => show(d, event)}
					onpointerdown={(event) => show(d, event)}
					onfocus={(event) => show(d, event)}
					onblur={hide}
				/>
			{/each}
		</svg>
	</div>

	{#if tooltip}
		{@const d = tooltip.d}
		<div class="ft-tooltip" style:left="{tooltip.x}px" style:top="{tooltip.y}px" style:width="{tooltip.w}px">
			<b>{d.name}</b><br />
			Practice: {count(d.practiceMade)} of {count(d.practiceAtt)}, <b>{pct(d.practice)}</b><br />
			Game projection: <b>{pct(d.game)}</b><br />
			Games on the board: {d.gameMade}-{d.gameAtt}<br />
			Practice odds are <b>{d.ratio.toFixed(1)}</b> times game odds
		</div>
	{/if}

	{#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
	.ft-figure {
		position: relative;
		margin: 28px 0 34px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.ft-title {
		margin: 0 0 8px;
		color: var(--text);
		font-size: 17px;
		font-weight: 700;
		line-height: 1.3;
	}

	.ft-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-bottom: 6px;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.ft-legend i {
		display: inline-block;
		margin-right: 6px;
		vertical-align: middle;
	}

	.ft-legend .dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.ft-legend .tick {
		width: 2px;
		height: 12px;
		background: var(--text-muted);
	}

	.ft-plot {
		width: 100%;
	}

	svg {
		display: block;
		overflow: visible;
		touch-action: pan-y;
	}

	.grid {
		stroke: var(--border-subtle);
		stroke-dasharray: 2 3;
	}

	.link {
		stroke: var(--text-muted);
		stroke-width: 1.5;
	}

	.pred {
		stroke: var(--text-muted);
		stroke-width: 2;
	}

	.pt {
		stroke: var(--bg-surface);
		stroke-width: 1.5;
	}

	.row {
		transition: opacity 120ms ease;
	}

	.row.dim {
		opacity: 0.4;
	}

	.t-axis {
		fill: var(--text-muted);
		font-size: 11px;
	}

	.t-axis-title {
		fill: var(--text-secondary);
		font-size: 12px;
	}

	.t-name {
		fill: var(--text);
		font-size: 12px;
		font-weight: 600;
	}

	.t-val {
		fill: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 11px;
		paint-order: stroke;
		stroke: var(--bg-surface);
		stroke-width: 3px;
		stroke-linejoin: round;
	}

	.hit {
		fill: transparent;
		cursor: pointer;
		outline: none;
	}

	.hit:focus-visible {
		stroke: var(--accent);
		stroke-width: 1.5;
	}

	.ft-tooltip {
		position: absolute;
		z-index: 5;
		box-sizing: border-box;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text-secondary);
		font-size: 12px;
		line-height: 1.45;
		pointer-events: none;
		box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
	}

	.ft-tooltip b {
		color: var(--text);
	}

	figcaption {
		margin-top: 10px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	@media (max-width: 640px) {
		.ft-figure {
			padding: 14px;
		}
	}
</style>
