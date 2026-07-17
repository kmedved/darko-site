<script>
	import { marked, Renderer } from 'marked';
	import articleMarkdown from '$lib/content/wowy-season-adjusted.md?raw';

	const renderer = new Renderer();
	renderer.heading = function ({ tokens, depth }) {
		const text = this.parser.parseInline(tokens);
		const slug = tokens
			.map((token) => token.raw)
			.join('')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
		return `<h${depth} id="${slug}">${text}</h${depth}>`;
	};

	const articleBody = articleMarkdown
		.replace(/^# .+\n+/, '')
		.replace(/^\*.+\*\n+/, '');
	const articleHtml = marked
		.parse(articleBody, {
			gfm: true,
			renderer
		})
		.replaceAll('<table>', '<div class="story-table-scroll"><table>')
		.replaceAll('</table>', '</table></div>');
</script>

<svelte:head>
	<title>What Did Larry Bird Play Like in 1983? — DARKO</title>
	<meta
		name="description"
		content="How DARKO turned daily WOWY RAPM into season-by-season impact ratings for every NBA player since 1980."
	/>
	<meta property="og:title" content="What Did Larry Bird Play Like in 1983?" />
	<meta
		property="og:description"
		content="A season-by-season impact rating for every NBA player since 1980."
	/>
	<meta property="og:type" content="article" />
	<meta property="og:url" content="https://www.darko.app/wowy/about" />
</svelte:head>

<main class="wowy-story-page" data-shiny-page>
	<header class="story-hero">
		<div class="container story-hero-inner">
			<p class="story-kicker">Introducing Season-Adjusted WOWY</p>
			<h1>What Did Larry Bird Play Like in 1983?</h1>
			<p class="story-deck">
				A season-by-season impact rating for every NBA player since 1980, built from the
				daily WOWY model and the evidence of each completed season.
			</p>
			<div class="story-actions">
				<a class="story-primary-link" href="/wowy?rating=adjusted">Explore the ratings</a>
				<span>Published July 17, 2026</span>
			</div>
		</div>
	</header>

	<section class="story-facts" aria-label="Dataset summary">
		<div class="container story-facts-inner">
			<div>
				<strong>47</strong>
				<span>NBA seasons</span>
			</div>
			<div>
				<strong>20,543</strong>
				<span>player-seasons</span>
			</div>
			<div>
				<strong>1980–2026</strong>
				<span>one scoring procedure</span>
			</div>
		</div>
	</section>

	<div class="container story-layout">
		<article class="story-article">
			<div class="story-body">
				{@html articleHtml}
			</div>

			<footer class="story-footer">
				<p>Ready to compare eras?</p>
				<a href="/wowy?rating=adjusted">Open the Season-Adjusted WOWY leaderboard</a>
			</footer>
		</article>

		<aside class="story-rail" aria-label="Article contents">
			<p>In this article</p>
			<a href="#two-numbers-two-questions">Average vs. Adjusted</a>
			<a href="#why-not-just-average-the-daily-ratings">From daily to season ratings</a>
			<a href="#how-it-works-briefly">How the model works</a>
			<a href="#did-it-work">How it was tested</a>
			<a href="#what-the-box-score-missed">WOWY vs. BPM</a>
			<a href="#what-the-model-cannot-know">What it cannot know</a>
			<a href="#how-to-read-the-site">How to read the site</a>
		</aside>
	</div>
</main>

<style>
	.wowy-story-page {
		min-height: 100vh;
		background: var(--bg);
	}

	.story-hero {
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.story-hero-inner {
		max-width: 980px;
		padding-top: 72px;
		padding-bottom: 64px;
	}

	.story-kicker {
		margin: 0 0 16px;
		color: var(--accent);
		font-size: 13px;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.story-hero h1 {
		max-width: 800px;
		margin: 0;
		color: var(--text);
		font-size: 48px;
		font-weight: 800;
		letter-spacing: 0;
		line-height: 1.08;
	}

	.story-deck {
		max-width: 760px;
		margin: 24px 0 0;
		color: var(--text-secondary);
		font-size: 21px;
		line-height: 1.55;
	}

	.story-actions {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-top: 30px;
		color: var(--text-muted);
		font-size: 13px;
	}

	.story-primary-link {
		display: inline-flex;
		align-items: center;
		min-height: 42px;
		padding: 0 18px;
		border: 1px solid var(--accent);
		border-radius: 6px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		text-decoration: none;
	}

	.story-primary-link:hover {
		filter: brightness(0.95);
	}

	.story-facts {
		border-bottom: 1px solid var(--border);
		background: var(--surface-subtle, var(--surface));
	}

	.story-facts-inner {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		max-width: 980px;
	}

	.story-facts-inner > div {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 22px 28px;
		border-right: 1px solid var(--border);
	}

	.story-facts-inner > div:first-child {
		border-left: 1px solid var(--border);
	}

	.story-facts strong {
		color: var(--text);
		font-size: 22px;
		font-variant-numeric: tabular-nums;
	}

	.story-facts span {
		color: var(--text-muted);
		font-size: 12px;
		text-transform: uppercase;
	}

	.story-layout {
		display: grid;
		grid-template-columns: minmax(0, 780px) 190px;
		gap: 56px;
		max-width: 1080px;
		padding-top: 56px;
		padding-bottom: 80px;
	}

	.story-article {
		min-width: 0;
	}

	.story-rail {
		position: sticky;
		top: 110px;
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: 11px;
		padding-left: 18px;
		border-left: 1px solid var(--border);
	}

	.story-rail p {
		margin: 0 0 3px;
		color: var(--text);
		font-size: 12px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.story-rail a {
		color: var(--text-muted);
		font-size: 12px;
		line-height: 1.35;
		text-decoration: none;
	}

	.story-rail a:hover {
		color: var(--accent);
	}

	.story-footer {
		margin-top: 56px;
		padding: 28px 0 0;
		border-top: 1px solid var(--border);
	}

	.story-footer p {
		margin: 0 0 8px;
		color: var(--text);
		font-size: 18px;
		font-weight: 700;
	}

	.story-footer a {
		color: var(--accent);
		font-weight: 700;
		text-decoration: none;
	}

	.story-body :global(h2) {
		margin: 58px 0 18px;
		padding-top: 6px;
		color: var(--text);
		font-size: 28px;
		font-weight: 750;
		letter-spacing: 0;
		line-height: 1.25;
		scroll-margin-top: 110px;
	}

	.story-body :global(p) {
		margin: 0 0 19px;
		color: var(--text-secondary);
		font-size: 16px;
		line-height: 1.78;
	}

	.story-body :global(strong) {
		color: var(--text);
		font-weight: 750;
	}

	.story-body :global(em) {
		color: var(--text);
	}

	.story-body :global(ul) {
		margin: 0 0 22px;
		padding-left: 22px;
	}

	.story-body :global(li) {
		margin-bottom: 10px;
		color: var(--text-secondary);
		font-size: 16px;
		line-height: 1.7;
	}

	.story-body :global(a) {
		color: var(--accent);
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}

	.story-body :global(.story-table-scroll) {
		width: 100%;
		margin: 28px 0 34px;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.story-body :global(table) {
		width: max-content;
		min-width: 100%;
		margin: 0;
		border-collapse: collapse;
		border-top: 1px solid var(--border);
		border-bottom: 1px solid var(--border);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.story-body :global(th),
	.story-body :global(td) {
		padding: 11px 12px;
		border-bottom: 1px solid var(--border-subtle);
		text-align: right;
	}

	.story-body :global(th) {
		background: var(--surface-subtle, var(--surface));
		color: var(--text);
		font-size: 11px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.story-body :global(th[align='left']),
	.story-body :global(td[align='left']) {
		text-align: left;
	}

	.story-body :global(blockquote) {
		margin: 28px 0;
		padding: 4px 0 4px 20px;
		border-left: 3px solid var(--accent);
	}

	.story-body :global(code) {
		padding: 2px 5px;
		border-radius: 4px;
		background: var(--surface-subtle, var(--surface));
		color: var(--text);
		font-size: 0.9em;
	}

	.story-body :global(hr) {
		margin: 52px 0;
		border: 0;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 900px) {
		.story-layout {
			grid-template-columns: minmax(0, 1fr);
			max-width: 800px;
		}

		.story-rail {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.story-hero-inner {
			padding-top: 44px;
			padding-bottom: 44px;
		}

		.story-hero h1 {
			font-size: 36px;
		}

		.story-deck {
			font-size: 18px;
		}

		.story-actions {
			align-items: flex-start;
			flex-direction: column;
			gap: 12px;
		}

		.story-facts-inner {
			grid-template-columns: 1fr;
		}

		.story-facts-inner > div {
			padding: 16px 0;
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}

		.story-facts-inner > div:first-child {
			border-left: 0;
		}

		.story-facts-inner > div:last-child {
			border-bottom: 0;
		}

		.story-layout {
			padding-top: 38px;
			padding-bottom: 56px;
		}

		.story-body :global(h2) {
			margin-top: 46px;
			font-size: 24px;
		}

		.story-body :global(p),
		.story-body :global(li) {
			font-size: 15px;
		}
	}
</style>
