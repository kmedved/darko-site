<script>
	// Offense against defense for all 30 teams (teamsOverview rows). Up and to the right is
	// better; dotted lines mark equal net rating; a finished season's champion is drawn larger in
	// the accent colour. Each team links to its page, and hovering or focusing one shows its numbers.
	import * as d3 from 'd3';
	import { formatSigned } from '$lib/utils/seismograph.js';

	let { rows = [] } = $props();

	const M = { top: 20, right: 16, bottom: 40, left: 44 };
	const NET_LINES = [-10, -5, 5, 10];
	const LABEL_W = 26;
	const LABEL_H = 12;

	let width = $state(0);
	let active = $state(null);

	const height = $derived(Math.round(Math.min(480, Math.max(320, width * 0.72))));
	const scales = $derived.by(() => {
		if (!rows.length || width <= M.left + M.right) return null;
		const pad = 0.6;
		const [o0, o1] = d3.extent(rows, (row) => row.offense);
		const [d0, d1] = d3.extent(rows, (row) => row.defense);
		return {
			x: d3.scaleLinear().domain([Math.min(o0, -1) - pad, Math.max(o1, 1) + pad]).nice().range([M.left, width - M.right]),
			y: d3.scaleLinear().domain([Math.min(d0, -1) - pad, Math.max(d1, 1) + pad]).nice().range([height - M.bottom, M.top])
		};
	});

	// Labels beside each dot, best-rated first, in the first of four spots that is clear.
	const points = $derived.by(() => {
		if (!scales) return [];
		const { x, y } = scales;
		const boxes = rows.map((row) => ({ x0: x(row.offense) - 6, x1: x(row.offense) + 6, y0: y(row.defense) - 6, y1: y(row.defense) + 6 }));
		const clear = (box) =>
			box.x0 > M.left && box.x1 < width - M.right && boxes.every((other) => box.x0 >= other.x1 || box.x1 <= other.x0 || box.y0 >= other.y1 || box.y1 <= other.y0);
		return [...rows]
			.sort((a, b) => b.rating - a.rating)
			.map((row) => {
				const cx = x(row.offense);
				const cy = y(row.defense);
				const spots = [
					{ lx: cx + 8, ly: cy + 4, anchor: 'start', box: { x0: cx + 7, x1: cx + 7 + LABEL_W, y0: cy - 6, y1: cy + 6 } },
					{ lx: cx - 8, ly: cy + 4, anchor: 'end', box: { x0: cx - 8 - LABEL_W, x1: cx - 8, y0: cy - 6, y1: cy + 6 } },
					{ lx: cx, ly: cy - 9, anchor: 'middle', box: { x0: cx - LABEL_W / 2, x1: cx + LABEL_W / 2, y0: cy - 9 - LABEL_H, y1: cy - 9 } },
					{ lx: cx, ly: cy + 17, anchor: 'middle', box: { x0: cx - LABEL_W / 2, x1: cx + LABEL_W / 2, y0: cy + 7, y1: cy + 7 + LABEL_H } }
				];
				const spot = spots.find((candidate) => clear(candidate.box)) ?? spots[0];
				boxes.push(spot.box);
				return { row, cx, cy, ...spot, champion: row.finish === 'Champion' };
			});
	});

	const ticks = $derived(scales ? { x: scales.x.ticks(6), y: scales.y.ticks(6) } : { x: [], y: [] });

	// Each dotted line runs where offense + defense = k, labelled where it enters the plot.
	const netLines = $derived.by(() => {
		if (!scales) return [];
		const { x, y } = scales;
		const [x0, x1] = x.domain();
		const [, yTop] = y.domain();
		return NET_LINES.map((k) => {
			const labelOffense = Math.min(Math.max(k - yTop, x0), x1);
			return { k, x1: x(x0), y1: y(k - x0), x2: x(x1), y2: y(k - x1), lx: x(labelOffense) + 4, ly: y(k - labelOffense) + 12 };
		});
	});

	const signed = (value, digits = 0) => (value > 0 ? '+' : '') + value.toFixed(digits);
</script>

