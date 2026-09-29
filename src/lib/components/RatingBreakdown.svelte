<script>
	import MinutesChart from './MinutesChart.svelte';
	import OffenseDefenseGlyph from './OffenseDefenseGlyph.svelte';
	import { formatFixed } from '$lib/utils/csvPresets.js';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import {
		DEEP_BENCH_MINUTES,
		contributionExtent,
		contributionSummary,
		foldDeepBench,
		formatTick,
		minutesProfile,
		niceTicks,
		ratingWaterfall,
		sortContributions
	} from '$lib/utils/teamDna.js';

	/**
	 * Where a team's rating comes from, three ways: each player's offense, defense and net
	 * contribution (Players), the net added up one player at a time (Build-up), and DPM against
	 * minutes (Minutes). `rows` is every player's contribution, before any folding.
	 */
	let { rows = [], teamName = '' } = $props();

	const VIEWS = [
		{ key: 'players', label: 'Players' },
		{ key: 'buildup', label: 'Build-up' },
		{ key: 'minutes', label: 'Minutes' }
	];
	const COLUMNS = [
		{ key: 'offense', label: 'Offense', side: 'offense' },
		{ key: 'defense', label: 'Defense', side: 'defense' },
		{ key: 'total', label: 'Net', side: null }
	];

	let view = $state('players');
	let sortKey = $state('total');
	let benchOpen = $state(false);
	let tip = $state(null);

	const folded = $derived(foldDeepBench(rows));
	const bench = $derived(folded.find((row) => row.bench) ?? null);
	const summary = $derived(contributionSummary(rows));
	const teamMinutes = $derived(rows.reduce((total, row) => total + row.minutes, 0));
	const totals = $derived({
		offense: rows.reduce((total, row) => total + row.offense, 0),
		defense: rows.reduce((total, row) => total + row.defense, 0),
		total: summary.total
	});
	const columnScale = $derived(scaleFor(contributionExtent(folded), 3));
	const sorted = $derived(sortContributions(folded, sortKey));
	const waterfall = $derived(ratingWaterfall(folded, 'total'));
	const stepScale = $derived(scaleFor(waterfall, 5));
	const profile = $derived(minutesProfile(folded));

	/** Percent positions over [low, high], with a little room at each end, and round ticks. */
	function scaleFor({ low, high }, count) {
		const pad = (high - low) * 0.04 || 0.5;
		const min = low - pad;
		const max = high + pad;
		return { ticks: niceTicks(low, high, count), at: (value) => ((value - min) / (max - min)) * 100 };
	}

	function splitSentence() {
		if (summary.belowCount === 0) return 'Every player in the projected rotation is above average.';
		if (summary.aboveCount === 0) return 'Every player in the projected rotation is below average.';
		return `Players above average add ${formatSigned(summary.above, 2)}; the ones below take away ${formatFixed(-summary.below, 2)}.`;
	}

	function buildupSentence() {
		if (waterfall.peak !== null) {
			return `The running total peaks at ${formatSigned(waterfall.peak, 2)}, then gives back ${formatFixed(waterfall.peak - waterfall.total, 2)}; hatched bars take points away.`;
		}
		if (waterfall.steps.every((step) => step.value < 0)) return 'Every step takes points away, so every bar is hatched.';
		return waterfall.steps.some((step) => step.value < 0)
			? 'Hatched bars take points away.'
			: 'Every step adds points.';
	}

	function minutesOf(row) {
		return `${formatFixed(row.minutes, 1)} min`;
	}

	function playerTip(row) {
		const lines = [{ text: row.bench ? `Deep bench: ${row.players.length} players under ${DEEP_BENCH_MINUTES} minutes` : row.name, head: true }];
		if (row.bench) {
			for (const player of row.players) {
				lines.push({ text: `${player.name}: ${formatFixed(player.minutes, 1)} min, ${formatSigned(player.dpm, 1)} DPM`, muted: true });
			}
		}
		lines.push(
			{ text: `${formatSigned(row.total, 2)} per 100 possessions for the team` },
			{ text: `Offense ${formatSigned(row.offense, 2)}, defense ${formatSigned(row.defense, 2)}`, muted: true },
			{
				text: `${formatSigned(row.dpm, 2)} DPM over ${formatFixed(row.minutes, 1)} of ${formatFixed(teamMinutes, 0)} minutes`,
				muted: true
			}
		);
		return lines;
	}

	function stepTip(step) {
		return [...playerTip(step), { text: `Running total ${formatSigned(step.end, 2)}`, muted: true }];
	}

	// One tooltip, above the pointer (or the focused row), kept inside the chart.
	function place(chart, x, y, lines) {
		const box = chart.getBoundingClientRect();
		const half = Math.min(120, box.width / 2);
		tip = {
			chart: chart.dataset.chart,
			x: Math.min(Math.max(x - box.left, half), box.width - half),
			y: y - box.top,
			lines
		};
	}

	function tipAtPointer(event, lines) {
		place(event.currentTarget.closest('[data-chart]'), event.clientX, event.clientY, lines);
	}

	function tipAtRow(event, lines) {
		const row = event.currentTarget.getBoundingClientRect();
		place(event.currentTarget.closest('[data-chart]'), row.left + row.width / 2, row.top, lines);
	}

	function hideTip() {
		tip = null;
	}
