<script>
	// One figure in the jump-ball post: a chart from jumpBallCharts.js, a hover tooltip, a data table
	// and a CSV download. The ladder figure also switches between its two sets of games.
	import { getContext } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { exportCsvRows } from '$lib/utils/csvPresets.js';
	import {
		HEIGHT_LABELS,
		HEADLINE_RATE,
		JUMP_BALL_CHARTS,
		LEDGER_PARTS,
		f1,
		feetInches,
		ladderRows,
		ledgerRows,
		seasonBand,
		seasonLabel,
		signed
	} from '$lib/utils/jumpBallCharts.js';

	let { kind, data, title, sub = '', caption = '', captions = null, label = title } = $props();

	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const colors = $derived({
		a: getSeriesColor(0, displayMode.view),
		b: getSeriesColor(1, displayMode.view),
		c: getSeriesColor(2, displayMode.view)
	});

	let width = $state(0);
	let figureEl = $state();
	let svgEl = $state();
	let tooltip = $state(null);
	let ladderSet = $state('long');

	function tip(target, html) {
		const place = (event) => {
			const rect = figureEl.getBoundingClientRect();
			const x = event.clientX - rect.left;
			tooltip = { html, x, y: event.clientY - rect.top, flip: x > rect.width - 220 };
		};
		target.addEventListener('pointerenter', place);
		target.addEventListener('pointermove', place);
		target.addEventListener('pointerleave', () => (tooltip = null));
		target.addEventListener('pointerdown', (event) => {
			if (event.pointerType === 'touch') place(event);
		});
	}

	$effect(() => {
		const W = Math.floor(width);
		const ctx = { data, ...colors, tip, ladderSet };
		if (!W || !svgEl) return;
		svgEl.replaceChildren();
		tooltip = null;
		const H = JUMP_BALL_CHARTS[kind](svgEl, W, ctx);
		svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
		svgEl.setAttribute('width', W);
		svgEl.setAttribute('height', H);
	});

	// The numbers behind each chart, for the table and the CSV.
	const table = $derived.by(() => {
		switch (kind) {
			case 'seasons':
				return {
					head: ['Season', 'Games', 'Tip winner win rate', 'Outside the chance band'],
					rows: data.seasons.map((d) => [
						seasonLabel(d.s),
						d.n.toLocaleString('en-US'),
						`${f1(d.v)}%`,
						Math.abs(d.v - HEADLINE_RATE) > seasonBand(d.n) ? 'yes' : ''
					])
				};
			case 'quarters':
				return {
					head: ['Quarter', 'Extra possessions', 'Scoring margin (points)'],
					rows: data.quarterPossessions.map((v, i) => [`Q${i + 1}`, signed(v, 2), signed(data.quarterPoints[i], 2)])
				};
			case 'height':
				return {
					head: ['Jumper vs the other jumper', 'Wins the tip'],
					rows: data.heightRates.map((rate, i) => [HEIGHT_LABELS[i], `${f1(rate)}%`])
				};
			case 'jumpers':
				return {
					head: ['Player', 'Height', 'Opening jumps', 'Won', 'Seasons'],
					rows: data.jumpers
						.slice()
						.sort((p, q) => q.rate - p.rate)
						.map((d) => [d.name, feetInches(d.ht), d.n.toLocaleString('en-US'), `${f1(d.rate)}%`, `${seasonLabel(d.s0)} to ${seasonLabel(d.s1)}`])
				};
			case 'scatter':
				return {
					head: ['Team-season', 'Tips won', 'Games won'],
					rows: data.scatter.map((d) => [d.l, `${f1(d.x)}%`, `${f1(d.y)}%`])
				};
			case 'placebo':
				return {
					head: ['Which tip', 'Won it: win rate', 'Lost it: win rate', 'Gap (points)'],
					rows: data.placebo.map((d) => [d.label, `${f1(d.win)}%`, `${f1(d.lose)}%`, f1(d.win - d.lose)])
				};
			case 'ladder':
				return {
					head: ['Comparison', 'Edge (points)', '95% range'],
					rows: ladderRows(data, ladderSet).map((r) => [r.label, signed(r.est, 2), `${signed(r.lo, 2)} to ${signed(r.hi, 2)}`])
				};
			case 'priced': {
				const P = data.priced;
				const half = 1.96 * P.left_se;
				return {
					head: ['Measure', 'Value'],
					rows: [
						['Games', P.n.toLocaleString('en-US')],
						["Tip winners' actual win rate", `${f1(P.actual, 2)}%`],
						["Market's pregame price for the same teams", `${f1(P.market, 2)}%`],
						['Left over (points)', `${signed(P.left)} (${signed(P.left - half)} to ${signed(P.left + half)})`]
					]
				};
			}
			case 'iou':
				return {
					head: ['Point in the game', 'Tip winner minus loser, possessions'],
					rows: ['Tip-off', 'After Q1', 'After Q2', 'After Q3', 'Final'].map((name, i) => [name, signed(data.runningPossessions[i], 2)])
				};
			case 'ledger':
				return {
					head: ['Games', 'Raw gap', ...LEDGER_PARTS],
					rows: ledgerRows(data).map((r) => [r.label, f1(r.raw, 2), ...r.parts.map((v) => (v ? f1(v, 2) : ''))])
				};
			default:
				return { head: [], rows: [] };
		}
	});

	function downloadCsv() {
		exportCsvRows({
			rows: table.rows,
			filename: `jump-ball-${kind}${kind === 'ladder' ? `-${ladderSet}` : ''}`,
			columns: table.head.map((header, i) => ({ header, accessor: (row) => row[i] }))
		});
	}

	const ladderOptions = [
		{ key: 'long', label: 'All regular-season games since 1999-2000', detail: '32,437 games, no betting lines' },
		{ key: 'odds', label: 'Games with betting lines, 2011-12 to 2021-22', detail: '12,937 games' }
	];
	const captionText = $derived(captions ? captions[ladderSet] : caption);
