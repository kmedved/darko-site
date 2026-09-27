<script>
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import RewindRace from '$lib/components/RewindRace.svelte';
	import { timeMachine } from '$lib/timeMachineState.svelte.js';
	import {
		AS_OF_PARAM,
		formatAsOfDate,
		frameIndexAtOrBefore,
		parseAsOfDate,
		relativeHref,
		seasonLabelFromEndYear,
		withAsOf
	} from '$lib/utils/timeMachine.js';
	import { teamAbbrFromId } from '$lib/utils/teamAbbreviations.js';
	import {
		RACE_SPEEDS,
		RACE_STEP_MS,
		REWIND_JUMPS,
		firstFrameOfSeason,
		lastName,
		reignsThrough,
		seasonWeek
	} from '$lib/utils/rewind.js';

	let { data } = $props();

	const SPEED_KEY = 'darko-rewind-speed';
	let playing = $state(false);
	let speed = $state(1);
	let reduceMotion = $state(false);
	let timer = null;

	const frames = $derived(data.frames ?? []);
	const names = $derived(data.names ?? {});
	const frameDates = $derived(frames.map((frame) => frame.date));
	const urlDate = $derived(parseAsOfDate($page.url.searchParams.get(AS_OF_PARAM)));
	const activeDate = $derived(browser ? (timeMachine.date ?? urlDate) : urlDate);
	// -1 for a date before the first weekly frame: showing that later week as if it were the
	// chosen date would misstate the rankings, so the page says where they begin instead.
	const index = $derived.by(() => {
		if (!frames.length) return -1;
		if (!activeDate) return frames.length - 1;
		return frameIndexAtOrBefore(frameDates, activeDate);
	});
	const frame = $derived(index >= 0 ? frames[index] : null);
	const week = $derived(index >= 0 ? seasonWeek(frames, index) : null);
	const leader = $derived(frame?.players[0] ?? null);
	const reigns = $derived(index >= 0 ? reignsThrough(frames, index).slice(0, 10) : []);
	const reignMax = $derived(reigns[0]?.[1] ?? 1);
	const seasons = $derived([...new Set(frames.map((item) => item.season))].sort((a, b) => b - a));
	const duration = $derived(reduceMotion ? 0 : Math.round(RACE_STEP_MS / speed) - 40);
	const jumps = $derived(
		REWIND_JUMPS.map((date) => {
			const at = frameIndexAtOrBefore(frameDates, date);
			const target = frames[at];
			if (!target) return null;
			const name = names[target.players[0]?.[0]];
			return { index: at, label: `${seasonLabelFromEndYear(target.season)} · ${lastName(name)}` };
		}).filter(Boolean)
	);

	function signed(value, digits = 2) {
		return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
	}

	function goTo(target) {
		if (!frames.length) return;
		const next = frames[Math.min(Math.max(target, 0), frames.length - 1)];
		timeMachine.date = next.date;
		replaceState(relativeHref(withAsOf(new URL(window.location.href), next.date)), {});
	}

	function tick() {
		if (!playing) return;
		if (index >= frames.length - 1) {
			stop();
			return;
		}
		goTo(index + 1);
		timer = setTimeout(tick, Math.round(RACE_STEP_MS / speed));
	}

	function play() {
		if (index >= frames.length - 1) goTo(0);
		playing = true;
		clearTimeout(timer);
		timer = setTimeout(tick, Math.round(RACE_STEP_MS / speed));
	}

	function stop() {
		playing = false;
		clearTimeout(timer);
	}

	function togglePlay() {
		if (playing) stop();
		else play();
	}

	function step(delta) {
		stop();
		goTo(index + delta);
	}

	function setSpeed(next) {
		speed = next;
		try {
			localStorage.setItem(SPEED_KEY, String(next));
		} catch {
			// Storage can be unavailable; the speed still applies to this visit.
		}
		if (playing) {
			clearTimeout(timer);
			timer = setTimeout(tick, Math.round(RACE_STEP_MS / speed));
		}
	}

	$effect(() => {
		if (!browser) return;
		try {
			const saved = Number(localStorage.getItem(SPEED_KEY));
			if (RACE_SPEEDS.includes(saved)) speed = saved;
		} catch {
			// Keep the default speed.
		}
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduceMotion = query.matches;
		const update = () => (reduceMotion = query.matches);
		query.addEventListener('change', update);
		return () => {
			query.removeEventListener('change', update);
			clearTimeout(timer);
		};
	});
