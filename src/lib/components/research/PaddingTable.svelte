<script>
	// A padding table with a calculator: pick a stat, enter a sample, see the padded projection.
	import { untrack } from 'svelte';
	import { exportCsvRows } from '$lib/utils/csvPresets.js';
	import { getNextSortState, getSortAriaValue, getSortGlyph, getSortedRows } from '$lib/utils/sortableTable.js';
	import {
		formatPadding,
		formatStatValue,
		fromInputValue,
		ownWeight,
		paddedProjection,
		toInputValue
	} from '$lib/utils/paddingStats.js';

	let {
		rows,
		stats,
		kind = 'player',
		defaultStat,
		defaultValue,
		defaultSample,
		caption = '',
		csvName = 'padding',
		defaultSort = 'pad'
	} = $props();

	const subject = $derived(kind === 'team' ? 'team' : 'player');
	const tableRows = $derived(
		rows.map((row) => ({
			...row,
			...stats[row.stat],
			games: row.perGame ? row.pad / row.perGame : null
		}))
	);

	let sortColumn = $state(untrack(() => defaultSort));
	let sortDirection = $state('asc');
	const sortConfigs = {
		label: { type: 'text' },
		pad: { type: 'number' },
		games: { type: 'number' }
	};
	const sortedRows = $derived(getSortedRows(tableRows, { sortColumn, sortDirection, sortConfigs }));

	function sortBy(column) {
		({ sortColumn, sortDirection } = getNextSortState({ sortColumn, sortDirection, column }));
	}

	let selected = $state(untrack(() => defaultStat));
	const current = $derived(tableRows.find((row) => row.stat === selected) ?? tableRows[0]);
	let valueInput = $state(untrack(() => defaultValue));
	let sampleInput = $state(untrack(() => defaultSample));

	function choose(stat) {
		selected = stat;
		const row = tableRows.find((item) => item.stat === stat);
		valueInput = toInputValue(row.lg, row.format);
		sampleInput = Math.round(row.pad / 2) || 1;
	}

	const projection = $derived(
		paddedProjection(fromInputValue(valueInput, current.format), sampleInput, current.pad, current.lg)
	);
	const weight = $derived(ownWeight(sampleInput, current.pad));
	const hasGames = $derived(tableRows.some((row) => row.games !== null));

	function downloadCsv() {
		exportCsvRows({
			rows: sortedRows,
			filename: csvName,
			columns: [
				{ header: 'Stat', accessor: 'label' },
				{ header: 'Padding', accessor: (row) => row.pad.toFixed(2) },
				{ header: 'Padding unit', accessor: 'unit' },
				...(hasGames ? [{ header: 'About this many games', accessor: (row) => row.games?.toFixed(1) }] : []),
				{ header: 'League average 2025-26', accessor: 'lg' }
			]
		});
	}
</script>

