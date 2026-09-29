import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { OPTIONAL_FONT_FAMILIES, fontStylesheetUrl, loadOptionalFont } from '../src/lib/fonts.js';

test('the number font is self-hosted and preloaded; optional fonts load on demand', async () => {
	const [html, css] = await Promise.all([
		fs.readFile(path.resolve(process.cwd(), 'src/app.html'), 'utf8'),
		fs.readFile(path.resolve(process.cwd(), 'src/app.css'), 'utf8')
	]);

	// No third-party stylesheet or connection on first load.
	assert.doesNotMatch(html, /<link[^>]+fonts\.(googleapis|gstatic)\.com/);
	for (const weight of ['400', '500']) {
		assert.ok(
			html.includes(`<link rel="preload" href="/fonts/dm-mono/dm-mono-${weight}-latin.woff2" as="font" type="font/woff2" crossorigin>`),
			`app.html preloads DM Mono ${weight}`
		);
	}
	const files = [...css.matchAll(/url\('\/fonts\/dm-mono\/([^']+)'\)/g)].map((m) => m[1]);
	assert.equal(files.length, 4, 'two weights, Latin and Latin Extended');
	for (const file of [...files, 'OFL.txt']) {
		await fs.access(path.resolve(process.cwd(), 'static/fonts/dm-mono', file));
	}
	assert.match(css, /font-family: 'DM Mono';[\s\S]*?font-display: swap;/);

	// Archivo, the display font, the same way: Latin preloaded, Latin Extended when a name needs it.
	assert.ok(
		html.includes('<link rel="preload" href="/fonts/archivo/archivo-latin.woff2" as="font" type="font/woff2" crossorigin>'),
		'app.html preloads Archivo'
	);
	const display = [...css.matchAll(/url\('\/fonts\/archivo\/([^']+)'\)/g)].map((m) => m[1]);
	assert.deepEqual(display, ['archivo-latin.woff2', 'archivo-latin-ext.woff2']);
	for (const file of [...display, 'OFL.txt']) {
		await fs.access(path.resolve(process.cwd(), 'static/fonts/archivo', file));
	}
	assert.match(css, /--font-display: 'Archivo', var\(--font-sans\);/);
	// DM Mono has 400 and 500 only, so nothing may ask the browser to fake a bolder one.
	assert.match(css, /font-synthesis-weight: none;/);

	// The before-paint copy in app.html must match src/lib/fonts.js.
	for (const [key, family] of Object.entries(OPTIONAL_FONT_FAMILIES)) {
		assert.ok(html.includes(`${key}: '${family}'`), `app.html should load ${key} as ${family}`);
	}
	const layout = await fs.readFile(path.resolve(process.cwd(), 'src/routes/+layout.svelte'), 'utf8');
	assert.match(layout, /loadOptionalFont\(normalizedFont\);/);
});

test('an optional font stylesheet is added once, and never for the system font', () => {
	const appended = [];
	const doc = {
		head: {
			querySelector: (selector) => appended.find((link) => selector.includes(`"${link.dataset.fontFamily}"`)) ?? null,
			appendChild: (link) => appended.push(link)
		},
		createElement: () => ({ dataset: {} })
	};

	loadOptionalFont('inter', doc);
	loadOptionalFont('inter', doc);
	loadOptionalFont('system', doc);

	assert.equal(appended.length, 1);
	assert.equal(appended[0].href, fontStylesheetUrl('inter'));
	assert.equal(fontStylesheetUrl('system'), null);
});
