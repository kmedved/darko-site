<script>
    import LongevityRosterChart from '$lib/components/LongevityRosterChart.svelte';
    import LongevityCareerLengthChart from '$lib/components/LongevityCareerLengthChart.svelte';
    import { apiLongevity, apiPlayerLongevity } from '$lib/api.js';
    import { exportCsvRows, longevityCsvColumns } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import {
        filterLongevityRows,
        formatLongevityDisplayValue,
        getLongevitySortConfig,
        paginateRows,
        resolveActiveLongevityPlayer
    } from '$lib/utils/longevityTable.js';

    const tableColumns = [
        { key: 'player_name', label: 'Player', align: 'left' },
        { key: 'rookie_season', label: 'Rookie Season', align: 'right' },
        { key: 'career_games', label: 'Career Games', align: 'right' },
        { key: 'age', label: 'Age', align: 'right' },
        { key: 'est_retirement_age', label: 'Est. Retirement Age', align: 'right' },
        { key: 'years_remaining', label: 'Years Remaining', align: 'right' },
        ...Array.from({ length: 15 }, (_, index) => ({
            key: `p${index + 1}`,
            label: `+${index + 1}`,
            align: 'right'
        }))
    ];

    const pageSizeOptions = [10, 20, 50, 100];
    const longevitySortConfig = getLongevitySortConfig();

    function getDefaultColumnFilters() {
        const defaults = {};
        for (const column of tableColumns) {
            defaults[column.key] = '';
        }
        return defaults;
    }

    let rows = $state([]);
    let loading = $state(true);
    let error = $state(null);
    let sortColumn = $state('years_remaining');
    let sortDirection = $state('desc');
    let globalQuery = $state('');
    let page = $state(1);
    let pageSize = $state(20);
    let activePlayerId = $state(null);
    let columnFilters = $state(getDefaultColumnFilters());
    let trajectoryByPlayer = $state({});
    let loadingTrajectoryByPlayer = $state({});

    const filteredRows = $derived.by(() =>
        filterLongevityRows(rows, globalQuery, columnFilters)
    );

    const sortedRows = $derived.by(() =>
        getSortedRows(filteredRows, {
            sortColumn,
            sortDirection,
            sortConfigs: longevitySortConfig
        })
    );

    const totalPages = $derived.by(() =>
        Math.max(1, Math.ceil(sortedRows.length / pageSize))
    );

    const pageRows = $derived.by(() => paginateRows(sortedRows, page, pageSize));

    const pageRangeStart = $derived.by(() =>
        sortedRows.length === 0 ? 0 : (page - 1) * pageSize + 1
    );

    const pageRangeEnd = $derived.by(() =>
        sortedRows.length === 0 ? 0 : Math.min(page * pageSize, sortedRows.length)
    );

    const activePlayer = $derived.by(() => {
        const selected = resolveActiveLongevityPlayer(sortedRows, activePlayerId);
        if (!selected) return null;
        const trajectory = trajectoryByPlayer[selected.nba_id];
        if (!trajectory) return selected;
        return {
            ...selected,
            trajectory
        };
    });

    $effect(() => {
        apiLongevity()
            .then((data = []) => {
                rows = data;
                trajectoryByPlayer = {};
                loadingTrajectoryByPlayer = {};
                loading = false;
            })
            .catch((err) => {
                error = err?.message || 'Failed to load longevity projections';
                rows = [];
                trajectoryByPlayer = {};
                loadingTrajectoryByPlayer = {};
                loading = false;
            });
    });

    $effect(() => {
        const resolvedPlayer = resolveActiveLongevityPlayer(sortedRows, activePlayerId);
        const nextActiveId = resolvedPlayer ? resolvedPlayer.nba_id : null;
        if (activePlayerId !== nextActiveId) {
            activePlayerId = nextActiveId;
        }
    });

    $effect(() => {
        const maxPage = Math.max(1, Math.ceil(sortedRows.length / pageSize));
        if (page > maxPage) {
            page = maxPage;
        }
    });

    $effect(() => {
        const selected = resolveActiveLongevityPlayer(sortedRows, activePlayerId);
        const nbaId = selected?.nba_id;
        if (!nbaId) return;
        if (trajectoryByPlayer[nbaId] || loadingTrajectoryByPlayer[nbaId]) return;

        loadingTrajectoryByPlayer = {
            ...loadingTrajectoryByPlayer,
            [nbaId]: true
        };

        apiPlayerLongevity(nbaId)
            .then((points = []) => {
                trajectoryByPlayer = {
                    ...trajectoryByPlayer,
                    [nbaId]: points
                };
            })
            .catch(() => {
                trajectoryByPlayer = {
                    ...trajectoryByPlayer,
                    [nbaId]: []
                };
            })
            .finally(() => {
                const next = { ...loadingTrajectoryByPlayer };
                delete next[nbaId];
                loadingTrajectoryByPlayer = next;
            });
    });

    function sortGlyph(column) {
        if (sortColumn !== column) return '↕';
        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function toggleSort(column) {
        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            page = 1;
            return;
        }

        sortColumn = column;
        sortDirection = 'asc';
        page = 1;
    }

    function setColumnFilter(column, value) {
        columnFilters = {
            ...columnFilters,
            [column]: value
        };
        page = 1;
    }

    function setSearch(value) {
        globalQuery = value;
        page = 1;
    }

    function setPageSize(value) {
        pageSize = Number.isFinite(value) && value > 0 ? value : 20;
        page = 1;
    }

    function setActivePlayer(nbaId) {
        activePlayerId = nbaId;
    }

    function handleRowKeydown(event, nbaId) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        setActivePlayer(nbaId);
    }

    function previousPage() {
        if (page > 1) page -= 1;
    }

    function nextPage() {
        if (page < totalPages) page += 1;
    }

    function formatSeasonLabelFromRookie(rookieSeason) {
        const startYear = Number.parseInt(rookieSeason, 10) - 1;
        if (!Number.isFinite(startYear)) return 'Current';
        const suffix = String((startYear + 1) % 100).padStart(2, '0');
        return `${startYear}-${suffix}`;
    }

    function probabilityClass(rawValue) {
        const value = Number.parseFloat(rawValue);
        if (!Number.isFinite(value)) return '';
        if (value >= 80) return 'probability-elite';
        if (value >= 60) return 'probability-high';
        if (value >= 40) return 'probability-mid';
        if (value >= 20) return 'probability-low';
        return 'probability-minimal';
    }

    function getCellClass(column, row) {
        if (!/^p\d+$/.test(column.key)) return '';
        return probabilityClass(row[column.key]);
    }

    function exportLongevityCsv() {
        exportCsvRows({
            rows: sortedRows,
            columns: longevityCsvColumns,
            filename: 'darko-longevity-projections.csv'
        });
    }
