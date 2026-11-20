<script>
	// Every in-game situation from the joint model as a diverging horizontal bar, under one bar for
	// what tripling the odds (practice) would add. The practice bar sets the scale.
	import { scaleLinear } from 'd3';
	import { hBarPath, placeTooltip, signed } from '$lib/utils/freeThrowCharts.js';

	// rows: [{ label, effect, share }]; practice: { label, effect, aria, tip }.
	let { rows, practice, title, caption = '' } = $props();

	let width = $state(720);
	let figureEl = $state();
	let active = $state(null);
	let tooltip = $state(null);

	// On a phone each label sits above its bar so the bars get the full width.
	const narrow = $derived(width < 560);
	const rowH = $derived(narrow ? 36 : 26);
	const barH = $derived(narrow ? 12 : 14);
	const labelW = $derived(narrow ? 0 : 214);
	const gap = 14; // space between the practice row and the rest
	const margin = $derived({ top: 6, right: 44, bottom: 40, left: labelW + 6 });
	const lineH = 13; // extra height for each wrapped label line
	// Long labels wrap onto a second line (by words, about 6.2 px a character at 12 px) instead of
	// running off the left edge; a wrapped row is taller by one line.
	const maxChars = $derived(Math.max(16, Math.floor((narrow ? width : labelW) / 6.2)));
	function wrap(label) {
		const lines = [];
		for (const word of label.split(' ')) {
			const last = lines.at(-1);
			if (last !== undefined && `${last} ${word}`.length <= maxChars) lines[lines.length - 1] = `${last} ${word}`;
			else lines.push(word);
		}
		return lines;
	}
	const all = $derived(
		[{ ...practice, key: 'practice', isPractice: true }, ...rows.map((r) => ({ ...r, key: r.label }))].map((d) => ({
			...d,
			lines: wrap(d.label)
		}))
	);
	const rowHs = $derived(all.map((d) => rowH + (d.lines.length - 1) * lineH));
	const tops = $derived(rowHs.reduce((acc, h, i) => [...acc, acc[i] + h], [margin.top]));
	const height = $derived(tops[all.length] + gap + margin.bottom);

	const lo = $derived(Math.floor(Math.min(0, ...rows.map((r) => r.effect)) / 5) * 5);
	const hi = $derived(Math.ceil(Math.max(practice.effect, ...rows.map((r) => r.effect)) / 5) * 5);
	const ticks = $derived(Array.from({ length: (hi - lo) / 5 + 1 }, (_, i) => lo + i * 5));
	// Leave room on the left for the most negative value label.
	const x = $derived(scaleLinear().domain([lo, hi]).range([margin.left + (narrow ? 4 : 0), width - margin.right]));

	const rowTop = (i) => tops[i] + (i > 0 ? gap : 0);
	const barY = (i) => rowTop(i) + (narrow ? rowHs[i] - barH - 4 : (rowHs[i] - barH) / 2);
	const fill = (d) => (d.isPractice ? 'var(--text)' : d.effect >= 0 ? 'var(--positive)' : 'var(--negative)');
	const shareText = (s) => `${s < 10 ? s.toFixed(1) : Math.round(s)}%`;

	function show(d, event) {
		active = d.key;
		tooltip = { d, ...placeTooltip(figureEl, event, 250) };
	}

	function hide() {
		active = null;
		tooltip = null;
	}
</script>

<figure class="ft-figure" bind:this={figureEl}>
	<h3 class="ft-title">{title}</h3>

	<div class="ft-legend">
		<span><i style:background="var(--positive)"></i>Better</span>
		<span><i style:background="var(--negative)"></i>Worse</span>
		<span><i style:background="var(--text)"></i>Practice</span>
	</div>

	<div class="ft-plot" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			role="img"
			aria-label="Horizontal bar chart, percentage points. {practice.label}: {signed(practice.effect)}. {rows
				.map((r) => `${r.label}: ${signed(r.effect)}`)
				.join('; ')}."
			onpointerleave={hide}
		>
			{#each ticks as t (t)}
				<line class="grid" class:zero={t === 0} x1={x(t)} x2={x(t)} y1={margin.top} y2={height - margin.bottom + 4} />
				<text class="t-axis" x={x(t)} y={height - margin.bottom + 18} text-anchor="middle">{t === 0 ? '0' : signed(t, 0)}</text>
			{/each}
			<text class="t-axis-title" x={(margin.left + width - margin.right) / 2} y={height - 4} text-anchor="middle">Percentage points</text>
			<line class="sep" x1="0" x2={width} y1={rowTop(1) - gap / 2} y2={rowTop(1) - gap / 2} />

			{#each all as d, i (d.key)}
				<g class="row" class:dim={active && active !== d.key}>
					{#if narrow}
						<text class="t-name" class:practice={d.isPractice} x="0" y={barY(i) - 5 - (d.lines.length - 1) * lineH}>
							{#each d.lines as line, j (j)}<tspan x="0" dy={j ? lineH : 0}>{line}</tspan>{/each}
						</text>
					{:else}
						<text
							class="t-name"
							class:practice={d.isPractice}
							x={labelW}
							y={barY(i) + barH / 2 - ((d.lines.length - 1) * lineH) / 2}
							text-anchor="end"
						>
							{#each d.lines as line, j (j)}<tspan x={labelW} dy={j ? lineH : '0.32em'}>{line}</tspan>{/each}
						</text>
					{/if}
					<path d={hBarPath(barY(i), barH, x(0), x(d.effect))} fill={fill(d)} />
					<text
						class="t-val"
						x={x(d.effect) + (d.effect >= 0 ? 6 : -6)}
						y={barY(i) + barH / 2}
						dy="0.32em"
						text-anchor={d.effect >= 0 ? 'start' : 'end'}>{signed(d.effect)}</text
					>
				</g>
			{/each}

			{#each all as d, i (d.key)}
				<rect
					class="hit"
					x="0"
					y={rowTop(i)}
					{width}
					height={rowHs[i]}
					role="button"
					tabindex="0"
					aria-label={d.isPractice ? d.aria : `${d.label}: ${signed(d.effect)} points, ${shareText(d.share)} of free throws`}
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
			{#if d.isPractice}
				{d.tip}
			{:else}
				<b>{signed(d.effect)}</b> points<br />
				{shareText(d.share)} of free throws are taken in this situation
			{/if}
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
		margin-bottom: 8px;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.ft-legend i {
		display: inline-block;
		width: 12px;
		height: 10px;
		margin-right: 6px;
		border-radius: 2px;
		vertical-align: middle;
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

	.sep {
		stroke: var(--border);
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
		paint-order: stroke;
		stroke: var(--bg-surface);
		stroke-width: 4px;
		stroke-linejoin: round;
	}

	.t-name.practice {
		fill: var(--text);
		font-weight: 700;
	}

	.t-val {
		fill: var(--text);
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
