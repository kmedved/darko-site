<script>
    import { getActivePlayers } from '$lib/supabase.js';
    import { exportCsvRows, leaderboardCsvColumns, formatMinutes, formatSignedMetric } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { buildLeaderboardCsvRows } from '$lib/utils/leaderboardCsv.js';

    let players = $state([]);
    let sortColumn = $state('_rank');
    let sortDirection = $state('asc');
    let loading = $state(true);
    let error = $state(null);

    const playerSortConfig = {
        _rank: { type: 'number' },
        player_name: { type: 'text' },
        team_name: { type: 'text' },
        position: { type: 'text' },
        tr_minutes: { type: 'number' },
        dpm: { type: 'number' },
        o_dpm: { type: 'number' },
        d_dpm: { type: 'number' },
        box_dpm: { type: 'number' }
    };

    const sortedPlayers = $derived.by(() =>
        getSortedRows(players, {
            sortColumn,
            sortDirection,
            sortConfigs: playerSortConfig
        })
    );

    function sortGlyph(column) {
        if (sortColumn !== column) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function toggleSort(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            return;
        }
        sortColumn = column;
        sortDirection = 'asc';
    }

    $effect(() => {
        getActivePlayers()
            .then((data = []) => {
                players = data.map((player, index) => ({ ...player, _rank: index + 1 }));
                loading = false;
            })
            .catch(err => { error = err.message; loading = false; });
    });

    function fmtMin(seconds) {
        return formatMinutes(seconds);
    }

    function dpmClass(val) {
        return parseFloat(val) >= 0 ? 'pos' : 'neg';
    }

    function exportPlayersCsv() {
        const rows = buildLeaderboardCsvRows(sortedPlayers);
        exportCsvRows({
            rows,
            columns: leaderboardCsvColumns,
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
                        <th
                            class="rank sortable {sortColumn === '_rank' ? 'active' : ''}"
                            onclick={() => toggleSort('_rank')}
                        >
                            # <span class="sort-indicator">{sortGlyph('_rank')}</span>
                        </th>
                        <th
                            class="name sortable {sortColumn === 'player_name' ? 'active' : ''}"
                            onclick={() => toggleSort('player_name')}
                        >
                            Player <span class="sort-indicator">{sortGlyph('player_name')}</span>
                        </th>
                        <th
                            class="team sortable {sortColumn === 'team_name' ? 'active' : ''}"
                            onclick={() => toggleSort('team_name')}
                        >
                            Team <span class="sort-indicator">{sortGlyph('team_name')}</span>
                        </th>
                        <th
                            class="position-col sortable {sortColumn === 'position' ? 'active' : ''}"
                            onclick={() => toggleSort('position')}
                        >
                            Pos <span class="sort-indicator">{sortGlyph('position')}</span>
                        </th>
                        <th
                            class="num sortable {sortColumn === 'tr_minutes' ? 'active' : ''}"
                            onclick={() => toggleSort('tr_minutes')}
                        >
                            Min <span class="sort-indicator">{sortGlyph('tr_minutes')}</span>
                        </th>
                        <th
                            class="num sortable {sortColumn === 'dpm' ? 'active' : ''}"
                            onclick={() => toggleSort('dpm')}
                        >
                            DPM <span class="sort-indicator">{sortGlyph('dpm')}</span>
                        </th>
                        <th
                            class="num sortable {sortColumn === 'o_dpm' ? 'active' : ''}"
                            onclick={() => toggleSort('o_dpm')}
                        >
                            ODPM <span class="sort-indicator">{sortGlyph('o_dpm')}</span>
                        </th>
                        <th
                            class="num sortable {sortColumn === 'd_dpm' ? 'active' : ''}"
                            onclick={() => toggleSort('d_dpm')}
                        >
                            DDPM <span class="sort-indicator">{sortGlyph('d_dpm')}</span>
                        </th>
                        <th
                            class="num sortable {sortColumn === 'box_dpm' ? 'active' : ''}"
                            onclick={() => toggleSort('box_dpm')}
                        >
                            Box <span class="sort-indicator">{sortGlyph('box_dpm')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each sortedPlayers as player, i}
                        <tr>
                            <td class="rank">{i + 1}</td>
                            <td class="name">
                                <a href="/compare?ids={player.nba_id}">{player.player_name}</a>
                            </td>
                            <td class="team">
                                {#if player.team_name}
                                    <a href="/team/{encodeURIComponent(player.team_name)}">{player.team_name}</a>
                                {:else}
                                    —
                                {/if}
                            </td>
                            <td class="position-col">{player.position || '—'}</td>
                            <td class="num">{fmtMin(player.tr_minutes)}</td>
                            <td class="num {dpmClass(player.dpm)}">{formatSignedMetric(player.dpm)}</td>
                            <td class="num {dpmClass(player.o_dpm)}">{formatSignedMetric(player.o_dpm)}</td>
                            <td class="num {dpmClass(player.d_dpm)}">{formatSignedMetric(player.d_dpm)}</td>
                            <td class="num {dpmClass(player.box_dpm)}">{formatSignedMetric(player.box_dpm)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .table-wrapper {
        margin-bottom: 40px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: 210px;
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

    th.sortable {
        cursor: pointer;
        user-select: none;
    }

    th.sortable:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
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

    .team a {
        color: inherit;
    }

    .team a:hover {
        color: var(--accent);
        text-decoration: underline;
    }

    .position-col {
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

    .sort-indicator {
        margin-left: 6px;
        opacity: 0.6;
        font-size: 10px;
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    .pos { color: var(--positive); }
    .neg { color: var(--negative); }

    @media (max-width: 640px) {
        th, td { padding: 6px 8px; }
        .team { display: none; }
    }
</style>
