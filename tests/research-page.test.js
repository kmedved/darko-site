import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_POSTS } from '../src/lib/utils/research.js';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

test('every research post has a route, Markdown and existing figures', async () => {
	for (const post of RESEARCH_POSTS) {
		const page = await read(`src/routes/research/${post.slug}/+page.svelte`);
		const markdown = await read(`src/lib/content/research/${post.slug}.md`);
		assert.match(page, new RegExp(`content/research/${post.slug}\\.md\\?raw`));
		assert.doesNotMatch(markdown, /—/, 'no em-dashes in research prose');
		for (const [, src] of markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) {
			assert.ok(src.startsWith('/research-figures/'), src);
			await fs.access(path.resolve(process.cwd(), 'static', src.slice(1)));
		}
	}
});

test('research data and chart code stay free of em-dashes', async () => {
	const dirs = ['src/lib/content/research', 'src/lib/components/research'];
	for (const dir of dirs) {
		for (const name of await fs.readdir(path.resolve(process.cwd(), dir))) {
			if (!/\.(json|svelte)$/.test(name)) continue;
			const text = await read(`${dir}/${name}`);
			assert.doesNotMatch(text, /—/, name);
		}
	}
	const charts = await read('src/lib/utils/jumpBallCharts.js');
	assert.doesNotMatch(charts, /—/);
});

test('the research table of contents and skip links point at real headings', async () => {
	const { renderArticleMarkdown } = await import('../src/lib/utils/renderArticleMarkdown.js');
	for (const post of RESEARCH_POSTS) {
		const page = await read(`src/routes/research/${post.slug}/+page.svelte`);
		const html = renderArticleMarkdown(await read(`src/lib/content/research/${post.slug}.md`));
		const ids = [...page.matchAll(/\{ id: '([^']+)'/g), ...page.matchAll(/href: '#([^']+)'/g)];
		for (const [, id] of ids) {
			assert.match(html, new RegExp(`id="${id}"`), id);
		}
	}
});
