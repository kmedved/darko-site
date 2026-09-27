import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const WOWY_PAGE = 'src/routes/wowy/+page.svelte';
const WOWY_PAGE_SERVER = 'src/routes/wowy/+page.server.js';
const WOWY_ALL_TIME_API = 'src/routes/api/wowy/all-time/+server.js';

async function read(file) {
    return fs.readFile(path.resolve(process.cwd(), file), 'utf8');
}

test('WOWY leaderboard loader serves Season-Adjusted ratings, Current, and URL-selected seasons', async () => {
    const contents = await read(WOWY_PAGE_SERVER);

    assert.match(contents, /getActiveWowyPlayers/);
    assert.match(contents, /getWowyAdjustedAllTimePage/);
    assert.match(contents, /getWowyAdjustedSeasonPlayers/);
    assert.match(contents, /getWowyLeaderboardSeasons/);
    assert.match(contents, /getWowyPublication/);
    // The leaderboard no longer offers the unweighted season averages.
    assert.doesNotMatch(contents, /getWowyAllTimePage\b/);
    assert.doesNotMatch(contents, /getWowySeasonPlayers\b/);
    assert.doesNotMatch(contents, /searchParams\.get\('rating'\)/);
    assert.match(contents, /load\(\{ url, setHeaders \}\)/);
    assert.match(contents, /Promise\.all\(\[\s*getWowyLeaderboardSeasons\(\),\s*getWowyPublication\(\)/s);
    assert.match(contents, /publication\?\.season_adjusted_from/);
    assert.match(contents, /const seasons = publishedSeasons\.filter\(\(season\) => season >= seasonAdjustedFrom\);/);
    assert.match(contents, /url\.searchParams\.get\('season'\)/);
    assert.match(contents, /seasons\.includes\(requestedSeason\)/);
    assert.match(contents, /url\.searchParams\.get\('view'\) === 'current'/);
    assert.match(contents, /requestedSeasonValue\.trim\(\) === 'current'/);
    assert.match(contents, /const selectedView = selectedSeason !== null/);
    assert.match(contents, /players = await getWowyAdjustedSeasonPlayers\(selectedSeason\);/);
    assert.match(contents, /players = await getActiveWowyPlayers\(\);/);
    assert.match(contents, /const page = await getWowyAdjustedAllTimePage\(\);/);
    assert.match(contents, /allTimeTotal = page\.totalCount/);
    assert.match(contents, /allTimeHasMore = page\.hasMore/);
    // A clicked team arrives as ?team= and the page filters to it.
    assert.match(contents, /selectedTeam: parseTeamParam\(url\.searchParams\.get\('team'\)\)/);
    assert.match(contents, /setEdgeCache\(setHeaders, \{/);
    assert.match(contents, /edgeSMaxAge:\s*300/);
    assert.match(contents, /swr:\s*3600/);
});

test('WOWY leaderboard shows Season-Adjusted ratings by season, all time, and Current', async () => {
    const contents = await read(WOWY_PAGE);

    assert.match(contents, /import \{ goto, replaceState \} from '\$app\/navigation';/);
    assert.match(contents, /formatSeasonEndYearLabel/);
    assert.match(contents, /data\.selectedView === 'all-time'/);
    assert.match(contents, /const hasAllTimeRanks/);
    assert.match(contents, /return hasAllTimeRanks \? 'all-time' : 'current';/);
    assert.match(contents, /const isAllTimeView/);
    assert.match(contents, /All Season-Adjusted WOWY RAPM player-seasons, loaded 100 at a time/);
    assert.match(contents, /Every Season-Adjusted WOWY RAPM player-season/);
    assert.match(contents, /All-time adjusted seasons/);
    assert.match(contents, /no default possession cutoff/);
    assert.match(contents, /<option value="all-time">All time<\/option>/);
    assert.match(contents, /<option value="current">Current<\/option>/);
    assert.match(contents, /Latest observed/);
    assert.match(contents, /isCurrentView[\s\S]*Latest observed WOWY RAPM ratings for current active NBA players/);
    assert.match(contents, /Season-Adjusted WOWY RAPM ratings for NBA players/);
    assert.match(contents, /does not use DARKO projection rows/);
    assert.match(contents, /Current active players/);
    assert.match(contents, /id="wowy-season-filter"/);
    assert.match(contents, /data\.selectedSeason === null/);
    assert.match(contents, /params\.set\('view', 'current'\)/);
    assert.match(contents, /goto\(seasonHref\(event\.currentTarget\.value\), \{ keepFocus: true \}\);/);

    // Only the Season-Adjusted view is exposed: no rating toggle and no average or opening-game views.
    assert.doesNotMatch(contents, /wowy-rating-mode/);
    assert.doesNotMatch(contents, /<span>Average<\/span>/);
    assert.doesNotMatch(contents, /selectRatingMode|preloadRatingMode|isAdjustedRatings|selectedRatingMode/);
    assert.doesNotMatch(contents, /seasonAverageTableColumns|openingGameTableColumns|\ballTimeTableColumns\b/);
    assert.doesNotMatch(contents, /Avg WOWY RAPM|unweighted average|Opening-game snapshot/i);
    assert.doesNotMatch(contents, /isSeasonSummaryHistory|historicalSnapshotContext/);

    // Seasons and teams are links: a season opens it, a team opens its season filtered to that team.
    assert.match(contents, /function playerSeasonHref\(player\)/);
    assert.match(contents, /function teamSeasonHref\(player, team\)/);
    assert.match(contents, /if \(team\) params\.set\('team', team\);/);
    assert.match(contents, /href=\{playerSeasonHref\(player\)\}/);
    assert.match(contents, /href=\{teamSeasonHref\(player, team\)\}/);
    assert.match(contents, /href=\{teamSeasonHref\(player, player\.team_name\)\}/);
    assert.match(contents, /class="wowy-filter-link"/);
    assert.match(contents, /teamFilter = team \?\? 'all';/);
    assert.match(contents, /const team = data\.selectedTeam;/);
    assert.match(contents, /replaceState\(url, \{\}\);/);

    assert.match(contents, /snapshot_context/);
    assert.match(contents, /team_code/);
    assert.match(contents, /team_codes/);
    assert.match(contents, /team_names/);
    assert.match(contents, /isHistoricalSeasonSummary/);
    assert.match(contents, /teamFilterValues/);
    assert.match(contents, /teamOptionEntries/);
    assert.match(contents, /if \(isHistoricalSeasonSummary\(player\)\)/);
    assert.match(contents, /wowy_rapm/);
    assert.match(contents, /wowy_orapm/);
    assert.match(contents, /wowy_drapm/);
    assert.match(contents, /exposure/);
    assert.match(contents, /career_game_num/);
    assert.match(contents, /season_games/);
    assert.match(contents, /leaderboard_rank/);
    assert.match(contents, /allTimeRank\(player, fallbackRank\)/);
    assert.match(contents, /function playerRowKey\(player\)/);
    assert.match(contents, /\{#each visiblePlayers as player, index \(playerRowKey\(player\)\)\}/);
    assert.match(contents, /formatPlayerSeason\(player\)/);
    assert.match(contents, /allTimeAdjustedTableColumns/);
    assert.match(contents, /label: 'Season'/);
    assert.match(contents, /Adjusted WOWY RAPM/);
    assert.match(contents, /Adjusted O-RAPM/);
    assert.match(contents, /Adjusted D-RAPM/);
    assert.match(contents, /label: 'Minutes'/);
    assert.match(contents, /label: 'BPM'/);
    assert.match(contents, /publication\.data_through/);
    assert.match(contents, /href="\/wowy\/about"/);
    assert.match(contents, /Read how WOWY works/);
    assert.match(contents, /\/trajectories\?ids=\$\{encodeURIComponent\(player\.nba_id\)\}&metric=wowy_rapm/);
    assert.doesNotMatch(contents, /Final observed/i);
    assert.doesNotMatch(contents, /opening roster/i);
    assert.doesNotMatch(contents, /before that team’s opening game/i);
    assert.doesNotMatch(contents, /Observed leaders|leaderCards|buildLeaderCard|wowy-leader-/);
});

test('single-season Adjusted uses the same Minutes and BPM context as all-time', async () => {
    const contents = await read(WOWY_PAGE);
    const adjustedStart = contents.indexOf('const seasonAdjustedTableColumns');
    const adjustedEnd = contents.indexOf('const allTimeAdjustedTableColumns', adjustedStart);
    const adjustedColumns = contents.slice(adjustedStart, adjustedEnd);

    assert.ok(adjustedStart >= 0 && adjustedEnd > adjustedStart);
    assert.match(adjustedColumns, /label: 'Minutes'/);
    assert.match(adjustedColumns, /label: 'BPM'/);
    assert.doesNotMatch(adjustedColumns, /label: 'Possessions'/);
    assert.doesNotMatch(adjustedColumns, /label: 'Games'/);
    assert.doesNotMatch(adjustedColumns, /label: 'Last game'/);
    assert.match(contents, /\{#if !isCurrentView\}/);
});

test('WOWY leaderboard supports sorting, filtering, loaded CSV export, and mobile table access', async () => {
    const contents = await read(WOWY_PAGE);
    const desktopColumnsStart = contents.indexOf('@media (hover: hover) and (pointer: fine) and (max-width: 980px)');
    const touchStart = contents.indexOf('/* Touch/mobile scroll mode */');
    const touchEnd = contents.indexOf('/* End touch/mobile scroll mode */');

    assert.match(contents, /getNextSortState/);
    assert.match(contents, /getSortedRows/);
    assert.equal(
        (contents.match(/aria-sort=\{getSortAriaValue\(sortColumn, sortDirection, column\.key\)\}/g) ?? []).length,
        2
    );
    assert.match(contents, /const seasonSortColumns = new Set/);
    assert.match(contents, /const allTimeSortColumns = new Set\(\[\.\.\.seasonSortColumns, 'season'\]\)/);
    assert.match(contents, /const currentSortColumns = new Set/);
    assert.match(contents, /const supportedSortColumns = view === 'all-time'/);
    assert.match(contents, /if \(!supportedSortColumns\.has\(sortColumn\)\)/);
    assert.match(contents, /sortColumn = 'wowy_rapm';/);
    assert.match(contents, /sortDirection = 'desc';/);
    assert.match(contents, /setTeamFilter/);
    assert.match(contents, /const positionOptions = \[/);
    assert.match(contents, /\{ value: 'G', label: 'Guards' \}/);
    assert.match(contents, /\{ value: 'F', label: 'Forwards' \}/);
    assert.match(contents, /\{ value: 'C', label: 'Centers' \}/);
    assert.match(contents, /let positionFilter = \$state\('all'\);/);
    assert.match(contents, /const activePositionFilter = \$derived/);
    assert.match(contents, /function playerFilterPosition\(player\)/);
    assert.match(contents, /player\?\.filter_position \?\? player\?\.position/);
    assert.match(contents, /function playerMatchesPosition\(player, positionGroup\)/);
    assert.match(contents, /split\('-'\)\.includes\(positionGroup\)/);
    assert.match(contents, /setPositionFilter/);
    assert.match(contents, /id="wowy-position-filter"/);
    assert.match(contents, /<option value="all">All positions<\/option>/);
    assert.match(contents, /let minHeight = \$state\(''\);/);
    assert.match(contents, /let maxHeight = \$state\(''\);/);
    assert.match(contents, /const heightOptions = \$derived\.by/);
    assert.match(contents, /function playerHeightInches\(player\)/);
    assert.match(contents, /player\?\.height_inches \?\? player\?\.height/);
    assert.match(contents, /height !== null && height > 0/);
    assert.match(contents, /function matchesHeightRange\(player, minimum, maximum\)/);
    assert.match(contents, /if \(minimum === null && maximum === null\) return true;/);
    assert.match(contents, /if \(height === null\) return false;/);
    assert.match(contents, /function formatHeightLabel\(value\)/);
    assert.match(contents, /function setHeightFilter\(bound, value\)/);
    assert.match(contents, /function clearHeightFilters\(\)/);
    assert.match(contents, /let minPossessions = \$state\(''\);/);
    assert.match(contents, /let maxPossessions = \$state\(''\);/);
    assert.match(contents, /function playerSeasonPossessions\(player\)/);
    assert.match(contents, /function matchesPossessionRange\(player, minimum, maximum\)/);
    assert.match(contents, /function setPossessionFilter\(bound, value\)/);
    assert.match(contents, /function clearPossessionFilters\(\)/);
    assert.match(contents, /<details class="wowy-advanced-filters">/);
    assert.match(contents, /<summary>[\s\S]*Advanced filters/);
    assert.match(contents, /id="wowy-min-height-filter"/);
    assert.match(contents, /id="wowy-max-height-filter"/);
    assert.match(contents, /id="wowy-min-possessions-filter"/);
    assert.match(contents, /id="wowy-max-possessions-filter"/);
    assert.match(contents, /Includes regular-season and playoff possessions/);
    assert.match(contents, /<option value="">No minimum<\/option>/);
    assert.match(contents, /<option value="">No maximum<\/option>/);
    assert.match(contents, /Players without a recorded height are excluded only when a bound is set/);
    assert.match(contents, /positionFilter = 'all';[\s\S]*minHeight = '';[\s\S]*maxHeight = '';/);
    assert.match(contents, /setSearchQuery/);
    assert.match(contents, /const ALL_TIME_BATCH_SIZE = 100;/);
    assert.match(contents, /function loadAllTimePage/);
    assert.match(contents, /fetch\(buildAllTimeRequestUrl\(offset\)\)/);
    assert.match(contents, /Load \$\{ALL_TIME_BATCH_SIZE\} more/);
    assert.match(contents, /allTimePlayers\.length\.toLocaleString/);
    assert.match(contents, /allTimeTotal\.toLocaleString/);
    assert.match(contents, /sortedPlayers\.map\(\(player, index\) => \(\{/);
    assert.match(contents, /rank: isAllTimeView \? allTimeRank\(player, index \+ 1\) : index \+ 1/);
    assert.match(contents, /wowyAdjustedAllTimeLeaderboardCsvColumns/);
    assert.match(contents, /wowyAdjustedHistoricalLeaderboardCsvColumns/);
    assert.match(contents, /wowyLeaderboardCsvColumns/);
    assert.match(contents, /isAllTimeView[\s\S]*wowyAdjustedAllTimeLeaderboardCsvColumns[\s\S]*isCurrentView[\s\S]*wowyLeaderboardCsvColumns[\s\S]*wowyAdjustedHistoricalLeaderboardCsvColumns/);
    assert.match(contents, /-season-adjusted`/);
    assert.match(contents, /class:wowy-table--all-time=\{isAllTimeView\}/);
    assert.match(contents, /setupWideStickyTable/);
    assert.match(contents, /class="sticky-header-shell"/);
    assert.match(contents, /class="table-header-scroll"/);
    assert.match(contents, /class="table-body-scroll"/);
    assert.match(contents, /id=\{`wowy-column-\$\{column\.key\}`\}/);
    assert.match(contents, /class="table-semantic-row sr-only"/);
    assert.match(contents, /role="presentation"/);
    assert.match(contents, /headers="wowy-column-player_name"/);
    assert.match(contents, /headers=\{`wowy-column-\$\{teamColumnKey\}`\}/);
    assert.match(contents, /getMetricHeatVariables\('dpm', player\.wowy_rapm, heatScales\)/);
    assert.match(contents, /getMetricHeatVariables\('o_dpm', player\.wowy_orapm, heatScales\)/);
    assert.match(contents, /getMetricHeatVariables\('d_dpm', player\.wowy_drapm, heatScales\)/);
    assert.match(contents, /buildPresetHeatScales\(players, 'wowy'\)/);
    assert.doesNotMatch(contents, /buildPresetHeatScales\((?:sortedPlayers|filteredPlayers), 'wowy'\)/);
    assert.ok(desktopColumnsStart >= 0 && touchStart > desktopColumnsStart, 'page should define desktop column priorities');
    assert.ok(touchStart >= 0 && touchEnd > touchStart, 'page should define a touch-table mode');

    // Narrow windows scroll the table under its pinned header; no column is hidden to fit.
    const desktopColumnsBlock = contents.slice(desktopColumnsStart, touchStart);
    assert.match(desktopColumnsBlock, /\.wowy-table\s*\{\s*min-width: 900px;/);
    assert.doesNotMatch(desktopColumnsBlock, /nth-child[\s\S]*display:\s*none/);

    const touchBlock = contents.slice(touchStart, touchEnd);
    assert.match(touchBlock, /hover:\s*none/);
    assert.match(touchBlock, /pointer:\s*coarse/);
    assert.match(touchBlock, /any-hover:\s*none/);
    assert.match(touchBlock, /any-pointer:\s*coarse/);
    assert.match(touchBlock, /max-width:\s*1024px/);
    assert.match(touchBlock, /\.table-body-scroll\s*\{[\s\S]*-webkit-overflow-scrolling:\s*touch;/);
    assert.match(touchBlock, /\.wowy-table\s*\{[\s\S]*width:\s*max-content;[\s\S]*min-width:\s*900px;/);
    assert.match(contents, /\.sticky-header-shell\s*\{[\s\S]*position:\s*sticky;[\s\S]*top:\s*var\(--nav-sticky-offset\);/);
    assert.match(contents, /\.table-body-scroll\s*\{[\s\S]*overflow-x:\s*auto;/);
    assert.match(contents, /\.wowy-table-shell\s*\{[\s\S]*overflow:\s*visible;/);
    assert.match(contents, /@media \(max-width: 840px\)\s*\{[\s\S]*?\.table-body-scroll\s*\{[\s\S]*?-webkit-overflow-scrolling:\s*touch;/);
});

test('all-time WOWY API forwards complete filters into bounded server pages', async () => {
    const contents = await read(WOWY_ALL_TIME_API);

    assert.match(contents, /WOWY_ALL_TIME_PAGE_SIZE/);
    assert.match(contents, /getWowyAllTimePage/);
    assert.match(contents, /getWowyAdjustedAllTimePage/);
    assert.match(contents, /minPossessions: numericParam\(url, 'min_possessions'\)/);
    assert.match(contents, /maxPossessions: numericParam\(url, 'max_possessions'\)/);
    assert.match(contents, /offset: numericParam\(url, 'offset'\) \?\? 0/);
    assert.match(contents, /sortColumn: textParam\(url, 'sort'\)/);
    assert.match(contents, /sortDirection: textParam\(url, 'direction'\)/);
    assert.match(contents, /edgeSMaxAge: 300/);
    assert.match(contents, /return json\(\{ error: error\.message \}, \{ status: 400 \}\)/);
});
