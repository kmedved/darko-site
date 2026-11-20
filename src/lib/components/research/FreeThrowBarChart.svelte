<script>
	// Single-series vertical bars for the free-throw post (the warm-up curve and the run of free
	// throws). Bars start at zero; an optional dashed reference line; the tooltip is a snippet.
	import { getContext } from 'svelte';
	import { scaleLinear, scaleBand } from 'd3';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { placeTooltip, signed, vBarPath } from '$lib/utils/freeThrowCharts.js';

	// bars: [{ key, label, value, aria }]; refLine: { value, label } or null; tip: snippet(bar).
	let { bars, title, caption = '', axisTitle, ariaLabel, refLine = null, tip } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const color = $derived(getSeriesColor(0, displayMode.view));

	let width = $state(720);
	let figureEl = $state();
	let active = $state(null);
	let tooltip = $state(null);

	const narrow = $derived(width < 500);
	const height = $derived(narrow ? 300 : 330);
	const margin = $derived(narrow ? { top: 18, right: 8, bottom: 50, left: 34 } : { top: 20, right: 12, bottom: 52, left: 40 });

	const yMax = $derived(Math.ceil(Math.max(refLine?.value ?? 0, ...bars.map((d) => d.value)) + 0.4));
	const yTicks = $derived(Array.from({ length: yMax + 1 }, (_, i) => i));
	const x = $derived(
		scaleBand()
			.domain(bars.map((d) => d.key))
			.range([margin.left, width - margin.right])
			.paddingInner(narrow ? 0.28 : 0.36)
			.paddingOuter(0.18)
	);
	// Cap bar width so a chart with few bars matches the six-bar one; the bar is centered in its band.
	const MAX_BAR = 86;
	const barW = $derived(Math.min(x.bandwidth(), MAX_BAR));
	const barX = (key) => x(key) + (x.bandwidth() - barW) / 2;
	const y = $derived(scaleLinear().domain([0, yMax]).range([height - margin.bottom, margin.top]));

	function show(d, event) {
		active = d.key;
		tooltip = { d, ...placeTooltip(figureEl, event) };
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
			{#each yTicks as tick (tick)}
				<line class="grid" class:zero={tick === 0} x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />
				<text class="t-axis" x={margin.left - 8} y={y(tick)} dy="0.32em" text-anchor="end">{tick ? `+${tick}` : '0'}</text>
			{/each}
			<text class="t-axis" x="0" y={margin.top - 10}>Percentage points</text>

			{#each bars as d (d.key)}
				<path d={vBarPath(barX(d.key), barW, y(0), y(d.value))} fill={color} class="bar" class:dim={active && active !== d.key} />
				<text class="t-val" x={x(d.key) + x.bandwidth() / 2} y={y(d.value) - 5} text-anchor="middle">{signed(d.value)}</text>
				<text class="t-axis" x={x(d.key) + x.bandwidth() / 2} y={height - margin.bottom + 18} text-anchor="middle">{d.label}</text>
			{/each}

			{#if refLine}
				<line class="ref" x1={margin.left} x2={width - margin.right} y1={y(refLine.value)} y2={y(refLine.value)} />
				<text class="t-ann" x={width - margin.right} y={y(refLine.value) - 7} text-anchor="end">{refLine.label}</text>
			{/if}

			<text class="t-axis-title" x={(margin.left + width - margin.right) / 2} y={height - 8} text-anchor="middle">{axisTitle}</text>

			{#each bars as d (d.key)}
				<rect
					class="hit"
					x={x(d.key) - (x.step() - x.bandwidth()) / 2}
					y={margin.top}
					width={x.step()}
					height={height - margin.bottom - margin.top}
					role="button"
					tabindex="0"
					aria-label={d.aria}
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
		<div class="ft-tooltip" style:left="{tooltip.x}px" style:top="{tooltip.y}px" style:width="{tooltip.w}px">
			{@render tip(tooltip.d)}
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
		margin: 0 0 12px;
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

	.grid.zero {
		stroke: var(--text-muted);
		stroke-dasharray: none;
	}

	.ref {
		stroke: var(--text-muted);
		stroke-width: 1.2;
		stroke-dasharray: 6 4;
	}

	.bar {
		transition: opacity 120ms ease;
	}

	.bar.dim {
		opacity: 0.45;
	}

	.t-axis {
		fill: var(--text-muted);
		font-size: 11px;
	}

	.t-axis-title {
		fill: var(--text-secondary);
		font-size: 12px;
	}

	.t-val {
		fill: var(--text);
		font-family: var(--font-mono);
		font-size: 12px;
		paint-order: stroke;
		stroke: var(--bg-surface);
		stroke-width: 3px;
		stroke-linejoin: round;
	}

	.t-ann {
		fill: var(--text-secondary);
		font-size: 12px;
		font-weight: 600;
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

	.ft-tooltip :global(b) {
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
