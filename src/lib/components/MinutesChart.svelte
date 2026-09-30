<script>
	import { formatFixed } from '$lib/utils/csvPresets.js';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import { TEAM_MINUTES } from '$lib/utils/rosterLab.js';
	import { formatTick, minutesProfile, niceTicks, sidewaysRows } from '$lib/utils/teamDna.js';

	/**
	 * The Minutes chart: each bar's height is a player's DPM and its width their share of the
	 * roster's minutes, so the signed areas add up to the average minute (the dashed line), and
	 * five of those on the floor make the rating. Narrow containers get the chart turned
	 * sideways, each row as thick as the player's share of the minutes, so names still fit.
	 */
	let {
		// Contributions with the deep bench folded (foldDeepBench), for one roster.
		rows = [],
		// { low, high } in DPM, so two charts side by side share one scale.
		domain = null,
		color = 'var(--text-secondary)',
		height = 240,
		// Where another list already names every player (the Roster Lab's table), names the chart
		// only shortens aren't listed again; marks it can't name, and the deep bench, still are.
		listNarrow = true,
		playerHref = (id) => `/player/${id}`
	} = $props();

	const SIDEWAYS_BELOW = 520;
	const M = { top: 24, right: 12, bottom: 36, left: 40 };
	const SHARE_TICKS = [0, 0.25, 0.5, 0.75, 1];

	let width = $state(0);
	let tip = $state(null);
	let measure = null;

	const profile = $derived(minutesProfile(rows));
	const range = $derived(domain ?? { low: profile.low, high: profile.high });
	const sideways = $derived(width > 0 && width < SIDEWAYS_BELOW);
	const ticks = $derived(niceTicks(range.low, range.high, sideways ? 4 : 6));
	const padded = $derived.by(() => {
		const pad = (range.high - range.low) * 0.08 || 0.5;
		return { low: range.low < 0 ? range.low - pad : range.low, high: range.high + pad };
	});
	const plotW = $derived(Math.max(width - M.left - M.right, 1));
	const plotH = $derived(height - M.top - M.bottom);
	const layout = $derived.by(() => {
		const bars = profile.bars.map((bar) => {
			const x0 = M.left + bar.x0 * plotW;
			const span = (bar.x1 - bar.x0) * plotW;
			const gap = Math.min(2, span / 3);
			return { bar, x0, span, x: x0 + gap / 2, w: Math.max(span - gap, 0.5), zero: y(0), end: y(bar.dpm) };
		});
		const { names, mean } = placeNames(bars);
		return {
			columns: bars.map((column) => {
				const name = names.get(column.bar.id) ?? null;
				return { ...column, name, fits: name !== null };
			}),
			mean
		};
	});
	const columns = $derived(layout.columns);
	const meanLabel = $derived(layout.mean);
	const sideRows = $derived(sidewaysRows(profile.bars));
	// Marks with no name in the chart (rows too thin for one, bars with no room) are listed under
	// it, and so is the deep bench, whose players only fit there; with listNarrow, so are names
	// the chart cuts short.
	const listed = $derived(
		sideways
			? sideRows.filter((row) => row.bar.bench || !row.labeled).map((row) => row.bar)
			: columns
					.filter(
						(column) =>
							column.bar.bench ||
							!column.name ||
							(listNarrow && column.name.text !== labelFor(column.bar))
					)
					.map((column) => column.bar)
	);
	const shortfall = $derived(profile.minutes > 0 && Math.abs(profile.minutes - TEAM_MINUTES) > 1);

	function at(value) {
		return (value - padded.low) / (padded.high - padded.low);
	}

	function y(value) {
		return M.top + (1 - at(value)) * plotH;
	}

	function labelFor(bar) {
		if (bar.bench) return 'Bench';
		const parts = String(bar.name ?? '').trim().split(/\s+/);
		while (parts.length > 1 && /^(jr\.?|sr\.?|ii|iii|iv)$/i.test(parts.at(-1))) parts.pop();
		return parts.at(-1) ?? '';
	}

	/** The label's width in the chart's 11px semibold type (measured once the chart is on screen). */
	function textWidth(text) {
		if (typeof document === 'undefined') return text.length * 6.4;
		if (!measure) {
			measure = document.createElement('canvas').getContext('2d');
			const family = getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim() || 'sans-serif';
			measure.font = `600 11px ${family}`;
		}
		return measure.measureText(text).width;
	}

	/** A name, then shorter and shorter cuts of it, down to four letters and an ellipsis. */
	function nameForms(label) {
		const forms = [label];
		if (label === 'Bench') return forms;
		for (let length = label.length - 1; length >= 4; length -= 1) forms.push(`${label.slice(0, length)}…`);
		return forms;
	}

	function overlaps(a, b) {
		return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
	}

	/**
	 * Names for the bars, and where the average minute's label goes. The tallest bar is always
	 * named in full. The label takes the first clear end of the dashed line, above it or below,
	 * so on a lopsided roster it doesn't sit on that name. Then each bar gets the longest form of
	 * its name that fits over it, and the bars still unnamed, tallest first, the longest form that
	 * can spill past the bar without touching another bar or name.
	 */
	function placeNames(bars) {
		const placed = [];
		const rects = bars.map((column) => ({
			x0: column.x,
			x1: column.x + column.w,
			y0: Math.min(column.zero, column.end),
			y1: Math.max(column.zero, column.end)
		}));
		const meanWidth = textWidth(`Average minute ${formatSigned(profile.mean, 2)}`);
		const meanSpots = [
			{ x: M.left + plotW - 2, y: y(profile.mean) - 5, anchor: 'end' },
			{ x: M.left + plotW - 2, y: y(profile.mean) + 13, anchor: 'end' },
			{ x: M.left + 2, y: y(profile.mean) - 5, anchor: 'start' },
			{ x: M.left + 2, y: y(profile.mean) + 13, anchor: 'start' }
		].map((spot) => ({
			...spot,
			x0: spot.anchor === 'end' ? spot.x - meanWidth - 2 : spot.x - 2,
			x1: spot.anchor === 'end' ? spot.x + 2 : spot.x + meanWidth + 2,
			y0: spot.y - 10,
			y1: spot.y + 3
		}));
		const names = new Map();
		const box = (column, text) => {
			const half = textWidth(text) / 2;
			const middle = Math.min(Math.max(column.x + column.w / 2, M.left + half), M.left + plotW - half);
			const baseline = column.bar.dpm >= 0 ? column.end - 5 : column.end + 13;
			return { text, x: middle, y: baseline, x0: middle - half - 2, x1: middle + half + 2, y0: baseline - 10, y1: baseline + 3 };
		};
		const clear = (candidate, own) =>
			placed.every((other) => !overlaps(candidate, other)) &&
			rects.every((rect, index) => index === own || !overlaps(candidate, rect));
		const place = (index, candidate) => {
			placed.push(candidate);
			names.set(bars[index].bar.id, candidate);
		};
		const order = bars
			.map((column, index) => index)
			.sort((a, b) => Math.abs(bars[b].bar.dpm) - Math.abs(bars[a].bar.dpm));
		if (order.length) place(order[0], box(bars[order[0]], labelFor(bars[order[0]].bar)));
		const mean =
			meanSpots.find(
				(spot) =>
					spot.y0 > M.top &&
					spot.y1 < M.top + plotH &&
					placed.every((other) => !overlaps(spot, other)) &&
					rects.every((rect) => !overlaps(spot, rect))
			) ?? meanSpots[0];
		placed.push(mean);
		for (const index of order) {
			if (names.has(bars[index].bar.id)) continue;
			for (const text of nameForms(labelFor(bars[index].bar))) {
				const candidate = box(bars[index], text);
				if (candidate.x1 - candidate.x0 <= bars[index].w && clear(candidate, index)) {
					place(index, candidate);
					break;
				}
			}
		}
		for (const index of order) {
			if (names.has(bars[index].bar.id)) continue;
			for (const text of nameForms(labelFor(bars[index].bar))) {
				const candidate = box(bars[index], text);
				if (clear(candidate, index)) {
					place(index, candidate);
					break;
				}
			}
		}
		return { names, mean };
	}

	/** A bar from the zero line to its value, rounded only at the data end. */
	function barPath({ x, w, zero, end }) {
		const r = Math.min(3, w / 2, Math.abs(end - zero));
		const dir = end <= zero ? 1 : -1;
		return `M${x},${zero}V${end + dir * r}Q${x},${end} ${x + r},${end}H${x + w - r}Q${x + w},${end} ${x + w},${end + dir * r}V${zero}Z`;
	}

	function describe(bar) {
		const share = Math.round(bar.share * 100);
		if (bar.bench) {
			const names = bar.players.map((player) => player.name).join(', ');
			return `Deep bench (${names}): ${formatFixed(bar.minutes, 1)} minutes, ${share}% of the team's, ${formatSigned(bar.dpm, 2)} DPM, ${formatSigned(bar.total, 2)} to the rating`;
		}
		return `${bar.name}: ${formatFixed(bar.minutes, 1)} minutes, ${share}% of the team's, ${formatSigned(bar.dpm, 2)} DPM, ${formatSigned(bar.total, 2)} to the rating`;
	}

	function tipLines(bar) {
		const lines = [{ text: bar.bench ? `Deep bench: ${bar.players.length} players` : bar.name, head: true }];
		if (bar.bench) {
			for (const player of bar.players) {
				lines.push({ text: `${player.name}: ${formatFixed(player.minutes, 1)} min, ${formatSigned(player.dpm, 1)} DPM`, muted: true });
			}
		}
		lines.push(
			{ text: `${formatSigned(bar.dpm, 2)} DPM over ${formatFixed(bar.minutes, 1)} min (${Math.round(bar.share * 100)}%)` },
			{ text: `Offense ${formatSigned(bar.oDpm, 2)}, defense ${formatSigned(bar.dDpm, 2)}`, muted: true },
			{ text: `Adds ${formatSigned(bar.total, 2)} to the rating`, muted: true }
		);
		return lines;
	}

	function place(container, x, top, lines) {
		const box = container.getBoundingClientRect();
		const half = Math.min(120, box.width / 2);
		tip = { x: Math.min(Math.max(x - box.left, half), box.width - half), y: top - box.top, lines };
	}

	function tipAtPointer(event, bar) {
		place(event.currentTarget.closest('.mc'), event.clientX, event.clientY, tipLines(bar));
	}

	function tipAtTarget(event, bar) {
		const target = event.currentTarget.getBoundingClientRect();
		place(event.currentTarget.closest('.mc'), target.left + target.width / 2, target.top + 8, tipLines(bar));
	}

	function hideTip() {
		tip = null;
	}

	// The deep bench has no page of its own: tapping it, or Enter or Space on it, shows its players.
	function benchKey(event, bar) {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		tipAtTarget(event, bar);
	}
