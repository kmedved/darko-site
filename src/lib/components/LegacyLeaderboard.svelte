<script>
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import {
        formatLeaderboardCell,
        getLeaderboardCellValue,
        leaderboardSortConfig
    } from '$lib/utils/leaderboardColumns.js';
    import {
        LEGACY_COLUMNS,
        enrichPlayer,
        filterPlayers
    } from '$lib/utils/legacyLeaderboard.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';

    let { players = [] } = $props();

    let sortColumn = $state('dpm');
    let sortDirection = $state('desc');
    let columnFilters = $state({});

    const columns = LEGACY_COLUMNS;

    const enrichedPlayers = $derived.by(() => players.map(enrichPlayer));

    const filteredPlayers = $derived.by(() =>
        filterPlayers(enrichedPlayers, columns, columnFilters)
    );

    const sortedPlayers = $derived.by(() =>
        getSortedRows(filteredPlayers, {
            sortColumn,
            sortDirection,
            sortConfigs: leaderboardSortConfig
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
</script>

<div class="legacy-wrapper">
    <table>
        <thead>
            <tr class="header-row">
                {#each columns as col (col.key)}
                    <th
                        class="sortable {col.align === 'right' ? 'align-right' : col.align === 'center' ? 'align-center' : ''} {sortColumn === col.key ? 'active' : ''}"
                        onclick={() => toggleSort(col.key)}
                    >
                        <span class="header-label-wrap">
                            <span>{col.label}</span>
                            {#if col.metricKey}
                                <span class="header-tooltip-trigger" aria-hidden="true">?</span>
                                <span class="header-tooltip">{getMetricDefinition(col.metricKey)}</span>
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

<style>
    .legacy-wrapper {
        margin-bottom: 40px;
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 12px;
        width: 100%;
    }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 15;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 7px 5px;
        white-space: nowrap;
        text-align: left;
    }

    .filter-row th {
        top: calc(var(--nav-sticky-offset) + 30px);
        z-index: 14;
        padding: 5px 4px;
        background: var(--bg-elevated);
        text-transform: none;
    }

    .filter-row input {
        width: 100%;
        min-width: 40px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 11px;
        padding: 4px 5px;
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
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .header-row th:hover,
    .header-row th:focus-within {
        z-index: 110;
    }

    .header-row th:hover .header-tooltip,
    .header-row th:focus-within .header-tooltip {
        opacity: 1;
        visibility: visible;
        transform: translate(-50%, 0);
    }

    .header-tooltip-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        border: 1px solid var(--border);
        background: var(--bg-surface);
        box-shadow: inset 0 0 0 1px var(--border);
        color: var(--text-muted);
        font-size: 8px;
        line-height: 1;
        opacity: 0.9;
    }

    .header-tooltip {
        position: absolute;
        left: 50%;
        bottom: calc(100% + 8px);
        transform: translate(-50%, 4px);
        transform-origin: bottom center;
        width: max-content;
        max-width: 240px;
        padding: 8px 10px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 500;
        letter-spacing: 0;
        line-height: 1.35;
        text-transform: none;
        white-space: normal;
        opacity: 0;
        visibility: hidden;
        pointer-events: none;
        transition: opacity 0.12s ease, transform 0.12s ease;
        z-index: 30;
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
        padding: 6px 5px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
    }

    .player-cell {
        font-family: var(--font-sans);
        font-weight: 600;
        font-size: 12px;
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
        font-size: 12px;
        color: var(--text-secondary);
    }

    .team-cell a {
        color: inherit;
    }

    .team-cell a:hover {
        color: var(--accent);
        text-decoration: underline;
    }

    .rank-cell {
        color: var(--text-muted);
    }

    tr:hover td {
        background: var(--bg-elevated);
    }

    .empty-row {
        text-align: center;
        color: var(--text-muted);
        padding: 20px;
        font-family: var(--font-sans);
        font-size: 13px;
    }

    @media (max-width: 768px) {
        .legacy-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        th {
            position: static;
        }

        .filter-row th {
            position: static;
        }

        th, td { padding: 5px 4px; }
    }
</style>
