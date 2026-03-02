<script>
    import { apiRateVote, apiRateLeaderboard } from '$lib/api.js';
    import RatePlayerCard from '$lib/components/RatePlayerCard.svelte';

    let pair = $state([]);
    let loading = $state(true);
    let voting = $state(false);
    let errorMsg = $state(null);
    let totalVotes = $state(0);
    let lastResult = $state(null);
    let showLeaderboard = $state(false);
    let leaderboard = $state([]);
    let leaderboardLoading = $state(false);

    $effect(() => {
        loadInitialPair();
    });

    async function loadInitialPair() {
        loading = true;
        errorMsg = null;
        try {
            const res = await fetch('/api/rate/pair');
            if (!res.ok) throw new Error('Failed to load players');
            pair = await res.json();
        } catch (e) {
            errorMsg = e?.message || 'Failed to load players';
        } finally {
            loading = false;
        }
    }

    async function skip() {
        if (voting) return;
        loading = true;
        errorMsg = null;
        lastResult = null;
        try {
            const res = await fetch('/api/rate/pair');
            if (!res.ok) throw new Error('Failed to load players');
            pair = await res.json();
        } catch (e) {
            errorMsg = e?.message || 'Failed to load players';
        } finally {
            loading = false;
        }
    }

    async function vote(winnerId) {
        if (voting || pair.length < 2) return;
        voting = true;
        errorMsg = null;

        const loserId = pair.find((p) => p.nba_id !== winnerId)?.nba_id;
        if (!loserId) {
            voting = false;
            return;
        }

        try {
            const response = await apiRateVote(winnerId, loserId);
            lastResult = response.result;
            totalVotes += 1;

            await new Promise((resolve) => setTimeout(resolve, 600));

            pair = response.nextPair;
            lastResult = null;
        } catch (e) {
            errorMsg = e?.message || 'Failed to record vote';
        } finally {
            voting = false;
        }
    }

    async function toggleLeaderboard() {
        showLeaderboard = !showLeaderboard;
        if (showLeaderboard && leaderboard.length === 0) {
            leaderboardLoading = true;
            try {
                leaderboard = await apiRateLeaderboard(50);
            } catch {
                // silently handle
            } finally {
                leaderboardLoading = false;
            }
        }
    }

    async function refreshLeaderboard() {
        leaderboardLoading = true;
        try {
            leaderboard = await apiRateLeaderboard(50);
        } catch {
            // silently handle
        } finally {
            leaderboardLoading = false;
        }
    }

    function formatElo(value) {
        return value != null ? Math.round(value) : '—';
    }

    function formatWinPct(wins, total) {
        if (!total || total === 0) return '—';
        return (((wins || 0) / total) * 100).toFixed(1) + '%';
    }
</script>

<svelte:head>
    <title>Rate Players — DARKO DPM</title>
</svelte:head>

