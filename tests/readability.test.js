import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

/** A theme's custom properties, from its block in app.css (the default theme is plain :root). */
function themeTokens(css, selector) {
	const start = css.indexOf(`${selector} {`);
	assert.ok(start >= 0, `app.css has ${selector}`);
	const block = css.slice(start, css.indexOf('}', start));
	return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function luminance(hex) {
	const [r, g, b] = hex
		.replace('#', '')
		.match(/../g)
		.map((pair) => parseInt(pair, 16) / 255)
		.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

test('supporting text is readable on every surface of every theme', async () => {
	const css = await read('src/app.css');
	const base = themeTokens(css, ':root');
	for (const selector of [':root', ":root[data-theme='black']", ":root[data-theme='light']", ":root[data-theme='white']"]) {
		const theme = { ...base, ...themeTokens(css, selector) };
		for (const text of ['--text-secondary', '--text-muted']) {
			for (const surface of ['--bg', '--bg-surface', '--bg-elevated']) {
				const ratio = contrast(theme[text], theme[surface]);
				assert.ok(ratio >= 4.5, `${selector} ${text} on ${surface} is ${ratio.toFixed(2)}:1`);
			}
		}
		// Secondary text stays a step above muted text.
		assert.ok(contrast(theme['--text-secondary'], theme['--bg-surface']) > contrast(theme['--text-muted'], theme['--bg-surface']));
		// Lines, dots and icons keep their own, quieter gray.
		assert.match(theme['--graphic-muted'], /^#[0-9a-f]{6}$/i, `${selector} sets --graphic-muted`);
	}
});

test('nothing asks DM Mono for a weight it does not have', async () => {
	const files = [];
	async function walk(dir) {
		for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) await walk(full);
			else if (/\.(svelte|css)$/.test(entry.name) && !entry.name.endsWith('shiny-view.css')) files.push(full);
		}
	}
	await walk(path.resolve(process.cwd(), 'src'));

	// DM Mono comes in 400 and 500. Figures use --figure-weight (400) and --figure-weight-strong
	// (500), which the Shiny view sets back to bold for its Helvetica.
	const offenders = [];
	for (const file of files) {
		const source = await fs.readFile(file, 'utf8');
		for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
			const body = rule[2];
			const weight = body.match(/font-weight:\s*(\d+)/);
			if (/font-family:\s*var\(--font-mono\)/.test(body) && weight && Number(weight[1]) > 500) {
				offenders.push(`${path.relative(process.cwd(), file)}: ${rule[1].trim().split('\n').pop().trim()}`);
			}
		}
	}
	assert.deepEqual(offenders, []);

	const [css, shiny] = await Promise.all([read('src/app.css'), read('src/shiny-view.css')]);
	assert.match(css, /--figure-weight: 400;\s*--figure-weight-strong: 500;/);
	// A weight a font lacks falls back to its nearest real one, never a synthesized bold.
	assert.match(css, /font-synthesis-weight: none;/);
	assert.match(shiny, /--font-display: 'Helvetica Neue', Helvetica, Arial, sans-serif;\s*--figure-weight: 700;\s*--figure-weight-strong: 700;/);
	assert.match(shiny, /--graphic-muted: #777777;/);
});

test('a sparkline shrinks to its column instead of running under the next one', async () => {
	const sparkline = await read('src/lib/components/Sparkline.svelte');
	assert.match(sparkline, /\.sparkline \{\s*display: block;\s*max-width: 100%;\s*height: auto;/);
	assert.match(sparkline, /vector-effect: non-scaling-stroke;/);
});

test('the More and Display menus close on a new page, a link, a click elsewhere and Escape', async () => {
	const layout = await read('src/routes/+layout.svelte');
	assert.match(layout, /<details class="nav-more" class:active=\{moreMenuActive\} bind:this=\{moreMenu\}>/);
	assert.match(layout, /<details class="display-menu" bind:this=\{displayMenu\}>/);
	assert.match(layout, /afterNavigate\(\(\) => closeDesktopMenus\(\)\);/);
	assert.match(layout, /closeDesktopMenus\(inside && !event\.target\.closest\('a'\) \? inside : null\);/);
	assert.match(layout, /<svelte:window onclick=\{handleWindowClick\} onkeydown=\{handleWindowKeydown\} \/>/);
});