</script>

<figure class="jb-figure" bind:this={figureEl}>
	<h3 class="jb-title">{title}</h3>
	{#if sub}<p class="jb-sub">{sub}</p>{/if}

	{#if kind === 'ladder'}
		<div class="jb-toggle" role="radiogroup" aria-label="Which games to show">
			{#each ladderOptions as option (option.key)}
				<button
					type="button"
					role="radio"
					aria-checked={ladderSet === option.key}
					class:active={ladderSet === option.key}
					onclick={() => (ladderSet = option.key)}
				>
					{option.label}<small>{option.detail}</small>
				</button>
			{/each}
		</div>
	{/if}

	<div class="jb-plot" bind:clientWidth={width}>
		<svg bind:this={svgEl} role="img" aria-label={label}></svg>
	</div>
	{#if tooltip}
		<div class="jb-tooltip" class:flip={tooltip.flip} style:left="{tooltip.x}px" style:top="{tooltip.y}px">
			{@html tooltip.html}
		</div>
	{/if}

	{#if captionText}<figcaption>{captionText}</figcaption>{/if}

	<details class="jb-data">
		<summary>See the data</summary>
		<div class="jb-table-scroll">
			<table>
				<thead>
					<tr>
						{#each table.head as header, i (i)}<th scope="col" class:left={i === 0}>{header}</th>{/each}
					</tr>
				</thead>
				<tbody>
					{#each table.rows as row, r (r)}
						<tr>
							{#each row as cell, i (i)}<td class:left={i === 0}>{cell}</td>{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<button type="button" class="btn btn-sm" onclick={downloadCsv}>Download CSV</button>
	</details>
</figure>

<style>
	.jb-figure {
		position: relative;
		margin: 28px 0 34px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.jb-title {
		margin: 0 0 4px;
		color: var(--text);
		font-size: 17px;
		font-weight: 700;
		line-height: 1.3;
	}

	.jb-figure .jb-sub {
		margin: 0 0 14px;
		color: var(--text-secondary);
		font-size: 13px;
		line-height: 1.45;
	}

	.jb-plot {
		width: 100%;
	}

	.jb-plot svg {
		display: block;
		overflow: visible;
		touch-action: pan-y;
	}

	.jb-plot :global(.t-axis) {
		fill: var(--text-muted);
		font-size: 11px;
	}

	.jb-plot :global(.t-val) {
		fill: var(--text);
		font-family: var(--font-mono);
		font-size: 12px;
	}

	.jb-plot :global(.t-ann) {
		fill: var(--text-secondary);
		font-size: 12px;
		font-weight: 600;
		paint-order: stroke;
		stroke: var(--bg-surface);
		stroke-width: 3px;
		stroke-linejoin: round;
	}

	.jb-plot :global(.t-lbl) {
		fill: var(--text);
		font-size: 13px;
		font-weight: 600;
	}

	.jb-plot :global(.t-lbl-s) {
		fill: var(--text-secondary);
		font-size: 12px;
	}

	.jb-plot :global(.t-panel) {
		fill: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	.jb-plot :global(.hit) {
		fill: transparent;
		cursor: pointer;
	}

	.jb-tooltip {
		position: absolute;
		z-index: 5;
		max-width: 240px;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text-secondary);
		font-size: 12px;
		line-height: 1.45;
		pointer-events: none;
		transform: translate(14px, 16px);
		box-shadow: 0 4px 14px rgb(0 0 0 / 18%);
	}

	.jb-tooltip.flip {
		transform: translate(calc(-100% - 14px), 16px);
	}

	.jb-tooltip :global(b) {
		color: var(--text);
	}

	.jb-toggle {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		margin-bottom: 14px;
	}

	.jb-toggle button {
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 700;
		line-height: 1.35;
		text-align: left;
		cursor: pointer;
	}

	.jb-toggle button small {
		display: block;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 500;
	}

	.jb-toggle button.active,
	.jb-toggle button:hover {
		border-color: var(--accent);
		color: var(--text);
	}

	figcaption {
		margin-top: 10px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	.jb-data {
		margin-top: 10px;
		font-size: 13px;
	}

	.jb-data summary {
		color: var(--text-secondary);
		font-weight: 700;
		cursor: pointer;
	}

	.jb-table-scroll {
		max-height: 340px;
		margin: 8px 0;
		overflow: auto;
	}

	.jb-figure table {
		width: 100%;
		margin: 0;
		border-top: 0;
		border-collapse: collapse;
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}

	.jb-figure th,
	.jb-figure td {
		padding: 5px 8px;
		border-bottom: 1px solid var(--border-subtle);
		background: none;
		color: var(--text);
		text-align: right;
		white-space: nowrap;
	}

	.jb-figure thead th {
		position: sticky;
		top: 0;
		background: var(--bg-surface);
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.jb-figure .left {
		text-align: left;
	}

	@media (max-width: 640px) {
		.jb-figure {
			padding: 14px;
		}

		.jb-toggle {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
