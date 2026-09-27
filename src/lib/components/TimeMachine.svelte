<script>
	import * as d3 from 'd3';
	import { browser } from '$app/environment';
	import { goto, preloadData } from '$app/navigation';
	import { page } from '$app/stores';
	import { setTimeMachineCollapsed, timeMachine } from '$lib/timeMachineState.svelte.js';
	import {
		HISTORY_START,
		addDays,
		formatAsOfDate,
		frameIndexAtOrBefore,
		isDateAwarePath,
		locateDate,
		relativeHref,
		seasonLabelFromEndYear,
		withAsOf
	} from '$lib/utils/timeMachine.js';

	const KEY_COMMIT_DELAY_MS = 320;
	const PRELOAD_DWELL_MS = 160;
	// A preview is a date under the pointer or keys before it is committed; TODAY previews today.
	const TODAY = 'today';
	const PHASE_LABELS = {
		preseason: 'preseason',
		regular: 'regular season',
		playoffs: 'playoffs',
		offseason: 'offseason'
	};

	let timeline = $state(null);
	let stripWidth = $state(0);
	let preview = $state(null);
	let hover = $state(null);
	let dragging = $state(false);
	let pickerOpen = $state(false);
	let pickerValue = $state('');
	let expanded = $state(false);
	let commitTimer = null;
	let preloadTimer = null;
	let svgEl = $state(null);

	const asOf = $derived(timeMachine.date);
	const rewound = $derived(asOf !== null);
	const pathname = $derived($page.url.pathname);
	const dateAware = $derived(isDateAwarePath(pathname));
	const calendar = $derived(timeline?.calendar ?? []);
	const trace = $derived(timeline?.trace ?? []);
	const frameDates = $derived(trace.map((point) => point[0]));
	const lastGame = $derived(
		calendar.reduce((latest, row) => (row.last_game > latest ? row.last_game : latest), HISTORY_START)
	);
	const todayEdge = $derived(addDays(lastGame, 45));
	const shown = $derived(preview === TODAY ? null : (preview ?? asOf));
	const located = $derived(shown ? locateDate(calendar, shown) : null);
	const pad = 8;
	const x = $derived(
		d3
			.scaleUtc()
			.domain([new Date(`${addDays(HISTORY_START, -20)}T00:00:00Z`), new Date(`${todayEdge}T00:00:00Z`)])
			.range([pad, Math.max(pad + 1, stripWidth - pad)])
	);
	const y = $derived(d3.scaleLinear().domain([2, 10]).range([23, 5]).clamp(true));
	const tracePath = $derived.by(() => {
		if (!trace.length || stripWidth <= 0) return '';
		let d = '';
		for (const [date, dpm] of trace) {
			if (dpm === null) continue;
			d += `${d ? 'L' : 'M'}${x(new Date(`${date}T00:00:00Z`)).toFixed(1)} ${y(dpm).toFixed(1)}`;
		}
		return d;
	});
	const seasonBands = $derived(
		calendar.map((row) => ({
			season: row.season,
			x0: x(new Date(`${row.first_game}T00:00:00Z`)),
			x1: x(new Date(`${row.regular_season_end}T00:00:00Z`))
		}))
	);
	const decadeTicks = $derived(
		calendar
			.filter((row) => (row.season - 1) % 10 === 0)
			.map((row) => ({ label: String(row.season - 1), x: x(new Date(`${row.first_game}T00:00:00Z`)) }))
	);
	const handleX = $derived(shown ? x(new Date(`${shown}T00:00:00Z`)) : x(new Date(`${todayEdge}T00:00:00Z`)));

	$effect(() => {
		if (!browser || timeline) return;
		fetch('/api/history/timeline')
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				timeline = data ?? { calendar: [], trace: [] };
			})
			.catch(() => {
				timeline = { calendar: [], trace: [] };
			});
	});

	$effect(() => {
		void pathname;
		expanded = false;
		pickerOpen = false;
	});

	function dateAtPixel(pixel) {
		return x.invert(pixel).toISOString().slice(0, 10);
	}

	/** The nearest weekly frame, or null (today) past the last season. */
	function snap(date) {
		if (!frameDates.length) return date > lastGame ? null : date < HISTORY_START ? HISTORY_START : date;
		if (date > addDays(frameDates.at(-1), 30) && date > lastGame) return null;
		const index = frameIndexAtOrBefore(frameDates, date);
		if (index < 0) return frameDates[0];
		const next = frameDates[index + 1];
		if (next && Date.parse(next) - Date.parse(date) < Date.parse(date) - Date.parse(frameDates[index])) {
			return next;
		}
		return frameDates[index];
	}

	// Resting on a week (pointer or keys) preloads that date's page, so the commit lands at once.
	// Rewind reads the date in the browser, so it never needs a preload.
	function schedulePreload(date) {
		clearTimeout(preloadTimer);
		const path = $page.url.pathname;
		if (!date || date === TODAY || !isDateAwarePath(path) || path === '/rewind') return;
		preloadTimer = setTimeout(() => {
			preloadData(relativeHref(withAsOf($page.url, date))).catch(() => {});
		}, PRELOAD_DWELL_MS);
	}

	function commit(date) {
		clearTimeout(commitTimer);
		preview = null;
		if ((date ?? null) === (timeMachine.date ?? null)) return;
		timeMachine.date = date ?? null;
		void goto(relativeHref(withAsOf($page.url, date ?? null)), { noScroll: true, keepFocus: true });
	}

	function pointerDate(event) {
		const rect = svgEl.getBoundingClientRect();
		return snap(dateAtPixel(Math.min(Math.max(event.clientX - rect.left, 0), rect.width)));
	}

	function handlePointerDown(event) {
		if (event.button !== 0) return;
		dragging = true;
		svgEl.setPointerCapture?.(event.pointerId);
		preview = pointerDate(event) ?? TODAY;
	}

	function handlePointerMove(event) {
		const date = pointerDate(event);
		if (dragging) preview = date ?? TODAY;
		const rect = svgEl.getBoundingClientRect();
		hover = { date, left: event.clientX - rect.left };
		if (!hover.date || hover.date !== previousHoverDate) schedulePreload(date);
		previousHoverDate = date;
	}

	let previousHoverDate = null;

	function handlePointerUp(event) {
		if (!dragging) return;
		dragging = false;
		commit(pointerDate(event));
	}

	function handlePointerLeave() {
		hover = null;
	}

	function stepFrames(delta) {
		if (!frameDates.length) return;
		const current = preview === TODAY ? null : (preview ?? asOf);
		let index = current ? frameIndexAtOrBefore(frameDates, current) : frameDates.length;
		index = Math.min(Math.max(index + delta, 0), frameDates.length);
		preview = index >= frameDates.length ? TODAY : frameDates[index];
		scheduleCommit();
	}

	function stepSeasons(delta) {
		if (!frameDates.length || !calendar.length) return;
		const current = (preview === TODAY ? null : (preview ?? asOf)) ?? frameDates.at(-1);
		const season = locateDate(calendar, current)?.season ?? calendar.at(-1).season;
		const target = calendar.find((row) => row.season === season + delta);
		if (!target) {
			if (delta > 0) {
				preview = TODAY;
				scheduleCommit();
			}
			return;
		}
		preview = snap(target.regular_season_end);
		scheduleCommit();
	}

	function scheduleCommit() {
		schedulePreload(preview);
		clearTimeout(commitTimer);
		commitTimer = setTimeout(() => commit(preview === TODAY ? null : preview), KEY_COMMIT_DELAY_MS);
	}

	function handleKeydown(event) {
		const actions = {
			ArrowLeft: () => (event.shiftKey ? stepSeasons(-1) : stepFrames(-1)),
			ArrowDown: () => stepFrames(-1),
			ArrowRight: () => (event.shiftKey ? stepSeasons(1) : stepFrames(1)),
			ArrowUp: () => stepFrames(1),
			PageDown: () => stepSeasons(-1),
			PageUp: () => stepSeasons(1),
			Home: () => {
				preview = frameDates[0] ?? HISTORY_START;
				scheduleCommit();
			},
			End: () => {
				preview = TODAY;
				scheduleCommit();
			}
		};
		const action = actions[event.key];
		if (!action) return;
		event.preventDefault();
		action();
	}

	function openPicker() {
		pickerValue = asOf ?? '';
		pickerOpen = !pickerOpen;
	}

	function submitPicker(event) {
		event.preventDefault();
		if (!pickerValue) return;
		pickerOpen = false;
		commit(pickerValue > lastGame && lastGame > HISTORY_START ? null : pickerValue);
	}

	// Folding the strip hands focus to its nav toggle, so the keyboard does not lose its place.
	function collapse() {
		pickerOpen = false;
		expanded = false;
		setTimeMachineCollapsed(true);
		requestAnimationFrame(() => document.getElementById('tm-nav-toggle')?.focus());
	}

	function hoverLabel(date) {
		if (!date) return 'Today';
		const place = locateDate(calendar, date);
		const index = frameIndexAtOrBefore(frameDates, date);
		const leader = index >= 0 && frameDates[index] === date ? trace[index] : null;
		const season = place ? seasonLabelFromEndYear(place.season) : '';
		return { date: formatAsOfDate(date, { short: true }), season, leader };
	}

	const statusText = $derived.by(() => {
		if (!shown) return 'Today';
		return formatAsOfDate(shown, { short: true });
	});
	const contextText = $derived.by(() => {
		if (!shown || !located) return rewound || preview ? '' : 'Drag back to any week since 1996-97';
		return `${seasonLabelFromEndYear(located.season)} ${PHASE_LABELS[located.phase] ?? ''}`.trim();
	});
