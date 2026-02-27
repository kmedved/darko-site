<script>
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import TrajectoryChart from '$lib/components/TrajectoryChart.svelte';
	import { getFullPlayerHistory, getActivePlayers } from '$lib/supabase.js';
	import { computeSeasonX } from '$lib/utils/seasonUtils.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let selectedPlayers = $state([]);
	let timeScale = $state('games');
	let talentType = $state('dpm');
	let pendingLoads = $state(0);
	let loading = $derived(pendingLoads > 0);
	let error = $state(null);
	let initialLoadDone = $state(false);

	const MAX_PLAYERS = 5;

	const PLAYER_COLORS = [
		'#5b8def',
		'#ef4444',
		'#34d399',
		'#f59e0b',
		'#a78bfa'
	];

	const talentTypes = [
		{ key: 'dpm', label: 'DPM' },
		{ key: 'o_dpm', label: 'O-DPM' },
		{ key: 'd_dpm', label: 'D-DPM' },
		{ key: 'box_dpm', label: 'Box DPM' },
		{ key: 'box_odpm', label: 'Box O-DPM' },
		{ key: 'box_ddpm', label: 'Box D-DPM' }
	];

	const timeScaleOptions = [
		{ key: 'games', label: 'Games' },
		{ key: 'age', label: 'Age' },
		{ key: 'seasons', label: 'Seasons' }
	];

	const chartTitle = $derived(
		`DARKO Career ${talentTypes.find((t) => t.key === talentType)?.label ?? 'DPM'} Progression`
	);

	const chartData = $derived(
		selectedPlayers.map((p) => {
			let rows = p.rows;
			if (timeScale === 'seasons') {
				rows = computeSeasonX(rows);
			}
			return { ...p, rows };
		})
	);

	const excludeIds = $derived(selectedPlayers.map((p) => p.nba_id));

	// Load players from URL params on mount
	$effect(() => {
		if (initialLoadDone) return;
		const ids = $page.url.searchParams.get('ids');
		if (ids) {
			const idList = ids
				.split(',')
				.map(Number)
				.filter(Boolean);
			for (const id of idList) {
				loadPlayerById(id);
			}
		} else {
			loadRandomPlayer();
		}
		initialLoadDone = true;
	});

	// Sync selected player IDs to URL
	$effect(() => {
		if (!initialLoadDone) return;
		const ids = selectedPlayers.map((p) => p.nba_id).join(',');
		const currentIds = $page.url.searchParams.get('ids') || '';
		if (ids !== currentIds) {
			const url = new URL($page.url);
			if (ids) {
				url.searchParams.set('ids', ids);
			} else {
				url.searchParams.delete('ids');
			}
			goto(url.toString(), { replaceState: true, keepFocus: true });
		}
	});

	async function loadPlayerById(nbaId) {
		if (selectedPlayers.some((p) => p.nba_id === nbaId)) return;
		if (selectedPlayers.length >= MAX_PLAYERS) return;

		const colorIndex = selectedPlayers.length;
		const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];

		pendingLoads += 1;
		error = null;
		try {
			const rows = await getFullPlayerHistory(nbaId);
			if (rows.length === 0) {
				error = `No history found for player ${nbaId}`;
				return;
			}
			selectedPlayers = [
				...selectedPlayers,
				{
					nba_id: nbaId,
					player_name: rows[0].player_name,
					team_name: rows[0].team_name,
					color,
					rows
				}
			];
		} catch (err) {
			error = err.message;
		} finally {
			pendingLoads = Math.max(0, pendingLoads - 1);
		}
	}

	async function loadRandomPlayer() {
		if (selectedPlayers.length >= MAX_PLAYERS) return;

		pendingLoads += 1;
		error = null;
		try {
			const players = await getActivePlayers();
			if (players.length === 0) {
				error = 'No players available for random selection.';
				return;
			}

			const randomIndex = Math.floor(Math.random() * players.length);
			const randomPlayer = players[randomIndex];
			await loadPlayerById(randomPlayer.nba_id);
		} catch (err) {
			error = err.message;
		} finally {
			pendingLoads = Math.max(0, pendingLoads - 1);
		}
	}

	function addPlayer(player) {
		if (selectedPlayers.some((p) => p.nba_id === player.nba_id)) return;
		if (selectedPlayers.length >= MAX_PLAYERS) return;

		const colorIndex = selectedPlayers.length;
		const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];

		pendingLoads += 1;
		error = null;

		getFullPlayerHistory(player.nba_id)
			.then((rows) => {
				selectedPlayers = [
					...selectedPlayers,
					{
						nba_id: player.nba_id,
						player_name: player.player_name,
						team_name: player.team_name,
						color,
						rows
					}
				];
			})
			.catch((err) => {
				error = err.message;
			})
			.finally(() => {
				pendingLoads = Math.max(0, pendingLoads - 1);
			});
	}

	function removePlayer(nbaId) {
		selectedPlayers = selectedPlayers
			.filter((p) => p.nba_id !== nbaId)
			.map((p, i) => ({
				...p,
				color: PLAYER_COLORS[i % PLAYER_COLORS.length]
			}));
	}
