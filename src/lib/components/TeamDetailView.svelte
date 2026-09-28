<script>
    import { getContext } from 'svelte';
    import WinDistChart from './WinDistChart.svelte';
    import SeedChart from './SeedChart.svelte';
    import OffenseDefenseGlyph from './OffenseDefenseGlyph.svelte';
    import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
    import { getSeriesColor } from '$lib/utils/chartTheme.js';
    import {
        exportCsvRows,
        formatDollarsMillions,
        formatFixed,
        formatSignedMetric,
        teamPlayersCsvColumns
    } from '$lib/utils/csvPresets.js';
    import { formatSigned } from '$lib/utils/seismograph.js';
    import {
        coreOutlook,
        niceTicks,
        payrollRows,
        ratingContributions,
        ratingWaterfall,
        teamRatingSummary
    } from '$lib/utils/teamDna.js';
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
    import { NBA_TEAMS, teamAbbr, teamId as teamIdFromName } from '$lib/utils/teamAbbreviations.js';
    import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';

    let {
        teamName = '',
        backHref = '/',
        backLabel = '← Back',
        players = [],
        league = [],
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

    // Team DNA: the Roster Lab's rating for this roster, who it comes from, what the payroll buys
    // and how long the rotation is projected to last.
    const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
    const abbr = $derived(teamAbbr(teamName));
    const ratingSummary = $derived(teamRatingSummary(abbr, teamPlayers, league));
    const contributions = $derived(ratingContributions(teamPlayers));
    // The waterfall shows one component at a time, so every view adds up exactly.
    const WATERFALL_VIEWS = [
        { key: 'total', label: 'Total', dpm: 'dpm', dpmLabel: 'DPM' },
        { key: 'offense', label: 'Offense', dpm: 'oDpm', dpmLabel: 'O-DPM' },
        { key: 'defense', label: 'Defense', dpm: 'dDpm', dpmLabel: 'D-DPM' }
    ];
    let waterfallView = $state('total');
    const waterfallMeta = $derived(WATERFALL_VIEWS.find((view) => view.key === waterfallView));
    const waterfall = $derived(ratingWaterfall(contributions, waterfallView));
    const waterfallScale = $derived(stepScale(waterfall));
    const payroll = $derived(payrollRows(teamPlayers));
    const payrollScale = $derived(moneyScale(payroll.rows));
    const surplusTintLimit = $derived(tintLimit(payroll.rows.map((row) => row.surplus)));
    const core = $derived(coreOutlook(teamPlayers));
    const coreTintLimit = $derived(tintLimit(core.map((row) => row.dpm)));
    const valueColor = $derived(getSeriesColor(0, displayMode.view));
    let dnaTip = $state(null);

    /** Positions (percent of the track) for a waterfall's values, with round ticks. */
    function stepScale({ low, high }) {
        const pad = (high - low) * 0.04 || 0.5;
        const min = low - pad;
        const max = high + pad;
        return {
            ticks: niceTicks(low, high, 5),
            at: (value) => ((value - min) / (max - min)) * 100
        };
    }

    function formatTick(value) {
        if (value === 0) return '0';
        return Number.isInteger(value) ? `${value > 0 ? '+' : ''}${value}` : formatSigned(value, 1);
    }

    /** A $0-based money axis, rounded up to a whole step, with its tick values. */
    function moneyScale(rows) {
        const top = Math.max(1, ...rows.map((row) => Math.max(row.salary, row.value, 0)));
        const step = top <= 20e6 ? 5e6 : top <= 60e6 ? 10e6 : 20e6;
        const max = Math.ceil(top / step) * step;
        return {
            max,
            ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step),
            at: (value) => (Math.min(Math.max(value, 0), max) / max) * 100
        };
    }

    function formatMoneyTick(value) {
        return value === 0 ? '$0' : `$${Math.round(value / 1e6)}M`;
    }

    function formatSignedMoney(value) {
        const text = formatDollarsMillions(value);
        return value > 0 ? `+${text}` : text;
    }

    // One tooltip per chart, above the pointer (or the focused row), kept inside the chart.
    function placeTip(chart, x, y, lines) {
        const box = chart.getBoundingClientRect();
        const half = Math.min(110, box.width / 2);
        dnaTip = {
            chart: chart.dataset.chart,
            x: Math.min(Math.max(x - box.left, half), box.width - half),
            y: y - box.top,
            lines
        };
    }

    function tipAtPointer(event, lines) {
        placeTip(event.currentTarget.closest('[data-chart]'), event.clientX, event.clientY, lines);
    }

    function tipAtRow(event, lines) {
        const row = event.currentTarget.getBoundingClientRect();
        placeTip(event.currentTarget.closest('[data-chart]'), row.left + row.width / 2, row.top, lines);
    }

    function hideTip() {
        dnaTip = null;
    }

    function waterfallTip(step) {
        const lines = [{ text: step.name, head: true }];
        if (waterfallView === 'total') {
            lines.push(
                { text: `${formatSigned(step.total, 2)} per 100 possessions for the team` },
                { text: `${formatSigned(step.offense, 2)} from offense, ${formatSigned(step.defense, 2)} from defense`, muted: true }
            );
        } else {
            lines.push({ text: `${formatSigned(step.value, 2)} per 100 possessions from ${waterfallView}` });
        }
        lines.push(
            {
                text: `${formatSigned(step[waterfallMeta.dpm], 1)} ${waterfallMeta.dpmLabel} over ${formatFixed(step.minutes, 1)} of 240 minutes`,
                muted: true
            },
            { text: `Running total ${formatSigned(step.end, 2)}`, muted: true }
        );
        return lines;
    }

    function payrollTip(row) {
        return [
            { text: row.name, head: true },
            { text: `${formatDollarsMillions(row.value)} DARKO value` },
            { text: `${formatDollarsMillions(row.salary)} salary`, muted: true },
            { text: `${formatSignedMoney(row.surplus)} surplus`, muted: true }
        ];
    }

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


