<script>
	import PlayerSearch from '$lib/components/PlayerSearch.svelte';
	import PlayerCard from '$lib/components/PlayerCard.svelte';
	import { page } from '$app/stores';
	import { apiPlayerHistory } from '$lib/api.js';
	import { exportCsvRows, compareCsvColumns } from '$lib/utils/csvPresets.js';
	import { buildComparePlayer, getComparePlayerColors } from '$lib/utils/compareUtils.js';

    let selectedPlayers = $state([]);
    let pendingLoads = $state(0);
    let loading = $derived(pendingLoads > 0);
    let error = $state(null);
    const PLAYER_COLORS = getComparePlayerColors();

	$effect(() => {
        const ids = $page.url.searchParams.get('ids');
        if (!ids || selectedPlayers.length > 0) return;

        const idList = [...new Set(
            ids
                .split(',')
                .map((value) => Number.parseInt(value, 10))
                .filter((id) => Number.isInteger(id) && id > 0)
        )].slice(0, 4);

        if (idList.length === 0) return;

        void (async () => {
            const loads = idList.map((id) => loadPlayer(id));
            await Promise.all(loads);
        })();
    });

    async function loadPlayer(nbaId) {
		const id = Number.parseInt(nbaId, 10);
		if (!Number.isInteger(id) || id <= 0) return;
		if (selectedPlayers.some(p => p.nba_id === id)) return;
		// Performance-first preview mode: cap compare history to keep this route lightweight.
		if (selectedPlayers.length >= 4) return;

        pendingLoads += 1;
		error = null;
		try {
			// Keep preview history capped here to keep compare UI fast and cheap.
			const rows = await apiPlayerHistory(id, { limit: 300 });
			if (!rows.length) {
				error = `No history found for player ${id}`;
				return;
            }

            const current = rows.at(-1);
            selectedPlayers = [
                ...selectedPlayers,
                buildComparePlayer({
                    currentRow: current || {},
                    rows,
                    color: PLAYER_COLORS[selectedPlayers.length % PLAYER_COLORS.length]
                })
            ];
        } catch (err) {
            error = err.message;
        } finally {
            pendingLoads = Math.max(0, pendingLoads - 1);
        }
    }

    function addPlayer(player) {
        loadPlayer(player.nba_id);
    }

    function removePlayer(nbaId) {
        selectedPlayers = selectedPlayers.filter(p => p.nba_id !== nbaId);
    }

    const excludeIds = $derived(selectedPlayers.map(p => p.nba_id));

    const gridCols = $derived(
        selectedPlayers.length <= 1 ? '1fr' :
        selectedPlayers.length === 2 ? '1fr 1fr' :
        selectedPlayers.length === 3 ? '1fr 1fr 1fr' :
        '1fr 1fr 1fr 1fr'
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
    <title>Compare Players \u2014 DARKO DPM</title>
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

    {#if loading}
        <div class="loading">Loading...</div>
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
