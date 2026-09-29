<script>
	// A player's seasons since 1996-97, newest first (seasonRows in utils/playerSeasons.js): DPM at
	// each season's last game day, and where it ranks among seasons at the same age. Each DPM opens
	// the leaderboard on its own day, where the player shows that same rating among their peers.
	import { ordinal } from '$lib/utils/daily.js';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import { seasonBoardHref } from '$lib/utils/playerSeasons.js';
	import { formatAsOfDate } from '$lib/utils/timeMachine.js';

	let { rows = [], playerName = '' } = $props();

	function one(value) {
		return value === null || value === undefined ? '—' : value.toFixed(1);
	}
</script>

<div class="season-table-wrap">
	<table class="season-table">
		<caption class="sr-only">{playerName}, season by season</caption>
		<thead>
			<tr>
				<th scope="col">Season</th>
				<th scope="col" class="left">Team</th>
				<th scope="col">Age</th>
				<th scope="col">Games</th>
				<th scope="col">MPG</th>
				<th scope="col">DPM</th>
				<th scope="col">Off</th>
				<th scope="col">Def</th>
				<th scope="col">For his age</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.season)}
				<tr>
					<th scope="row">{row.label}{#if row.inProgress}<span class="so-far">{' '}so far</span>{/if}</th>
					<td class="left">{row.team}</td>
					<td>{row.age ?? '—'}</td>
					<td>{row.games}{#if row.playoffGames > 0}<span class="playoffs">{' '}+{row.playoffGames}</span>{/if}</td>
					<td>{one(row.mpg)}</td>
					<td class="dpm">
						{#if seasonBoardHref(row) && row.dpm !== null}
							<a href={seasonBoardHref(row)} title={`The leaderboard on ${formatAsOfDate(row.date)}`}>{formatSigned(row.dpm)}</a>
						{:else}
							{formatSigned(row.dpm)}
						{/if}
					</td>
					<td>{formatSigned(row.offense)}</td>
					<td>{formatSigned(row.defense)}</td>
					<td class="rank">
						{#if row.ageRank !== null && row.ageCount}
							{ordinal(row.ageRank)} of {row.ageCount}
						{:else}
							—
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<p class="season-note">
	Games are regular season; +n are playoff games. "For his age" ranks the season's DPM among every
	season at the same age since 1996-97 with 20 or more games. A season's DPM opens the leaderboard
	on its last game day.
</p>

<style>
	.season-table-wrap {
		max-height: 440px;
		overflow: auto;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.season-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.season-table th,
	.season-table td {
		padding: 6px 10px;
		text-align: right;
		white-space: nowrap;
	}

	.season-table th[scope='row'],
	.season-table thead th:first-child,
	.season-table .left {
		text-align: left;
	}

	.season-table thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-elevated);
	}

	.season-table tbody tr + tr {
		border-top: 1px solid var(--border-subtle);
	}

	.season-table th[scope='row'] {
		font-weight: 600;
		color: var(--text);
	}

	.season-table .dpm {
		font-weight: 600;
		color: var(--text);
	}

	.season-table .dpm a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--accent) 55%, transparent);
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}

	.season-table .dpm a:hover,
	.season-table .dpm a:focus-visible {
		color: var(--accent);
		text-decoration-color: currentColor;
	}

	.so-far,
	.playoffs {
		font-size: 11px;
		font-weight: 400;
		color: var(--text-muted);
	}

	.rank {
		color: var(--text-secondary);
	}

	.season-note {
		font-size: 12px;
		color: var(--text-muted);
	}
</style>
