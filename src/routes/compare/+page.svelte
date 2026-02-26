<script>
    import PlayerSearch from '$lib/components/PlayerSearch.svelte';
    import PlayerCard from '$lib/components/PlayerCard.svelte';
    import { getPlayerCurrent } from '$lib/supabase.js';
    import { page } from '$app/stores';
    import { exportCsvRows, compareCsvColumns } from '$lib/utils/csvPresets.js';

    let selectedPlayers = $state([]);
    let pendingLoads = $state(0);
    let loading = $derived(pendingLoads > 0);
    let error = $state(null);

    $effect(() => {
        const ids = $page.url.searchParams.get('ids');
        if (ids && selectedPlayers.length === 0) {
            const idList = ids.split(',').map(Number).filter(Boolean);
            for (const id of idList) {
                loadPlayer(id);
            }
        }
    });

    async function loadPlayer(nbaId) {
        if (selectedPlayers.some(p => p.nba_id === nbaId)) return;
        if (selectedPlayers.length >= 4) return;

        pendingLoads += 1;
        error = null;
        try {
            const data = await getPlayerCurrent(nbaId);
            selectedPlayers = [...selectedPlayers, data];
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
                <PlayerCard {player} onRemove={() => removePlayer(player.nba_id)} />
            {/each}
        </div>
    {:else if !loading}
        <div class="empty-state">
            Search for players above to start comparing.
        </div>
    {/if}
</div>
