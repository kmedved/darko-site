<script>
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import {
        formatLeaderboardCell,
        getLeaderboardCellValue,
        legacyLeaderboardSortConfig
    } from '$lib/utils/leaderboardColumns.js';
    import {
        LEGACY_COLUMNS,
        enrichPlayer,
        filterPlayers
    } from '$lib/utils/legacyLeaderboard.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';

    let { players = [] } = $props();

    let sortColumn = $state('dpm');
    let sortDirection = $state('desc');
    let columnFilters = $state({});
    let legacyTableRoot = $state(null);
    let legacyBodyScroller = $state(null);
    let legacyBodyTable = $state(null);
    let legacySourceHead = $state(null);
    let legacyHeaderScroller = $state(null);
    let legacyHeaderTable = $state(null);

    const columns = LEGACY_COLUMNS;

    const enrichedPlayers = $derived.by(() => players.map(enrichPlayer));

    const filteredPlayers = $derived.by(() =>
        filterPlayers(enrichedPlayers, columns, columnFilters)
    );

    const sortedPlayers = $derived.by(() =>
        getSortedRows(filteredPlayers, {
            sortColumn,
            sortDirection,
            sortConfigs: legacyLeaderboardSortConfig
        })
    );

    function sortGlyph(colKey) {
        if (sortColumn !== colKey) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function toggleSort(colKey) {
        if (sortColumn === colKey) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            return;
        }
        sortColumn = colKey;
        sortDirection = colKey === '_rank' || colKey === 'player_name' || colKey === 'team_name' ? 'asc' : 'desc';
    }

    function setFilter(colKey, value) {
        columnFilters = { ...columnFilters, [colKey]: value };
    }

    $effect(() => {
        sortColumn;
        sortDirection;
        columnFilters;
        sortedPlayers.length;
        legacyTableRoot;
        legacyBodyScroller;
        legacyBodyTable;
        legacySourceHead;
        legacyHeaderScroller;
        legacyHeaderTable;

        return setupWideStickyTable({
            root: legacyTableRoot,
            bodyScroller: legacyBodyScroller,
            bodyTable: legacyBodyTable,
            sourceHead: legacySourceHead,
            headerScroller: legacyHeaderScroller,
            headerTable: legacyHeaderTable,
            wheelTarget: legacyHeaderScroller
        });
    });
</script>

