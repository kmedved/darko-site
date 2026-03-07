<script>
    import { apiActivePlayers } from '$lib/api.js';
    import PlayerSearchField from './PlayerSearchField.svelte';
    import { filterPlayerSearchResults } from '$lib/utils/playerSearch.js';

    let { onSelect, exclude = [] } = $props();

    let query = $state('');
    let allPlayers = $state([]);
    let loading = $state(true);
    let error = $state(null);

    const results = $derived(filterPlayerSearchResults(allPlayers, query, exclude));

    $effect(() => {
        let cancelled = false;
        loading = true;
        error = null;

        apiActivePlayers()
            .then(data => {
                if (cancelled) return;
                allPlayers = Array.isArray(data) ? data : [];
                loading = false;
            })
            .catch(err => {
                if (cancelled) return;
                error = err?.message || 'Failed to load players';
                loading = false;
            });

        return () => {
            cancelled = true;
        };
    });
</script>

{#if error}
    <div class="error-msg">Failed to load players: {error}</div>
{:else}
    <PlayerSearchField
        bind:query
        {results}
        disabled={loading}
        placeholder={loading ? 'Loading players...' : 'Search for a player...'}
        {onSelect}
    />
{/if}
