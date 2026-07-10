import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const LEADERBOARD_PAGE = 'src/routes/+page.svelte';
const LEADERBOARD_PAGE_SERVER = 'src/routes/+page.server.js';
const LAYOUT_FILE = 'src/routes/+layout.svelte';
const APP_CSS_FILE = 'src/app.css';

test('position rail enforces the displayed minimum games rule', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LEADERBOARD_PAGE), 'utf8');

    assert.match(
        contents,
        /const\s+TOP_POSITION_MIN_GAMES\s*=\s*20;/,
        'leaderboard page should keep the top-position minimum games threshold explicit'
    );
    assert.match(
        contents,
        /\.filter\(\(player\)\s*=>\s*hasMinimumGames\(player,\s*TOP_POSITION_MIN_GAMES\)\)/,
        'top-position rows should filter out players below the displayed minimum-games rule'
    );
    assert.match(
        contents,
        /career_game_num/,
        'the minimum-games check should use the active row career game count supplied by player_ratings'
    );
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

    assert.match(page, /import \{ goto \} from '\$app\/navigation';/);
    assert.match(page, /<option value="current">Current<\/option>/);
    assert.match(page, /goto\(`\/\$\{suffix\}`, \{ keepFocus: true \}\)/);
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
        /\{ href: '\/wowy', label: 'WOWY RAPM', match: \(path\) => path === '\/wowy' \}/,
        'WOWY RAPM should have an exact-match top-level navigation link'
    );
});

test('desktop navigation switches to drawer before links can overflow', async () => {
    const contents = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');
    const drawerBreakpoint = contents.match(/@media\s*\(max-width:\s*1180px\)\s*\{[\s\S]*?\.desktop-links\s*\{[\s\S]*?display:\s*none\s*!important;/);

    assert.ok(drawerBreakpoint, 'desktop links should hide at the tablet drawer breakpoint');
});

test('compact desktop navigation reduces spacing before drawer mode', async () => {
    const appCss = await fs.readFile(path.resolve(process.cwd(), APP_CSS_FILE), 'utf8');
    const layout = await fs.readFile(path.resolve(process.cwd(), LAYOUT_FILE), 'utf8');

    assert.match(appCss, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*?nav \.links a\s*\{[\s\S]*?font-size:\s*12px;[\s\S]*?padding:\s*0 7px;/);
    assert.match(layout, /@media\s*\(max-width:\s*1320px\)\s*\{[\s\S]*?\.theme-slider__input\s*\{[\s\S]*?width:\s*58px;/);
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
