<script>
	import { apiSearchPlayers } from '$lib/api.js';
	import PlayerSearchField from './PlayerSearchField.svelte';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
	import {
		filterExcludedPlayers,
		PLAYER_SEARCH_MIN_QUERY_LENGTH
	} from '$lib/utils/playerSearch.js';

	let { onSelect, exclude = [] } = $props();

	let query = $state('');
	let rawResults = $state([]);
	let searching = $state(false);
	let error = $state(null);
	let debounceTimer = null;
	const searchSequencer = createRequestSequencer();

	const results = $derived(filterExcludedPlayers(rawResults, exclude));
	const statusMessage = $derived(error || (searching ? 'Searching...' : null));

	function handleQueryChange(nextQuery) {
		clearTimeout(debounceTimer);
		const trimmedQuery = nextQuery.trim();

		if (trimmedQuery.length < PLAYER_SEARCH_MIN_QUERY_LENGTH) {
			rawResults = [];
			searching = false;
			error = null;
			searchSequencer.next();
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
					rawResults = Array.isArray(players) ? players : [];
					searching = false;
					error = null;
				})
				.catch((err) => {
					if (!searchSequencer.isCurrent(reqId)) return;
					rawResults = [];
					error = err?.message || 'Failed to search players';
					searching = false;
				});
		}, 250);
	}

	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
			searchSequencer.next();
		};
	});
</script>

<PlayerSearchField
	bind:query
	{results}
	{statusMessage}
	placeholder="Search any player (current or retired)..."
	onQueryChange={handleQueryChange}
	{onSelect}
/>
