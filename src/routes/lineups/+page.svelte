<script>
	let loading = $state(false);
	let lineups = $state([]);
	let error = $state(null);

	// Lineup Projections page — UI structure ready.
	// Supabase table schema TBD. Once the table is created,
	// add a getLineupProjections() function to supabase.js
	// and call it here to populate the table.
</script>

<svelte:head>
	<title>Lineup Projections — DARKO DPM</title>
</svelte:head>

<div class="container">
	<div class="page-header">
		<div class="page-header-toolbar">
			<div>
				<h1>Lineup Projections</h1>
				<p>Lineup Plus/Minus in Relation to League Average</p>
				<p class="subtitle-note">Table Limited to Lineups with &gt;100 Possessions</p>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="loading">Loading lineup data...</div>
	{:else if error}
		<div class="error-msg">{error}</div>
	{:else if lineups.length === 0}
		<div class="empty-state">
				<p>Lineup data is not yet available.</p>
				<p class="empty-detail">Data source is deferred until a lineup table is added to Supabase.</p>
			</div>
	{:else}
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Lineup</th>
						<th>Team</th>
						<th>Poss</th>
						<th>Net +/-</th>
						<th>Off +/-</th>
						<th>Def +/-</th>
					</tr>
				</thead>
				<tbody>
					{#each lineups as lineup}
						<tr>
							<td>{lineup.players || ''}</td>
							<td>{lineup.team || ''}</td>
							<td class="num">{lineup.possessions || ''}</td>
							<td class="num {(lineup.net_pm ?? 0) >= 0 ? 'pos' : 'neg'}">
								{lineup.net_pm != null ? (lineup.net_pm >= 0 ? '+' : '') + lineup.net_pm.toFixed(1) : ''}
							</td>
							<td class="num {(lineup.off_pm ?? 0) >= 0 ? 'pos' : 'neg'}">
								{lineup.off_pm != null ? (lineup.off_pm >= 0 ? '+' : '') + lineup.off_pm.toFixed(1) : ''}
							</td>
							<td class="num {(lineup.def_pm ?? 0) >= 0 ? 'pos' : 'neg'}">
								{lineup.def_pm != null ? (lineup.def_pm >= 0 ? '+' : '') + lineup.def_pm.toFixed(1) : ''}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.subtitle-note {
		color: var(--text-muted);
		font-size: 12px;
		margin-top: 4px;
		font-style: italic;
	}

	.empty-state {
		text-align: center;
		padding: 80px 20px;
	}

	.empty-state p {
		color: var(--text-muted);
		font-size: 16px;
	}

	.empty-detail {
		margin-top: 8px;
		font-size: 13px !important;
		color: var(--text-muted);
	}

	.table-container {
		overflow-x: auto;
		margin-bottom: 48px;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	th {
		text-align: left;
		padding: 10px 14px;
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
		cursor: pointer;
	}

	td {
		padding: 10px 14px;
		border-bottom: 1px solid var(--border-subtle);
		color: var(--text);
	}

	td.num {
		font-family: var(--font-mono);
		font-size: 12px;
		text-align: right;
	}

	td.pos {
		color: var(--positive);
	}

	td.neg {
		color: var(--negative);
	}

	tr:hover td {
		background: var(--bg-hover);
	}
</style>