</script>

<svelte:head>
	<title>Player career trajectories — DARKO DPM</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<h1>Player career trajectories</h1>
		<p>Compare career arcs for up to {MAX_PLAYERS} players.</p>
	</div>

	<div class="trajectory-layout">
		<div class="trajectory-controls">
			<fieldset class="control-group">
				<legend class="control-label">Time Scale</legend>
				{#each timeScaleOptions as opt}
					<label class="radio-label">
						<input
							type="radio"
							name="timeScale"
							value={opt.key}
							bind:group={timeScale}
						/>
						{opt.label}
					</label>
				{/each}
			</fieldset>

			<div class="control-group">
				<label class="control-label" for="talent-type"
					>Talent Type</label
				>
				<select
					id="talent-type"
					class="control-select"
					bind:value={talentType}
				>
					{#each talentTypes as tt}
						<option value={tt.key}>{tt.label}</option>
					{/each}
				</select>
			</div>

			<div class="control-group">
				<span class="control-label"
					>Select Players to Compare (Max {MAX_PLAYERS})</span
				>
				<div class="player-chips-input">
					{#each selectedPlayers as p (p.nba_id)}
						<span
							class="player-chip"
							style="background: {p.color}20; border-color: {p.color};"
						>
							{p.player_name}: {p.nba_id}
							<button
								class="chip-remove"
								onclick={() => removePlayer(p.nba_id)}
								aria-label="Remove {p.player_name}"
							>
								&times;
							</button>
						</span>
					{/each}
				</div>
				{#if selectedPlayers.length < MAX_PLAYERS}
					<AllPlayerSearch
						onSelect={addPlayer}
						exclude={excludeIds}
					/>
				{/if}
			</div>
		</div>

		<div class="trajectory-chart-area">
			{#if error}
				<div class="error-msg">{error}</div>
			{/if}

			{#if loading}
				<div class="loading">Loading player data...</div>
			{/if}

			{#if selectedPlayers.length > 0}
				<TrajectoryChart
					players={chartData}
					{timeScale}
					{talentType}
					title={chartTitle}
				/>
			{:else if !loading}
				<div class="empty-state">
					Search for players to view career trajectories.
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.trajectory-layout {
		display: flex;
		gap: 32px;
		align-items: flex-start;
	}

	.trajectory-controls {
		flex: 0 0 300px;
		border: 1px solid var(--border);
		border-radius: 6px;
		padding: 20px;
		background: var(--bg-surface);
	}

	.trajectory-chart-area {
		flex: 1;
		min-width: 0;
	}

	.control-group {
		margin-bottom: 20px;
		border: none;
		padding: 0;
	}

	.control-label {
		display: block;
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 8px;
		color: var(--text);
	}

	.radio-label {
		display: block;
		font-size: 14px;
		color: var(--text);
		cursor: pointer;
		padding: 2px 0;
	}

	.radio-label input {
		margin-right: 6px;
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

	.player-chips-input {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 10px;
		min-height: 28px;
	}

	.player-chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 3px 8px;
		border: 1px solid;
		border-radius: 4px;
		font-size: 12px;
		color: var(--text);
		white-space: nowrap;
	}

	.chip-remove {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0 2px;
		font-size: 14px;
		line-height: 1;
	}

	.chip-remove:hover {
		color: var(--negative);
	}

	@media (max-width: 768px) {
		.trajectory-layout {
			flex-direction: column;
		}

		.trajectory-controls {
			flex: none;
			width: 100%;
		}
	}
</style>
