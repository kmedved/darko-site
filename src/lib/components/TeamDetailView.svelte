<script>
    import WinDistChart from './WinDistChart.svelte';
    import SeedChart from './SeedChart.svelte';
    import { exportCsvRows, formatMinutes, formatSignedMetric, formatFixed, formatOrDash } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';

    let {
        teamName = '',
        backHref = '/',
        backLabel = '← Back',
        players = [],
        sim = null,
        winDist = []
    } = $props();

    let sortColumn = $state('player_name');
    let sortDirection = $state('asc');

    const teamPlayers = $derived(players || []);
    const teamWinDist = $derived(winDist || []);

    function dpmClass(val) {
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

    function pctClass(val) {
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '';
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
        getSortedRows(teamPlayers, {
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
        const parsed = parseFloat(parts[0]);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function exportTeamCsv() {
        exportCsvRows({
            rows: sortedPlayers,
            columns: [
                { header: 'Player', accessor: 'player_name', format: formatOrDash },
                { header: 'Pos', accessor: 'position', format: formatOrDash },
                { header: 'Min', accessor: 'tr_minutes', format: formatMinutes },
                { header: 'DPM', accessor: 'dpm', format: formatSignedMetric },
                { header: 'ODPM', accessor: 'o_dpm', format: formatSignedMetric },
                { header: 'DDPM', accessor: 'd_dpm', format: formatSignedMetric },
                { header: 'Box', accessor: 'box_dpm', format: formatSignedMetric },
            ],
            filename: `${teamName || 'team'}-players.csv`
        });
    }
</script>

<div class="container">
    <a class="back-link" href={backHref}>{backLabel}</a>

    <div class="page-header">
        <div class="page-header-toolbar">
            <div>
                <h1>{teamName || 'Team'}</h1>
                {#if sim}
                    <p>{sim.conference}ern Conference · Current: {sim.Current} · Projected: {formatFixed(sim.W)}-{formatFixed(sim.L)}</p>
                {:else}
                    <p>Current ratings for all active players on the team.</p>
                {/if}
            </div>
            <div class="page-header-actions">
                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportTeamCsv}
                    disabled={sortedPlayers.length === 0}
                >
                    Download Table CSV
                </button>
            </div>
        </div>
    </div>

    {#if sim}
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Playoff%</div>
                <div class="stat-value pct {pctClass(sim.Playoffs)}">{formatFixed(sim.Playoffs)}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Conf</div>
                <div class="stat-value pct {pctClass(sim['Win Conf'])}">{formatFixed(sim['Win Conf'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Finals</div>
                <div class="stat-value pct {pctClass(sim['Win Finals'])}">{formatFixed(sim['Win Finals'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">SRS</div>
                <div class="stat-value { (() => {
                    const n = parseFloat(sim.SRS);
                    if (!Number.isFinite(n)) return '';
                    return n >= 0 ? 'srs-pos' : 'srs-neg';
                })() }">{formatFixed(sim.SRS, 2)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Lottery%</div>
                <div class="stat-value pct {pctClass(sim['Lottery%'])}">{formatFixed(sim['Lottery%'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">E[Pick]</div>
                <div class="stat-value">{formatFixed(sim.ExpPick)}</div>
            </div>
        </div>
    {/if}

    {#if teamPlayers.length === 0}
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

    {#if sim && teamWinDist.length > 0}
        <h2 class="section-title">Win Distribution</h2>
        <div class="chart-card">
            <WinDistChart data={teamWinDist} meanWins={parseFloat(sim.W)} currentWins={currentWins(sim.Current)} />
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
    }

    .empty-state {
        color: var(--text-muted);
        margin: 16px 0;
    }

    .srs-pos { color: var(--positive); }
    .srs-neg { color: var(--negative); }
    .chart-card {
        margin-bottom: 24px;
    }
</style>
