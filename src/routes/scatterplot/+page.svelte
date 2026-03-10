<script>
	import ScatterplotChart from '$lib/components/ScatterplotChart.svelte';
	import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';

	let { data } = $props();

	let xMetric = $state('o_dpm');
	let yMetric = $state('d_dpm');
	let colorByPosition = $state(true);
	let mpgMinimum = $state(0);

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

<div class="container">
	<div class="page-header">
		<h1>Player scatterplot</h1>
		<p>Compare any two stats across all active NBA players.</p>
	</div>

	<div class="scatterplot-layout">
		<div class="scatterplot-controls">
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

		<div class="scatterplot-chart-area">
			<ScatterplotChart
				players={filteredPlayers}
				{xMetric}
				{yMetric}
				{colorByPosition}
			/>
		</div>
	</div>
</div>

<style>
	.scatterplot-layout {
		display: flex;
		gap: 32px;
		align-items: flex-start;
	}

	.scatterplot-controls {
		flex: 0 0 260px;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 20px;
		background: var(--bg-surface);
	}

	.scatterplot-chart-area {
		flex: 1;
		min-width: 0;
	}

	.control-group {
		margin-bottom: 20px;
	}

	.control-group:last-child {
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

	@media (max-width: 768px) {
		.scatterplot-layout {
			flex-direction: column;
			align-items: stretch;
		}

		.scatterplot-controls {
			flex: none;
			width: 100%;
		}

		.scatterplot-chart-area {
			width: 100%;
			min-width: 0;
		}
	}
</style>
