<script>
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { RESEARCH_POSTS } from '$lib/utils/research.js';
</script>

<svelte:head>
	<title>Research — DARKO DPM</title>
	<meta name="description" content="Longer write-ups on NBA analytics questions from DARKO." />
	<meta property="og:title" content="Research — DARKO DPM" />
	<meta property="og:url" content="https://www.darko.app/research" />
</svelte:head>

<div class="container research-index">
	<PageHeader title="Research" lede="Longer write-ups on NBA analytics questions." />

	<ul class="research-list">
		{#each RESEARCH_POSTS as post (post.slug)}
			<li class="research-card">
				<a href={`/research/${post.slug}`}>
					<time datetime={post.date}>{post.dateLabel}</time>
					<h2>{post.title}</h2>
					<p>{post.summary}</p>
					<span class="research-read">Read →</span>
				</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.research-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
		max-width: 820px;
		margin: 8px 0 64px;
		padding: 0;
		list-style: none;
	}

	.research-card a {
		display: block;
		padding: 22px 24px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
	}

	.research-card a:hover {
		border-color: var(--accent);
	}

	.research-card time {
		color: var(--text-muted);
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.research-card h2 {
		margin: 8px 0 10px;
		color: var(--text);
		font-size: 22px;
		line-height: 1.3;
	}

	.research-card p {
		margin: 0 0 14px;
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 1.6;
	}

	.research-read {
		color: var(--accent);
		font-size: 14px;
		font-weight: 700;
	}
</style>
