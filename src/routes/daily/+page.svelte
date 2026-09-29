<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import OffenseDefenseBar from '$lib/components/OffenseDefenseBar.svelte';
	import OffenseDefenseGlyph from '$lib/components/OffenseDefenseGlyph.svelte';
	import OffenseDefenseSplit from '$lib/components/OffenseDefenseSplit.svelte';
	import LeadTrendChart from '$lib/components/LeadTrendChart.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import WatchStar from '$lib/components/WatchStar.svelte';
	import { timeMachine } from '$lib/timeMachineState.svelte.js';
	import {
		EDITIONS,
		UPDATE_MIN_MINUTES,
		WINDOWS,
		ageRecordText,
		chooseWindow,
		datedSeriesFrom,
		editionPhase,
		headline,
		lastName,
		lede,
		pickMovers,
		seriesFrom,
		windowFor
	} from '$lib/utils/daily.js';
	import { formatGameDate, formatSigned, seasonLabel } from '$lib/utils/seismograph.js';
	import { teamAbbr, teamAbbrFromId } from '$lib/utils/teamAbbreviations.js';
	import { formatAsOfDate, relativeHref, withAsOf } from '$lib/utils/timeMachine.js';
	import { startWatchlist, watchlist } from '$lib/utils/watchlist.js';

	let { data } = $props();

	const WINDOW_KEY = 'darko-daily-window';
	let requested = $state('7');
	let fetchedCards = $state(null);

	onMount(() => {
		startWatchlist();
		try {
			const saved = localStorage.getItem(WINDOW_KEY);
			if (saved) requested = saved;
		} catch {
			// No storage: the page starts on the week each time.
		}
	});

	function pickWindow(key) {
		requested = key;
		try {
			localStorage.setItem(WINDOW_KEY, key);
		} catch {
			// The choice still holds for this visit.
		}
	}

	const latest = $derived(data.mode === 'latest');
	const ready = $derived(latest && data.available);
	const choice = $derived(ready ? chooseWindow(data.windows, requested) : { key: 'season', fellBack: false });
	const windowKey = $derived(choice.key);
	const windowText = $derived(windowFor(windowKey).text);
	const movers = $derived(ready ? pickMovers(data.windows[windowKey], windowKey) : null);
	const updates = $derived(ready ? (data.updates[windowKey] ?? []) : []);
	const phase = $derived(ready ? editionPhase(data.updates['7']) : 'offseason');
	const leader = $derived(data.board?.[0] ?? null);
	const seasonText = $derived(data.season ? seasonLabel(data.season) : '');
	const leadSeries = $derived(leader && ready ? datedSeriesFrom(data.series[leader.id], data.seasonStart) : []);

	const watching = $derived($watchlist.length > 0);
	const cards = $derived(watching ? (fetchedCards ?? []) : (data.suggested ?? []));

	// Followed players load from the watchlist API; the suggested rookies come with the page.
	$effect(() => {
		const ids = $watchlist;
		if (!ready || !ids.length) {
			fetchedCards = null;
			return;
		}
		const controller = new AbortController();
		fetch(`/api/daily/watch?ids=${ids.join(',')}`, { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : null))
			.then((body) => {
				if (body) fetchedCards = body.cards;
			})
			.catch(() => {});
		return () => controller.abort();
	});

	const title = $derived.by(() => {
		if (!latest) return `${seasonText}: ${leader ? lastName(leader.name) : '—'} on top`;
		return headline({ leader, riser: movers?.risers[0] ?? null, phase, key: windowKey });
	});
	const ledeText = $derived(
		latest && ready
			? lede({
					leader,
					riser: movers?.risers[0] ?? null,
					faller: movers?.fallers[0] ?? null,
					phase,
					key: windowKey,
					minGames: movers?.minGames,
					nextSeasonLabel: data.season ? seasonLabel(data.season + 1) : 'next season'
				})
			: ''
	);
	const eyebrow = $derived(
		latest
			? `The Daily · ${EDITIONS[phase]}${ready ? ` · ${formatAsOfDate(data.end)}` : ''}`
			: `The Daily · Rewound · ${formatAsOfDate(data.date)}`
	);

	function teamOfId(tmId) {
		return teamAbbrFromId(tmId) || 'FA';
	}

	function teamOfName(name) {
		return teamAbbr(name) || 'FA';
	}

	function updateMeta(row) {
		const opponent = teamAbbrFromId(row.opp_id);
		return `${opponent ? `vs ${opponent} · ` : ''}${Math.round(row.minutes)} min · ${formatSigned(row.dpm_before, 2)} → ${formatSigned(row.dpm_after, 2)}`;
	}

	function backToToday() {
		timeMachine.date = null;
		void goto(relativeHref(withAsOf($page.url, null)));
	}
