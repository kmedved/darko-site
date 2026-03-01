<script>
    import {
        exportCsvRows,
        leaderboardCsvColumns,
        formatSignedMetric,
        formatFixed,
        formatPercent
    } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { buildLeaderboardCsvRows } from '$lib/utils/leaderboardCsv.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';

    let { data } = $props();

    let sortColumn = $state('_rank');
    let sortDirection = $state('asc');

    const players = $derived(data.players || []);

    const playerSortConfig = {
        _rank: { type: 'number' },
        player_name: { type: 'text' },
        team_name: { type: 'text' },
        position: { type: 'text' },
        dpm: { type: 'number' },
        o_dpm: { type: 'number' },
        d_dpm: { type: 'number' },
        box_dpm: { type: 'number' },
        on_off_dpm: { type: 'number' },
        x_minutes: { type: 'number' },
        x_pace: { type: 'number' },
        x_pts_100: { type: 'number' },
        x_ast_100: { type: 'number' },
        x_fg_pct: { type: 'number' },
        x_fg3_pct: { type: 'number' },
        x_ft_pct: { type: 'number' }
    };

    const playerColumns = [
        { key: '_rank', label: '#', alignClass: 'rank', dataType: 'number' },
        { key: 'player_name', label: 'Player', alignClass: 'name', dataType: 'text' },
        { key: 'team_name', label: 'Team', alignClass: 'team', dataType: 'text' },
        { key: 'position', label: 'Pos', alignClass: 'position-col', dataType: 'text' },
        { key: 'dpm', label: 'DPM', alignClass: 'num', dataType: 'number', metricKey: 'dpm' },
        { key: 'o_dpm', label: 'ODPM', alignClass: 'num', dataType: 'number', metricKey: 'o_dpm' },
        { key: 'd_dpm', label: 'DDPM', alignClass: 'num', dataType: 'number', metricKey: 'd_dpm' },
        { key: 'box_dpm', label: 'Box', alignClass: 'num', dataType: 'number', metricKey: 'box_dpm' },
        { key: 'on_off_dpm', label: 'On/Off', alignClass: 'num', dataType: 'number', metricKey: 'on_off_dpm' },
        { key: 'x_minutes', label: 'MPG', alignClass: 'num', dataType: 'number', metricKey: 'x_minutes' },
        { key: 'x_pace', label: 'Pace', alignClass: 'num', dataType: 'number', metricKey: 'x_pace' },
        { key: 'x_pts_100', label: 'Pts/100', alignClass: 'num', dataType: 'number', metricKey: 'x_pts_100' },
        { key: 'x_ast_100', label: 'Ast/100', alignClass: 'num', dataType: 'number', metricKey: 'x_ast_100' },
        { key: 'x_fg_pct', label: 'FG%', alignClass: 'num', dataType: 'number', metricKey: 'x_fg_pct' },
        { key: 'x_fg3_pct', label: '3P%', alignClass: 'num', dataType: 'number', metricKey: 'x_fg3_pct' },
        { key: 'x_ft_pct', label: 'FT%', alignClass: 'num', dataType: 'number', metricKey: 'x_ft_pct' }
    ];

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

    function signClass(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

    function pctClass(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return '';
        if (n >= 80) return 'high';
        if (n >= 40) return 'mid';
        if (n > 0) return 'low';
        return 'zero';
    }

    function fmtMpg(min) {
        if (min === null || min === undefined) return '—';
        const n = Number.parseFloat(min);
        if (!Number.isFinite(n)) return '—';
        return formatFixed(Math.max(0, n), 1);
    }

    function statClass(column, value) {
        const n = Number.parseFloat(value);
        if (!Number.isFinite(n)) return '';

        if (column.endsWith('_pct')) {
            return `pct ${pctClass(n * 100)}`;
        }

        if (column === 'x_minutes') {
            return n > 0 ? 'pos' : '';
        }

        return signClass(n);
    }

    const leaderboardCsvColumnsForExport = leaderboardCsvColumns
        .filter((col) => col.accessor !== 'bayes_rapm_total' && col.accessor !== 'tr_minutes')
        .map((col) =>
            col.accessor === 'x_minutes'
                ? { ...col, format: fmtMpg }
                : col
        );

    function exportPlayersCsv() {
        const rows = buildLeaderboardCsvRows(sortedPlayers);
        exportCsvRows({
            rows,
            columns: leaderboardCsvColumnsForExport,
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
                    disabled={players.length === 0}
                >
                    Download CSV
                </button>
            </div>
        </div>
    </div>

    {#if players.length === 0}
        <div class="empty-state">No players are currently available.</div>
    {:else}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        {#each playerColumns as column}
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
                    {#each sortedPlayers as player, i}
                        <tr>
                            <td class="rank">{i + 1}</td>
                            <td class="name">
                                <a href="/player/{player.nba_id}">{player.player_name}</a>
                            </td>
                            <td class="team">
                                {#if player.team_name}
                                    <a href="/team/{encodeURIComponent(player.team_name)}">{player.team_name}</a>
                                {:else}
                                    —
                                {/if}
                            </td>
                            <td class="position-col">{player.position || '—'}</td>
                            <td class="num {statClass('dpm', player.dpm)}">{formatSignedMetric(player.dpm)}</td>
                            <td class="num {statClass('o_dpm', player.o_dpm)}">{formatSignedMetric(player.o_dpm)}</td>
                            <td class="num {statClass('d_dpm', player.d_dpm)}">{formatSignedMetric(player.d_dpm)}</td>
                            <td class="num {statClass('box_dpm', player.box_dpm)}">{formatSignedMetric(player.box_dpm)}</td>
                            <td class="num {statClass('on_off_dpm', player.on_off_dpm)}">{formatSignedMetric(player.on_off_dpm)}</td>
                            <td class="num {statClass('x_minutes', player.x_minutes)}">{fmtMpg(player.x_minutes)}</td>
                            <td class="num {statClass('x_pace', player.x_pace)}">{formatFixed(player.x_pace, 1)}</td>
                            <td class="num {statClass('x_pts_100', player.x_pts_100)}">{formatFixed(player.x_pts_100, 1)}</td>
                            <td class="num {statClass('x_ast_100', player.x_ast_100)}">{formatFixed(player.x_ast_100, 1)}</td>
                            <td class="num {statClass('x_fg_pct', player.x_fg_pct)}">{formatPercent(player.x_fg_pct)}</td>
                            <td class="num {statClass('x_fg3_pct', player.x_fg3_pct)}">{formatPercent(player.x_fg3_pct)}</td>
                            <td class="num {statClass('x_ft_pct', player.x_ft_pct)}">{formatPercent(player.x_ft_pct)}</td>
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
        top: var(--nav-sticky-offset);
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
        white-space: normal;
        font-weight: 500;
        color: var(--text-secondary);
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
    .pct.high { color: var(--positive); }
    .pct.mid { color: var(--accent); }
    .pct.low { color: var(--text-secondary); }
    .pct.zero { color: var(--text-muted); }

    @media (max-width: 640px) {
        th, td { padding: 6px 8px; }
        .team { display: none; }
    }
</style>
