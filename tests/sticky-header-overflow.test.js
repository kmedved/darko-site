/**
 * Sticky header overflow guard.
 *
 * Root cause:  CSS spec says if you set `overflow-x` to a non-visible value
 * (e.g. `hidden` or `auto`), `overflow-y` is implicitly promoted to `auto`,
 * which creates a scroll container.  A scroll container captures sticky
 * positioning, so `position: sticky` on <th> stops working relative to the
 * viewport / outer scroll context.
 *
 * Fix:  `overflow-x: clip` clips overflow *without* creating a scroll
 * container, preserving sticky behaviour.
 *
 * This test prevents the regression on every page that uses sticky headers.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const APP_CSS = 'src/app.css';

const STICKY_PAGES = [
	'src/routes/+page.svelte',
	'src/routes/lineups/+page.svelte',
	'src/routes/longevity/+page.svelte',
	'src/routes/standings/+page.svelte',
	'src/routes/player/[nbaId]/+page.svelte',
	'src/lib/components/TeamDetailView.svelte',
	'src/lib/components/LegacyLeaderboard.svelte'
];

function read(file) {
	return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

// ---------------------------------------------------------------------------
// 1. Global body rule must use `clip`, not `hidden` or `auto`
// ---------------------------------------------------------------------------
test('body overflow-x uses clip (not hidden/auto) to preserve sticky headers', async () => {
	const css = await read(APP_CSS);

	// Match standalone body { … } rule (separate from "html, body")
	const bodyBlocks = [...css.matchAll(/(?:^|\n)\s*body\s*\{([^}]*)\}/g)];
	assert.ok(bodyBlocks.length > 0, 'app.css should contain a standalone body {} rule');

	// Find the block that sets overflow-x
	const overflowBlock = bodyBlocks.find(([, body]) => /overflow-x/.test(body));
	assert.ok(overflowBlock, 'body rule should declare overflow-x');

	const overflowX = overflowBlock[1].match(/overflow-x:\s*([^;]+);/);
	assert.ok(overflowX, 'body rule should declare overflow-x with a value');

	const value = overflowX[1].trim();
	assert.equal(
		value,
		'clip',
		`body overflow-x must be "clip" (was "${value}"). ` +
			'"hidden" or "auto" creates a scroll container that breaks position: sticky.'
	);
});

// ---------------------------------------------------------------------------
// 2. Pages with sticky headers must not use overflow-x: auto/hidden on
//    .table-wrapper *outside* of touch/mobile media queries.
// ---------------------------------------------------------------------------
test('sticky-header pages do not set overflow on .table-wrapper in base styles', async () => {
	for (const file of STICKY_PAGES) {
		const contents = await read(file);

		// Only check files that actually contain a .table-wrapper
		if (!contents.includes('.table-wrapper')) continue;

		// Extract <style> block(s)
		const styleBlocks = [...contents.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(
			(m) => m[1]
		);
		if (styleBlocks.length === 0) continue;

		for (const style of styleBlocks) {
			// Find all .table-wrapper rule blocks that are NOT inside a @media query
			// Strategy: strip out @media blocks, then check what remains
			const withoutMedia = stripMediaBlocks(style);

			// Check for overflow-x: auto or overflow-x: hidden in base .table-wrapper rules
			const wrapperRules = [...withoutMedia.matchAll(/\.table-wrapper\s*\{([^}]*)\}/g)];
			for (const [, body] of wrapperRules) {
				// overflow-x: auto/hidden/scroll on .table-wrapper creates a scroll
				// container that captures sticky positioning from <th> elements.
				// Only allow overflow-x inside touch/mobile @media queries.
				assert.doesNotMatch(
					body,
					/overflow-x:\s*(auto|hidden|scroll)\s*;/,
					`${file}: .table-wrapper base rule must not set overflow-x to auto/hidden/scroll — ` +
						'this creates a scroll container that breaks position: sticky on <th>. ' +
						'Use overflow-x: auto only inside touch/mobile @media queries.'
				);
				// Note: shorthand `overflow: auto` paired with `max-height` is OK — that
				// creates a vertical scroll container where sticky headers still work
				// *within* the container. We only ban explicit overflow-x.
			}
		}
	}
});

/**
 * Remove all @media { … } blocks (including nested braces) from a CSS string,
 * returning only the base-level rules.
 */
function stripMediaBlocks(css) {
	let result = '';
	let i = 0;

	while (i < css.length) {
		const mediaStart = css.indexOf('@media', i);
		if (mediaStart === -1) {
			result += css.slice(i);
			break;
		}

		result += css.slice(i, mediaStart);

		const openBrace = css.indexOf('{', mediaStart);
		if (openBrace === -1) {
			result += css.slice(mediaStart);
			break;
		}

		let depth = 0;
		let j = openBrace;
		for (; j < css.length; j++) {
			if (css[j] === '{') depth++;
			if (css[j] === '}') {
				depth--;
				if (depth === 0) {
					j++;
					break;
				}
			}
		}

		i = j;
	}

	return result;
}
