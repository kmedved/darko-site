<script>
    import { getActivePlayers } from '$lib/supabase.js';
    import { downloadCsv } from '$lib/utils/csv.js';

    let players = $state([]);
    let loading = $state(true);
    let error = $state(null);

    const csvColumns = [
        { header: '#', accessor: 'rank' },
        { header: 'Player', accessor: 'player_name' },
        { header: 'Team', accessor: 'team_name' },
        { header: 'Pos', accessor: 'position', format: (value) => value || '—' },
        { header: 'Min', accessor: 'tr_minutes', format: fmtMin },
        { header: 'DPM', accessor: 'dpm', format: fmt },
        { header: 'ODPM', accessor: 'o_dpm', format: fmt },
        { header: 'DDPM', accessor: 'd_dpm', format: fmt },
        { header: 'Box', accessor: 'box_dpm', format: fmt },
    ];

    $effect(() => {
        getActivePlayers()
            .then(data => { players = data; loading = false; })
            .catch(err => { error = err.message; loading = false; });
    });

    function fmt(val, decimals = 1) {
        if (val === null || val === undefined) return '—';
        const n = parseFloat(val);
        const sign = n >= 0 ? '+' : '';
        return `${sign}${n.toFixed(decimals)}`;
    }

    function fmtMin(seconds) {
        if (!seconds) return '—';
        return (seconds / 60).toFixed(1);
    }

    function dpmClass(val) {
        return parseFloat(val) >= 0 ? 'pos' : 'neg';
    }

    function exportPlayersCsv() {
        const rows = players.map((player, index) => ({ ...player, rank: index + 1 }));
        downloadCsv({
            rows,
            columns: csvColumns,
            filename: 'darko-dpm-leaderboard.csv'
        });
    }
</script>

<svelte:head>
    <title>DARKO DPM — NBA Player Projections</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <div class="page-header-toolbar">
            <div>
                <h1>DPM Leaderboard</h1>
                <p>Daily Player Metrics for every NBA player, updated nightly.</p>
            </div>
            <div class="page-header-actions">
                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportPlayersCsv}
                    disabled={loading || !!error || players.length === 0}
                >
                    Download CSV
                </button>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="loading">Loading players...</div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th class="rank">#</th>
                        <th class="name">Player</th>
                        <th class="team">Team</th>
                        <th class="pos">Pos</th>
                        <th class="num">Min</th>
                        <th class="num">DPM</th>
                        <th class="num">ODPM</th>
                        <th class="num">DDPM</th>
                        <th class="num">Box</th>
                    </tr>
                </thead>
                <tbody>
                    {#each players as player, i}
                        <tr>
                            <td class="rank">{i + 1}</td>
                            <td class="name">
                                <a href="/compare?ids={player.nba_id}">{player.player_name}</a>
                            </td>
                            <td class="team">{player.team_name}</td>
                            <td class="pos">{player.position || '—'}</td>
                            <td class="num">{fmtMin(player.tr_minutes)}</td>
                            <td class="num {dpmClass(player.dpm)}">{fmt(player.dpm)}</td>
                            <td class="num {dpmClass(player.o_dpm)}">{fmt(player.o_dpm)}</td>
                            <td class="num {dpmClass(player.d_dpm)}">{fmt(player.d_dpm)}</td>
                            <td class="num {dpmClass(player.box_dpm)}">{fmt(player.box_dpm)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .table-wrapper {
        overflow-x: auto;
        margin-bottom: 40px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: 52px;
        z-index: 20;
        background: var(--bg-surface);
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 8px 12px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        white-space: nowrap;
    }

    td {
        padding: 7px 12px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    tr:hover td {
        background: var(--bg-elevated);
    }

    .rank {
        width: 36px;
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 11px;
    }

    .name { font-weight: 500; }
    .name a { color: var(--text); }
    .name a:hover { color: var(--accent); }

    .team {
        color: var(--text-secondary);
        font-size: 12px;
    }

    .pos {
        color: var(--text-muted);
        font-size: 12px;
        width: 40px;
    }

    .num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
    }

    th.num { text-align: right; }

    .pos { color: var(--positive); }
    .neg { color: var(--negative); }

    @media (max-width: 640px) {
        th, td { padding: 6px 8px; }
        .team { display: none; }
    }
</style>
