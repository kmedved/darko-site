<script>
	// "Watch DARKO learn": one season of a player's rating, game by game, in the player pages'
	// Seismograph. It opens on a rookie, whose early games move the rating most; any player and
	// season since 1996-97 can be picked.
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import SeismographChart from '$lib/components/SeismographChart.svelte';
	import { LEARN_EXAMPLES } from '$lib/utils/aboutDarko.js';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
	import { buildSeismograph, formatGameDate, formatSigned } from '$lib/utils/seismograph.js';
	import { formatSeasonEndYearLabel } from '$lib/utils/seasonUtils.js';

	/** initial: { nba_id, player_name, season, seasons, rows }, from the page's load. */
	let { initial = null } = $props();

	let loaded = $state(null);
	let loading = $state(false);
	let failed = $state(null);
	const requests = createRequestSequencer();

	const view = $derived(loaded ?? initial);
	const seismograph = $derived(view?.season ? buildSeismograph(view.rows ?? [], view.season) : null);
	const summary = $derived(seismograph?.summary ?? null);

	async function show(player, season = null) {
		const ticket = requests.next();
		loading = true;
		failed = null;
		try {
			const response = await fetch(`/api/player/${player.nba_id}/season${season ? `?season=${season}` : ''}`);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const payload = await response.json();
			if (!requests.isCurrent(ticket)) return;
			loaded = {
				nba_id: player.nba_id,
				player_name: player.player_name,
				season: payload.season,
				seasons: payload.seasons ?? [],
				rows: payload.rows ?? []
			};
		} catch {
			if (requests.isCurrent(ticket)) failed = `Couldn't load ${player.player_name}'s season.`;
		} finally {
			if (requests.isCurrent(ticket)) loading = false;
		}
	}

	function game(point) {
		return `${formatGameDate(point.date, { year: true })}${point.opponent ? ` vs ${point.opponent}` : ''}`;
	}
</script>

<div class="learn">
	<div class="learn-controls">
		<div class="learn-examples" role="group" aria-label="Examples">
			{#each LEARN_EXAMPLES as example (example.nba_id)}
				<button
					type="button"
					class:active={view?.nba_id === example.nba_id && view?.season === example.season}
					disabled={loading}
					onclick={() => show(example, example.season)}
				>
					<b>{example.player_name}</b>
					<small>{formatSeasonEndYearLabel(example.season)}, {example.tag}</small>
				</button>
			{/each}
		</div>
		<div class="learn-pick">
			<AllPlayerSearch onSelect={(player) => show(player)} exclude={view ? [view.nba_id] : []} />
			{#if view?.seasons?.length > 1}
				<label>
					<span class="sr-only">Season</span>
					<select value={view.season} disabled={loading} onchange={(event) => show(view, Number(event.currentTarget.value))}>
						{#each view.seasons as season (season)}
							<option value={season}>{formatSeasonEndYearLabel(season)}</option>
						{/each}
					</select>
				</label>
			{/if}
		</div>
	</div>

	{#if failed}
		<p class="learn-message" role="alert">{failed}</p>
	{/if}

	<div class="learn-chart" class:loading aria-busy={loading}>
		{#if seismograph?.points?.length}
			<SeismographChart {seismograph} playerName={view.player_name} />
		{:else if !loading}
			<p class="learn-message">No games for {view?.player_name ?? 'this player'} that season.</p>
		{/if}
	</div>

	{#if summary}
		<dl class="learn-callouts" aria-live="polite">
			<div>
				<dt>Over the season</dt>
				<dd class="value">{formatSigned(summary.change)}</dd>
				<dd>{formatSigned(summary.start)} before the first game, {formatSigned(summary.end)} at the end</dd>
			</div>
			{#if summary.window > 0}
				<div>
					<dt>A typical game's move</dt>
					<dd class="value">{summary.earlyUpdate.toFixed(2)} → {summary.recentUpdate.toFixed(2)}</dd>
					<dd>in his first {summary.window} games, then his last {summary.window}</dd>
				</div>
			{/if}
			{#if summary.best?.update.dpm > 0}
				<div>
					<dt>Biggest boost</dt>
					<dd class="value">{formatSigned(summary.best.update.dpm)}</dd>
					<dd>{game(summary.best)}</dd>
				</div>
			{/if}
			{#if summary.worst?.update.dpm < 0}
				<div>
					<dt>Biggest drop</dt>
					<dd class="value">{formatSigned(summary.worst.update.dpm)}</dd>
					<dd>{game(summary.worst)}</dd>
				</div>
			{/if}
		</dl>
	{/if}
</div>

<style>
	.learn {
		margin: 24px 0 30px;
	}

	.learn-controls {
		display: grid;
		gap: 12px;
		margin-bottom: 14px;
	}

	.learn-examples {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.learn-examples button {
		display: grid;
		gap: 1px;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--bg-surface);
		color: var(--text);
		font-family: var(--font-sans);
		text-align: left;
		cursor: pointer;
	}

	.learn-examples button b {
		font-size: 13px;
		font-weight: 800;
	}

	.learn-examples button small {
		color: var(--text-muted);
		font-size: 12px;
	}

	.learn-examples button.active,
	.learn-examples button:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.learn-examples button.active {
		box-shadow: inset 0 0 0 1px var(--accent);
	}

	.learn-pick {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 10px;
	}

	.learn-pick > :global(:first-child) {
		flex: 1 1 260px;
		min-width: 0;
	}

	.learn-pick select {
		min-height: 40px;
		padding: 0 10px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg);
		color: var(--text);
		font: inherit;
	}

	.learn-chart {
		min-height: 220px;
		transition: opacity 0.15s ease;
	}

	.learn-chart.loading {
		opacity: 0.45;
	}

	.learn-message {
		color: var(--text-muted);
		font-size: 14px;
	}

	.learn-callouts {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
		margin: 14px 0 0;
	}

	.learn-callouts > div {
		padding: 12px 14px;
		border: 1px solid var(--border);
		border-radius: 10px;
		background: var(--bg-surface);
	}

	.learn-callouts dt {
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.learn-callouts dd {
		margin: 4px 0 0;
		color: var(--text-secondary);
		font-size: 13px;
		line-height: 1.4;
	}

	.learn-callouts dd.value {
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 20px;
		font-weight: var(--figure-weight-strong);
	}
</style>
