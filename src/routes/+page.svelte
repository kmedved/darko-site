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
    import { filterPlayers } from '$lib/utils/legacyLeaderboard.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { buildLeaderboardCsvRows } from '$lib/utils/leaderboardCsv.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import LegacyLeaderboard from '$lib/components/LegacyLeaderboard.svelte';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';

    let { data } = $props();

    let viewMode = $state('standard');
    let sortColumn = $state('_rank');
    let sortDirection = $state('asc');
    let columnFilters = $state({});
    let standardTableRoot = $state(null);
    let standardBodyScroller = $state(null);
    let standardBodyTable = $state(null);
    let standardSourceHead = $state(null);
    let standardHeaderScroller = $state(null);
    let standardHeaderTable = $state(null);

    const players = $derived(data.players || []);
    const playerColumns = LEADERBOARD_COLUMNS;

    const filteredPlayers = $derived.by(() =>
        filterPlayers(players, playerColumns, columnFilters)
    );

    const sortedPlayers = $derived.by(() =>
        getSortedRows(filteredPlayers, {
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

    function setFilter(column, value) {
        columnFilters = { ...columnFilters, [column]: value };
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

    $effect(() => {
        viewMode;
        sortColumn;
        sortDirection;
        columnFilters;
        sortedPlayers.length;
        standardTableRoot;
        standardBodyScroller;
        standardBodyTable;
        standardSourceHead;
        standardHeaderScroller;
        standardHeaderTable;

        if (viewMode !== 'standard') {
            return;
        }

        return setupWideStickyTable({
            root: standardTableRoot,
            bodyScroller: standardBodyScroller,
            bodyTable: standardBodyTable,
            sourceHead: standardSourceHead,
            headerScroller: standardHeaderScroller,
            headerTable: standardHeaderTable,
            wheelTarget: standardHeaderScroller
        });
    });
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
                        disabled={sortedPlayers.length === 0}
                    >
                        Download CSV
                    </button>
                {/if}
            </div>
        </div>
    </div>

    {#snippet standardHeaderRows()}
        <tr class="header-row">
            {#each playerColumns as column (column.key)}
                <th
                    class="{column.alignClass} sortable {sortColumn === column.key ? 'active' : ''} {column.metricKey ? 'has-tooltip' : ''}"
                    onclick={() => toggleSort(column.key)}
                >
                    <span class="header-label-wrap">
                        {#if column.metricKey}
                            <MetricTooltip text={getMetricDefinition(column.metricKey)}>
                                <span>{column.label}</span>
                            </MetricTooltip>
                        {:else}
                            <span>{column.label}</span>
                        {/if}
                        <span class="sort-indicator">{sortGlyph(column.key)}</span>
                    </span>
                </th>
            {/each}
        </tr>
        <tr class="filter-row">
            {#each playerColumns as column (column.key)}
                <th class={column.alignClass}>
                    {#if column.key !== '_rank'}
                        <input
                            type="text"
                            value={columnFilters[column.key] || ''}
                            oninput={(event) => setFilter(column.key, event.currentTarget.value)}
                            placeholder={column.type === 'text' ? 'All' : '>N'}
                            aria-label={`Filter ${column.label}`}
                        />
                    {/if}
                </th>
            {/each}
        </tr>
    {/snippet}

    {#if players.length === 0}
        <div class="empty-state">No players are currently available.</div>
    {:else if viewMode === 'legacy'}
        <LegacyLeaderboard {players} />
    {:else}
        <div class="table-wrapper table-shell" bind:this={standardTableRoot}>
            <div class="sticky-header-shell">
                <div class="table-header-scroll" bind:this={standardHeaderScroller}>
                    <table class="sticky-header-table" bind:this={standardHeaderTable}>
                        <thead>
                            {@render standardHeaderRows()}
                        </thead>
                    </table>
                </div>
            </div>

            <div class="table-body-scroll" bind:this={standardBodyScroller}>
                <table bind:this={standardBodyTable}>
                    <thead class="table-sizing-head" aria-hidden="true" bind:this={standardSourceHead}>
                        {@render standardHeaderRows()}
                    </thead>
                    <tbody>
                        {#if sortedPlayers.length === 0}
                            <tr>
                                <td class="empty-row" colspan={playerColumns.length}>No matching players.</td>
                            </tr>
                        {:else}
                            {#each sortedPlayers as player, index (player.nba_id)}
                                <tr>
                                    {#each playerColumns as column (column.key)}
                                        {@const value = getLeaderboardCellValue(player, column, index)}
                                        {#if column.key === 'player_name'}
                                            <td class={cellClass(column, value)}>
                                                <a href="/player/{player.nba_id}">{player.player_name}</a>{#if player.position}<span class="pos-label"> ({player.position})</span>{/if}
                                                {#if player.team_name}
                                                    <div class="player-team"><a href="/team/{encodeURIComponent(player.team_name)}">{teamAbbr(player.team_name)}</a></div>
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
                        {/if}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>

<style>
    .table-wrapper {
        --wide-sticky-header-height: 40px;
        --frozen-rank-width: 42px;
        margin-bottom: 24px;
    }

    .page-header {
        padding: 24px 0 14px;
    }

    .page-header-toolbar {
        align-items: center;
        gap: 12px;
    }

    .page-header h1 {
        font-size: 24px;
        line-height: 1.05;
    }

    .page-header p {
        margin-top: 4px;
        font-size: 13px;
    }

    .page-header-actions {
        gap: 8px;
    }

    .page-action-btn {
        padding: 6px 10px;
        font-size: 11px;
    }

    .table-shell {
        position: relative;
    }

    .sticky-header-shell {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 30;
        margin-bottom: calc(-1 * var(--wide-sticky-header-height));
    }

    .table-header-scroll {
        overflow: hidden;
    }

    .table-body-scroll {
        overflow-x: auto;
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 12px;
        width: max-content;
    }

    th {
        background: var(--bg);
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 8px 6px;
        text-align: left;
        font-size: 9.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--text-muted);
        white-space: nowrap;
    }

    td {
        padding: 8px 6px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    .table-sizing-head th {
        visibility: hidden;
        pointer-events: none;
    }

    .filter-row th {
        padding: 4px 3px;
        background: var(--bg-elevated);
        text-transform: none;
    }

    .filter-row input {
        min-width: 40px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 10.5px;
        padding: 3px 4px;
        outline: none;
    }

    .filter-row th.name input {
        width: 100%;
    }

    .filter-row th.num input {
        width: 40px;
    }

    .filter-row input:focus {
        border-color: var(--accent);
    }

    th.sortable {
        cursor: pointer;
        user-select: none;
    }

    th.has-tooltip .header-label-wrap {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    th.sortable:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    .table-body-scroll tr:hover td {
        background: var(--bg-elevated);
    }

    /* Frozen rank column */
    .table-body-scroll td.rank,
    .table-header-scroll .header-row th:nth-child(1),
    .table-header-scroll .filter-row th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 1;
        background: var(--bg);
    }

    .table-header-scroll .header-row th:nth-child(1),
    .table-header-scroll .filter-row th:nth-child(1) {
        z-index: 22;
    }

    .table-header-scroll .filter-row th:nth-child(1) {
        background: var(--bg-elevated);
    }

    .rank {
        width: 36px;
        min-width: var(--frozen-rank-width);
        max-width: var(--frozen-rank-width);
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 500;
    }

    /* Frozen player-name column */
    .table-body-scroll td.name,
    .table-header-scroll .header-row th:nth-child(2),
    .table-header-scroll .filter-row th:nth-child(2) {
        position: sticky;
        left: var(--frozen-rank-width);
        z-index: 1;
        background: var(--bg);
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
    }

    .table-header-scroll .header-row th:nth-child(2),
    .table-header-scroll .filter-row th:nth-child(2) {
        z-index: 21;
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
    }

    .table-header-scroll .filter-row th:nth-child(2) {
        background: var(--bg-elevated);
    }

    .table-body-scroll tr:hover td.rank,
    .table-body-scroll tr:hover td.name {
        background: var(--bg-elevated);
    }

    .empty-row {
        padding: 20px;
        text-align: center;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 13px;
    }

    .name { font-weight: 500; }
    .name a { color: var(--text); }
    .name a:hover { color: var(--accent); }

    .pos-label {
        color: var(--text-muted);
        font-weight: 400;
        font-size: 11px;
        margin-left: 2px;
    }

    .player-team {
        font-size: 10px;
        color: var(--text-muted);
        line-height: 1.1;
        margin-top: 1px;
    }

    .player-team a {
        color: inherit;
    }

    .player-team a:hover {
        color: var(--accent);
    }

    .num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 11.5px;
        font-weight: 600;
    }

    th.num { text-align: right; }

    .sort-indicator {
        margin-left: 4px;
        opacity: 0.6;
        font-size: 9px;
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    .view-toggle {
        display: flex;
        gap: 3px;
        background: var(--bg-surface);
        padding: 3px;
        border: 1px solid var(--border);
        border-radius: 18px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }

    .view-toggle button {
        padding: 5px 14px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 11px;
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
    td.pos {
        background: linear-gradient(0deg, var(--positive-bg), var(--positive-bg)), var(--bg);
    }
    td.neg {
        background: linear-gradient(0deg, var(--negative-bg), var(--negative-bg)), var(--bg);
    }
    .pct.high { color: var(--positive); }
    .pct.mid { color: var(--accent); }
    .pct.low { color: var(--text-secondary); }
    .pct.zero { color: var(--text-muted); }

    .table-body-scroll tr:hover td.pos {
        background: linear-gradient(0deg, var(--positive-bg), var(--positive-bg)), var(--bg-elevated);
    }

    .table-body-scroll tr:hover td.neg {
        background: linear-gradient(0deg, var(--negative-bg), var(--negative-bg)), var(--bg-elevated);
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .sticky-header-shell {
            display: none;
        }

        .table-body-scroll {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        .table-sizing-head th {
            visibility: visible;
            pointer-events: auto;
        }

        .page-action-btn {
            display: none;
        }

        th,
        .filter-row th,
        .table-body-scroll td.rank,
        .table-body-scroll td.name {
            position: static;
            left: auto;
            box-shadow: none;
        }

        .table-body-scroll td.name {
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .pos-label {
            display: none;
        }

        .table-body-scroll td.rank {
            min-width: 28px;
            max-width: 28px;
            font-size: 9.5px;
        }

        td.num { font-size: 11px; }

        .filter-row input { min-width: 30px; }

        th, td { padding: 4px 3px; }
    }

    @media (max-width: 768px) {
        .page-header {
            padding: 18px 0 12px;
        }

        .page-header p {
            margin-top: 3px;
            font-size: 12px;
        }

        .page-header-actions {
            gap: 6px;
        }
    }
    /* End touch/mobile scroll mode */
</style>
