<script>
    import WinDistChart from './WinDistChart.svelte';
    import SeedChart from './SeedChart.svelte';
    import { getActivePlayers, supabase } from '$lib/supabase.js';
    import { exportCsvRows, formatMinutes, formatSignedMetric, teamPlayersCsvColumns } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { createRequestSequencer } from '$lib/utils/requestSequencer.js';

    let { teamName = '', backHref = '/', backLabel = '← Back' } = $props();

    let players = $state([]);
    let sortColumn = $state('player_name');
    let sortDirection = $state('asc');
    let sim = $state(null);
    let winDist = $state([]);
    let loading = $state(true);
    let simLoading = $state(true);
    let error = $state(null);
    const loadRequestSequencer = createRequestSequencer();

    function dpmClass(val) {
        return parseFloat(val) >= 0 ? 'pos' : 'neg';
    }

    function fmt(val, d = 1) {
        if (val === null || val === undefined) return '—';
        return parseFloat(val).toFixed(d);
    }

    function pctClass(val) {
        const n = parseFloat(val);
        if (n >= 80) return 'high';
        if (n >= 40) return 'mid';
        if (n > 0) return 'low';
        return 'zero';
    }

    const teamPlayersSortConfig = {
        player_name: { type: 'text' },
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
            sortConfigs: teamPlayersSortConfig
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

    function currentWins(currentStr) {
        if (!currentStr) return 0;
        const parts = currentStr.split('-');
        return parseInt(parts[0]) || 0;
    }

    function exportTeamCsv() {
        exportCsvRows({
            rows: sortedPlayers,
            columns: teamPlayersCsvColumns,
            filename: `${teamName || 'team'}-players.csv`
        });
    }

    $effect(() => {
        const normalizedTeam = (teamName || '').trim();
        const requestId = loadRequestSequencer.next();

        if (!normalizedTeam) {
            error = 'Team not specified';
            loading = false;
            simLoading = false;
            players = [];
            winDist = [];
            sim = null;
            return;
        }

        error = null;
        loading = true;
        simLoading = true;
        players = [];
        winDist = [];
        sim = null;

        Promise.all([
            getActivePlayers({ teamName: normalizedTeam }),
            supabase.from('season_sim').select('*').eq('team_name', normalizedTeam).limit(1),
            supabase.from('win_distribution').select('*').eq('team_name', normalizedTeam).order('wins', { ascending: true })
        ])
            .then(([playerData, simRes, distRes]) => {
                if (!loadRequestSequencer.isCurrent(requestId)) return;

                players = playerData || [];
                if (simRes?.error) {
                    error = simRes.error.message;
                    sim = null;
                } else if (simRes?.data && simRes.data.length > 0) {
                    sim = simRes.data[0];
                } else {
                    sim = null;
                }

                if (distRes?.error) {
                    if (!error) {
                        error = distRes.error.message;
                    }
                    winDist = [];
                } else if (distRes?.data) {
                    winDist = distRes.data;
                }

                simLoading = false;
                loading = false;
            })
            .catch((err) => {
                if (!loadRequestSequencer.isCurrent(requestId)) return;
                error = err?.message || 'Failed to load team data';
                players = [];
                sim = null;
                winDist = [];
                simLoading = false;
                loading = false;
            });
    });
</script>

<div class="container">
    <a class="back-link" href={backHref}>{backLabel}</a>

    <div class="page-header">
        <div class="page-header-toolbar">
            <div>
                <h1>{teamName || 'Team'}</h1>
                {#if sim}
                    <p>{sim.conference}ern Conference · Current: {sim.Current} · Projected: {fmt(sim.W)}-{fmt(sim.L)}</p>
                {:else}
                    <p>Current ratings for all active players on the team.</p>
                {/if}
            </div>
            <div class="page-header-actions">
                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportTeamCsv}
                    disabled={loading || sortedPlayers.length === 0}
                >
                    Download Table CSV
                </button>
            </div>
        </div>
    </div>

    {#if !simLoading && sim}
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Playoff%</div>
                <div class="stat-value pct {pctClass(sim.Playoffs)}">{fmt(sim.Playoffs)}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Conf</div>
                <div class="stat-value pct {pctClass(sim['Win Conf'])}">{fmt(sim['Win Conf'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Finals</div>
                <div class="stat-value pct {pctClass(sim['Win Finals'])}">{fmt(sim['Win Finals'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">SRS</div>
                <div class="stat-value {parseFloat(sim.SRS) >= 0 ? 'srs-pos' : 'srs-neg'}">{fmt(sim.SRS, 2)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Lottery%</div>
                <div class="stat-value pct {pctClass(sim['Lottery%'])}">{fmt(sim['Lottery%'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">E[Pick]</div>
                <div class="stat-value">{fmt(sim.ExpPick)}</div>
            </div>
        </div>
    {/if}

    {#if loading}
        <div class="loading">Loading team roster...</div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if players.length === 0}
        <div class="empty-state">No active players found for {teamName}.</div>
    {:else}
        <h2 class="section-title">Players</h2>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th class="name sortable {sortColumn === 'player_name' ? 'active' : ''}" onclick={() => toggleSort('player_name')}>
                            Player <span class="sort-indicator">{sortGlyph('player_name')}</span>
                        </th>
                        <th class="pos-col sortable {sortColumn === 'position' ? 'active' : ''}" onclick={() => toggleSort('position')}>
                            Pos <span class="sort-indicator">{sortGlyph('position')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'tr_minutes' ? 'active' : ''}" onclick={() => toggleSort('tr_minutes')}>
                            Min <span class="sort-indicator">{sortGlyph('tr_minutes')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'dpm' ? 'active' : ''}" onclick={() => toggleSort('dpm')}>
                            DPM <span class="sort-indicator">{sortGlyph('dpm')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'o_dpm' ? 'active' : ''}" onclick={() => toggleSort('o_dpm')}>
                            ODPM <span class="sort-indicator">{sortGlyph('o_dpm')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'd_dpm' ? 'active' : ''}" onclick={() => toggleSort('d_dpm')}>
                            DDPM <span class="sort-indicator">{sortGlyph('d_dpm')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'box_dpm' ? 'active' : ''}" onclick={() => toggleSort('box_dpm')}>
                            Box <span class="sort-indicator">{sortGlyph('box_dpm')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each sortedPlayers as player}
                        <tr>
                            <td class="name">
                                <a href={`/compare?ids=${player.nba_id}`}>{player.player_name}</a>
                            </td>
                            <td class="position">{player.position || '—'}</td>
                            <td class="num">{formatMinutes(player.tr_minutes)}</td>
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

    {#if !simLoading && sim && winDist.length > 0}
        <h2 class="section-title">Win Distribution</h2>
        <div class="chart-card">
            <WinDistChart data={winDist} meanWins={parseFloat(sim.W)} currentWins={currentWins(sim.Current)} />
        </div>

        <h2 class="section-title">Seed Probabilities</h2>
        <div class="chart-card">
            <SeedChart team={sim} />
        </div>
    {/if}
</div>

<style>
    .back-link {
        display: inline-block;
        margin: 10px 0 22px;
        font-size: 13px;
        color: var(--text-muted);
    }

    .back-link:hover {
        color: var(--accent);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px;
        margin-bottom: 28px;
    }

    .stat-box {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 14px 16px;
        text-align: center;
    }

    .stat-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        margin-bottom: 6px;
    }

    .stat-value {
        font-family: var(--font-mono);
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
    }

    .stat-value.pct.high { color: var(--positive); }
    .stat-value.pct.mid { color: var(--accent); }
    .stat-value.pct.low { color: var(--text-secondary); }
    .stat-value.pct.zero { color: var(--text-muted); }
    .stat-value.srs-pos { color: var(--positive); }
    .stat-value.srs-neg { color: var(--negative); }

    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 8px 0 16px;
        letter-spacing: -0.01em;
    }

    .table-wrapper {
        margin-bottom: 32px;
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
        cursor: pointer;
        user-select: none;
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

    th:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    .sort-indicator {
        margin-left: 6px;
        opacity: 0.6;
        font-size: 10px;
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    td {
        padding: 7px 12px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    tr:hover td {
        background: var(--bg-elevated);
    }

    .name {
        font-weight: 500;
    }

    .name a {
        color: var(--text);
    }

    .name a:hover {
        color: var(--accent);
    }

    .num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
    }

    th.num { text-align: right; }

    .position {
        color: var(--text-muted);
        width: 46px;
        font-size: 12px;
    }

    .pos { color: var(--positive); }
    .neg { color: var(--negative); }

    .chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 8px;
    }

    @media (max-width: 768px) {
        .stats-grid { grid-template-columns: repeat(3, 1fr); }
    }

    @media (max-width: 480px) {
        .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 640px) {
        th, td { padding: 6px 8px; }
    }
</style>
