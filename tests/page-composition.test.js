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
	assert.ok(at(markup, /<header class="profile-header">/) < at(markup, /<nav\s+class="profile-jump"/));
	assert.ok(at(markup, /<nav\s+class="profile-jump"/) < at(markup, /id="seismograph"/));
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

test("a phone's leaderboard shows the DPM beside the name, and the name stays while the row scrolls", async () => {
	const board = await read('src/routes/+page.svelte');
	const phone = board.slice(board.indexOf('@media (max-width: 640px) {'));
	// The team moves under the name; the rank and name columns narrow.
	assert.match(phone, /th\.team,\s*\.leaderboard-cell--team \{\s*display: none;/);
	assert.match(phone, /\.player-team-inline \{\s*display: inline;/);
	assert.match(phone, /--frozen-rank-width: 32px;\s*--frozen-player-width: 160px;/);
	// On a touch screen the rank and name columns, and their header cells, stay pinned.
	const touch = board.slice(board.indexOf('/* Touch/mobile scroll mode */'), board.indexOf('/* End touch/mobile scroll mode */'));
	assert.doesNotMatch(touch, /\.leaderboard-cell--player \{\s*position: static;/);
	assert.match(touch, /\.table-sizing-head :is\(\.group-row, \.header-row, \.column-filter-row\) th:nth-child\(2\) \{\s*left: var\(--frozen-rank-width\);/);
	// The scroll fade starts after the pinned columns instead of covering them.
	assert.match(board, /--pinned-width: calc\(var\(--frozen-rank-width\) \+ var\(--frozen-player-width\)\);/);
	assert.match(await read('src/app.css'), /\[data-overflow-left\]::before \{\s*left: var\(--pinned-width, 0px\);/);
});

test('narrow-screen layouts leave Shiny, the percentile labels and the screen-reader headers intact', async () => {
	const [shinyCss, percentiles, board] = await Promise.all([
		read('src/shiny-view.css'),
		read('src/lib/components/TalentPercentilesChart.svelte'),
		read('src/routes/+page.svelte')
	]);
	// Shiny's sidebar rating resets the grid areas the Modern header uses on a phone.
	assert.match(shinyCss, /\.player-profile-page \.profile-score \{\s*grid-template-columns: minmax\(0, 1fr\) auto;\s*grid-template-areas: none;/);
	assert.match(shinyCss, /\.player-profile-page :is\(\.profile-score-label, \.profile-score-value\) \{\s*grid-area: auto;/);
	assert.match(shinyCss, /\.player-profile-page \.profile-score-split \{\s*grid-area: auto;\s*grid-column: 1 \/ -1;/);
	// The percentile chart leaves room for the subtitle over the first row's label.
	assert.match(percentiles, /const MARGIN_TOP = 68;/);
	assert.match(percentiles, /: MARGIN_TOP \+ selectedMetrics\.length \* ROW_HEIGHT \+ 65/);
	assert.match(percentiles, /const margin = \{ top: MARGIN_TOP,/);
	// The screen-reader header row carries each column's class, so a phone drops Team from it too.
	const semantic = board.slice(board.indexOf('{#snippet standardSemanticHeaderRow()}'), board.indexOf('{#snippet standardHeaderRows()}'));
	assert.equal((semantic.match(/<th scope="col" class=\{column\.alignClass\}/g) ?? []).length, 2);
});

test('the top bar keeps every page link: Ask DARKO and the Time Machine turn to icons where room is short', async () => {
	const [layout, shinyCss] = await Promise.all([read('src/routes/+layout.svelte'), read('src/shiny-view.css')]);
	assert.match(layout, /@media \(max-width: 1440px\) \{\s*\.ask-nav-toggle,\s*\.tm-nav-toggle:not\(\.rewound\) \{\s*padding: 0 7px;/);
	assert.match(layout, /\.ask-nav-label,\s*\.ask-nav-kbd,\s*\.tm-nav-toggle:not\(\.rewound\) \.tm-nav-label \{\s*display: none;/);
	// Icon-only, the button still has a name.
	assert.match(layout, /class="ask-nav-toggle"\s*aria-label="Ask DARKO"/);
	// Shiny's larger type and legacy logo need the icons sooner, and the lockup steps aside.
	assert.match(shinyCss, /@media \(max-width: 1600px\) \{\s*:root\[data-view='shiny'\] \.ask-nav-toggle,/);
	assert.match(shinyCss, /@media \(max-width: 1320px\) \{\s*:root\[data-view='shiny'\] \.legacy-logo-lockup \{\s*display: none;/);
});

test('The Daily is off the menus between seasons and back on the morning of October 22', async () => {
	const [{ DAILY_RETURNS, dailyListed }, { askPages, ASK_PAGES }] = await Promise.all([
		import('../src/lib/utils/daily.js'),
		import('../src/lib/utils/askDarko.js')
	]);
	assert.equal(DAILY_RETURNS, '2026-10-22T12:00:00Z');
	assert.equal(dailyListed(new Date('2026-10-22T11:59:59Z')), false);
	assert.equal(dailyListed(new Date('2026-10-22T12:00:00Z')), true);
	assert.ok(!askPages(new Date('2026-10-01T00:00:00Z')).some((entry) => entry.href === '/daily'));
	assert.ok(askPages(new Date('2026-10-23T00:00:00Z')).some((entry) => entry.href === '/daily'));
	assert.equal(askPages(new Date('2026-10-01T00:00:00Z')).length, ASK_PAGES.length - 1);

	const [layout, errorPage, askDarko] = await Promise.all([
		read('src/routes/+layout.svelte'),
		read('src/routes/+error.svelte'),
		read('src/lib/components/AskDarko.svelte')
	]);
	// Both menus draw from the list that leaves it out; the browser's clock decides again on load.
	assert.match(layout, /const primaryNavItems = \$derived\(dailyOn \? PRIMARY_NAV_ITEMS : PRIMARY_NAV_ITEMS\.filter\(\(item\) => item\.href !== '\/daily'\)\);/);
	assert.match(layout, /\{#each primaryNavItems as item \(item\.href\)\}/);
	assert.match(layout, /\{#each menuNavItems as item \(item\.href\)\}/);
	assert.match(layout, /dailyOn = dailyListed\(\);/);
	assert.match(errorPage, /\{#if dailyListed\(\)\}<a class="btn" href="\/daily">Read The Daily<\/a>\{\/if\}/);
	assert.match(askDarko, /askPages\(\)\.map\(/);
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
