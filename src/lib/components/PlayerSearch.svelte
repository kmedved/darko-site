<script>
    import { apiActivePlayers } from '$lib/api.js';
    import { formatSignedMetric } from '$lib/utils/csvPresets.js';

    let { onSelect, exclude = [] } = $props();

    let query = $state('');
    let results = $state([]);
    let allPlayers = $state([]);
    let showResults = $state(false);
    let loading = $state(true);
    let error = $state(null);
    let blurTimer = null;

    function normalizeId(value) {
        const parsed = Number.parseInt(String(value), 10);
        return Number.isInteger(parsed) ? parsed : null;
    }

    function hideResultsSoon() {
        clearTimeout(blurTimer);
        blurTimer = setTimeout(() => (showResults = false), 150);
    }

    $effect(() => {
        let cancelled = false;
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
            clearTimeout(blurTimer);
        };
    });

    $effect(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            results = [];
            return;
        }
        const excludeSet = new Set((exclude || []).map(normalizeId).filter((id) => id !== null));
        results = allPlayers
            .filter((p) => String(p.player_name || '').toLowerCase().includes(q) && !excludeSet.has(normalizeId(p.nba_id)))
            .slice(0, 8);
    });

    function selectPlayer(player) {
        onSelect(player);
        query = '';
        results = [];
        showResults = false;
    }

    function dpmClass(val) {
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }
</script>

<div class="search-wrapper">
    {#if loading}
        <input class="search-input" placeholder="Loading players..." disabled />
    {:else if error}
        <div class="error-msg">Failed to load players: {error}</div>
    {:else}
        <input
            class="search-input"
            placeholder="Search for a player..."
            bind:value={query}
            onfocus={() => {
                clearTimeout(blurTimer);
                showResults = true;
            }}
            onblur={hideResultsSoon}
        />
        {#if showResults && results.length > 0}
            <div class="search-results">
                {#each results as player}
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
            </div>
        {/if}
    {/if}
</div>