<div class="quadrant" bind:clientWidth={width}>
	{#if scales}
		<svg viewBox="0 0 {width} {height}" role="img" aria-label="Every team's DARKO offense and defense ratings">
			<defs>
				<clipPath id="quadrant-plot">
					<rect x={M.left} y={M.top} width={width - M.left - M.right} height={height - M.top - M.bottom} />
				</clipPath>
			</defs>
			{#each ticks.x as tick (tick)}
				<line class="grid" class:zero={tick === 0} x1={scales.x(tick)} x2={scales.x(tick)} y1={M.top} y2={height - M.bottom} />
				<text class="tick" x={scales.x(tick)} y={height - M.bottom + 16} text-anchor="middle">{signed(tick)}</text>
			{/each}
			{#each ticks.y as tick (tick)}
				<line class="grid" class:zero={tick === 0} x1={M.left} x2={width - M.right} y1={scales.y(tick)} y2={scales.y(tick)} />
				<text class="tick" x={M.left - 8} y={scales.y(tick) + 4} text-anchor="end">{signed(tick)}</text>
			{/each}
			<g clip-path="url(#quadrant-plot)">
				{#each netLines as line (line.k)}
					<line class="net" x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} />
					<text class="net-label" x={line.lx} y={line.ly}>{signed(line.k)} net</text>
				{/each}
			</g>
			<text class="axis" x={width - M.right} y={height - 6} text-anchor="end">Offense →</text>
			<text class="axis" x={M.left} y={M.top - 7}>Defense ↑</text>
			{#each points as point (point.row.abbr)}
				<a
					href="/team/{point.row.abbr}"
					aria-label="{point.row.name}: DARKO rating {formatSigned(point.row.rating, 1)}, offense {formatSigned(point.row.offense, 1)}, defense {formatSigned(point.row.defense, 1)}"
					onpointerenter={() => (active = point)}
					onpointerleave={() => (active = null)}
					onfocus={() => (active = point)}
					onblur={() => (active = null)}
				>
					<circle class="hit" cx={point.cx} cy={point.cy} r="12" />
					<circle class="dot" class:champion={point.champion} cx={point.cx} cy={point.cy} r={point.champion ? 6 : 4.5} />
					<text class="label" x={point.lx} y={point.ly} text-anchor={point.anchor}>{point.row.abbr}</text>
				</a>
			{/each}
		</svg>
		{#if active}
			<div
				class="quadrant-tip"
				class:flip={active.cx > width * 0.6}
				style:left="{active.cx}px"
				style:top="{active.cy}px"
			>
				<strong>{active.row.name}</strong>
				<span>DARKO {formatSigned(active.row.rating, 1)} · offense {formatSigned(active.row.offense, 1)} · defense {formatSigned(active.row.defense, 1)}</span>
				{#if active.row.record}
					<span class="muted">{active.row.record}{active.row.finish ? ` · ${active.row.finish}` : ''}</span>
				{/if}
			</div>
		{/if}
	{/if}
</div>

<style>
	.quadrant {
		position: relative;
		width: 100%;
		min-width: 0;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.grid {
		stroke: var(--border-subtle);
		stroke-width: 1;
	}

	.grid.zero {
		stroke: var(--border);
	}

	.net {
		stroke: var(--graphic-muted);
		stroke-width: 1;
		stroke-dasharray: 2 4;
	}

	.tick,
	.net-label {
		fill: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.axis {
		fill: var(--text-secondary);
		font-size: 11px;
		font-weight: 600;
	}

	.hit {
		fill: transparent;
	}

	.dot {
		fill: var(--text);
	}

	.dot.champion {
		fill: var(--accent);
	}

	.label {
		fill: var(--text-secondary);
		font-size: 11px;
		font-weight: 600;
		pointer-events: none;
	}

	a:hover .dot,
	a:focus-visible .dot {
		stroke: var(--accent);
		stroke-width: 2;
	}

	a {
		outline: none;
	}

	.quadrant-tip {
		position: absolute;
		z-index: 2;
		display: grid;
		gap: 2px;
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg-elevated);
		box-shadow: 0 4px 14px rgb(0 0 0 / 0.18);
		font-size: 12px;
		white-space: nowrap;
		pointer-events: none;
		transform: translate(12px, -50%);
	}

	.quadrant-tip.flip {
		transform: translate(calc(-100% - 12px), -50%);
	}

	.quadrant-tip span {
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.quadrant-tip .muted {
		color: var(--text-muted);
	}
</style>
