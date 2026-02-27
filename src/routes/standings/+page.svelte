<script>
    import ConferenceChart from '$lib/components/ConferenceChart.svelte';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { exportCsvRows, standingsCsvColumns, formatFixed } from '$lib/utils/csvPresets.js';

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
        Lottery%: { type: 'percent' },
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
                                <a href={`/standings/{encodeURIComponent(team.team_name)}`}>{team.team_name}</a>
                            </td>
                            <td class="rec">{team.Current}</td>
                            <td class="num">{formatFixed(team.W)}</td>
                            <td class="num">{formatFixed(team.L)}</td>
                            <td class="num {srsClass(team.SRS)}">{formatFixed(team.SRS, 2)}</td>
                            <td class="num pct {pctClass(team.Playoffs)}">{formatFixed(team.Playoffs)}%</td>
                            <td class="num pct {pctClass(team['Win Conf'])}">{formatFixed(team['Win Conf'])}%</td>
                            <td class="num pct {pctClass(team['Win Finals'])}">{formatFixed(team['Win Finals'])}%</td>
                            <td class="num pct {pctClass(team['Lottery%'])}">{formatFixed(team['Lottery%'])}%</td>
                            <td class="num">{formatFixed(team.ExpPick)}</td>
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
        z-index: 20;
        cursor: pointer;
        user-select: none;
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
        padding: 7px 12px;
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
