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

test('retired WOWY timing article is neither routable nor linked', async () => {
	const [articlePage, wowyPage] = await Promise.all([
		read(ARTICLE_PAGE),
		read(WOWY_PAGE)
	]);

	assert.doesNotMatch(articlePage, /\/wowy\/timing/);
	assert.doesNotMatch(wowyPage, /\/wowy\/timing/);
	await assert.rejects(fs.access(path.resolve(process.cwd(), TIMING_PAGE)), {
		code: 'ENOENT'
	});
	await assert.rejects(fs.access(path.resolve(process.cwd(), TIMING_MARKDOWN)), {
		code: 'ENOENT'
	});
});

test('WOWY navigation stays active on the article routes', async () => {
	const layout = await read(LAYOUT);
	assert.match(
		layout,
		/\{ href: '\/wowy', label: 'WOWY RAPM', match: \(path\) => path\.startsWith\('\/wowy'\) \}/
	);
});
