<script>
	import { onMount } from 'svelte';
	import { startWatchlist, toggleWatch, watchlist } from '$lib/utils/watchlist.js';

	// Follow a player: The Daily's watchlist and the leaderboard's Watchlist filter. The list
	// stays in this browser. `compact` fits a table row.
	let { nbaId, name = '', compact = false } = $props();

	onMount(startWatchlist);
	const watched = $derived($watchlist.includes(nbaId));
</script>

<button
	type="button"
	class="watch-star"
	class:watched
	class:compact
	aria-pressed={watched}
	aria-label={watched ? `Stop following ${name}` : `Follow ${name}`}
	title={watched ? 'Following: in The Daily and the leaderboard’s Watchlist' : 'Follow in The Daily and the leaderboard’s Watchlist'}
	onclick={() => toggleWatch(nbaId)}
>
	<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
		<path d="M8 1.6l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.3l-3.9 2.1.9-4.3-3.3-3 4.4-.5z" />
	</svg>
</button>

<style>
	.watch-star {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.watch-star:hover {
		color: var(--text);
		background: var(--bg-hover);
	}

	.watch-star:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}

	.watch-star path {
		fill: none;
		stroke: currentColor;
		stroke-width: 1.3;
		stroke-linejoin: round;
	}

	.watch-star.watched {
		color: var(--accent);
	}

	.watch-star.watched path {
		fill: currentColor;
	}

	.watch-star.compact {
		flex: 0 0 auto;
		width: 24px;
		height: 24px;
	}

	/* In a table row the star stays faint until the row is hovered or it is on. */
	.watch-star.compact:not(.watched) {
		opacity: 0.55;
	}

	:global(tr:hover) .watch-star.compact,
	.watch-star.compact:focus-visible {
		opacity: 1;
	}
</style>
