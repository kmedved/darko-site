<script>
	import { searchAllPlayers } from '$lib/supabase.js';

	let { onSelect, exclude = [] } = $props();

	let query = $state('');
	let results = $state([]);
	let showResults = $state(false);
	let searching = $state(false);
	let debounceTimer = null;

	function handleInput() {
		clearTimeout(debounceTimer);

		if (query.length < 2) {
			results = [];
			searching = false;
			return;
		}

		searching = true;
		const currentQuery = query;
		const excludeSet = new Set(exclude);

		debounceTimer = setTimeout(async () => {
			try {
				const data = await searchAllPlayers(currentQuery);
				// Only update if query hasn't changed
				if (query === currentQuery) {
					results = data.filter((p) => !excludeSet.has(p.nba_id));
				}
			} catch {
				if (query === currentQuery) {
					results = [];
				}
			} finally {
				if (query === currentQuery) {
					searching = false;
				}
			}
		}, 300);
	}

	function selectPlayer(player) {
		onSelect(player);
		query = '';
		results = [];
		showResults = false;
	}

	function fmt(val) {
		const n = parseFloat(val);
		return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
	}
</script>

<div class="search-wrapper">
	<input
		class="search-input"
		placeholder="Search any player (current or retired)..."
		bind:value={query}
		oninput={handleInput}
		onfocus={() => (showResults = true)}
		onblur={() => setTimeout(() => (showResults = false), 150)}
	/>
	{#if showResults && results.length > 0}
		<div class="search-results">
			{#each results as player}
				<button
					class="search-result-item"
					onmousedown={() => selectPlayer(player)}
				>
					<span>
						{player.player_name}
						<span class="meta"
							>{player.team_name} · {player.position || '?'}</span
						>
					</span>
					<span
						class="dpm-val"
						style="color: {player.dpm >= 0
							? 'var(--positive)'
							: 'var(--negative)'}"
					>
						{fmt(player.dpm)}
					</span>
				</button>
			{/each}
		</div>
	{:else if showResults && searching && query.length >= 2}
		<div class="search-results">
			<div class="search-loading">Searching...</div>
		</div>
	{/if}
</div>

<style>
	.search-loading {
		padding: 8px 12px;
		color: var(--text-muted);
		font-size: 13px;
	}
</style>
