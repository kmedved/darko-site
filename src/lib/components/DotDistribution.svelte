<script>
	// One dot per player, stacked in columns by value. Players outside `highlight` are faint and
	// stack above the rest, so a filtered set keeps its own shape along the axis. Hovering a dot
	// names the player; clicking opens their page (on touch, the first tap names, the second opens).
	// A new stat or filter moves every dot to its new place in a left-to-right wave: across on an
	// ease, then up or down into its stack with a small bounce (CSS transitions, so a change in
	// mid-flight turns the dots around from wherever they are). Reduced motion moves them at once.
	import * as d3 from 'd3';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { goto } from '$app/navigation';

	let {
		points = [],
		highlight = null,
		mean = null,
		formatValue = (value) => String(value),
		formatTick = formatValue,
		label = 'Distribution of players',
		plotHeight = 140
	} = $props();

	const PAD = 12;
	const AXIS = 22;
	const MAX_PITCH = 5;
	const MIN_PITCH = 1.75;
	// The wave: the rightmost dot sets off this long after the leftmost, and each dot a little
	// after the one under it, so a column fills from the bottom.
	const WAVE_MS = 220;
	const STACK_MS = 3;

	let width = $state(0);
	// By id, so the ring follows its player when the dots are laid out again.
	let hoveredId = $state(null);

	const valid = $derived(points.filter((point) => Number.isFinite(point.value)));
	const tickCount = $derived(Math.max(3, Math.floor(width / 80)));

	const scale = $derived.by(() => {
		if (!valid.length || width <= 2 * PAD) return null;
		let [low, high] = d3.extent(valid, (point) => point.value);
		if (low === high) {
			low -= 1;
			high += 1;
		}
		// Round the ends on a fine step so the dots use the width; the labels thin out on their own.
		return d3.scaleLinear().domain([low, high]).nice(10).range([PAD, width - PAD]);
	});

	// The largest dot pitch at which the tallest column fits; below MIN_PITCH the chart grows instead.
	const layout = $derived.by(() => {
		if (!scale) return null;
		const on = (point) => !highlight || highlight.has(point.id);
		const ordered = [...valid].sort((a, b) => Number(on(b)) - Number(on(a)) || a.value - b.value);
		const binOf = (point, pitch) => Math.round(scale(point.value) / pitch);
		let pitch = MAX_PITCH;
		let tallest = 0;
		for (;;) {
			const counts = new Map();
			tallest = 0;
			for (const point of ordered) {
				const bin = binOf(point, pitch);
				const count = (counts.get(bin) ?? 0) + 1;
				counts.set(bin, count);
				tallest = Math.max(tallest, count);
			}
			if (tallest * pitch <= plotHeight || pitch - 0.25 < MIN_PITCH) break;
			pitch -= 0.25;
		}
		const base = Math.max(plotHeight, tallest * pitch) + 4;
		const levels = new Map();
		const placed = new Map();
		for (const point of ordered) {
			const bin = binOf(point, pitch);
			const level = levels.get(bin) ?? 0;
			levels.set(bin, level + 1);
			const cx = bin * pitch;
			const delay = Math.round((cx / width) * WAVE_MS + Math.min(level, 40) * STACK_MS);
			placed.set(point.id, { on: on(point), cx, cy: base - pitch / 2 - level * pitch, delay });
		}
		// The dots keep the order they came in: the stacking order changes with every stat, and a
		// dot moved in the page would jump to its new place instead of travelling there.
		const dots = valid.map((point) => ({ ...point, ...placed.get(point.id) }));
		return { dots, pitch, r: pitch * 0.42, base, height: base + AXIS, ticks: scale.ticks(tickCount) };
	});

	const hovered = $derived(hoveredId === null ? null : (layout?.dots.find((dot) => dot.id === hoveredId) ?? null));

	function nearest(event) {
		if (!layout) return null;
		const box = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - box.left;
		const y = event.clientY - box.top;
		const reach = Math.max(8, layout.pitch * 2);
		let best = null;
		let bestDistance = reach * reach;
		for (const dot of layout.dots) {
			const distance = (dot.cx - x) ** 2 + (dot.cy - y) ** 2;
			if (distance < bestDistance) {
				best = dot;
				bestDistance = distance;
			}
		}
		return best;
	}

	function open(event) {
		const dot = nearest(event);
		if (!dot) return;
		if (hoveredId === dot.id) goto(`/player/${dot.id}`);
		else hoveredId = dot.id;
	}

	// Keep the tooltip inside the chart near its edges.
	const tipAlign = $derived(
		!hovered ? 'middle' : hovered.cx < width * 0.18 ? 'start' : hovered.cx > width * 0.82 ? 'end' : 'middle'
	);
