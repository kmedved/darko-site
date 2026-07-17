import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
	DISPLAY_VIEW_QUERY_KEY,
	DISPLAY_VIEW_STORAGE_KEY,
	LEGACY_DISPLAY_VIEW_QUERY_KEY,
	getDisplayViewPreview,
	isDisplayView,
	normalizeDisplayView
} from '../src/lib/displayMode.js';
import {
    chartSeriesPalettes,
    getChartTheme,
    getSeriesColor
} from '../src/lib/utils/chartTheme.js';
import {
	buildMetricHeatScales,
	buildPresetHeatScales,
    getMetricHeatVariables,
    hasMetricHeatScale
} from '../src/lib/utils/metricHeatScales.js';
import { buildLoessConfidenceBand } from '../src/lib/utils/loessConfidenceBand.js';

function read(file) {
    return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('display view values normalize to a safe Modern fallback', () => {
	assert.equal(DISPLAY_VIEW_STORAGE_KEY, 'darko-view');
	assert.equal(DISPLAY_VIEW_QUERY_KEY, 'display');
	assert.equal(LEGACY_DISPLAY_VIEW_QUERY_KEY, 'view');
	assert.equal(normalizeDisplayView('shiny'), 'shiny');
	assert.equal(normalizeDisplayView('modern'), 'modern');
	assert.equal(normalizeDisplayView('sepia'), 'modern');
	assert.equal(isDisplayView('shiny'), true);
	assert.equal(isDisplayView('sepia'), false);
	assert.equal(getDisplayViewPreview(new URLSearchParams('display=shiny')), 'shiny');
	assert.equal(getDisplayViewPreview(new URLSearchParams('display=modern&view=shiny')), 'modern');
	assert.equal(getDisplayViewPreview(new URLSearchParams('display=sepia&view=shiny')), 'shiny');
	assert.equal(getDisplayViewPreview(new URLSearchParams('display=sepia')), null);
});

test('app shell stamps the saved or query-selected view before hydration', async () => {
    const appHtml = await read('src/app.html');
    const layout = await read('src/routes/+layout.svelte');
	const appCss = await read('src/app.css');
	const shinyCss = await read('src/shiny-view.css');

	assert.match(appHtml, /displayPreview = params\.get\('display'\)/);
	assert.match(appHtml, /legacyPreview = params\.get\('view'\)/);
	assert.match(appHtml, /document\.documentElement\.dataset\.view = view/);
	assert.doesNotMatch(appHtml, /localStorage\.setItem\(VIEW_KEY/);
	assert.match(layout, /setContext\(DISPLAY_VIEW_CONTEXT, displayMode\)/);
	assert.match(layout, /localStorage\.setItem\(DISPLAY_VIEW_STORAGE_KEY, normalizedView\)/);
	assert.match(layout, /resolveDisplayView\(\$page\.url\)/);
	assert.match(layout, /getDisplayViewPreview\(url\.searchParams\)/);
	assert.match(layout, /document\.documentElement\.dataset\.view = resolvedView/);
	assert.match(layout, /isDisplayView\(url\.searchParams\.get\(DISPLAY_VIEW_QUERY_KEY\)\)/);
	assert.match(layout, /isDisplayView\(url\.searchParams\.get\(LEGACY_DISPLAY_VIEW_QUERY_KEY\)\)/);
	assert.match(layout, /url\.searchParams\.delete\(DISPLAY_VIEW_QUERY_KEY\)/);
	assert.match(layout, /url\.searchParams\.delete\(LEGACY_DISPLAY_VIEW_QUERY_KEY\)/);
	assert.doesNotMatch(layout, /url\.searchParams\.has\('view'\)/);
	assert.match(layout, /void goto\([\s\S]*replaceState:\s*true/);
	assert.doesNotMatch(layout, /window\.history\.replaceState/);
	assert.match(layout, /disabled=\{isShinyView\}/);
	assert.match(layout, /<nav class="site-nav">/);
	assert.match(layout, /src="\/darko-about-logo\.png"/);
	assert.match(layout, /class="legacy-logo-lockup" aria-hidden="true"/);
	assert.match(layout, /former global credits footer is intentionally absent in both display modes/);
	assert.doesNotMatch(layout, /class="site-footer"|DARKO DPM by/);
	assert.match(appCss, /\.site-nav\s*\{/);
	assert.match(appCss, /\.legacy-logo-lockup\s*\{[\s\S]*display:\s*none/);
	assert.match(shinyCss, /:root\[data-view='shiny'\] \.site-nav\s*\{/);
	assert.match(shinyCss, /:root\[data-view='shiny'\] \.legacy-logo-lockup\s*\{[\s\S]*display:\s*flex/);
	assert.match(shinyCss, /@media \(max-width: 1180px\)[\s\S]*\.legacy-logo-lockup\s*\{[\s\S]*display:\s*none/);
	assert.doesNotMatch(appCss, /^nav\s*\{/m);
	assert.doesNotMatch(shinyCss, /:root\[data-view='shiny'\] nav\s*\{/);
});

test('Shiny longevity charts restore archived chart language without forking components', async () => {
    const [chart, rosterChart, shinyCss, page] = await Promise.all([
        read('src/lib/components/LongevityCareerLengthChart.svelte'),
        read('src/lib/components/LongevityRosterChart.svelte'),
        read('src/shiny-view.css'),
        read('src/routes/longevity/+page.svelte')
    ]);

    assert.match(chart, /getContext\(DISPLAY_VIEW_CONTEXT\)/);
    assert.match(chart, /class', 'probability-band'/);
    assert.match(chart, /getProbabilityBands\(data\)/);
    assert.match(chart, /class', 'probability-legend'/);
    assert.match(shinyCss, /--shiny-probability-high:/);
    assert.match(shinyCss, /--shiny-probability-mid:/);
    assert.match(shinyCss, /--shiny-probability-low:/);
    assert.match(rosterChart, /getContext\(DISPLAY_VIEW_CONTEXT\)/);
    assert.match(rosterChart, /if \(!isShinyView\)/);
    assert.match(rosterChart, /--shiny-longevity-points/);
    assert.match(rosterChart, /buildLoessConfidenceBand/);
    assert.match(rosterChart, /shinySinglePlayer\.pointOpacity/);
    assert.doesNotMatch(page.match(/\.summary-copy p \{[\s\S]*?\n    \}/)?.[0] ?? '', /text-overflow:\s*ellipsis/);
});

test('single-player confidence ribbons share finite source-length geometry', () => {
	const x = [0, 1, 2, 3, 4];
	const values = [1, 3, 2, 4, 3];
	const smooth = [1.5, 2, 2.5, 3, 3.5];
	const band = buildLoessConfidenceBand(x, values, smooth, 0.75);

	assert.equal(band.length, x.length);
	assert.deepEqual(band.map((point) => point.x), x);
	assert.ok(band.every((point) => Number.isFinite(point.lower) && Number.isFinite(point.upper)));
	assert.ok(band.every((point) => point.lower <= point.mean && point.mean <= point.upper));
});

test('Shiny chart theme uses DARKO\'s archived brand palette and plot geometry', () => {
	const modern = getChartTheme('modern');
	const shiny = getChartTheme('shiny');
	const shinyMobile = getChartTheme('shiny', { isMobile: true });

    assert.deepEqual(chartSeriesPalettes.shiny.slice(0, 5), [
        '#385bbb',
        '#ef2d56',
        '#0cce6b',
        '#ed7d3a',
        '#dced31'
    ]);
    assert.equal(getSeriesColor(0, 'shiny'), '#385bbb');
    assert.ok(shiny.lineWidth > modern.lineWidth);
    assert.ok(shiny.zeroWidth > modern.zeroWidth);
	assert.equal(shiny.smoothingBandwidth, 0.5);
	assert.equal(shiny.plotBorder, true);
	assert.equal(modern.plotBorder, false);
	assert.ok(shinyMobile.margin.top > shinyMobile.legendY + shinyMobile.legendTextSize);
	assert.ok(shinyMobile.margin.left > 45);
	assert.ok(shinyMobile.tickSize < shiny.tickSize);
	assert.ok(shinyMobile.axisLabelSize < shiny.axisLabelSize);
});

test('metric heat registry uses the archived shared heat family with black text', () => {
	const rows = Array.from({ length: 20 }, (_, index) => ({
		dpm: index + 1,
		x_fg3_pct: (index + 1) / 100
	}));
	const scales = buildMetricHeatScales(rows, ['dpm', 'x_fg3_pct']);

    assert.equal(hasMetricHeatScale('dpm'), true);
    assert.equal(hasMetricHeatScale('x_fg3_pct'), true);
    assert.equal(hasMetricHeatScale('net_pm'), true);
    assert.equal(hasMetricHeatScale('p10'), true);
	assert.equal(scales.dpm.thresholds.length, 19);
	assert.equal(scales.dpm.colors.length, 20);
	assert.match(getMetricHeatVariables('dpm', 20, scales), /#d33f6a/);
	assert.match(getMetricHeatVariables('x_fg3_pct', 0.2, scales), /#d33f6a/);
	assert.match(getMetricHeatVariables('dpm', 1, scales), /#e2e6bd/);
	assert.equal(
		getMetricHeatVariables('dpm', 10, scales),
		getMetricHeatVariables('dpm', 10.4, scales)
	);
	assert.notEqual(
		getMetricHeatVariables('dpm', 10.4, scales),
		getMetricHeatVariables('dpm', 10.6, scales)
	);
	assert.match(getMetricHeatVariables('dpm', 20, scales), /--shiny-cell-color: #222222/);
	assert.equal(getMetricHeatVariables('player_name', 'Nikola Jokic', scales), '');
});

test('Shiny player profile trends use the archived point and ribbon treatment', async () => {
	const [chart, shinyCss] = await Promise.all([
		read('src/lib/components/TalentTrendChart.svelte'),
		read('src/shiny-view.css')
	]);

	assert.match(chart, /buildLoessConfidenceBand/);
	assert.match(chart, /class', 'loess-confidence-band'/);
	assert.match(chart, /if \(!isShinyView\)/);
	assert.match(chart, /shinySinglePlayer\.smoothingBandwidth/);
	assert.match(chart, /class', 'season-start-rule'/);
	assert.match(shinyCss, /--shiny-single-player-points:\s*#006bb6/);
	assert.match(shinyCss, /--shiny-single-player-band:\s*rgba\(237, 23, 76, 0\.34\)/);
});

test('Shiny leaderboard filters and trajectories reuse the existing page DOM', async () => {
    const [leaderboard, trajectories, chart, shinyCss] = await Promise.all([
        read('src/routes/+page.svelte'),
        read('src/routes/trajectories/+page.svelte'),
        read('src/lib/components/TrajectoryChart.svelte'),
        read('src/shiny-view.css')
    ]);

    assert.match(leaderboard, /class="column-filter-row table-sizing-row"/);
	assert.match(leaderboard, /\.table-header-scroll :is\(\.header-row, \.column-filter-row\) th:nth-child\(1\)/);
	assert.match(leaderboard, /\.table-header-scroll :is\(\.header-row, \.column-filter-row\) th:nth-child\(2\)/);
	assert.match(leaderboard, /getMetricHeatVariables\(column\.key, value, leaderboardHeatScales\)/);
	assert.match(leaderboard, /buildPresetHeatScales\(players, 'talent'\)/);
	assert.doesNotMatch(leaderboard, /buildPresetHeatScales\((?:sortedPlayers|filteredPlayers|teamScopedPlayers),/);
    assert.match(leaderboard, /class="position-table-head"/);
    assert.match(leaderboard, /class="shiny-plot-caption"/);
	assert.match(leaderboard, /isShinyView && playerHeadshotUrl\(player\)/);
	assert.match(leaderboard, /class="leaderboard-headshot"/);
	assert.match(leaderboard, /getMetricHeatVariables\('dpm', player\.dpm, leaderboardHeatScales\)/);
    assert.match(leaderboard, /if \(!isShinyView && Object\.keys\(columnFilters\)\.length > 0\)/);
    assert.doesNotMatch(leaderboard, /ShinyLeaderboard|ModernLeaderboard/);
	assert.match(shinyCss, /\.mini-headshot,[\s\S]*\.position-bar[\s\S]*display:\s*none/);
	assert.match(shinyCss, /\.leaderboard-headshot\s*\{[\s\S]*width:\s*20px;[\s\S]*height:\s*20px/);
	assert.match(shinyCss, /\.leaderboard-table-panel th\.name,[\s\S]*td\.leaderboard-cell--player\s*\{[\s\S]*text-align:\s*left/);
    assert.match(shinyCss, /\.position-table-head,[\s\S]*\.position-player[\s\S]*grid-template-columns/);
    assert.match(trajectories, /getSeriesColor\(index, displayMode\.view\)/);
    assert.doesNotMatch(trajectories, /ShinyTrajectory|ModernTrajectory/);
    assert.match(chart, /getChartTheme\(displayMode\.view, \{ isMobile \}\)/);
});

test('Shiny lineup and longevity tables use stable source-level quantile heat scales', async () => {
    const [lineups, longevity, standings, shinyCss] = await Promise.all([
        read('src/routes/lineups/+page.svelte'),
        read('src/routes/longevity/+page.svelte'),
        read('src/routes/standings/+page.svelte'),
        read('src/shiny-view.css')
    ]);

	assert.match(lineups, /buildPresetHeatScales\(selectedLineups, 'lineup'\)/);
	assert.doesNotMatch(lineups, /buildPresetHeatScales\((?:filteredLineups|sortedLineups|pageRows),/);
    assert.match(lineups, /getMetricHeatVariables\(column\.key, lineup\[column\.key\], lineupHeatScales\)/);
	assert.match(longevity, /buildPresetHeatScales\(rows, 'longevity'\)/);
	assert.doesNotMatch(longevity, /buildPresetHeatScales\((?:filteredRows|sortedRows|pageRows),/);
    assert.match(longevity, /getMetricHeatVariables\(column\.key, row\[column\.key\], longevityHeatScales\)/);
	assert.match(standings, /buildMetricHeatScales\(standings, standingsHeatAccessors, \{ quantileStep: 0\.1 \}\)/);
	assert.match(standings, /getMetricHeatVariables\(column\.key, team\?\.\[column\.key\], standingsHeatScales\)/);
    assert.match(shinyCss, /\.lineups-page td:is\(\.pos, \.neg\)[\s\S]*background:\s*var\(--shiny-cell-bg/);
    assert.match(shinyCss, /\.longevity-page td\[class\*='probability-'\][\s\S]*color:\s*var\(--shiny-cell-color/);
});

test('Shiny lineups collapse player slots into the archived lineup-table composition', async () => {
    const [lineups, shinyCss] = await Promise.all([
        read('src/routes/lineups/+page.svelte'),
        read('src/shiny-view.css')
    ]);

    assert.match(lineups, /getContext\(DISPLAY_VIEW_CONTEXT\)/);
    assert.match(lineups, /key:\s*'lineup_label',[\s\S]*label:\s*'Lineup'/);
    assert.match(lineups, /data-shiny-table-variant="lineups"/);
    assert.match(lineups, /class="lineup-player-links"/);
    assert.match(lineups, /isShinyView \? lineup\.team_name : teamAbbr\(lineup\.team_name\)/);
    assert.match(shinyCss, /\[data-shiny-table-variant='lineups'\] \.lineup-col\s*\{[\s\S]*width:\s*390px/);
    assert.match(shinyCss, /\[data-shiny-table-variant='lineups'\] \.team-logo\s*\{[\s\S]*display:\s*none/);
});

test('source-derived heat presets stay explicit while supporting new declared metrics', () => {
	const rows = Array.from({ length: 20 }, (_, index) => ({
		dpm: index,
		box_dpm: 20 - index,
		x_new_metric: index * 2
	}));
	const talent = buildPresetHeatScales(rows, 'talent');
	const custom = buildMetricHeatScales(rows, { x_new_metric: 'x_new_metric' });

	assert.deepEqual(Object.keys(talent).sort(), ['box_dpm', 'dpm']);
	assert.ok(custom.x_new_metric);
	assert.match(getMetricHeatVariables('x_new_metric', 38, custom), /#d33f6a/);
});

test('all route families opt into the generalized Shiny surface contract', async () => {
	const routeFiles = [
		'src/routes/+page.svelte',
		'src/routes/wowy/+page.svelte',
		'src/routes/standings/+page.svelte',
		'src/routes/lineups/+page.svelte',
		'src/routes/longevity/+page.svelte',
		'src/routes/trajectories/+page.svelte',
		'src/routes/scatterplot/+page.svelte',
		'src/routes/compare/+page.svelte',
		'src/routes/projections/+page.svelte',
		'src/routes/rate/+page.svelte',
		'src/routes/about/+page.svelte',
		'src/routes/player/[nbaId]/+page.svelte'
	];
	const [files, teamView, shinyCss, percentiles, scatterplot, wowy, projections] = await Promise.all([
		Promise.all(routeFiles.map(read)),
		read('src/lib/components/TeamDetailView.svelte'),
		read('src/shiny-view.css'),
		read('src/lib/components/TalentPercentilesChart.svelte'),
		read('src/lib/components/ScatterplotChart.svelte'),
		read('src/routes/wowy/+page.svelte'),
		read('src/routes/projections/+page.svelte')
	]);

	for (const file of [...files, teamView]) assert.match(file, /data-shiny-page/);
	assert.match(shinyCss, /\[data-shiny-surface='well'\]/);
	assert.match(shinyCss, /\[data-shiny-layout='sidebar'\]/);
	assert.match(shinyCss, /\[data-shiny-role='editorial-kicker'\]\s*\{[^}]*display:\s*none/);
	assert.match(shinyCss, /\[data-shiny-table\]/);
	assert.match(wowy, /class="wowy-eyebrow" data-shiny-role="editorial-kicker"/);
	assert.match(projections, /class="status-eyebrow" data-shiny-role="editorial-kicker"/);
	assert.match(percentiles, /SHINY_SET1/);
	assert.match(percentiles, /renderShinyChart/);
	assert.match(scatterplot, /getShinyChartPreset\('scatter'\)/);
	assert.match(scatterplot, /SHINY_SET1/);
});

test('shared compact charts and mobile navigation inherit the view contract', async () => {
	const [chart, layout] = await Promise.all([
		read('src/lib/components/DpmChart.svelte'),
		read('src/routes/+layout.svelte')
	]);

	assert.match(chart, /getShinyChartPreset\('comparison'\)/);
	assert.match(chart, /SHINY_COLORS\.seriesBlue/);
	assert.match(chart, /if \(!isShinyView\)/);
	assert.match(layout, /aria-hidden=\{!mobileMenuOpen\}/);
	assert.match(layout, /inert=\{!mobileMenuOpen\}/);
});

test('player profile keeps its player identity as the page heading in both views', async () => {
	const profile = await read('src/routes/player/[nbaId]/+page.svelte');

	assert.match(profile, /<h1>\{playerInfo\.player_name\}<\/h1>/);
	assert.doesNotMatch(profile, /<h2>\{playerInfo\.player_name\}<\/h2>/);
});
