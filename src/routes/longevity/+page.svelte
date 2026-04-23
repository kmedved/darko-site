<script>
    import LongevityRosterChart from '$lib/components/LongevityRosterChart.svelte';
    import LongevityCareerLengthChart from '$lib/components/LongevityCareerLengthChart.svelte';
    import { apiLongevity, apiPlayerLongevity } from '$lib/api.js';
    import { exportCsvRows, longevityCsvColumns } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import {
        filterLongevityRows,
        formatLongevityDisplayValue,
        getLongevitySortConfig,
        paginateRows,
        resolveActiveLongevityPlayer
    } from '$lib/utils/longevityTable.js';

    const tableColumns = [
        { key: '_rank', label: '#', align: 'right', sortable: false, filterable: false },
        { key: 'player_name', label: 'Player', align: 'left' },
        { key: 'team_name', label: 'Team', align: 'left' },
        { key: 'rookie_season', label: 'Rookie Season', align: 'right' },
        { key: 'career_games', label: 'Career Games', align: 'right' },
        { key: 'age', label: 'Age', align: 'right' },
        { key: 'est_retirement_age', label: 'Est. Retirement Age', align: 'right' },
        { key: 'years_remaining', label: 'Years Remaining', align: 'right' },
        { key: 'p1', label: '+1', align: 'right' },
        { key: 'p2', label: '+2', align: 'right' },
        { key: 'p3', label: '+3', align: 'right' },
        { key: 'p5', label: '+5', align: 'right' },
        { key: 'p10', label: '+10', align: 'right' }
    ];

    const pageSizeOptions = [10, 20, 50, 100];
    const longevitySortConfig = getLongevitySortConfig();
    const PROJECTED_GAMES_PER_SEASON = 69;

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
    let teamFilter = $state('');
    let positionFilter = $state('');
    let showColumnFilters = $state(false);
    let trajectoryByPlayer = $state({});
    let loadingTrajectoryByPlayer = $state({});

    const teamOptions = $derived.by(() => {
        const teams = new Set();
        for (const row of rows) {
            if (row.team_name) teams.add(row.team_name);
        }
        return [...teams].sort((left, right) => teamAbbr(left).localeCompare(teamAbbr(right)));
    });

    const positionOptions = $derived.by(() => {
        const positions = new Set();
        for (const row of rows) {
            if (row.position) positions.add(row.position);
        }
        return [...positions].sort();
    });

    const filteredRows = $derived.by(() => {
        let nextRows = filterLongevityRows(rows, globalQuery, columnFilters);

        if (teamFilter) {
            nextRows = nextRows.filter((row) => row.team_name === teamFilter);
        }

        if (positionFilter) {
            nextRows = nextRows.filter((row) => row.position === positionFilter);
        }

        return nextRows;
    });

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

    const summaryCards = $derived.by(() => buildSummaryCards(activePlayer));

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

    function setTeamFilter(value) {
        teamFilter = value;
        page = 1;
    }

    function setPositionFilter(value) {
        positionFilter = value;
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

    function formatFixedValue(value, decimals = 1) {
        const numberValue = Number.parseFloat(value);
        if (!Number.isFinite(numberValue)) return '—';
        return numberValue.toFixed(decimals);
    }

    function formatPercentValue(value) {
        const numberValue = Number.parseFloat(value);
        if (!Number.isFinite(numberValue)) return '—';
        return `${numberValue.toFixed(1)}%`;
    }

    function formatWholeNumber(value) {
        const numberValue = Number.parseFloat(value);
        if (!Number.isFinite(numberValue)) return '—';
        return Math.round(numberValue).toLocaleString();
    }

    function projectedCareerGames(player) {
        if (!player) return null;
        const careerGames = Number.parseFloat(player.career_games);
        const yearsRemaining = Number.parseFloat(player.years_remaining);
        if (!Number.isFinite(careerGames) || !Number.isFinite(yearsRemaining)) return null;
        return careerGames + yearsRemaining * PROJECTED_GAMES_PER_SEASON;
    }

    function retentionLabel(value) {
        const numberValue = Number.parseFloat(value);
        if (!Number.isFinite(numberValue)) return 'Pending';
        if (numberValue >= 90) return 'Very High';
        if (numberValue >= 75) return 'High';
        if (numberValue >= 50) return 'Likely';
        if (numberValue >= 25) return 'Bubble';
        return 'Long Shot';
    }

    function buildSummaryCards(player) {
        return [
            {
                label: 'Estimated Retirement Age',
                value: formatFixedValue(player?.est_retirement_age, 1),
                detail: 'Years Old',
                icon: 'calendar'
            },
            {
                label: 'Years Remaining',
                value: formatFixedValue(player?.years_remaining, 1),
                detail: 'Seasons',
                icon: 'hourglass'
            },
            {
                label: 'Prob. Active in +5 Seasons',
                value: formatPercentValue(player?.p5),
                detail: retentionLabel(player?.p5),
                icon: 'trend'
            },
            {
                label: 'Prob. Active in +10 Seasons',
                value: formatPercentValue(player?.p10),
                detail: retentionLabel(player?.p10),
                icon: 'trend'
            },
            {
                label: 'Career Games (Proj.)',
                value: formatWholeNumber(projectedCareerGames(player)),
                detail: 'Projected Total',
                icon: 'globe'
            }
        ];
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

    function teamLogoUrl(row) {
        const teamId = Number.parseInt(row?.tm_id, 10);
        return Number.isInteger(teamId) && teamId > 0 ? `/api/img/logo/${teamId}` : null;
    }

    function hideBrokenImage(event) {
        event.currentTarget.hidden = true;
    }

    function clearFilters() {
        globalQuery = '';
        teamFilter = '';
        positionFilter = '';
        columnFilters = getDefaultColumnFilters();
        page = 1;
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

<div class="longevity-page">
    <div class="container longevity-container">
        <section class="longevity-hero" aria-labelledby="longevity-title">
            <div class="longevity-title-block">
                <div class="longevity-icon" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div>
                    <h1 id="longevity-title">Longevity Projections</h1>
                    <p>Active-player career-length outlooks and roster retention probabilities.</p>
                </div>
            </div>

            {#if !loading && !error}
                <div class="summary-card-grid" aria-label="Selected player longevity summary">
                    {#each summaryCards as card (card.label)}
                        <article class="summary-card">
                            <div class="summary-icon {card.icon}" aria-hidden="true">
                                <span></span>
                            </div>
                            <div class="summary-copy">
                                <p>{card.label}</p>
                                <strong>{card.value}</strong>
                                <small>{card.detail}</small>
                            </div>
                        </article>
                    {/each}
                </div>
            {/if}
        </section>

        {#if loading}
            <div class="longevity-loading" aria-live="polite">
                <span></span>
                <span></span>
                <span></span>
            </div>
        {:else if error}
            <div class="longevity-message error-msg">{error}</div>
        {:else}
            <div class="charts-grid">
                <section class="chart-card">
                    <div class="chart-card-header">
                        <div>
                            <h2>{activePlayer?.player_name || 'No Player Selected'}</h2>
                            <p>Projected Retirement Age by Season Start Point</p>
                        </div>
                    </div>
                    <LongevityRosterChart player={activePlayer} />
                </section>

                <section class="chart-card">
                    <div class="chart-card-header">
                        <div>
                            <h2>{activePlayer?.player_name || 'No Player Selected'}</h2>
                            <p>Probability of Being on Roster Over Future Seasons</p>
                        </div>
                    </div>
                    <LongevityCareerLengthChart player={activePlayer} />
                </section>
            </div>

            <section class="longevity-table-panel" aria-labelledby="longevity-table-title">
                <div class="table-title-row">
                    <div>
                        <h2 id="longevity-table-title">Career Longevity Projections</h2>
                        <p>
                            Showing {pageRangeStart} to {pageRangeEnd} of {sortedRows.length} entries.
                        </p>
                    </div>
                    <button
                        class="page-action-btn"
                        type="button"
                        onclick={exportLongevityCsv}
                        disabled={sortedRows.length === 0}
                    >
                        Download CSV
                    </button>
                </div>

                <div class="table-controls">
                    <label class="control-field search-control" for="longevity-search">
                        <span class="sr-only">Search players</span>
                        <input
                            id="longevity-search"
                            type="text"
                            value={globalQuery}
                            oninput={(event) => setSearch(event.currentTarget.value)}
                            placeholder="Search players..."
                        />
                    </label>

                    <label class="control-field select-control" for="team-filter">
                        <span class="sr-only">Team filter</span>
                        <select
                            id="team-filter"
                            value={teamFilter}
                            onchange={(event) => setTeamFilter(event.currentTarget.value)}
                        >
                            <option value="">All Teams</option>
                            {#each teamOptions as team (team)}
                                <option value={team}>{teamAbbr(team)}</option>
                            {/each}
                        </select>
                    </label>

                    <label class="control-field select-control" for="position-filter">
                        <span class="sr-only">Position filter</span>
                        <select
                            id="position-filter"
                            value={positionFilter}
                            onchange={(event) => setPositionFilter(event.currentTarget.value)}
                        >
                            <option value="">All Positions</option>
                            {#each positionOptions as position (position)}
                                <option value={position}>{position}</option>
                            {/each}
                        </select>
                    </label>

                    <button
                        type="button"
                        class="page-action-btn filter-toggle"
                        aria-pressed={showColumnFilters}
                        onclick={() => (showColumnFilters = !showColumnFilters)}
                    >
                        More Filters
                    </button>

                    <button
                        type="button"
                        class="page-action-btn clear-filter-btn"
                        onclick={clearFilters}
                    >
                        Clear
                    </button>

                    <label class="entries-control">
                        Show
                        <select
                            value={pageSize}
                            onchange={(event) => setPageSize(Number.parseInt(event.currentTarget.value, 10))}
                        >
                            {#each pageSizeOptions as option (option)}
                                <option value={option}>{option}</option>
                            {/each}
                        </select>
                        entries
                    </label>
                </div>

                <div class="table-wrapper">
                    <table>
                        <thead>
                            <tr class="header-row">
                                {#each tableColumns as column (column.key)}
                                    <th
                                        class="{column.sortable === false ? '' : 'sortable'} {column.align === 'right' ? 'align-right' : ''} {sortColumn === column.key ? 'active' : ''}"
                                        onclick={() => column.sortable === false ? null : toggleSort(column.key)}
                                    >
                                        {column.label}
                                        {#if column.sortable !== false}
                                            <span class="sort-indicator">{sortGlyph(column.key)}</span>
                                        {/if}
                                    </th>
                                {/each}
                            </tr>
                            {#if showColumnFilters}
                                <tr class="filter-row">
                                    {#each tableColumns as column (column.key)}
                                        <th class={column.align === 'right' ? 'align-right' : ''}>
                                            {#if column.filterable !== false}
                                                <input
                                                    type="text"
                                                    value={columnFilters[column.key]}
                                                    oninput={(event) => setColumnFilter(column.key, event.currentTarget.value)}
                                                    placeholder="All"
                                                />
                                            {/if}
                                        </th>
                                    {/each}
                                </tr>
                            {/if}
                        </thead>
                        <tbody>
                            {#if pageRows.length === 0}
                                <tr>
                                    <td class="empty-row" colspan={tableColumns.length}>No matching rows.</td>
                                </tr>
                            {:else}
                                {#each pageRows as row, index (row.nba_id)}
                                    <tr
                                        class="data-row {activePlayerId === row.nba_id ? 'active-row' : ''}"
                                        role="button"
                                        tabindex="0"
                                        aria-pressed={activePlayerId === row.nba_id}
                                        onclick={() => setActivePlayer(row.nba_id)}
                                        onkeydown={(event) => handleRowKeydown(event, row.nba_id)}
                                    >
                                        {#each tableColumns as column (column.key)}
                                            <td
                                                class="{column.align === 'right' ? 'align-right' : ''} {getCellClass(column, row)}"
                                            >
                                                {#if column.key === '_rank'}
                                                    {pageRangeStart + index}
                                                {:else if column.key === 'player_name'}
                                                    <span class="player-name-cell">
                                                        {row.player_name}
                                                        {#if activePlayerId === row.nba_id}
                                                            <span class="active-player-indicator" aria-hidden="true"></span>
                                                        {/if}
                                                    </span>
                                                {:else if column.key === 'team_name'}
                                                    <span class="team-cell">
                                                        <span class="team-mark">
                                                            {#if teamLogoUrl(row)}
                                                                <img src={teamLogoUrl(row)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                                            {/if}
                                                        </span>
                                                        {teamAbbr(row.team_name)}
                                                    </span>
                                                {:else}
                                                    {formatLongevityDisplayValue(row, column.key)}
                                                {/if}
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
                        Results based on active-player longevity projections.
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
            </section>
        {/if}
    </div>
</div>

<style>
    .longevity-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        padding: 24px 0 34px;
        background:
            radial-gradient(circle at 92% 3%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
            var(--bg);
    }

    .longevity-container {
        max-width: 1880px;
        display: grid;
        gap: 18px;
    }

    .longevity-hero {
        position: relative;
        overflow: hidden;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background:
            radial-gradient(circle at 90% -8%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
            var(--bg);
        box-shadow: 0 18px 48px color-mix(in srgb, var(--text) 10%, transparent);
        padding: 24px 28px;
    }

    .longevity-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            repeating-radial-gradient(circle at 72% 6%, transparent 0 34px, color-mix(in srgb, var(--border-subtle) 65%, transparent) 35px 36px);
        opacity: 0.42;
        pointer-events: none;
    }

    .longevity-title-block,
    .summary-card-grid {
        position: relative;
        z-index: 1;
    }

    .longevity-title-block {
        display: flex;
        align-items: center;
        gap: 18px;
    }

    .longevity-title-block > div:last-child {
        flex: 1;
        min-width: 0;
    }

    .longevity-icon {
        width: 70px;
        height: 70px;
        border-radius: 50%;
        display: grid;
        grid-template-columns: repeat(3, 7px);
        justify-content: center;
        align-items: end;
        gap: 5px;
        padding-bottom: 20px;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        box-shadow: 0 12px 28px color-mix(in srgb, var(--text) 12%, transparent);
        flex: 0 0 auto;
    }

    .longevity-icon span {
        display: block;
        width: 7px;
        border-radius: 999px;
        background: var(--accent);
    }

    .longevity-icon span:nth-child(1) { height: 10px; opacity: 0.68; }
    .longevity-icon span:nth-child(2) { height: 18px; opacity: 0.82; }
    .longevity-icon span:nth-child(3) { height: 28px; }

    h1 {
        font-size: clamp(30px, 3vw, 44px);
        line-height: 0.98;
        letter-spacing: 0;
        color: var(--text);
        font-weight: 850;
    }

    .longevity-title-block p {
        color: var(--text-secondary);
        font-size: 17px;
        margin-top: 8px;
        overflow-wrap: anywhere;
    }

    .summary-card-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
    }

    .summary-card {
        min-height: 94px;
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-surface) 88%, var(--bg));
        box-shadow: 0 10px 24px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 13px 14px;
    }

    .summary-icon {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
        color: var(--accent);
        position: relative;
    }

    .summary-icon::before,
    .summary-icon::after,
    .summary-icon span {
        content: '';
        position: absolute;
        display: block;
    }

    .summary-icon.calendar::before {
        width: 18px;
        height: 16px;
        border: 2px solid currentColor;
        border-radius: 3px;
    }

    .summary-icon.calendar::after {
        width: 18px;
        height: 2px;
        background: currentColor;
        top: 14px;
    }

    .summary-icon.hourglass::before {
        width: 16px;
        height: 20px;
        border: 2px solid currentColor;
        clip-path: polygon(0 0, 100% 0, 62% 50%, 100% 100%, 0 100%, 38% 50%);
    }

    .summary-icon.trend::before {
        width: 17px;
        height: 10px;
        border-left: 2px solid currentColor;
        border-bottom: 2px solid currentColor;
        left: 10px;
        bottom: 10px;
    }

    .summary-icon.trend::after {
        width: 16px;
        height: 2px;
        background: currentColor;
        left: 15px;
        top: 18px;
        transform: rotate(-31deg);
        transform-origin: left center;
    }

    .summary-icon.trend span {
        width: 6px;
        height: 6px;
        border-top: 2px solid currentColor;
        border-right: 2px solid currentColor;
        right: 9px;
        top: 12px;
    }

    .summary-icon.globe::before {
        width: 20px;
        height: 20px;
        border: 2px solid currentColor;
        border-radius: 50%;
    }

    .summary-icon.globe::after {
        width: 2px;
        height: 18px;
        background: currentColor;
    }

    .summary-icon.globe span {
        width: 18px;
        height: 2px;
        background: currentColor;
    }

    .summary-copy {
        min-width: 0;
    }

    .summary-copy p {
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 700;
        line-height: 1.15;
        margin-bottom: 7px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .summary-copy strong {
        display: block;
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 22px;
        line-height: 1;
        margin-bottom: 6px;
    }

    .summary-copy small {
        display: block;
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 700;
        line-height: 1.15;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .longevity-loading {
        display: grid;
        gap: 12px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        padding: 28px;
    }

    .longevity-loading span {
        display: block;
        height: 14px;
        max-width: 760px;
        border-radius: 999px;
        background:
            linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 12%, transparent), transparent),
            var(--bg-elevated);
        background-size: 220% 100%;
        animation: longevity-shimmer 1.2s linear infinite;
    }

    .longevity-loading span:nth-child(2) { width: 72%; }
    .longevity-loading span:nth-child(3) { width: 48%; }

    .longevity-message {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text-secondary);
        padding: 24px;
    }

    .error-msg {
        border-color: color-mix(in srgb, var(--negative) 42%, var(--border));
        background: var(--negative-bg);
        color: var(--negative);
    }

    .charts-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 16px;
    }

    .chart-card {
        min-width: 0;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        padding: 18px 20px 14px;
        box-shadow: 0 14px 34px color-mix(in srgb, var(--text) 9%, transparent);
    }

    .chart-card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 8px;
    }

    .chart-card h2 {
        font-size: 22px;
        line-height: 1.05;
        letter-spacing: 0;
        color: var(--text);
        font-weight: 850;
        margin-bottom: 8px;
    }

    .chart-card p {
        font-size: 13px;
        color: var(--text-secondary);
        margin-bottom: 0;
    }

    .longevity-table-panel {
        min-width: 0;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: var(--bg-surface);
        padding: 18px 20px 16px;
        box-shadow: 0 16px 36px color-mix(in srgb, var(--text) 9%, transparent);
    }

    .table-title-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 12px;
    }

    .table-title-row h2 {
        font-size: 22px;
        line-height: 1.05;
        letter-spacing: 0;
        color: var(--text);
        font-weight: 850;
    }

    .table-title-row p {
        color: var(--text-secondary);
        font-size: 12px;
        margin-top: 6px;
    }

    .table-controls {
        display: grid;
        grid-template-columns: minmax(220px, 1fr) minmax(140px, 160px) minmax(140px, 160px) auto auto auto;
        gap: 10px;
        align-items: center;
        margin-bottom: 12px;
    }

    .control-field {
        min-width: 0;
    }

    .search-control input,
    .select-control select,
    .entries-control select {
        width: 100%;
        height: 38px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        padding: 0 12px;
        outline: none;
    }

    .search-control input:focus,
    .select-control select:focus,
    .entries-control select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .entries-control {
        display: inline-grid;
        grid-template-columns: auto 70px auto;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 12px;
        white-space: nowrap;
    }

    .filter-toggle[aria-pressed='true'] {
        border-color: var(--accent);
        color: var(--accent);
    }

    .table-wrapper {
        width: 100%;
        overflow: visible;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        width: 100%;
        min-width: 1160px;
    }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 2;
        height: 40px;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 0 10px;
        white-space: nowrap;
        text-align: left;
    }

    .filter-row th {
        top: calc(var(--nav-sticky-offset) + 40px);
        background: var(--bg-elevated);
        padding: 7px 8px;
        height: 42px;
    }

    .filter-row input {
        width: 100%;
        height: 28px;
        background: var(--bg);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 12px;
        padding: 0 8px;
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
        color: var(--accent);
    }

    .sort-indicator {
        margin-left: 5px;
        color: var(--text-secondary);
        font-size: 10px;
        opacity: 0.75;
    }

    th.active .sort-indicator {
        opacity: 1;
        color: var(--accent);
    }

    td {
        padding: 9px 10px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 700;
        color: var(--text);
        background: var(--bg-surface);
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    td:first-child,
    th:first-child,
    .filter-row th:first-child {
        width: 42px;
        min-width: 42px;
        text-align: right;
    }

    td:nth-child(2),
    th:nth-child(2),
    .filter-row th:nth-child(2) {
        position: sticky;
        left: 0;
        z-index: 3;
        min-width: 250px;
        background: var(--bg);
        box-shadow: 1px 0 0 var(--border-subtle);
    }

    td:nth-child(2) {
        background: var(--bg-surface);
    }

    .filter-row th:nth-child(2) {
        background: var(--bg-elevated);
    }

    .data-row {
        cursor: pointer;
        outline: none;
    }

    .data-row:hover td,
    .data-row:focus-visible td {
        background: var(--bg-elevated);
    }

    .data-row:hover td:nth-child(2),
    .data-row:focus-visible td:nth-child(2) {
        background: var(--bg-elevated);
    }

    .active-row td {
        background: color-mix(in srgb, var(--positive-bg) 62%, var(--bg-surface));
    }

    .active-row td:nth-child(2) {
        background: color-mix(in srgb, var(--positive-bg) 62%, var(--bg-surface));
        box-shadow: inset 3px 0 0 var(--accent), 1px 0 0 var(--border-subtle);
    }

    .player-name-cell {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 850;
        color: var(--text);
    }

    .active-player-indicator {
        width: 11px;
        height: 11px;
        background: var(--accent);
        clip-path: polygon(50% 0, 61% 34%, 98% 35%, 68% 56%, 79% 92%, 50% 70%, 21% 92%, 32% 56%, 2% 35%, 39% 34%);
        flex: 0 0 auto;
    }

    .team-cell {
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        color: var(--text-secondary);
        min-width: 72px;
    }

    .team-mark {
        width: 22px;
        height: 22px;
        display: inline-grid;
        place-items: center;
        border-radius: 50%;
        background: var(--bg-elevated);
        flex: 0 0 auto;
    }

    .team-mark img {
        width: 20px;
        height: 20px;
        object-fit: contain;
    }

    td.probability-elite {
        color: var(--positive);
    }

    td.probability-high {
        color: var(--positive);
    }

    td.probability-mid {
        color: var(--accent);
    }

    td.probability-low {
        color: var(--text-secondary);
    }

    td.probability-minimal {
        color: var(--text-muted);
    }

    td:nth-child(8) {
        color: var(--accent);
    }

    .empty-row {
        text-align: center;
        color: var(--text-muted);
        padding: 24px;
        font-family: var(--font-sans);
        font-size: 13px;
    }

    .table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 12px;
    }

    .entry-count {
        font-size: 12px;
        color: var(--text-secondary);
    }

    .pagination-controls {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    @keyframes longevity-shimmer {
        from {
            background-position: 220% 0;
        }

        to {
            background-position: -220% 0;
        }
    }

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        table {
            width: max-content;
            min-width: 100%;
        }

        th {
            position: static;
        }

        .filter-row th,
        td:nth-child(2),
        th:nth-child(2),
        .filter-row th:nth-child(2) {
            position: static;
            top: auto;
            left: auto;
            box-shadow: none;
        }
    }
    /* End touch/mobile scroll mode */

    @media (hover: hover) and (pointer: fine) and (max-width: 1380px) {
        .table-wrapper th:nth-child(n + 12),
        .table-wrapper td:nth-child(n + 12) {
            display: none;
        }
    }

    @media (hover: hover) and (pointer: fine) and (max-width: 1180px) {
        .table-wrapper th:nth-child(n + 9),
        .table-wrapper td:nth-child(n + 9) {
            display: none;
        }
    }

    @media (max-width: 1180px) {
        .summary-card-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .charts-grid {
            grid-template-columns: 1fr;
        }

        .table-controls {
            grid-template-columns: minmax(220px, 1fr) minmax(140px, 160px) minmax(140px, 160px);
        }

        .filter-toggle,
        .clear-filter-btn,
        .entries-control {
            width: 100%;
        }
    }

    @media (max-width: 768px) {
        .longevity-page {
            padding: 16px 0 26px;
        }

        .longevity-hero,
        .chart-card,
        .longevity-table-panel {
            padding: 18px;
        }

        .longevity-title-block {
            align-items: flex-start;
            gap: 14px;
        }

        .longevity-icon {
            width: 54px;
            height: 54px;
            padding-bottom: 14px;
        }

        .longevity-icon span {
            width: 6px;
        }

        h1 {
            font-size: 26px;
        }

        .longevity-title-block p {
            font-size: 14px;
        }

        .summary-card-grid,
        .table-controls {
            grid-template-columns: 1fr;
        }

        .table-title-row,
        .table-footer {
            flex-direction: column;
            align-items: flex-start;
        }

        .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        table {
            width: max-content;
            min-width: 1040px;
        }

        th,
        .filter-row th,
        td:nth-child(2),
        th:nth-child(2),
        .filter-row th:nth-child(2) {
            position: static;
            top: auto;
            left: auto;
            box-shadow: none;
        }
    }
</style>