</script>

<div class="dot-distribution" bind:clientWidth={width}>
	{#if layout}
		<div
			class="dot-surface"
			class:pointing={hovered}
			role="presentation"
			onpointermove={(event) => (hoveredId = nearest(event)?.id ?? null)}
			onpointerleave={() => (hoveredId = null)}
			onclick={open}
		>
			<svg {width} height={layout.height} viewBox="0 0 {width} {layout.height}" role="img" aria-label={label}>
				<!-- A tick that stays slides with the scale; a new one fades in, an old one out. -->
				{#each layout.ticks as tick (tick)}
					<g class="dot-axis" style:transform="translateX({scale(tick)}px)" transition:fade={{ duration: prefersReducedMotion.current ? 0 : 220 }}>
						<line class="dot-grid" class:zero={tick === 0} x1="0" x2="0" y1="0" y2={layout.base} />
						<text class="dot-tick" x="0" y={layout.base + 16} text-anchor="middle">{formatTick(tick)}</text>
					</g>
				{/each}
				{#if Number.isFinite(mean)}
					<line class="dot-mean" x1="0" x2="0" y1="0" y2={layout.base} style:transform="translateX({scale(mean)}px)" />
				{/if}
				<!-- Across on the outer group, up or down on the dot: two timings make the path a curve. -->
				{#each layout.dots as dot (dot.id)}
					<g class="dot-slot" style:transform="translateX({dot.cx}px)" style:transition-delay="{dot.delay}ms">
						<circle
							class="dot"
							class:off={!dot.on}
							r={layout.r}
							style:transform="translateY({dot.cy}px)"
							style:transition-delay="{dot.delay}ms"
						/>
					</g>
				{/each}
				{#if hovered}
					<circle class="dot-ring" cx={hovered.cx} cy={hovered.cy} r={layout.r + 2.5} />
				{/if}
			</svg>
		</div>
		{#if hovered}
			<div
				class="dot-tip {tipAlign}"
				style:left="{hovered.cx}px"
				style:top="{hovered.cy - layout.r - 6}px"
			>
				<strong>{hovered.name}</strong>
				<span>{hovered.team ? `${hovered.team} · ` : ''}{formatValue(hovered.value)}</span>
			</div>
		{/if}
	{/if}
</div>

<style>
	.dot-distribution {
		position: relative;
		width: 100%;
		min-width: 0;
	}

	.dot-surface.pointing {
		cursor: pointer;
	}

	/* Sized by CSS, not by its width attribute, so the chart can shrink with its container:
	   otherwise the measured width holds the container open and never gets smaller. */
	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	.dot-slot {
		transition: transform 680ms cubic-bezier(0.65, 0, 0.35, 1);
	}

	.dot {
		fill: var(--text);
		transition:
			transform 680ms cubic-bezier(0.34, 1.45, 0.64, 1),
			fill 300ms ease;
	}

	.dot.off {
		fill: color-mix(in srgb, var(--graphic-muted) 32%, transparent);
	}

	.dot-axis,
	.dot-mean {
		transition: transform 680ms cubic-bezier(0.65, 0, 0.35, 1);
	}

	.dot-grid {
		stroke: var(--border-subtle);
		stroke-width: 1;
	}

	.dot-grid.zero {
		stroke: var(--border);
	}

	.dot-mean {
		stroke: var(--graphic-muted);
		stroke-dasharray: 3 4;
	}

	@media (prefers-reduced-motion: reduce) {
		.dot-slot,
		.dot,
		.dot-axis,
		.dot-mean {
			transition: none;
		}
	}

	.dot-ring {
		fill: none;
		stroke: var(--accent);
		stroke-width: 1.5;
	}

	.dot-tick {
		fill: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 11px;
	}

	.dot-tip {
		position: absolute;
		z-index: 2;
		display: grid;
		gap: 1px;
		padding: 5px 9px;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--bg-elevated);
		box-shadow: 0 4px 14px rgb(0 0 0 / 0.18);
		color: var(--text);
		font-size: 12px;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
		transform: translate(-50%, -100%);
	}

	.dot-tip.start {
		transform: translate(-12px, -100%);
	}

	.dot-tip.end {
		transform: translate(calc(-100% + 12px), -100%);
	}

	.dot-tip span {
		color: var(--text-secondary);
		font-family: var(--font-mono);
		font-size: 11px;
	}
</style>
