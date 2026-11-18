<script>
	// Duncan Robinson's 2019-20 three-point shooting: his percentage so far against the padded
	// projection. The slider changes the padding, so a reader can see what the amount does.
	import { getContext, untrack } from 'svelte';
	import { scaleLinear } from 'd3';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';

	let { games, leagueAvg = 0.355, defaultPadding = 240, presets = [] } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const actualColor = $derived(getSeriesColor(0, displayMode.view));
	const projectionColor = $derived(getSeriesColor(1, displayMode.view));

	let padding = $state(untrack(() => defaultPadding));
	let width = $state(720);
	let hover = $state(null);

	const Y_MIN = 0.3;
	const Y_MAX = 0.52;
	const height = $derived(width < 500 ? 280 : 340);
	const margin = $derived(width < 500 ? { top: 12, right: 12, bottom: 30, left: 40 } : { top: 14, right: 18, bottom: 32, left: 48 });

	const points = $derived.by(() => {
		let made = 0;
		let attempts = 0;
		return games.map((game, index) => {
			made += game.fg3;
			attempts += game.fg3a;
			return {
				index,
				date: new Date(`${game.date}T12:00:00`),
				game,
				made,
				attempts,
				actual: attempts ? made / attempts : null,
				projection: (made + padding * leagueAvg) / (attempts + padding),
				own: attempts / (attempts + padding)
			};
		});
	});

	// Games played on the x-axis, so the four-month 2020 shutdown takes no room.
	const x = $derived(scaleLinear().domain([0, points.length - 1]).range([margin.left, width - margin.right]));
	const y = $derived(scaleLinear().domain([Y_MIN, Y_MAX]).range([height - margin.bottom, margin.top]));
	const clampY = (value) => y(Math.min(Y_MAX, Math.max(Y_MIN, value)));
	const path = (key) =>
		points
			.filter((point) => point.actual !== null)
			.map((point, i) => `${i ? 'L' : 'M'}${x(point.index).toFixed(1)},${clampY(point[key]).toFixed(1)}`)
			.join('');
	const yTicks = [0.3, 0.35, 0.4, 0.45, 0.5];
	// A tick at each month's first game; on narrow screens every other month.
	const xTicks = $derived(
		points
			.filter((point, i) => i === 0 || point.date.getMonth() !== points[i - 1].date.getMonth())
			.filter((point, i) => width >= 500 || i % 2 === 0)
	);
	const monthLabel = (date) => date.toLocaleDateString('en-US', { month: 'short' });

	function onMove(event) {
		const rect = event.currentTarget.getBoundingClientRect();
		const px = event.clientX - rect.left;
		const index = Math.round(x.invert(px));
		hover = points[Math.min(points.length - 1, Math.max(0, index))];
	}

	const pct = (value) => `${(value * 100).toFixed(1)}%`;
	const last = $derived(points[points.length - 1]);
	const readout = $derived(hover ?? last);
</script>

<figure class="pad-chart">
	<div class="pad-controls">
		<label>
			<span>Padding</span>
			<input type="range" min="0" max="1000" step="10" bind:value={padding} aria-valuetext="{padding} attempts" />
			<strong>{padding} attempts</strong>
		</label>
		{#if presets.length}
			<div class="pad-presets" role="group" aria-label="Padding presets">
				{#each presets as preset (preset.value)}
					<button type="button" class:active={padding === preset.value} onclick={() => (padding = preset.value)}>
						{preset.label}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="legend">
		<span><i style:background={actualColor}></i>His 3-point % so far</span>
		<span><i style:background={projectionColor}></i>Padded projection</span>
	</div>

	<div class="plot" bind:clientWidth={width}>
		<svg
			{width}
			{height}
			role="img"
			aria-label="Duncan Robinson's 2019-20 three-point percentage so far and his padded projection, game by game"
			onpointermove={onMove}
			onpointerleave={() => (hover = null)}
		>
			{#each yTicks as tick (tick)}
				<line class="grid" x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} />
				<text class="tick" x={margin.left - 6} y={y(tick)} dy="0.32em" text-anchor="end">{Math.round(tick * 100)}%</text>
			{/each}
			<line class="league" x1={margin.left} x2={width - margin.right} y1={y(leagueAvg)} y2={y(leagueAvg)} />
			<text class="tick" x={width - margin.right} y={y(leagueAvg) + 13} text-anchor="end">League average</text>
			{#each xTicks as tick (tick.index)}
				<text class="tick" x={x(tick.index)} y={height - 8} text-anchor="middle">{monthLabel(tick.date)}</text>
			{/each}
			<path d={path('actual')} fill="none" stroke={actualColor} stroke-width="2" />
			<path d={path('projection')} fill="none" stroke={projectionColor} stroke-width="2.5" />
			{#if hover}
				<line class="crosshair" x1={x(hover.index)} x2={x(hover.index)} y1={margin.top} y2={height - margin.bottom} />
				<circle cx={x(hover.index)} cy={clampY(hover.actual)} r="4.5" fill={actualColor} class="dot" />
				<circle cx={x(hover.index)} cy={clampY(hover.projection)} r="4.5" fill={projectionColor} class="dot" />
			{/if}
		</svg>
	</div>

	<p class="readout" aria-live="polite">
		<span class="date">{hover ? 'After' : 'After his last game,'} {readout.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}:</span>
		{readout.made} of {readout.attempts}, <i style:background={actualColor}></i><strong>{pct(readout.actual)}</strong>.
		Projection <i style:background={projectionColor}></i><strong>{pct(readout.projection)}</strong>,
		{Math.round(readout.own * 100)}% his own shooting.
	</p>

	<figcaption>
		Duncan Robinson, 2019-20 regular season, one point per game, padded toward .355, the long-run league average used in the example above. The season paused from March to late July. Drag the slider: at zero the projection is just his
		percentage so far.
	</figcaption>
</figure>

<style>
	.pad-chart {
		margin: 28px 0 34px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.pad-controls {
		display: grid;
		gap: 10px;
		margin-bottom: 10px;
	}

	.pad-controls label {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) 8.5em;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.pad-controls input {
		width: 100%;
		accent-color: var(--accent);
	}

	.pad-controls strong {
		color: var(--text);
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
		text-align: right;
	}

	.pad-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.pad-presets button {
		min-height: 28px;
		padding: 3px 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.pad-presets button.active,
	.pad-presets button:hover {
		border-color: var(--accent);
		color: var(--text);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		margin-bottom: 4px;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.legend i {
		display: inline-block;
		width: 14px;
		height: 3px;
		margin-right: 6px;
		border-radius: 2px;
		vertical-align: middle;
	}

	.plot {
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

	.league {
		stroke: var(--text-muted);
		stroke-dasharray: 6 4;
	}

	.tick {
		fill: var(--text-muted);
		font-size: 11px;
	}

	.crosshair {
		stroke: var(--text-muted);
	}

	.dot {
		stroke: var(--bg-surface);
		stroke-width: 2;
	}

	.readout {
		min-height: 3em;
		margin: 8px 0 0;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.readout strong {
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
	}

	.readout i {
		display: inline-block;
		width: 10px;
		height: 10px;
		margin: 0 4px 0 2px;
		border-radius: 50%;
	}

	.readout .date {
		color: var(--text-muted);
	}

	figcaption {
		margin-top: 8px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	@media (max-width: 560px) {
		.pad-controls label {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.pad-controls label > span {
			grid-column: 1 / -1;
		}
	}
</style>
