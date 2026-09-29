<script>
	// Any page that fails lands here, inside the site's layout: a missing page says so, and anything
	// else (usually the database not answering in time) offers another try.
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { dailyListed } from '$lib/utils/daily.js';

	const notFound = $derived($page.status === 404);
	const title = $derived(notFound ? 'Page not found' : 'Something went wrong');
	const lede = $derived(
		notFound
			? "There's no page at this address. It may have moved, or the link may be mistyped."
			: 'The page couldn\'t load just now, usually because DARKO\'s data didn\'t answer in time. Trying again often works.'
	);
</script>

<svelte:head>
	<title>{title} — DARKO DPM</title>
</svelte:head>

<div class="container error-page">
	<PageHeader eyebrow={`Error ${$page.status}`} {title} {lede} />
	<div class="error-actions">
		{#if !notFound}
			<button class="btn" type="button" onclick={() => location.reload()}>Try again</button>
		{/if}
		<a class="btn" href="/">Go to the leaderboard</a>
		{#if dailyListed()}<a class="btn" href="/daily">Read The Daily</a>{/if}
	</div>
</div>

<style>
	.error-page {
		padding-bottom: 48px;
	}

	.error-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 18px;
	}

	.error-actions a.btn {
		text-decoration: none;
	}
</style>