</script>

<div id="time-machine" class="time-machine" class:rewound class:expanded>
	<div class="tm-row container">
		<div class="tm-label" title="Time Machine">
			<svg class="tm-icon" viewBox="0 0 20 20" aria-hidden="true">
				<path d="M4.2 7.2A6.5 6.5 0 1 1 3.5 12" />
				<path d="M3.2 3.6v3.9h3.9" />
				<path d="M10 6.2V10l2.6 1.7" />
			</svg>
			<span class="tm-title">Time Machine</span>
			<span class="tm-date" aria-live="polite">{statusText}</span>
			{#if contextText}<span class="tm-context">{contextText}</span>{/if}
		</div>

		<div class="tm-track" class:empty={!calendar.length}>
			<!-- Measured without the track's phone padding, so the timeline ends on screen. -->
			<div class="tm-track-inner" bind:clientWidth={stripWidth}>
				{#if stripWidth > 0 && calendar.length}
					<svg
						bind:this={svgEl}
						class="tm-svg"
						class:dragging
						width={stripWidth}
						height="30"
						viewBox={`0 0 ${stripWidth} 30`}
						role="slider"
						tabindex="0"
						aria-label="Time Machine date. Arrow keys move a week, Shift+arrow a season, End returns to today."
						aria-valuemin={0}
						aria-valuemax={frameDates.length}
						aria-valuenow={shown ? Math.max(0, frameIndexAtOrBefore(frameDates, shown)) : frameDates.length}
						aria-valuetext={shown ? formatAsOfDate(shown) : 'Today'}
						onpointerdown={handlePointerDown}
						onpointermove={handlePointerMove}
						onpointerup={handlePointerUp}
						onpointercancel={() => (dragging = false)}
						onpointerleave={handlePointerLeave}
						onkeydown={handleKeydown}
					>
						{#each seasonBands as band (band.season)}
							<rect
								class="tm-band"
								x={band.x0}
								y="26"
								width={Math.max(1, band.x1 - band.x0)}
								height="3"
								rx="1"
							/>
						{/each}
						{#each decadeTicks as tick (tick.label)}
							<text class="tm-tick" x={tick.x + 2} y="9">{tick.label}</text>
						{/each}
						{#if tracePath}<path class="tm-trace" d={tracePath} />{/if}
						{#if hover && !dragging}
							<line class="tm-hover" x1={hover.left} x2={hover.left} y1="2" y2="29" />
						{/if}
						<g class="tm-handle" class:today={!shown} transform={`translate(${handleX},0)`}>
							<line y1="1" y2="29" />
							<circle cy="24.5" r="4.5" />
						</g>
					</svg>
					{#if hover}
						{@const label = hoverLabel(hover.date)}
						<div
							class="tm-tooltip"
							style:left={`${Math.min(Math.max(hover.left, 90), stripWidth - 90)}px`}
							aria-hidden="true"
						>
							{#if typeof label === 'string'}
								<b>{label}</b>
							{:else}
								<b>{label.date}</b> · {label.season}
								{#if label.leader}<span class="tm-leader">No. 1: {label.leader[2]} {label.leader[1] >= 0 ? '+' : ''}{label.leader[1].toFixed(1)}</span>{/if}
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		</div>

		<div class="tm-actions">
			{#if rewound && !dateAware}
				<span class="tm-note" title="This page always shows today's data">Page shows today's data</span>
			{/if}
			<!-- Phones hide the timeline behind this toggle, so it says what it opens. -->
			<button
				type="button"
				class="btn btn-sm tm-expand"
				aria-label="Timeline"
				aria-expanded={expanded}
				onclick={() => (expanded = !expanded)}
			>
				<svg class="btn-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h12" /><circle cx="10" cy="8" r="2.2" /></svg>
				<span class="tm-expand-label">Timeline</span>
			</button>
			<div class="tm-picker">
				<button
					type="button"
					class="btn btn-sm btn-icon"
					aria-expanded={pickerOpen}
					aria-haspopup="dialog"
					aria-label="Pick a date"
					title="Pick a date"
					onclick={openPicker}
				>
					<svg viewBox="0 0 16 16" aria-hidden="true">
						<rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
						<path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" />
					</svg>
				</button>
				{#if pickerOpen}
					<div class="tm-popover" role="dialog" aria-label="Pick a Time Machine date">
					<form onsubmit={submitPicker}>
						<label>
							<span>Show DARKO as of</span>
							<input
								type="date"
								min={HISTORY_START}
								max={lastGame > HISTORY_START ? lastGame : undefined}
								bind:value={pickerValue}
							/>
						</label>
						<div class="tm-popover-actions">
							<button type="button" class="btn btn-sm" onclick={() => (pickerOpen = false)}>Cancel</button>
							<button type="submit" class="btn btn-sm btn-primary">Go</button>
						</div>
					</form>
					</div>
				{/if}
			</div>
			{#if rewound}
				<button type="button" class="btn btn-sm btn-primary" aria-label="Back to today" onclick={() => commit(null)}>
					<span class="tm-wide-label">Back to today</span><span class="tm-narrow-label" aria-hidden="true">Today</span>
				</button>
			{:else if pathname !== '/rewind'}
				<a class="btn btn-sm" href="/rewind">Rewind</a>
			{/if}
			<button
				type="button"
				class="btn btn-sm btn-icon tm-collapse"
				aria-controls="time-machine"
				aria-expanded="true"
				aria-label="Hide the Time Machine"
				title="Hide the Time Machine"
				onclick={collapse}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 10l5-5 5 5" /></svg>
			</button>
		</div>
	</div>
</div>

<style>
	.time-machine {
		position: relative;
		height: var(--time-machine-height);
		border-top: 1px solid var(--border-subtle);
		background: var(--bg-nav);
		font-size: 12px;
		color: var(--text-secondary);
	}

	.time-machine.rewound {
		background: color-mix(in srgb, var(--time) 6%, var(--bg-nav));
		border-top-color: color-mix(in srgb, var(--time) 35%, transparent);
	}

	:global(:root[data-time-machine='collapsed']) .time-machine {
		display: none;
	}

	.tm-row {
		display: flex;
		align-items: center;
		gap: 14px;
		height: 100%;
	}

	.tm-label {
		display: flex;
		flex: none;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
		white-space: nowrap;
	}

	.tm-icon {
		align-self: center;
		width: 15px;
		height: 15px;
		fill: none;
		stroke: var(--text-muted);
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.rewound .tm-icon {
		stroke: var(--time);
	}

	.tm-title {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.tm-date {
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.rewound .tm-date {
		color: var(--time-text);
	}

	.tm-context {
		color: var(--text-muted);
	}

	.tm-track {
		position: relative;
		flex: 1;
		min-width: 160px;
		height: 30px;
	}

	.tm-track-inner {
		position: relative;
		height: 30px;
	}

	.tm-narrow-label {
		display: none;
	}

	.tm-svg {
		display: block;
		cursor: pointer;
		touch-action: none;
		border-radius: 4px;
	}

	.tm-svg.dragging {
		cursor: grabbing;
	}

	.tm-svg:focus {
		outline: none;
	}

	.tm-svg:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.tm-band {
		fill: var(--border);
	}

	.tm-tick {
		font-size: 11px;
		fill: var(--text-secondary);
	}

	.tm-trace {
		fill: none;
		stroke: var(--text-secondary);
		stroke-width: 1.5;
		stroke-linejoin: round;
	}

	.tm-hover {
		stroke: var(--text-muted);
		stroke-width: 1;
		stroke-dasharray: 2 2;
	}

	.tm-handle line {
		stroke: var(--time);
		stroke-width: 2;
	}

	.tm-handle circle {
		fill: var(--time);
		stroke: var(--bg-nav);
		stroke-width: 2;
	}

	/* At today the handle is neutral but still clearly visible; rewound, it takes the accent. */
	.tm-handle.today line {
		stroke: var(--text-secondary);
	}

	.tm-handle.today circle {
		fill: var(--text);
	}

	.tm-tooltip {
		position: absolute;
		top: 34px;
		z-index: 120;
		display: grid;
		gap: 2px;
		padding: 6px 9px;
		transform: translateX(-50%);
		white-space: nowrap;
		pointer-events: none;
		color: var(--text);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
	}

	.tm-leader {
		color: var(--text-secondary);
	}

	.tm-actions {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
	}

	.tm-note {
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 600;
		white-space: nowrap;
	}

	.tm-expand {
		display: none;
	}

	.expanded .tm-expand {
		border-color: var(--accent);
	}

	.tm-picker {
		position: relative;
	}

	.tm-popover form {
		display: grid;
		gap: 10px;
	}

	.tm-popover {
		position: absolute;
		top: 34px;
		right: 0;
		z-index: 130;
		display: grid;
		gap: 10px;
		width: 230px;
		padding: 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
	}

	.tm-popover label {
		display: grid;
		gap: 6px;
		color: var(--text-secondary);
	}

	.tm-popover input {
		padding: 6px 8px;
		font-family: var(--font-sans);
		color: var(--text);
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.tm-popover-actions {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
	}

	@media (max-width: 1320px) {
		.tm-title {
			display: none;
		}
	}

	@media (max-width: 1180px) {
		.tm-row {
			padding: 0 16px;
		}
	}

	@media (max-width: 900px) {
		.tm-context,
		.tm-note {
			display: none;
		}
	}

	@media (max-width: 720px) {
		.tm-row {
			gap: 8px;
		}

		.tm-track {
			position: absolute;
			top: calc(var(--time-machine-height) - 1px);
			left: 0;
			right: 0;
			display: none;
			height: 44px;
			padding: 6px 16px 8px;
			background: var(--bg-nav);
			border-bottom: 1px solid var(--border);
		}

		.expanded .tm-track {
			display: block;
		}

		.tm-expand {
			display: inline-flex;
		}

		/* The date never gives way: the actions are sized so it always fits from 360px up. */
		.tm-label {
			flex: 1 0 auto;
		}
	}

	@media (max-width: 480px) {
		.tm-wide-label {
			display: none;
		}

		.tm-narrow-label {
			display: inline;
		}
	}

	@media (max-width: 359px) {
		.tm-expand-label {
			display: none;
		}
	}

	:global(:root[data-view='shiny']) .time-machine {
		background: #f5f5f5;
		border-top-color: #e3e3e3;
		border-bottom: 1px solid #e3e3e3;
		font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
	}

	:global(:root[data-view='shiny']) .time-machine.rewound {
		background: color-mix(in srgb, #337ab7 7%, #f5f5f5);
	}
</style>
