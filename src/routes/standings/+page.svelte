<script>
    import ConferenceChart from '$lib/components/ConferenceChart.svelte';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { exportCsvRows, standingsCsvColumns, standingsExpandedCsvColumns, formatFixed } from '$lib/utils/csvPresets.js';

    let { data } = $props();

    let conference = $state('East');
    let sortColumn = $state('Rk');
    let sortDirection = $state('asc');
    let chartMetric = $state('W');
    let showExpandedStandings = $state(false);

    const standingsSortConfig = {
        Rk: { type: 'number' },
        team_name: { type: 'text' },
        Current: { type: 'record' },
        W: { type: 'number' },
        L: { type: 'number' },
        SRS: { type: 'number' },
        Playoffs: { type: 'percent' },
        'W/L%': { type: 'percent' },
        Remain: { type: 'record' },
        Best: { type: 'record' },
        Worst: { type: 'record' },
        Division: { type: 'percent' },
        seed_1: { type: 'percent' },
        seed_2: { type: 'percent' },
        seed_3: { type: 'percent' },
        seed_4: { type: 'percent' },
        seed_5: { type: 'percent' },
        seed_6: { type: 'percent' },
        seed_7: { type: 'percent' },
        seed_8: { type: 'percent' },
        seed_9: { type: 'percent' },
        seed_10: { type: 'percent' },
        '1-6': { type: 'percent' },
        '7': { type: 'percent' },
        '8': { type: 'percent' },
        '9': { type: 'percent' },
        '10': { type: 'percent' },
        Out: { type: 'percent' },
        'Win Conf': { type: 'percent' },
        'Win Finals': { type: 'percent' },
        'Lottery%': { type: 'percent' },
        ExpPick: { type: 'number' },
        conference: { type: 'text' }
    };

    const baseStandingsColumns = [
        { key: 'Rk', label: '#', alignClass: 'rk', dataType: 'number', format: 'integer' },
        { key: 'team_name', label: 'Team', alignClass: 'name', dataType: 'text', isTeam: true },
        { key: 'Current', label: 'Current', alignClass: 'rec', dataType: 'text' },
        { key: 'W', label: 'W', alignClass: 'num', dataType: 'number', format: 'decimal' },
        { key: 'L', label: 'L', alignClass: 'num', dataType: 'number', format: 'decimal' },
        { key: 'SRS', label: 'SRS', alignClass: 'num', dataType: 'number', format: 'decimal', decimals: 2 },
        { key: 'Playoffs', label: 'Playoff%', alignClass: 'num', dataType: 'percent' },
        { key: 'Win Conf', label: 'Win Conf', alignClass: 'num', dataType: 'percent' },
        { key: 'Win Finals', label: 'Win Finals', alignClass: 'num', dataType: 'percent' },
        { key: 'Lottery%', label: 'Lotto%', alignClass: 'num', dataType: 'percent' },
        { key: 'ExpPick', label: 'E[Pick]', alignClass: 'num', dataType: 'number', format: 'decimal' }
    ];

    const expandedStandingsColumns = [
        { key: 'W/L%', label: 'W/L%', alignClass: 'num', dataType: 'percent' },
        { key: 'Remain', label: 'Remain', alignClass: 'rec', dataType: 'text' },
        { key: 'Best', label: 'Best', alignClass: 'rec', dataType: 'text' },
        { key: 'Worst', label: 'Worst', alignClass: 'rec', dataType: 'text' },
        { key: 'Division', label: 'Division', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_1', label: '1', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_2', label: '2', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_3', label: '3', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_4', label: '4', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_5', label: '5', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_6', label: '6', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_7', label: '7', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_8', label: '8', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_9', label: '9', alignClass: 'num', dataType: 'percent' },
        { key: 'seed_10', label: '10', alignClass: 'num', dataType: 'percent' },
        { key: '1-6', label: '1-6', alignClass: 'num', dataType: 'percent' },
        { key: '7', label: '7', alignClass: 'num', dataType: 'percent' },
        { key: '8', label: '8', alignClass: 'num', dataType: 'percent' },
        { key: '9', label: '9', alignClass: 'num', dataType: 'percent' },
        { key: '10', label: '10', alignClass: 'num', dataType: 'percent' },
        { key: 'Out', label: 'Out', alignClass: 'num', dataType: 'percent' },
        { key: 'conference', label: 'Conference', alignClass: 'name', dataType: 'conference' }
    ];

    const visibleStandingsColumns = $derived.by(() =>
        showExpandedStandings ? [...baseStandingsColumns, ...expandedStandingsColumns] : [...baseStandingsColumns]
    );

    function getCellClass(column, value) {
        const classes = [column.alignClass || 'num'];
        if (column.dataType === 'percent') {
            classes.push('pct', pctClass(value));
        }
        if (column.key === 'SRS') {
            classes.push(srsClass(value));
        }
        return classes.join(' ');
    }

    function formatConference(value) {
        if (value === 'East') return 'Eastern Conference';
        if (value === 'West') return 'Western Conference';
        return value || '—';
    }

    function formatCellValue(column, value) {
        if (column.dataType === 'conference') {
            return formatConference(value);
        }
        if (value === null || value === undefined || value === '') return '—';
        if (column.dataType === 'percent') {
            return `${formatFixed(value, 1)}%`;
        }
        if (column.format === 'integer') {
            return formatFixed(value, 0);
        }
        if (column.format === 'decimal') {
            return formatFixed(value, column.decimals ?? 1);
        }
        return String(value);
    }

    // Intentionally keep the current sort behavior: expanded columns sort immediately when visible.

    const standings = $derived(
        conference === 'East' ? (data.eastStandings || []) : (data.westStandings || [])
    );

    const sortedStandings = $derived.by(() =>
        getSortedRows(standings, {
            sortColumn,
            sortDirection,
            sortConfigs: standingsSortConfig
        })
    );

    const sortedForChart = $derived.by(() =>
        getSortedRows(standings, {
            sortColumn: chartMetric,
            sortDirection: 'desc',
            sortConfigs: standingsSortConfig
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

    const chartSortOptions = [
        { label: 'Wins', value: 'W' },
        { label: 'Playoff %', value: 'Playoffs' },
        { label: 'Conference Win %', value: 'Win Conf' },
        { label: 'Finals Win %', value: 'Win Finals' },
        { label: 'Lottery %', value: 'Lottery%' },
        { label: 'Expected Pick', value: 'ExpPick' },
        { label: 'SRS', value: 'SRS' }
    ];

    function pctClass(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return '';
        if (n >= 80) return 'high';
        if (n >= 40) return 'mid';
        if (n > 0) return 'low';
        return 'zero';
    }

    function srsClass(val) {
        const n = Number.parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

    function exportConferenceCsv() {
        exportCsvRows({
            rows: sortedForChart,
            columns: standingsCsvColumns,
            filename: `${conference.toLowerCase()}-conference-overview.csv`
        });
    }

    function exportStandingsCsv() {
        const columns = showExpandedStandings ? standingsExpandedCsvColumns : standingsCsvColumns;
        exportCsvRows({
            rows: sortedStandings,
            columns,
            filename: `${conference.toLowerCase()}-conference-standings.csv`
        });
    }

    function onExpandedToggle(event) {
        showExpandedStandings = event.currentTarget.checked;
    }
</script>

<svelte:head>
    <title>Standings — DARKO DPM</title>
</svelte:head>

<div class="container">
    <div class="page-header">
        <h1>Season Simulation</h1>
        <p>Win projections, playoff odds, and championship probabilities from 10,000 simulations.</p>
    </div>

    <div class="conf-toggle">
        <button type="button" class:active={conference === 'East'} onclick={() => (conference = 'East')}>Eastern</button>
        <button type="button" class:active={conference === 'West'} onclick={() => (conference = 'West')}>Western</button>
    </div>

    {#if sortedStandings.length === 0}
        <div class="empty-state">No standings data is currently available.</div>
    {:else}
        <div class="table-toolbar">
            <label class="expanded-toggle">
                <input type="checkbox" checked={showExpandedStandings} onchange={onExpandedToggle} />
                <span>Expanded standings</span>
            </label>
            <button
                class="page-action-btn"
                type="button"
                onclick={exportStandingsCsv}
                disabled={sortedStandings.length === 0}
            >
                Download Table CSV
            </button>
        </div>
        <div class="table-wrapper {showExpandedStandings ? 'expanded' : ''}">
            <table>
                <thead>
                    <tr>
                        {#each visibleStandingsColumns as column}
                            <th
                                class="{column.alignClass} {column.dataType === 'percent' ? 'pct' : ''} sortable {sortColumn === column.key ? 'active' : ''}"
                                onclick={() => toggleSort(column.key)}
                            >
                                {column.label} <span class="sort-indicator">{sortGlyph(column.key)}</span>
                            </th>
                        {/each}
                    </tr>
                </thead>
                <tbody>
                    {#each sortedStandings as team}
                        <tr>
                            {#each visibleStandingsColumns as column}
                                <td class={getCellClass(column, team?.[column.key])}>
                                    {#if column.isTeam}
                                        <a href="/standings/{encodeURIComponent(team.team_name)}">{team.team_name}</a>
                                    {:else}
                                        {formatCellValue(column, team?.[column.key])}
                                    {/if}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <h2 class="section-title">{conference}ern Conference Overview</h2>
        <div class="chart-toolbar">
            <span class="chart-toolbar-label">Sort chart by:</span>
            <div class="chart-radio-group">
                {#each chartSortOptions as option}
                    <label class="chart-radio">
                        <input
                            type="radio"
                            name="chart-sort"
                            value={option.value}
                            checked={chartMetric === option.value}
                            onchange={() => (chartMetric = option.value)}
                        />
                        {option.label}
                    </label>
                {/each}
            </div>
            <button class="page-action-btn" type="button" onclick={exportConferenceCsv}>Download CSV</button>
        </div>
        <div class="chart-card">
            <ConferenceChart standings={sortedForChart} {conference} sortMetric={chartMetric} />
        </div>
    {/if}
</div>

<style>
    .conf-toggle {
        display: flex;
        gap: 0;
        margin-bottom: 24px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        width: fit-content;
        overflow: hidden;
    }
    .conf-toggle button {
        padding: 8px 20px;
        background: var(--bg-elevated);
        border: none;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.12s;
    }
    .conf-toggle button:first-child {
        border-right: 1px solid var(--border);
    }
    .conf-toggle button.active {
        background: var(--accent);
        color: white;
    }
    .conf-toggle button:hover:not(.active) {
        background: var(--bg-hover);
    }

    .table-wrapper { margin-bottom: 32px; }
    .table-toolbar {
        display: flex;
        justify-content: space-between;
        margin-bottom: 12px;
        align-items: center;
        gap: 12px;
    }

    .expanded-toggle {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
        font-size: 12px;
    }

    .expanded-toggle input {
        accent-color: var(--accent);
    }

    table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }

    th {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 20;
        cursor: pointer;
        user-select: none;
        background: var(--bg);
        box-shadow: 0 calc(-1 * var(--nav-sticky-offset)) 0 0 var(--bg), inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 8px 6px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
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

    .table-wrapper th, .table-wrapper td {
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
        padding: 7px 6px;
    }

    .table-wrapper.expanded th, .table-wrapper.expanded td {
        padding: 6px 8px;
        font-size: 12px;
    }

    tr:hover td { background: var(--bg-elevated); }

    .rk, .num, .rec { text-align: right; font-family: var(--font-mono); font-size: 12px; font-weight: 500; }
    .name { font-weight: 500; text-align: left; }
    .name a { color: var(--text); }
    .name a:hover { color: var(--accent); }
    .sort-indicator {
        margin-left: 6px;
        opacity: 0.6;
        font-size: 10px;
    }
    th.active .sort-indicator { color: var(--accent); opacity: 1; }

    .chart-toolbar {
        margin: 22px 0 12px;
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
    }

    .chart-toolbar-label {
        font-size: 12px;
        color: var(--text-muted);
    }

    .chart-radio-group {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
    }

    .chart-radio {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--text);
    }

    .section-title {
        margin: 8px 0 16px;
        font-size: 16px;
        font-weight: 600;
    }

    .chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 16px;
    }

    .pos { color: var(--positive); }
    .neg { color: var(--negative); }
    .pct { font-family: var(--font-mono); }
    .pct.high { color: var(--positive); }
    .pct.mid { color: var(--accent); }
    .pct.low { color: var(--text-secondary); }
    .pct.zero { color: var(--text-muted); }
</style>