<figure class="padding-table">
	<div class="calc" aria-live="polite">
		<label class="calc-stat">
			<span>Stat</span>
			<select value={selected} onchange={(event) => choose(event.currentTarget.value)}>
				{#each tableRows as row (row.stat)}
					<option value={row.stat}>{row.label}</option>
				{/each}
			</select>
		</label>
		<label>
			<span>So far{current.format === 'pct' ? ' (%)' : ''}</span>
			<input type="number" step="any" bind:value={valueInput} />
		</label>
		<label>
			<span>Over this many {current.unit}</span>
			<input type="number" min="0" step="1" bind:value={sampleInput} />
		</label>
		<p class="calc-result">
			Projection for the rest of the season:
			<strong>{formatStatValue(projection, current.format)}</strong>
			<small>
				League average is {formatStatValue(current.lg, current.format)}. The {subject}'s own numbers count for
				{Math.round(weight * 100)}% of this. They reach half at {formatPadding(current.pad)} {current.unit}.
			</small>
		</p>
	</div>

	<div class="table-scroll">
		<table>
			<thead>
				<tr>
					<th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, 'label')} class="left">
						<button type="button" onclick={() => sortBy('label')}>Stat {getSortGlyph(sortColumn, sortDirection, 'label')}</button>
					</th>
					<th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, 'pad')}>
						<button type="button" onclick={() => sortBy('pad')}>Padding {getSortGlyph(sortColumn, sortDirection, 'pad')}</button>
					</th>
					{#if hasGames}
						<th scope="col" aria-sort={getSortAriaValue(sortColumn, sortDirection, 'games')}>
							<button type="button" onclick={() => sortBy('games')}>Games {getSortGlyph(sortColumn, sortDirection, 'games')}</button>
						</th>
					{/if}
					<th scope="col">League avg<br />2025-26</th>
				</tr>
			</thead>
			<tbody>
				{#each sortedRows as row (row.stat)}
					<tr class:selected={row.stat === selected} onclick={() => choose(row.stat)}>
						<th scope="row" class="left">
							<button type="button" class="row-pick" onclick={(event) => { event.stopPropagation(); choose(row.stat); }}>
								{row.label}
							</button>
							{#if row.note}<small>{row.note}</small>{/if}
						</th>
						<td><span class="strong">{formatPadding(row.pad)}</span><small>{row.unit}</small></td>
						{#if hasGames}<td>{row.games === null ? '' : formatPadding(row.games)}</td>{/if}
						<td>{formatStatValue(row.lg, row.format)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<figcaption>
		<span>{caption} Click a row to load it into the calculator.</span>
		<button type="button" class="btn btn-sm" onclick={downloadCsv}>Download CSV</button>
	</figcaption>
</figure>

<style>
	.padding-table {
		margin: 28px 0 34px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.calc {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: 10px 14px;
		margin-bottom: 16px;
	}

	.calc label {
		display: grid;
		gap: 4px;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 700;
	}

	.calc select,
	.calc input {
		min-height: 34px;
		padding: 4px 8px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: 14px;
	}

	.calc input {
		font-family: var(--font-mono);
	}

	.calc-result {
		grid-column: 1 / -1;
		margin: 2px 0 0;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.5;
	}

	.calc-result strong {
		margin-left: 4px;
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 20px;
		font-weight: var(--figure-weight-strong);
	}

	.calc-result small {
		display: block;
		color: var(--text-muted);
		font-size: 13px;
	}

	.table-scroll {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.padding-table table {
		width: 100%;
		min-width: 100%;
		margin: 0;
		border-top: 0;
		border-collapse: collapse;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.padding-table th,
	.padding-table td {
		background: none;
		padding: 7px 10px;
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text);
		text-align: right;
		white-space: nowrap;
	}

	.padding-table thead th {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
	}

	thead button {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		text-transform: inherit;
		cursor: pointer;
	}

	.padding-table .left {
		text-align: left;
	}

	.padding-table tbody th {
		min-width: 9em;
		font-size: 13px;
		font-weight: 600;
		text-transform: none;
		white-space: normal;
	}

	.padding-table tbody th small {
		display: block;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 500;
	}

	.row-pick {
		padding: 0;
		border: 0;
		background: none;
		color: var(--text);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	tbody tr {
		cursor: pointer;
	}

	.padding-table tbody tr:hover,
	.padding-table tbody tr.selected {
		background: var(--bg-hover, var(--border-subtle));
	}

	tbody tr.selected .row-pick {
		color: var(--accent);
	}

	td small {
		display: block;
		max-width: 9em;
		margin-left: auto;
		white-space: normal;
		color: var(--text-muted);
		font-size: 11px;
	}

	.strong {
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
	}

	figcaption {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px 16px;
		margin-top: 12px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	@media (max-width: 640px) {
		.padding-table {
			padding: 14px;
		}

		.padding-table th,
		.padding-table td {
			padding: 7px 6px;
		}

		.calc {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}

		.calc-stat {
			grid-column: 1 / -1;
		}
	}
</style>