</script>

{#snippet tipBox()}
	<div class="chart-tooltip rb-tip" style:left="{tip.x}px" style:top="{tip.y}px">
		{#each tip.lines as line, index (index)}
			<span class:rb-tip-head={line.head} class:rb-tip-muted={line.muted}>{line.text}</span>
		{/each}
	</div>
{/snippet}

{#snippet who(row)}
	<span class="rb-who">
		<span class="rb-name">
			{#if row.bench}
				Deep bench <span class="rb-bench-mark" aria-hidden="true">{benchOpen ? '▾' : '▸'}</span>
			{:else}
				{row.name}
			{/if}
		</span>
		<span class="rb-meta">
			{#if row.bench}
				{row.players.length} players · {minutesOf(row)}
			{:else}
				{minutesOf(row)} · {formatSigned(row.dpm, 1)} DPM
			{/if}
		</span>
	</span>
{/snippet}

{#snippet playerCells(row)}
	{@render who(row)}
	{#each COLUMNS as column (column.key)}
		{@const value = row[column.key]}
		<span class="rb-cell">
			<span class="rb-track" aria-hidden="true">
				{#each columnScale.ticks as tick (tick)}
					<span class="rb-grid" class:rb-zero={tick === 0} style:left="{columnScale.at(tick)}%"></span>
				{/each}
				<span
					class="rb-bar rb-bar--{column.key}"
					style:left="{columnScale.at(Math.min(0, value))}%"
					style:width="{Math.abs(columnScale.at(value) - columnScale.at(0))}%"
				></span>
			</span>
			<span class="rb-value rb-value--{column.key}"><span class="sr-only">{column.label} </span>{formatSigned(value, 2)}</span>
		</span>
	{/each}
{/snippet}

{#snippet stepCells(step, index)}
	{@render who(step)}
	<span class="wf-track" aria-hidden="true">
		{#each stepScale.ticks as tick (tick)}
			<span class="wf-grid" class:wf-zero={tick === 0} style:left="{stepScale.at(tick)}%"></span>
		{/each}
		{#if waterfall.peak !== null}
			<span class="wf-peak" style:left="{stepScale.at(waterfall.peak)}%"></span>
		{/if}
		{#if index > 0}
			<span class="wf-link" style:left="{stepScale.at(step.start)}%"></span>
		{/if}
		<span
			class="wf-bar"
			class:negative={step.value < 0}
			style:left="{stepScale.at(Math.min(step.start, step.end))}%"
			style:width="{Math.abs(stepScale.at(step.end) - stepScale.at(step.start))}%"
		></span>
	</span>
	<span class="wf-value">{formatSigned(step.value, 2)}</span>
	<span class="sr-only">per 100 possessions; running total {formatSigned(step.end, 2)}</span>
{/snippet}

{#snippet benchList()}
	{#if bench && benchOpen}
		<ul class="rb-bench-list" id="rb-bench-players">
			{#each bench.players as player (player.id)}
				<li>
					<a href="/player/{player.id}">{player.name}</a>
					<span>{formatFixed(player.minutes, 1)} min · {formatSigned(player.dpm, 1)} DPM</span>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}

<p class="rb-note">
	{#if view === 'players'}
		Each player's DPM times their share of DARKO's projected minutes, split into offense and defense
		(points per 100 possessions; 0 is an average player). The columns add up to the team's numbers
		at the bottom, and offense plus defense is net. {splitSentence()}
	{:else if view === 'buildup'}
		The net column added up one player at a time: each bar starts where the one above ends, so the
		last reaches the team's {formatSigned(waterfall.total, 2)}. {buildupSentence()}
	{:else}
		How good each player is against how much they play: DPM one way and share of DARKO's projected
		minutes the other, so a bar's area is what the player adds and the bars together make the team's
		{formatSigned(profile.rating, 2)}.
	{/if}
</p>

<div class="rb-switch" role="group" aria-label="Chart shown">
	{#each VIEWS as option (option.key)}
		<button
			type="button"
			class:active={view === option.key}
			aria-pressed={view === option.key}
			onclick={() => {
				view = option.key;
				tip = null;
			}}
		>
			{option.label}
		</button>
	{/each}
</div>

{#if view === 'players'}
	<div class="rb-chart rb-players" data-chart="players">
		<div class="rb-row rb-row--head" role="group" aria-label="Sort players by">
			<span class="rb-who rb-head-label" aria-hidden="true">Player</span>
			{#each COLUMNS as column (column.key)}
				<span class="rb-cell rb-cell--head">
					<button
						type="button"
						class="rb-sort"
						class:active={sortKey === column.key}
						aria-pressed={sortKey === column.key}
						onclick={() => (sortKey = column.key)}
					>
						{#if column.side}<OffenseDefenseGlyph side={column.side} />{/if}
						{column.label}
						<span class="rb-sort-mark" aria-hidden="true">▾</span>
					</button>
					<span class="rb-track rb-track--ticks" aria-hidden="true">
						{#each columnScale.ticks as tick (tick)}
							<span class="rb-tick" style:left="{columnScale.at(tick)}%">{formatTick(tick)}</span>
						{/each}
					</span>
				</span>
			{/each}
		</div>
		<ol class="rb-list">
			{#each sorted as row (row.id)}
				<li>
					{#if row.bench}
						<button
							type="button"
							class="rb-row"
							aria-expanded={benchOpen}
							aria-controls="rb-bench-players"
							onclick={() => (benchOpen = !benchOpen)}
							onpointermove={(event) => tipAtPointer(event, playerTip(row))}
							onpointerleave={hideTip}
							onfocus={(event) => tipAtRow(event, playerTip(row))}
							onblur={hideTip}
						>
							{@render playerCells(row)}
						</button>
						{@render benchList()}
					{:else}
						<a
							class="rb-row"
							href="/player/{row.id}"
							onpointermove={(event) => tipAtPointer(event, playerTip(row))}
							onpointerleave={hideTip}
							onfocus={(event) => tipAtRow(event, playerTip(row))}
							onblur={hideTip}
						>
							{@render playerCells(row)}
						</a>
					{/if}
				</li>
			{/each}
		</ol>
		<div class="rb-row rb-row--total">
			<span class="rb-who">
				<span class="rb-name">{teamName || 'Team'}</span>
				<span class="rb-meta">Team total</span>
			</span>
			{#each COLUMNS as column (column.key)}
				<span class="rb-cell">
					<span class="rb-track" aria-hidden="true"></span>
					<span class="rb-value rb-value--{column.key}"><span class="sr-only">{column.label} </span>{formatSigned(totals[column.key], 2)}</span>
				</span>
			{/each}
		</div>
		{#if tip?.chart === 'players'}{@render tipBox()}{/if}
	</div>
{:else if view === 'buildup'}
	<div class="rb-chart wf" data-chart="buildup">
		{#if waterfall.peak !== null}
			{@const peakAt = stepScale.at(waterfall.peak)}
			<div class="wf-axis wf-axis--top" aria-hidden="true">
				<span class="wf-axis-who"></span>
				<span class="wf-axis-track">
					<span class="wf-peak-label" class:end={peakAt > 75} style:left="{peakAt}%">Peak {formatSigned(waterfall.peak, 2)}</span>
				</span>
				<span></span>
			</div>
		{/if}
		<ol class="wf-list">
			{#each waterfall.steps as step, index (step.id)}
				<li>
					{#if step.bench}
						<button
							type="button"
							class="wf-row"
							aria-expanded={benchOpen}
							aria-controls="rb-bench-players"
							onclick={() => (benchOpen = !benchOpen)}
							onpointermove={(event) => tipAtPointer(event, stepTip(step))}
							onpointerleave={hideTip}
							onfocus={(event) => tipAtRow(event, stepTip(step))}
							onblur={hideTip}
						>
							{@render stepCells(step, index)}
						</button>
						{@render benchList()}
					{:else}
						<a
							class="wf-row"
							href="/player/{step.id}"
							onpointermove={(event) => tipAtPointer(event, stepTip(step))}
							onpointerleave={hideTip}
							onfocus={(event) => tipAtRow(event, stepTip(step))}
							onblur={hideTip}
						>
							{@render stepCells(step, index)}
						</a>
					{/if}
				</li>
			{/each}
			<li>
				<div class="wf-row wf-row--total">
					<span class="rb-who">
						<span class="rb-name">{teamName || 'Team'}</span>
						<span class="rb-meta">DARKO rating</span>
					</span>
					<span class="wf-track" aria-hidden="true">
						{#each stepScale.ticks as tick (tick)}
							<span class="wf-grid" class:wf-zero={tick === 0} style:left="{stepScale.at(tick)}%"></span>
						{/each}
						<span class="wf-link" style:left="{stepScale.at(waterfall.total)}%"></span>
						<span
							class="wf-bar wf-bar--total"
							class:negative={waterfall.total < 0}
							style:left="{stepScale.at(Math.min(0, waterfall.total))}%"
							style:width="{Math.abs(stepScale.at(waterfall.total) - stepScale.at(0))}%"
						></span>
					</span>
					<span class="wf-value">{formatSigned(waterfall.total, 2)}</span>
				</div>
			</li>
		</ol>
		<div class="wf-axis" aria-hidden="true">
			<span class="wf-axis-who"></span>
			<span class="wf-axis-track">
				{#each stepScale.ticks as tick (tick)}
					<span class="wf-tick" style:left="{stepScale.at(tick)}%">{formatTick(tick)}</span>
				{/each}
			</span>
			<span></span>
		</div>
		{#if tip?.chart === 'buildup'}{@render tipBox()}{/if}
	</div>
{:else}
	<div class="rb-chart" data-chart="minutes">
		<MinutesChart rows={folded} height={260} />
	</div>
{/if}

<style>
	.rb-note {
		margin: -8px 0 12px;
		max-width: 80ch;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.rb-switch {
		display: inline-grid;
		grid-auto-flow: column;
		margin: 0 0 12px;
		overflow: hidden;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.rb-switch button {
		min-height: 32px;
		padding: 7px 14px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.rb-switch button + button {
		border-left: 1px solid var(--border);
	}

	.rb-switch button.active {
		color: var(--bg);
		background: var(--accent);
	}

	.rb-switch button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.rb-chart {
		--rb-halo: var(--bg);
		position: relative;
	}

	:global(:root[data-view='shiny']) .rb-chart {
		--rb-halo: var(--shiny-panel-bg);
	}

	.rb-list,
	.wf-list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Players: offense, defense and net columns on one shared scale. */
	.rb-row {
		display: grid;
		grid-template-columns: minmax(150px, 1.2fr) repeat(3, minmax(0, 1fr));
		gap: 18px;
		align-items: center;
		width: 100%;
		padding: 5px 4px;
		font: inherit;
		color: var(--text);
		text-align: left;
		text-decoration: none;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--border-subtle);
		border-radius: 0;
		cursor: pointer;
	}

	a.rb-row:hover,
	a.rb-row:focus-visible,
	button.rb-row:hover,
	button.rb-row:focus-visible,
	a.wf-row:hover,
	a.wf-row:focus-visible,
	button.wf-row:hover,
	button.wf-row:focus-visible {
		background: var(--bg-hover);
	}

	.rb-row--head {
		align-items: end;
		padding-top: 0;
		border-bottom: 1px solid var(--border);
		cursor: default;
	}

	.rb-row--total {
		border-top: 1px solid var(--border);
		border-bottom: 0;
		cursor: default;
	}

	/* Name and minutes share a line when there is room. */
	.rb-who {
		display: flex;
		flex-flow: row wrap;
		column-gap: 8px;
		align-items: baseline;
		min-width: 0;
	}

	.rb-head-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.rb-name {
		overflow: hidden;
		font-size: 13px;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.rb-row--total .rb-name {
		font-weight: 800;
	}

	.rb-bench-mark {
		font-size: 11px;
		color: var(--text-muted);
	}

	.rb-meta {
		font-size: 11px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.rb-cell {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 46px;
		gap: 8px;
		align-items: center;
		min-width: 0;
	}

	.rb-cell--head {
		row-gap: 2px;
	}

	.rb-sort {
		grid-column: 1 / -1;
		display: inline-flex;
		align-items: baseline;
		justify-self: start;
		gap: 6px;
		padding: 4px 6px;
		margin-left: -6px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		background: transparent;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.rb-sort:hover {
		background: var(--bg-hover);
	}

	.rb-sort.active {
		color: var(--text);
	}

	.rb-sort:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.rb-sort-mark {
		visibility: hidden;
		font-size: 11px;
		color: var(--accent);
	}

	.rb-sort.active .rb-sort-mark {
		visibility: visible;
	}

	.rb-track {
		position: relative;
		height: 20px;
	}

	.rb-track--ticks {
		height: 14px;
	}

	.rb-tick,
	.wf-tick {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.rb-grid,
	.wf-grid {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--border-subtle);
	}

	.rb-grid.rb-zero,
	.wf-grid.wf-zero {
		background: var(--graphic-muted);
	}

	.rb-bar {
		position: absolute;
		top: 50%;
		min-width: 1px;
		height: 10px;
		border-radius: 2px;
		transform: translateY(-50%);
	}

	.rb-bar--offense {
		background: var(--offense);
	}

	.rb-bar--defense {
		background: var(--defense);
	}

	.rb-bar--total {
		background: var(--text-secondary);
	}

	.rb-value,
	.wf-value {
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		text-align: right;
		white-space: nowrap;
	}

	.rb-value {
		color: var(--text-secondary);
	}

	.rb-value--total,
	.wf-value {
		font-weight: var(--figure-weight-strong);
		color: var(--text);
	}

	.rb-row--total .rb-value {
		font-size: 13px;
		font-weight: var(--figure-weight-strong);
		color: var(--text);
	}

	.rb-bench-list {
		display: grid;
		gap: 2px;
		margin: 0;
		padding: 6px 4px 8px 16px;
		list-style: none;
		font-size: 12px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.rb-bench-list li {
		display: flex;
		gap: 10px;
		align-items: baseline;
	}

	.rb-bench-list a {
		color: var(--text);
		font-weight: 600;
	}

	.rb-bench-list span {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	/* Build-up: the net column as a waterfall. */
	.wf-row,
	.wf-axis {
		display: grid;
		grid-template-columns: minmax(150px, 26%) minmax(0, 1fr) 56px;
		gap: 12px;
		align-items: center;
	}

	.wf-row {
		width: 100%;
		padding: 5px 4px;
		font: inherit;
		color: var(--text);
		text-align: left;
		text-decoration: none;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--border-subtle);
		border-radius: 0;
		cursor: pointer;
	}

	.wf-track,
	.wf-axis-track {
		position: relative;
		height: 26px;
	}

	.wf-axis-track {
		height: 16px;
	}

	.wf-bar {
		position: absolute;
		top: 50%;
		min-width: 1px;
		height: 12px;
		background: var(--text-secondary);
		border-radius: 2px;
		transform: translateY(-50%);
	}

	.wf-bar.negative {
		background: repeating-linear-gradient(135deg, var(--text-secondary) 0 2px, transparent 2px 5px);
		box-shadow: inset 0 0 0 1px var(--text-secondary);
	}

	/* A dashed step from the end of the bar above to the start of this one. */
	.wf-link {
		position: absolute;
		top: -18px;
		height: 25px;
		border-left: 1px dashed var(--graphic-muted);
	}

	.wf-peak {
		position: absolute;
		top: -6px;
		bottom: -6px;
		border-left: 1px dotted var(--text-secondary);
	}

	.wf-peak-label {
		position: absolute;
		top: 0;
		transform: translateX(-50%);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: var(--figure-weight-strong);
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.wf-peak-label.end {
		transform: translateX(-100%);
	}

	.wf-row--total {
		border-top: 1px solid var(--border);
		border-bottom: 0;
		cursor: default;
	}

	.wf-row--total .rb-name,
	.wf-row--total .wf-value {
		font-weight: 800;
	}

	.wf-bar--total {
		background: var(--text);
	}

	.wf-bar--total.negative {
		background: repeating-linear-gradient(135deg, var(--text) 0 2px, transparent 2px 5px);
		box-shadow: inset 0 0 0 1px var(--text);
	}

	.wf-axis {
		padding: 4px 4px 0;
	}

	.wf-axis--top {
		padding: 0 4px 2px;
	}

	.rb-tip {
		z-index: 5;
		align-items: flex-start;
		font-size: 12px;
	}

	.rb-tip-head {
		font-weight: 700;
	}

	.rb-tip-muted {
		color: var(--text-secondary);
	}

	/* Phones: the name gets its own line and the bars the full width. */
	@media (max-width: 640px) {
		.rb-row {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 2px 12px;
			padding: 5px 2px;
		}

		.rb-value {
			line-height: 1.25;
		}

		.rb-row .rb-who {
			grid-column: 1 / -1;
			flex-direction: row;
			gap: 8px;
			align-items: baseline;
		}

		.rb-row--head .rb-head-label {
			display: none;
		}

		.rb-cell {
			grid-template-columns: minmax(0, 1fr);
			gap: 1px;
		}

		.rb-track {
			height: 12px;
		}

		.rb-track--ticks {
			height: 14px;
		}

		.rb-row--total .rb-track {
			display: none;
		}

		.wf-row,
		.wf-axis {
			grid-template-columns: minmax(0, 1fr) 52px;
			gap: 2px 8px;
		}

		.wf-row .rb-who {
			position: relative;
			z-index: 1;
			grid-column: 1 / -1;
			flex-direction: row;
			gap: 8px;
			align-items: baseline;
		}

		/* The dashed steps pass behind the names. */
		.wf-row .rb-name,
		.wf-row .rb-meta {
			text-shadow:
				0 0 2px var(--rb-halo),
				0 0 2px var(--rb-halo),
				0 0 3px var(--rb-halo);
		}

		.wf-axis-who {
			display: none;
		}

		/* The bar above sits a name's line further up. */
		.wf-link {
			top: -38px;
			height: 45px;
		}
	}
</style>
