<script>
	import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
	import { teamAbbrFromId } from '$lib/utils/teamAbbreviations.js';
	import { RACE_SIZE, lastName } from '$lib/utils/rewind.js';

	// players: [[nba_id, dpm*100, o_dpm*100, tm_id]] for one week, best first.
	let { players = [], names = {}, duration = 0, caption = '' } = $props();

	let containerEl = $state(null);
	let svgEl = $state(null);
	let builtWidth = 0;
	const SCALE_MAX = 10;

	function signed(value, digits = 2) {
		return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
	}

	function shortName(name) {
		const last = lastName(name);
		return last.length > 13 ? `${last.slice(0, 12)}…` : last;
	}

	function render(animate) {
		const width = containerEl?.clientWidth ?? 0;
		if (!svgEl || width === 0) return;
		const narrow = width < 560;
		const rowHeight = narrow ? 26 : 30;
		const height = RACE_SIZE * rowHeight + 28;
		const labelWidth = Math.round(
			narrow ? Math.min(Math.max(width * 0.36, 112), 150) : Math.min(Math.max(width * 0.34, 160), 250)
		);
		const x = d3.scaleLinear().domain([0, SCALE_MAX]).range([labelWidth, width - 64]);
		const svg = d3.select(svgEl).attr('width', width).attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

		if (builtWidth !== width) {
			svg.selectAll('*').remove();
			const axis = svg.append('g').attr('class', 'race-axis');
			for (const tick of [0, 2, 4, 6, 8, 10]) {
				axis.append('line')
					.attr('class', tick === 0 ? 'race-zero' : 'race-grid')
					.attr('x1', x(tick))
					.attr('x2', x(tick))
					.attr('y1', 0)
					.attr('y2', height - 22);
				axis.append('text')
					.attr('class', 'race-tick')
					.attr('x', x(tick))
					.attr('y', height - 6)
					.attr('text-anchor', 'middle')
					.text(tick === 0 ? '0' : `+${tick}`);
			}
			svg.append('g').attr('class', 'race-bars');
			builtWidth = width;
		}

		const data = players.map(([id, dpm, offense, teamId], index) => ({
			id,
			dpm: dpm / 100,
			offense: offense / 100,
			teamId,
			index
		}));
		// Animated weeks use transitions; everything else is set synchronously, so the chart is right
		// even where animation frames are held back (a background tab).
		const moving = animate && duration > 0 && !document.hidden;
		if (!moving) svg.selectAll('*').interrupt();
		const transition = moving ? svg.transition().duration(duration).ease(d3.easeLinear) : null;
		const step = (selection) => (moving ? selection.transition(transition) : selection);
		const bars = svg.select('g.race-bars').selectAll('g.race-bar').data(data, (d) => d.id);
		const enter = bars
			.enter()
			.append('g')
			.attr('class', 'race-bar')
			.attr('transform', `translate(0,${moving ? height : 0})`);
		enter.append('title');
		enter.append('rect').attr('x', labelWidth).attr('y', 4).attr('height', rowHeight - 9).attr('rx', 3).attr('width', 0);
		enter.append('text').attr('class', 'race-rank').attr('x', 2).attr('y', rowHeight / 2 + 4);
		enter.append('text').attr('class', 'race-name').attr('x', 26).attr('y', rowHeight / 2 + 4);
		enter.append('text').attr('class', 'race-team').attr('x', labelWidth - 8).attr('y', rowHeight / 2 + 4).attr('text-anchor', 'end');
		enter.append('text').attr('class', 'race-value').attr('x', labelWidth + 6).attr('y', rowHeight / 2 + 4);

		const merged = enter.merge(bars);
		merged.classed('first', (d) => d.index === 0);
		merged.select('title').text(
			(d) =>
				`${names[d.id] ?? d.id}, ${teamAbbrFromId(d.teamId)}: DPM ${signed(d.dpm)} (offense ${signed(d.offense)}, defense ${signed(d.dpm - d.offense)})`
		);
		merged.select('.race-rank').text((d) => d.index + 1);
		merged.select('.race-name').text((d) => (narrow ? shortName(names[d.id]) : (names[d.id] ?? d.id)));
		merged.select('.race-team').text((d) => (narrow ? '' : teamAbbrFromId(d.teamId)));
		step(merged).attr('transform', (d) => `translate(0,${d.index * rowHeight})`);
		const barEnd = (d) => x(Math.min(Math.max(d.dpm, 0), SCALE_MAX));
		step(merged.select('rect')).attr('width', (d) => Math.max(0, barEnd(d) - labelWidth));
		const values = step(merged.select('.race-value')).attr('x', (d) => barEnd(d) + 6);
		if (moving) {
			values.tween('text', function (d) {
				const from = Number(this.dataset.value ?? d.dpm);
				const interpolate = d3.interpolateNumber(from, d.dpm);
				this.dataset.value = String(d.dpm);
				return (progress) => {
					this.textContent = signed(interpolate(progress));
				};
			});
		} else {
			values.text((d) => signed(d.dpm)).each(function (d) {
				this.dataset.value = String(d.dpm);
			});
		}
		if (moving) {
			bars.exit().transition(transition).attr('transform', `translate(0,${height + 12})`).style('opacity', 0).remove();
		} else {
			bars.exit().remove();
		}
	}

	// The first week draws in place; later weeks animate.
	let drawn = false;
	$effect(() => {
		void players;
		void names;
		render(drawn);
		drawn = true;
	});

	$effect(() => {
		if (!containerEl) return;
		return withResizeObserver({ element: containerEl, onResize: () => render(false) });
	});
</script>

<div class="race" bind:this={containerEl}>
	<svg bind:this={svgEl} role="img" aria-label={caption}></svg>
	<table class="sr-only">
		<caption>{caption}</caption>
		<thead><tr><th>Rank</th><th>Player</th><th>Team</th><th>DPM</th></tr></thead>
		<tbody>
			{#each players as [id, dpm, , teamId], index (id)}
				<tr><td>{index + 1}</td><td>{names[id]}</td><td>{teamAbbrFromId(teamId)}</td><td>{signed(dpm / 100)}</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.race {
		--race-bar: color-mix(in srgb, var(--text-secondary) 42%, var(--bg-surface));
		--race-first: var(--time);
		position: relative;
		width: 100%;
	}

	.race svg {
		display: block;
		overflow: visible;
	}

	.race :global(.race-grid) {
		stroke: var(--border-subtle);
		stroke-dasharray: 2 3;
	}

	.race :global(.race-zero) {
		stroke: var(--border);
	}

	.race :global(.race-tick) {
		font-size: 11px;
		fill: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.race :global(.race-bar rect) {
		fill: var(--race-bar);
	}

	.race :global(.race-bar.first rect) {
		fill: var(--race-first);
	}

	.race :global(.race-rank) {
		font-family: var(--font-mono);
		font-size: 11px;
		fill: var(--text-muted);
	}

	.race :global(.race-name) {
		font-size: 13px;
		font-weight: 600;
		fill: var(--text);
	}

	.race :global(.race-bar.first .race-name) {
		fill: var(--time-text);
	}

	.race :global(.race-team) {
		font-size: 11px;
		fill: var(--text-muted);
	}

	.race :global(.race-value) {
		font-family: var(--font-mono);
		font-size: 12px;
		fill: var(--text);
		font-variant-numeric: tabular-nums;
	}

	:global(:root[data-view='shiny']) .race {
		--race-bar: #0c39ce;
		--race-first: #ef2d56;
	}
</style>
