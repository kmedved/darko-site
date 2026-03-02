<script>
    import WinDistChart from './WinDistChart.svelte';
    import SeedChart from './SeedChart.svelte';
    import {
        exportCsvRows,
        formatMinutes,
        formatSignedMetric,
        formatFixed,
        formatOrDash,
        formatPercent
    } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';

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
        box_dpm: { type: 'number' },
        on_off_dpm: { type: 'number' },
        bayes_rapm_total: { type: 'number' },
        x_minutes: { type: 'number' },
        x_pace: { type: 'number' },
        x_pts_100: { type: 'number' },
        x_ast_100: { type: 'number' },
        x_fg_pct: { type: 'number' },
        x_fg3_pct: { type: 'number' },
        x_ft_pct: { type: 'number' }
    };

    const teamPlayerColumns = [
        { key: 'player_name', label: 'Player', alignClass: 'name', dataType: 'text' },
        { key: 'position', label: 'Pos', alignClass: 'pos-col', dataType: 'text' },
        { key: 'tr_minutes', label: 'Min', alignClass: 'num', dataType: 'number', metricKey: 'tr_minutes' },
        { key: 'dpm', label: 'DPM', alignClass: 'num', dataType: 'number', metricKey: 'dpm' },
        { key: 'o_dpm', label: 'ODPM', alignClass: 'num', dataType: 'number', metricKey: 'o_dpm' },
        { key: 'd_dpm', label: 'DDPM', alignClass: 'num', dataType: 'number', metricKey: 'd_dpm' },
        { key: 'box_dpm', label: 'Box', alignClass: 'num', dataType: 'number', metricKey: 'box_dpm' },
        { key: 'on_off_dpm', label: 'On/Off', alignClass: 'num', dataType: 'number', metricKey: 'on_off_dpm' },
        { key: 'bayes_rapm_total', label: 'RAPM', alignClass: 'num', dataType: 'number', metricKey: 'bayes_rapm_total' },
        { key: 'x_minutes', label: 'MPG', alignClass: 'num', dataType: 'number', metricKey: 'x_minutes' },
        { key: 'x_pace', label: 'Pace', alignClass: 'num', dataType: 'number', metricKey: 'x_pace' },
        { key: 'x_pts_100', label: 'Pts/100', alignClass: 'num', dataType: 'number', metricKey: 'x_pts_100' },
        { key: 'x_ast_100', label: 'Ast/100', alignClass: 'num', dataType: 'number', metricKey: 'x_ast_100' },
        { key: 'x_fg_pct', label: 'FG%', alignClass: 'num', dataType: 'number', metricKey: 'x_fg_pct' },
        { key: 'x_fg3_pct', label: '3P%', alignClass: 'num', dataType: 'number', metricKey: 'x_fg3_pct' },
        { key: 'x_ft_pct', label: 'FT%', alignClass: 'num', dataType: 'number', metricKey: 'x_ft_pct' }
    ];

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
                { header: 'On/Off DPM', accessor: 'on_off_dpm', format: formatSignedMetric },
                { header: 'RAPM', accessor: 'bayes_rapm_total', format: formatSignedMetric },
                { header: 'MPG', accessor: 'x_minutes', format: (v) => formatFixed(v, 1) },
                { header: 'Pace', accessor: 'x_pace', format: (v) => formatFixed(v, 1) },
                { header: 'Pts per 100', accessor: 'x_pts_100', format: (v) => formatFixed(v, 1) },
                { header: 'Ast per 100', accessor: 'x_ast_100', format: (v) => formatFixed(v, 1) },
                { header: 'FG%', accessor: 'x_fg_pct', format: formatPercent },
                { header: '3P%', accessor: 'x_fg3_pct', format: formatPercent },
                { header: 'FT%', accessor: 'x_ft_pct', format: formatPercent }
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
                        {#each teamPlayerColumns as column}
                            <th
                                class="{column.alignClass} sortable {sortColumn === column.key ? 'active' : ''} {column.metricKey ? 'has-tooltip' : ''}"
                                onclick={() => toggleSort(column.key)}
                            >
                                <span class="header-label-wrap">
                                    <span>{column.label}</span>
                                    {#if column.metricKey}
                                        <span class="header-tooltip-trigger" aria-hidden="true">?</span>
                                        <span class="header-tooltip">{getMetricDefinition(column.metricKey)}</span>
                                    {/if}
                                    <span class="sort-indicator">{sortGlyph(column.key)}</span>
                                </span>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each sortedPlayers as player}
                        <tr>
                            <td class="name">
                                <a href="/compare?ids={player.nba_id}">{player.player_name}</a>
                            </td>
                            <td class="position">{player.position || '—'}</td>
                            <td class="num">{formatMinutes(player.tr_minutes)}</td>
                            <td class="num {dpmClass(player.dpm)}">{formatSignedMetric(player.dpm)}</td>
                            <td class="num {dpmClass(player.o_dpm)}">{formatSignedMetric(player.o_dpm)}</td>
                            <td class="num {dpmClass(player.d_dpm)}">{formatSignedMetric(player.d_dpm)}</td>
                            <td class="num {dpmClass(player.box_dpm)}">{formatSignedMetric(player.box_dpm)}</td>
                            <td class="num {dpmClass(player.on_off_dpm)}">{formatSignedMetric(player.on_off_dpm)}</td>
                            <td class="num {dpmClass(player.bayes_rapm_total)}">{formatSignedMetric(player.bayes_rapm_total)}</td>
                            <td class="num">{formatFixed(player.x_minutes, 1)}</td>
                            <td class="num">{formatFixed(player.x_pace, 1)}</td>
                            <td class="num">{formatFixed(player.x_pts_100, 1)}</td>
                            <td class="num">{formatFixed(player.x_ast_100, 1)}</td>
                            <td class="num">{formatPercent(player.x_fg_pct)}</td>
                            <td class="num">{formatPercent(player.x_fg3_pct)}</td>
                            <td class="num">{formatPercent(player.x_ft_pct)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    {#if sim && teamWinDist.length > 0}
        <h2 class="section-title">Win Distribution</h2>
        <div class="chart-card">
            <WinDistChart
                data={teamWinDist}
                meanWins={parseFloat(sim.W)}
                currentWins={currentWins(sim.Current)}
                {teamName}
            />
        </div>

        <h2 class="section-title">Seed Probabilities</h2>
        <div class="chart-card">
            <SeedChart team={sim} {teamName} />
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
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
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

    th.has-tooltip .header-label-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    th.has-tooltip:hover .header-tooltip,
    th.has-tooltip:focus-within .header-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, -4px);
    }

    .header-tooltip-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 9px;
        line-height: 1;
        opacity: 0.9;
        background: var(--bg-surface);
        box-shadow: inset 0 0 0 1px var(--border);
    }

    .header-tooltip {
        position: absolute;
        left: 50%;
        top: 0;
        transform: translate(-50%, -8px);
        width: max-content;
        max-width: 250px;
        white-space: normal;
        background: var(--bg-surface);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        font-size: 11px;
        line-height: 1.35;
        letter-spacing: 0;
        text-transform: none;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        pointer-events: none;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.12s ease, transform 0.12s ease;
        z-index: 30;
        font-weight: 500;
        color: var(--text-secondary);
    }
</style>
