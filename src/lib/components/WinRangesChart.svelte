<script>
	import * as d3 from 'd3';
	import { getContext } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { teamAbbr, teamId } from '$lib/utils/teamAbbreviations.js';
	import { formatWinRange, meanWins, winPoints, winQuantile, winRange } from '$lib/utils/winDistribution.js';

	/**
	 * Win ranges: each team's simulated seasons as a strip of final win totals on one wins axis.
	 * Bar heights are how often each total came up, the solid bars are the middle 80%, and the
	 * line marks the projection. Each row's tallest bar is its most common total, so a team the
	 * simulations agree on late in a season doesn't flatten every other row.
	 */
	let { teams = [], distributions = {}, simulations = 10_000 } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const ROW = 30;
	const GAP = 12;

	let width = $state(0);
	let hover = $state(null);

	const color = $derived(getSeriesColor(0, displayMode.view));
	const narrow = $derived(width > 0 && width < 560);
	const labelW = $derived(narrow ? 58 : 200);
	const rangeW = $derived(narrow ? 50 : 92);
	const plotW = $derived(Math.max(0, width - labelW - rangeW - 2 * GAP));

	const rows = $derived(
		teams
			.map((team) => {
				const points = winPoints(distributions?.[team.team_name]);
				if (!points.length) return null;
				const listed = Number.parseFloat(team.W);
				return {
					team: team.team_name,
					abbr: teamAbbr(team.team_name),
					id: teamId(team.team_name),
					points,
					peak: Math.max(...points.map((point) => point.prob)),
					projected: Number.isFinite(listed) ? listed : meanWins(points),
					range: winRange(points),
					half: winRange(points, 0.25, 0.75),
					min: points[0].wins,
					max: points[points.length - 1].wins
				};
			})
			.filter(Boolean)
			.sort((a, b) => b.projected - a.projected)
	);

	// The axis covers all but the rarest 1% of each team's seasons; bars past it aren't drawn.
	const x = $derived.by(() => {
		if (!(plotW > 0) || !rows.length) return null;
		const low = Math.min(...rows.map((row) => winQuantile(row.points, 0.005)));
		const high = Math.max(...rows.map((row) => winQuantile(row.points, 0.995)));
		return d3
			.scaleLinear()
			.domain([Math.max(0, low - 2), Math.min(82, high + 2)])
			.range([0, plotW]);
	});
	const ticks = $derived(x ? x.ticks(narrow ? 4 : 8).filter(Number.isInteger) : []);
	const step = $derived(x ? x(1) - x(0) : 0);

	function bars(row) {
		const [from, to] = x.domain();
		const span = Math.max(1, step - (step > 4 ? 1 : 0));
		return row.points
			.filter((point) => point.wins >= from && point.wins <= to)
			.map((point) => {
				const height = Math.max(1, ((ROW - 8) * point.prob) / row.peak);
				return {
					wins: point.wins,
					x: x(point.wins) - span / 2,
					y: ROW - 4 - height,
					width: span,
					height,
					outside: point.wins < row.range.low || point.wins > row.range.high
				};
			});
	}

	function describe(row) {
		return `${row.team}: ${row.projected.toFixed(1)} projected wins; the middle 80% of simulated seasons end with ${formatWinRange(row.range)} wins.`;
	}

	function show(row, event) {
		// Over the projection line, kept inside the card at either end.
		const half = Math.min(120, width / 2);
		hover = {
			row,
			left: Math.min(Math.max(labelW + GAP + x(row.projected), half), width - half),
			top: event.currentTarget.offsetTop
		};
	}
</script>

