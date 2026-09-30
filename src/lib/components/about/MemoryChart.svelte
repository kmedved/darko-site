<script>
	// How long DARKO remembers each stat: slide back through the games and watch each stat's weight
	// on an old game fade at its own rate, minutes within days, shooting over seasons.
	import { HALF_LIFE_GROUPS, HALF_LIVES, describeHalfLife, memoryWeight } from '$lib/utils/aboutDarko.js';

	const PRESETS = [
		{ games: 3, label: 'Last week' },
		{ games: 14, label: 'A month ago' },
		{ games: 41, label: 'Half a season' },
		{ games: 82, label: 'A season' },
		{ games: 246, label: 'Three seasons' }
	];
	// The slider runs on a log scale, so a few games and a few seasons both get room.
	const MAX_GAMES = 400;
	const toGames = (position) => Math.round(MAX_GAMES ** (position / 100));
	const toPosition = (games) => (Math.log(Math.max(games, 1)) / Math.log(MAX_GAMES)) * 100;

	let gamesAgo = $state(14);
	let showAll = $state(false);

	const rows = $derived(
		HALF_LIVES.filter((stat) => showAll || stat.featured)
			.map((stat) => ({ ...stat, weight: memoryWeight(stat.games, gamesAgo) }))
			.sort((a, b) => a.games - b.games)
	);
	const faded = $derived(rows.filter((row) => row.weight < 0.05));
	const kept = $derived(rows.filter((row) => row.weight >= 0.9));
</script>

<figure class="memory">
	<div class="memory-controls">
		<label class="memory-slider">
			<span>A game from</span>
			<input
				type="range"
				min="0"
				max="100"
				step="0.5"
				value={toPosition(gamesAgo)}
				oninput={(event) => (gamesAgo = toGames(Number(event.currentTarget.value)))}
				aria-valuetext="{gamesAgo} games ago"
			/>
			<strong>{gamesAgo} {gamesAgo === 1 ? 'game' : 'games'} ago</strong>
		</label>
		<div class="memory-presets" role="group" aria-label="Jump to">
			{#each PRESETS as preset (preset.games)}
				<button type="button" class:active={gamesAgo === preset.games} onclick={() => (gamesAgo = preset.games)}>
					{preset.label}
				</button>
			{/each}
		</div>
	</div>

	<ol class="memory-rows">
		{#each rows as row (row.key)}
			<li>
				<span class="memory-label">
					{row.label}
					<small>{HALF_LIFE_GROUPS[row.group]}</small>
				</span>
				<span class="memory-bar" aria-hidden="true">
					<i style:width="{Math.max(0.5, row.weight * 100)}%"></i>
				</span>
				<span class="memory-value">
					{Math.round(row.weight * 100)}%
					<small>halves in {describeHalfLife(row.games)}</small>
				</span>
			</li>
		{/each}
	</ol>

	<figcaption aria-live="polite">
		A game from {gamesAgo} {gamesAgo === 1 ? 'game' : 'games'} ago still counts
		{#if kept.length}
			almost in full for {kept.map((row) => row.label.toLowerCase()).join(', ')},
		{/if}
		{#if faded.length}
			and next to nothing for {faded.map((row) => row.label.toLowerCase()).join(', ')}.
		{:else}
			for something in every stat.
		{/if}
		Half-lives in games during a season, for a 31-year-old; DARKO adjusts them with age.
		<button type="button" class="memory-toggle" onclick={() => (showAll = !showAll)}>
			{showAll ? `Show the main ${HALF_LIVES.filter((stat) => stat.featured).length}` : `Show all ${HALF_LIVES.length} stats`}
		</button>
	</figcaption>
</figure>

<style>
	.memory {
		margin: 24px 0 30px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.memory-controls {
		display: grid;
		gap: 10px;
		margin-bottom: 14px;
	}

	.memory-slider {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) 8.5em;
		align-items: center;
		gap: 12px;
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.memory-slider input {
		width: 100%;
		accent-color: var(--accent);
	}

	.memory-slider strong {
		color: var(--text);
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
		text-align: right;
	}

	.memory-presets {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.memory-presets button,
	.memory-toggle {
		min-height: 28px;
		padding: 3px 10px;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.memory-presets button.active,
	.memory-presets button:hover,
	.memory-toggle:hover {
		border-color: var(--accent);
		color: var(--text);
	}

	.memory-rows {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.memory-rows li {
		display: grid;
		grid-template-columns: minmax(9em, 13em) minmax(0, 1fr) 12.5em;
		align-items: center;
		gap: 12px;
		min-height: 30px;
	}

	.memory-label {
		display: grid;
		color: var(--text);
		font-size: 13px;
		font-weight: 700;
		line-height: 1.2;
	}

	.memory-label small,
	.memory-value small {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 600;
	}

	.memory-bar {
		height: 12px;
		border-radius: 3px;
		background: var(--border-subtle);
		overflow: hidden;
	}

	.memory-bar i {
		display: block;
		height: 100%;
		border-radius: 3px;
		background: var(--accent);
		transition: width 0.18s ease-out;
	}

	.memory-value {
		display: grid;
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 13px;
		font-weight: var(--figure-weight-strong);
		line-height: 1.2;
	}

	.memory-value small {
		font-family: var(--font-sans);
		white-space: nowrap;
	}

	figcaption {
		margin-top: 14px;
		color: var(--text-secondary);
		font-size: 14px;
		line-height: 1.6;
	}

	.memory-toggle {
		margin-left: 4px;
	}

	@media (prefers-reduced-motion: reduce) {
		.memory-bar i {
			transition: none;
		}
	}

	@media (max-width: 560px) {
		.memory-slider {
			grid-template-columns: minmax(0, 1fr) auto;
		}

		.memory-slider > span {
			grid-column: 1 / -1;
		}

		.memory-rows li {
			grid-template-columns: minmax(0, 1fr) 9.5em;
			gap: 4px 10px;
			padding: 4px 0;
		}

		.memory-value {
			text-align: right;
		}

		.memory-value small {
			white-space: normal;
		}

		.memory-bar {
			grid-column: 1 / -1;
			grid-row: 2;
		}
	}
</style>
