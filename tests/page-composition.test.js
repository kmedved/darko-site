import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');

/** Where `pattern` first matches in `text`, failing when it doesn't. */
function at(text, pattern) {
	const index = text.search(pattern);
	assert.ok(index >= 0, `missing ${pattern}`);
	return index;
}

test('the player page leads with the player, then the sections, each chart with its controls', async () => {
	const [page, shinyCss] = await Promise.all([read('src/routes/player/[nbaId]/+page.svelte'), read('src/shiny-view.css')]);
	const markup = page.slice(page.indexOf('</script>'), page.indexOf('<style>'));

	// Header, then the jump menu, then the Seismograph: nothing else in between on a phone.
	assert.ok(at(markup, /<header class="profile-header">/) < at(markup, /<nav class="profile-jump"/));
	assert.ok(at(markup, /<nav class="profile-jump"/) < at(markup, /id="seismograph"/));
	assert.match(markup, /<span class="profile-score-value">\{formatSigned\(playerRating\.dpm, 1\)\}<\/span>/);

	// Each chart's controls sit over it; the Shiny sidebar renders the same controls itself.
	assert.match(markup, /id="career"[^>]*>\s*<div class="panel-controls">\s*\{@render talentTrendControl\('talent-trend-select'\)\}/);
	assert.match(markup, /id="percentiles"[^>]*>\s*<div class="panel-controls">[\s\S]*?\{@render percentilePresets\(\)\}[\s\S]*?<details class="percentile-picker">/);
	assert.match(markup, /<div class="sidebar-controls">\s*\{@render talentTrendControl\('talent-trend-select-sidebar'\)\}/);
	assert.match(page, /\.profile-search \.sidebar-label,\s*\.sidebar-controls \{\s*display: none;/);
	assert.match(shinyCss, /\.player-profile-page \.sidebar-controls \{\s*display: flex;/);
	assert.match(shinyCss, /\.player-profile-page \.panel-controls \{\s*display: none;/);

	// The name and the rating are display type.
	assert.match(page, /\.player-title h1 \{[^}]*font-family: var\(--font-display\);/);
	assert.match(page, /\.profile-score-value \{[^}]*font-family: var\(--font-display\);/);
});

test('the team page puts its rating and where it comes from before the roster', async () => {
	const view = await read('src/lib/components/TeamDetailView.svelte');
	const markup = view.slice(view.indexOf('</script>'), view.indexOf('<style>'));

	assert.ok(at(markup, /\{#snippet aside\(\)\}/) < at(markup, /id="team-dna"/));
	assert.ok(at(markup, /id="dna-contrib-title">Where the rating comes from/) < at(markup, /<h2 class="section-title">Players<\/h2>/));
	assert.ok(at(markup, /<h2 class="section-title">Players<\/h2>/) < at(markup, /<div class="dna-pair">/));
	assert.match(markup, /<span class="team-score-value">\{formatSigned\(ratingSummary\.rating, 1\)\}<\/span>/);
	assert.match(markup, /Worth about \{Math\.round\(ratingSummary\.wins\)\} wins over 82 games/);
	// One line of season facts replaces the eight tiles.
	assert.doesNotMatch(view, /StatTile/);
	assert.match(markup, /\{#each seasonFacts as fact \(fact\)\}<span>\{fact\}<\/span>\{\/each\}/);

	const header = await read('src/lib/components/PageHeader.svelte');
	assert.match(header, /\{#if aside\}\s*<div class="page-header-aside">\{@render aside\(\)\}<\/div>/);
});

test("The Daily's featured chart has a value scale, months and the latest value", async () => {
	const [page, chart] = await Promise.all([read('src/routes/daily/+page.svelte'), read('src/lib/components/LeadTrendChart.svelte')]);
	assert.match(page, /datedSeriesFrom\(data\.series\[leader\.id\], data\.seasonStart\)/);
	assert.match(page, /<LeadTrendChart\s+points=\{leadSeries\}/);
	assert.match(page, /<PageHeader \{eyebrow\} \{title\} class="page-header--editorial">/);
	assert.match(chart, /y\.ticks\(4\)/);
	assert.match(chart, /d3\.utcMonth\.range/);
	assert.match(chart, /class="lt-end-value"/);
});

test("the Lab keeps the edited team's rating in view while its sliders scroll", async () => {
	const lab = await read('src/routes/lab/+page.svelte');
	assert.match(lab, /<p class="lab-live" aria-hidden="true">[\s\S]*?\{formatSigned\(state\.rating\.rating, 1\)\}/);
	// Where the sides stack, the minutes bar sticks under the site's bar, inside its own side.
	assert.match(lab, /@media \(max-width: 1100px\) \{[\s\S]*?\.lab-minutes \{\s*position: sticky;\s*top: var\(--nav-sticky-offset\);/);
	// On a phone the sliders come before the Minutes chart.
	assert.match(lab, /\.lab-dna \{\s*order: 1;/);
});

test('the distribution dots travel to a new stat instead of jumping', async () => {
	const [dots, board, countUp] = await Promise.all([
		read('src/lib/components/DotDistribution.svelte'),
		read('src/routes/+page.svelte'),
		read('src/lib/components/CountUp.svelte')
	]);
	// Stable page order, so a dot is moved by its transform and never re-inserted.
	assert.match(dots, /const dots = valid\.map\(\(point\) => \(\{ \.\.\.point, \.\.\.placed\.get\(point\.id\) \}\)\);/);
	assert.match(dots, /<g class="dot-slot" style:transform="translateX\(\{dot\.cx\}px\)" style:transition-delay="\{dot\.delay\}ms">/);
	assert.match(dots, /style:transform="translateY\(\{dot\.cy\}px\)"/);
	assert.match(dots, /\.dot-slot \{\s*transition: transform/);
	assert.match(dots, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?transition: none;/);
	// The figures under it count to a filter's new values and come in fresh with a new stat.
	assert.match(board, /\{#key selectedDistributionMetric\.key\}\s*<div class="distribution-stats" in:fly=/);
	assert.match(board, /<CountUp value=\{distribution\.meanValue\} format=\{formatDistributionFigure\} \/>/);
	assert.match(countUp, /Tween\.of\(/);
	assert.match(countUp, /prefersReducedMotion\.current \? 0 : duration/);
});