</script>

<div class="mc" style:--mc-bar={color} bind:clientWidth={width}>
	{#if width > 0 && profile.bars.length > 0}
		{#if sideways}
			<div class="mc-side">
				<ol class="mc-rows">
					{#each sideRows as { bar, thick, labeled } (bar.id)}
						{@const left = at(Math.min(0, bar.dpm)) * 100}
						{@const right = at(Math.max(0, bar.dpm)) * 100}
						<li style:height="{thick}px">
							<svelte:element
								this={bar.bench ? 'button' : 'a'}
								class="mc-row"
								href={bar.bench ? undefined : playerHref(bar.id)}
								type={bar.bench ? 'button' : undefined}
								role={bar.bench ? 'button' : undefined}
								aria-label={describe(bar)}
								onpointermove={(event) => tipAtPointer(event, bar)}
								onpointerleave={hideTip}
								onfocus={(event) => tipAtTarget(event, bar)}
								onblur={hideTip}
								onclick={bar.bench ? (event) => tipAtTarget(event, bar) : undefined}
							>
								<span class="mc-row-name" aria-hidden="true">{labeled ? labelFor(bar) : ''}</span>
								<span class="mc-row-track" aria-hidden="true">
									<span class="mc-row-zero" style:left="{at(0) * 100}%"></span>
									<span class="mc-row-mean" style:left="{at(profile.mean) * 100}%"></span>
									<span class="mc-row-bar" class:negative={bar.dpm < 0} style:left="{left}%" style:width="{right - left}%"></span>
								</span>
								<span class="mc-row-value" aria-hidden="true">{labeled ? formatSigned(bar.dpm, 1) : ''}</span>
							</svelte:element>
						</li>
					{/each}
				</ol>
				<div class="mc-side-axis" aria-hidden="true">
					<span></span>
					<span class="mc-side-ticks">
						{#each ticks as tick (tick)}
							<span style:left="{at(tick) * 100}%">{formatTick(tick)}</span>
						{/each}
					</span>
					<span>DPM</span>
				</div>
			</div>
		{:else}
			<svg class="mc-svg" {width} {height} viewBox="0 0 {width} {height}">
				{#each ticks as tick (tick)}
					<line class="mc-grid" class:zero={tick === 0} x1={M.left} x2={M.left + plotW} y1={y(tick)} y2={y(tick)} />
					<text class="mc-text mc-num" x={M.left - 6} y={y(tick) + 4} text-anchor="end">{formatTick(tick)}</text>
				{/each}
				<text class="mc-text" x={M.left - 6} y={M.top - 10} text-anchor="end">DPM</text>
				{#each columns as column (column.bar.id)}
					<svelte:element
						this={column.bar.bench ? 'g' : 'a'}
						class="mc-link"
						href={column.bar.bench ? undefined : playerHref(column.bar.id)}
						aria-label={describe(column.bar)}
						role={column.bar.bench ? 'button' : undefined}
						tabindex={column.bar.bench ? 0 : undefined}
						onpointermove={(event) => tipAtPointer(event, column.bar)}
						onpointerleave={hideTip}
						onfocus={(event) => tipAtTarget(event, column.bar)}
						onblur={hideTip}
						onclick={column.bar.bench ? (event) => tipAtTarget(event, column.bar) : undefined}
						onkeydown={column.bar.bench ? (event) => benchKey(event, column.bar) : undefined}
					>
						<rect class="mc-hit" x={column.x0} y={M.top} width={Math.max(column.span, 1)} height={plotH} />
						<path class="mc-bar" class:negative={column.bar.dpm < 0} d={barPath(column)} />
					</svelte:element>
				{/each}
				<line class="mc-zero" x1={M.left} x2={M.left + plotW} y1={y(0)} y2={y(0)} />
				<line class="mc-mean" x1={M.left} x2={M.left + plotW} y1={y(profile.mean)} y2={y(profile.mean)} />
				<!-- Names go on top of the lines, each with a halo so the dashed line passes behind it. -->
				{#each columns as column (column.bar.id)}
					{#if column.name}
						<text
							class="mc-text mc-label"
							x={column.name.x}
							y={column.name.y}
							text-anchor="middle"
							aria-hidden="true"
						>{column.name.text}</text>
					{/if}
				{/each}
				<text class="mc-text mc-mean-label" x={meanLabel.x} y={meanLabel.y} text-anchor={meanLabel.anchor}>
					Average minute {formatSigned(profile.mean, 2)}
				</text>
				{#each SHARE_TICKS as share, index (share)}
					<text
						class="mc-text mc-num"
						x={M.left + share * plotW}
						y={M.top + plotH + 15}
						text-anchor={index === 0 ? 'start' : index === SHARE_TICKS.length - 1 ? 'end' : 'middle'}
					>{Math.round(share * 100)}%</text>
				{/each}
				<text class="mc-text" x={M.left + plotW / 2} y={M.top + plotH + 30} text-anchor="middle">Share of the team's minutes</text>
			</svg>
		{/if}

		{#if listed.length}
			<div class="mc-others">
				<span class="mc-others-head">Also in the chart:</span>
				{#each listed as bar, index (bar.id)}
					{#if index > 0}<span aria-hidden="true">{' · '}</span>{/if}
					{#if bar.bench}
						<details class="mc-other mc-bench">
							<summary>
								Deep bench, {bar.players.length} players
								<span class="mc-other-num">{formatFixed(bar.minutes, 1)} min, {formatSigned(bar.dpm, 1)}</span>
							</summary>
							{#each bar.players as player, playerIndex (player.id)}
								{#if playerIndex > 0}<span aria-hidden="true">{', '}</span>{/if}
								<span class="mc-bench-player">
									<a href={playerHref(player.id)}>{player.name}</a>
									<span class="mc-other-num">{formatFixed(player.minutes, 1)} min, {formatSigned(player.dpm, 1)}</span>
								</span>
							{/each}
						</details>
					{:else}
						<span class="mc-other">
							<a href={playerHref(bar.id)}>{bar.name}</a>
							<span class="mc-other-num">{formatFixed(bar.minutes, 1)} min, {formatSigned(bar.dpm, 1)}</span>
						</span>
					{/if}
				{/each}
			</div>
		{/if}

		<p class="mc-legend">
			{sideways ? "A bar's length is DPM and its thickness the share of minutes" : "A bar's height is DPM and its width the share of minutes"},
			so the signed areas add up to the average minute, the dashed line at {formatSigned(profile.mean, 2)}.
			Five players are on the floor, so the rating is five times that: {formatSigned(profile.rating, 2)}.
		</p>
		{#if shortfall}
			<p class="mc-legend">
				{Math.round(profile.minutes)} of {TEAM_MINUTES} minutes: {sideways ? 'thicknesses' : 'widths'} are shares, and the rating counts them as a full {TEAM_MINUTES}.
			</p>
		{/if}

		{#if tip}
			<div class="chart-tooltip mc-tip" style:left="{tip.x}px" style:top="{tip.y}px">
				{#each tip.lines as line, index (index)}
					<span class:mc-tip-head={line.head} class:mc-tip-muted={line.muted}>{line.text}</span>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.mc {
		position: relative;
		min-width: 0;
	}

	/* The shiny view puts charts on its panel colour, so the label halos follow. */
	:global(:root[data-view='shiny']) .mc {
		--mc-halo: var(--shiny-panel-bg);
	}

	.mc-svg {
		display: block;
		overflow: visible;
	}

	.mc-grid {
		stroke: var(--border-subtle);
		stroke-width: 1;
	}

	.mc-zero {
		stroke: var(--graphic-muted);
		stroke-width: 1;
	}

	.mc-mean {
		stroke: var(--text);
		stroke-width: 1.5;
		stroke-dasharray: 5 4;
	}

	.mc-text {
		fill: var(--text-muted);
		font-family: var(--font-sans);
		font-size: 11px;
	}

	.mc-num {
		font-family: var(--font-mono);
	}

	/* A halo in the background colour keeps names and the mean's label readable over lines. */
	.mc-label,
	.mc-mean-label {
		font-weight: 600;
		pointer-events: none;
		paint-order: stroke;
		stroke: var(--mc-halo, var(--bg));
		stroke-width: 4px;
		stroke-linejoin: round;
	}

	.mc-label {
		fill: var(--text-secondary);
	}

	.mc-mean-label {
		fill: var(--text);
	}

	.mc-hit {
		fill: transparent;
	}

	.mc-link {
		outline: none;
	}

	.mc-link:hover .mc-hit,
	.mc-link:focus-visible .mc-hit {
		fill: var(--bg-hover);
	}

	.mc-link:focus-visible .mc-bar {
		stroke: var(--accent);
		stroke-width: 2;
	}

	.mc-bar {
		fill: var(--mc-bar);
	}

	.mc-bar.negative,
	.mc-row-bar.negative {
		opacity: 0.6;
	}

	.mc-rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.mc-row,
	.mc-side-axis {
		display: grid;
		grid-template-columns: 84px minmax(0, 1fr) 40px;
		gap: 8px;
		align-items: center;
	}

	.mc-row {
		height: 100%;
		color: var(--text);
		text-decoration: none;
	}

	/* The deep bench is a button that shows its players; it looks like the other rows. */
	button.mc-row {
		width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	a.mc-row:hover,
	a.mc-row:focus-visible,
	button.mc-row:hover,
	button.mc-row:focus-visible {
		background: var(--bg-hover);
	}

	.mc-row-name,
	.mc-row-value {
		overflow: hidden;
		font-size: 11px;
		line-height: 1;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.mc-row-name {
		font-weight: 600;
	}

	.mc-row-value {
		font-family: var(--font-mono);
		text-align: right;
		color: var(--text-secondary);
	}

	.mc-row-track {
		position: relative;
		height: 100%;
	}

	.mc-row-bar {
		position: absolute;
		top: 0;
		bottom: 0;
		min-width: 1px;
		background: var(--mc-bar);
		border-radius: 2px;
	}

	.mc-row-zero {
		position: absolute;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--graphic-muted);
	}

	.mc-row-mean {
		position: absolute;
		top: -2px;
		bottom: -2px;
		border-left: 1.5px dashed var(--text);
		z-index: 1;
	}

	.mc-side-axis {
		margin-top: 6px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.mc-side-ticks {
		position: relative;
		height: 14px;
	}

	.mc-side-ticks span {
		position: absolute;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		white-space: nowrap;
	}

	.mc-others,
	.mc-legend {
		margin: 8px 0 0;
		font-size: 12px;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.mc-others-head {
		font-weight: 700;
		color: var(--text-muted);
	}

	.mc-other a {
		color: var(--text);
	}

	.mc-bench {
		display: inline;
	}

	.mc-bench summary {
		display: inline;
		cursor: pointer;
	}

	.mc-bench summary::after {
		content: ' ▸';
		color: var(--text-muted);
	}

	.mc-bench[open] summary::after {
		content: ' ▾';
	}

	.mc-bench[open] summary {
		margin-right: 4px;
	}

	.mc-other-num {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.mc-tip {
		z-index: 5;
		align-items: flex-start;
		font-size: 12px;
	}

	.mc-tip-head {
		font-weight: 700;
	}

	.mc-tip-muted {
		color: var(--text-secondary);
	}
</style>
