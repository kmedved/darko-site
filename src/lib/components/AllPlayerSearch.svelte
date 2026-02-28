<script>
	import { apiSearchPlayers } from '$lib/api.js';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
	import { formatSignedMetric } from '$lib/utils/csvPresets.js';

	let { onSelect, exclude = [] } = $props();

	let query = $state('');
	let results = $state([]);
	let showResults = $state(false);
	let searching = $state(false);
	let error = $state(null);
	let debounceTimer = null;
	let blurTimer = null;
	const searchSequencer = createRequestSequencer();

	function normalizeId(value) {
		const parsed = Number.parseInt(String(value), 10);
		return Number.isInteger(parsed) ? parsed : null;
	}

	function hideResultsSoon() {
		clearTimeout(blurTimer);
		blurTimer = setTimeout(() => (showResults = false), 150);
	}

	function handleInput() {
		clearTimeout(debounceTimer);
		const trimmedQuery = query.trim();

		if (trimmedQuery.length < 2) {
			results = [];
			searching = false;
			error = null;
			return;
		}

		error = null;
		searching = true;
		const reqId = searchSequencer.next();
		const currentQuery = trimmedQuery;

		debounceTimer = setTimeout(() => {
			apiSearchPlayers(currentQuery)
				.then((players) => {
					if (!searchSequencer.isCurrent(reqId)) return;
					const excludeSet = new Set(
						(exclude || []).map(normalizeId).filter((id) => id !== null)
					);
					results = (players || [])
						.filter((p) => !excludeSet.has(normalizeId(p.nba_id)))
						.slice(0, 8);
					searching = false;
					error = null;
				})
				.catch((err) => {
					if (!searchSequencer.isCurrent(reqId)) return;
					results = [];
					error = err?.message || 'Failed to search players';
					searching = false;
				});
		}, 250);
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

	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
			clearTimeout(blurTimer);
			searchSequencer.next();
		};
	});
</script>

<div class="search-wrapper">
	<input
		class="search-input"
		placeholder="Search any player (current or retired)..."
		bind:value={query}
		oninput={handleInput}
		onfocus={() => {
			clearTimeout(blurTimer);
			showResults = true;
		}}
		onblur={hideResultsSoon}
	/>
		{#if showResults && query.trim().length >= 2}
			<div class="search-results">
				{#if error}
					<div class="search-loading">{error}</div>
				{:else if searching}
					<div class="search-loading">Searching...</div>
				{:else if results.length > 0}
					{#each results as player}
						<button
							type="button"
							class="search-result-item"
							onmousedown={() => selectPlayer(player)}
						>
							<span>
								{player.player_name}
								<span class="meta">{player.team_name} · {player.position || '?'}</span>
							</span>
							<span class="dpm-val {dpmClass(player.dpm)}">
								{formatSignedMetric(player.dpm)}
							</span>
						</button>
					{/each}
				{:else}
					<div class="search-loading">No matches</div>
				{/if}
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
