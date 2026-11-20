<script>
	// One dot per row on a shared percentage axis, value labelled beside the dot. Same look as the
	// Lakers dumbbell chart; one row can be emphasised in the series colour, the rest are grey.
	import { getContext } from 'svelte';
	import { scaleLinear } from 'd3';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { count, placeTooltip } from '$lib/utils/freeThrowCharts.js';

	// rows: [{ label, pct, n }]; emphasis: the label of the highlighted row; domain: [lo, hi] in percent.
	let { rows, title, caption = '', emphasis = null, domain, step = 2, axisTitle, ariaLabel } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const accent = $derived(getSeriesColor(0, displayMode.view));

	let width = $state(720);
	let figureEl = $state();
	let active = $state(null);
	let tooltip = $state(null);

	// On a phone the labels sit above each row so the plot gets the full width.
	const narrow = $derived(width < 520);
	const rowH = $derived(narrow ? 44 : 34);
	const nameW = $derived(narrow ? 0 : 184);
	const margin = $derived({ top: 14, right: 44, bottom: 36, left: narrow ? 12 : nameW + 24 });
	const height = $derived(margin.top + rows.length * rowH + margin.bottom);
	const x = $derived(scaleLinear().domain(domain).range([margin.left, width - margin.right]));
	// Thin the ticks on a phone so the labels do not crowd.
	const ticks = $derived.by(() => {
		const s = narrow ? step * 2 : step;
		const out = [];
		for (let t = domain[0]; t <= domain[1]; t += s) out.push(t);
		return out;
	});
	const cy = (i) => margin.top + i * rowH + (narrow ? 29 : rowH / 2);
	const pct = (v) => `${v.toFixed(1)}%`;

	function show(d, event) {
		active = d.label;
		tooltip = { d, ...placeTooltip(figureEl, event, 220) };
	}

	function hide() {
		active = null;
		tooltip = null;
	}
</script>

<figure class="ft-figure" bind:this={figureEl}>
	<h3 class="ft-title">{title}</h3>

	<div class="ft-plot" bind:clientWidth={width}>
		<svg {width} {height} role="img" aria-label={ariaLabel} onpointerleave={hide}>
			{#each ticks as t (t)}
				<line class="grid" x1={x(t)} x2={x(t)} y1={margin.top - 4} y2={height - margin.bottom + 4} />
				<text class="t-axis" x={x(t)} y={height - margin.bottom + 18} text-anchor="middle">{t}%</text>
			{/each}
			<text class="t-axis-title" x={(margin.left + width - margin.right) / 2} y={height - 2} text-anchor="middle">{axisTitle}</text>

			{#each rows as d, i (d.label)}
				{@const em = d.label === emphasis}
				<g class="row" class:dim={active && active !== d.label}>
					{#if narrow}
						<text class="t-name" class:em x={margin.left} y={cy(i) - 13}>{d.label}</text>
					{:else}
						<text class="t-name" class:em x={nameW} y={cy(i)} dy="0.32em" text-anchor="end">{d.label}</text>
					{/if}
					<line class="link" x1={x(domain[0])} x2={x(d.pct)} y1={cy(i)} y2={cy(i)} />
					<circle cx={x(d.pct)} cy={cy(i)} r={em ? 6 : 5} fill={em ? accent : 'var(--text-muted)'} class="pt" />
					<text class="t-val" class:em x={x(d.pct) + 10} y={cy(i)} dy="0.32em">{pct(d.pct)}</text>
				</g>
			{/each}

			{#each rows as d, i (d.label)}
				<rect
					class="hit"
					x="0"
					y={margin.top + i * rowH}
					{width}
					height={rowH}
					role="button"
					tabindex="0"
					aria-label="{d.label}: {pct(d.pct)} made, {count(d.n)} free throws"
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
			<b>{d.label}</b><br />
			<b>{pct(d.pct)}</b> made<br />
			{count(d.n)} free throws
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
		stroke: var(--border);
		stroke-width: 1.5;
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
		fill: var(--text-secondary);
		font-size: 12px;
		font-weight: 600;
	}

	.t-name.em {
		fill: var(--text);
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

	.t-val.em {
		fill: var(--text);
		font-weight: 700;
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
