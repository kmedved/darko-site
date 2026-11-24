import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const LEADERBOARD_PAGE = 'src/routes/+page.svelte';
const LEADERBOARD_PAGE_SERVER = 'src/routes/+page.server.js';
const LAYOUT_FILE = 'src/routes/+layout.svelte';
const APP_CSS_FILE = 'src/app.css';

test('the rail\'s podium cards enforce the rule their note states', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE), 'utf8');

    // One rule (utils/leaderboardViews.js podiumRule) for the whole board, filtering the cards and
    // writing their note, so the note always says what the cards count.
    assert.match(contents, /const podium = \$derived\(podiumRule\(players\)\);/);
    assert.match(contents, /\.filter\(podium\.qualifies\)/);
    assert.match(contents, /<p class="insight-note">\{podium\.note\}<\/p>/);
});

test('leaderboard treats database season as ending year for display labels', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE), 'utf8');
    const start = contents.indexOf('function formatSeasonLabel(season)');
    const end = contents.indexOf('function toggleSort(column)', start);

    assert.ok(start >= 0 && end > start, 'leaderboard season formatter should be discoverable');
    const formatterBlock = contents.slice(start, end);

    assert.match(
        contents,
        /import\s+\{\s*formatSeasonEndYearLabel\s*\}\s+from '\$lib\/utils\/seasonUtils\.js';/,
        'leaderboard should use the shared end-year season formatter'
    );
    assert.match(
        formatterBlock,
        /formatSeasonEndYearLabel\(season\)/,
        'database season value 2026 should display as the 2025-26 season'
    );
    assert.doesNotMatch(
        formatterBlock,
        /startYear\s*\+\s*1|Number\.parseInt\(season,\s*10\)/,
        'leaderboard should not reinterpret database season values as start years'
    );
});

test('leaderboard defaults to Current and loads historical snapshots from the URL', async () => {
    const [page, server] = await Promise.all([
        fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE), 'utf8'),
        fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE_SERVER), 'utf8')
    ]);

    assert.match(page, /import \{ afterNavigate, beforeNavigate, goto \} from '\$app\/navigation';/);
    assert.match(page, /<option value="current">Current<\/option>/);
    // A season pick keeps the board's question: filters, sort and columns go along.
    assert.match(page, /const params = leaderboardSearchParams\(urlState\);\s*if \(season !== 'current'\) params\.set\('season', season\);/);
    assert.match(page, /goto\(`\/\$\{search \? `\?\$\{search\}` : ''\}`, \{ keepFocus: true \}\)/);
    assert.match(page, /data\.selectedSeason === null/);
    assert.match(server, /url\.searchParams\.get\('season'\)/);
    assert.match(server, /getLeaderboardSeasons\(\)/);
    assert.match(server, /getSeasonStartPlayers\(selectedSeason\)/);
    assert.match(server, /seasons\.includes\(requestedSeason\)/);
});

test('leaderboard renders one page while retaining the full filtered result set', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE), 'utf8');

    assert.match(contents, /const LEADERBOARD_PAGE_SIZE = 50;/);
    assert.match(contents, /sortedPlayers\.slice\(start, start \+ LEADERBOARD_PAGE_SIZE\)/);
    assert.match(contents, /#each visibleLeaderboardPlayers as player/);
    assert.match(contents, /of \{sortedPlayers\.length\}/);
    assert.match(contents, /buildLeaderboardCsvRows\(sortedPlayers\)/);
});

test('desktop navigation keeps primary links together ahead of display controls', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');
    const navLinks = contents.match(/<div class="links desktop-links">([\s\S]*?)<\/div>\s*<div class="desktop-controls">/);
    const moreNavItems = contents.match(/const MORE_NAV_ITEMS = \[([\s\S]*?)\];/);

    assert.ok(navLinks, 'desktop links should render before theme/font controls');
    assert.ok(moreNavItems, 'overflow desktop nav items should be declared');
    assert.match(navLinks[1], /MORE_NAV_ITEMS/, 'desktop links should include the overflow nav group');
    assert.match(moreNavItems[1], /href:\s*'\/rate'/, 'Rate a Player should be in the desktop nav group');
    assert.match(moreNavItems[1], /href:\s*'\/about'/, 'About should be in the desktop nav group');
});

test('WOWY RAPM is a primary navigation destination', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');
    const primaryNavItems = contents.match(/const PRIMARY_NAV_ITEMS = \[([\s\S]*?)\];/);

    assert.ok(primaryNavItems, 'primary desktop nav items should be declared');
    assert.match(
        primaryNavItems[1],
        /\{ href: '\/wowy', label: 'WOWY RAPM', match: \(path\) => path\.startsWith\('\/wowy'\) \}/,
        'WOWY RAPM should remain active for the leaderboard and its article'
    );
});

