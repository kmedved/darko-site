<script>
	import OffenseDefenseGlyph from '$lib/components/OffenseDefenseGlyph.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { onMount } from 'svelte';
	import { openAskDarko } from '$lib/utils/askDarko.js';
	import { currentNews, NEW_FOR_DAYS, newThingsTitle } from '$lib/utils/whatsNew.js';

	let { data } = $props();

	// The server picks the items; a page from the edge cache can be up to two hours old, so once
	// it is up the browser drops anything that has turned 30 days old since.
	let now = $state(null);
	onMount(() => {
		now = new Date();
	});
	const items = $derived(now ? currentNews(now, data.items ?? []) : (data.items ?? []));
	const features = $derived(items.filter((item) => item.kind !== 'design'));
	const design = $derived(items.filter((item) => item.kind === 'design'));

	function addedOn(iso) {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
	}

	function linkFor(item) {
		if (item.team && data.topTeam) {
			return { href: `/team/${data.topTeam.abbr}#team-dna`, cta: `See the ${data.topTeam.nickname}` };
		}
		return { href: item.href, cta: item.cta };
	}

	function counter(index) {
		return `${String(index + 1).padStart(2, '0')} / ${String(features.length).padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>What's new — DARKO DPM</title>
</svelte:head>

<div class="container new-page" data-shiny-page>
	<PageHeader eyebrow="What's new" title={features.length ? newThingsTitle(features.length) : 'Nothing new right now'}>
		<p class="page-lede">
			{#if items.length}
				Features from the DARKO redesign that are now live on the site. Each one stays on this page for
				{NEW_FOR_DAYS} days after it launches. Comps, Roster Lab team ratings and fantasy values are
				calculations built on DARKO's ratings, not DARKO model outputs.
			{:else}
				Nothing has launched in the last {NEW_FOR_DAYS} days.
			{/if}
		</p>
	</PageHeader>

	{#if features.length}
		<ol class="feat-grid">
			{#each features as item, index (item.key)}
				{@const link = linkFor(item)}
				<li class="feat" data-shiny-surface="panel">
					<p class="feat-meta">
						<span>{counter(index)}</span>
						<span>Added {addedOn(item.launched)}</span>
					</p>
					<h2>{item.title}</h2>
					<p class="feat-text">{item.text}</p>
					{#if item.ask}
						<button type="button" class="feat-cta" onclick={() => openAskDarko(item.ask)}>{item.cta} →</button>
					{:else}
						<a class="feat-cta" href={link.href}>{link.cta} →</a>
					{/if}
				</li>
			{/each}
		</ol>
	{/if}

	{#if design.length}
		<section class="design-panel" data-shiny-surface="panel" aria-labelledby="new-design-title">
			<h2 id="new-design-title">Across every page</h2>
			{#each design as item (item.key)}
				<div class="design-item">
					<h3>
						{#if item.key === 'offense-defense'}
							<span class="design-glyphs" aria-hidden="true">
								<OffenseDefenseGlyph side="offense" />
								<OffenseDefenseGlyph side="defense" />
							</span>
						{/if}
						{item.title}
					</h3>
					<p>{item.text}</p>
					<p class="design-date">Added {addedOn(item.launched)}</p>
				</div>
			{/each}
		</section>
	{/if}
</div>

<style>
	.new-page {
		padding-bottom: 64px;
	}

	.feat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* The whole card is the link: the call to action stretches over it. */
	.feat {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 18px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		transition: border-color 0.12s ease;
	}

	.feat:hover,
	.feat:focus-within {
		border-color: var(--accent);
	}

	.feat-meta {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 0;
		font-family: var(--font-mono);
		font-size: 11px;
		letter-spacing: 0.04em;
		color: var(--text-muted);
	}

	.feat h2 {
		margin: 0;
		font-size: 17px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text);
	}

	.feat-text {
		flex: 1;
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.feat-cta {
		align-self: flex-start;
		padding: 0;
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		background: none;
		border: 0;
		cursor: pointer;
		text-decoration: none;
	}

	.feat-cta::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--radius);
	}

	.feat-cta:focus-visible {
		outline: none;
	}

	.feat-cta:focus-visible::after {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.design-panel {
		margin-top: 24px;
		padding: 18px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.design-panel h2 {
		margin: 0 0 12px;
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.design-item h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 6px;
		font-size: 15px;
		font-weight: 700;
		color: var(--text);
	}

	.design-glyphs {
		display: inline-flex;
		gap: 6px;
		align-items: center;
	}

	.design-item p {
		max-width: 72ch;
		margin: 0;
		font-size: 13px;
		line-height: 1.5;
		color: var(--text-secondary);
	}

	.design-item .design-date {
		margin-top: 6px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
	}
</style>
