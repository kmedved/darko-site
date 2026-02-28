<script>
	import { page } from '$app/stores';
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import TalentTrendChart from '$lib/components/TalentTrendChart.svelte';
	import TalentPercentilesChart from '$lib/components/TalentPercentilesChart.svelte';
	import { apiActivePlayers, apiPlayerHistory } from '$lib/api.js';
	import { goto } from '$app/navigation';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';

	let nbaId = $derived($page.params.nbaId);

	let playerInfo = $state(null);
	let historyRows = $state([]);
	let allActivePlayers = $state([]);
	let loading = $state(true);
	let error = $state(null);

	let talentType = $state('dpm');
	let selectedPercentileMetrics = $state(['dpm', 'o_dpm', 'd_dpm', 'x_pts_100', 'x_fg3_pct']);
	const loadSeq = createRequestSequencer();

		const TALENT_OPTIONS = [
			{ value: 'dpm', label: 'DPM' },
			{ value: 'o_dpm', label: 'O-DPM' },
			{ value: 'd_dpm', label: 'D-DPM' },
			{ value: 'box_dpm', label: 'Box DPM' },
			{ value: 'box_odpm', label: 'Box O-DPM' },
			{ value: 'box_ddpm', label: 'Box D-DPM' },
			{ value: 'on_off_dpm', label: 'On/Off DPM' },
			{ value: 'bayes_rapm_total', label: 'RAPM' },
			{ value: 'x_pts_100', label: 'Pts per 100' },
			{ value: 'x_ast_100', label: 'Ast per 100' },
			{ value: 'x_minutes', label: 'MPG' },
			{ value: 'x_pace', label: 'Pace' },
			{ value: 'x_fg_pct', label: 'FG%' },
			{ value: 'x_fg3_pct', label: '3P%' },
			{ value: 'x_ft_pct', label: 'FT%' }
		];

		const PERCENTILE_OPTIONS = [
			{ value: 'dpm', label: 'DPM' },
			{ value: 'o_dpm', label: 'O-DPM' },
			{ value: 'd_dpm', label: 'D-DPM' },
			{ value: 'on_off_dpm', label: 'On/Off DPM' },
			{ value: 'bayes_rapm_total', label: 'RAPM' },
			{ value: 'x_pts_100', label: 'Pts per 100' },
			{ value: 'x_ast_100', label: 'Ast per 100' },
			{ value: 'x_fg_pct', label: 'FG%' },
			{ value: 'x_fg3_pct', label: '3P%' },
			{ value: 'x_ft_pct', label: 'FT%' },
			{ value: 'tr_fg3_pct', label: '3P% (trend)' },
			{ value: 'tr_ft_pct', label: 'FT% (trend)' }
		];

	const percentiles = $derived.by(() => {
		if (!playerInfo || allActivePlayers.length === 0) return [];

		const position = playerInfo.position;
		const posPlayers = position
			? allActivePlayers.filter((p) => p.position === position)
			: allActivePlayers;

		if (posPlayers.length === 0) return [];

		return selectedPercentileMetrics.map((metric) => {
			const playerVal = parseFloat(playerInfo[metric]);
			if (isNaN(playerVal)) return { metric, value: 0 };

			const values = posPlayers
				.map((p) => parseFloat(p[metric]))
				.filter((v) => !isNaN(v));

			if (values.length === 0) return { metric, value: 0 };

			const below = values.filter((v) => v < playerVal).length;
			const pct = Math.round((below / values.length) * 100);
			return { metric, value: pct };
		});
	});

	const currentDate = $derived.by(() => {
		if (!playerInfo?.date) return '';
		const d = playerInfo.date;
		const dateOnly = d.includes('T') ? d.split('T')[0] : d;
		return dateOnly;
	});

	$effect(() => {
		if (!nbaId) return;
		loadPlayer(nbaId);
	});

	async function loadPlayer(id) {
		const reqId = loadSeq.next();
		loading = true;
		error = null;
		try {
			const [history, active] = await Promise.all([
				apiPlayerHistory(id, { limit: 1000 }),
				allActivePlayers.length > 0
					? Promise.resolve(allActivePlayers)
					: apiActivePlayers()
			]);
			const info = history.at(-1);

			if (!loadSeq.isCurrent(reqId)) return;

			playerInfo = info;
			historyRows = history;
			allActivePlayers = active;
		} catch (err) {
			if (!loadSeq.isCurrent(reqId)) return;
			error = err.message;
		} finally {
			if (!loadSeq.isCurrent(reqId)) return;
			loading = false;
		}
	}

	function handleSelectPlayer(player) {
		goto(`/player/${player.nba_id}`);
	}

	function togglePercentileMetric(metric) {
		if (selectedPercentileMetrics.includes(metric)) {
			if (selectedPercentileMetrics.length > 1) {
				selectedPercentileMetrics = selectedPercentileMetrics.filter((m) => m !== metric);
			}
		} else {
			selectedPercentileMetrics = [...selectedPercentileMetrics, metric];
		}
	}
