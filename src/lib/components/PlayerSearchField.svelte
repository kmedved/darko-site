<script>
    import { formatSignedMetric } from '$lib/utils/csvPresets.js';
    import { PLAYER_SEARCH_MIN_QUERY_LENGTH } from '$lib/utils/playerSearch.js';

    let {
        query = $bindable(''),
        results = [],
        placeholder = 'Search for a player...',
        disabled = false,
        minQueryLength = PLAYER_SEARCH_MIN_QUERY_LENGTH,
        statusMessage = null,
        emptyMessage = 'No matches',
        onQueryChange = () => {},
        onSelect = () => {}
    } = $props();

    let showResults = $state(false);
    let blurTimer = null;

    const trimmedQuery = $derived(query.trim());
    const shouldShowPanel = $derived(
        !disabled && showResults && trimmedQuery.length >= minQueryLength
    );

    function handleInput(event) {
        query = event.currentTarget.value;
        onQueryChange(query);
    }

    function handleFocus() {
        clearTimeout(blurTimer);
        showResults = true;
    }

    function hideResultsSoon() {
        clearTimeout(blurTimer);
        blurTimer = setTimeout(() => (showResults = false), 150);
    }

    function selectPlayer(player) {
        onSelect(player);
        query = '';
        onQueryChange(query);
        showResults = false;
    }

    function dpmClass(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return '';
        return parsed >= 0 ? 'pos' : 'neg';
    }

    $effect(() => {
        return () => {
            clearTimeout(blurTimer);
        };
    });
</script>

<div class="search-wrapper">
    <input
        class="search-input"
        bind:value={query}
        {disabled}
        {placeholder}
        oninput={handleInput}
        onfocus={handleFocus}
        onblur={hideResultsSoon}
    />

    {#if shouldShowPanel}
        <div class="search-results">
            {#if statusMessage}
                <div class="search-loading">{statusMessage}</div>
            {:else if results.length > 0}
                {#each results as player (player.nba_id)}
                    <button
                        type="button"
                        class="search-result-item"
                        onmousedown={() => selectPlayer(player)}
                    >
                        <span>
                            {player.player_name}
                            <span class="meta">{player.team_name} · {player.position || '?'}</span>
                        </span>
                        <span class="dpm-val {dpmClass(player.dpm)}">
                            {formatSignedMetric(player.dpm)}
                        </span>
                    </button>
                {/each}
            {:else if emptyMessage}
                <div class="search-loading">{emptyMessage}</div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .search-loading {
        padding: 8px 12px;
        color: var(--text-muted);
        font-size: 13px;
    }
</style>
