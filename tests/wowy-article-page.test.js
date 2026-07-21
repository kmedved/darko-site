import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const ARTICLE_PAGE = 'src/routes/wowy/about/+page.svelte';
const ARTICLE_MARKDOWN = 'src/lib/content/wowy-season-adjusted.md';
const TIMING_PAGE = 'src/routes/wowy/timing/+page.svelte';
const TIMING_MARKDOWN = 'src/lib/content/wowy-timing-repair.md';
const STORY_COMPONENT = 'src/lib/components/WowyStoryPage.svelte';
const MARKDOWN_RENDERER = 'src/lib/utils/renderArticleMarkdown.js';
const WOWY_PAGE = 'src/routes/wowy/+page.svelte';
const LAYOUT = 'src/routes/+layout.svelte';

async function read(file) {
	return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('WOWY article publishes the complete season-adjusted story', async () => {
	const [page, markdown, story, renderer] = await Promise.all([
		read(ARTICLE_PAGE),
		read(ARTICLE_MARKDOWN),
		read(STORY_COMPONENT),
		read(MARKDOWN_RENDERER)
	]);

	assert.match(page, /What Did Larry Bird Play Like in 1983/);
	assert.match(page, /WowyStoryPage/);
	assert.match(page, /articleMarkdown/);
	assert.match(page, /renderArticleMarkdown/);
	assert.match(page, /href: '\/wowy\?rating=adjusted'/);
	assert.match(page, /Published July 17, 2026/);
	assert.match(story, /story-table-scroll/);
	assert.match(story, /@media \(max-width: 640px\)/);
	assert.match(renderer, /import \{ marked, Renderer \} from 'marked'/);
	assert.match(renderer, /renderer\.heading/);

	assert.match(markdown, /## Two numbers, two questions/);
	assert.match(markdown, /## Why not just average the daily ratings\?/);
	assert.match(markdown, /## How it works, briefly/);
	assert.match(markdown, /## A timing mistake we found in our own model/);
	assert.match(markdown, /before-game ratings use before-game information/);
	assert.match(markdown, /## Did it work\?/);
	assert.match(markdown, /## What the box score missed/);
	assert.match(markdown, /## What the model cannot know/);
	assert.match(markdown, /20,543 player-seasons/);
	assert.match(markdown, /Season-Adjusted WOWY and BPM agree/);
	assert.match(markdown, /public Average is \+5\.99/);
	assert.match(markdown, /playing-time-weighted daily baseline/);
	assert.match(markdown, /shows minutes rather than a separate total-value column/);
	assert.match(markdown, /underlying project retains a complete audit trail/);
	assert.doesNotMatch(markdown, /Average\*\* option on the site shows the first column/);
	assert.doesNotMatch(markdown, /Now you can see both numbers/);
	assert.doesNotMatch(markdown, /github\.com\/kmedved\/wowy-rapm/);
});

test('WOWY timing article is published and linked from the leaderboard', async () => {
	const [page, markdown, wowyPage] = await Promise.all([
		read(TIMING_PAGE),
		read(TIMING_MARKDOWN),
		read(WOWY_PAGE)
	]);

	assert.match(page, /We Found Tomorrow in a Before-Game Rating/);
	assert.match(page, /WowyStoryPage/);
	assert.match(page, /Published July 21, 2026/);
	assert.match(page, /https:\/\/www\.darko\.app\/wowy\/timing/);
	assert.match(markdown, /The causal Daily WOWY series makes a simple promise/);
	assert.match(markdown, /currently shows \*\*Final Cut\*\*/);
	assert.match(markdown, /retains the causal before-game offensive, defensive, and total ratings/);
	assert.match(markdown, /three distinct statistical objects/);
	assert.match(markdown, /4,126,431 rows/);
	assert.match(markdown, /21 minutes 25 seconds/);
	assert.match(wowyPage, /href="\/wowy\/timing"/);
	assert.match(wowyPage, /Read the timing repair/);
});

test('WOWY navigation stays active on the article routes', async () => {
	const layout = await read(LAYOUT);
	assert.match(
		layout,
		/\{ href: '\/wowy', label: 'WOWY RAPM', match: \(path\) => path\.startsWith\('\/wowy'\) \}/
	);
});
