<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ScatterplotChart from '$lib/components/ScatterplotChart.svelte';
	import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';
	import { isRapmMetric, staleRapmDate } from '$lib/utils/latestRapm.js';
	import { formatAsOfDate } from '$lib/utils/timeMachine.js';

	let { data } = $props();

	const STAT_GROUPS = [
		{
			label: 'DPM Metrics',
			stats: ['dpm', 'o_dpm', 'd_dpm']
		},
		{
			label: 'Component DPM',
			stats: ['box_dpm', 'box_odpm', 'box_ddpm', 'on_off_dpm', 'on_off_odpm', 'on_off_ddpm']
		},
		{
			label: 'RAPM',
			stats: ['bayes_rapm_total', 'bayes_rapm_off', 'bayes_rapm_def']
		},
		{
			label: 'Box Stats (per 100)',
			stats: ['x_pts_100', 'x_ast_100', 'x_orb_100', 'x_drb_100', 'x_stl_100', 'x_blk_100', 'x_tov_100']
		},
		{
			label: 'Shooting',
			stats: ['x_fg_pct', 'x_fg3_pct', 'x_ft_pct', 'x_fga_100', 'x_fg3a_100', 'x_fta_100']
		},
		{
			label: 'Context',
			stats: ['x_minutes', 'x_pace', 'age']
		},
		{
			label: 'Value',
			stats: ['sal_market_fixed', 'surplus_value']
		}
	];
	const ALL_STATS = STAT_GROUPS.flatMap((group) => group.stats);

	// The chart's settings and highlighted players (?ids=, as the leaderboard's picks send them)
	// live in the URL, so a view can be shared or reloaded.
	const initial = $page.url.searchParams;
	const statParam = (key, fallback) => (ALL_STATS.includes(initial.get(key)) ? initial.get(key) : fallback);
	const mpgParam = Number.parseInt(initial.get('mpg') ?? '', 10);

	let xMetric = $state(statParam('x', 'o_dpm'));
	let yMetric = $state(statParam('y', 'd_dpm'));
	let colorByPosition = $state(initial.get('color') !== '0');
	let mpgMinimum = $state(Number.isInteger(mpgParam) && mpgParam > 0 && mpgParam <= 40 ? mpgParam : 0);
	let highlightIds = $state(
		[...new Set((initial.get('ids') ?? '').split(',').map((id) => Number.parseInt(id, 10)))]
			.filter((id) => Number.isInteger(id) && id > 0)
			.slice(0, 8)
	);
	let filtersOpen = $state(false);
	let innerHeight = $state(900);

	// The chart takes the height the window has left under the header and controls.
	const chartHeight = $derived(Math.min(760, Math.max(420, innerHeight - 340)));

	$effect(() => {
		const current = $page.url;
		const params = new URLSearchParams(current.searchParams);
		const put = (key, value, fallback) => (value === fallback ? params.delete(key) : params.set(key, String(value)));
		put('x', xMetric, 'o_dpm');
		put('y', yMetric, 'd_dpm');
		put('mpg', Number(mpgMinimum), 0);
		put('color', colorByPosition ? '1' : '0', '1');
		put('ids', highlightIds.join(','), '');
		const next = params.toString();
		if (next === current.searchParams.toString()) return;
		// Commas stay commas in the address, as Compare and Career Trajectories write them.
		const search = next.replaceAll('%2C', ',');
		const timer = setTimeout(
			() => goto(`${current.pathname}${search ? `?${search}` : ''}`, { replaceState: true, keepFocus: true, noScroll: true }),
			200
		);
		return () => clearTimeout(timer);
	});

	const highlightSet = $derived(new Set(highlightIds));
	const highlightedPlayers = $derived(
		highlightIds
			.map((id) => (data.players || []).find((player) => Number(player.nba_id) === id))
			.filter(Boolean)
	);

	// Highlighted players stay on the chart whatever the minutes minimum.
	const filteredPlayers = $derived.by(() => {
		return (data.players || []).filter((p) => {
			if (mpgMinimum <= 0 || highlightSet.has(Number(p.nba_id))) return true;
			const mpg = Number.parseFloat(p.x_minutes);
			return Number.isFinite(mpg) && mpg >= mpgMinimum;
		});
	});

	// RAPM hasn't come with each day's ratings since March, so the chart plots each player's
	// latest published value and says how old it is.
	const rapmFrom = $derived(
		isRapmMetric(xMetric) || isRapmMetric(yMetric) ? staleRapmDate(filteredPlayers) : null
	);
</script>

<svelte:head>
	<title>Player scatterplot — DARKO DPM</title>
</svelte:head>

<svelte:window bind:innerHeight />

