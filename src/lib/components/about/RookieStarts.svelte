<script>
	// Where DARKO starts a draft class: each player's rating going into his first game, against
	// where he was picked. Before a player has played, his rating comes from his age, draft slot
	// and height; the dots show how much those alone say.
	import { goto } from '$app/navigation';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
	import { formatSigned } from '$lib/utils/seismograph.js';

	/** initial: { year, players }; the draft classes run from firstYear to initial.year. */
	let { initial = null, firstYear = 1996 } = $props();

	const PAD = { top: 12, right: 14, bottom: 34, left: 40 };
	const HEIGHT = 280;
	const UNDRAFTED = 64;

	let loaded = $state(null);
	let loading = $state(false);
	let hoveredId = $state(null);
	let width = $state(0);
	const requests = createRequestSequencer();

	const view = $derived(loaded ?? initial);
	const years = $derived(
		initial?.year ? Array.from({ length: initial.year - firstYear + 1 }, (_, index) => initial.year - index) : []
	);
	const dots = $derived(
		(view?.players ?? [])
			.filter((player) => Number.isFinite(player?.dpm))
			.map((player) => ({ ...player, slot: player.draft_slot ?? UNDRAFTED }))
	);
	const yDomain = $derived.by(() => {
		const values = dots.map((dot) => dot.dpm);
		const low = Math.floor(Math.min(-3, ...values));
		const high = Math.ceil(Math.max(1, ...values));
		return [low, high];
	});
	const plotWidth = $derived(Math.max(0, width - PAD.left - PAD.right));
	const plotHeight = HEIGHT - PAD.top - PAD.bottom;
	const x = (slot) => PAD.left + ((slot - 0.5) / (UNDRAFTED + 1.5)) * plotWidth;
	const y = (value) => PAD.top + ((yDomain[1] - value) / (yDomain[1] - yDomain[0] || 1)) * plotHeight;
	const yTicks = $derived(
		Array.from({ length: yDomain[1] - yDomain[0] + 1 }, (_, index) => yDomain[0] + index)
	);
	const hovered = $derived(dots.find((dot) => dot.nba_id === hoveredId) ?? null);
	const firstPick = $derived(dots.find((dot) => dot.draft_slot === 1) ?? null);
	const highest = $derived(dots.reduce((best, dot) => (!best || dot.dpm > best.dpm ? dot : best), null));

	async function showYear(year) {
		const ticket = requests.next();
		loading = true;
		hoveredId = null;
		try {
			const response = await fetch(`/api/about/rookies?year=${year}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const payload = await response.json();
			if (requests.isCurrent(ticket)) loaded = { year, players: payload.players ?? [] };
		} catch {
			if (requests.isCurrent(ticket)) loaded = { year, players: [] };
		} finally {
			if (requests.isCurrent(ticket)) loading = false;
		}
	}

	// A click on a dot opens his page; on touch, the first tap names him and the second opens.
	function open(event) {
		const dot = nearest(event);
		if (!dot) return;
		if (dot.nba_id === hoveredId) goto(`/player/${dot.nba_id}`);
		else hoveredId = dot.nba_id;
	}

	function pick(dot) {
		return dot.draft_slot ? `No. ${dot.draft_slot} pick` : 'Undrafted';
	}

	function nearest(event) {
		const box = event.currentTarget.getBoundingClientRect();
		const px = event.clientX - box.left;
		const py = event.clientY - box.top;
		let best = null;
		let bestDistance = 18 * 18;
		for (const dot of dots) {
			const distance = (x(dot.slot) - px) ** 2 + (y(dot.dpm) - py) ** 2;
			if (distance < bestDistance) {
				best = dot;
				bestDistance = distance;
			}
		}
		return best;
	}
</script>

<figure class="rookies">
	<div class="rookies-head">
		<label>
			<span>Draft class</span>
			<select value={view?.year} disabled={loading} onchange={(event) => showYear(Number(event.currentTarget.value))}>
				{#each years as year (year)}
					<option value={year}>{year}</option>
				{/each}
			</select>
		</label>
		{#if firstPick || highest}
			<p aria-live="polite">
				{#if firstPick}The No. 1 pick, {firstPick.player_name}, started at {formatSigned(firstPick.dpm, 1)}.{/if}
				{#if highest && highest !== firstPick}
					The highest start: {highest.player_name}, {formatSigned(highest.dpm, 1)} ({pick(highest).toLowerCase()}).
				{/if}
			</p>
		{/if}
	</div>

	<div class="rookies-plot" class:loading bind:clientWidth={width}>
		{#if width > 0 && dots.length}
			<!-- The dots answer the pointer; the list under the chart is the keyboard's way in. -->
			<div
				class="rookies-surface"
				role="presentation"
				onpointermove={(event) => {
					if (event.pointerType === 'mouse') hoveredId = nearest(event)?.nba_id ?? null;
				}}
				onpointerleave={(event) => {
					if (event.pointerType === 'mouse') hoveredId = null;
				}}
				onclick={open}
			>
			<svg
				{width}
				height={HEIGHT}
				viewBox="0 0 {width} {HEIGHT}"
				role="img"
				aria-label="Rating going into the first game against draft slot, {view.year} draft class"
			>
				{#each yTicks as tick (tick)}
					<line class="grid" class:zero={tick === 0} x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
					<text class="tick" x={PAD.left - 8} y={y(tick) + 4} text-anchor="end">{tick > 0 ? `+${tick}` : tick}</text>
				{/each}
				{#each plotWidth >= 420 ? [1, 10, 20, 30, 40, 50, 60] : [1, 10, 20, 30, 40, 50] as slot (slot)}
					<text class="tick" x={x(slot)} y={HEIGHT - 14} text-anchor="middle">{slot}</text>
				{/each}
				<text class="tick" x={x(UNDRAFTED)} y={HEIGHT - 14} text-anchor="middle">UDFA</text>
				<text class="axis-label" x={PAD.left + plotWidth / 2} y={HEIGHT - 1} text-anchor="middle">Draft slot</text>
				{#each dots as dot (dot.nba_id)}
					<circle class:hovered={dot.nba_id === hoveredId} cx={x(dot.slot)} cy={y(dot.dpm)} r={dot.nba_id === hoveredId ? 6.5 : 5} />
				{/each}
			</svg>
			</div>
			{#if hovered}
				<div
					class="rookies-tip"
					style:left="{Math.min(Math.max(x(hovered.slot), 90), width - 90)}px"
					style:top="{Math.max(y(hovered.dpm) - 12, 0)}px"
				>
					<b>{hovered.player_name}</b>
					<span>{pick(hovered)}{Number.isFinite(hovered.age) ? `, ${hovered.age.toFixed(1)} at his first game` : ''}</span>
					<strong>{formatSigned(hovered.dpm, 2)}</strong>
				</div>
			{/if}
		{:else if !loading}
			<p class="rookies-empty">No players from that class have played yet.</p>
		{/if}
	</div>

	{#if dots.length}
		<details class="rookies-list">
			<summary>The {view.year} class as a list</summary>
			<ol>
				{#each dots as dot (dot.nba_id)}
					<li>
						<a href="/player/{dot.nba_id}">{dot.player_name}</a>
						<span>{pick(dot)}</span>
						<b>{formatSigned(dot.dpm, 1)}</b>
					</li>
				{/each}
			</ol>
		</details>
	{/if}

	<figcaption>
		Each dot is a player's rating going into his first NBA game. Hover or tap a dot for his name;
		click it, or tap it again, for his page. UDFA: undrafted.
	</figcaption>
</figure>

<style>
	.rookies {
		margin: 24px 0 30px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.rookies-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 18px;
		margin-bottom: 10px;
	}

	.rookies-head label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.rookies-head select {
		min-height: 34px;
		padding: 0 8px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		font: inherit;
	}

	.rookies-head p {
		flex: 1 1 280px;
		margin: 0;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.rookies-plot {
		position: relative;
		min-height: 120px;
		touch-action: pan-y;
		transition: opacity 0.15s ease;
	}

	.rookies-plot.loading {
		opacity: 0.45;
	}

	.rookies-surface {
		cursor: pointer;
	}

	svg {
		display: block;
	}

	.rookies-list {
		margin-top: 10px;
		font-size: 13px;
	}

	.rookies-list summary {
		color: var(--text-secondary);
		font-weight: 700;
		cursor: pointer;
	}

	.rookies-list ol {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
		gap: 2px 18px;
		margin: 8px 0 0;
		padding: 0;
		list-style: none;
	}

	.rookies-list li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		gap: 8px;
		padding: 4px 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.rookies-list a {
		overflow: hidden;
		color: var(--text);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rookies-list span {
		color: var(--text-muted);
	}

	.rookies-list b {
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
	}

	.grid {
		stroke: var(--border-subtle);
	}

	.grid.zero {
		stroke: var(--border);
	}

	.tick,
	.axis-label {
		fill: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.axis-label {
		font-family: var(--font-sans);
		font-weight: 700;
	}

	circle {
		fill: var(--accent);
		fill-opacity: 0.7;
		stroke: var(--bg-surface);
		stroke-width: 1.5;
	}

	circle.hovered {
		fill-opacity: 1;
		stroke: var(--text);
	}

	.rookies-tip {
		position: absolute;
		z-index: 2;
		display: grid;
		gap: 2px;
		min-width: 150px;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		box-shadow: 0 10px 24px -12px color-mix(in srgb, #000 45%, transparent);
		font-size: 12px;
		transform: translate(-50%, -100%);
		pointer-events: none;
	}

	.rookies-tip b {
		color: var(--text);
		font-weight: 800;
	}

	.rookies-tip span {
		color: var(--text-muted);
	}

	.rookies-tip strong {
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
	}

	.rookies-empty {
		color: var(--text-muted);
		font-size: 14px;
	}

	figcaption {
		margin-top: 8px;
		color: var(--text-muted);
		font-size: 13px;
	}
</style>
