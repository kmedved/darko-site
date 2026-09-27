<script>
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ScatterplotChart from '$lib/components/ScatterplotChart.svelte';
	import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';

	let { data } = $props();

	let xMetric = $state('o_dpm');
	let yMetric = $state('d_dpm');
	let colorByPosition = $state(true);
	let mpgMinimum = $state(0);
	let filtersOpen = $state(false);
	let innerHeight = $state(900);

	// The chart takes the height the window has left under the header and controls.
	const chartHeight = $derived(Math.min(760, Math.max(420, innerHeight - 340)));

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

	const filteredPlayers = $derived.by(() => {
		return (data.players || []).filter((p) => {
			if (mpgMinimum <= 0) return true;
			const mpg = Number.parseFloat(p.x_minutes);
			return Number.isFinite(mpg) && mpg >= mpgMinimum;
		});
	});
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
			<ScatterplotChart
				players={filteredPlayers}
				{xMetric}
				{yMetric}
				{colorByPosition}
				height={chartHeight}
			/>
		</div>
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

	.scatterplot-chart-area {
		min-width: 0;
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
