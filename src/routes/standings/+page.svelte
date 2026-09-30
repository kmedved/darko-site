<script>
    import {
        exportCsvRows,
        standingsCsvColumns,
        standingsExpandedCsvColumns,
        formatFixed
    } from '$lib/utils/csvPresets.js';
    import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr, teamId } from '$lib/utils/teamAbbreviations.js';
    import {
        buildMetricHeatScales,
        getMetricHeatVariables
    } from '$lib/utils/metricHeatScales.js';
    import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import StatTile from '$lib/components/StatTile.svelte';
    import { finalStandingsRows, isSeasonComplete, resultCounts, RESULTS } from '$lib/utils/finalStandings.js';
    import { seasonLabelFromEndYear } from '$lib/utils/timeMachine.js';

    let { data } = $props();

    let conference = $state('East');
    let sortColumn = $state('Rk');
    let sortDirection = $state('asc');
    let showExpandedStandings = $state(false);
    let teamSearch = $state('');
    let standingsTableRoot = $state(null);
    let standingsBodyScroller = $state(null);
    let standingsBodyTable = $state(null);
    let standingsSourceHead = $state(null);
    let standingsHeaderScroller = $state(null);
    let standingsHeaderTable = $state(null);

    const PLAYOFF_LOCK_THRESHOLD = 95;
    const PLAYOFF_LIKELY_THRESHOLD = 70;

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
        conference: { type: 'text' },
        seed: { type: 'number' },
        result: { type: 'text' }
    };

    const baseStandingsColumns = [
        { key: 'Rk', label: '#', alignClass: 'rk', dataType: 'number', format: 'integer' },
        { key: 'team_name', label: 'Team', alignClass: 'name', dataType: 'text', isTeam: true },
        { key: 'Current', label: 'Current', alignClass: 'rec', dataType: 'text' },
        { key: 'W', label: 'W', alignClass: 'num', dataType: 'number', format: 'decimal' },
        { key: 'L', label: 'L', alignClass: 'num', dataType: 'number', format: 'decimal' },
        { key: 'SRS', label: 'Projected Rating', alignClass: 'num', dataType: 'number', format: 'decimal', decimals: 2 },
        { key: 'Playoffs', label: 'Playoff%', alignClass: 'num', dataType: 'percent' },
        { key: 'Win Conf', label: 'Win Conf', alignClass: 'num', dataType: 'percent' },
        { key: 'Win Finals', label: 'Win Finals', alignClass: 'num', dataType: 'percent' },
        { key: 'Lottery%', label: 'Lotto%', alignClass: 'num', dataType: 'percent' },
        { key: 'ExpPick', label: 'E[Pick]', alignClass: 'num', dataType: 'number', format: 'decimal' }
    ];

    // A finished season: records, seeds and results instead of odds that are all 0 or 100.
    const finalStandingsColumns = [
        { key: 'Rk', label: '#', alignClass: 'rk', dataType: 'number', format: 'integer' },
        { key: 'team_name', label: 'Team', alignClass: 'name', dataType: 'text', isTeam: true },
        { key: 'Current', label: 'Record', alignClass: 'rec', dataType: 'text' },
        { key: 'seed', label: 'Seed', alignClass: 'num', dataType: 'number', format: 'integer' },
        { key: 'result', label: 'Result', alignClass: 'name', dataType: 'text' },
        { key: 'SRS', label: 'SRS', alignClass: 'num', dataType: 'number', format: 'decimal', decimals: 2 }
    ];

    const expandedStandingsColumns = [
        // W/L% arrives as a fraction (0.78); the odds columns are already 0-100.
        { key: 'W/L%', label: 'W/L%', alignClass: 'num', dataType: 'percent', fraction: true },
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
    const standingsHeatAccessors = Object.fromEntries(
        [...baseStandingsColumns, ...expandedStandingsColumns]
            .filter((column) => column.key !== 'Rk' && ['number', 'percent'].includes(column.dataType))
            .map((column) => [column.key, column.key])
    );

    // Every offseason the simulation keeps publishing the finished season, so the page shows it as
    // final standings until DARKO simulates the next one.
    const seasonComplete = $derived(
        isSeasonComplete([...(data.eastStandings || []), ...(data.westStandings || [])])
    );
    const seasonLabel = $derived(seasonLabelFromEndYear(data.playedSeason));
    // The # is the order of records, and since 2020-21 seeds 7 and 8 come out of the play-in, so a
    // team can finish 7th and take the 8 seed (Orlando and Philadelphia, 2025-26).
    const playInNote = $derived(
        (data.playedSeason ?? 0) >= 2021
            ? ' Seeds 7 and 8 are settled in the play-in among the teams that finished 7th to 10th, so they can differ from the order of records.'
            : ''
    );
    const nextSeasonLabel = $derived(data.playedSeason ? seasonLabelFromEndYear(data.playedSeason + 1) : '');

    const visibleStandingsColumns = $derived.by(() => {
        if (seasonComplete) return [...finalStandingsColumns];
        return showExpandedStandings ? [...baseStandingsColumns, ...expandedStandingsColumns] : [...baseStandingsColumns];
    });

    const standings = $derived.by(() => {
        const rows = conference === 'East' ? (data.eastStandings || []) : (data.westStandings || []);
        return seasonComplete ? finalStandingsRows(rows) : rows;
    });
    const standingsHeatScales = $derived.by(() =>
        buildMetricHeatScales(standings, standingsHeatAccessors, { quantileStep: 0.1 })
    );

    const filteredStandings = $derived.by(() => {
        const query = teamSearch.trim().toLowerCase();
        if (!query) return standings;
        return standings.filter((team) => {
            const fullName = String(team?.team_name || '').toLowerCase();
            const abbr = teamAbbr(team?.team_name).toLowerCase();
            return fullName.includes(query) || abbr.includes(query);
        });
    });

    const sortedStandings = $derived.by(() =>
        getSortedRows(filteredStandings, {
            sortColumn,
            sortDirection,
            sortConfigs: standingsSortConfig
        })
    );

    const summaryCards = $derived(seasonComplete ? buildFinalCards(standings) : buildSummaryCards(standings));
    const srsTintLimit = $derived(tintLimit(standings.map((team) => team?.SRS)));
    const playoffDistribution = $derived(
        seasonComplete ? buildResultDistribution(standings) : buildPlayoffDistribution(standings)
    );
    const finalCounts = $derived(resultCounts(standings));
    const finalSeeds = $derived(
        standings.filter((team) => team.seed !== null && team.seed !== undefined).sort((a, b) => a.seed - b.seed)
    );
    const conferenceFavorites = $derived(
        standings
            .slice()
            .sort((a, b) => numberValue(b?.['Win Conf']) - numberValue(a?.['Win Conf']))
            .slice(0, 5)
    );
    const averageWins = $derived(formatFixed(average(standings.map((team) => numberValue(team?.W))), 1));
    const playoffLocks = $derived(standings.filter((team) => numberValue(team?.Playoffs) >= PLAYOFF_LOCK_THRESHOLD).length);
    const bubbleTeams = $derived(
        standings.filter((team) => {
            const playoffOdds = numberValue(team?.Playoffs);
            return playoffOdds > 0 && playoffOdds < PLAYOFF_LIKELY_THRESHOLD;
        }).length
    );

    function numberValue(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function average(values) {
        const finite = values.filter((value) => Number.isFinite(value));
        if (finite.length === 0) return 0;
        return finite.reduce((sum, value) => sum + value, 0) / finite.length;
    }

    function maxBy(rows, key) {
        return rows.reduce((best, row) => {
            if (!best) return row;
            return numberValue(row?.[key]) > numberValue(best?.[key]) ? row : best;
        }, null);
    }

    function formatSigned(value, decimals = 2) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) return '—';
        return `${parsed >= 0 ? '+' : ''}${parsed.toFixed(decimals)}`;
    }

    function formatPercent(value) {
        const formatted = formatFixed(value, 1);
        return formatted === '—' ? formatted : `${formatted}%`;
    }

    function formatRecordProjection(team) {
        if (!team) return '—';
        return `${formatFixed(team.W, 1)}-${formatFixed(team.L, 1)}`;
    }

    function buildSummaryCards(rows) {
        const bestRecord = maxBy(rows, 'W');
        const finalsFavorite = maxBy(rows, 'Win Finals');
        const highestSrs = maxBy(rows, 'SRS');
        const topLottery = maxBy(rows, 'Lottery%');

        return [
            {
                title: 'Best Record Projection',
                team: bestRecord,
                value: formatRecordProjection(bestRecord)
            },
            {
                title: 'Top Finals Favorite',
                team: finalsFavorite,
                value: formatPercent(numberValue(finalsFavorite?.['Win Finals']))
            },
            {
                title: 'Highest SRS',
                team: highestSrs,
                value: formatSigned(numberValue(highestSrs?.SRS), 2)
            },
            {
                title: 'Top Lottery Odds',
                team: topLottery,
                value: formatPercent(numberValue(topLottery?.['Lottery%']))
            },
            {
                title: 'Playoff Locks',
                value: String(rows.filter((team) => numberValue(team?.Playoffs) >= PLAYOFF_LOCK_THRESHOLD).length),
                caption: `Teams at ${PLAYOFF_LOCK_THRESHOLD}%+ playoff odds`
            }
        ];
    }

    function buildFinalCards(rows) {
        const confChampion = rows.find((row) => row.result === RESULTS.champion || row.result === RESULTS.finals) ?? null;
        const bestRecord = maxBy(rows, 'W');
        const highestSrs = maxBy(rows, 'SRS');
        const worstRecord = rows.reduce(
            (worst, row) => (!worst || numberValue(row?.W) < numberValue(worst?.W) ? row : worst),
            null
        );
        const counts = resultCounts(rows);

        return [
            {
                title: 'Conference Champion',
                team: confChampion,
                value: confChampion?.Current ?? '—',
                caption: confChampion ? (confChampion.result === RESULTS.champion ? 'Won the Finals' : 'Lost the Finals') : undefined
            },
            { title: 'Best Record', team: bestRecord, value: bestRecord?.Current ?? '—' },
            { title: 'Highest SRS', team: highestSrs, value: formatSigned(numberValue(highestSrs?.SRS), 2) },
            { title: 'Worst Record', team: worstRecord, value: worstRecord?.Current ?? '—' },
            {
                title: 'Playoff Teams',
                value: String(counts.playoffs),
                caption: `${counts.throughPlayIn} through the play-in`
            }
        ];
    }

    function buildResultDistribution(rows) {
        const counts = resultCounts(rows);
        const buckets = [
            { key: 'playoffs', label: 'Playoffs', count: counts.playoffs },
            { key: 'play-in', label: 'Out in the play-in', count: counts.playIn },
            { key: 'lottery', label: 'Lottery', count: counts.lottery }
        ];
        const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
        const total = Math.max(rows.length, 1);
        return buckets.map((bucket) => ({
            ...bucket,
            percent: (bucket.count / total) * 100,
            width: Math.max(4, (bucket.count / maxCount) * 100)
        }));
    }

    function buildPlayoffDistribution(rows) {
        const buckets = [
            { key: 'locks', label: 'Locks', count: rows.filter((team) => numberValue(team?.Playoffs) >= PLAYOFF_LOCK_THRESHOLD).length },
            {
                key: 'likely',
                label: 'Likely',
                count: rows.filter((team) => {
                    const odds = numberValue(team?.Playoffs);
                    return odds >= PLAYOFF_LIKELY_THRESHOLD && odds < PLAYOFF_LOCK_THRESHOLD;
                }).length
            },
            {
                key: 'bubble',
                label: 'Bubble',
                count: rows.filter((team) => {
                    const odds = numberValue(team?.Playoffs);
                    return odds > 0 && odds < PLAYOFF_LIKELY_THRESHOLD;
                }).length
            },
            { key: 'lottery', label: 'Lottery', count: rows.filter((team) => numberValue(team?.Playoffs) <= 0).length }
        ];
        const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 1);
        const total = Math.max(rows.length, 1);
        return buckets.map((bucket) => ({
            ...bucket,
            percent: (bucket.count / total) * 100,
            width: Math.max(4, (bucket.count / maxCount) * 100)
        }));
    }

    function formatConference(value) {
        if (value === 'East') return 'Eastern Conference';
        if (value === 'West') return 'Western Conference';
        return value || '—';
    }

    function percentValue(column, value) {
        const n = Number.parseFloat(value);
        return column.fraction && Number.isFinite(n) ? n * 100 : value;
    }

    function formatCellValue(column, value) {
        if (column.dataType === 'conference') return formatConference(value);
        if (value === null || value === undefined || value === '') return '—';
        if (column.dataType === 'percent') return formatPercent(percentValue(column, value));
        if (column.format === 'integer') return formatFixed(value, 0);
        if (column.format === 'decimal') return formatFixed(value, column.decimals ?? 1);
        return String(value);
    }

    // These class names drive the Shiny view's heat cells. The modern view prints every number in
    // neutral ink, mutes zeros, and tints only the projected rating (see srsStyle).
    function pctClass(value) {
        const n = Number.parseFloat(value);
        if (!Number.isFinite(n)) return '';
        if (n >= 80) return 'metric-positive';
        if (n >= 40) return 'metric-accent';
        if (n > 0) return 'metric-muted';
        return 'metric-muted num-quiet';
    }

    function srsClass(value) {
        const n = Number.parseFloat(value);
        if (!Number.isFinite(n)) return '';
        return n >= 0
            ? 'metric-positive metric-highlight-positive tint-cell'
            : 'metric-negative metric-highlight-negative tint-cell';
    }

    function cellStyle(column, value) {
        const shinyHeat = getMetricHeatVariables(column.key, value, standingsHeatScales);
        return column.key === 'SRS' ? `${shinyHeat} ${divergingTint(value, srsTintLimit)}` : shinyHeat;
    }

    function getCellClass(column, value) {
        const classes = ['standings-cell', column.alignClass || 'num'];
        if (column.dataType === 'percent') classes.push('pct', pctClass(percentValue(column, value)));
        if (column.key === 'SRS') classes.push(srsClass(value));
        return classes.filter(Boolean).join(' ');
    }

    function toggleSort(column) {
        ({ sortColumn, sortDirection } = getNextSortState({
            sortColumn,
            sortDirection,
            column,
            defaultDirection: column === 'Rk' || column === 'team_name' || column === 'Current' ? 'asc' : 'desc'
        }));
    }

    function exportStandingsCsv() {
        const columns = showExpandedStandings ? standingsExpandedCsvColumns : standingsCsvColumns;
        exportCsvRows({
            rows: sortedStandings,
            columns,
            filename: `${conference.toLowerCase()}-conference-standings.csv`
        });
    }

    function teamLogoUrl(teamName) {
        const id = teamId(teamName);
        return id ? `/api/img/logo/${id}` : null;
    }

    function hideBrokenImage(event) {
        event.currentTarget.hidden = true;
    }

    function barWidth(value, rows, key = 'Win Conf') {
        const max = Math.max(...rows.map((row) => numberValue(row?.[key])), 1);
        return Math.max(6, Math.min(100, (numberValue(value) / max) * 100));
    }

    $effect(() => {
        sortColumn;
        sortDirection;
        conference;
        showExpandedStandings;
        teamSearch;
        sortedStandings.length;
        standingsTableRoot;
        standingsBodyScroller;
        standingsBodyTable;
        standingsSourceHead;
        standingsHeaderScroller;
        standingsHeaderTable;
        return setupWideStickyTable({
            root: standingsTableRoot,
            bodyScroller: standingsBodyScroller,
            bodyTable: standingsBodyTable,
            sourceHead: standingsSourceHead,
            headerScroller: standingsHeaderScroller,
            headerTable: standingsHeaderTable,
            wheelTarget: standingsHeaderScroller
        });
    });