test('Teams and the two labs are in the top bar; the specialist views are under More', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');
    const primary = contents.match(/const PRIMARY_NAV_ITEMS = \[([\s\S]*?)\];/)[1];
    const more = contents.match(/const MORE_NAV_ITEMS = \[([\s\S]*?)\];/)[1];
    const hrefs = (block) => [...block.matchAll(/href: '([^']+)'/g)].map((match) => match[1]);

    assert.deepEqual(hrefs(primary), ['/daily', '/', '/trajectories', '/teams', '/standings', '/wowy', '/lineups', '/lab', '/projections', '/research']);
    assert.deepEqual(hrefs(more), ['/rewind', '/longevity', '/scatterplot', '/compare', '/rate', '/assistant', '/about']);
    // Career Trajectories, DARKO's signature view, sits beside the leaderboard.
    assert.match(primary, /\{ href: '\/trajectories', label: 'Career Trajectories', match: \(path\) => path === '\/trajectories' \}/);
    // A team's own page counts as Teams.
    assert.match(primary, /label: 'Teams', match: \(path\) => path === '\/teams' \|\| path\.startsWith\('\/team\/'\)/);
});

test('desktop navigation switches to drawer before links can overflow', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');
    const drawerBreakpoint = contents.match(/@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.desktop-links\s*\{[\s\S]*?display:\s*none\s*!important;/);

    assert.ok(drawerBreakpoint, 'desktop links should hide at the tablet drawer breakpoint');
});

test('compact desktop navigation keeps the active indicator near its label before drawer mode', async () => {
    const appCss = await fs.readFile(path.resolve(process.cwd(), APP_CSS_FILE), 'utf8');
    const layout = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');

    assert.match(appCss, /nav \.links a\s*\{[\s\S]*?padding:\s*8px 10px 9px;[\s\S]*?border-bottom:\s*2px solid transparent;/);
    assert.match(appCss, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*?nav \.links a\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?padding:\s*8px 7px 9px;/);
    // The theme control now sits inside the Display menu; the nav's own controls still tighten.
    assert.match(layout, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*?\.desktop-controls\s*\{[\s\S]*?gap:\s*8px;/);
});

test('the theme control offers four named choices with swatches, not an icon slider', async () => {
    const layout = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');
    const appCss = await fs.readFile(path.resolve(process.cwd(), APP_CSS_FILE), 'utf8');
    const snippet = layout.match(/\{#snippet themeChoices\(name\)\}([\s\S]*?)\{\/snippet\}/);

    assert.match(layout, /const THEMES = \['black', 'dark', 'light', 'white'\];/);
    assert.match(layout, /const THEME_LABELS = \['Black', 'Dark', 'Light', 'White'\];/);
    assert.doesNotMatch(layout, /THEME_ICONS|theme-slider|type="range"/);

    // One radio group, drawn in both menus, each copy under its own name.
    assert.ok(snippet, 'the theme choices should be one shared snippet');
    assert.match(snippet[1], /role="radiogroup" aria-label="Theme"/);
    assert.match(snippet[1], /type="radio"/);
    assert.match(snippet[1], /\{name\}/);
    assert.match(snippet[1], /checked=\{theme === option\}/);
    assert.match(snippet[1], /onchange=\{\(\) => setTheme\(option\)\}/);
    assert.match(snippet[1], /disabled=\{isShinyView\}/);
    assert.match(snippet[1], /\{THEME_LABELS\[index\]\}/);
    assert.match(snippet[1], /class="theme-swatch" style:background="var\(--theme-swatch-\{option\}\)"/);
    assert.match(layout, /\{@render themeChoices\('theme-desktop'\)\}/);
    assert.match(layout, /\{@render themeChoices\('theme-mobile'\)\}/);
    // The Display menu's wrapper is not a <label>, which would pass its clicks to the first radio.
    assert.match(layout, /<div class="display-control" class:disabled=\{isShinyView\}>\s*<span>Theme<\/span>\s*\{@render themeChoices/);

    // Setting a theme still saves it under the same key.
    assert.match(layout, /const THEME_KEY = 'darko-theme';/);
    assert.match(layout, /function setTheme\(nextTheme\)[\s\S]*?localStorage\.setItem\(THEME_KEY, nextTheme\)/);

    // Every theme has a swatch colour, and a ring keeps the black one visible on the black theme.
    for (const theme of ['black', 'dark', 'light', 'white']) {
        assert.match(appCss, new RegExp(`--theme-swatch-${theme}:\\s*#[0-9a-f]{6};`));
    }
    assert.match(layout, /\.theme-swatch\s*\{[\s\S]*?box-shadow:\s*0 0 0 1px var\(--text-muted\);/);
});

test('desktop nav labels stay on one line and avoid scroll-container overflow', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), APP_CSS_FILE), 'utf8');
    const navBlock = contents.match(/nav\s*\{[\s\S]*?\n\}/);
    const linkBlock = contents.match(/nav \.links a\s*\{[\s\S]*?\n\}/);

    assert.ok(navBlock, 'app css should define the nav block');
    assert.ok(linkBlock, 'app css should define nav link styles');
    assert.match(navBlock[0], /overflow-x:\s*clip;/, 'nav should clip overflow without creating a horizontal scroll container');
    assert.match(linkBlock[0], /white-space:\s*nowrap;/, 'desktop nav labels should not wrap into narrow vertical stacks');
});