</script>

<svelte:head>
	<title>{playerInfo?.player_name || 'Player'} Profile — DARKO DPM</title>
</svelte:head>

<div class="container">
	<div class="profile-layout">
		<aside class="profile-sidebar">
			<div class="sidebar-section">
				<label class="sidebar-label">Player</label>
				<AllPlayerSearch onSelect={handleSelectPlayer} exclude={[]} />
			</div>

			{#if playerInfo}
				<div class="sidebar-player-info">
					<h2>{playerInfo.player_name}</h2>
					<p class="player-meta">{playerInfo.team_name} · {playerInfo.position || '?'}</p>
				</div>
			{/if}

			<div class="sidebar-section">
				<label class="sidebar-label" for="talent-trend-select">Talent Trend</label>
				<select
					id="talent-trend-select"
					class="sidebar-select"
					bind:value={talentType}
				>
					{#each TALENT_OPTIONS as opt}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<div class="sidebar-section">
				<label class="sidebar-label">Talent Percentiles</label>
				<div class="percentile-checkboxes">
					{#each PERCENTILE_OPTIONS as opt}
						<label class="checkbox-label">
							<input
								type="checkbox"
								checked={selectedPercentileMetrics.includes(opt.value)}
								onchange={() => togglePercentileMetric(opt.value)}
							/>
							{opt.label}
						</label>
					{/each}
				</div>
			</div>
		</aside>

		<div class="profile-content">
			{#if loading}
				<div class="loading">Loading player data...</div>
			{:else if error}
				<div class="error-msg">{error}</div>
			{:else if playerInfo}
				<div class="chart-panel">
					<TalentTrendChart
						rows={historyRows}
						{talentType}
						playerName={playerInfo.player_name}
					/>
				</div>

				<div class="chart-panel">
					<TalentPercentilesChart
						playerName={playerInfo.player_name}
						position={playerInfo.position}
						date={currentDate}
						{percentiles}
						selectedMetrics={selectedPercentileMetrics}
					/>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.profile-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 24px;
		padding: 32px 0 64px;
		align-items: start;
	}

	.profile-sidebar {
		display: flex;
		flex-direction: column;
		gap: 20px;
		position: sticky;
		top: 230px;
	}

	.sidebar-player-info {
		padding: 16px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.sidebar-player-info h2 {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
	}

	.player-meta {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.sidebar-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.sidebar-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}

	.sidebar-select {
		width: 100%;
		padding: 8px 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: 13px;
		outline: none;
		cursor: pointer;
	}

	.sidebar-select:focus {
		border-color: var(--accent);
	}

	.percentile-checkboxes {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		accent-color: var(--accent);
	}

	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 0;
	}

	.chart-panel {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px;
	}

	@media (max-width: 768px) {
		.profile-layout {
			grid-template-columns: 1fr;
			padding: 20px 0 48px;
		}

		.profile-sidebar {
			position: static;
		}
	}
</style>