</script>

<svelte:head>
	<title>Rewind — DARKO DPM</title>
</svelte:head>

<div class="container rewind-page" data-shiny-page>
	<PageHeader eyebrow="Time Machine" title="Rewind">
		<p class="page-lede">
			DARKO has a rating for every player on every day since November 1996. Press play to watch
			the top 15 of every regular season, one week per beat. Each step moves the Time Machine
			above, so the rest of the site follows the date you land on.
		</p>
	</PageHeader>

	{#if !data.available || !frames.length}
		<div class="empty-state" data-shiny-surface="panel">
			Rewind needs DARKO's history tables, which arrive with the next data publish.
		</div>
	{:else if !frame}
		<div class="empty-state rewind-before" data-shiny-surface="panel">
			<p>
				DARKO's weekly rankings start with the week of {formatAsOfDate(frames[0].date)}, once players
				have three games; {formatAsOfDate(activeDate)} is earlier.
			</p>
			<button type="button" class="btn btn-primary" onclick={() => goTo(0)}>
				Go to {formatAsOfDate(frames[0].date, { short: true })}
			</button>
		</div>
	{:else}
		<section class="rewind-stage" data-shiny-surface="well" aria-label="Rewind controls">
			<div class="rewind-now">
				<span class="rewind-week">
					{seasonLabelFromEndYear(frame.season)} · week {week.week} of {week.weeks}
				</span>
				<span class="rewind-date">{formatAsOfDate(frame.date, { short: true })}</span>
				{#if leader}
					<span class="rewind-leader">
						No. 1: <a href={`/player/${leader[0]}?${AS_OF_PARAM}=${frame.date}`}>{names[leader[0]]}</a>
						<span class="rewind-leader-team">{teamAbbrFromId(leader[3])}</span>
						at <b>{signed(leader[1] / 100)}</b>
					</span>
				{/if}
			</div>
			<div class="rewind-controls">
				<button type="button" class="btn btn-primary rewind-play" onclick={togglePlay}>
					{#if playing}
						<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx="1" /><rect x="9.5" y="3" width="3" height="10" rx="1" /></svg>
						Pause
					{:else}
						<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4L13 8z" /></svg>
						Play
					{/if}
				</button>
				<button type="button" class="btn" aria-label="Previous week" onclick={() => step(-1)} disabled={index <= 0}>‹ Week</button>
				<button type="button" class="btn" aria-label="Next week" onclick={() => step(1)} disabled={index >= frames.length - 1}>Week ›</button>
				<div class="rw-seg" role="group" aria-label="Speed">
					{#each RACE_SPEEDS as option (option)}
						<button type="button" aria-pressed={speed === option} onclick={() => setSpeed(option)}>{option}×</button>
					{/each}
				</div>
				<label class="sr-only" for="rewind-season">Season</label>
				<select
					id="rewind-season"
					class="rw-select"
					value={frame.season}
					onchange={(event) => {
						stop();
						goTo(firstFrameOfSeason(frames, Number(event.currentTarget.value)));
					}}
				>
					{#each seasons as season (season)}
						<option value={season}>{seasonLabelFromEndYear(season)}</option>
					{/each}
				</select>
			</div>
			<div class="rewind-jumps">
				<span class="rewind-jumps-label">Jump to</span>
				{#each jumps as jump (jump.index)}
					<button
						type="button"
						class="btn btn-sm"
						class:is-active={jump.index === index}
						onclick={() => {
							stop();
							goTo(jump.index);
						}}
					>
						{jump.label}
					</button>
				{/each}
			</div>
		</section>

		<div class="rewind-layout">
			<section class="rewind-panel" data-shiny-surface="plot" aria-labelledby="rewind-race-title">
				<div class="rewind-panel-head">
					<div>
						<h2 id="rewind-race-title">Top 15 by DPM</h2>
						<p>
							Regular-season weeks. A player needs three games that season and one in the last four
							weeks. The scale is fixed so eras compare.
						</p>
					</div>
					<a class="rewind-link" href={`/?${AS_OF_PARAM}=${frame.date}`}>Full leaderboard this week →</a>
				</div>
				<RewindRace
					players={frame.players}
					{names}
					{duration}
					caption={`Top 15 by DPM, week of ${formatAsOfDate(frame.date)}`}
				/>
			</section>

			<aside class="rewind-panel" data-shiny-surface="panel" aria-labelledby="rewind-reigns-title">
				<h2 id="rewind-reigns-title">Weeks at No. 1</h2>
				<p>Since 1996-97, through this week</p>
				<ol class="rewind-reigns">
					{#each reigns as [id, weeks] (id)}
						<li class:now={id === leader?.[0]}>
							<a href={`/player/${id}?${AS_OF_PARAM}=${frame.date}`}>{names[id]}</a>
							<span class="rewind-reign-weeks">{weeks}</span>
							<span class="rewind-meter" aria-hidden="true"><i style:width={`${(weeks / reignMax) * 100}%`}></i></span>
						</li>
					{/each}
				</ol>
			</aside>
		</div>
	{/if}
</div>

<style>
	.rewind-page {
		padding-bottom: 64px;
	}

	.rewind-stage {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 14px 24px;
		align-items: end;
		padding: 18px 20px;
		margin-bottom: 16px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.rewind-now {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.rewind-week {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.rewind-date {
		font-family: var(--font-mono);
		font-size: 28px;
		font-weight: 700;
		line-height: 1.1;
		letter-spacing: -0.02em;
		color: var(--time-text);
		font-variant-numeric: tabular-nums;
	}

	.rewind-leader {
		color: var(--text-secondary);
	}

	.rewind-leader a {
		font-weight: 700;
		color: var(--text);
	}

	.rewind-leader-team {
		color: var(--text-muted);
	}

	.rewind-leader b {
		font-family: var(--font-mono);
		color: var(--text);
	}

	.rewind-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
		justify-content: flex-end;
	}

	.rw-seg button,
	.rw-select {
		height: 32px;
		padding: 0 12px;
		font-family: var(--font-sans);
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.rewind-play {
		min-width: 92px;
	}

	.rewind-play svg {
		width: 13px;
		height: 13px;
		fill: currentColor;
	}

	.rw-seg button:hover {
		color: var(--text);
		border-color: var(--text-muted);
	}

	.rewind-before {
		display: grid;
		justify-items: center;
		gap: 12px;
	}

	.rewind-before p {
		margin: 0;
	}

	.rw-seg {
		display: inline-flex;
	}

	.rw-seg button {
		border-radius: 0;
		padding: 0 10px;
	}

	.rw-seg button:first-child {
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
	}

	.rw-seg button:last-child {
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.rw-seg button + button {
		margin-left: -1px;
	}

	.rw-seg button[aria-pressed='true'] {
		position: relative;
		color: var(--text);
		background: var(--bg-hover);
		border-color: var(--text-muted);
	}

	.rw-select {
		padding-right: 8px;
	}

	.rewind-jumps {
		grid-column: 1 / -1;
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}

	.rewind-jumps-label {
		margin-right: 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.rw-seg button:focus-visible,
	.rw-select:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.rewind-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 16px;
		align-items: start;
	}

	.rewind-panel {
		min-width: 0;
		padding: 18px 20px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.rewind-panel h2 {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.rewind-panel p {
		margin: 2px 0 14px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.rewind-panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.rewind-link {
		flex: none;
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}

	.rewind-reigns {
		display: grid;
		gap: 10px;
		list-style: none;
	}

	.rewind-reigns li {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 4px 10px;
		align-items: baseline;
	}

	.rewind-reigns a {
		overflow: hidden;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.rewind-reigns li.now a {
		color: var(--time-text);
	}

	.rewind-reign-weeks {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.rewind-meter {
		grid-column: 1 / -1;
		height: 5px;
		overflow: hidden;
		background: var(--border-subtle);
		border-radius: 3px;
	}

	.rewind-meter i {
		display: block;
		height: 100%;
		background: color-mix(in srgb, var(--text-secondary) 55%, transparent);
		border-radius: 3px;
	}

	.rewind-reigns li.now .rewind-meter i {
		background: var(--time);
	}

	@media (max-width: 1000px) {
		.rewind-layout {
			grid-template-columns: 1fr;
		}

		.rewind-stage {
			grid-template-columns: 1fr;
		}

		.rewind-controls {
			justify-content: flex-start;
		}
	}

	@media (max-width: 560px) {
		.rewind-date {
			font-size: 20px;
		}

		.rewind-panel,
		.rewind-stage {
			padding: 14px;
		}

		.rewind-panel-head {
			flex-direction: column;
			gap: 0;
		}

		.rewind-link {
			margin-bottom: 10px;
		}
	}

</style>