{#snippet legacyHeaderRows()}
    <tr class="header-row">
        {#each columns as col (col.key)}
            <th
                class="sortable {col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : ''} {sortColumn === col.key ? 'active' : ''}"
                onclick={() => toggleSort(col.key)}
            >
                <span class="header-label-wrap">
                    {#if col.metricKey}
                        <MetricTooltip text={getMetricDefinition(col.metricKey)}>
                            <span>{col.label}</span>
                        </MetricTooltip>
                    {:else}
                        <span>{col.label}</span>
                    {/if}
                    <span class="sort-indicator">{sortGlyph(col.key)}</span>
                </span>
            </th>
        {/each}
    </tr>
    <tr class="filter-row">
        {#each columns as col (col.key)}
            <th class={col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : ''}>
                <input
                    type="text"
                    value={columnFilters[col.key] || ''}
                    oninput={(e) => setFilter(col.key, e.currentTarget.value)}
                    placeholder={col.type === 'text' ? 'All' : ''}
                />
            </th>
        {/each}
    </tr>
{/snippet}

<div class="legacy-wrapper table-shell" bind:this={legacyTableRoot}>
    <div class="sticky-header-shell">
        <div class="table-header-scroll" bind:this={legacyHeaderScroller}>
            <table class="sticky-header-table" bind:this={legacyHeaderTable}>
                <thead>
                    {@render legacyHeaderRows()}
                </thead>
            </table>
        </div>
    </div>

    <div class="table-body-scroll" bind:this={legacyBodyScroller}>
        <table bind:this={legacyBodyTable}>
            <thead class="table-sizing-head" aria-hidden="true" bind:this={legacySourceHead}>
                {@render legacyHeaderRows()}
            </thead>
            <tbody>
                {#if sortedPlayers.length === 0}
                    <tr>
                        <td class="empty-row" colspan={columns.length}>No matching players.</td>
                    </tr>
                {:else}
                    {#each sortedPlayers as player, index (player.nba_id)}
                        <tr>
                            {#each columns as col (col.key)}
                                {@const value = getLeaderboardCellValue(player, col, index)}
                                {#if col.key === 'player_name'}
                                    <td class="player-cell">
                                        <a href="/player/{player.nba_id}">{player.player_name || '—'}</a>
                                        {#if player.position}
                                            <span class="pos-label"> ({player.position})</span>
                                        {/if}
                                    </td>
                                {:else if col.key === 'team_name'}
                                    <td class="team-cell">
                                        {#if player.team_name}
                                            <a href="/team/{encodeURIComponent(player.team_name)}" title={player.team_name}>{teamAbbr(player.team_name)}</a>
                                        {:else}
                                            —
                                        {/if}
                                    </td>
                                {:else}
                                    <td
                                        class="{col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : ''} {col.key === '_rank' ? 'rank-cell' : ''}"
                                    >
                                        {formatLeaderboardCell(col, value)}
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

<style>
    .legacy-wrapper {
        --wide-sticky-header-height: 60px;
        --legacy-rank-width: 40px;
        margin-bottom: 24px;
    }

    .table-shell {
        position: relative;
    }

    .sticky-header-shell {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 35;
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
        min-width: 100%;
    }

    th {
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 6px 4px;
        white-space: nowrap;
        text-align: left;
    }

    .filter-row th {
        padding: 4px 3px;
        background: var(--bg-elevated);
        text-transform: none;
    }

    .table-sizing-head th {
        visibility: hidden;
        pointer-events: none;
    }

    .filter-row input {
        width: 100%;
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

    .filter-row input:focus {
        border-color: var(--accent);
    }

    th.sortable {
        cursor: pointer;
        user-select: none;
    }

    .header-label-wrap {
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

    .sort-indicator {
        margin-left: 4px;
        font-size: 9px;
        opacity: 0.6;
    }

    th.active .sort-indicator {
        opacity: 1;
        color: var(--accent);
    }

    th.align-right,
    td.align-right {
        text-align: right;
    }

    th.align-center,
    td.align-center {
        text-align: center;
    }

    td {
        padding: 5px 4px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        font-family: var(--font-mono);
        font-size: 11.5px;
        font-weight: 500;
    }

    .player-cell {
        font-family: var(--font-sans);
        font-weight: 600;
        font-size: 11.5px;
        position: sticky;
        left: var(--legacy-rank-width);
        z-index: 1;
        background: var(--bg);
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
    }

    .pos-label {
        color: var(--text-muted);
        font-weight: 400;
        font-size: 11px;
    }

    .player-cell a {
        color: var(--text);
    }

    .player-cell a:hover {
        color: var(--accent);
    }

    .team-cell {
        font-family: var(--font-sans);
        font-size: 11.5px;
        color: var(--text-secondary);
    }

    .team-cell a {
        color: inherit;
    }

    .team-cell a:hover {
        color: var(--accent);
        text-decoration: underline;
    }

    .rank-cell,
    .table-header-scroll th:nth-child(1),
    .table-header-scroll .filter-row th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 1;
        background: var(--bg);
    }

    .table-header-scroll th:nth-child(1),
    .table-header-scroll .filter-row th:nth-child(1) {
        z-index: 31;
    }

    .table-header-scroll .filter-row th:nth-child(1) {
        background: var(--bg-elevated);
    }

    .rank-cell {
        color: var(--text-muted);
        min-width: var(--legacy-rank-width);
        max-width: var(--legacy-rank-width);
    }

    .table-header-scroll th:nth-child(2),
    .table-header-scroll .filter-row th:nth-child(2) {
        position: sticky;
        left: var(--legacy-rank-width);
        z-index: 31;
        background: var(--bg);
        box-shadow: 2px 0 4px rgba(0, 0, 0, 0.15);
    }

    .table-header-scroll .filter-row th:nth-child(2) {
        background: var(--bg-elevated);
    }

    .table-body-scroll tr:hover td.rank-cell,
    .table-body-scroll tr:hover td.player-cell {
        background: var(--bg-elevated);
    }

    .table-body-scroll tr:hover td {
        background: var(--bg-elevated);
    }

    .empty-row {
        text-align: center;
        color: var(--text-muted);
        padding: 20px;
        font-family: var(--font-sans);
        font-size: 13px;
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

        th,
        .filter-row th,
        .rank-cell,
        .player-cell {
            position: static;
            left: auto;
            box-shadow: none;
        }

        .player-cell {
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .pos-label {
            display: none;
        }

        .rank-cell {
            min-width: 28px;
            max-width: 28px;
            font-size: 9.5px;
        }

        td.align-right { font-size: 11px; }

        .filter-row input { min-width: 30px; }

        th, td { padding: 4px 3px; }
    }
    /* End touch/mobile scroll mode */
</style>