<div class="container rate-page">
    <div class="page-header">
        <h1>Rate a Player</h1>
        <p class="page-subtitle">Who is the better player? Click to vote.</p>
    </div>

    {#if errorMsg}
        <div class="error-msg">{errorMsg}</div>
    {/if}

    {#if loading}
        <div class="loading-state">Loading matchup&hellip;</div>
    {:else if pair.length === 2}
        <div class="rate-versus">
            <RatePlayerCard
                player={pair[0]}
                onclick={() => vote(pair[0].nba_id)}
                disabled={voting}
                chosen={lastResult?.winnerId === pair[0].nba_id}
                result={lastResult}
            />
            <div class="versus-divider">
                <span class="versus-text">VS</span>
            </div>
            <RatePlayerCard
                player={pair[1]}
                onclick={() => vote(pair[1].nba_id)}
                disabled={voting}
                chosen={lastResult?.winnerId === pair[1].nba_id}
                result={lastResult}
            />
        </div>

        <div class="rate-actions">
            <button class="action-btn" type="button" onclick={skip} disabled={voting}>
                Skip
            </button>
            <button class="action-btn" type="button" onclick={toggleLeaderboard}>
                {showLeaderboard ? 'Hide' : 'Show'} Leaderboard
            </button>
        </div>

        {#if totalVotes > 0}
            <div class="vote-counter">
                {totalVotes} vote{totalVotes === 1 ? '' : 's'} this session
            </div>
        {/if}
    {/if}

    {#if showLeaderboard}
        <div class="leaderboard-section">
            <div class="leaderboard-header">
                <h2>Fan Elo Leaderboard</h2>
                <button class="action-btn action-btn--sm" type="button" onclick={refreshLeaderboard} disabled={leaderboardLoading}>
                    Refresh
                </button>
            </div>
            {#if leaderboardLoading}
                <div class="loading-state">Loading leaderboard&hellip;</div>
            {:else if leaderboard.length > 0}
                <div class="leaderboard-table-wrap">
                    <table class="leaderboard-table">
                        <thead>
                            <tr>
                                <th class="col-rk">#</th>
                                <th class="col-name">Player</th>
                                <th class="col-num">Elo</th>
                                <th class="col-num">W</th>
                                <th class="col-num">L</th>
                                <th class="col-num">W%</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each leaderboard as player, i}
                                <tr>
                                    <td class="col-rk">{i + 1}</td>
                                    <td class="col-name">
                                        <span class="lb-player-name">{player.player_name || '—'}</span>
                                        {#if player.position || player.current_team}
                                            <span class="lb-player-meta">
                                                {[player.position, player.current_team].filter(Boolean).join(' · ')}
                                            </span>
                                        {/if}
                                    </td>
                                    <td class="col-num col-elo">{formatElo(player.elo_rating)}</td>
                                    <td class="col-num">{player.wins ?? 0}</td>
                                    <td class="col-num">{player.losses ?? 0}</td>
                                    <td class="col-num">{formatWinPct(player.wins, player.total_comparisons)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {:else}
                <p class="empty-state">No votes recorded yet. Start voting above!</p>
            {/if}
        </div>
    {/if}
</div>

<style>
    .rate-page {
        max-width: 860px;
        padding-bottom: 80px;
    }

    .page-header {
        text-align: center;
        margin-bottom: 32px;
    }

    .page-header h1 {
        font-size: 28px;
        font-weight: 700;
        letter-spacing: -0.03em;
        margin: 0 0 6px;
    }

    .page-subtitle {
        font-size: 14px;
        color: var(--text-secondary);
        margin: 0;
    }

    .rate-versus {
        display: flex;
        gap: 20px;
        align-items: stretch;
        margin-bottom: 20px;
    }

    .rate-versus > :global(.rate-card) {
        flex: 1;
    }

    .versus-divider {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 0 4px;
    }

    .versus-text {
        font-size: 16px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
    }

    .rate-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
        margin-bottom: 12px;
    }

    .action-btn {
        appearance: none;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 13px;
        padding: 7px 18px;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s;
    }

    .action-btn:hover:not(:disabled) {
        border-color: var(--accent);
        color: var(--text);
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .action-btn--sm {
        font-size: 12px;
        padding: 4px 12px;
    }

    .vote-counter {
        text-align: center;
        font-size: 12px;
        color: var(--text-muted);
        font-family: var(--font-mono);
    }

    .loading-state {
        text-align: center;
        padding: 60px 20px;
        color: var(--text-muted);
        font-size: 14px;
    }

    .error-msg {
        text-align: center;
        padding: 16px;
        margin-bottom: 20px;
        color: var(--negative);
        font-size: 13px;
        border: 1px solid var(--negative);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
    }

    .empty-state {
        text-align: center;
        color: var(--text-muted);
        font-size: 13px;
        padding: 20px;
    }

    /* Leaderboard */
    .leaderboard-section {
        margin-top: 40px;
        border-top: 1px solid var(--border);
        padding-top: 24px;
    }

    .leaderboard-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
    }

    .leaderboard-header h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        letter-spacing: -0.02em;
    }

    .leaderboard-table-wrap {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .leaderboard-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
    }

    .leaderboard-table th {
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        padding: 8px 10px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }

    .leaderboard-table td {
        padding: 7px 10px;
        border-bottom: 1px solid var(--border);
        white-space: nowrap;
    }

    .leaderboard-table tbody tr:hover {
        background: var(--bg-hover);
    }

    .col-rk {
        width: 36px;
        text-align: center;
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 12px;
    }

    .col-name {
        min-width: 160px;
    }

    .col-num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
    }

    th.col-num {
        text-align: right;
    }

    th.col-rk {
        text-align: center;
    }

    .col-elo {
        font-weight: 600;
        color: var(--accent);
    }

    .lb-player-name {
        font-weight: 500;
    }

    .lb-player-meta {
        margin-left: 8px;
        font-size: 11px;
        color: var(--text-muted);
    }

    @media (max-width: 768px) {
        .rate-versus {
            flex-direction: column;
            gap: 12px;
        }

        .versus-divider {
            padding: 2px 0;
        }

        .page-header h1 {
            font-size: 22px;
        }

        .lb-player-meta {
            display: block;
            margin-left: 0;
            margin-top: 2px;
        }
    }
</style>