</script>

{#snippet standingsSemanticHeaderRow()}
    <tr class="table-semantic-row sr-only">
        {#each visibleStandingsColumns as column (column.key)}
            <th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}>{column.label}</th>
        {/each}
    </tr>
{/snippet}

{#snippet standingsHeaderRow()}
    <tr class="table-sizing-row">
        {#each visibleStandingsColumns as column (column.key)}
            <th
                class="{column.alignClass} {column.dataType === 'percent' ? 'pct' : ''} {sortColumn === column.key ? 'active' : ''}"
                aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
            >
                <button type="button" onclick={() => toggleSort(column.key)}>
                    <span>{column.label}</span>
                    <span class="sort-indicator" aria-hidden="true">{getSortGlyph(sortColumn, sortDirection, column.key)}</span>
                </button>
            </th>
        {/each}
    </tr>
{/snippet}

<svelte:head>
    <title>Standings — DARKO DPM</title>
</svelte:head>

<div class="standings-page" data-shiny-page>
    <div class="container standings-container">
        {#if seasonComplete}
            <PageHeader
                id="standings-title"
                title={seasonLabel ? `${seasonLabel} Final Standings` : 'Final Standings'}
                lede={`The season is over. DARKO's win projections and playoff odds${nextSeasonLabel ? ` for ${nextSeasonLabel}` : ''} appear once it simulates the new season.`}
            />
        {:else}
            <PageHeader
                id="standings-title"
                title="Season Simulation"
                lede="Win projections, playoff odds, and championship probabilities from 10,000 simulations."
            />
        {/if}

        <section class="stat-strip" aria-label={seasonComplete ? 'Season leaders' : 'Simulation leaders'}>
            {#each summaryCards as card (card.title)}
                <StatTile
                    label={card.title}
                    value={card.value}
                    detail={card.caption}
                    logo={card.team ? teamLogoUrl(card.team.team_name) : ''}
                >
                    {#if card.team}
                        <a href="/standings/{encodeURIComponent(card.team.team_name)}">{card.team.team_name}</a>
                    {/if}
                </StatTile>
            {/each}
        </section>

        {#if standings.length === 0}
            <div class="empty-state">No standings data is currently available.</div>
        {:else}
            <div class="standings-workspace">
                <section class="standings-table-panel" data-shiny-surface="panel" aria-label="{conference} conference standings">
                    <div class="standings-controls" data-shiny-surface="well">
                        <div class="conference-toggle" role="group" aria-label="Conference">
                            <button type="button" class:active={conference === 'East'} onclick={() => (conference = 'East')}>Eastern</button>
                            <button type="button" class:active={conference === 'West'} onclick={() => (conference = 'West')}>Western</button>
                        </div>

                        <div class="control-field control-field--search">
                            <div class="search-control">
                                <input
                                    id="team-search"
                                    type="search"
                                    value={teamSearch}
                                    oninput={(event) => (teamSearch = event.currentTarget.value)}
                                    placeholder="Search teams..."
                                    aria-label="Search teams"
                                />
                            </div>
                        </div>

                        {#if !seasonComplete}
                            <div class="view-toggle" role="group" aria-label="Standings view">
                                <button type="button" class:active={!showExpandedStandings} onclick={() => (showExpandedStandings = false)}>Standard</button>
                                <button type="button" class:active={showExpandedStandings} onclick={() => (showExpandedStandings = true)}>Detailed Odds</button>
                            </div>
                        {/if}

                        <button
                            class="btn"
                            type="button"
                            onclick={exportStandingsCsv}
                            disabled={sortedStandings.length === 0}
                        >
                            Download CSV
                        </button>
                    </div>

                    <!-- A detached header stays pinned under the nav while the body scrolls sideways
                         (utils/wideStickyTable.js), so no column is ever hidden to fit. -->
                    <div
                        class="table-wrapper table-shell {showExpandedStandings ? 'expanded' : ''}"
                        data-shiny-table
                        bind:this={standingsTableRoot}
                    >
                        <div class="sticky-header-shell">
                            <div class="table-header-scroll" bind:this={standingsHeaderScroller}>
                                <table class="sticky-header-table" role="presentation" bind:this={standingsHeaderTable}>
                                    <thead>
                                        {@render standingsHeaderRow()}
                                    </thead>
                                </table>
                            </div>
                        </div>

                        <div class="table-body-scroll" bind:this={standingsBodyScroller}>
                            <table bind:this={standingsBodyTable}>
                                <thead class="table-sizing-head" bind:this={standingsSourceHead}>
                                    {@render standingsHeaderRow()}
                                    {@render standingsSemanticHeaderRow()}
                                </thead>
                                <tbody>
                                    {#if sortedStandings.length === 0}
                                        <tr>
                                            <td class="empty-row" colspan={visibleStandingsColumns.length}>No matching teams.</td>
                                        </tr>
                                    {:else}
                                        {#each sortedStandings as team (team.team_name)}
                                            <tr>
                                                {#each visibleStandingsColumns as column (column.key)}
                                                    <td
                                                        class="{getCellClass(column, team?.[column.key])} {standingsHeatScales[column.key] ? 'shiny-heat-cell' : ''}"
                                                        style={cellStyle(column, team?.[column.key])}
                                                    >
                                                        {#if column.isTeam}
                                                            <a class="team-link" href="/standings/{encodeURIComponent(team.team_name)}">
                                                                <span class="team-mark">
                                                                    {#if teamLogoUrl(team.team_name)}
                                                                        <img src={teamLogoUrl(team.team_name)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                                                    {/if}
                                                                </span>
                                                                <span>{team.team_name}</span>
                                                            </a>
                                                        {:else}
                                                            {formatCellValue(column, team?.[column.key])}
                                                        {/if}
                                                    </td>
                                                {/each}
                                            </tr>
                                        {/each}
                                    {/if}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p class="standings-note">
                        {seasonComplete
                            ? `Final regular-season records, seeds and how each season ended.${playInNote}`
                            : 'Results based on 10,000 season simulations.'}
                    </p>
                </section>

                <aside class="standings-rail" aria-label={seasonComplete ? 'Season results' : 'Simulation insights'}>
                    <section class="insight-card" data-shiny-surface="panel">
                        <div class="insight-card-header">
                            <h2>{seasonComplete ? 'How the Season Ended' : 'Playoff Odds Distribution'}</h2>
                            <span class="insight-info" title={`${conference}ern Conference`}>i</span>
                        </div>
                        <div class="odds-distribution">
                            {#each playoffDistribution as bucket (bucket.key)}
                                <div class="odds-row">
                                    <span>{bucket.label}</span>
                                    <div class="odds-bar" aria-hidden="true">
                                        <span style={`width: ${bucket.width}%`}></span>
                                    </div>
                                    <strong>{bucket.count} ({formatFixed(bucket.percent, 1)}%)</strong>
                                </div>
                            {/each}
                        </div>
                        <div class="rail-stat-grid">
                            <div>
                                <span>Avg Wins</span>
                                <strong>{averageWins}</strong>
                            </div>
                            {#if seasonComplete}
                                <div>
                                    <span>Playoff Teams</span>
                                    <strong>{finalCounts.playoffs}</strong>
                                </div>
                                <div>
                                    <span>Through Play-in</span>
                                    <strong>{finalCounts.throughPlayIn}</strong>
                                </div>
                                <div>
                                    <span>Lottery Teams</span>
                                    <strong>{finalCounts.lottery}</strong>
                                </div>
                            {:else}
                                <div>
                                    <span>Playoff Locks</span>
                                    <strong>{playoffLocks}</strong>
                                </div>
                                <div>
                                    <span>Bubble Teams</span>
                                    <strong>{bubbleTeams}</strong>
                                </div>
                                <div>
                                    <span>Simulations</span>
                                    <strong>10,000</strong>
                                </div>
                            {/if}
                        </div>
                    </section>

                    {#if seasonComplete}
                        <section class="insight-card" data-shiny-surface="panel">
                            <div class="insight-card-header">
                                <h2>Final Seeds</h2>
                                <span>RESULT</span>
                            </div>
                            <div class="favorite-list">
                                {#each finalSeeds as team (team.team_name)}
                                    <a class="favorite-team" href="/standings/{encodeURIComponent(team.team_name)}">
                                        <span class="favorite-rank">{team.seed}</span>
                                        <span class="favorite-logo">
                                            {#if teamLogoUrl(team.team_name)}
                                                <img src={teamLogoUrl(team.team_name)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                            {/if}
                                        </span>
                                        <span class="favorite-main">
                                            <span>{team.team_name} <span class="final-record">{team.Current}</span></span>
                                            <span class="favorite-bar">
                                                <span style={`width: ${barWidth(team.W, finalSeeds, 'W')}%`}></span>
                                            </span>
                                        </span>
                                        <strong>{team.result}</strong>
                                    </a>
                                {/each}
                            </div>
                        </section>
                    {:else}
                        <section class="insight-card" data-shiny-surface="panel">
                            <div class="insight-card-header">
                                <h2>Conference Favorites</h2>
                                <span>WIN CONF %</span>
                            </div>
                            <div class="favorite-list">
                                {#each conferenceFavorites as team, index (team.team_name)}
                                    <a class="favorite-team" href="/standings/{encodeURIComponent(team.team_name)}">
                                        <span class="favorite-rank">{index + 1}</span>
                                        <span class="favorite-logo">
                                            {#if teamLogoUrl(team.team_name)}
                                                <img src={teamLogoUrl(team.team_name)} alt="" loading="lazy" onerror={hideBrokenImage} />
                                            {/if}
                                        </span>
                                        <span class="favorite-main">
                                            <span>{team.team_name}</span>
                                            <span class="favorite-bar">
                                                <span style={`width: ${barWidth(team['Win Conf'], conferenceFavorites)}%`}></span>
                                            </span>
                                        </span>
                                        <strong>{formatPercent(team['Win Conf'])}</strong>
                                    </a>
                                {/each}
                            </div>
                            <a class="rail-link" href="/standings/{encodeURIComponent(conferenceFavorites[0]?.team_name || '')}">View full projections</a>
                        </section>
                    {/if}
                </aside>
            </div>
        {/if}
    </div>
</div>

<style>
    .final-record {
        margin-left: 4px;
        font-family: var(--font-mono);
        font-size: 0.85em;
        font-weight: 400;
        color: var(--text-muted);
    }

    .standings-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        padding: 0 0 34px;
        background: var(--bg);
    }

    .standings-workspace {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 350px;
        gap: 18px;
        align-items: start;
    }

    .standings-table-panel {
        min-width: 0;
        overflow-x: clip;
    }

    .standings-controls {
        display: grid;
        grid-template-columns: auto minmax(220px, 1fr) auto auto;
        gap: 10px;
        align-items: center;
        margin-bottom: 14px;
    }

    .conference-toggle,
    .view-toggle {
        display: inline-grid;
        grid-auto-flow: column;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        overflow: hidden;
        background: var(--bg-surface);
    }

    .view-toggle {
        grid-template-columns: repeat(2, minmax(126px, 1fr));
        min-width: 252px;
    }

    .conference-toggle button,
    .view-toggle button {
        min-height: 38px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 800;
        padding: 0 20px;
        cursor: pointer;
        white-space: nowrap;
        transition: background-color 0.15s, color 0.15s;
    }

    .conference-toggle button.active,
    .view-toggle button.active {
        background: var(--accent);
        color: var(--bg);
    }

    .control-field--search {
        min-width: 220px;
    }

    .search-control {
        position: relative;
    }

    .search-control input {
        width: 100%;
        height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        padding: 0 14px;
        outline: none;
    }

    .search-control input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .table-wrapper {
        --wide-sticky-header-height: 44px;
        width: 100%;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        overflow: visible;
    }

    .table-shell {
        position: relative;
    }

    .sticky-header-shell {
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 30;
        margin-bottom: calc(-1 * var(--wide-sticky-header-height));
        border-radius: var(--radius-sm) var(--radius-sm) 0 0;
        overflow: hidden;
    }

    .table-header-scroll {
        overflow: hidden;
    }

    .table-body-scroll {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        width: max-content;
        min-width: 100%;
    }

    th {
        height: 44px;
        cursor: pointer;
        user-select: none;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        color: var(--text-secondary);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.04em;
        text-align: left;
        text-transform: uppercase;
        white-space: nowrap;
        padding: 0 11px;
    }

    th:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    th button {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font: inherit;
        letter-spacing: inherit;
        text-transform: inherit;
        cursor: pointer;
    }

    th.num button,
    th.rec button {
        justify-content: flex-end;
    }

    th button:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: -2px;
    }

    th.num,
    th.rec,
    td.num,
    td.rec {
        text-align: right;
    }

    .sort-indicator {
        margin-left: 5px;
        color: var(--accent);
        opacity: 0.8;
        font-size: 11px;
    }

    td {
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text);
        padding: 10px 11px;
        white-space: nowrap;
        background: var(--bg-surface);
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    tbody tr:hover td {
        background: var(--bg-elevated);
    }

    td.num-quiet {
        color: var(--text-muted);
    }

    .rk,
    .num,
    .rec {
        font-family: var(--font-mono);
        font-weight: 500;
        font-size: 13px;
    }

    td.tint-cell {
        font-weight: var(--figure-weight-strong);
    }

    td.rk,
    th:nth-child(1) {
        position: sticky;
        left: 0;
        z-index: 4;
        min-width: 42px;
        width: 42px;
        text-align: right;
        background: var(--bg);
    }

    td.name,
    th:nth-child(2) {
        position: sticky;
        left: 42px;
        z-index: 4;
        min-width: 238px;
        background: var(--bg);
        box-shadow: 1px 0 0 var(--border-subtle);
    }

    td.name {
        background: var(--bg-surface);
    }

    tbody tr:hover td.rk,
    tbody tr:hover td.name {
        background: var(--bg-elevated);
    }

    .team-link {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        color: var(--text);
        font-weight: 850;
    }

    .team-link:hover {
        color: var(--accent);
    }

    .team-mark {
        width: 23px;
        height: 23px;
        display: inline-grid;
        place-items: center;
        border-radius: 50%;
        background: var(--bg-elevated);
        flex: 0 0 auto;
    }

    .team-mark img {
        width: 21px;
        height: 21px;
        object-fit: contain;
    }


    .standings-note,
    .empty-row {
        color: var(--text-muted);
        font-size: 12px;
    }

    .standings-note {
        margin-top: 12px;
    }

    .empty-row {
        text-align: center;
        padding: 28px;
    }

    .standings-rail {
        display: grid;
        gap: 14px;
        position: sticky;
        top: calc(var(--nav-sticky-offset) + 18px);
        z-index: 5;
    }

    .insight-card {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: color-mix(in srgb, var(--bg-elevated) 72%, var(--bg));
        color: var(--text);
        padding: 18px;
        box-shadow: 0 16px 36px color-mix(in srgb, var(--text) 13%, transparent);
    }

    .insight-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 16px;
    }

    .insight-card h2 {
        font-size: 16px;
        line-height: 1.1;
        font-weight: 850;
        letter-spacing: 0;
    }

    .insight-card-header > span,
    .insight-info {
        color: var(--text-secondary);
        font-size: 11px;
        font-family: var(--font-mono);
        font-weight: var(--figure-weight-strong);
    }

    .insight-info {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        border: 1px solid var(--graphic-muted);
    }

    .odds-distribution {
        display: grid;
        gap: 14px;
        margin-bottom: 18px;
    }

    .odds-row {
        display: grid;
        grid-template-columns: 58px minmax(0, 1fr) 76px;
        align-items: center;
        gap: 12px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    .odds-row strong {
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: var(--figure-weight-strong);
        text-align: right;
    }

    .odds-bar {
        height: 20px;
        border-radius: 0;
        background: var(--bg-surface);
        overflow: hidden;
    }

    .odds-bar span {
        display: block;
        height: 100%;
        background: var(--accent);
    }

    .rail-stat-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
    }

    .rail-stat-grid div {
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 9px 8px;
        background: color-mix(in srgb, var(--bg-surface) 45%, transparent);
        min-width: 0;
    }

    .rail-stat-grid span {
        display: block;
        color: var(--text-secondary);
        font-size: 11px;
        margin-bottom: 5px;
    }

    .rail-stat-grid strong {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 16px;
        font-weight: var(--figure-weight-strong);
    }

    .favorite-list {
        display: grid;
        gap: 13px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 14px;
    }

    .favorite-team {
        display: grid;
        grid-template-columns: 22px 34px minmax(0, 1fr) auto;
        align-items: center;
        gap: 10px;
        color: var(--text);
    }

    .favorite-team:hover {
        color: var(--accent);
    }

    .favorite-rank {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-weight: var(--figure-weight-strong);
    }

    .favorite-logo {
        width: 30px;
        height: 30px;
        display: inline-grid;
        place-items: center;
    }

    .favorite-logo img {
        max-width: 30px;
        max-height: 30px;
        object-fit: contain;
    }

    .favorite-main {
        display: grid;
        gap: 7px;
        min-width: 0;
        font-weight: 850;
        font-size: 13px;
    }

    .favorite-main > span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .favorite-bar {
        display: block;
        height: 4px;
        background: var(--bg-surface);
    }

    .favorite-bar span {
        display: block;
        height: 100%;
        background: var(--accent);
    }

    .favorite-team strong {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: var(--figure-weight-strong);
    }

    .rail-link {
        display: inline-block;
        margin-top: 14px;
        color: var(--accent);
        font-weight: 850;
        font-size: 13px;
    }

    /* Below 1460px the side panels move under the table so all eleven columns fit. */
    @media (max-width: 1460px) {
        .standings-workspace {
            grid-template-columns: 1fr;
        }

        .standings-rail {
            position: static;
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    /* On a phone the rank and team columns scroll with the rest instead of pinning most of the
       screen. */
    @media (max-width: 768px) {
        td.rk,
        td.name,
        th:nth-child(1),
        th:nth-child(2) {
            position: static;
            left: auto;
            box-shadow: none;
        }

        td.name,
        th:nth-child(2) {
            min-width: 0;
        }
    }

    @media (max-width: 820px) {
        .standings-rail {
            grid-template-columns: 1fr;
        }

        .standings-controls {
            grid-template-columns: 1fr;
        }

        .conference-toggle,
        .view-toggle {
            width: 100%;
            grid-template-columns: repeat(2, 1fr);
            min-width: 0;
        }

        .control-field--search {
            min-width: 0;
        }

        .rail-stat-grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
</style>
