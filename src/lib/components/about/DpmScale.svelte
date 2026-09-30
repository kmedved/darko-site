<script>
	// Today's league on one line: a dot for every player DARKO rates, stacked by DPM. Pointing at the
	// line (or the slider) picks a DPM; the dots at or above it light up, and the readout says how
	// many players reach it and who sits nearest.
	import { atOrAbove, quantile } from '$lib/utils/aboutDarko.js';
	import { formatSigned } from '$lib/utils/seismograph.js';

	let { players = [] } = $props();

	const PAD = 12;
	const PLOT = 132;
	const AXIS = 22;

	let width = $state(0);
	let picked = $state(null);

	const rated = $derived(players.filter((player) => Number.isFinite(player?.dpm)));
	const values = $derived(rated.map((player) => player.dpm));
	const low = $derived(values.length ? Math.floor(Math.min(...values)) : -5);
	const high = $derived(values.length ? Math.ceil(Math.max(...values)) : 8);
	const landmarks = $derived(
		values.length
			? [
					{ label: 'Median', value: quantile(values, 0.5) },
					{ label: 'Top 10% line', value: quantile(values, 0.9) },
					{ label: 'Top 1% line', value: quantile(values, 0.99) },
					{ label: 'No. 1', value: Math.max(...values) }
				]
			: []
	);
	// The top-10% line to start with; a pointer or the slider moves it.
	const value = $derived(picked ?? round(landmarks[1]?.value ?? 3));
	const reach = $derived(atOrAbove(values, value));
	const nearest = $derived(
		[...rated].sort((a, b) => Math.abs(a.dpm - value) - Math.abs(b.dpm - value)).slice(0, 3)
	);

	function round(n) {
		return Math.round(n * 10) / 10;
	}

	function x(v) {
		return PAD + ((v - low) / (high - low || 1)) * Math.max(0, width - 2 * PAD);
	}

	// Dots a pitch apart both ways, the largest pitch at which the tallest column fits.
	const layout = $derived.by(() => {
		if (!rated.length || width <= 2 * PAD) return null;
		let pitch = 6;
		let columns;
		for (;;) {
			columns = new Map();
			for (const player of rated) {
				const bin = Math.round(x(player.dpm) / pitch);
				columns.set(bin, (columns.get(bin) ?? 0) + 1);
			}
			const tallest = Math.max(...columns.values());
			if (tallest * pitch <= PLOT || pitch <= 2.25) break;
			pitch -= 0.25;
		}
		const levels = new Map();
		const dots = [...rated]
			.sort((a, b) => a.dpm - b.dpm)
			.map((player) => {
				const bin = Math.round(x(player.dpm) / pitch);
				const level = levels.get(bin) ?? 0;
				levels.set(bin, level + 1);
				return { id: player.nba_id, dpm: player.dpm, cx: bin * pitch, cy: PLOT - pitch / 2 - level * pitch };
			});
		const ticks = [];
		for (let tick = Math.ceil(low); tick <= high; tick += high - low > 10 ? 2 : 1) ticks.push(tick);
		return { dots, r: pitch * 0.42, ticks };
	});

	function pick(event) {
		if (!layout || width <= 2 * PAD) return;
		const box = event.currentTarget.getBoundingClientRect();
		const at = low + ((event.clientX - box.left - PAD) / (width - 2 * PAD)) * (high - low);
		picked = round(Math.min(high, Math.max(low, at)));
	}
</script>

<figure class="dpm-scale" aria-label="Every player's DPM today">
	<div class="scale-plot" bind:clientWidth={width}>
		{#if layout}
			<svg
				{width}
				height={PLOT + AXIS}
				viewBox="0 0 {width} {PLOT + AXIS}"
				role="img"
				aria-label="One dot per player, by DPM, {reach.count} of {reach.total} at {formatSigned(value, 1)} or better"
				onpointerdown={(event) => {
					event.currentTarget.setPointerCapture?.(event.pointerId);
					pick(event);
				}}
				onpointermove={(event) => {
					if (event.buttons || event.pointerType === 'mouse') pick(event);
				}}
			>
				{#each layout.ticks as tick (tick)}
					<line class="grid" class:zero={tick === 0} x1={x(tick)} x2={x(tick)} y1="0" y2={PLOT} />
					<text class="tick" x={x(tick)} y={PLOT + 16} text-anchor="middle">{tick > 0 ? `+${tick}` : tick}</text>
				{/each}
				{#each layout.dots as dot (dot.id)}
					<circle class:lit={dot.dpm >= value - 1e-9} cx={dot.cx} cy={dot.cy} r={layout.r} />
				{/each}
				<line class="marker" x1={x(value)} x2={x(value)} y1="0" y2={PLOT} />
			</svg>
		{/if}
	</div>

	<label class="scale-slider">
		<span>Pick a DPM</span>
		<input
			type="range"
			min={low}
			max={high}
			step="0.1"
			value={value}
			oninput={(event) => (picked = Number(event.currentTarget.value))}
		/>
		<strong>{formatSigned(value, 1)}</strong>
	</label>

	<div class="landmarks">
		{#each landmarks as mark (mark.label)}
			<button type="button" class:active={round(mark.value) === value} onclick={() => (picked = round(mark.value))}>
				{mark.label} <b>{formatSigned(mark.value, 1)}</b>
			</button>
		{/each}
	</div>

	<figcaption aria-live="polite">
		<strong>{formatSigned(value, 1)} or better:</strong>
		{reach.count} of the {reach.total} players DARKO rates today{reach.count > 0 ? `, the top ${Math.max(1, Math.round(reach.share * 100))}%` : ''}.
		{#if nearest.length}
			Nearest:
			{#each nearest as player, index (player.nba_id)}
				<a href="/player/{player.nba_id}">{player.player_name}</a> ({formatSigned(player.dpm, 1)}){index < nearest.length - 1 ? ', ' : '.'}
			{/each}
		{/if}
	</figcaption>
</figure>

<style>
	.dpm-scale {
		margin: 26px 0 30px;
		padding: 18px 18px 16px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.scale-plot {
		width: 100%;
		touch-action: pan-y;
	}

	svg {
		display: block;
		cursor: crosshair;
	}

	.grid {
		stroke: var(--border-subtle);
	}

	.grid.zero {
		stroke: var(--border);
	}

	.tick {
		fill: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	circle {
		fill: var(--text-muted);
		opacity: 0.35;
	}

	circle.lit {
		fill: var(--accent);
		opacity: 0.9;
	}

	.marker {
		stroke: var(--text);
		stroke-width: 2;
	}

	.scale-slider {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) 3.5em;
		align-items: center;
		gap: 12px;
		margin-top: 12px;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.scale-slider input {
		width: 100%;
		accent-color: var(--accent);
	}

	.scale-slider strong {
		color: var(--text);
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
		text-align: right;
	}

	.landmarks {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 12px;
	}

	.landmarks button {
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

	.landmarks button b {
		color: var(--text);
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
	}

	.landmarks button.active,
	.landmarks button:hover {
		border-color: var(--accent);
	}

	figcaption {
		margin-top: 14px;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.6;
	}

	figcaption strong {
		color: var(--text);
	}

	figcaption a {
		color: var(--accent);
	}
</style>
