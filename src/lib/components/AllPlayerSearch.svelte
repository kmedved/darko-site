<script>
	import { apiPlayersIndex } from '$lib/api.js';
	import { formatSignedMetric } from '$lib/utils/csvPresets.js';

	let { onSelect, exclude = [] } = $props();

	let query = $state('');
	let allPlayers = $state([]);
	let results = $state([]);
	let showResults = $state(false);
	let searching = $state(false);
	let loading = $state(true);
	let error = $state(null);
	let debounceTimer = null;

	$effect(() => {
		apiPlayersIndex()
			.then((data) => {
				allPlayers = data;
				loading = false;
			})
			.catch((err) => {
				error = err.message;
				loading = false;
			});
	});

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

		debounceTimer = setTimeout(() => {
			if (query === currentQuery) {
				const q = currentQuery.toLowerCase();
				results = allPlayers
					.filter((p) => !excludeSet.has(p.nba_id))
					.filter((p) => p.player_name.toLowerCase().includes(q))
					.slice(0, 8);
				searching = false;
			}
		}, 300);
	}

	function selectPlayer(player) {
		onSelect(player);
		query = '';
		results = [];
		showResults = false;
	}

	function dpmClass(val) {
		const n = parseFloat(val);
		if (!Number.isFinite(n)) return '';
		return n >= 0 ? 'pos' : 'neg';
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
					<span class="dpm-val {dpmClass(player.dpm)}">
						{formatSignedMetric(player.dpm)}
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
