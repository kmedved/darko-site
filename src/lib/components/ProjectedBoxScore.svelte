<script>
	// A player's projected box score: per 100 possessions and per game at his projected minutes
	// and pace (projectedBoxScore in utils/boxScore.js, the Fantasy Lab's conversion).
	let { box, playerName = '' } = $props();

	function percent(value) {
		return value === null || value === undefined ? '—' : `${(value * 100).toFixed(1)}%`;
	}
</script>

<table class="box-table">
	<caption class="sr-only">{playerName}, projected box score</caption>
	<thead>
		<tr>
			<th scope="col">Stat</th>
			<th scope="col">Per 100</th>
			<th scope="col">Per game</th>
		</tr>
	</thead>
	<tbody>
		{#each box.rows as row (row.label)}
			<tr class:sub={row.sub}>
				<th scope="row">{row.label}</th>
				<td>{row.per100.toFixed(1)}</td>
				<td class="per-game">{row.perGame === null ? '—' : row.perGame.toFixed(1)}</td>
			</tr>
		{/each}
		<tr>
			<th scope="row">FG% · 3P% · FT%</th>
			<td colspan="2">{percent(box.shooting.fg)} · {percent(box.shooting.fg3)} · {percent(box.shooting.ft)}</td>
		</tr>
	</tbody>
</table>

<style>
	.box-table {
		width: 100%;
		max-width: 520px;
		border-collapse: collapse;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.box-table th,
	.box-table td {
		padding: 5px 10px;
		text-align: right;
		white-space: nowrap;
	}

	.box-table th[scope='row'],
	.box-table thead th:first-child {
		text-align: left;
	}

	.box-table thead th {
		font-weight: 600;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border);
	}

	.box-table tbody tr + tr {
		border-top: 1px solid var(--border-subtle);
	}

	.box-table th[scope='row'] {
		font-weight: 600;
		color: var(--text);
	}

	.box-table tr.sub th[scope='row'] {
		padding-left: 24px;
		font-weight: 400;
		color: var(--text-secondary);
	}

	.box-table tr.sub td {
		color: var(--text-secondary);
	}

	.per-game {
		font-weight: 600;
		color: var(--text);
	}
</style>