<div class="wr" bind:clientWidth={width}>
	{#if x}
		<div class="wr-grid" style:grid-template-columns="{labelW}px {plotW}px {rangeW}px" style:column-gap="{GAP}px">
			<span class="wr-head">Team</span>
			<span class="wr-head">Simulated final wins</span>
			<span class="wr-head num">{narrow ? '80%' : 'Middle 80%'}</span>

			{#each rows as row (row.team)}
				<a
					class="wr-row"
					href="/standings/{encodeURIComponent(row.team)}"
					aria-label={describe(row)}
					onpointerenter={(event) => show(row, event)}
					onpointerleave={() => (hover = null)}
					onfocus={(event) => show(row, event)}
					onblur={() => (hover = null)}
				>
					<span class="wr-team">
						{#if row.id}<img src="/api/img/logo/{row.id}" alt="" width="18" height="18" loading="lazy" />{/if}
						<span class="wr-name">{narrow ? row.abbr : row.team}</span>
					</span>
					<svg class="wr-strip" width={plotW} height={ROW} viewBox="0 0 {plotW} {ROW}" aria-hidden="true">
						{#each ticks as tick (tick)}
							<line class="wr-gridline" x1={x(tick)} x2={x(tick)} y1="0" y2={ROW} />
						{/each}
						{#each bars(row) as bar (bar.wins)}
							<rect
								class="wr-bar"
								class:outside={bar.outside}
								x={bar.x}
								y={bar.y}
								width={bar.width}
								height={bar.height}
								style:fill={color}
							/>
						{/each}
						<line class="wr-projection" x1={x(row.projected)} x2={x(row.projected)} y1="3" y2={ROW - 3} />
					</svg>
					<span class="wr-range num">{formatWinRange(row.range)}</span>
				</a>
			{/each}

			<span></span>
			<svg class="wr-axis" width={plotW} height="18" viewBox="0 0 {plotW} 18" aria-hidden="true">
				{#each ticks as tick (tick)}
					<text x={x(tick)} y="13" text-anchor="middle">{tick}</text>
				{/each}
			</svg>
			<span></span>
		</div>

		{#if hover}
			<div class="chart-tooltip wr-tip" style:left="{hover.left}px" style:top="{hover.top}px">
				<span class="wr-tip-head">{hover.row.team}</span>
				<span>{hover.row.projected.toFixed(1)} projected wins</span>
				<span class="wr-tip-muted">Middle 80%: {formatWinRange(hover.row.range)}</span>
				<span class="wr-tip-muted">Middle half: {formatWinRange(hover.row.half)}</span>
				<span class="wr-tip-muted">{hover.row.min}–{hover.row.max} across {simulations.toLocaleString('en-US')} seasons</span>
			</div>
		{/if}

		<p class="wr-legend" aria-hidden="true">
			<span><i class="wr-key-bar" style:background={color}></i>Middle 80% of seasons</span>
			<span><i class="wr-key-bar outside" style:background={color}></i>The rest</span>
			<span><i class="wr-key-line"></i>Projection</span>
		</p>
	{/if}
</div>

<style>
	.wr {
		position: relative;
		min-width: 0;
	}

	.wr-grid {
		display: grid;
		align-items: center;
	}

	.wr-head {
		padding-bottom: 6px;
		border-bottom: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.num {
		text-align: right;
	}

	/* A row is one link: its three cells sit on the parent grid's columns. */
	.wr-row {
		display: grid;
		grid-column: 1 / -1;
		grid-template-columns: subgrid;
		align-items: center;
		border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
		color: var(--text);
		text-decoration: none;
	}

	.wr-row:hover,
	.wr-row:focus-visible {
		background: color-mix(in srgb, var(--accent) 7%, transparent);
	}

	.wr-row:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.wr-team {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		font-size: 13px;
		font-weight: 650;
	}

	.wr-team img {
		flex: none;
		object-fit: contain;
	}

	.wr-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.wr-strip,
	.wr-axis {
		display: block;
		overflow: visible;
	}

	.wr-gridline {
		stroke: var(--border);
		stroke-width: 1;
		opacity: 0.6;
	}

	.wr-bar {
		opacity: 0.9;
	}

	.wr-bar.outside {
		opacity: 0.3;
	}

	.wr-projection {
		stroke: var(--text);
		stroke-width: 2;
		stroke-linecap: round;
	}

	.wr-range {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: var(--figure-weight-strong);
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.wr-axis text {
		fill: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.wr-tip {
		align-items: flex-start;
		font-size: 12px;
		line-height: 1.35;
		white-space: nowrap;
	}

	.wr-tip-head {
		font-weight: 750;
	}

	.wr-tip-muted {
		color: var(--text-muted);
	}

	.wr-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		margin: 12px 0 0;
		color: var(--text-secondary);
		font-size: 12px;
	}

	.wr-legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.wr-key-bar {
		display: inline-block;
		width: 10px;
		height: 12px;
		border-radius: 1px;
		opacity: 0.9;
	}

	.wr-key-bar.outside {
		opacity: 0.3;
	}

	.wr-key-line {
		display: inline-block;
		width: 2px;
		height: 14px;
		border-radius: 1px;
		background: var(--text);
	}
</style>
