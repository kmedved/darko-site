<script>
    import { goto } from '$app/navigation';
    import { exportCsvRows, formatFixed, formatSignedMetric, getLineupsCsvColumns } from '$lib/utils/csvPresets.js';
    import { getSortedRows } from '$lib/utils/sortableTable.js';
    import { teamAbbr } from '$lib/utils/teamAbbreviations.js';

    /** @type {import('./$types').PageProps} */
    let { data } = $props();

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

    let PLAYER_KEYS = $derived(
        Array.from({ length: data.lineupSize ?? 5 }, (_, i) => `player_${i + 1}`)
    );

    let baseColumns = $derived.by(() => {
        const playerCount = data.lineupSize ?? 5;
        const playerCols = Array.from({ length: playerCount }, (_, i) => ({
            key: `player_${i + 1}`,
            label: `Player ${i + 1}`,
            alignClass: 'player-col',
            type: 'text',
            dataType: 'text',
            slotIndex: i,
            sortable: true
        }));

        return [
            { key: '_rank', label: '#', alignClass: 'rank-col', sortable: false },
            { key: 'team_name', label: 'Team', alignClass: 'team-col', type: 'text', dataType: 'text', sortable: true },
            ...playerCols,
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

    let selectedLineups = $derived(data.lineupsByVariant?.[selectedVariant] ?? []);
    let hasAnyVariantLineups = $derived(
        variantOptions.some((option) => (data.lineupsByVariant?.[option.value] ?? []).length > 0)
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
    let activeSizeCount = $derived(
        sizeDistribution.find((item) => item.lineupSize === data.lineupSize)?.count ?? selectedLineups.length
    );
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

    function selectSize(size) {
        if (size === data.lineupSize) return;
        goto(`/lineups?size=${size}`, { keepFocus: true });
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

        if (sortColumn === column) {
            sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            page = 1;
            return;
        }

        sortColumn = column;
        sortDirection = sortConfigs[column]?.type === 'text' ? 'asc' : 'desc';
        page = 1;
    }

    function sortGlyph(column) {
        if (sortColumn !== column) {
            return '↕';
        }

        return sortDirection === 'asc' ? '↑' : '↓';
    }

    function metricToneClass(value) {
        const parsed = Number.parseFloat(value);
        if (!Number.isFinite(parsed)) {
            return '';
        }

        return parsed >= 0 ? 'pos' : 'neg';
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

    function abbrevName(name) {
        if (!name) return '—';
        const parts = name.trim().split(/\s+/);
        if (parts.length < 2) return name;
        return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
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
        return row.players
            .slice(0, maxPlayers)
            .map((player) => abbrevName(player?.name))
            .filter(Boolean)
            .join(' · ');
    }

    function lineupFullNames(row, maxPlayers = data.lineupSize ?? 5) {
        if (!row?.players?.length) return 'No lineup selected';
        return row.players
            .slice(0, maxPlayers)
            .map((player) => player?.name)
            .filter(Boolean)
            .join(' · ');
    }

    function buildSummaryCards() {
        return [
            {
                title: `Best ${currentSizeLabel} Lineup`,
                row: bestNetLineup,
                value: formatSignedMetric(bestNetLineup?.net_pm),
                caption: lineupCaption(bestNetLineup)
            },
            {
                title: 'Highest Net +/-',
                row: bestNetLineup,
                value: formatSignedMetric(bestNetLineup?.net_pm),
                caption: `${teamAbbr(bestNetLineup?.team_name)} · ${currentSizeLabel}`
            },
            {
                title: 'Best Offensive Lineup',
                row: bestOffLineup,
                value: formatSignedMetric(bestOffLineup?.off_pm),
                caption: `${teamAbbr(bestOffLineup?.team_name)} · Offensive +/-`
            },
            {
                title: 'Best Defensive Lineup',
                row: bestDefLineup,
                value: formatSignedMetric(bestDefLineup?.def_pm),
                caption: `${teamAbbr(bestDefLineup?.team_name)} · Defensive +/-`
            },
            {
                title: 'Lineups Tracked',
                value: formatFixed(filteredLineups.length, 0),
                caption: `${currentSizeLabel} lineups`,
                icon: 'tracked'
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
                piCount: option.value === data.lineupSize ? (data.lineupsByVariant?.pi?.length ?? 0) : 0,
                npiCount: option.value === data.lineupSize ? (data.lineupsByVariant?.npi?.length ?? 0) : 0
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

<svelte:head>
    <title>Lineup Projections — DARKO DPM</title>
</svelte:head>

<div class="lineups-page">
    <div class="container lineups-container">
        <section class="lineups-hero" aria-labelledby="lineups-title">
            <div class="lineups-title-block">
                <div class="lineups-icon" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div>
                    <h1 id="lineups-title">Lineup Projections</h1>
                    <p>Lineup Plus/Minus in Relation to League Average</p>
                    <p class="subtitle-note">Table limited to lineups with more than {data.minPoss ?? 100} possessions.</p>
                </div>
            </div>
        </section>

        {#if !hasAnyVariantLineups}
            <div class="empty-state">
                <p>Lineup data is not yet available.</p>
                <p class="empty-detail">Rows will appear here once lineup ratings are published to Supabase.</p>
            </div>
        {:else}
            <div class="lineups-dashboard">
                <main class="lineups-main">
                    <section class="summary-card-grid" aria-label="Lineup summary">
                        {#each summaryCards as card (card.title)}
                            <article class="summary-card">
                                {#if card.row?.tm_id}
                                    <img
                                        src="/api/img/logo/{card.row.tm_id}"
                                        alt=""
                                        class="summary-team-logo"
                                        loading="lazy"
                                    />
                                {:else}
                                    <div class="summary-icon {card.icon ?? 'lineup'}" aria-hidden="true">
                                        <span></span>
                                    </div>
                                {/if}
                                <div class="summary-copy">
                                    <p>{card.title} <span class="info-dot" title={card.caption}>i</span></p>
                                    <strong>{card.value}</strong>
                                    <small>{card.row?.team_name ? teamAbbr(card.row.team_name) : card.caption}</small>
                                    {#if card.row && card.title.startsWith('Best')}
                                        <em>{card.caption}</em>
                                    {/if}
                                </div>
                            </article>
                        {/each}
                    </section>

                    <section class="lineups-table-panel" aria-label="{selectedVariantLabel} {currentSizeLabel} lineups">
                        <div class="lineups-controls">
                            <fieldset class="control-group">
                                <legend>Lineup Size</legend>
                                <div class="segmented-control size-segment">
                                    {#each sizeOptions as option (option.value)}
                                        <button
                                            type="button"
                                            class:active={data.lineupSize === option.value}
                                            onclick={() => selectSize(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    {/each}
                                </div>
                            </fieldset>

                            <fieldset class="control-group">
                                <legend>Variant <span class="info-dot" title="PI includes player interaction effects; NPI excludes them.">i</span></legend>
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
                                class="page-action-btn export-btn"
                                type="button"
                                onclick={exportVisibleLineups}
                                disabled={sortedLineups.length === 0}
                            >
                                Download CSV
                            </button>
                        </div>

                        <div class="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        {#each tableColumns as column (column.key)}
                                            <th class="{column.alignClass} {sortColumn === column.key ? 'active' : ''}">
                                                {#if column.sortable === false}
                                                    {column.label}
                                                {:else}
                                                    <button type="button" onclick={() => toggleSort(column.key)}>
                                                        <span>{column.label}</span>
                                                        <span class="sort-indicator">{sortGlyph(column.key)}</span>
                                                    </button>
                                                {/if}
                                            </th>
                                        {/each}
                                    </tr>
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
                                                        class="{column.alignClass} {isMetricColumn(column.key) ? metricToneClass(lineup[column.key]) : ''}"
                                                    >
                                                        {#if column.key === '_rank'}
                                                            {pageStart + index}
                                                        {:else if column.slotIndex != null}
                                                            {@const p = lineup.players[column.slotIndex]}
                                                            {#if p?.id}
                                                                <a href="/player/{p.id}" class="player-cell-link">
                                                                    <img
                                                                        src="/api/img/headshot/{p.id}"
                                                                        alt=""
                                                                        class="player-headshot"
                                                                        loading="lazy"
                                                                    />
                                                                    <span>{abbrevName(p.name)}</span>
                                                                </a>
                                                            {:else}
                                                                <span>{abbrevName(p?.name)}</span>
                                                            {/if}
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
                                                                    <span>{teamAbbr(lineup.team_name)}</span>
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

                        <div class="table-footer">
                            <p>
                                Showing {selectedVariantLabel} {currentSizeLabel} lineup ratings
                                ({filteredLineups.length === selectedLineups.length
                                    ? `${selectedLineups.length} lineups`
                                    : `${filteredLineups.length} of ${selectedLineups.length} lineups`})
                                <span class="info-dot" title={`Minimum ${effectiveMinimumPossessions}+ possessions`}>i</span>
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
                    <section class="insight-card">
                        <div class="insight-card-header">
                            <h2>Lineup Distribution by Size</h2>
                            <span class="info-dot" title={`${selectedVariantLabel} lineups across all size tabs`}>i</span>
                        </div>
                        <div class="distribution-layout">
                            <div class="donut-chart" style={`background: ${distributionGradient};`}>
                                <div>
                                    <strong>{formatFixed(activeSizeCount, 0)}</strong>
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

                    <section class="insight-card">
                        <div class="insight-card-header">
                            <h2>Top Net +/- by Team ({currentSizeLabel})</h2>
                            <span class="info-dot" title="Average lineup net rating by team for the current filters">i</span>
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

                    <section class="insight-card snapshot-card">
                        <div class="insight-card-header">
                            <h2>Best {currentSizeLabel} Lineup Snapshot</h2>
                            <span class="info-dot" title="Best visible lineup by Net +/-">i</span>
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
        padding: 24px 0 34px;
        background:
            radial-gradient(circle at 92% 3%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
            var(--bg);
    }

    .lineups-container {
        max-width: 1880px;
        display: grid;
        gap: 18px;
    }

    .lineups-hero {
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

    .lineups-hero::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            repeating-radial-gradient(circle at 72% 6%, transparent 0 34px, color-mix(in srgb, var(--border-subtle) 65%, transparent) 35px 36px);
        opacity: 0.42;
        pointer-events: none;
    }

    .lineups-title-block {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 18px;
    }

    .lineups-title-block > div:last-child {
        flex: 1;
        min-width: 0;
    }

    .lineups-icon {
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

    .lineups-icon span {
        display: block;
        width: 7px;
        border-radius: 999px;
        background: var(--accent);
    }

    .lineups-icon span:nth-child(1) { height: 10px; opacity: 0.68; }
    .lineups-icon span:nth-child(2) { height: 18px; opacity: 0.82; }
    .lineups-icon span:nth-child(3) { height: 28px; }

    h1 {
        font-size: clamp(30px, 3vw, 44px);
        line-height: 0.98;
        letter-spacing: 0;
        color: var(--text);
        font-weight: 850;
    }

    .lineups-title-block p {
        color: var(--text-secondary);
        font-size: 17px;
        margin-top: 8px;
        overflow-wrap: anywhere;
    }

    .subtitle-note {
        color: var(--text-muted) !important;
        font-size: 14px !important;
        font-style: italic;
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

    .summary-card-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
    }

    .summary-card {
        min-height: 126px;
        display: grid;
        grid-template-columns: 50px minmax(0, 1fr);
        align-items: center;
        gap: 12px;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        box-shadow: 0 10px 24px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 15px 16px;
    }

    .summary-team-logo {
        width: 44px;
        height: 44px;
        object-fit: contain;
    }

    .summary-icon {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        position: relative;
        display: grid;
        place-items: center;
        background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
        border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border-subtle));
    }

    .summary-icon::before,
    .summary-icon::after,
    .summary-icon span {
        content: '';
        position: absolute;
        display: block;
    }

    .summary-icon.lineup::before,
    .summary-icon.tracked::before {
        width: 22px;
        height: 14px;
        border: 2px solid var(--accent);
        border-radius: 999px 999px 6px 6px;
        border-bottom: none;
        top: 14px;
    }

    .summary-icon.lineup::after,
    .summary-icon.tracked::after {
        width: 28px;
        height: 10px;
        border: 2px solid var(--accent);
        border-radius: 999px 999px 4px 4px;
        border-bottom: none;
        top: 22px;
    }

    .summary-icon span {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--accent);
        top: 11px;
        left: 18px;
    }

    .summary-copy {
        min-width: 0;
    }

    .summary-copy p {
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 800;
        line-height: 1.2;
        margin-bottom: 8px;
        overflow-wrap: anywhere;
    }

    .summary-copy strong {
        display: block;
        color: var(--accent);
        font-family: var(--font-mono);
        font-size: clamp(22px, 1.7vw, 30px);
        line-height: 1;
        font-weight: 900;
    }

    .summary-copy small,
    .summary-copy em {
        display: block;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 1.35;
        margin-top: 6px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .summary-copy em {
        color: var(--text-muted);
        font-style: normal;
    }

    .info-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: inline-grid;
        place-items: center;
        border: 1px solid currentColor;
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 10px;
        font-weight: 900;
        line-height: 1;
        vertical-align: text-bottom;
    }

    .lineups-table-panel {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius);
        background: var(--bg-surface);
        box-shadow: 0 12px 32px color-mix(in srgb, var(--text) 7%, transparent);
        padding: 14px;
        min-width: 0;
    }

    .lineups-controls {
        display: grid;
        grid-template-columns: minmax(250px, 1.1fr) 128px minmax(240px, 1.2fr) 142px 170px auto;
        align-items: end;
        gap: 12px;
        margin-bottom: 14px;
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
        border: 2px solid var(--text-muted);
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
        background: var(--text-muted);
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
        width: 100%;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        background: var(--bg-surface);
        overflow: visible;
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
        position: sticky;
        top: var(--nav-sticky-offset);
        z-index: 3;
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
        font-size: 10px;
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
        font-size: 12px;
    }

    .team-col {
        width: 90px;
    }

    .player-col {
        width: 162px;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .num {
        width: 92px;
        text-align: right;
        font-family: var(--font-mono);
        font-size: 12px;
        font-weight: 700;
    }

    th.num button {
        justify-content: flex-end;
    }

    .player-cell-link,
    .team-cell-link {
        display: inline-flex;
        align-items: center;
        color: var(--text);
        min-width: 0;
    }

    .player-cell-link {
        gap: 7px;
        max-width: 100%;
    }

    .team-cell-link {
        gap: 6px;
        font-weight: 850;
    }

    .player-cell-link span {
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .player-cell-link:hover,
    .team-cell-link:hover {
        color: var(--accent);
    }

    .player-headshot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
        object-position: center top;
        flex: 0 0 auto;
        background: var(--bg-elevated);
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

    td.pos {
        color: var(--positive);
    }

    td.neg {
        color: var(--negative);
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
        font-weight: 800;
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
        font-size: 15px;
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
        font-family: var(--font-mono);
        font-size: 26px;
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
        font-weight: 900;
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
        font-family: var(--font-mono);
        font-size: 30px;
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
        font-size: 15px;
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
        .table-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }

        table {
            width: max-content;
            min-width: 100%;
            table-layout: auto;
        }

        th {
            position: static;
        }

        .player-col,
        .team-col,
        .num {
            width: auto;
            max-width: none;
        }

        .player-col {
            min-width: 9rem;
        }
    }
    /* End touch/mobile scroll mode */

    @media (max-width: 1400px) {
        .lineups-dashboard {
            grid-template-columns: 1fr;
        }

        .lineups-rail {
            grid-template-columns: repeat(3, minmax(0, 1fr));
        }
    }

    @media (max-width: 1160px) {
        .summary-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .lineups-controls {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .export-btn {
            width: 100%;
        }

        .lineups-rail {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 820px) {
        .lineups-page {
            padding-top: 14px;
        }

        .lineups-hero {
            padding: 20px 16px;
        }

        .lineups-title-block {
            align-items: flex-start;
        }

        .lineups-icon {
            width: 54px;
            height: 54px;
            grid-template-columns: repeat(3, 6px);
            padding-bottom: 15px;
        }

        .lineups-title-block p {
            font-size: 14px;
            line-height: 1.35;
        }

        .summary-card-grid,
        .lineups-controls {
            grid-template-columns: 1fr;
        }

        .summary-card {
            min-height: 110px;
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