<div class="container scatterplot-page" data-shiny-page>
	<PageHeader title="Player scatterplot" lede="Compare any two stats across all current-season NBA players." />

	<div class="scatterplot-layout" data-shiny-layout="sidebar">
		<button class="filters-toggle" onclick={() => filtersOpen = !filtersOpen}>
			{filtersOpen ? 'Hide Filters' : 'Filters'}
		</button>
		<div class="scatterplot-controls" data-shiny-surface="well" class:mobile-open={filtersOpen}>
			<div class="control-group">
				<label class="control-label" for="x-metric">X-Axis</label>
				<select id="x-metric" class="control-select" bind:value={xMetric}>
					{#each STAT_GROUPS as group (group.label)}
						<optgroup label={group.label}>
							{#each group.stats as stat (stat)}
								<option value={stat}>{getMetricDisplayLabel(stat)}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</div>

			<div class="control-group">
				<label class="control-label" for="y-metric">Y-Axis</label>
				<select id="y-metric" class="control-select" bind:value={yMetric}>
					{#each STAT_GROUPS as group (group.label)}
						<optgroup label={group.label}>
							{#each group.stats as stat (stat)}
								<option value={stat}>{getMetricDisplayLabel(stat)}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</div>

			<div class="control-group">
				<label class="control-label" for="mpg-min">
					MPG Minimum: {mpgMinimum}
				</label>
				<input
					id="mpg-min"
					type="range"
					min="0"
					max="40"
					step="1"
					bind:value={mpgMinimum}
					class="control-range"
				/>
			</div>

			<div class="control-group">
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={colorByPosition} />
					Color by position
				</label>
			</div>
		</div>

		<div class="scatterplot-chart-area" data-shiny-surface="plot">
			{#if highlightedPlayers.length > 0}
				<div class="scatter-highlights" role="group" aria-label="Highlighted players">
					<span class="scatter-highlights-label">Highlighted</span>
					{#each highlightedPlayers as player (player.nba_id)}
						<button
							type="button"
							class="highlight-chip"
							onclick={() => (highlightIds = highlightIds.filter((id) => id !== Number(player.nba_id)))}
							aria-label={`Stop highlighting ${player.player_name}`}
						>
							{player.player_name}<span aria-hidden="true">×</span>
						</button>
					{/each}
					<button type="button" class="highlight-clear" onclick={() => (highlightIds = [])}>Clear</button>
				</div>
			{/if}
			<ScatterplotChart
				players={filteredPlayers}
				{xMetric}
				{yMetric}
				{colorByPosition}
				height={chartHeight}
				highlight={highlightIds}
			/>
		</div>
		{#if rapmFrom}
			<p class="scatterplot-note">RAPM values are each player's latest published, through {formatAsOfDate(rapmFrom)}.</p>
		{/if}
	</div>
</div>

<style>
	/* The controls sit in one row above the chart so the chart gets the page's full width. The
	   Shiny view keeps its archived sidebar (data-shiny-layout="sidebar"). */
	.scatterplot-layout {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.scatterplot-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 12px 24px;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 14px 18px;
		background: var(--bg-surface);
	}

	.scatterplot-controls .control-group {
		flex: 0 1 220px;
		min-width: 0;
	}

	.scatterplot-controls .control-group:last-child {
		flex-basis: auto;
		align-self: center;
	}

	.scatterplot-note {
		margin: 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.scatterplot-chart-area {
		min-width: 0;
	}

	.scatter-highlights {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 8px;
		margin-bottom: 10px;
		font-size: 12px;
	}

	.scatter-highlights-label {
		color: var(--text-secondary);
		font-weight: 700;
	}

	.highlight-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 28px;
		padding: 0 8px 0 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-surface);
		color: var(--text);
		font: inherit;
		font-weight: 650;
		cursor: pointer;
	}

	.highlight-chip span {
		color: var(--text-muted);
		font-size: 15px;
		line-height: 1;
	}

	.highlight-chip:hover,
	.highlight-chip:focus-visible {
		border-color: var(--accent);
	}

	.highlight-clear {
		padding: 4px;
		border: 0;
		background: none;
		color: var(--accent);
		font: inherit;
		font-weight: 750;
		cursor: pointer;
	}

	@media (min-width: 769px) {
		:global(:root[data-view='shiny']) .scatterplot-controls {
			display: block;
		}
	}

	:global(:root[data-view='shiny']) .scatterplot-controls .control-group {
		margin-bottom: 20px;
	}

	:global(:root[data-view='shiny']) .scatterplot-controls .control-group:last-child {
		margin-bottom: 0;
	}

	.control-label {
		display: block;
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--text);
	}

	.control-select {
		width: 100%;
		padding: 6px 8px;
		font-size: 14px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--bg);
		color: var(--text);
	}

	.control-range {
		width: 100%;
		cursor: pointer;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 14px;
		color: var(--text);
		cursor: pointer;
	}

	.checkbox-label input {
		cursor: pointer;
	}

	.filters-toggle {
		display: none;
	}

	@media (max-width: 768px) {
		.scatterplot-layout {
			flex-direction: column;
			align-items: stretch;
		}

		.filters-toggle {
			display: inline-flex;
			align-items: center;
			align-self: flex-start;
			gap: 6px;
			padding: 8px 14px;
			font-size: 13px;
			font-weight: 600;
			color: var(--text);
			background: var(--bg-elevated);
			border: 1px solid var(--border);
			border-radius: var(--radius-sm, 4px);
			cursor: pointer;
			margin-bottom: 12px;
		}

		.filters-toggle:hover {
			background: var(--bg-hover);
		}

		.scatterplot-controls {
			display: none;
		}

		.scatterplot-controls.mobile-open {
			display: flex;
		}

		.scatterplot-controls .control-group {
			flex-basis: 100%;
		}

		.scatterplot-chart-area {
			width: 100%;
			min-width: 0;
		}
	}
</style>
