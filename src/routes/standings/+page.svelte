<script>
    import ConferenceChart from '$lib/components/ConferenceChart.svelte';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { exportCsvRows, standingsCsvColumns } from '$lib/utils/csvPresets.js';

    let { data } = $props();

    let conference = $state('East');
    let sortColumn = $state('Rk');
    let sortDirection = $state('asc');
    let chartMetric = $state('W');

    const standingsSortConfig = {
        Rk: { type: 'number' },
        team_name: { type: 'text' },
        Current: { type: 'record' },
        W: { type: 'number' },
        L: { type: 'number' },
        SRS: { type: 'number' },
        Playoffs: { type: 'percent' },
        'Win Conf': { type: 'percent' },
        'Win Finals': { type: 'percent' },
        'Lottery%': { type: 'percent' },
        ExpPick: { type: 'number' }
    };

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

    function fmt(val, d = 1) {
        if (val === null || val === undefined) return '—';
        return parseFloat(val).toFixed(d);
    }

    function pctClass(val) {
        const n = parseFloat(val);
        if (n >= 80) return 'high';
        if (n >= 40) return 'mid';
        if (n > 0) return 'low';
        return 'zero';
    }

    function exportConferenceCsv() {
        exportCsvRows({
            rows: sortedForChart,
            columns: standingsCsvColumns,
            filename: `${conference.toLowerCase()}-conference-overview.csv`
        });
    }

    function exportStandingsCsv() {
        exportCsvRows({
            rows: sortedStandings,
            columns: standingsCsvColumns,
            filename: `${conference.toLowerCase()}-conference-standings.csv`
        });
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
        <button class:active={conference === 'East'} onclick={() => (conference = 'East')}>Eastern</button>
        <button class:active={conference === 'West'} onclick={() => (conference = 'West')}>Western</button>
    </div>

    {#if sortedStandings.length === 0}
        <div class="empty-state">No standings data is currently available.</div>
    {:else}
        <div class="table-toolbar">
            <button
                class="page-action-btn"
                type="button"
                onclick={exportStandingsCsv}
                disabled={sortedStandings.length === 0}
            >
                Download Table CSV
            </button>
        </div>
        <div class="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th class="rk sortable {sortColumn === 'Rk' ? 'active' : ''}" onclick={() => toggleSort('Rk')}>
                            # <span class="sort-indicator">{sortGlyph('Rk')}</span>
                        </th>
                        <th class="name sortable {sortColumn === 'team_name' ? 'active' : ''}" onclick={() => toggleSort('team_name')}>
                            Team <span class="sort-indicator">{sortGlyph('team_name')}</span>
                        </th>
                        <th class="rec sortable {sortColumn === 'Current' ? 'active' : ''}" onclick={() => toggleSort('Current')}>
                            Current <span class="sort-indicator">{sortGlyph('Current')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'W' ? 'active' : ''}" onclick={() => toggleSort('W')}>
                            W <span class="sort-indicator">{sortGlyph('W')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'L' ? 'active' : ''}" onclick={() => toggleSort('L')}>
                            L <span class="sort-indicator">{sortGlyph('L')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'SRS' ? 'active' : ''}" onclick={() => toggleSort('SRS')}>
                            SRS <span class="sort-indicator">{sortGlyph('SRS')}</span>
                        </th>
                        <th class="num pct sortable {sortColumn === 'Playoffs' ? 'active' : ''}" onclick={() => toggleSort('Playoffs')}>
                            Playoff% <span class="sort-indicator">{sortGlyph('Playoffs')}</span>
                        </th>
                        <th class="num pct sortable {sortColumn === 'Win Conf' ? 'active' : ''}" onclick={() => toggleSort('Win Conf')}>
                            Conf <span class="sort-indicator">{sortGlyph('Win Conf')}</span>
                        </th>
                        <th class="num pct sortable {sortColumn === 'Win Finals' ? 'active' : ''}" onclick={() => toggleSort('Win Finals')}>
                            Finals <span class="sort-indicator">{sortGlyph('Win Finals')}</span>
                        </th>
                        <th class="num pct sortable {sortColumn === 'Lottery%' ? 'active' : ''}" onclick={() => toggleSort('Lottery%')}>
                            Lotto% <span class="sort-indicator">{sortGlyph('Lottery%')}</span>
                        </th>
                        <th class="num sortable {sortColumn === 'ExpPick' ? 'active' : ''}" onclick={() => toggleSort('ExpPick')}>
                            E[Pick] <span class="sort-indicator">{sortGlyph('ExpPick')}</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {#each sortedStandings as team}
                        <tr>
                            <td class="rk">{team.Rk}</td>
                            <td class="name">
                                <a href="/team/{encodeURIComponent(team.team_name)}">{team.team_name}</a>
                            </td>
                            <td class="rec">{team.Current}</td>
                            <td class="num">{fmt(team.W)}</td>
                            <td class="num">{fmt(team.L)}</td>
                            <td class="num {parseFloat(team.SRS) >= 0 ? 'pos' : 'neg'}">{fmt(team.SRS, 2)}</td>
                            <td class="num pct {pctClass(team.Playoffs)}">{fmt(team.Playoffs)}</td>
                            <td class="num pct {pctClass(team['Win Conf'])}">{fmt(team['Win Conf'])}</td>
                            <td class="num pct {pctClass(team['Win Finals'])}">{fmt(team['Win Finals'])}</td>
                            <td class="num pct {pctClass(team['Lottery%'])}">{fmt(team['Lottery%'])}</td>
                            <td class="num">{fmt(team.ExpPick)}</td>
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
        justify-content: flex-end;
        margin-bottom: 12px;
    }

    table { width: 100%; border-collapse: collapse; font-size: 13px; }

    th {
        position: sticky;
        top: 210px;
        z-index: 10;
        cursor: pointer;
        user-select: none;
        background: var(--bg-surface);
        border-bottom: 1px solid var(--border);
        padding: 8px 10px;
        text-align: left;
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        white-space: nowrap;
    }

    th:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    .sort-indicator {
        margin-left: 6px;
        opacity: 0.6;
        font-size: 10px;
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    td {
        padding: 7px 10px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    tr:hover td { background: var(--bg-elevated); }
    .rk { width: 32px; color: var(--text-muted); font-family: var(--font-mono); font-size: 11px; }
    .name { font-weight: 500; }
    .name a { color: var(--text); }
    .name a:hover { color: var(--accent); }
    .rec { color: var(--text-secondary); font-family: var(--font-mono); font-size: 12px; }
    .num { text-align: right; font-family: var(--font-mono); font-size: 12px; font-weight: 500; }
    th.num, th.pct { text-align: right; }
    .pos { color: var(--positive); }
    .neg { color: var(--negative); }
    .pct.high { color: var(--positive); }
    .pct.mid { color: var(--accent); }
    .pct.low { color: var(--text-secondary); }
    .pct.zero { color: var(--text-muted); }

    .section-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin: 32px 0 16px;
        letter-spacing: -0.01em;
    }

    .chart-toolbar {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 4px 0 16px;
        color: var(--text-muted);
        font-size: 13px;
    }

    .chart-toolbar-label {
        font-weight: 500;
    }

    .chart-radio-group {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 12px;
    }

    .chart-radio {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--text-secondary);
        font-size: 12px;
    }

    .chart-radio input[type='radio'] {
        background: var(--bg-elevated);
        color: var(--text);
        border: 1px solid var(--border);
        accent-color: var(--accent);
    }

    .chart-toolbar button.page-action-btn {
        margin-left: auto;
    }

    .chart-card {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 20px;
        margin-bottom: 40px;
    }

    @media (max-width: 640px) {
        th, td { padding: 6px 6px; }
    }
</style>
