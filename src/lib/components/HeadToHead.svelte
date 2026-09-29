<script>
	// Two players a stat to a row: the stat's name down the middle and each player's value on their
	// side. For the ratings, shooting and fair salary, where more is better, the leading value is
	// marked and the middle says by how much; volume, minutes and age are shown without a verdict.
	import { formatFixed, formatMillions, formatPercent, formatSignedMetric } from '$lib/utils/csvPresets.js';

	let { players = [], colors = [] } = $props();

	const ROWS = [
		{ key: 'dpm', label: 'DPM', format: 'signed', better: true },
		{ key: 'o_dpm', label: 'Offense', format: 'signed', better: true },
		{ key: 'd_dpm', label: 'Defense', format: 'signed', better: true },
		{ key: 'box_dpm', label: 'Box DPM', format: 'signed', better: true },
		{ key: 'on_off_dpm', label: 'On/off DPM', format: 'signed', better: true },
		{ key: 'x_fg_pct', label: 'FG%', format: 'percent', better: true },
		{ key: 'x_fg3_pct', label: '3P%', format: 'percent', better: true },
		{ key: 'x_ft_pct', label: 'FT%', format: 'percent', better: true },
		{ key: 'sal_market_fixed', label: 'Fair salary', format: 'money', better: true },
		{ key: 'x_pts_100', label: 'Points per 100', format: 'fixed' },
		{ key: 'x_ast_100', label: 'Assists per 100', format: 'fixed' },
		{ key: 'x_minutes', label: 'Minutes', format: 'fixed' },
		{ key: 'age', label: 'Age', format: 'age' },
		{ key: 'career_game_num', label: 'Career games', format: 'count' }
	];

	function number(value) {
		const n = Number.parseFloat(value);
		return Number.isFinite(n) ? n : null;
	}

	function display(value, format) {
		if (value === null) return '—';
		if (format === 'signed') return formatSignedMetric(value);
		if (format === 'percent') return formatPercent(value);
		if (format === 'money') return formatMillions(value);
		if (format === 'age') return String(Math.floor(value));
		if (format === 'count') return formatFixed(value, 0);
		return formatFixed(value, 1);
	}

	// The gap in the stat's own units: points of DPM, percentage points, millions.
	function gap(difference, format) {
		if (format === 'percent') return `${(difference * 100).toFixed(1)} pts`;
		if (format === 'money') return formatMillions(difference);
		return difference.toFixed(1);
	}

	// A gap too small to show at the stat's precision is a tie, not a lead of "0.0".
	const TIE_BELOW = { percent: 0.0005, money: 50_000 };

	const rows = $derived.by(() => {
		const [left, right] = players;
		return ROWS.map((row) => {
			const a = number(left?.[row.key]);
			const b = number(right?.[row.key]);
			const apart = a !== null && b !== null && Math.abs(a - b) >= (TIE_BELOW[row.format] ?? 0.05);
			const lead = row.better && apart ? (a > b ? 0 : 1) : null;
			return {
				...row,
				left: display(a, row.format),
				right: display(b, row.format),
				lead,
				edge: lead === null ? null : gap(Math.abs(a - b), row.format)
			};
		}).filter((row) => row.left !== '—' || row.right !== '—');
	});
</script>

{#if players.length === 2}
	<div class="h2h-wrap" data-shiny-surface="panel">
		<table class="h2h">
			<caption class="sr-only">{players[0].player_name} and {players[1].player_name}, stat by stat</caption>
			<thead>
				<tr>
					<th scope="col" class="h2h-player" style:--player-color={colors[0]}>
						<span class="h2h-dot" aria-hidden="true"></span>{players[0].player_name}
					</th>
					<th scope="col" class="h2h-stat"><span class="sr-only">Stat</span></th>
					<th scope="col" class="h2h-player h2h-player--right" style:--player-color={colors[1]}>
						{players[1].player_name}<span class="h2h-dot" aria-hidden="true"></span>
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
