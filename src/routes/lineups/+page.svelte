<script>
    import { goto, preloadData } from '$app/navigation';
    import { getContext } from 'svelte';
    import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
    import PageHeader from '$lib/components/PageHeader.svelte';
    import MetricTooltip from '$lib/components/MetricTooltip.svelte';
    import { divergingTint, tintLimit } from '$lib/utils/divergingTint.js';
    import StatTile from '$lib/components/StatTile.svelte';
    import { exportCsvRows, formatFixed, formatSignedMetric, getLineupsCsvColumns } from '$lib/utils/csvPresets.js';
    import { unpackLineups } from '$lib/utils/lineupTransport.js';
    import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
    import { formatAsOfDate } from '$lib/utils/timeMachine.js';
    import { setupWideStickyTable } from '$lib/utils/wideStickyTable.js';
    import {
        buildPresetHeatScales,
        getMetricHeatVariables
    } from '$lib/utils/metricHeatScales.js';

    /** @type {import('./$types').PageProps} */
    let { data } = $props();
    const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
    const isShinyView = $derived(displayMode.view === 'shiny');

    const sizeOptions = [
        { value: 2, label: '2-Man' },
        { value: 3, label: '3-Man' },
        { value: 4, label: '4-Man' },
        { value: 5, label: '5-Man' }
    ];

    const variantOptions = [
        { value: 'pi', label: 'PI' },
        { value: 'npi', label: 'NPI' }
    ];

    const pageSizeOptions = [10, 20, 50, 100];
    const TEAM_PENDING_LABEL = 'Team pending';
    const MAX_RAIL_TEAMS = 5;

    const synergyColumns = [
        { key: 'off_synergy', label: 'Off Syn', alignClass: 'num', type: 'number', dataType: 'number' },
        { key: 'def_synergy', label: 'Def Syn', alignClass: 'num', type: 'number', dataType: 'number' }
    ];

    let selectedVariant = $state('pi');
    let sortColumn = $state('net_pm');
    let sortDirection = $state('desc');
    let searchQuery = $state('');
    let teamFilter = $state('all');
    let selectedMinimumPossessions = $state(null);
    let page = $state(1);
    let pageSize = $state(20);
    let lineupsTableRoot = $state(null);
    let lineupsBodyScroller = $state(null);
    let lineupsBodyTable = $state(null);
    let lineupsSourceHead = $state(null);
    let lineupsHeaderScroller = $state(null);
    let lineupsHeaderTable = $state(null);

    let PLAYER_KEYS = $derived(
        Array.from({ length: data.lineupSize ?? 5 }, (_, i) => `player_${i + 1}`)
    );

    // One Lineup column of names in both views (the Shiny composition), rather than a column per
    // player that could only fit an initial.
    let baseColumns = $derived.by(() => {
        return [
            { key: '_rank', label: '#', alignClass: 'rank-col', sortable: false },
            { key: 'team_name', label: 'Team', alignClass: 'team-col', type: 'text', dataType: 'text', sortable: true },
            { key: 'lineup_label', label: 'Lineup', alignClass: 'lineup-col', type: 'text', dataType: 'text', sortable: true },
            { key: 'possessions', label: 'Poss', alignClass: 'num', type: 'number', dataType: 'number', sortable: true },
            { key: 'net_pm', label: 'Net +/-', alignClass: 'num', type: 'number', dataType: 'number', sortable: true },
            { key: 'off_pm', label: 'Off +/-', alignClass: 'num', type: 'number', dataType: 'number', sortable: true },
            { key: 'def_pm', label: 'Def +/-', alignClass: 'num', type: 'number', dataType: 'number', sortable: true }
        ];
    });

    let tableColumns = $derived(
        selectedVariant === 'pi' ? [...baseColumns, ...synergyColumns] : baseColumns
    );

    let sortConfigs = $derived.by(() => {
        const configs = {
            team_name: { type: 'text' },
            lineup_label: { type: 'text' },
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

    let lineupsByVariant = $derived(unpackLineups(data.lineupsByVariant));
    let selectedLineups = $derived(lineupsByVariant[selectedVariant] ?? []);
    let lineupHeatScales = $derived.by(() =>
        buildPresetHeatScales(selectedLineups, 'lineup')
    );
    let netTintLimit = $derived(tintLimit(selectedLineups.map((lineup) => lineup?.net_pm)));
    let hasAnyVariantLineups = $derived(
        variantOptions.some((option) => (lineupsByVariant[option.value] ?? []).length > 0)
    );

    let currentSizeLabel = $derived(
        sizeOptions.find((option) => option.value === data.lineupSize)?.label ?? `${data.lineupSize}-Man`
    );

    let selectedVariantLabel = $derived(
        variantOptions.find((option) => option.value === selectedVariant)?.label ?? selectedVariant.toUpperCase()
    );

    let minPossessionOptions = $derived.by(() => {
        const base = data.minPoss ?? 100;
        const values = new Set([base, 100, 200, 500, 1000, 2000].filter((value) => value >= base));
        return [...values].sort((left, right) => left - right);
    });
    let effectiveMinimumPossessions = $derived(selectedMinimumPossessions ?? data.minPoss ?? 100);

    let teamOptions = $derived.by(() => {
        const teams = new Set();
        for (const row of selectedLineups) {
            if (row.team_name && row.team_name !== TEAM_PENDING_LABEL) {
                teams.add(row.team_name);
            }
        }

        return [...teams].sort((left, right) => teamAbbr(left).localeCompare(teamAbbr(right)));
    });

    let filteredLineups = $derived.by(() => {
        const query = searchQuery.trim().toLowerCase();

        return selectedLineups.filter((row) => {
            if (numericValue(row?.possessions) < effectiveMinimumPossessions) return false;
            if (teamFilter !== 'all' && row?.team_name !== teamFilter) return false;
            if (!query) return true;

            return lineupSearchText(row).includes(query);
        });
    });

    let sortedLineups = $derived.by(() =>
        getSortedRows(filteredLineups, {
            sortColumn,
            sortDirection,
            sortConfigs
        })
    );

    let totalPages = $derived(Math.max(1, Math.ceil(sortedLineups.length / pageSize)));
    let pageStart = $derived(sortedLineups.length === 0 ? 0 : (page - 1) * pageSize + 1);
    let pageRows = $derived(sortedLineups.slice((page - 1) * pageSize, page * pageSize));
    let visiblePageTokens = $derived(getVisiblePageTokens(page, totalPages));
    let bestNetLineup = $derived(maxBy(filteredLineups, (row) => numericValue(row?.net_pm)));
    let bestOffLineup = $derived(maxBy(filteredLineups, (row) => numericValue(row?.off_pm)));
    let bestDefLineup = $derived(maxBy(filteredLineups, (row) => numericValue(row?.def_pm)));
    let summaryCards = $derived(buildSummaryCards());
    let sizeDistribution = $derived(buildSizeDistribution());
    let distributionGradient = $derived(buildDistributionGradient(sizeDistribution));
    // The donut spans every size tab, so its center is the sum of the legend below it.
    let distributionTotal = $derived(sizeDistribution.reduce((sum, item) => sum + item.count, 0));
    let teamLeaders = $derived(buildTeamLeaders(filteredLineups));
    let teamLeaderMax = $derived(Math.max(...teamLeaders.map((leader) => Math.max(0, leader.avgNet)), 1));

    $effect(() => {
        if (!variantOptions.some((option) => option.value === selectedVariant)) {
            selectedVariant = data.defaultVariant ?? 'pi';
        }

        const minimum = data.minPoss ?? 100;
        if (
            selectedMinimumPossessions !== null &&
            (selectedMinimumPossessions < minimum || !minPossessionOptions.includes(selectedMinimumPossessions))
        ) {
            selectedMinimumPossessions = null;
        }
    });

    $effect(() => {
        if (teamFilter !== 'all' && !teamOptions.includes(teamFilter)) {
            teamFilter = 'all';
        }
    });

    $effect(() => {
        if (page > totalPages) {
            page = totalPages;
        }
    });

    $effect(() => {
        if (!tableColumns.some((column) => column.key === sortColumn)) {
            sortColumn = 'net_pm';
            sortDirection = 'desc';
        }
    });

    $effect(() => {
        selectedVariant;
        sortColumn;
        sortDirection;
        page;
        pageSize;
        searchQuery;
        teamFilter;
        effectiveMinimumPossessions;
        tableColumns.length;
        pageRows.length;
        lineupsTableRoot;
        lineupsBodyScroller;
        lineupsBodyTable;
        lineupsSourceHead;
        lineupsHeaderScroller;
        lineupsHeaderTable;

        return setupWideStickyTable({
            root: lineupsTableRoot,
            bodyScroller: lineupsBodyScroller,
            bodyTable: lineupsBodyTable,
            sourceHead: lineupsSourceHead,
            headerScroller: lineupsHeaderScroller,
            headerTable: lineupsHeaderTable,
            wheelTarget: lineupsHeaderScroller
        });
    });

    function numericValue(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function maxBy(rows, accessor) {
        return rows.reduce((best, row) => {
            if (!best) return row;
            return accessor(row) > accessor(best) ? row : best;
        }, null);
    }

    function average(values) {
        const finite = values.filter((value) => Number.isFinite(value));
        if (finite.length === 0) return 0;
        return finite.reduce((sum, value) => sum + value, 0) / finite.length;
    }

    function sizeHref(size) {
        return `/lineups?size=${size}`;
    }

    function selectSize(size) {
        if (size === data.lineupSize) return;
        goto(sizeHref(size), { keepFocus: true });
    }

    // Start loading a size on hover or focus, so the click usually finds its rows already here.
    function preloadSize(size) {
        if (size === data.lineupSize) return;
        preloadData(sizeHref(size)).catch(() => {});
    }

    function setVariant(value) {
        selectedVariant = value;
        sortColumn = 'net_pm';
        sortDirection = 'desc';
        page = 1;
    }

    function setSearch(value) {
        searchQuery = value;
        page = 1;
    }

    function setTeamFilter(value) {
        teamFilter = value;
        page = 1;
    }

    function setMinimumPossessions(value) {
        const parsed = Number.parseInt(value, 10);
        selectedMinimumPossessions = Number.isFinite(parsed) ? parsed : null;
        page = 1;
    }

    function setPageSize(value) {
        const parsed = Number.parseInt(value, 10);
        pageSize = Number.isFinite(parsed) ? parsed : 20;
        page = 1;
    }

    function gotoPage(nextPage) {
        page = Math.min(Math.max(1, nextPage), totalPages);
    }

    function toggleSort(column) {
        if (!sortConfigs[column]) return;

        ({ sortColumn, sortDirection } = getNextSortState({
            sortColumn,
            sortDirection,
            column,
            defaultDirection: sortConfigs[column]?.type === 'text' ? 'asc' : 'desc'
        }));
        page = 1;
    }

    function metricToneClass(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
            return '';
        }

        return parsed >= 0 ? 'pos' : 'neg';
    }

    // pos/neg drive the Shiny view's heat cells; the modern view keeps numbers neutral and tints
    // only Net +/-, the column the table ranks by.
    function cellStyle(column, value) {
        const shinyHeat = getMetricHeatVariables(column.key, value, lineupHeatScales);
        return column.key === 'net_pm' ? `${shinyHeat} ${divergingTint(value, netTintLimit)}` : shinyHeat;
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

    const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

    // "Jaren Jackson Jr." -> "Jackson Jr."; "Shai Gilgeous-Alexander" -> "Gilgeous-Alexander".
    function lastName(name) {
        const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '—';
        if (parts.length === 1) return parts[0];
        const hasSuffix = parts.length > 2 && NAME_SUFFIXES.has(parts.at(-1).toLowerCase());
        return parts.slice(hasSuffix ? -2 : -1).join(' ');
    }

    // Last names, except teammates who share one keep their full names.
    function lineupShortNames(players) {
        const lasts = players.map((player) => lastName(player?.name));
        return players.map((player, index) =>
            lasts.filter((last) => last === lasts[index]).length > 1 ? (player?.name ?? lasts[index]) : lasts[index]
        );
    }

    function lineupSearchText(row) {
        return [
            row?.team_name,
            row?.team_name ? teamAbbr(row.team_name) : '',
            row?.lineup_label,
            ...PLAYER_KEYS.map((key) => row?.[key])
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
    }

    function lineupCaption(row, maxPlayers = data.lineupSize ?? 5) {
        if (!row?.players?.length) return 'No lineup selected';
        return lineupShortNames(row.players.slice(0, maxPlayers)).join(' · ');
    }

    function lineupFullNames(row, maxPlayers = data.lineupSize ?? 5) {
        if (!row?.players?.length) return 'No lineup selected';
        return row.players
            .slice(0, maxPlayers)
            .map((player) => player?.name)
            .filter(Boolean)
            .join(' · ');
    }

    function lineupDetail(row) {
        if (!row) return 'No lineup selected';
        return [row.team_name ? teamAbbr(row.team_name) : '', lineupCaption(row)].filter(Boolean).join(' · ');
    }

    function buildSummaryCards() {
        return [
            {
                title: `Best ${currentSizeLabel} Lineup`,
                row: bestNetLineup,
                value: formatSignedMetric(bestNetLineup?.net_pm),
                detail: lineupDetail(bestNetLineup),
                hint: 'Best visible lineup by Net +/-'
            },
            {
                title: 'Best Offensive Lineup',
                row: bestOffLineup,
                value: formatSignedMetric(bestOffLineup?.off_pm),
                detail: lineupDetail(bestOffLineup),
                hint: 'Best visible lineup by Offensive +/-'
            },
            {
                title: 'Best Defensive Lineup',
                row: bestDefLineup,
                value: formatSignedMetric(bestDefLineup?.def_pm),
                detail: lineupDetail(bestDefLineup),
                hint: 'Best visible lineup by Defensive +/-'
            },
            {
                title: 'Lineups Tracked',
                value: formatFixed(filteredLineups.length, 0),
                detail: `${currentSizeLabel} lineups`
            }
        ];
    }

    function sizeColor(size) {
        if (size === 5) return 'var(--accent)';
        if (size === 4) return 'var(--accent-hover)';
        if (size === 3) return 'color-mix(in srgb, var(--accent) 62%, var(--negative))';
        return 'color-mix(in srgb, var(--accent) 58%, var(--positive))';
    }

    function buildSizeDistribution() {
        const summaries = Array.isArray(data.lineupSizeSummaries) && data.lineupSizeSummaries.length > 0
            ? data.lineupSizeSummaries
            : sizeOptions.map((option) => ({
                lineupSize: option.value,
                label: option.label,
                minPoss: data.minPoss ?? 100,
                piCount: option.value === data.lineupSize ? lineupsByVariant.pi.length : 0,
                npiCount: option.value === data.lineupSize ? lineupsByVariant.npi.length : 0
            }));

        const counts = summaries.map((summary) => ({
            ...summary,
            count: selectedVariant === 'pi' ? summary.piCount : summary.npiCount,
            color: sizeColor(summary.lineupSize)
        }));
        const total = Math.max(1, counts.reduce((sum, summary) => sum + summary.count, 0));

        return counts.map((summary) => ({
            ...summary,
            percent: (summary.count / total) * 100,
            active: summary.lineupSize === data.lineupSize
        }));
    }

    function buildDistributionGradient(items) {
        const visible = items.filter((item) => item.count > 0);
        if (visible.length === 0) {
            return 'conic-gradient(var(--border-subtle) 0 100%)';
        }

        let cursor = 0;
        return `conic-gradient(${visible.map((item) => {
            const start = cursor;
            cursor += item.percent;
            return `${item.color} ${start}% ${cursor}%`;
        }).join(', ')})`;
    }

    function buildTeamLeaders(rows) {
        const grouped = new Map();

        for (const row of rows) {
            if (!row?.team_name || row.team_name === TEAM_PENDING_LABEL) continue;

            const key = row.team_name;
            const entry = grouped.get(key) ?? {
                teamName: row.team_name,
                tmId: row.tm_id,
                rows: []
            };
            entry.rows.push(row);
            if (!entry.tmId && row.tm_id) {
                entry.tmId = row.tm_id;
            }
            grouped.set(key, entry);
        }

        return [...grouped.values()]
            .map((entry) => ({
                ...entry,
                avgNet: average(entry.rows.map((row) => numericValue(row?.net_pm))),
                count: entry.rows.length
            }))
            .sort((left, right) => right.avgNet - left.avgNet)
            .slice(0, MAX_RAIL_TEAMS);
    }

    function leaderBarWidth(value) {
        if (teamLeaderMax <= 0) return 0;
        return Math.max(5, Math.min(100, (Math.max(0, value) / teamLeaderMax) * 100));
    }

    function formatShare(percent) {
        if (!Number.isFinite(percent)) return '0%';
        return `${percent.toFixed(percent >= 10 ? 0 : 1)}%`;
    }

    function getVisiblePageTokens(currentPage, lastPage) {
        if (lastPage <= 5) {
            return Array.from({ length: lastPage }, (_, index) => index + 1);
        }

        const pages = [1];
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(lastPage - 1, currentPage + 1);

        if (start > 2) {
            pages.push('ellipsis-start');
        }

        for (let value = start; value <= end; value += 1) {
            pages.push(value);
        }

        if (end < lastPage - 1) {
            pages.push('ellipsis-end');
        }

        pages.push(lastPage);
        return pages;
    }

    function exportVisibleLineups() {
        exportCsvRows({
            rows: sortedLineups,
            columns: getLineupsCsvColumns(data.lineupSize ?? 5),
            filename: `lineups-${currentSizeLabel.toLowerCase().replace(/\s+/g, '')}-${selectedVariant}.csv`
        });
    }
</script>

{#snippet lineupsSemanticHeaderRow()}
    <tr class="table-semantic-row sr-only">
        {#each tableColumns as column (column.key)}
            <th
                id={`lineups-column-${column.key}`}
                scope="col"
                aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
            >{column.label}</th>
        {/each}
    </tr>
{/snippet}

{#snippet lineupsHeaderRow()}
    <tr class="table-sizing-row">
        {#each tableColumns as column (column.key)}
            <th
                class="{column.alignClass} {sortColumn === column.key ? 'active' : ''}"
                aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
            >
                {#if column.sortable === false}
                    {column.label}
                {:else}
                    <button type="button" onclick={() => toggleSort(column.key)}>
                        <span>{column.label}</span>
                        <span class="sort-indicator">{getSortGlyph(sortColumn, sortDirection, column.key)}</span>
                    </button>
                {/if}
            </th>
        {/each}
    </tr>
{/snippet}

<svelte:head>
    <title>Lineup Projections — DARKO DPM</title>
</svelte:head>

<div class="lineups-page" data-shiny-page>
    <div class="container lineups-container">
        <PageHeader id="lineups-title" title="Lineup Projections" lede="Lineup Plus/Minus in Relation to League Average">
            <p class="page-note">
                Table limited to lineups with more than {data.minPoss ?? 100} possessions.
                {#if data.computedOn}Lineup ratings last computed {formatAsOfDate(data.computedOn)}.{/if}
            </p>
        </PageHeader>

        {#if !hasAnyVariantLineups}
            <div class="empty-state">
                <p>Lineup data is not yet available.</p>
                <p class="empty-detail">Rows will appear here once lineup ratings are published to Supabase.</p>
            </div>
        {:else}
            <div class="lineups-dashboard">
                <main class="lineups-main">
                    <section class="stat-strip" aria-label="Lineup summary">
                        {#each summaryCards as card (card.title)}
                            <StatTile
                                label={card.title}
                                value={card.value}
                                detail={card.detail}
                                hint={card.hint}
                                logo={card.row?.tm_id ? `/api/img/logo/${card.row.tm_id}` : ''}
                            />
                        {/each}
                    </section>

                    <section class="lineups-table-panel" data-shiny-surface="panel" aria-label="{selectedVariantLabel} {currentSizeLabel} lineups">
                        <div class="lineups-controls" data-shiny-surface="well">
                            <fieldset class="control-group">
                                <legend>Lineup Size</legend>
                                <div class="segmented-control size-segment">
                                    {#each sizeOptions as option (option.value)}
                                        <button
                                            type="button"
                                            class:active={data.lineupSize === option.value}
                                            onclick={() => selectSize(option.value)}
                                            onpointerenter={() => preloadSize(option.value)}
                                            onfocus={() => preloadSize(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    {/each}
                                </div>
                            </fieldset>

                            <fieldset class="control-group">
                                <legend>Variant <MetricTooltip text="PI includes player interaction effects; NPI excludes them." label="About the variants"><span class="info-dot" aria-hidden="true">i</span></MetricTooltip></legend>
                                <div class="segmented-control variant-segment">
                                    {#each variantOptions as option (option.value)}
                                        <button
                                            type="button"
                                            class:active={selectedVariant === option.value}
                                            onclick={() => setVariant(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    {/each}
                                </div>
                            </fieldset>

                            <label class="control-field search-field" for="lineups-search">
                                <span class="sr-only">Search teams or players</span>
                                <input
                                    id="lineups-search"
                                    type="text"
                                    value={searchQuery}
                                    oninput={(event) => setSearch(event.currentTarget.value)}
                                    placeholder="Search teams or players..."
                                />
                            </label>

                            <label class="control-field select-field" for="minimum-possessions">
                                <span>Min Possessions</span>
                                <select
                                    id="minimum-possessions"
                                    value={effectiveMinimumPossessions}
                                    onchange={(event) => setMinimumPossessions(event.currentTarget.value)}
                                >
                                    {#each minPossessionOptions as option (option)}
                                        <option value={option}>{option}+</option>
                                    {/each}
                                </select>
                            </label>

                            <label class="control-field select-field" for="team-filter">
                                <span>Team</span>
                                <select
                                    id="team-filter"
                                    value={teamFilter}
                                    onchange={(event) => setTeamFilter(event.currentTarget.value)}
                                >
                                    <option value="all">All Teams</option>
                                    {#each teamOptions as team (team)}
                                        <option value={team}>{teamAbbr(team)}</option>
                                    {/each}
                                </select>
                            </label>

                            <button
                                class="btn export-btn"
                                type="button"
                                onclick={exportVisibleLineups}
                                disabled={sortedLineups.length === 0}
                            >
                                Download CSV
                            </button>
                        </div>

                        <div
                            class="table-wrapper table-shell"
                            data-shiny-table
                            data-shiny-table-variant="lineups"
                            bind:this={lineupsTableRoot}
                        >
                            <div class="sticky-header-shell">
                                <div class="table-header-scroll" bind:this={lineupsHeaderScroller}>
                                    <table class="sticky-header-table" role="presentation" bind:this={lineupsHeaderTable}>
                                        <thead>
                                            {@render lineupsHeaderRow()}
                                        </thead>
                                    </table>
                                </div>
                            </div>

                            <div class="table-body-scroll" bind:this={lineupsBodyScroller}>
                                <table bind:this={lineupsBodyTable}>
                                    <!-- The sizing row comes first: a fixed-layout table takes its column widths
                                         from its first row, and the screen-reader row has none. -->
                                    <thead class="table-sizing-head" bind:this={lineupsSourceHead}>
                                        {@render lineupsHeaderRow()}
                                        {@render lineupsSemanticHeaderRow()}
                                    </thead>
                                    <tbody>
                                        {#if pageRows.length === 0}
                                            <tr>
                                                <td class="empty-row" colspan={tableColumns.length}>No matching lineups.</td>
                                            </tr>
                                        {:else}
                                            {#each pageRows as lineup, index (lineup.row_key)}
                                                <tr>
                                                    {#each tableColumns as column (column.key)}
                                                        <td
                                                            headers={`lineups-column-${column.key}`}
                                                            class="{column.alignClass} {isMetricColumn(column.key) ? metricToneClass(lineup[column.key]) : ''} {column.key === 'net_pm' ? 'tint-cell' : ''}"
                                                            style={cellStyle(column, lineup[column.key])}
                                                        >
                                                            {#if column.key === '_rank'}
                                                                {pageStart + index}
                                                            {:else if column.key === 'lineup_label'}
                                                                {@const shortNames = lineupShortNames(lineup.players ?? [])}
                                                                <div class="lineup-player-links" title={lineupFullNames(lineup)}>
                                                                    {#each lineup.players ?? [] as player, playerIndex (player?.id ?? `${lineup.row_key}-${playerIndex}`)}
                                                                        {#if playerIndex > 0}<span class="lineup-separator" aria-hidden="true">{isShinyView ? '|' : '·'}</span>{/if}
                                                                        {#if player?.id}
                                                                            <a href="/player/{player.id}">{isShinyView ? player.name : shortNames[playerIndex]}</a>
                                                                        {:else}
                                                                            <span>{(isShinyView ? player?.name : shortNames[playerIndex]) ?? '—'}</span>
                                                                        {/if}
                                                                    {/each}
                                                                </div>
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
                                                                        <span>{isShinyView ? lineup.team_name : teamAbbr(lineup.team_name)}</span>
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
                        </div>

                        <div class="table-footer">
                            <p>
                                Showing {selectedVariantLabel} {currentSizeLabel} lineup ratings
                                ({filteredLineups.length === selectedLineups.length
                                    ? `${selectedLineups.length} lineups`
                                    : `${filteredLineups.length} of ${selectedLineups.length} lineups`})
                                <MetricTooltip text={`Minimum ${effectiveMinimumPossessions}+ possessions`} label="About the possession minimum"><span class="info-dot" aria-hidden="true">i</span></MetricTooltip>
                            </p>

                            <div class="pagination-controls" aria-label="Lineup pagination">
                                <label>
                                    Rows per page:
                                    <select
                                        value={pageSize}
                                        onchange={(event) => setPageSize(event.currentTarget.value)}
                                    >
                                        {#each pageSizeOptions as option (option)}
                                            <option value={option}>{option}</option>
                                        {/each}
                                    </select>
                                </label>
                                <button type="button" onclick={() => gotoPage(page - 1)} disabled={page <= 1}>‹</button>
                                {#each visiblePageTokens as token (token)}
                                    {#if typeof token === 'number'}
                                        <button
                                            type="button"
                                            class:active={page === token}
                                            onclick={() => gotoPage(token)}
                                            aria-current={page === token ? 'page' : undefined}
                                        >
                                            {token}
                                        </button>
                                    {:else}
                                        <span class="page-ellipsis">...</span>
                                    {/if}
                                {/each}
                                <button type="button" onclick={() => gotoPage(page + 1)} disabled={page >= totalPages}>›</button>
                            </div>
                        </div>
                    </section>
                </main>

                <aside class="lineups-rail" aria-label="Lineup insights">
                    <section class="insight-card" data-shiny-surface="panel">
                        <div class="insight-card-header">
                            <h2>Lineup Distribution by Size</h2>
                            <MetricTooltip text={`${selectedVariantLabel} lineups across all size tabs`} label="About the size distribution"><span class="info-dot" aria-hidden="true">i</span></MetricTooltip>
                        </div>
                        <div class="distribution-layout">
                            <div class="donut-chart" style={`background: ${distributionGradient};`}>
                                <div>
                                    <strong>{formatFixed(distributionTotal, 0)}</strong>
                                    <span>Total<br />Lineups</span>
                                </div>
                            </div>
                            <div class="distribution-legend">
                                {#each sizeDistribution as item (item.lineupSize)}
                                    <div class:active={item.active}>
                                        <span class="legend-swatch" style={`background: ${item.color};`}></span>
                                        <span>{item.label}</span>
                                        <strong>{formatFixed(item.count, 0)} ({formatShare(item.percent)})</strong>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    </section>

                    <section class="insight-card" data-shiny-surface="panel">
                        <div class="insight-card-header">
                            <h2>Top Net +/- by Team ({currentSizeLabel})</h2>
                            <MetricTooltip text="Average lineup net rating by team for the current filters" label="About the team leaders"><span class="info-dot" aria-hidden="true">i</span></MetricTooltip>
                        </div>
                        {#if teamLeaders.length === 0}
                            <p class="rail-empty">No teams match the current filters.</p>
                        {:else}
                            <div class="team-leader-list">
                                {#each teamLeaders as leader, index (leader.teamName)}
                                    <a href="/team/{encodeURIComponent(leader.teamName)}" class="team-leader-row">
                                        <span class="leader-rank">{index + 1}</span>
                                        {#if leader.tmId}
                                            <img src="/api/img/logo/{leader.tmId}" alt="" class="rail-team-logo" loading="lazy" />
                                        {/if}
                                        <span>{teamAbbr(leader.teamName)}</span>
                                        <span class="leader-bar"><span style={`width: ${leaderBarWidth(leader.avgNet)}%;`}></span></span>
                                        <strong>{formatSignedMetric(leader.avgNet)}</strong>
                                    </a>
                                {/each}
                            </div>
                        {/if}
                        <a class="rail-link" href="/standings">View all teams →</a>
                    </section>

                    <section class="insight-card snapshot-card" data-shiny-surface="panel">
                        <div class="insight-card-header">
                            <h2>Best {currentSizeLabel} Lineup Snapshot</h2>
                            <MetricTooltip text="Best visible lineup by Net +/-" label="About the lineup snapshot"><span class="info-dot" aria-hidden="true">i</span></MetricTooltip>
                        </div>
                        {#if bestNetLineup}
                            <div class="snapshot-layout">
                                <div>
                                    <strong>{formatSignedMetric(bestNetLineup.net_pm)}</strong>
                                    <span>Net +/-</span>
                                </div>
                                {#if bestNetLineup.tm_id}
                                    <img src="/api/img/logo/{bestNetLineup.tm_id}" alt="" class="snapshot-logo" loading="lazy" />
                                {/if}
                            </div>
                            <p>{bestNetLineup.team_name}</p>
                            <small>{lineupFullNames(bestNetLineup)}</small>
                        {:else}
                            <p class="rail-empty">No lineup snapshot is available.</p>
                        {/if}
                    </section>
                </aside>
            </div>
        {/if}
    </div>
</div>

<style>
    .lineups-page {
        min-height: calc(100dvh - var(--nav-sticky-offset));
        padding: 0 0 34px;
        background: var(--bg);
    }

    .lineups-container {
        max-width: 1880px;
    }

    .lineups-dashboard {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 370px;
        align-items: start;
        gap: 18px;
    }

    .lineups-main {
        display: grid;
        gap: 12px;
        min-width: 0;
    }

    .lineups-main > .stat-strip {
        margin-bottom: 0;
    }

    .lineups-table-panel {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: var(--bg-surface);
        box-shadow: 0 12px 32px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 14px;
        min-width: 0;
    }

    /* The controls wrap rather than overflow: at 1440px the main column is too narrow for all six
       in one row, and the search box takes whatever width is left. */
    .lineups-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        gap: 12px;
        margin-bottom: 14px;
    }

    .lineups-controls > .control-group:first-child {
        flex: 0 0 250px;
    }

    .lineups-controls > .control-group:nth-child(2) {
        flex: 0 0 128px;
    }

    .lineups-controls > .search-field {
        flex: 1 1 220px;
        min-width: 0;
    }

    .lineups-controls > .select-field {
        flex: 0 0 150px;
    }

    .control-group {
        margin: 0;
        padding: 0;
        border: none;
        min-width: 0;
    }

    .control-group legend,
    .control-field > span {
        display: block;
        margin-bottom: 7px;
        color: var(--text-muted);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.08em;
        line-height: 1;
        text-transform: uppercase;
    }

    .segmented-control {
        display: grid;
        align-items: center;
        gap: 0;
        height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        overflow: hidden;
    }

    .size-segment {
        grid-template-columns: repeat(4, 1fr);
    }

    .variant-segment {
        grid-template-columns: repeat(2, 1fr);
    }

    .segmented-control button {
        height: 100%;
        border: none;
        border-right: 1px solid var(--border-subtle);
        background: transparent;
        color: var(--text);
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 12px;
        font-weight: 800;
        transition: background 0.16s ease, color 0.16s ease;
    }

    .segmented-control button:last-child {
        border-right: none;
    }

    .segmented-control button:hover {
        background: var(--bg-hover);
    }

    .segmented-control button.active {
        background: var(--accent);
        color: var(--bg);
    }

    .control-field {
        min-width: 0;
    }

    .search-field {
        position: relative;
    }

    .search-field::before {
        content: '';
        position: absolute;
        left: 13px;
        bottom: 12px;
        width: 11px;
        height: 11px;
        border: 2px solid var(--graphic-muted);
        border-radius: 50%;
        pointer-events: none;
    }

    .search-field::after {
        content: '';
        position: absolute;
        left: 23px;
        bottom: 10px;
        width: 7px;
        height: 2px;
        border-radius: 999px;
        background: var(--graphic-muted);
        transform: rotate(45deg);
        pointer-events: none;
    }

    .control-field input,
    .control-field select,
    .pagination-controls select {
        width: 100%;
        height: 38px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text);
        font-family: var(--font-sans);
        font-size: 13px;
        outline: none;
    }

    .control-field input {
        padding: 0 14px 0 38px;
    }

    .control-field select,
    .pagination-controls select {
        padding: 0 34px 0 12px;
    }

    .control-field input:focus,
    .control-field select:focus,
    .pagination-controls select:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
    }

    .export-btn {
        height: 38px;
        white-space: nowrap;
    }

    .table-wrapper {
        --wide-sticky-header-height: 42px;
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
    }

    table {
        width: 100%;
        min-width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        font-size: 13px;
    }

    th {
        height: 42px;
        background: var(--bg);
        border-bottom: 1px solid var(--border);
        color: var(--text-secondary);
        padding: 0 11px;
        text-align: left;
        white-space: nowrap;
    }

    th button {
        width: 100%;
        height: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: inherit;
        gap: 5px;
        border: none;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-family: var(--font-sans);
        font-size: 11px;
        font-weight: 850;
        letter-spacing: 0.04em;
        padding: 0;
        text-align: inherit;
        text-transform: uppercase;
    }

    th:hover {
        background: var(--bg-hover);
    }

    th.active {
        color: var(--text);
    }

    .sort-indicator {
        color: var(--accent);
        font-size: 11px;
        opacity: 0.8;
    }

    td {
        height: 41px;
        border-bottom: 1px solid var(--border-subtle);
        background: var(--bg-surface);
        color: var(--text);
        padding: 7px 11px;
        vertical-align: middle;
        white-space: nowrap;
    }

    tbody tr:last-child td {
        border-bottom: none;
    }

    tbody tr:hover td {
        background: var(--bg-elevated);
    }

    .rank-col {
        width: 42px;
        text-align: right;
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-size: 13px;
    }

    .team-col {
        width: 90px;
    }

    .lineup-col {
        min-width: 16rem;
    }

    .lineup-player-links {
        display: flex;
        flex-wrap: wrap;
        gap: 0 5px;
        font-weight: 600;
    }

    /* :where() keeps these below the Shiny view's link colours. */
    .lineup-player-links :where(a) {
        color: var(--text);
    }

    .lineup-player-links :where(a:hover) {
        color: var(--accent);
    }

    .lineup-separator {
        color: var(--text-muted);
    }

    .num {
        width: 84px;
        text-align: right;
        font-family: var(--font-mono);
        font-size: 13px;
        font-weight: 500;
    }

    td.tint-cell {
        font-weight: var(--figure-weight-strong);
    }

    th.num button {
        justify-content: flex-end;
    }

    .team-cell-link {
        display: inline-flex;
        align-items: center;
        color: var(--text);
        min-width: 0;
    }

    .team-cell-link {
        gap: 6px;
        font-weight: 850;
    }

    .team-cell-link:hover {
        color: var(--accent);
    }

    .team-logo {
        width: 22px;
        height: 22px;
        object-fit: contain;
        flex: 0 0 auto;
    }

    .team-placeholder {
        color: var(--text-muted);
        font-style: italic;
    }

    .empty-row {
        padding: 30px 16px;
        text-align: center;
        color: var(--text-muted);
        font-family: var(--font-sans);
        font-size: 13px;
    }

    .table-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 13px 0 0;
    }

    .table-footer p {
        color: var(--text-secondary);
        font-size: 13px;
    }

    .pagination-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    .pagination-controls label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        white-space: nowrap;
    }

    .pagination-controls select {
        width: 66px;
        height: 34px;
    }

    .pagination-controls button {
        min-width: 34px;
        height: 34px;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        background: var(--bg);
        color: var(--text);
        cursor: pointer;
        font-family: var(--font-mono);
        font-weight: var(--figure-weight-strong);
    }

    .pagination-controls button:hover:not(:disabled),
    .pagination-controls button.active {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--bg);
    }

    .pagination-controls button:disabled {
        color: var(--text-muted);
        cursor: not-allowed;
        opacity: 0.55;
    }

    .page-ellipsis {
        color: var(--text-muted);
        font-family: var(--font-mono);
        padding: 0 2px;
    }

    .lineups-rail {
        display: grid;
        gap: 14px;
        min-width: 0;
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
        margin-bottom: 18px;
    }

    .insight-card h2 {
        font-size: 16px;
        line-height: 1.15;
        font-weight: 850;
        letter-spacing: 0;
    }

    .distribution-layout {
        display: grid;
        grid-template-columns: 132px minmax(0, 1fr);
        align-items: center;
        gap: 18px;
    }

    .donut-chart {
        width: 124px;
        height: 124px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 10%, transparent);
    }

    .donut-chart > div {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--bg-elevated) 88%, var(--bg));
        text-align: center;
    }

    .donut-chart strong {
        color: var(--text);
        font-family: var(--font-display);
        font-size: 30px;
        font-weight: 800;
        font-stretch: 110%;
        font-variant-numeric: tabular-nums;
        line-height: 1;
    }

    .donut-chart span {
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.15;
        margin-top: -6px;
    }

    .distribution-legend {
        display: grid;
        gap: 12px;
    }

    .distribution-legend div {
        display: grid;
        grid-template-columns: 10px 54px minmax(0, 1fr);
        align-items: center;
        gap: 8px;
        color: var(--text-secondary);
        font-size: 13px;
    }

    .distribution-legend div.active {
        color: var(--text);
        font-weight: 800;
    }

    .legend-swatch {
        width: 10px;
        height: 10px;
        border-radius: 3px;
    }

    .distribution-legend strong {
        color: var(--text);
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: var(--figure-weight-strong);
        text-align: right;
    }

    .team-leader-list {
        display: grid;
        gap: 13px;
        border-bottom: 1px solid var(--border);
        padding-bottom: 16px;
    }

    .team-leader-row {
        display: grid;
        grid-template-columns: 22px 30px 42px minmax(0, 1fr) 52px;
        align-items: center;
        gap: 9px;
        color: var(--text);
    }

    .team-leader-row:hover {
        color: var(--accent);
    }

    .leader-rank {
        color: var(--text-secondary);
        font-family: var(--font-mono);
        font-weight: var(--figure-weight-strong);
        text-align: right;
    }

    .rail-team-logo {
        width: 26px;
        height: 26px;
        object-fit: contain;
    }

    .leader-bar {
        height: 7px;
        border-radius: 999px;
        background: var(--bg-surface);
        overflow: hidden;
    }

    .leader-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--accent);
    }

    .team-leader-row strong {
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: 14px;
        font-weight: var(--figure-weight-strong);
        text-align: right;
    }

    .rail-link {
        display: inline-flex;
        margin-top: 15px;
        color: var(--accent);
        font-size: 13px;
        font-weight: 850;
    }

    .rail-empty {
        color: var(--text-secondary);
        font-size: 13px;
    }

    .snapshot-layout {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        margin-bottom: 10px;
    }

    .snapshot-layout strong {
        color: var(--accent);
        font-family: var(--font-display);
        font-size: 30px;
        font-weight: 800;
        font-stretch: 110%;
        font-variant-numeric: tabular-nums;
        line-height: 1;
    }

    .snapshot-layout span {
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 800;
        margin-left: 6px;
        text-transform: uppercase;
    }

    .snapshot-logo {
        width: 76px;
        height: 76px;
        object-fit: contain;
    }

    .snapshot-card p {
        color: var(--text);
        font-size: 14px;
        font-weight: 850;
        margin-bottom: 8px;
    }

    .snapshot-card small {
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.5;
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

    /* Touch/mobile scroll mode */
    @media (hover: none) and (pointer: coarse) and (max-width: 1024px),
        (any-hover: none) and (any-pointer: coarse) and (max-width: 1024px) {
        .table-body-scroll {
            -webkit-overflow-scrolling: touch;
        }

        table {
            width: max-content;
            min-width: 100%;
            table-layout: auto;
        }

        .team-col,
        .num {
            width: auto;
            max-width: none;
        }
    }
    /* End touch/mobile scroll mode */

    /* Below 1600px the side panels move under the table, which needs the width for its
       one-line lineup names. */
    @media (max-width: 1600px) {
        .lineups-dashboard {
            grid-template-columns: 1fr;
        }

        .lineups-rail {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }

    @media (max-width: 1160px) {
        .export-btn {
            width: 100%;
        }

        .lineups-rail {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 820px) {
        .lineups-controls > * {
            flex: 1 1 100%;
        }

        .distribution-layout {
            grid-template-columns: 1fr;
            justify-items: start;
        }

        .table-footer,
        .pagination-controls {
            align-items: flex-start;
            flex-direction: column;
        }

        .pagination-controls {
            width: 100%;
        }
    }
</style>
