<script>
	import { goto } from '$app/navigation';
	import PlayerSearch from '$lib/components/PlayerSearch.svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { exportCsvRows, compareCsvColumns } from '$lib/utils/csvPresets.js';

	let { data } = $props();

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

<div class="container">
	<div class="page-header">
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
				>
					Download CSV
				</button>
			</div>
		</div>
	</div>

	<div style="max-width: 420px; margin-bottom: 28px;">
		<PlayerSearch onSelect={addPlayer} exclude={excludeIds} />
		{#if selectedPlayers.length > 0}
			<div style="margin-top: 6px; font-size: 12px; color: var(--text-muted);">
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
		<div class="empty-state">
			Search for players above to start comparing.
		</div>
	{/if}
</div>