</script>

<svelte:head>
	<title>The Daily — DARKO DPM</title>
</svelte:head>

{#snippet deltaText(value, digits = 2)}
	<span class="delta" class:up={value > 0} class:down={value < 0}>{formatSigned(value, digits)}</span>
{/snippet}

{#snippet boardList(rows, from)}
	<ol class="board" start={from}>
		{#each rows as row, index (row.id)}
			<li>
				<a class="board-row" href="/player/{row.id}">
					<span class="board-rank">{from + index}</span>
					<span class="board-name">{row.name}</span>
					<span class="board-team">{teamOfName(row.team)}</span>
					{#if ready}
						<Sparkline values={seriesFrom(data.series[row.id], data.seasonStart)} width={96} height={22} />
					{:else}
						<span></span>
					{/if}
					<span class="board-value">{formatSigned(row.dpm, 1)}</span>
				</a>
			</li>
		{/each}
	</ol>
{/snippet}

<div class="container daily-page" data-shiny-page>
	<PageHeader {eyebrow} {title} class="page-header--editorial">
		{#if latest}
			{#if ledeText}<p class="page-lede">{ledeText}</p>{/if}
		{:else}
			<p class="page-lede">
				The Daily follows the latest ratings game by game. For an earlier date it shows that day's board and
				the season's best, from DARKO's history. Return to today for the current edition.
			</p>
		{/if}
		{#snippet actions()}
			{#if !latest}
				<a class="btn" href="/rewind?asof={data.date}">Play {seasonText} in Rewind</a>
				<button class="btn" type="button" onclick={backToToday}>Back to today</button>
			{/if}
		{/snippet}
	</PageHeader>

	{#if latest}
		<div class="daily-grid">
			<section class="daily-panel" aria-labelledby="daily-board-title" data-shiny-surface="panel">
				<header class="panel-head">
					<div>
						<h2 id="daily-board-title">Top of the board</h2>
						<p class="panel-sub">DPM, points per 100 possessions above average</p>
					</div>
					<a class="panel-link" href="/">Full leaderboard →</a>
				</header>
				{#if leader}
					<div class="lead">
						<div class="lead-top">
							<div class="lead-name">
								<span class="lead-eyebrow">No. 1 · {leader.team ?? 'Free agent'}</span>
								<h3><a href="/player/{leader.id}">{leader.name}</a></h3>
								<OffenseDefenseSplit offense={leader.offense} defense={leader.defense} />
							</div>
							<span class="lead-value">{formatSigned(leader.dpm, 1)}</span>
						</div>
						{#if leadSeries.length > 1}
							<div class="lead-chart">
								<LeadTrendChart
									points={leadSeries}
									label="{leader.name}'s DPM through {seasonText}, game by game"
								/>
								<p class="lead-caption">{leader.name}'s DPM through {seasonText}, game by game</p>
							</div>
						{/if}
					</div>
					{@render boardList(data.board.slice(1), 2)}
				{:else}
					<p class="empty">No ratings yet.</p>
				{/if}
			</section>

			<section class="daily-panel" aria-labelledby="daily-movers-title" data-shiny-surface="panel">
				<header class="panel-head">
					<div>
						<h2 id="daily-movers-title">Movers</h2>
						<p class="panel-sub">Change in DPM {windowText}</p>
					</div>
					{#if ready}
						<div class="window-switch" role="group" aria-label="Window">
							{#each WINDOWS as option (option.key)}
								<button
									type="button"
									class:active={windowKey === option.key}
									aria-pressed={windowKey === option.key}
									onclick={() => pickWindow(option.key)}
								>
									{option.label}
								</button>
							{/each}
						</div>
					{/if}
				</header>
				{#if !ready}
					<p class="empty">Movers arrive with the next data publish.</p>
				{:else}
					{#if choice.fellBack}
						<p class="panel-note">
							No games in the last {windowFor(requested).label.toLowerCase()}, so this shows the whole season.
						</p>
					{/if}
					<div class="movers">
						{#each [['Risers', movers.risers], ['Fallers', movers.fallers]] as [label, rows] (label)}
							<div>
								<p class="movers-head"><span>{label}</span><span>Change</span></p>
								{#each rows as row (row.id)}
									<a class="mover" href="/player/{row.id}">
										<span class="mover-who">
											<b>{row.name}</b>
											<span>{teamOfId(row.tmId)} · {row.games} games · now {formatSigned(row.to, 1)}</span>
										</span>
										<Sparkline values={seriesFrom(data.series[row.id], data.starts[windowKey])} width={72} height={24} />
										{@render deltaText(row.delta)}
									</a>
								{:else}
									<p class="empty">No {label.toLowerCase()} yet.</p>
								{/each}
							</div>
						{/each}
					</div>
					<p class="panel-note">Players with {movers.minGames}+ games in the window.</p>
				{/if}
			</section>

			<section class="daily-panel" aria-labelledby="daily-updates-title" data-shiny-surface="panel">
				<header class="panel-head">
					<div>
						<h2 id="daily-updates-title">Biggest single-game updates</h2>
						<p class="panel-sub">
							How far one game moved a rating {windowText}, split into offense
							<OffenseDefenseGlyph side="offense" /> and defense <OffenseDefenseGlyph side="defense" />
						</p>
					</div>
				</header>
				{#if !ready}
					<p class="empty">Game-by-game updates arrive with the next data publish.</p>
				{:else}
					{#each updates as row (`${row.nba_id}-${row.date}`)}
						<a class="update" href="/player/{row.nba_id}#seismograph">
							<span class="update-date">{formatGameDate(row.date)}</span>
							<span class="mover-who">
								<b>{row.player_name}</b>
								<span>{updateMeta(row)}</span>
							</span>
							<span class="update-bar"><OffenseDefenseBar offense={row.o_update} defense={row.d_update} max={2.2} /></span>
							{@render deltaText(row.dpm_update)}
						</a>
					{:else}
						<p class="empty">No games in this window.</p>
					{/each}
					<p class="panel-note">
						Games of {UPDATE_MIN_MINUTES}+ minutes. Open any player to see every update in the Seismograph.
					</p>
				{/if}
			</section>

			<section class="daily-panel" aria-labelledby="daily-records-title" data-shiny-surface="panel">
				<header class="panel-head">
					<div>
						<h2 id="daily-records-title">Ahead of the curve</h2>
						<p class="panel-sub">{seasonText} seasons that rank top 5 for the player's age since 1996-97</p>
					</div>
				</header>
				{#if !data.records}
					<p class="empty">Age records arrive with the next data publish.</p>
				{:else}
					{#each data.records as row (row.nba_id)}
						<a class="record" href="/player/{row.nba_id}#comps">
							<span class="record-rank">#{row.age_rank}<small>{` of ${row.age_count}`}</small></span>
							<p><b>{row.player_name}</b> {ageRecordText(row)}</p>
						</a>
					{:else}
						<p class="empty">No age records this season.</p>
					{/each}
					<p class="panel-note">Season-end DPM, 20+ regular-season games. Open a player for comps and futures.</p>
				{/if}
			</section>

			{#if ready}
				<section class="daily-panel daily-wide" aria-labelledby="daily-watch-title" data-shiny-surface="panel">
					<header class="panel-head">
						<div>
							<h2 id="daily-watch-title">{watching ? 'Your watchlist' : 'Start a watchlist'}</h2>
							<p class="panel-sub">
								{#if watching}
									Change {windowText}
								{:else}
									Suggested: this season's top rookies. Tap the star on any player to follow them here; the list
									stays in this browser.
								{/if}
							</p>
						</div>
					</header>
					<div class="watch-grid">
						{#each cards as card (card.id)}
							{@const change = card.changes[windowKey]}
							<div class="watch-card">
								<div class="watch-top">
									<a href="/player/{card.id}">{card.name}</a>
									<WatchStar nbaId={card.id} name={card.name} />
								</div>
								<p class="watch-meta">{teamOfName(card.team)} · #{card.rank} now</p>
								<div class="watch-numbers">
									<span class="watch-value">{formatSigned(card.dpm, 1)}</span>
									{#if change}{@render deltaText(change.delta)}{:else}<span class="watch-idle">No games</span>{/if}
								</div>
								<Sparkline values={seriesFrom(card.series, data.starts[windowKey])} width={200} height={34} />
							</div>
						{:else}
							<p class="empty">{watching ? 'Loading your players…' : 'No rookies to suggest yet.'}</p>
						{/each}
					</div>
				</section>
			{/if}

			<div class="daily-wide promos">
				<a class="promo" href="/lab" data-shiny-surface="panel">
					<span class="promo-eyebrow">{phase === 'offseason' ? "It's the offseason" : 'Trade machine'}</span>
					<h3>Roster Lab</h3>
					<p>Rebuild any rotation, trade between two teams and see the rating, wins and matchup odds move at once.</p>
					<span class="promo-cta">Open the Roster Lab →</span>
				</a>
				<a class="promo" href="/projections" data-shiny-surface="panel">
					<span class="promo-eyebrow">{phase === 'offseason' ? 'Draft season' : 'Fantasy'}</span>
					<h3>Fantasy Lab</h3>
					<p>DARKO's per-100 projections as per-game values under your league's scoring.</p>
					<span class="promo-cta">Rank players →</span>
				</a>
			</div>
		</div>
	{:else}
		<div class="daily-grid">
			<section class="daily-panel" aria-labelledby="daily-rewound-board" data-shiny-surface="panel">
				<header class="panel-head">
					<div>
						<h2 id="daily-rewound-board">Top of the board</h2>
						<p class="panel-sub">DPM on {formatAsOfDate(data.dataDate ?? data.date)}</p>
					</div>
				</header>
				{#if data.board.length}
					{@render boardList(data.board, 1)}
				{:else}
					<p class="empty">No ratings on this date.</p>
				{/if}
			</section>
			<section class="daily-panel" aria-labelledby="daily-rewound-season" data-shiny-surface="panel">
				<header class="panel-head">
					<div>
						<h2 id="daily-rewound-season">That season, in DARKO</h2>
						<p class="panel-sub">Season-end DPM, 20+ regular-season games</p>
					</div>
				</header>
				{#if !data.leaders}
					<p class="empty">Season-end ratings arrive with the next data publish.</p>
				{:else}
					<table class="season-table">
						<thead>
							<tr><th>Player</th><th>Team</th><th class="num">Age</th><th class="num">DPM</th></tr>
						</thead>
						<tbody>
							{#each data.leaders as row (row.nba_id)}
								<tr>
									<td><a href="/player/{row.nba_id}">{row.player_name}</a></td>
									<td>{teamOfId(row.tm_id)}</td>
									<td class="num">{Math.floor(row.age)}</td>
									<td class="num"><b>{formatSigned(row.dpm, 1)}</b></td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</section>
		</div>
	{/if}
</div>

<style>
	.daily-page {
		padding-bottom: 64px;
	}

	.daily-grid {
		display: grid;
		grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
		gap: 16px;
		align-items: start;
	}

	.daily-wide {
		grid-column: 1 / -1;
	}

	.daily-panel {
		min-width: 0;
		container-type: inline-size;
		padding: 16px 18px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 12px;
	}

	.panel-head h2 {
		font-size: 16px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text);
	}

	.panel-sub {
		margin: 2px 0 0;
		font-size: 12px;
		color: var(--text-muted);
	}

	.panel-link {
		flex: none;
		font-size: 12px;
		font-weight: 600;
	}

	.panel-note {
		margin: 10px 0 0;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.empty {
		margin: 8px 0;
		font-size: 13px;
		color: var(--text-muted);
	}

	/* Top of the board */
	.lead {
		padding-bottom: 12px;
		margin-bottom: 8px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.lead-top {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 12px;
	}

	.lead-eyebrow {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.lead-name h3 {
		margin: 2px 0 6px;
		font-family: var(--font-display);
		font-size: clamp(22px, 2.2vw, 28px);
		font-weight: 800;
		font-stretch: 112%;
		letter-spacing: -0.015em;
		line-height: 1.1;
	}

	.lead-name h3 a {
		color: var(--text);
	}

	.lead-value {
		font-family: var(--font-display);
		font-size: clamp(40px, 4vw, 52px);
		font-weight: 800;
		font-stretch: 112%;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		line-height: 0.95;
		color: var(--text);
	}

	.lead-chart {
		margin-top: 14px;
	}

	.lead-caption {
		margin: 4px 0 0;
		font-size: 11px;
		color: var(--text-muted);
	}

	.board {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.board-row {
		display: grid;
		grid-template-columns: 22px minmax(0, 1fr) 40px 96px 44px;
		gap: 10px;
		align-items: center;
		padding: 6px 2px;
		color: var(--text);
		text-decoration: none;
		border-bottom: 1px solid var(--border-subtle);
	}

	.board-row:hover,
	.mover:hover,
	.update:hover,
	.record:hover {
		background: var(--bg-hover);
	}

	.board-rank {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
	}

	.board-name {
		overflow: hidden;
		font-size: 13px;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.board-team {
		font-size: 11px;
		font-weight: 700;
		color: var(--text-muted);
	}

	.board-value {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: var(--figure-weight-strong);
		text-align: right;
	}

	/* Movers */
	.window-switch {
		display: inline-grid;
		grid-auto-flow: column;
		flex: none;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.window-switch button {
		padding: 5px 10px;
		font: inherit;
		font-size: 12px;
		font-weight: 700;
		color: var(--text-secondary);
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.window-switch button + button {
		border-left: 1px solid var(--border);
	}

	.window-switch button.active {
		color: var(--bg);
		background: var(--accent);
	}

	.window-switch button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	/* Risers and fallers side by side only where both fit. */
	.movers {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}

	@container (min-width: 600px) {
		.movers {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	.movers-head {
		display: flex;
		justify-content: space-between;
		margin: 0 0 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.mover,
	.update {
		display: grid;
		gap: 8px;
		align-items: center;
		padding: 6px 2px;
		color: var(--text);
		text-decoration: none;
		border-bottom: 1px solid var(--border-subtle);
	}

	.mover {
		grid-template-columns: minmax(0, 1fr) 72px 48px;
	}

	.mover-who {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.mover-who b {
		overflow: hidden;
		font-size: 13px;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.mover-who span {
		overflow: hidden;
		font-size: 11px;
		color: var(--text-muted);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.delta {
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: var(--figure-weight-strong);
		text-align: right;
		white-space: nowrap;
	}

	.delta.up {
		color: var(--positive);
	}

	.delta.down {
		color: var(--negative);
	}

	/* Single-game updates */
	.update {
		grid-template-columns: 52px minmax(0, 1fr) 72px 52px;
	}

	.update-date {
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}

	.update-bar {
		min-width: 0;
	}

	/* Age records */
	.record {
		display: grid;
		grid-template-columns: 76px minmax(0, 1fr);
		gap: 10px;
		align-items: baseline;
		padding: 8px 2px;
		color: var(--text);
		text-decoration: none;
		border-bottom: 1px solid var(--border-subtle);
	}

	.record-rank {
		font-family: var(--font-display);
		font-size: 19px;
		font-weight: 800;
		font-stretch: 112%;
		font-variant-numeric: tabular-nums;
	}

	.record-rank small {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: var(--figure-weight);
		font-stretch: 100%;
		color: var(--text-muted);
	}

	.record p {
		margin: 0;
		font-size: 13px;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.record b {
		color: var(--text);
	}

	/* Watchlist */
	.watch-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}

	.watch-card {
		display: grid;
		gap: 6px;
		padding: 12px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.watch-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.watch-top a {
		overflow: hidden;
		font-size: 14px;
		font-weight: 700;
		color: var(--text);
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.watch-meta {
		margin: 0;
		font-size: 12px;
		color: var(--text-muted);
	}

	.watch-numbers {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.watch-value {
		font-family: var(--font-display);
		font-size: 28px;
		font-weight: 800;
		font-stretch: 112%;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}

	.watch-idle {
		font-size: 12px;
		color: var(--text-muted);
	}

	/* Promos */
	.promos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
		gap: 16px;
	}

	.promo {
		display: grid;
		gap: 6px;
		padding: 16px 18px;
		color: var(--text);
		text-decoration: none;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.promo:hover,
	.promo:focus-visible {
		border-color: var(--accent);
	}

	.promo-eyebrow {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.promo h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
	}

	.promo p {
		margin: 0;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.promo-cta {
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
	}

	/* Rewound: that season */
	.season-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 13px;
	}

	.season-table th {
		padding: 6px;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-align: left;
		text-transform: uppercase;
		color: var(--text-muted);
		border-bottom: 1px solid var(--border);
	}

	.season-table td {
		padding: 6px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.season-table a {
		color: var(--text);
		font-weight: 600;
	}

	.season-table .num {
		font-family: var(--font-mono);
		text-align: right;
	}

	@media (max-width: 960px) {
		.daily-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 560px) {
		.board-row {
			grid-template-columns: 20px minmax(0, 1fr) 36px 64px 40px;
			gap: 8px;
		}

		.update {
			grid-template-columns: 44px minmax(0, 1fr) 48px;
		}

		.update-bar {
			display: none;
		}

		.panel-head {
			flex-direction: column;
		}

		.lead-value {
			font-size: 32px;
		}
	}
</style>
