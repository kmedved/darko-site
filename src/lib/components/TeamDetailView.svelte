<script>
    import WinDistChart from './WinDistChart.svelte';
    import SeedChart from './SeedChart.svelte';
    import {
        exportCsvRows,
        formatFixed,
        teamPlayersCsvColumns
    } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import {
        formatPlayerTableCell,
        getPlayerTableCellValue,
        TEAM_PLAYER_COLUMNS,
        teamPlayerSortConfig
    } from '$lib/utils/leaderboardColumns.js';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';

    let {
        teamName = '',
        backHref = '/',
        backLabel = '← Back',
        players = [],
        sim = null,
        winDist = []
    } = $props();

    let sortColumn = $state('player_name');
    let sortDirection = $state('asc');
    let logoFailed = $state(false);
    let teamTableRoot = $state(null);
    let teamBodyScroller = $state(null);
    let teamBodyTable = $state(null);
    let teamSourceHead = $state(null);
    let teamHeaderScroller = $state(null);
    let teamHeaderTable = $state(null);

    const teamId = $derived(players?.[0]?.tm_id || null);

    $effect(() => {
        void teamName;
        logoFailed = false;
    });

    const teamPlayers = $derived(players || []);
    const teamWinDist = $derived(winDist || []);

    function dpmClass(val) {
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

    function pctClass(val) {
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '';
        if (n >= 80) return 'high';
        if (n >= 40) return 'mid';
        if (n > 0) return 'low';
        return 'zero';
    }

    const teamPlayerColumns = TEAM_PLAYER_COLUMNS;

    const sortedPlayers = $derived.by(() =>
        getSortedRows(teamPlayers, {
            sortColumn,
            sortDirection,
            sortConfigs: teamPlayerSortConfig
        })
    );

    const signedMetricKeys = new Set([
        'dpm',
        'o_dpm',
        'd_dpm',
        'box_dpm',
        'on_off_dpm'
    ]);

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

    function currentWins(currentStr) {
        if (!currentStr) return 0;
        const parts = currentStr.split('-');
        const parsed = parseFloat(parts[0]);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function exportTeamCsv() {
        exportCsvRows({
            rows: sortedPlayers,
            columns: teamPlayersCsvColumns,
            filename: `${teamName || 'team'}-players.csv`
        });
    }

    function teamCellClass(column, value) {
        if (column.alignClass !== 'num') {
            return column.alignClass;
        }

        if (!signedMetricKeys.has(column.key)) {
            return 'num';
        }

        return `num ${dpmClass(value)}`.trim();
    }

    $effect(() => {
        sortColumn;
        sortDirection;
        sortedPlayers.length;
        teamTableRoot;
        teamBodyScroller;
        teamBodyTable;
        teamSourceHead;
        teamHeaderScroller;
        teamHeaderTable;

        return setupWideStickyTable({
            root: teamTableRoot,
            bodyScroller: teamBodyScroller,
            bodyTable: teamBodyTable,
            sourceHead: teamSourceHead,
            headerScroller: teamHeaderScroller,
            headerTable: teamHeaderTable,
            wheelTarget: teamHeaderScroller
        });
    });
</script>

{#snippet teamHeaderRow()}
    <tr>
        {#each teamPlayerColumns as column (column.key)}
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
{/snippet}

<div class="container">
    <a class="back-link" href={backHref}>{backLabel}</a>

    <div class="page-header">
        <div class="page-header-toolbar">
            <div class="team-header-info">
                {#if teamId && !logoFailed}
                    <img
                        src="https://cdn.nba.com/logos/nba/{teamId}/global/L/logo.svg"
                        alt=""
                        class="team-logo"
                        onerror={() => { logoFailed = true; }}
                    />
                {/if}
                <div>
                    <h1>{teamName || 'Team'}</h1>
                    {#if sim}
                        <p>{sim.conference}ern Conference · Current: {sim.Current} · Projected: {formatFixed(sim.W)}-{formatFixed(sim.L)}</p>
                    {:else}
                        <p>Current ratings for all active players on the team.</p>
                    {/if}
                </div>
            </div>
            <div class="page-header-actions">
                <button
                    class="page-action-btn"
                    type="button"
                    onclick={exportTeamCsv}
                    disabled={sortedPlayers.length === 0}
                >
                    Download Table CSV
                </button>
            </div>
        </div>
    </div>

    {#if sim}
        <div class="stats-grid">
            <div class="stat-box">
                <div class="stat-label">Playoff%</div>
                <div class="stat-value pct {pctClass(sim.Playoffs)}">{formatFixed(sim.Playoffs)}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Conf</div>
                <div class="stat-value pct {pctClass(sim['Win Conf'])}">{formatFixed(sim['Win Conf'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Win Finals</div>
                <div class="stat-value pct {pctClass(sim['Win Finals'])}">{formatFixed(sim['Win Finals'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">SRS</div>
                <div class="stat-value { (() => {
                    const n = parseFloat(sim.SRS);
                    if (!Number.isFinite(n)) return '';
                    return n >= 0 ? 'srs-pos' : 'srs-neg';
                })() }">{formatFixed(sim.SRS, 2)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Lottery%</div>
                <div class="stat-value pct {pctClass(sim['Lottery%'])}">{formatFixed(sim['Lottery%'])}%</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">E[Pick]</div>
                <div class="stat-value">{formatFixed(sim.ExpPick)}</div>
            </div>
        </div>
    {/if}

    {#if teamPlayers.length === 0}
        <div class="empty-state">No active players found for {teamName}.</div>
    {:else}
        <h2 class="section-title">Players</h2>
        <div class="table-wrapper table-shell" bind:this={teamTableRoot}>
            <div class="sticky-header-shell">
                <div class="table-header-scroll" bind:this={teamHeaderScroller}>
                    <table class="sticky-header-table" bind:this={teamHeaderTable}>
                        <thead>
                            {@render teamHeaderRow()}
                        </thead>
                    </table>
                </div>
            </div>

            <div class="table-body-scroll" bind:this={teamBodyScroller}>
                <table bind:this={teamBodyTable}>
                    <thead class="table-sizing-head" aria-hidden="true" bind:this={teamSourceHead}>
                        {@render teamHeaderRow()}
                    </thead>
                    <tbody>
                        {#each sortedPlayers as player (player.nba_id)}
                            <tr>
                                {#each teamPlayerColumns as column (column.key)}
                                    {@const value = getPlayerTableCellValue(player, column)}
                                    {#if column.key === 'player_name'}
                                        <td class="name">
                                            <a href="/compare?ids={player.nba_id}">{player.player_name}</a>
                                        </td>
                                    {:else}
                                        <td class={teamCellClass(column, value)}>
                                            {formatPlayerTableCell(column, value)}
                                        </td>
                                    {/if}
                                {/each}
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}

    {#if sim && teamWinDist.length > 0}
        <h2 class="section-title">Win Distribution</h2>
        <div class="chart-card">
            <WinDistChart
                data={teamWinDist}
                meanWins={parseFloat(sim.W)}
                currentWins={currentWins(sim.Current)}
                {teamName}
            />
        </div>

        <h2 class="section-title">Seed Probabilities</h2>
        <div class="chart-card">
            <SeedChart team={sim} {teamName} />
        </div>
    {/if}
</div>

<style>
    .back-link {
        display: inline-block;
        margin: 10px 0 22px;
        font-size: 13px;
        color: var(--text-muted);
    }

    .back-link:hover {
        color: var(--accent);
    }

    .team-header-info {
        display: flex;
        align-items: center;
        gap: 16px;
    }

    .team-logo {
        width: 64px;
        max-height: 80px;
        object-fit: contain;
        flex-shrink: 0;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 12px;
        margin-bottom: 28px;
    }

    .stat-box {
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 14px 16px;
        text-align: center;
    }

    .stat-label {
        font-size: 10px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
        margin-bottom: 6px;
    }

    .stat-value {
        font-family: var(--font-mono);
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
    }

    .stat-value.pct.high { color: var(--positive); }
    .stat-value.pct.mid { color: var(--accent); }
    .stat-value.pct.low { color: var(--text-secondary); }
    .stat-value.pct.zero { color: var(--text-muted); }
    .stat-value.srs-pos { color: var(--positive); }
    .stat-value.srs-neg { color: var(--negative); }

    .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 8px 0 16px;
        letter-spacing: -0.01em;
    }

    .table-wrapper {
        --wide-sticky-header-height: 36px;
        margin-bottom: 32px;
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
        font-size: 13px;
        width: max-content;
        min-width: 100%;
    }

    th {
        cursor: pointer;
        user-select: none;
        background: var(--bg);
        box-shadow: inset 0 -1px 0 var(--border);
        border-bottom: 1px solid var(--border);
        padding: 8px 6px;
    }

    td {
        padding: 7px 6px;
        border-bottom: 1px solid var(--border-subtle);
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

    .table-body-scroll tr:hover td {
        background: var(--bg-elevated);
    }

    .table-sizing-head th {
        visibility: hidden;
        pointer-events: none;
    }

    .empty-state {
        color: var(--text-muted);
        margin: 16px 0;
    }

    .srs-pos { color: var(--positive); }
    .srs-neg { color: var(--negative); }
    .chart-card {
        margin-bottom: 24px;
    }

    th.has-tooltip .header-label-wrap {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .name {
        font-weight: 500;
    }

    .name a {
        color: var(--text);
    }

    .name a:hover {
        color: var(--accent);
    }

    .position {
        color: var(--text-secondary);
        font-size: 12px;
    }

    .num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 600;
    }

    th.num {
        text-align: right;
    }

    .num.pos {
        color: var(--positive);
    }

    .num.neg {
        color: var(--negative);
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

        th {
            position: static;
        }
    }
    /* End touch/mobile scroll mode */
</style>
