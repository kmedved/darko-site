<script>
    import { goto } from '$app/navigation';
    import { exportCsvRows, formatFixed, formatSignedMetric, getLineupsCsvColumns } from '$lib/utils/csvPresets.js';
    import { filterPlayers } from '$lib/utils/legacyLeaderboard.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';

    /** @type {import('./$types').PageProps} */
    let { data } = $props();

    const sizeOptions = [
        { value: 2, label: '2-Man' },
        { value: 3, label: '3-Man' },
        { value: 4, label: '4-Man' },
        { value: 5, label: '5-Man' },
    ];

    const synergyColumns = [
        { key: 'off_synergy', label: 'Off Syn', alignClass: 'num', type: 'number', dataType: 'number' },
        { key: 'def_synergy', label: 'Def Syn', alignClass: 'num', type: 'number', dataType: 'number' }
    ];

    const variantOptions = [
        { value: 'pi', label: 'PI' },
        { value: 'npi', label: 'NPI' }
    ];

    const TEAM_PENDING_LABEL = 'Team pending';

    let baseColumns = $derived.by(() => {
        const playerCount = data.lineupSize ?? 5;
        const playerCols = Array.from({ length: playerCount }, (_, i) => ({
            key: `player_${i + 1}`,
            label: `Player ${i + 1}`,
            alignClass: 'player-col',
            type: 'text',
            dataType: 'text',
            slotIndex: i,
        }));
        return [
            { key: 'team_name', label: 'Team', alignClass: 'team-col', type: 'text', dataType: 'text' },
            ...playerCols,
            { key: 'possessions', label: 'Poss', alignClass: 'num', type: 'number', dataType: 'number' },
            { key: 'net_pm', label: 'Net +/-', alignClass: 'num', type: 'number', dataType: 'number' },
            { key: 'off_pm', label: 'Off +/-', alignClass: 'num', type: 'number', dataType: 'number' },
            { key: 'def_pm', label: 'Def +/-', alignClass: 'num', type: 'number', dataType: 'number' },
        ];
    });

    let PLAYER_KEYS = $derived(
        Array.from({ length: data.lineupSize ?? 5 }, (_, i) => `player_${i + 1}`)
    );

    let sortConfigs = $derived.by(() => {
        const configs = {
            team_name: { type: 'text' },
            possessions: { type: 'number' },
            net_pm: { type: 'number' },
            off_pm: { type: 'number' },
            def_pm: { type: 'number' },
            off_synergy: { type: 'number' },
            def_synergy: { type: 'number' }
        };
        for (const key of PLAYER_KEYS) {
            configs[key] = { type: 'text' };
        }
        return configs;
    });

    let selectedVariant = $derived(data.defaultVariant ?? 'pi');
    let sortColumn = $state('net_pm');
    let sortDirection = $state('desc');
    let columnFilters = $state({});
    let playerFilter = $state('');

    let tableColumns = $derived(
        selectedVariant === 'pi' ? [...baseColumns, ...synergyColumns] : baseColumns
    );

    /** Columns that participate in per-column filtering (excludes player slots). */
    let filterableColumns = $derived(tableColumns.filter((c) => c.slotIndex == null));

    let selectedLineups = $derived(data.lineupsByVariant?.[selectedVariant] ?? []);

    let filteredLineups = $derived.by(() => {
        const needle = playerFilter.trim().toLowerCase();
        const afterPlayer = needle
            ? selectedLineups.filter((row) =>
                PLAYER_KEYS.some((k) => String(row[k] || '').toLowerCase().includes(needle))
            )
            : selectedLineups;
        return filterPlayers(afterPlayer, filterableColumns, columnFilters);
    });

    let sortedLineups = $derived.by(() =>
        getSortedRows(filteredLineups, {
            sortColumn,
            sortDirection,
            sortConfigs
        })
    );

    let selectedVariantLabel = $derived(
        variantOptions.find((option) => option.value === selectedVariant)?.label ?? selectedVariant.toUpperCase()
    );
    let currentSizeLabel = $derived(
        sizeOptions.find((o) => o.value === data.lineupSize)?.label ?? `${data.lineupSize}-Man`
    );
    let emptyStateTitle = $derived(
        selectedVariant === 'npi' ? 'NPI lineup data is still uploading.' : 'Lineup data is not yet available.'
    );
    let emptyStateDetail = $derived(
        selectedVariant === 'npi'
            ? 'Rows will appear here once the NPI upload completes in Supabase.'
            : 'Rows will appear here once lineup ratings are published to Supabase.'
    );

    function selectSize(size) {
        if (size === data.lineupSize) return;
        goto(`/lineups?size=${size}`, { keepFocus: true });
    }

    function toggleSort(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            return;
        }

        sortColumn = column;
        sortDirection = sortConfigs[column]?.type === 'text' ? 'asc' : 'desc';
    }

    function sortGlyph(column) {
        if (sortColumn !== column) {
            return '↕';
        }

        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function metricToneClass(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
            return '';
        }

        return parsed >= 0 ? 'pos' : 'neg';
    }

    function isMetricColumn(key) {
        return key === 'net_pm' || key === 'off_pm' || key === 'def_pm'
            || key === 'off_synergy' || key === 'def_synergy';
    }

    function formatCellValue(row, column) {
        if (column.key === 'possessions') {
            return formatFixed(row.possessions, 0);
        }

        if (isMetricColumn(column.key)) {
            return formatSignedMetric(row[column.key]);
        }

        return row[column.key] ?? '—';
    }

    /** Abbreviate "Donovan Mitchell" → "D. Mitchell", leave single names alone. */
    function abbrevName(name) {
        if (!name) return '—';
        const parts = name.trim().split(/\s+/);
        if (parts.length < 2) return name;
        return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
    }

    function setFilter(column, value) {
        columnFilters = { ...columnFilters, [column]: value };
    }

    function exportVisibleLineups() {
        exportCsvRows({
            rows: sortedLineups,
            columns: getLineupsCsvColumns(data.lineupSize ?? 5),
            filename: `lineups-${currentSizeLabel.toLowerCase().replace(/\s+/g, '')}-${selectedVariant}.csv`
        });
    }
