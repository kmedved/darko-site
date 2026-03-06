<script>
    import {
        exportCsvRows,
        leaderboardCsvColumns,
        formatFixed
    } from '$lib/utils/csvPresets.js';
    import {
        formatLeaderboardCell,
        getLeaderboardCellValue,
        LEADERBOARD_COLUMNS,
        leaderboardSortConfig
    } from '$lib/utils/leaderboardColumns.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { buildLeaderboardCsvRows } from '$lib/utils/leaderboardCsv.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import LegacyLeaderboard from '$lib/components/LegacyLeaderboard.svelte';

    let { data } = $props();

    let viewMode = $state('standard');
    let sortColumn = $state('_rank');
    let sortDirection = $state('asc');

    const players = $derived(data.players || []);
    const playerColumns = LEADERBOARD_COLUMNS;

    const sortedPlayers = $derived.by(() =>
        getSortedRows(players, {
            sortColumn,
            sortDirection,
            sortConfigs: leaderboardSortConfig
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

    function cellClass(column, value) {
        if (column.key === '_rank') return 'rank';
        if (column.key === 'player_name') return 'name';
        if (column.key === 'team_name') return 'team';
        if (column.alignClass !== 'num') return column.alignClass;
        if (column.key === 'surplus_value') return `num ${signClass(value)}`.trim();
        if (column.key === 'sal_market_fixed') return 'num';
        return `num ${statClass(column.key, value)}`.trim();
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
                <div class="view-toggle">
                    <button type="button" class:active={viewMode === 'standard'} onclick={() => (viewMode = 'standard')}>Standard</button>
                    <button type="button" class:active={viewMode === 'legacy'} onclick={() => (viewMode = 'legacy')}>Legacy</button>
                </div>
                {#if viewMode === 'standard'}
                    <button
                        class="page-action-btn"
                        type="button"
                        onclick={exportPlayersCsv}
                        disabled={players.length === 0}
                    >
                        Download CSV
                    </button>
                {/if}
            </div>
        </div>
    </div>

    {#if players.length === 0}
        <div class="empty-state">No players are currently available.</div>
    {:else if viewMode === 'legacy'}
        <LegacyLeaderboard {players} />
    {:else}
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        {#each playerColumns as column (column.key)}
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
                    {#each sortedPlayers as player, index (player.nba_id)}
                        <tr>
                            {#each playerColumns as column (column.key)}
                                {@const value = getLeaderboardCellValue(player, column, index)}
                                {#if column.key === 'player_name'}
                                    <td class={cellClass(column, value)}>
                                        <a href="/player/{player.nba_id}">{player.player_name}</a>{#if player.position}<span class="pos-label"> ({player.position})</span>{/if}
                                    </td>
                                {:else if column.key === 'team_name'}
                                    <td class={cellClass(column, value)}>
                                        {#if player.team_name}
                                            <a href="/team/{encodeURIComponent(player.team_name)}" title={player.team_name}>{teamAbbr(player.team_name)}</a>
                                        {:else}
                                            —
                                        {/if}
                                    </td>
                                {:else}
                                    <td class={cellClass(column, value)}>
                                        {column.key === 'x_minutes' ? fmtMpg(value) : formatLeaderboardCell(column, value)}
                                    </td>
                                {/if}
                            {/each}
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
        overflow: auto;
        max-height: calc(100vh - 120px);
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        width: max-content;
        min-width: 100%;
    }

    th {
        position: sticky;
        top: 0;
        z-index: 2;
        background: var(--bg);
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 10px 8px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        white-space: nowrap;
    }

    td {
        padding: 10px 8px;
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

    th.has-tooltip:hover,
    th.has-tooltip:focus-within {
        z-index: 110;
    }

    th.has-tooltip:hover .header-tooltip,
    th.has-tooltip:focus-within .header-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, 0);
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
        bottom: calc(100% + 8px);
        transform: translate(-50%, 4px);
        transform-origin: bottom center;
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

    /* Frozen rank column */
    td.rank,
    th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 1;
        background: var(--bg);
    }

    th:nth-child(1) {
        z-index: 3;
    }

    .rank {
        width: 36px;
        min-width: 48px;
        max-width: 48px;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 11.5px;
        font-weight: 500;
    }

    /* Frozen player-name column */
    td.name,
    th:nth-child(2) {
        position: sticky;
        left: 48px;
        z-index: 1;
        background: var(--bg);
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
    }

    th:nth-child(2) {
        z-index: 3;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
    }

    tr:hover td.rank,
    tr:hover td.name {
        background: var(--bg-elevated);
    }

    .name { font-weight: 500; }
    .name a { color: var(--text); }
    .name a:hover { color: var(--accent); }

    .pos-label {
        color: var(--text-muted);
        font-weight: 400;
        font-size: 12px;
        margin-left: 4px;
    }

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

    .num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
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

    .view-toggle {
        display: flex;
        gap: 4px;
        background: var(--bg-surface);
        padding: 4px;
        border: 1px solid var(--border);
        border-radius: 20px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .view-toggle button {
        padding: 6px 16px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 500;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .view-toggle button.active {
        background: var(--bg-elevated);
        color: var(--text);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--border);
    }

    .view-toggle button:hover:not(.active) {
        color: var(--text);
    }

    .pos { color: var(--positive); }
    .neg { color: var(--negative); }
    .pct.high { color: var(--positive); }
    .pct.mid { color: var(--accent); }
    .pct.low { color: var(--text-secondary); }
    .pct.zero { color: var(--text-muted); }

    @media (max-width: 768px) {
        .page-action-btn {
            display: none;
        }

        th, td { padding: 6px 8px; }
    }
</style>
