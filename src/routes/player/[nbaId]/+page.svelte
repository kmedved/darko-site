<script>
	import { goto } from '$app/navigation';
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import TalentPercentilesChart from '$lib/components/TalentPercentilesChart.svelte';
	import TalentTrendChart from '$lib/components/TalentTrendChart.svelte';
	import { apiActivePlayers } from '$lib/api.js';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';

	let { data } = $props();

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
		{ value: 'x_ft_pct', label: 'FT%' },
		{ value: 'sal_market_fixed', label: 'Fair Salary' }
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

	let allActivePlayers = $state([]);
	let percentilesLoading = $state(true);
	let percentileNotice = $state(null);
	let talentType = $state('dpm');
	let selectedPercentileMetrics = $state(['dpm', 'o_dpm', 'd_dpm', 'x_pts_100', 'x_fg3_pct']);
	let imgFailed = $state(false);
	const loadSeq = createRequestSequencer();

	const nbaId = $derived(data.nbaId ?? data.playerInfo?.nba_id ?? null);
	const playerInfo = $derived(data.playerInfo ?? null);
	const historyRows = $derived(data.historyRows ?? []);
	const historyMeta = $derived(data.historyMeta ?? { truncated: false, maxRows: null });

	function getInitials(name) {
		if (!name) return '?';
		return name
			.split(/\s+/)
			.map((word) => word[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	const percentiles = $derived.by(() => {
		if (!playerInfo || allActivePlayers.length === 0) return [];

		const position = playerInfo.position;
		const positionPlayers = position
			? allActivePlayers.filter((player) => player.position === position)
			: allActivePlayers;

		if (positionPlayers.length === 0) return [];

		return selectedPercentileMetrics.map((metric) => {
			const playerValue = Number.parseFloat(playerInfo[metric]);
			if (Number.isNaN(playerValue)) return { metric, value: 0 };

			const values = positionPlayers
				.map((player) => Number.parseFloat(player[metric]))
				.filter((value) => !Number.isNaN(value));

			if (values.length === 0) return { metric, value: 0 };

			const below = values.filter((value) => value < playerValue).length;
			return {
				metric,
				value: Math.round((below / values.length) * 100)
			};
		});
	});

	const currentDate = $derived.by(() => {
		if (!playerInfo?.date) return '';
		const dateOnly = playerInfo.date.includes('T')
			? playerInfo.date.split('T')[0]
			: playerInfo.date;
		const d = new Date(dateOnly + 'T00:00:00');
		return Number.isNaN(d.getTime())
			? dateOnly
			: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	});

	$effect(() => {
		void playerInfo;
		imgFailed = false;
	});

	async function loadActivePlayersWithRetry() {
		try {
			return await apiActivePlayers();
		} catch {
			return await apiActivePlayers();
		}
	}

	$effect(() => {
		if (!playerInfo?.nba_id) {
			allActivePlayers = [];
			percentileNotice = null;
			percentilesLoading = false;
			return;
		}

		const reqId = loadSeq.next();
		allActivePlayers = [];
		percentilesLoading = true;
		percentileNotice = null;

		loadActivePlayersWithRetry()
			.then((activePlayers) => {
				if (!loadSeq.isCurrent(reqId)) return;
				allActivePlayers = Array.isArray(activePlayers) ? activePlayers : [];
				percentileNotice =
					allActivePlayers.length === 0
						? 'Active-player percentile data is temporarily unavailable.'
						: null;
			})
			.catch(() => {
				if (!loadSeq.isCurrent(reqId)) return;
				allActivePlayers = [];
				percentileNotice = 'Active-player percentile data is temporarily unavailable.';
			})
			.finally(() => {
				if (!loadSeq.isCurrent(reqId)) return;
				percentilesLoading = false;
			});

		return () => {
			loadSeq.next();
		};
	});

	function handleSelectPlayer(player) {
		goto(`/player/${player.nba_id}`);
	}

	function togglePercentileMetric(metric) {
		if (selectedPercentileMetrics.includes(metric)) {
			if (selectedPercentileMetrics.length > 1) {
				selectedPercentileMetrics = selectedPercentileMetrics.filter((item) => item !== metric);
			}
			return;
		}

		selectedPercentileMetrics = [...selectedPercentileMetrics, metric];
	}
</script>

<svelte:head>
	<title>{playerInfo?.player_name || 'Player'} Profile — DARKO DPM</title>
</svelte:head>

<div class="container">
	<div class="profile-layout">
		<aside class="profile-sidebar">
			<div class="sidebar-section">
				<p class="sidebar-label">Player</p>
				<AllPlayerSearch onSelect={handleSelectPlayer} exclude={[]} />
			</div>

			{#if playerInfo}
				<div class="sidebar-player-info">
					<div class="profile-headshot">
						{#if nbaId && !imgFailed}
							<img
								src={`https://cdn.nba.com/headshots/nba/latest/260x190/${nbaId}.png`}
								alt=""
								class="headshot-img"
								onerror={() => {
									imgFailed = true;
								}}
							/>
						{:else}
							<div class="headshot-placeholder">
								{getInitials(playerInfo?.player_name)}
							</div>
						{/if}
					</div>
					<h2>{playerInfo.player_name}</h2>
					<p class="player-meta">{playerInfo.team_name} · {playerInfo.position || '?'}</p>
				</div>
				<a href="/compare?ids={nbaId}" class="compare-link">Compare this player</a>
			{/if}

			<div class="sidebar-section">
				<label class="sidebar-label" for="talent-trend-select">Talent Trend</label>
				<select id="talent-trend-select" class="sidebar-select" bind:value={talentType}>
					{#each TALENT_OPTIONS as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<div class="sidebar-section">
				<p class="sidebar-label">Talent Percentiles</p>
				<div class="percentile-checkboxes">
					{#each PERCENTILE_OPTIONS as opt (opt.value)}
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
			{#if playerInfo}
				<div class="chart-panel">
					<TalentTrendChart
						rows={historyRows}
						{talentType}
						playerName={playerInfo.player_name}
					/>
					{#if historyMeta.truncated}
						<p class="history-note">
							Showing the first {historyMeta.maxRows} rows of career history.
						</p>
					{/if}
				</div>

				{#if percentilesLoading}
					<div class="chart-panel">
						<div class="loading">Loading percentile context...</div>
					</div>
				{:else if percentileNotice}
					<div class="chart-panel">
						<p class="percentile-notice">{percentileNotice}</p>
					</div>
				{:else if allActivePlayers.length > 0}
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

	.profile-headshot {
		display: flex;
		justify-content: center;
		margin-bottom: 12px;
	}

	.profile-headshot .headshot-img {
		width: 130px;
		height: 95px;
		object-fit: cover;
		border-radius: 6px;
	}

	.profile-headshot .headshot-placeholder {
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: var(--bg-elevated);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 700;
		color: var(--text-muted);
	}

	.compare-link {
		display: block;
		text-align: center;
		padding: 8px 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		text-decoration: none;
	}

	.compare-link:hover {
		background: var(--accent);
		color: var(--bg);
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

	.percentile-notice {
		color: var(--text-muted);
		font-size: 13px;
	}

	.history-note {
		margin-top: 12px;
		color: var(--text-muted);
		font-size: 12px;
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
