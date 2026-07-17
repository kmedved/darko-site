import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const ARTICLE_PAGE = 'src/routes/wowy/about/+page.svelte';
const ARTICLE_MARKDOWN = 'src/lib/content/wowy-season-adjusted.md';
const LAYOUT = 'src/routes/+layout.svelte';

async function read(file) {
	return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('WOWY article publishes the complete season-adjusted story', async () => {
	const [page, markdown] = await Promise.all([
		read(ARTICLE_PAGE),
		read(ARTICLE_MARKDOWN)
	]);

	assert.match(page, /What Did Larry Bird Play Like in 1983/);
	assert.match(page, /import \{ marked, Renderer \} from 'marked'/);
	assert.match(page, /articleMarkdown/);
	assert.match(page, /renderer\.heading/);
	assert.match(page, /story-table-scroll/);
	assert.match(page, /href="\/wowy\?rating=adjusted"/);
	assert.match(page, /Published July 17, 2026/);
	assert.match(page, /@media \(max-width: 640px\)/);

	assert.match(markdown, /## Two numbers, two questions/);
	assert.match(markdown, /## Why not just average the daily ratings\?/);
	assert.match(markdown, /## How it works, briefly/);
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

test('WOWY navigation stays active on the article route', async () => {
	const layout = await read(LAYOUT);
	assert.match(
		layout,
		/\{ href: '\/wowy', label: 'WOWY RAPM', match: \(path\) => path\.startsWith\('\/wowy'\) \}/
	);
});
