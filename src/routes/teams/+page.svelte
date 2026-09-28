<script>
	// The Teams overview (utils/teamsOverview.js): all 30 teams' DARKO offense against defense,
	// and the power order by DARKO rating with each team's record, SRS and finish.
	import OffenseDefenseBar from '$lib/components/OffenseDefenseBar.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import TeamQuadrant from '$lib/components/TeamQuadrant.svelte';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import { seasonLabelFromEndYear } from '$lib/utils/timeMachine.js';

	let { data } = $props();

	const rows = $derived(data.rows ?? []);
	const seasonLabel = $derived(seasonLabelFromEndYear(data.playedSeason));
	const champion = $derived(rows.find((row) => row.finish === 'Champion') ?? null);
	const lede = $derived(
		[
			"A team's DARKO rating is its players' DPM weighted by DARKO's projected minutes over a full 240 (the Roster Lab's rating): points per 100 possessions against an average team.",
			data.fit && seasonLabel
				? `Across the ${data.fit.teams} teams it lines up with ${seasonLabel} win percentage at r = ${data.fit.r.toFixed(2)}.`
				: ''
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<svelte:head>
	<title>Teams — DARKO DPM</title>
</svelte:head>

<div class="container teams-page">
	<PageHeader
		eyebrow={seasonLabel ? `${seasonLabel}${data.complete ? ' final' : ''} · Team DNA` : 'Team DNA'}
		title="Teams"
		{lede}
	/>

	{#if rows.length === 0}
		<p class="empty-state">No team ratings are available right now.</p>
	{:else}
		<div class="teams-grid">
			<section class="teams-panel" data-shiny-surface="plot" aria-labelledby="quadrant-title">
				<header>
					<h2 id="quadrant-title">Offense against defense</h2>
					<p>
						Up and to the right is better. Dotted lines mark equal net rating.
						{#if champion}The {seasonLabel} champion, the {champion.name}, is larger and in colour.{/if}
					</p>
				</header>
				<TeamQuadrant {rows} />
			</section>

			<section class="teams-panel" data-shiny-surface="panel" aria-labelledby="power-title">
				<header>
					<h2 id="power-title">Power order</h2>
					<p>By DARKO rating, with each team's {data.complete ? 'final' : 'current'} record and SRS.</p>
				</header>
				<div class="power-wrap">
					<table class="power-table">
						<thead>
							<tr>
								<th scope="col" class="left">#</th>
								<th scope="col" class="left">Team</th>
								<th scope="col">W-L</th>
								<th scope="col" class="srs">SRS</th>
								<th scope="col">DARKO</th>
								<th scope="col" class="split">Off / Def</th>
								<th scope="col" class="left">{data.complete ? 'Finish' : 'Playoffs'}</th>
							</tr>
						</thead>
						<tbody>
							{#each rows as row (row.abbr)}
								<tr>
									<td class="left rank">{row.rank}</td>
									<th scope="row" class="left">
										<a href="/team/{row.abbr}">
											<img src="/api/img/logo/{row.id}" alt="" loading="lazy" />
											<span class="team-full">{row.name}</span>
											<span class="team-abbr">{row.abbr}</span>
										</a>
									</th>
									<td>{row.record ?? '—'}</td>
									<td class="muted srs">{formatSigned(row.srs, 1)}</td>
									<td class="rating">{formatSigned(row.rating, 1)}</td>
									<td class="split"><OffenseDefenseBar offense={row.offense} defense={row.defense} max={6} /></td>
									<td class="left">
										{#if data.complete}
											<span class="pill" class:champion={row.finish === 'Champion'}>{row.finish ?? '—'}</span>
										{:else}
											{row.playoffOdds === null ? '—' : `${row.playoffOdds.toFixed(0)}%`}
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	{/if}
</div>

<style>
	.teams-page {
		padding-bottom: 40px;
	}

	.teams-grid {
		display: grid;
		grid-template-columns: minmax(0, 7fr) minmax(0, 6fr);
		gap: 18px;
		align-items: start;
		margin-top: 18px;
	}

	.teams-panel {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 0;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: var(--radius-md, 10px);
		background: var(--bg-surface);
	}

	.teams-panel h2 {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.teams-panel header p {
		margin-top: 4px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.power-wrap {
		overflow-x: auto;
	}

	.power-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.power-table th,
	.power-table td {
		padding: 6px 8px;
		text-align: right;
		white-space: nowrap;
	}

	.power-table .left {
		text-align: left;
	}

	.power-table thead th {
		font-weight: 600;
		color: var(--text-secondary);
		border-bottom: 1px solid var(--border);
	}

	.power-table tbody tr + tr {
		border-top: 1px solid var(--border-subtle);
	}

	.power-table th[scope='row'] a {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		font-weight: 600;
		color: var(--text);
		text-decoration: none;
	}

	.power-table th[scope='row'] a:hover,
	.power-table th[scope='row'] a:focus-visible {
		text-decoration: underline;
	}

	.power-table img {
		width: 20px;
		height: 20px;
	}

	.rank,
	.muted {
		color: var(--text-muted);
	}

	.rating {
		font-weight: 700;
		color: var(--text);
	}

	.split {
		min-width: 96px;
	}

	.team-abbr {
		display: none;
	}

	.pill {
		display: inline-block;
		padding: 1px 8px;
		border: 1px solid var(--border);
		border-radius: 999px;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.pill.champion {
		border-color: var(--accent);
		color: var(--accent);
		font-weight: 600;
	}

	@media (max-width: 1100px) {
		.teams-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 600px) {
		.teams-panel {
			padding: 14px 12px;
		}

		/* Phones: abbreviations, and no split bar or SRS, so the table fits. */
		.power-table .split,
		.power-table .srs,
		.team-full {
			display: none;
		}

		.team-abbr {
			display: inline;
		}
	}
</style>