</script>

<svelte:head>
    <title>Longevity Projections — DARKO DPM</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <div class="page-header-toolbar">
            <div>
                <h1>Longevity Projections</h1>
                <p>Active-player career-length outlooks and roster retention probabilities.</p>
            </div>
            <div class="page-header-actions">
                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportLongevityCsv}
                    disabled={loading || !!error || sortedRows.length === 0}
                >
                    Download CSV
                </button>
            </div>
        </div>
    </div>

    {#if loading}
        <div class="loading">Loading longevity projections...</div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else}
        <div class="charts-grid">
            <section class="chart-card">
                <h2>{activePlayer?.player_name || 'No Player Selected'}</h2>
                <p>
                    Longevity Projections Onwards From
                    {activePlayer ? formatSeasonLabelFromRookie(activePlayer.rookie_season) : 'Current'}
                </p>
                <LongevityRosterChart player={activePlayer} />
            </section>

            <section class="chart-card">
                <h2>{activePlayer?.player_name || 'No Player Selected'}</h2>
                <p>Career Length Projections</p>
                <LongevityCareerLengthChart player={activePlayer} />
            </section>
        </div>

        <div class="table-controls">
            <label class="entries-control">
                Show
                <select
                    value={pageSize}
                    onchange={(event) => setPageSize(Number.parseInt(event.currentTarget.value, 10))}
                >
                    {#each pageSizeOptions as option}
                        <option value={option}>{option}</option>
                    {/each}
                </select>
                entries
            </label>

            <label class="search-control" for="longevity-search">
                Search:
                <input
                    id="longevity-search"
                    type="text"
                    value={globalQuery}
                    oninput={(event) => setSearch(event.currentTarget.value)}
                    placeholder="Type a name..."
                />
            </label>
        </div>

        <h2 class="section-title">Career Longevity Projections</h2>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr class="header-row">
                        {#each tableColumns as column}
                            <th
                                class="sortable {column.align === 'right' ? 'align-right' : ''} {sortColumn === column.key ? 'active' : ''}"
                                onclick={() => toggleSort(column.key)}
                            >
                                {column.label}
                                <span class="sort-indicator">{sortGlyph(column.key)}</span>
                            </th>
                        {/each}
                    </tr>
                    <tr class="filter-row">
                        {#each tableColumns as column}
                            <th class={column.align === 'right' ? 'align-right' : ''}>
                                <input
                                    type="text"
                                    value={columnFilters[column.key]}
                                    oninput={(event) => setColumnFilter(column.key, event.currentTarget.value)}
                                    placeholder="All"
                                />
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#if pageRows.length === 0}
                        <tr>
                            <td class="empty-row" colspan={tableColumns.length}>No matching rows.</td>
                        </tr>
                    {:else}
                        {#each pageRows as row}
                            <tr
                                class="data-row {activePlayerId === row.nba_id ? 'active-row' : ''}"
                                role="button"
                                tabindex="0"
                                aria-pressed={activePlayerId === row.nba_id}
                                onclick={() => setActivePlayer(row.nba_id)}
                                onkeydown={(event) => handleRowKeydown(event, row.nba_id)}
                            >
                                {#each tableColumns as column}
                                    <td
                                        class="{column.align === 'right' ? 'align-right' : ''} {getCellClass(column, row)}"
                                    >
                                        {formatLongevityDisplayValue(row, column.key)}
                                    </td>
                                {/each}
                            </tr>
                        {/each}
                    {/if}
                </tbody>
            </table>
        </div>

        <div class="table-footer">
            <div class="entry-count">
                Showing {pageRangeStart} to {pageRangeEnd} of {sortedRows.length} entries
            </div>
            <div class="pagination-controls">
                <button type="button" class="page-action-btn" onclick={previousPage} disabled={page <= 1}>
                    Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button type="button" class="page-action-btn" onclick={nextPage} disabled={page >= totalPages}>
                    Next
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .charts-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-bottom: 24px;
    }

    .chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px 16px;
    }

    .chart-card h2 {
        font-size: 36px;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--text);
        margin-bottom: 2px;
    }

    .chart-card p {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 8px;
    }

    .table-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 14px;
    }

    .entries-control {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text);
    }

    .entries-control select {
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        padding: 6px 8px;
    }

    .search-control {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text);
    }

    .search-control input {
        width: 220px;
        background: var(--bg-elevated);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        padding: 7px 10px;
        outline: none;
    }

    .search-control input:focus {
        border-color: var(--accent);
    }

    .section-title {
        font-size: 42px;
        line-height: 1.1;
        text-align: center;
        letter-spacing: -0.03em;
        margin: 22px 0 20px;
    }

    .table-wrapper {
        margin-bottom: 14px;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 15;
        background: var(--bg-surface);
        border-bottom: 1px solid var(--border);
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        padding: 8px 8px;
        white-space: nowrap;
        text-align: left;
    }

    .filter-row th {
        top: calc(var(--nav-sticky-offset) + 32px);
        z-index: 14;
        padding: 7px 8px;
        background: var(--bg-elevated);
        text-transform: none;
    }

    .filter-row input {
        width: 100%;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 12px;
        padding: 5px 7px;
        outline: none;
    }

    .filter-row input:focus {
        border-color: var(--accent);
    }

    th.align-right,
    td.align-right {
        text-align: right;
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

    td {
        padding: 8px 8px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 500;
    }

    td:first-child {
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 600;
        text-align: left;
    }

    .data-row {
        cursor: pointer;
        outline: none;
    }

    .data-row:hover td,
    .data-row:focus-visible td {
        background: var(--bg-elevated);
    }

    .active-row td {
        background: var(--accent);
        color: var(--bg-surface);
    }

    .active-row td.probability-elite,
    .active-row td.probability-high,
    .active-row td.probability-mid,
    .active-row td.probability-low,
    .active-row td.probability-minimal {
        color: var(--bg-surface);
    }

    td.probability-elite {
        background: var(--positive-bg);
        color: var(--positive);
    }

    td.probability-high {
        background: var(--bg-elevated);
        color: var(--accent);
    }

    td.probability-mid {
        background: var(--bg-hover);
        color: var(--text-secondary);
    }

    td.probability-low {
        color: var(--text-secondary);
    }

    td.probability-minimal {
        color: var(--text-muted);
    }

    .empty-row {
        text-align: center;
        color: var(--text-muted);
        padding: 20px;
        font-family: var(--font-sans);
        font-size: 13px;
    }

    .table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 40px;
    }

    .entry-count {
        font-size: 13px;
        color: var(--text-secondary);
    }

    .pagination-controls {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    @media (max-width: 900px) {
        .charts-grid {
            grid-template-columns: 1fr;
        }

        .table-controls {
            flex-direction: column;
            align-items: flex-start;
        }

        .search-control input {
            width: 100%;
            min-width: 0;
        }

        .section-title {
            font-size: 30px;
        }

        .chart-card h2 {
            font-size: 28px;
        }

        th,
        td {
            padding: 7px 6px;
        }

        .filter-row th {
            top: 238px;
        }
    }
</style>