{#snippet tipBox(tip)}
    <div class="chart-tooltip dna-tip" style:left="{tip.x}px" style:top="{tip.y}px">
        {#each tip.lines as line, index (index)}
            <span class:dna-tip-head={line.head} class:dna-tip-muted={line.muted}>{line.text}</span>
        {/each}
    </div>
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

    {#if ratingSummary}
        <section class="stat-strip" aria-label="DARKO team rating">
            <StatTile
                label="DARKO rating"
                value={formatSigned(ratingSummary.rating, 1)}
                detail={`#${ratingSummary.rank} of ${ratingSummary.teams}`}
                hint="Each player's DPM weighted by DARKO's projected minutes and scaled to 240 team minutes: points per 100 possessions against an average team. The Roster Lab rates teams the same way."
            />
            <StatTile label="Offense" value={formatSigned(ratingSummary.offense, 1)} />
            <StatTile label="Defense" value={formatSigned(ratingSummary.defense, 1)} />
            <StatTile
                label="Worth"
                value={`${Math.round(ratingSummary.wins)} wins`}
                detail="over 82 games"
                hint="The Roster Lab's rule of thumb, not a DARKO output: 41 wins plus 2.7 for each point above the league's average team."
            />
        </section>
    {/if}

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


    {#if contributions.length > 0}
        <div class="dna-grid" id="team-dna">
            <section class="dna-section" aria-labelledby="dna-contrib-title" data-shiny-surface="plot">
                <h2 class="section-title" id="dna-contrib-title">Where the rating comes from</h2>
                <p class="dna-note">
                    {#if waterfallView === 'total'}
                        Each player's DPM times their share of DARKO's projected minutes. Each bar starts where
                        the one above ends, so together they walk from zero to the team's
                        {formatSigned(waterfall.total, 1)}.
                    {:else}
                        {waterfallMeta.label} alone: each player's {waterfallMeta.dpmLabel} times their share of
                        the minutes, walking from zero to the team's {waterfallView} of
                        {formatSigned(waterfall.total, 1)}.
                    {/if}
                    Hatched bars take points away.
                </p>
                <div class="dna-switch" role="group" aria-label="Rating shown">
                    {#each WATERFALL_VIEWS as view (view.key)}
                        <button
                            type="button"
                            class:active={waterfallView === view.key}
                            aria-pressed={waterfallView === view.key}
                            onclick={() => (waterfallView = view.key)}
                        >
                            {#if view.key !== 'total'}<OffenseDefenseGlyph side={view.key} />{/if}
                            {view.label}
                        </button>
                    {/each}
                </div>
                <div class="dna-chart waterfall waterfall--{waterfallView}" data-chart="contrib">
                    <ol class="wf-list">
                        {#each waterfall.steps as step, index (step.id)}
                            <li>
                                <a
                                    class="wf-row"
                                    href="/player/{step.id}"
                                    onpointermove={(event) => tipAtPointer(event, waterfallTip(step))}
                                    onpointerleave={hideTip}
                                    onfocus={(event) => tipAtRow(event, waterfallTip(step))}
                                    onblur={hideTip}
                                >
                                    <span class="contrib-who">
                                        <span class="contrib-name">{step.name}</span>
                                        <span class="contrib-meta">
                                            {formatFixed(step.minutes, 1)} min · {formatSigned(step[waterfallMeta.dpm], 1)}
                                            {waterfallMeta.dpmLabel}
                                        </span>
                                    </span>
                                    <span class="wf-track" aria-hidden="true">
                                        {#each waterfallScale.ticks as tick (tick)}
                                            <span class="wf-grid" class:wf-zero={tick === 0} style:left="{waterfallScale.at(tick)}%"></span>
                                        {/each}
                                        {#if index > 0}
                                            <span class="wf-link" style:left="{waterfallScale.at(step.start)}%"></span>
                                        {/if}
                                        <span
                                            class="wf-bar"
                                            class:negative={step.value < 0}
                                            style:left="{waterfallScale.at(Math.min(step.start, step.end))}%"
                                            style:width="{Math.abs(waterfallScale.at(step.end) - waterfallScale.at(step.start))}%"
                                        ></span>
                                    </span>
                                    <span class="contrib-total">{formatSigned(step.value, 2)}</span>
                                    <span class="sr-only">
                                        per 100 possessions{waterfallView === 'total' ? '' : ` from ${waterfallView}`}; running total
                                        {formatSigned(step.end, 2)}
                                    </span>
                                </a>
                            </li>
                        {/each}
                        <li>
                            <div class="wf-row wf-row--total">
                                <span class="contrib-who">
                                    <span class="contrib-name">{teamName}</span>
                                    <span class="contrib-meta">{waterfallView === 'total' ? 'DARKO rating' : `Team ${waterfallView}`}</span>
                                </span>
                                <span class="wf-track" aria-hidden="true">
                                    {#each waterfallScale.ticks as tick (tick)}
                                        <span class="wf-grid" class:wf-zero={tick === 0} style:left="{waterfallScale.at(tick)}%"></span>
                                    {/each}
                                    <span class="wf-link" style:left="{waterfallScale.at(waterfall.total)}%"></span>
                                    <span
                                        class="wf-bar wf-bar--total"
                                        class:negative={waterfall.total < 0}
                                        style:left="{waterfallScale.at(Math.min(0, waterfall.total))}%"
                                        style:width="{Math.abs(waterfallScale.at(waterfall.total) - waterfallScale.at(0))}%"
                                    ></span>
                                </span>
                                <span class="contrib-total">{formatSigned(waterfall.total, 2)}</span>
                            </div>
                        </li>
                    </ol>
                    <div class="wf-axis" aria-hidden="true">
                        <span></span>
                        <span class="wf-axis-track">
                            {#each waterfallScale.ticks as tick (tick)}
                                <span class="pay-tick" style:left="{waterfallScale.at(tick)}%">{formatTick(tick)}</span>
                            {/each}
                        </span>
                        <span></span>
                    </div>
                    {#if dnaTip?.chart === 'contrib'}
                        {@render tipBox(dnaTip)}
                    {/if}
                </div>
                {#if abbr}
                    <a class="dna-link" href="/lab?a={abbr}">Rebuild this roster in the Roster Lab →</a>
                {/if}
            </section>

            <section class="dna-section" aria-labelledby="dna-core-title" data-shiny-surface="panel">
                <h2 class="section-title" id="dna-core-title">Core outlook</h2>
                <p class="dna-note">The rotation by projected minutes: age, rating and how long DARKO expects each player to last.</p>
                <div class="core-table-wrapper" data-shiny-table>
                    <table class="core-table">
                        <thead>
                            <tr>
                                <th class="core-th">Player</th>
                                <th class="core-th num">Age</th>
                                <th class="core-th num">DPM</th>
                                <th class="core-th num">
                                    <MetricTooltip text="DARKO's projected seasons left in the league, from its survival model.">
                                        <span>Years left</span>
                                    </MetricTooltip>
                                </th>
                                <th class="core-th num">
                                    <MetricTooltip text="The chance DARKO gives the player of playing at least three more seasons.">
                                        <span>Active in 3 yrs</span>
                                    </MetricTooltip>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each core as row (row.id)}
                                <tr>
                                    <td class="core-cell name"><a href="/player/{row.id}">{row.name}</a></td>
                                    <td class="core-cell num">{row.age === null ? '—' : Math.floor(row.age)}</td>
                                    <td class="core-cell num tint-cell" style={divergingTint(row.dpm, coreTintLimit)}>{formatSigned(row.dpm, 1)}</td>
                                    <td class="core-cell num">{row.seasonsLeft === null ? '—' : formatFixed(row.seasonsLeft, 1)}</td>
                                    <td class="core-cell num">{row.onRosterIn3 === null ? '—' : `${Math.round(row.onRosterIn3)}%`}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    {/if}

    {#if payroll.rows.length > 0}
        <section class="dna-section" aria-labelledby="dna-pay-title" data-shiny-surface="plot">
            <h2 class="section-title" id="dna-pay-title">Payroll against DARKO value</h2>
            <p class="dna-note">
                {formatDollarsMillions(payroll.payroll)} of salary for {formatDollarsMillions(payroll.value)} of DARKO
                fair value. The {payroll.rows.length} best-paid players:
            </p>
            <p class="dna-legend" aria-hidden="true">
                <span class="pay-key"><span class="pay-key-ring"></span> Salary</span>
                <span class="pay-key"><span class="pay-key-dot" style:background={valueColor}></span> DARKO fair value</span>
            </p>
            <div class="dna-chart" data-chart="payroll">
                <ol class="pay-list">
                    {#each payroll.rows as row (row.id)}
                        <li>
                            <a
                                class="pay-row"
                                href="/player/{row.id}"
                                onpointermove={(event) => tipAtPointer(event, payrollTip(row))}
                                onpointerleave={hideTip}
                                onfocus={(event) => tipAtRow(event, payrollTip(row))}
                                onblur={hideTip}
                            >
                                <span class="pay-name">{row.name}</span>
                                <span class="pay-track" aria-hidden="true">
                                    <span
                                        class="pay-span"
                                        style:left="{Math.min(payrollScale.at(row.salary), payrollScale.at(row.value))}%"
                                        style:width="{Math.abs(payrollScale.at(row.value) - payrollScale.at(row.salary))}%"
                                    ></span>
                                    <span class="pay-ring" style:left="{payrollScale.at(row.salary)}%"></span>
                                    <span class="pay-dot" style:left="{payrollScale.at(row.value)}%" style:background={valueColor}></span>
                                </span>
                                <span class="sr-only">
                                    : salary {formatDollarsMillions(row.salary)}, DARKO value {formatDollarsMillions(row.value)}, surplus
                                </span>
                                <span class="pay-surplus tint-cell" style={divergingTint(row.surplus, surplusTintLimit)}>{formatSignedMoney(row.surplus)}</span>
                            </a>
                        </li>
                    {/each}
                </ol>
                <div class="pay-axis" aria-hidden="true">
                    <span></span>
                    <span class="pay-axis-track">
                        {#each payrollScale.ticks as tick (tick)}
                            <span class="pay-tick" style:left="{payrollScale.at(tick)}%">{formatMoneyTick(tick)}</span>
                        {/each}
                    </span>
                    <span class="pay-axis-label">Surplus</span>
                </div>
                {#if dnaTip?.chart === 'payroll'}
                    {@render tipBox(dnaTip)}
                {/if}
            </div>
        </section>
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

    /* Team DNA */
    .dna-grid {
        display: grid;
        grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
        gap: 32px;
        margin-bottom: 32px;
        /* Ask DARKO links to #team-dna; the heading clears the sticky nav. */
        scroll-margin-top: calc(var(--nav-sticky-offset, 64px) + 16px);
    }

    .dna-section {
        min-width: 0;
        margin-bottom: 32px;
    }

    .dna-grid .dna-section {
        margin-bottom: 0;
    }

    .dna-note {
        margin: -8px 0 12px;
        font-size: 13px;
        color: var(--text-secondary);
        max-width: 72ch;
    }

    .dna-legend {
        display: flex;
        gap: 16px;
        margin: 0 0 6px;
        font-size: 12px;
        color: var(--text-secondary);
    }

    .dna-legend span {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
    }

    .dna-chart {
        position: relative;
    }

    .wf-list,
    .pay-list {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .wf-row,
    .pay-row {
        display: grid;
        align-items: center;
        gap: 12px;
        padding: 6px 4px;
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text);
        text-decoration: none;
    }

    .wf-row,
    .wf-axis {
        grid-template-columns: minmax(118px, 34%) minmax(0, 1fr) 48px;
    }

    a.wf-row:hover,
    a.wf-row:focus-visible,
    .pay-row:hover,
    .pay-row:focus-visible {
        background: var(--bg-hover);
    }

    .contrib-who {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .contrib-name,
    .pay-name {
        overflow: hidden;
        font-size: 13px;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .contrib-meta {
        font-size: 11px;
        color: var(--text-muted);
        white-space: nowrap;
    }

    .contrib-total,
    .pay-surplus {
        font-family: var(--font-mono);
        font-size: 13px;
        font-variant-numeric: tabular-nums;
        text-align: right;
    }

    .contrib-total {
        font-weight: 600;
    }

    .dna-switch {
        display: inline-grid;
        grid-auto-flow: column;
        margin: 0 0 10px;
        overflow: hidden;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
    }

    .dna-switch button {
        display: inline-flex;
        align-items: baseline;
        justify-content: center;
        gap: 6px;
        min-height: 32px;
        padding: 7px 14px;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 700;
        color: var(--text-secondary);
        background: transparent;
        border: 0;
        cursor: pointer;
    }

    .dna-switch button + button {
        border-left: 1px solid var(--border);
    }

    .dna-switch button.active {
        color: var(--bg);
        background: var(--accent);
    }

    .dna-switch button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: -2px;
    }

    /* One colour per view: neutral for the total, the offense and defense colours otherwise. */
    .waterfall {
        --wf-bar: var(--text-secondary);
    }

    .waterfall--offense {
        --wf-bar: var(--offense);
    }

    .waterfall--defense {
        --wf-bar: var(--defense);
    }

    .wf-row {
        padding: 5px 4px;
    }

    .wf-track,
    .wf-axis-track {
        position: relative;
        height: 26px;
    }

    .wf-axis-track {
        height: 16px;
    }

    .wf-grid {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--border-subtle);
    }

    .wf-grid.wf-zero {
        background: var(--text-muted);
    }

    .wf-bar {
        position: absolute;
        top: 50%;
        min-width: 1px;
        height: 12px;
        background: var(--wf-bar);
        border-radius: 2px;
        transform: translateY(-50%);
    }

    .wf-bar.negative {
        background: repeating-linear-gradient(135deg, var(--wf-bar) 0 2px, transparent 2px 5px);
        box-shadow: inset 0 0 0 1px var(--wf-bar);
    }

    /* A dashed step from the end of the bar above to the start of this one. */
    .wf-link {
        position: absolute;
        top: -18px;
        height: 25px;
        border-left: 1px dashed var(--text-muted);
    }

    .wf-row--total {
        border-top: 1px solid var(--border);
        border-bottom: 0;
    }

    .wf-row--total .contrib-name,
    .wf-row--total .contrib-total {
        font-weight: 800;
    }

    .wf-bar--total {
        background: var(--text);
    }

    .wf-bar--total.negative {
        background: repeating-linear-gradient(135deg, var(--text) 0 2px, transparent 2px 5px);
        box-shadow: inset 0 0 0 1px var(--text);
    }

    .wf-axis {
        display: grid;
        gap: 12px;
        padding: 4px 4px 0;
        font-size: 11px;
        color: var(--text-muted);
    }

    .dna-link {
        display: inline-block;
        margin-top: 12px;
        font-size: 13px;
    }

    .dna-tip {
        z-index: 5;
        align-items: flex-start;
        white-space: nowrap;
        font-size: 12px;
    }

    .dna-tip-head {
        font-weight: 700;
    }

    .dna-tip-muted {
        color: var(--text-secondary);
    }

    .core-table-wrapper {
        overflow-x: auto;
    }

    .core-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
    }

    .core-th {
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        padding: 8px 6px;
        text-align: left;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--text-muted);
        white-space: nowrap;
        cursor: default;
    }

    .core-th.num {
        text-align: right;
    }

    .core-cell {
        padding: 7px 6px;
        border-bottom: 1px solid var(--border-subtle);
        white-space: nowrap;
    }

    .core-cell.name {
        overflow: hidden;
        max-width: 180px;
        text-overflow: ellipsis;
    }

    .pay-row {
        grid-template-columns: minmax(110px, 24%) minmax(0, 1fr) 76px;
    }

    .pay-track,
    .pay-axis-track {
        position: relative;
        height: 16px;
        margin: 0 7px;
    }

    .pay-span {
        position: absolute;
        top: 50%;
        height: 2px;
        transform: translateY(-50%);
        background: var(--border);
    }

    .pay-ring,
    .pay-dot {
        position: absolute;
        top: 50%;
        width: 11px;
        height: 11px;
        border-radius: 50%;
        transform: translate(-50%, -50%);
    }

    .pay-ring {
        border: 2px solid var(--text-secondary);
        background: var(--bg-surface);
    }

    .pay-surplus {
        display: block;
        padding: 3px 6px;
        border-radius: 3px;
        font-weight: 600;
    }

    .dna-legend .pay-key {
        align-items: center;
    }

    .pay-key-ring,
    .pay-key-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
    }

    .pay-key-ring {
        border: 2px solid var(--text-secondary);
    }

    .pay-axis {
        display: grid;
        grid-template-columns: minmax(110px, 24%) minmax(0, 1fr) 76px;
        gap: 12px;
        padding: 4px 4px 0;
        font-size: 11px;
        color: var(--text-muted);
    }

    .pay-tick {
        position: absolute;
        top: 0;
        transform: translateX(-50%);
        font-family: var(--font-mono);
        white-space: nowrap;
    }

    .pay-axis-label {
        text-align: right;
    }

    @media (max-width: 1100px) {
        .dna-grid {
            grid-template-columns: minmax(0, 1fr);
        }
    }

    @media (max-width: 600px) {
        .wf-row,
        .wf-axis {
            grid-template-columns: minmax(104px, 38%) minmax(0, 1fr) 44px;
            gap: 8px;
        }

        .pay-row,
        .pay-axis {
            grid-template-columns: minmax(96px, 30%) minmax(0, 1fr) 64px;
            gap: 8px;
        }

        .core-cell.name {
            max-width: 130px;
        }

        .core-th {
            white-space: normal;
            vertical-align: bottom;
        }
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
