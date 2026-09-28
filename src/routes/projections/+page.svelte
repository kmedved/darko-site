<script>
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { scrollEdges } from '$lib/utils/scrollEdges.js';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { exportCsvRows, getFantasyCsvColumns } from '$lib/utils/csvPresets.js';
	import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
	import { getPositionCategory } from '$lib/utils/positionCategories.js';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import {
		CATEGORY_POOL_SIZE,
		DEFAULT_CUSTOM_WEIGHTS,
		FANTASY_POINT_STATS,
		FANTASY_PRESETS,
		MIN_PROJECTED_MINUTES,
		buildFantasyBoard
	} from '$lib/utils/fantasyScoring.js';

	let { data } = $props();

	const STORAGE_KEY = 'darko-fantasy-lab';
	const PRESET_KEYS = Object.keys(FANTASY_PRESETS);
	const PAGE_SIZES = [50, 100, 200, 500];
	const POSITION_OPTIONS = ['G', 'G-F', 'F', 'F-C', 'C'];
	const STAT_COLUMNS = [
		{ key: 'minutes', label: 'Min' },
		{ key: 'pts', label: 'PTS', category: 'pts' },
		{ key: 'reb', label: 'REB', category: 'reb' },
		{ key: 'ast', label: 'AST', category: 'ast' },
		{ key: 'stl', label: 'STL', category: 'stl' },
		{ key: 'blk', label: 'BLK', category: 'blk' },
		{ key: 'fg3m', label: '3PM', category: 'fg3m' },
		{ key: 'fg_pct', label: 'FG%', category: 'fg_pct', percent: true },
		{ key: 'ft_pct', label: 'FT%', category: 'ft_pct', percent: true },
		{ key: 'tov', label: 'TOV', category: 'tov' }
	];
	const TEXT_SORT_COLUMNS = new Set(['player_name', 'team_name']);

	let preset = $state('espn');
	let customWeights = $state({ ...DEFAULT_CUSTOM_WEIGHTS });
	let query = $state('');
	let teamFilter = $state('');
	let positionFilter = $state('');
	let sortColumn = $state('value');
	let sortDirection = $state('desc');
	let pageSize = $state(100);
	let page = $state(1);
	let restored = $state(false);

	const isCategories = $derived(Boolean(FANTASY_PRESETS[preset]?.categories));
	const valueLabel = $derived(isCategories ? 'Total z' : 'FP/G');
	const board = $derived.by(() =>
		buildFantasyBoard(data.players, { preset, customWeights, minMinutes: MIN_PROJECTED_MINUTES })
	);
	const teamOptions = $derived.by(() =>
		[...new Set(board.map((row) => row.team_name).filter(Boolean))].sort((a, b) =>
			teamAbbr(a).localeCompare(teamAbbr(b))
		)
	);
	const filteredRows = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		return board.filter((row) => {
			if (needle && !String(row.player_name || '').toLowerCase().includes(needle)) return false;
			if (teamFilter && row.team_name !== teamFilter) return false;
			if (positionFilter && getPositionCategory(row.position) !== positionFilter) return false;
			return true;
		});
	});
	const sortConfigs = $derived.by(() => {
		const configs = {
			rank: { type: 'number' },
			player_name: { type: 'text' },
			team_name: { type: 'text', valueGetter: (row) => teamAbbr(row.team_name) },
			value: { type: 'number' }
		};
		for (const column of STAT_COLUMNS) {
			configs[column.key] =
				isCategories && column.category
					? { type: 'number', valueGetter: (row) => row.z?.[column.category] }
					: { type: 'number' };
		}
		return configs;
	});
	const sortedRows = $derived.by(() => getSortedRows(filteredRows, { sortColumn, sortDirection, sortConfigs }));
	const totalPages = $derived(Math.max(1, Math.ceil(sortedRows.length / pageSize)));
	const pageRows = $derived(sortedRows.slice((page - 1) * pageSize, page * pageSize));
	const asOfLabel = $derived(formatDate(data.asOf));

	onMount(() => {
		try {
			const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
			if (saved && typeof saved === 'object') {
				if (PRESET_KEYS.includes(saved.preset)) preset = saved.preset;
				if (saved.customWeights && typeof saved.customWeights === 'object') {
					customWeights = sanitizeWeights(saved.customWeights);
				}
			}
		} catch {
			// localStorage can be unavailable in some privacy modes
		}
		restored = true;
	});

	// A link can pick the scoring (Ask DARKO's "fantasy 9-cat" opens ?scoring=categories). It wins
	// over the saved choice once, then leaves the URL so the reader's next pick sticks.
	afterNavigate(({ to }) => {
		const key = to?.url.searchParams.get('scoring');
		if (!PRESET_KEYS.includes(key)) return;
		setPreset(key);
		setTimeout(() => {
			const url = new URL(window.location.href);
			url.searchParams.delete('scoring');
			replaceState(`${url.pathname}${url.search}${url.hash}`, {});
		}, 0);
	});

	$effect(() => {
		const snapshot = { preset, customWeights: { ...customWeights } };
		if (!browser || !restored) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
		} catch {
			// localStorage can be unavailable in some privacy modes
		}
	});

	function sanitizeWeights(weights) {
		return Object.fromEntries(
			FANTASY_POINT_STATS.map(({ key }) => {
				const value = Number.parseFloat(weights?.[key]);
				return [key, Number.isFinite(value) ? value : DEFAULT_CUSTOM_WEIGHTS[key]];
			})
		);
	}

	function setPreset(key) {
		preset = key;
		sortColumn = 'value';
		sortDirection = 'desc';
		page = 1;
	}

	function setWeight(key, raw) {
		const value = Number.parseFloat(raw);
		customWeights[key] = Number.isFinite(value) ? value : 0;
	}

	function resetWeights() {
		customWeights = { ...DEFAULT_CUSTOM_WEIGHTS };
	}

	function toggleSort(column) {
		({ sortColumn, sortDirection } = getNextSortState({
			sortColumn,
			sortDirection,
			column,
			defaultDirection: TEXT_SORT_COLUMNS.has(column) || column === 'rank' ? 'asc' : 'desc'
		}));
		page = 1;
	}

	function resetPage() {
		page = 1;
	}

	function exportFantasyCsv() {
		exportCsvRows({
			rows: sortedRows,
			columns: getFantasyCsvColumns(isCategories, FANTASY_PRESETS[preset].csvHeader),
			filename: `darko-fantasy-${FANTASY_PRESETS[preset].file ?? preset}.csv`
		});
	}

	function formatStat(value, column) {
		if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
		return column.percent ? `${(value * 100).toFixed(1)}%` : value.toFixed(1);
	}

	function formatValue(value) {
		if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
		if (!isCategories) return value.toFixed(1);
		return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(2)}`;
	}

	function formatZ(value) {
		return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
	}

	function zWidth(value) {
		const clamped = Math.min(3, Math.abs(value ?? 0));
		return `--z-width: ${((clamped / 3) * 50).toFixed(1)}%`;
	}

	function formatDate(iso) {
		if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
	}

	function teamLogoUrl(row) {
		const teamId = Number.parseInt(row?.tm_id, 10);
		return Number.isInteger(teamId) && teamId > 0 ? `/api/img/logo/${teamId}` : null;
	}

	function hideBrokenImage(event) {
		event.currentTarget.hidden = true;
	}
</script>

<svelte:head>
	<title>Fantasy Lab — DARKO DPM</title>
	<meta
		name="description"
		content="DARKO's per-100 box-score projections as per-game fantasy values under ESPN, Yahoo, DraftKings, 9-cat or custom scoring."
	/>
</svelte:head>

<div class="container fantasy-page" data-shiny-page>
	<PageHeader eyebrow="Projections" title="Fantasy Lab">
		<p class="page-lede">
			DARKO projects every box-score stat per 100 possessions. Pick your league's scoring and this page turns those
			projections into per-game fantasy values. Your scoring settings stay in this browser.
		</p>
		<p class="page-note">
			Per-game stats use DARKO's projected minutes and pace{asOfLabel ? ` as of ${asOfLabel}` : ''}. Players projected
			for fewer than {MIN_PROJECTED_MINUTES} minutes are left out.
		</p>
	</PageHeader>

	<section class="fantasy-panel" data-shiny-surface="panel" aria-labelledby="fantasy-board-title">
		<div class="table-title-row">
			<div>
				<h2 id="fantasy-board-title">Fantasy values</h2>
				<p>{sortedRows.length} players · {FANTASY_PRESETS[preset].label}</p>
			</div>
			<button class="btn" type="button" onclick={exportFantasyCsv} disabled={sortedRows.length === 0}>
				Download CSV
			</button>
		</div>

		<div class="table-controls" data-shiny-surface="well">
			<div class="scoring-control" role="group" aria-label="Scoring">
				{#each PRESET_KEYS as key (key)}
					<button
						type="button"
						class="scoring-option"
						aria-pressed={preset === key}
						onclick={() => setPreset(key)}
					>
						{FANTASY_PRESETS[key].label}
					</button>
				{/each}
			</div>
			{#if FANTASY_PRESETS[preset].note}
				<p class="scoring-note">{FANTASY_PRESETS[preset].note}</p>
			{/if}

			<label class="control-field search-control" for="fantasy-search">
				<span class="sr-only">Search players</span>
				<input
					id="fantasy-search"
					type="text"
					value={query}
					oninput={(event) => {
						query = event.currentTarget.value;
						resetPage();
					}}
					placeholder="Search players..."
					autocomplete="off"
				/>
			</label>

			<label class="control-field" for="fantasy-team">
				<span class="sr-only">Team filter</span>
				<select
					id="fantasy-team"
					value={teamFilter}
					onchange={(event) => {
						teamFilter = event.currentTarget.value;
						resetPage();
					}}
				>
					<option value="">All Teams</option>
					{#each teamOptions as team (team)}
						<option value={team}>{teamAbbr(team)}</option>
					{/each}
				</select>
			</label>

			<label class="control-field" for="fantasy-position">
				<span class="sr-only">Position filter</span>
				<select
					id="fantasy-position"
					value={positionFilter}
					onchange={(event) => {
						positionFilter = event.currentTarget.value;
						resetPage();
					}}
				>
					<option value="">All Positions</option>
					{#each POSITION_OPTIONS as position (position)}
						<option value={position}>{position}</option>
					{/each}
				</select>
			</label>
		</div>

		{#if preset === 'custom'}
			<div class="weights-panel" data-shiny-surface="well">
				<div class="weights-grid">
					{#each FANTASY_POINT_STATS as stat (stat.key)}
						<label class="weight-field" for={`fantasy-weight-${stat.key}`}>
							<span>{stat.label}</span>
							<input
								id={`fantasy-weight-${stat.key}`}
								type="number"
								step="0.25"
								value={customWeights[stat.key]}
								oninput={(event) => setWeight(stat.key, event.currentTarget.value)}
							/>
						</label>
					{/each}
				</div>
				<button class="btn" type="button" onclick={resetWeights}>Reset to ESPN</button>
			</div>
		{/if}

		{#if isCategories}
			<p class="table-note">
				9-cat values are z-scores against the top {CATEGORY_POOL_SIZE} players, a 12-team league rostering 13. FG% and
				FT% count makes above league average on the player's attempts, so volume matters. Bars show each category's
				z-score; sorting a category sorts by its z-score.
			</p>
		{/if}

		<div class="table-scroll-host" use:scrollEdges={'.table-wrapper'}>
			<div class="table-wrapper" data-shiny-table>
				<table>
					<thead>
						<tr class="header-row">
							<th scope="col" class="align-right" aria-sort={getSortAriaValue(sortColumn, sortDirection, 'rank')}>
								<button type="button" class="sort-button" onclick={() => toggleSort('rank')}>
									#<span class="sort-indicator">{getSortGlyph(sortColumn, sortDirection, 'rank')}</span>
								</button>
							</th>
							<th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, 'player_name')}>
								<button type="button" class="sort-button" onclick={() => toggleSort('player_name')}>
									Player<span class="sort-indicator">{getSortGlyph(sortColumn, sortDirection, 'player_name')}</span>
								</button>
							</th>
							<th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, 'team_name')}>
								<button type="button" class="sort-button" onclick={() => toggleSort('team_name')}>
									Team<span class="sort-indicator">{getSortGlyph(sortColumn, sortDirection, 'team_name')}</span>
								</button>
							</th>
							{#each STAT_COLUMNS as column (column.key)}
								<th
									scope="col"
									class="align-right"
									class:active={sortColumn === column.key}
									aria-sort={getSortAriaValue(sortColumn, sortDirection, column.key)}
								>
									<button type="button" class="sort-button" onclick={() => toggleSort(column.key)}>
										{column.label}<span class="sort-indicator">{getSortGlyph(sortColumn, sortDirection, column.key)}</span>
									</button>
								</th>
							{/each}
							<th
								scope="col"
								class="align-right value-col"
								class:active={sortColumn === 'value'}
								aria-sort={getSortAriaValue(sortColumn, sortDirection, 'value')}
							>
								<button type="button" class="sort-button" onclick={() => toggleSort('value')}>
									{valueLabel}<span class="sort-indicator">{getSortGlyph(sortColumn, sortDirection, 'value')}</span>
								</button>
							</th>
						</tr>
					</thead>
					<tbody>
						{#if pageRows.length === 0}
							<tr>
								<td class="empty-row" colspan={STAT_COLUMNS.length + 4}>No players match these filters.</td>
							</tr>
						{:else}
							{#each pageRows as row (row.nba_id)}
								<tr>
									<td class="align-right rank-cell">{row.rank}</td>
									<td>
										<span class="player-cell">
											<a href={`/player/${row.nba_id}`}>{row.player_name}</a>
											{#if row.position}<span class="position-tag">{row.position}</span>{/if}
										</span>
									</td>
									<td>
										<span class="team-cell">
											<span class="team-mark">
												{#if teamLogoUrl(row)}
													<img src={teamLogoUrl(row)} alt="" loading="lazy" onerror={hideBrokenImage} />
												{/if}
											</span>
											{teamAbbr(row.team_name) || '—'}
										</span>
									</td>
									{#each STAT_COLUMNS as column (column.key)}
										<td class="align-right">
											{#if isCategories && column.category}
												<span class="z-cell" title={`${column.label} z-score ${formatZ(row.z?.[column.category] ?? 0)}`}>
													<span>{formatStat(row[column.key], column)}</span>
													<span class="z-track" aria-hidden="true">
														<span
															class="z-fill"
															class:negative={(row.z?.[column.category] ?? 0) < 0}
															style={zWidth(row.z?.[column.category])}
														></span>
													</span>
												</span>
											{:else}
												{formatStat(row[column.key], column)}
											{/if}
										</td>
									{/each}
									<td class="align-right value-cell">{formatValue(row.value)}</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div class="table-footer">
			<label class="entries-control">
				Show
				<select
					value={pageSize}
					onchange={(event) => {
						pageSize = Number.parseInt(event.currentTarget.value, 10) || 100;
						resetPage();
					}}
				>
					{#each PAGE_SIZES as size (size)}
						<option value={size}>{size}</option>
					{/each}
				</select>
				players
			</label>
			<div class="pagination-controls">
				<button type="button" class="btn" onclick={() => (page -= 1)} disabled={page <= 1}>Previous</button>
				<span>Page {page} of {totalPages}</span>
				<button type="button" class="btn" onclick={() => (page += 1)} disabled={page >= totalPages}>Next</button>
			</div>
		</div>
	</section>
</div>

<style>
	.fantasy-page {
		padding-bottom: 40px;
	}

	.fantasy-panel {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-surface);
		padding: 20px;
		min-width: 0;
	}

	.table-title-row {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 14px;
	}

	.table-title-row h2 {
		color: var(--text);
		font-size: 20px;
		font-weight: 800;
	}

	.table-title-row p {
		color: var(--text-secondary);
		font-size: 13px;
	}

	.table-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-bottom: 14px;
	}

	.scoring-note {
		flex-basis: 100%;
		order: 10;
		margin: 0;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.scoring-control {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 2px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
	}

	.scoring-option {
		appearance: none;
		border: 0;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 750;
		padding: 7px 11px;
		cursor: pointer;
	}

	.scoring-option:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.scoring-option[aria-pressed='true'] {
		background: var(--accent);
		color: var(--bg);
	}

	.control-field input,
	.control-field select,
	.entries-control select,
	.weight-field input {
		height: 34px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: 13px;
		padding: 0 10px;
		outline: none;
	}

	.search-control {
		flex: 1 1 200px;
	}

	.search-control input {
		width: 100%;
	}

	.control-field input:focus,
	.control-field select:focus,
	.entries-control select:focus,
	.weight-field input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.weights-panel {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 12px;
		margin-bottom: 14px;
	}

	.weights-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
		gap: 8px;
		flex: 1 1 520px;
	}

	.weight-field {
		display: grid;
		gap: 4px;
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.weight-field input {
		width: 100%;
		font-family: var(--font-mono);
	}

	.table-note {
		color: var(--text-muted);
		font-size: 13px;
		margin-bottom: 12px;
		max-width: 900px;
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
		width: 100%;
		min-width: 920px;
		font-size: 13px;
	}

	th {
		position: sticky;
		top: var(--nav-sticky-offset);
		z-index: 2;
		height: 40px;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		padding: 0 8px;
		white-space: nowrap;
		text-align: left;
	}

	th.active,
	th.active .sort-button {
		color: var(--accent);
	}

	.sort-button {
		appearance: none;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		padding: 0;
		cursor: pointer;
	}

	.sort-button:hover {
		color: var(--text);
	}

	.sort-indicator {
		margin-left: 4px;
		font-size: 11px;
		opacity: 0.75;
	}

	th.align-right,
	td.align-right {
		text-align: right;
	}

	td {
		padding: 8px;
		border-bottom: 1px solid var(--border-subtle);
		white-space: nowrap;
		font-family: var(--font-mono);
		font-size: 13px;
		/* Ordinary figures at DM Mono's regular weight; the value column carries the emphasis. */
		font-weight: var(--figure-weight);
		color: var(--text);
		background: var(--bg-surface);
	}

	tbody tr:last-child td {
		border-bottom: none;
	}

	tbody tr:hover td {
		background: var(--bg-hover);
	}

	th:first-child,
	td:first-child {
		width: 40px;
		min-width: 40px;
	}

	th:nth-child(2),
	td:nth-child(2) {
		position: sticky;
		left: 0;
		z-index: 1;
		min-width: 210px;
		box-shadow: 1px 0 0 var(--border-subtle);
	}

	th:nth-child(2) {
		z-index: 3;
	}

	.rank-cell {
		color: var(--text-muted);
	}

	.player-cell {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		font-family: var(--font-sans);
		font-size: 13px;
	}

	.player-cell a {
		color: var(--text);
		font-weight: 750;
	}

	.player-cell a:hover {
		color: var(--accent);
	}

	.position-tag {
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: var(--figure-weight-strong);
	}

	.team-cell {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--text-secondary);
	}

	.team-mark {
		display: inline-flex;
		width: 18px;
		height: 18px;
	}

	.team-mark img {
		width: 18px;
		height: 18px;
		object-fit: contain;
	}

	.value-cell {
		font-size: 13px;
		font-weight: var(--figure-weight-strong);
	}

	.z-cell {
		display: inline-grid;
		justify-items: end;
		gap: 3px;
	}

	.z-track {
		position: relative;
		display: inline-block;
		width: 38px;
		height: 3px;
		border-radius: 2px;
		background: var(--border-subtle);
		overflow: hidden;
	}

	.z-fill {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: var(--z-width);
		background: var(--positive);
	}

	.z-fill.negative {
		left: auto;
		right: 50%;
		background: var(--negative);
	}

	.empty-row {
		color: var(--text-muted);
		font-family: var(--font-sans);
		text-align: center;
		padding: 24px;
	}

	.table-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 12px;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.entries-control {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.pagination-controls {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}

	@media (hover: hover) and (pointer: fine) and (max-width: 1180px) {
		.table-wrapper th:nth-child(3),
		.table-wrapper td:nth-child(3),
		.table-wrapper th:nth-child(4),
		.table-wrapper td:nth-child(4) {
			display: none;
		}

		table {
			min-width: 0;
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

		th,
		th:nth-child(2),
		td:nth-child(2) {
			position: static;
			top: auto;
			left: auto;
			box-shadow: none;
		}
	}
	/* End touch/mobile scroll mode */

	@media (max-width: 768px) {
		.fantasy-panel {
			padding: 16px;
		}

		.table-title-row,
		.table-footer {
			flex-direction: column;
			align-items: flex-start;
		}

		.control-field,
		.control-field select {
			width: 100%;
		}

		.table-wrapper {
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}

		table {
			width: max-content;
			min-width: 880px;
		}

		th,
		th:nth-child(2),
		td:nth-child(2) {
			position: static;
			top: auto;
			left: auto;
			box-shadow: none;
		}
	}
</style>
