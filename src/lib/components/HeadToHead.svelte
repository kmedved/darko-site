<script>
	// Two players a stat to a row (headToHeadRows in utils/headToHead.js): the stat's name down the
	// middle and each player's value on their side, the leader marked where more is better.
	import { headToHeadRows, snapshotNote } from '$lib/utils/headToHead.js';

	let { players = [], colors = [] } = $props();

	const rows = $derived(headToHeadRows(players[0], players[1]));
</script>

{#if players.length === 2}
	<div class="h2h-wrap" data-shiny-surface="panel">
		<table class="h2h">
			<caption class="sr-only">{players[0].player_name} and {players[1].player_name}, stat by stat</caption>
			<thead>
				<tr>
					<th scope="col" class="h2h-player" style:--player-color={colors[0]}>
						<span class="h2h-dot" aria-hidden="true"></span>{players[0].player_name}
						{#if snapshotNote(players[0])}<small class="h2h-asof">{snapshotNote(players[0])}</small>{/if}
					</th>
					<th scope="col" class="h2h-stat"><span class="sr-only">Stat</span></th>
					<th scope="col" class="h2h-player h2h-player--right" style:--player-color={colors[1]}>
						{players[1].player_name}<span class="h2h-dot" aria-hidden="true"></span>
						{#if snapshotNote(players[1])}<small class="h2h-asof">{snapshotNote(players[1])}</small>{/if}
					</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as row (row.key)}
					<tr>
						<td class="h2h-value" class:lead={row.lead === 0} style:--player-color={colors[0]}>{row.left}</td>
						<th scope="row" class="h2h-stat">
							{row.label}
							{#if row.edge}
								<small>
									<span class="sr-only">{players[row.lead].player_name} by</span>
									<span aria-hidden="true">{row.lead === 0 ? '◂ ' : ''}</span>{row.edge}<span aria-hidden="true">{row.lead === 1 ? ' ▸' : ''}</span>
								</small>
							{/if}
						</th>
						<td class="h2h-value h2h-value--right" class:lead={row.lead === 1} style:--player-color={colors[1]}>{row.right}</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<p class="h2h-caption">
			Each player's latest available DARKO projections; games are since 1996-97. Shooting gaps are in
			percentage points (pp).
		</p>
	</div>
{/if}

<style>
	.h2h-wrap {
		margin-bottom: 24px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-surface);
		padding: 6px 16px 10px;
	}

	.h2h {
		width: 100%;
		border-collapse: collapse;
		table-layout: fixed;
	}

	.h2h th,
	.h2h td {
		padding: 7px 4px;
	}

	.h2h tbody tr + tr {
		border-top: 1px solid var(--border-subtle);
	}

	.h2h-player {
		color: var(--text);
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 800;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.h2h-player--right {
		text-align: right;
	}

	.h2h-dot {
		display: inline-block;
		width: 9px;
		height: 9px;
		margin: 0 8px 1px 0;
		border-radius: 50%;
		background: var(--player-color);
	}

	.h2h-player--right .h2h-dot {
		margin: 0 0 1px 8px;
	}

	.h2h-asof {
		display: block;
		color: var(--text-muted);
		font-family: var(--font-sans);
		font-size: 11px;
		font-weight: 600;
	}

	.h2h-stat {
		width: 9.5rem;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 650;
		text-align: center;
	}

	.h2h-stat small {
		display: block;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: var(--figure-weight);
	}

	.h2h-value {
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 15px;
		font-weight: var(--figure-weight);
		font-variant-numeric: tabular-nums;
		text-align: left;
	}

	.h2h-value--right {
		text-align: right;
	}

	/* The leading value in ink, underlined in its player's colour. */
	.h2h-value.lead {
		color: var(--text);
		font-weight: var(--figure-weight-strong);
		text-decoration: underline;
		text-decoration-color: var(--player-color);
		text-decoration-thickness: 2px;
		text-underline-offset: 4px;
	}

	.h2h-caption {
		margin: 8px 0 0;
		color: var(--text-muted);
		font-size: 12px;
	}

	@media (max-width: 560px) {
		.h2h-wrap {
			padding: 4px 10px 8px;
		}

		/* A long name wraps rather than losing its end. */
		.h2h-player {
			font-size: 13px;
			white-space: normal;
		}

		.h2h-stat {
			width: 7.5rem;
		}

		.h2h-value {
			font-size: 14px;
		}
	}
</style>