</script>

<svelte:head>
    <title>Lineup Projections — DARKO DPM</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <div class="page-header-toolbar">
            <div>
                <h1>Lineup Projections</h1>
                <p>Lineup Plus/Minus in Relation to League Average</p>
                <p class="subtitle-note">Table limited to lineups with more than {data.minPoss ?? 100} possessions.</p>
            </div>

            <div class="page-header-actions">
                <fieldset class="variant-picker">
                    <legend>Lineup Size</legend>

                    <div class="variant-radio-group">
                        {#each sizeOptions as option (option.value)}
                            <button
                                class="size-btn"
                                class:active={data.lineupSize === option.value}
                                type="button"
                                onclick={() => selectSize(option.value)}
                            >
                                {option.label}
                            </button>
                        {/each}
                    </div>
                </fieldset>

                <fieldset class="variant-picker">
                    <legend>Variant</legend>

                    <div class="variant-radio-group">
                        {#each variantOptions as option (option.value)}
                            <label class="variant-radio">
                                <input
                                    type="radio"
                                    name="lineup-variant"
                                    value={option.value}
                                    bind:group={selectedVariant}
                                />
                                <span>{option.label}</span>
                            </label>
                        {/each}
                    </div>
                </fieldset>

                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportVisibleLineups}
                    disabled={sortedLineups.length === 0}
                >
                    Download CSV
                </button>
            </div>
        </div>
    </div>

    {#if selectedLineups.length === 0}
        <div class="empty-state">
            <p>{emptyStateTitle}</p>
            <p class="empty-detail">{emptyStateDetail}</p>
        </div>
    {:else}
        <p class="variant-summary">
            Showing {selectedVariantLabel} {currentSizeLabel} lineup ratings
            ({filteredLineups.length === selectedLineups.length
                ? `${selectedLineups.length} lineups`
                : `${filteredLineups.length} of ${selectedLineups.length} lineups`}).
        </p>

        <div class="table-wrapper">
            <table>
                <thead>
                    <tr class="header-row">
                        {#each tableColumns as column (column.key)}
                            <th
                                class="sortable {column.alignClass} {sortColumn === column.key ? 'active' : ''}"
                                onclick={() => toggleSort(column.key)}
                            >
                                {column.label}
                                <span class="sort-indicator">{sortGlyph(column.key)}</span>
                            </th>
                        {/each}
                    </tr>
                    <tr class="filter-row">
                        <th class="team-col">
                            <input
                                type="text"
                                value={columnFilters['team_name'] || ''}
                                oninput={(event) => setFilter('team_name', event.currentTarget.value)}
                                placeholder="All"
                                aria-label="Filter Team"
                            />
                        </th>
                        <th class="player-filter-col" colspan={data.lineupSize ?? 5}>
                            <input
                                type="text"
                                value={playerFilter}
                                oninput={(event) => (playerFilter = event.currentTarget.value)}
                                placeholder="Filter players"
                                aria-label="Filter players"
                            />
                        </th>
                        {#each filterableColumns.filter(c => c.key !== 'team_name') as column (column.key)}
                            <th class={column.alignClass}>
                                <input
                                    type="text"
                                    value={columnFilters[column.key] || ''}
                                    oninput={(event) => setFilter(column.key, event.currentTarget.value)}
                                    placeholder={column.type === 'text' ? 'All' : '>N'}
                                    aria-label={`Filter ${column.label}`}
                                />
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#if sortedLineups.length === 0}
                        <tr>
                            <td class="empty-row" colspan={tableColumns.length}>No matching lineups.</td>
                        </tr>
                    {:else}
                        {#each sortedLineups as lineup (lineup.row_key)}
                            <tr>
                                {#each tableColumns as column (column.key)}
                                    <td
                                        class="{column.alignClass} {isMetricColumn(column.key) ? metricToneClass(lineup[column.key]) : ''}"
                                    >
                                        {#if column.slotIndex != null}
                                            {@const p = lineup.players[column.slotIndex]}
                                            {#if p?.id}
                                                <a href="/player/{p.id}" class="player-cell-link">
                                                    <img
                                                        src="/api/img/headshot/{p.id}"
                                                        alt=""
                                                        class="player-headshot"
                                                        loading="lazy"
                                                    />
                                                    <span>{abbrevName(p.name)}</span>
                                                </a>
                                            {:else}
                                                {abbrevName(p?.name)}
                                            {/if}
                                        {:else if column.key === 'team_name'}
                                            {#if lineup.team_name && lineup.team_name !== TEAM_PENDING_LABEL}
                                                <a href="/team/{encodeURIComponent(lineup.team_name)}" class="team-cell-link">
                                                    {#if lineup.tm_id}
                                                        <img
                                                            src="/api/img/logo/{lineup.tm_id}"
                                                            alt=""
                                                            class="team-logo"
                                                            loading="lazy"
                                                        />
                                                    {/if}
                                                    <span>{teamAbbr(lineup.team_name)}</span>
                                                </a>
                                            {:else}
                                                <span class="team-placeholder">{lineup.team_name}</span>
                                            {/if}
                                        {:else}
                                            {formatCellValue(lineup, column)}
                                        {/if}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>
    {/if}
</div>

<style>
    .page-header {
        padding: 24px 0 14px;
    }

    .page-header-toolbar {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 16px;
    }

    .page-header h1 {
        font-size: 24px;
        line-height: 1.05;
    }

    .page-header p {
        margin-top: 4px;
        font-size: 13px;
    }

    .subtitle-note {
        color: var(--text-muted);
        font-size: 12px;
        font-style: italic;
    }

    .page-header-actions {
        display: flex;
        align-items: end;
        gap: 10px;
    }

    /* page-action-btn inherits from app.css */

    .variant-picker {
        margin: 0;
        padding: 0;
        border: none;
    }

    .variant-picker legend {
        margin-bottom: 6px;
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .variant-radio-group {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: 999px;
    }

    .variant-radio {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 999px;
        color: var(--text);
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
    }

    .variant-radio input {
        accent-color: var(--accent);
    }

    .size-btn {
        padding: 4px 10px;
        border-radius: 999px;
        border: none;
        background: transparent;
        color: var(--text);
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        font-family: var(--font-sans);
    }

    .size-btn:hover {
        background: var(--bg-hover);
    }

    .size-btn.active {
        background: var(--accent);
        color: var(--bg);
    }

    .variant-summary {
        margin-bottom: 12px;
        color: var(--text-muted);
        font-size: 12px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }

    .empty-state {
        padding: 72px 20px;
        text-align: center;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: linear-gradient(180deg, var(--bg-elevated), transparent);
    }

    .empty-state p {
        margin: 0;
        color: var(--text);
        font-size: 16px;
    }

    .empty-detail {
        margin-top: 8px !important;
        color: var(--text-muted) !important;
        font-size: 13px !important;
    }

    .table-wrapper {
        margin-bottom: 40px;
    }

    table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 2;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        padding: 10px 12px;
        text-align: left;
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
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

    .sort-indicator {
        margin-left: 6px;
        font-size: 10px;
        opacity: 0.65;
    }

    th.active .sort-indicator {
        opacity: 1;
        color: var(--accent);
    }

    .filter-row th {
        position: sticky;
        top: calc(var(--nav-sticky-offset) + 37px);
        z-index: 2;
        padding: 4px 6px;
        background: var(--bg-elevated);
        text-transform: none;
        border-bottom: 1px solid var(--border);
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
        box-sizing: border-box;
    }

    .filter-row th.num input {
        width: 50px;
    }

    .filter-row input:focus {
        border-color: var(--accent);
    }

    td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text);
        vertical-align: middle;
    }

    .empty-row {
        padding: 20px;
        text-align: center;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 13px;
    }

    .player-col {
        width: 150px;
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .player-filter-col {
        text-align: left;
    }

    .team-col {
        width: 76px;
    }

    .num {
        width: 80px;
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
    }

    .player-cell-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text);
    }

    .player-cell-link:hover {
        color: var(--accent);
    }

    .player-headshot {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        object-fit: cover;
        object-position: center top;
        flex-shrink: 0;
        background: var(--bg-elevated);
    }

    .team-cell-link {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text);
        font-weight: 500;
    }

    .team-cell-link:hover {
        color: var(--accent);
    }

    .team-logo {
        width: 20px;
        height: 20px;
        object-fit: contain;
        flex-shrink: 0;
    }

    .team-placeholder {
        color: var(--text-muted);
        font-style: italic;
    }

    td.pos {
        color: var(--positive);
    }

    td.neg {
        color: var(--negative);
    }

    tbody tr:hover td {
        background: var(--bg-hover);
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .page-header-toolbar,
        .page-header-actions {
            flex-direction: column;
            align-items: flex-start;
        }

        .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        table {
            width: max-content;
            min-width: 100%;
            table-layout: auto;
        }

        th {
            position: static;
        }

        .filter-row th {
            position: static;
        }

        .player-col,
        .team-col,
        .num {
            width: auto;
            max-width: none;
        }

        .player-col {
            min-width: 8rem;
        }
    }
    /* End touch/mobile scroll mode */

    @media (max-width: 900px) {
        .page-header-toolbar,
        .page-header-actions {
            flex-direction: column;
            align-items: flex-start;
        }

        .variant-radio-group {
            flex-wrap: wrap;
        }
    }
</style>
