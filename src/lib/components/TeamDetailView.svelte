<script>
    import WinDistChart from './WinDistChart.svelte';
    import SeedChart from './SeedChart.svelte';
    import {
        exportCsvRows,
        formatFixed,
        formatSignedMetric,
        teamPlayersCsvColumns
    } from '$lib/utils/csvPresets.js';
    import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
    import { getMetricDefinition } from '$lib/utils/metricDefinitions.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import {
        buildPresetHeatScales,
        getMetricHeatVariables
    } from '$lib/utils/metricHeatScales.js';
    import {
        formatPlayerTableCell,
        getPlayerTableCellValue,
        TEAM_PLAYER_COLUMNS,
        teamPlayerSortConfig
    } from '$lib/utils/leaderboardColumns.js';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import StatTile from '$lib/components/StatTile.svelte';
    import { NBA_TEAMS, teamId as teamIdFromName } from '$lib/utils/teamAbbreviations.js';
    import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';

    let {
        teamName = '',
        backHref = '/',
        backLabel = '← Back',
        players = [],
        sim = null,
        winDist = [],
        lineups = { top: [], worst: [] }
    } = $props();

    let sortColumn = $state('player_name');
    let sortDirection = $state('asc');
    let teamTableRoot = $state(null);
    let teamBodyScroller = $state(null);
    let teamBodyTable = $state(null);
    let teamSourceHead = $state(null);
    let teamHeaderScroller = $state(null);
    let teamHeaderTable = $state(null);

    const teamId = $derived(players?.[0]?.tm_id || teamIdFromName(teamName) || null);
    const knownTeam = $derived(NBA_TEAMS.some((team) => team.name === teamName));

    const teamPlayers = $derived(players || []);
    const teamPlayerHeatScales = $derived(buildPresetHeatScales(teamPlayers, 'talent'));
    const dpmTintLimit = $derived(tintLimit(teamPlayers.map((player) => player?.dpm)));
    const teamWinDist = $derived(winDist || []);
    const topLineups = $derived(lineups?.top ?? []);
    const worstLineups = $derived(lineups?.worst ?? []);
    // Best and worst lineups share one scale so their tints compare directly.
    const lineupTintLimit = $derived(tintLimit([...topLineups, ...worstLineups].map((lineup) => lineup?.net_pm)));

    function dpmClass(val) {
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '';
        return n >= 0 ? 'pos' : 'neg';
    }

    function formatSignedSrs(value) {
        const n = parseFloat(value);
        if (!Number.isFinite(n)) return '—';
        return `${n >= 0 ? '+' : ''}${formatFixed(n, 2)}`;
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

    function toggleSort(column) {
        ({ sortColumn, sortDirection } = getNextSortState({
            sortColumn,
            sortDirection,
            column
        }));
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

{#snippet teamSemanticHeaderRow()}
    <tr class="table-semantic-row sr-only">
        {#each teamPlayerColumns as column (column.key)}
            <th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}>{column.label}</th>
        {/each}
    </tr>
{/snippet}

{#snippet teamHeaderRow()}
    <tr class="table-sizing-row">
        {#each teamPlayerColumns as column (column.key)}
            <th
                class="{column.alignClass} sortable {sortColumn === column.key ? 'active' : ''} {column.metricKey ? 'has-tooltip' : ''}"
                onclick={() => toggleSort(column.key)}
                aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
            >
                <span class="header-label-wrap">
                    {#if column.metricKey}
                        <MetricTooltip text={getMetricDefinition(column.metricKey)}>
                            <span>{column.label}</span>
                        </MetricTooltip>
                    {:else}
                        <span>{column.label}</span>
                    {/if}
                    <!-- The keyboard's way to sort; clicking anywhere else in the header works too. -->
                    <button
                        type="button"
                        class="sort-button"
                        aria-label={`Sort by ${column.label}`}
                        onclick={(event) => {
                            event.stopPropagation();
                            toggleSort(column.key);
                        }}
                    >
                        <span class="sort-indicator" aria-hidden="true">{getSortGlyph(sortColumn, sortDirection, column.key)}</span>
                    </button>
                </span>
            </th>
        {/each}
    </tr>
{/snippet}


{#snippet lineupTable(rows, emptyMessage)}
    {#if rows.length === 0}
        <p class="lineup-empty">{emptyMessage}</p>
    {:else}
        <div class="lineup-table-wrapper">
            <table class="lineup-table">
                <thead>
                    <tr>
                        <th class="lineup-th lineup-col">Lineup</th>
                        <th class="lineup-th lineup-num">Poss</th>
                        <th class="lineup-th lineup-num">Net +/-</th>
                        <th class="lineup-th lineup-num">Off +/-</th>
                        <th class="lineup-th lineup-num">Def +/-</th>
                    </tr>
                </thead>
                <tbody>
                    {#each rows as lineup (lineup.row_key)}
                        <tr>
                            <td class="lineup-cell lineup-col">
                                <span class="lineup-names">
                                    {#each lineup.players as p, i}
                                        {#if i > 0}, {/if}
                                        {#if p.id}
                                            <a href="/player/{p.id}" class="lineup-player-link">{p.name ?? 'Unknown'}</a>
                                        {:else}
                                            {p.name ?? 'Unknown'}
                                        {/if}
                                    {/each}
                                </span>
                            </td>
                            <td class="lineup-cell lineup-num">{formatFixed(lineup.possessions, 0)}</td>
                            <td class="lineup-cell lineup-num tint-cell {dpmClass(lineup.net_pm)}" style={divergingTint(lineup.net_pm, lineupTintLimit)}>{formatSignedMetric(lineup.net_pm)}</td>
                            <td class="lineup-cell lineup-num {dpmClass(lineup.off_pm)}">{formatSignedMetric(lineup.off_pm)}</td>
                            <td class="lineup-cell lineup-num {dpmClass(lineup.def_pm)}">{formatSignedMetric(lineup.def_pm)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}
{/snippet}

<div class="container team-detail-page" data-shiny-page>
    <a class="back-link" href={backHref}>{backLabel}</a>

    <PageHeader
        title={teamName || 'Team'}
        logo={teamId ? `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg` : ''}
        lede={sim
            ? `${sim.conference}ern Conference · Current: ${sim.Current} · Projected: ${formatFixed(sim.W)}-${formatFixed(sim.L)}`
            : knownTeam
                ? 'Current ratings for all current-season players on the team.'
                : 'Team not found.'}
    >
        {#snippet actions()}
            <button
                class="btn"
                type="button"
                onclick={exportTeamCsv}
                disabled={sortedPlayers.length === 0}
            >
                Download CSV
            </button>
        {/snippet}
    </PageHeader>

    {#if sim}
        <section class="stat-strip" aria-label="Season simulation">
            <StatTile label="Playoff%" value={`${formatFixed(sim.Playoffs)}%`} />
            <StatTile label="Win Conf" value={`${formatFixed(sim['Win Conf'])}%`} />
            <StatTile label="Win Finals" value={`${formatFixed(sim['Win Finals'])}%`} />
            <StatTile label="SRS" value={formatSignedSrs(sim.SRS)} />
            <StatTile label="Lottery%" value={`${formatFixed(sim['Lottery%'])}%`} />
            <StatTile label="E[Pick]" value={formatFixed(sim.ExpPick)} hint="Expected draft pick" />
        </section>
    {/if}

    {#if teamPlayers.length === 0}
        <!-- Not a dead end: an unknown or empty team page offers every team instead. -->
        <div class="empty-state">
            <p>
                {knownTeam
                    ? `No current-season players are listed for the ${teamName} right now.`
                    : `No team called "${teamName}" was found.`}
                Pick a team:
            </p>
            <ul class="team-index">
                {#each NBA_TEAMS as team (team.abbr)}
                    <li><a href="/team/{encodeURIComponent(team.name)}">{team.name}</a></li>
                {/each}
            </ul>
        </div>
    {:else}
        <h2 class="section-title">Players</h2>
        <div class="table-wrapper table-shell" data-shiny-table bind:this={teamTableRoot}>
            <div class="sticky-header-shell">
                <div class="table-header-scroll" bind:this={teamHeaderScroller}>
                    <table class="sticky-header-table" role="presentation" bind:this={teamHeaderTable}>
                        <thead>
                            {@render teamHeaderRow()}
                        </thead>
                    </table>
                </div>
            </div>

            <div class="table-body-scroll" bind:this={teamBodyScroller}>
                <table bind:this={teamBodyTable}>
                    <thead class="table-sizing-head" bind:this={teamSourceHead}>
                        {@render teamSemanticHeaderRow()}
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
                                        <td
											class="{teamCellClass(column, value)} {teamPlayerHeatScales[column.key] ? 'shiny-heat-cell' : ''} {column.key === 'dpm' ? 'tint-cell' : ''}"
											style={column.key === 'dpm'
												? `${getMetricHeatVariables(column.key, value, teamPlayerHeatScales)} ${divergingTint(value, dpmTintLimit)}`
												: getMetricHeatVariables(column.key, value, teamPlayerHeatScales)}
										>
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


    {#if topLineups.length > 0 || worstLineups.length > 0}
        <div class="lineups-grid">
            <div>
                <h2 class="section-title">Top Lineups</h2>
                {@render lineupTable(topLineups, 'No lineup data available.')}
            </div>
            <div>
                <h2 class="section-title">Worst Lineups</h2>
                {@render lineupTable(worstLineups, 'No lineup data available.')}
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
        margin: 20px 0 0;
        font-size: 13px;
        color: var(--text-muted);
    }

    /* The back link already opens the page, so the header needs less room above it. */
    .team-detail-page > :global(.page-header) {
        padding-top: 16px;
    }

    .back-link:hover {
        color: var(--accent);
    }

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

    .empty-state {
        color: var(--text-muted);
        margin: 16px 0;
    }

    .team-index {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 6px 24px;
        margin-top: 14px;
        list-style: none;
    }

    .team-index a {
        color: var(--text);
        font-weight: 500;
    }

    .team-index a:hover {
        color: var(--accent);
    }

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
        font-size: 13px;
        font-weight: 500;
    }

    td.tint-cell {
        font-weight: 700;
    }

    th.num {
        text-align: right;
    }

    .sort-indicator {
        margin-left: 6px;
        opacity: 0.6;
        font-size: 11px;
    }

    th.active .sort-indicator {
        color: var(--accent);
        opacity: 1;
    }

    /* Lineup sections */
    .lineups-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
        margin-bottom: 32px;
    }

    .lineup-table-wrapper {
        overflow-x: auto;
    }

    .lineup-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        table-layout: fixed;
    }

    .lineup-th {
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        padding: 8px 8px;
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--text-muted);
        white-space: nowrap;
        cursor: default;
    }

    .lineup-th.lineup-num {
        text-align: right;
        width: 60px;
    }

    .lineup-th.lineup-col {
        width: auto;
    }

    .lineup-cell {
        padding: 8px 8px;
        border-bottom: 1px solid var(--border-subtle);
        vertical-align: top;
    }

    .lineup-cell.lineup-num {
        text-align: right;
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 500;
        white-space: nowrap;
    }


    .lineup-names {
        display: block;
        white-space: normal;
        line-height: 1.35;
    }

    .lineup-player-link {
        color: var(--text);
    }

    .lineup-player-link:hover {
        color: var(--accent);
    }

    .lineup-empty {
        color: var(--text-muted);
        font-size: 13px;
    }

    .lineup-table tbody tr:hover .lineup-cell {
        background: var(--bg-hover);
    }

    @media (max-width: 600px) {
        .lineups-grid {
            grid-template-columns: minmax(0, 1fr);
        }
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

        .table-semantic-row {
            display: none;
        }

        .table-sizing-head .table-sizing-row th {
            visibility: visible;
            pointer-events: auto;
        }

        th {
            position: static;
        }

        .lineups-grid {
            grid-template-columns: 1fr;
        }
    }
    /* End touch/mobile scroll mode */
</style>
