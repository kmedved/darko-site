<script>
	import { goto } from '$app/navigation';
	import PlayerSearch from '$lib/components/PlayerSearch.svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { exportCsvRows, compareCsvColumns } from '$lib/utils/csvPresets.js';

	let { data } = $props();

	const STARTER_COMPARISONS = [
		{
			label: 'Jokic vs Wembanyama',
			detail: 'Current top bigs',
			href: '/compare?ids=203999,1641705'
		},
		{
			label: 'Shai vs Luka',
			detail: 'Primary creators',
			href: '/compare?ids=1628983,1629029'
		},
		{
			label: 'LeBron vs Durant',
			detail: 'Long career arcs',
			href: '/compare?ids=2544,201142'
		}
	];

	let selectedPlayers = $state([]);
	let loading = $state(false);
	let error = $state(null);

	$effect(() => {
		selectedPlayers = data.preloadedPlayers || [];
		error = data.notice || null;
		loading = false;
	});

	function normalizeIds(ids = []) {
		return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 4);
	}

	async function syncCompareUrl(ids) {
		const nextIds = normalizeIds(ids);
		const currentIds = selectedPlayers.map((player) => player.nba_id);

		if (
			nextIds.length === currentIds.length &&
			nextIds.every((id, index) => id === currentIds[index])
		) {
			return;
		}

		const suffix = nextIds.length > 0 ? `?ids=${nextIds.join(',')}` : '';
		loading = true;
		error = null;

		try {
			await goto(`/compare${suffix}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			});
		} catch (err) {
			loading = false;
			error = err?.message || 'Failed to update compare players';
		}
	}

	function addPlayer(player) {
		if (loading) return;

		const id = Number.parseInt(player?.nba_id, 10);
		if (!Number.isInteger(id) || id <= 0) return;
		if (selectedPlayers.some((current) => current.nba_id === id)) return;
		if (selectedPlayers.length >= 4) return;

		syncCompareUrl([...selectedPlayers.map((current) => current.nba_id), id]);
	}

	function removePlayer(nbaId) {
		if (loading) return;

		syncCompareUrl(
			selectedPlayers.map((player) => player.nba_id).filter((id) => id !== nbaId)
		);
	}

	const excludeIds = $derived(selectedPlayers.map((player) => player.nba_id));

	const gridCols = $derived(
		selectedPlayers.length <= 1
			? '1fr'
			: selectedPlayers.length === 2
				? '1fr 1fr'
				: selectedPlayers.length === 3
					? '1fr 1fr 1fr'
					: '1fr 1fr 1fr 1fr'
	);

	function exportCompareCsv() {
		exportCsvRows({
			rows: selectedPlayers,
			columns: compareCsvColumns,
			filename: 'darko-compare.csv'
		});
	}
</script>

<svelte:head>
	<title>Compare Players — DARKO DPM</title>
</svelte:head>

<div class="container compare-page" data-shiny-page>
	<div class="page-header" data-shiny-surface="hero">
		<div class="page-header-toolbar">
			<div>
				<h1>Compare Players</h1>
				<p>Side-by-side DPM ratings and history for up to 4 players.</p>
			</div>
			<div class="page-header-actions">
				<button
					class="page-action-btn"
					type="button"
					onclick={exportCompareCsv}
					disabled={selectedPlayers.length === 0}
					title={selectedPlayers.length === 0 ? 'Add a player to enable CSV export' : 'Download selected players as CSV'}
				>
					Download CSV
				</button>
			</div>
		</div>
	</div>

	<div class="compare-search-panel" data-shiny-surface="well">
		<PlayerSearch onSelect={addPlayer} exclude={excludeIds} />
		{#if selectedPlayers.length > 0}
			<div class="compare-count">
				{selectedPlayers.length}/4 players
			</div>
		{/if}
	</div>

	{#if error}
		<div class="error-msg" style="margin-bottom: 20px;">{error}</div>
	{/if}

	{#if loading && selectedPlayers.length === 0}
		<div class="loading">Loading...</div>
	{/if}

	{#if loading && selectedPlayers.length > 0}
		<div class="loading" style="margin-bottom: 16px;">Updating compare list...</div>
	{/if}

	{#if selectedPlayers.length > 0}
		<div class="compare-grid" style="grid-template-columns: {gridCols};">
			{#each selectedPlayers as player (player.nba_id)}
				<PlayerCard {player} historyRows={player.rows} onRemove={() => removePlayer(player.nba_id)} />
			{/each}
		</div>
	{:else if !loading}
		<div class="compare-empty-state">
			<div class="empty-state">
				<strong>Start with a player search or a ready-made comparison.</strong>
				<span>Pick up to four players to see DPM, component ratings, and career history side by side.</span>
			</div>
			<div class="starter-comparison-grid" aria-label="Starter comparisons">
				{#each STARTER_COMPARISONS as starter (starter.href)}
					<a class="starter-comparison" href={starter.href}>
						<strong>{starter.label}</strong>
						<span>{starter.detail}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.compare-search-panel {
		display: grid;
		gap: 6px;
		max-width: 420px;
		margin-bottom: 28px;
	}

	.compare-count {
		color: var(--text-muted);
		font-size: 12px;
	}

	.compare-empty-state {
		display: grid;
		gap: 14px;
		max-width: 720px;
		margin: 0 auto;
	}

	.compare-empty-state .empty-state {
		display: grid;
		gap: 8px;
		margin: 0;
	}

	.compare-empty-state .empty-state strong {
		color: var(--text);
		font-size: 15px;
	}

	.compare-empty-state .empty-state span {
		color: var(--text-secondary);
	}

	.starter-comparison-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 10px;
	}

	.starter-comparison {
		display: grid;
		gap: 4px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--text);
		padding: 12px 14px;
		transition: border-color 0.15s, background-color 0.15s;
	}

	.starter-comparison:hover {
		border-color: var(--accent);
		background: var(--bg-elevated);
		color: var(--text);
	}

	.starter-comparison strong {
		font-size: 13px;
		font-weight: 850;
	}

	.starter-comparison span {
		color: var(--text-secondary);
		font-size: 12px;
	}

	@media (max-width: 720px) {
		.starter-comparison-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
