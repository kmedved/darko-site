import test from 'node:test';
import assert from 'node:assert/strict';

import {
    activePlayerPool,
    findTeam,
    interpretAsk,
    matchPlayers,
    normalizeAskText,
    parseAskDate,
    parseLeaderboardQuestion,
    runLeaderboardQuestion
} from '../src/lib/utils/askDarko.js';

const PLAYERS = [
    { nba_id: 1, player_name: 'Nikola Jokić', team_name: 'Denver Nuggets', position: 'C', age: 31.4, season: 2026, rookie_season: 2016, dpm: 6.8, o_dpm: 4.8, d_dpm: 2.0, x_minutes: 34, x_pts_100: 38, x_ast_100: 13, x_orb_100: 4, x_drb_100: 12, x_blk_100: 1.2, x_stl_100: 1.9, x_fga_100: 26, x_fg3a_100: 5, x_fta_100: 9, x_fg3_pct: 0.34, surplus_value: 46e6 },
    { nba_id: 2, player_name: 'Victor Wembanyama', team_name: 'San Antonio Spurs', position: 'C', age: 22.7, season: 2026, rookie_season: 2024, dpm: 4.1, o_dpm: 0.9, d_dpm: 3.2, x_minutes: 31, x_pts_100: 33, x_ast_100: 5, x_orb_100: 4, x_drb_100: 15, x_blk_100: 5.6, x_stl_100: 1.7, x_fga_100: 27, x_fg3a_100: 9, x_fta_100: 8, x_fg3_pct: 0.35, surplus_value: 30e6 },
    { nba_id: 3, player_name: 'Giannis Antetokounmpo', team_name: 'Milwaukee Bucks', position: 'F', age: 31.8, season: 2026, rookie_season: 2014, dpm: 4.6, o_dpm: 3.2, d_dpm: 1.4, x_minutes: 33, x_pts_100: 42, x_ast_100: 8, x_orb_100: 3, x_drb_100: 14, x_blk_100: 1.5, x_stl_100: 1.3, x_fga_100: 28, x_fg3a_100: 1, x_fta_100: 14, x_fg3_pct: 0.25, surplus_value: 5e6 },
    { nba_id: 4, player_name: 'Cooper Flagg', team_name: 'Dallas Mavericks', position: 'F', age: 19.6, season: 2026, rookie_season: 2026, dpm: -0.1, o_dpm: 0.6, d_dpm: -0.7, x_minutes: 33, x_pts_100: 29, x_ast_100: 6, x_orb_100: 2, x_drb_100: 8, x_blk_100: 1.3, x_stl_100: 1.8, x_fga_100: 25, x_fg3a_100: 6, x_fta_100: 7, x_fg3_pct: 0.3, surplus_value: 2e6 },
    { nba_id: 5, player_name: 'Josh Hart', team_name: 'New York Knicks', position: 'G-F', age: 30.8, season: 2026, rookie_season: 2018, dpm: 2.0, o_dpm: 0.8, d_dpm: 1.2, x_minutes: 30, x_pts_100: 17, x_ast_100: 7, x_orb_100: 4, x_drb_100: 13, x_blk_100: 0.5, x_stl_100: 2.1, x_fga_100: 13, x_fg3a_100: 5, x_fta_100: 3, x_fg3_pct: 0.33, surplus_value: -3e6 },
    { nba_id: 6, player_name: 'Bench Guard', team_name: 'New York Knicks', position: 'G', age: 24, season: 2026, rookie_season: 2024, dpm: 3.5, o_dpm: 2.0, d_dpm: 1.5, x_minutes: 4, x_pts_100: 20, x_ast_100: 6, x_orb_100: 1, x_drb_100: 5, x_blk_100: 0.3, x_stl_100: 1.1, x_fga_100: 18, x_fg3a_100: 8, x_fta_100: 3, x_fg3_pct: 0.4, surplus_value: 1e6 }
];
const POOL = activePlayerPool(PLAYERS);
const CALENDAR = [
    { season: 2016, first_game: '2015-10-27', regular_season_end: '2016-04-13', last_game: '2016-06-19' },
    { season: 2026, first_game: '2025-10-21', regular_season_end: '2026-04-12', last_game: '2026-06-03' }
];
const CONTEXT = { players: PLAYERS, pool: POOL, calendar: CALENDAR, season: 2026, today: '2026-09-27' };

test('text is normalised the way names and questions are matched', () => {
    assert.equal(normalizeAskText('  Nikola  JOKIĆ! '), 'nikola jokic');
    assert.equal(normalizeAskText('Who’s best?'), "who's best");
});

test('teams resolve from names, nicknames, cities, aliases and capitalised abbreviations', () => {
    assert.equal(findTeam('Knicks').abbr, 'NYK');
    assert.equal(findTeam('the Knicks').abbr, 'NYK');
    assert.equal(findTeam('new york').abbr, 'NYK');
    assert.equal(findTeam('Trail Blazers').abbr, 'POR');
    assert.equal(findTeam('sixers').abbr, 'PHI');
    assert.equal(findTeam('OKC').abbr, 'OKC');
    // "min" and "den" are words too, so they count only in capitals.
    assert.equal(findTeam('min'), null);
    assert.equal(findTeam('MIN', 'MIN').abbr, 'MIN');
    // "Los Angeles" is two teams; a four-letter prefix works.
    assert.equal(findTeam('los angeles'), null);
    assert.equal(findTeam('warr').abbr, 'GSW');
});

test('player matches rank exact over prefix over word prefix over anywhere', () => {
    assert.deepEqual(matchPlayers('jokic', POOL).map((p) => p.id), [1]);
    assert.deepEqual(matchPlayers('wemb', POOL).map((p) => p.id), [2]);
    const hart = matchPlayers('hart', POOL);
    assert.equal(hart[0].id, 5);
    assert.deepEqual(matchPlayers('x', POOL), []);
});

test('leaderboard questions parse sizes, positions, ages, sorts and teams', () => {
    const filter = parseLeaderboardQuestion('top 5 young defenders');
    assert.equal(filter.n, 5);
    assert.equal(filter.maxAge, 24);
    assert.equal(filter.sort.label, 'defense');
    assert.ok(filter.hit);

    const knicks = parseLeaderboardQuestion('best guards on the knicks');
    assert.equal(knicks.position, 'G');
    assert.equal(knicks.team.abbr, 'NYK');

    assert.equal(parseLeaderboardQuestion('centers over 30').minAge, 30);
    assert.equal(parseLeaderboardQuestion('shot blockers').sort.label, 'blocks per 100');
});

test('leaderboard answers keep rotation players unless a team is named', () => {
    const board = runLeaderboardQuestion(parseLeaderboardQuestion('best guards'), PLAYERS);
    // The 4-minute guard sits out; the G-F wing counts as a guard.
    assert.deepEqual(board.rows.map((row) => row.id), [5]);
    assert.equal(board.title, 'Top 1 guards by DPM');

    const knicks = runLeaderboardQuestion(parseLeaderboardQuestion('best knicks'), PLAYERS);
    assert.deepEqual(knicks.rows.map((row) => row.id), [6, 5]);

    const shooters = runLeaderboardQuestion(parseLeaderboardQuestion('3-point shooters'), PLAYERS);
    // Giannis takes one three per 100, under the four-attempt floor.
    assert.ok(!shooters.rows.some((row) => row.id === 3));
    assert.equal(shooters.rows[0].value, '35.0%');

    const rookies = runLeaderboardQuestion(parseLeaderboardQuestion('rookies'), PLAYERS, { season: 2026 });
    assert.deepEqual(rookies.rows.map((row) => row.id), [4]);

    const overpaid = runLeaderboardQuestion(parseLeaderboardQuestion('overpaid'), PLAYERS);
    assert.equal(overpaid.rows[0].id, 5);
    assert.equal(overpaid.rows[0].value, '-$3.0M');
});

test('dates come from days, months, seasons and "today"', () => {
    const options = { calendar: CALENDAR, today: '2026-09-27' };
    assert.deepEqual(parseAskDate('2016-02-01', options), { date: '2016-02-01', season: 2016 });
    assert.deepEqual(parseAskDate('2016', options), { date: '2016-04-13', season: 2016 });
    assert.deepEqual(parseAskDate('2015-16', options), { date: '2016-04-13', season: 2016 });
    assert.deepEqual(parseAskDate('2016-03', options), { date: '2016-03-01', season: 2016 });
    assert.deepEqual(parseAskDate('today', options), { today: true });
    assert.equal(parseAskDate('2030-01-01', options), null);
    assert.equal(parseAskDate('1990', options), null);
    assert.equal(parseAskDate('standings', options), null);
});

test('a trade opens the Roster Lab with the move made', () => {
    const { answers } = interpretAsk('trade Giannis to the Knicks', CONTEXT);
    assert.equal(answers[0].kind, 'trade');
    assert.equal(answers[0].href, '/lab?trade=3&to=NYK');
    assert.match(answers[0].detail, /MIL and NYK/);
    // A player already on that team is no trade; the Lab opens with his team instead.
    const same = interpretAsk('trade Josh Hart to the Knicks', CONTEXT).answers;
    assert.equal(same.length, 1);
    assert.equal(same[0].href, '/lab?a=NYK');
    assert.match(same[0].title, /already plays for the New York Knicks/);
});

test('two players compare side by side', () => {
    const { answers } = interpretAsk('Jokic vs Wembanyama', CONTEXT);
    assert.equal(answers[0].kind, 'compare');
    assert.equal(answers[0].href, '/compare?ids=1,2');
    const dpm = answers[0].stats.find(([label]) => label === 'DPM');
    assert.deepEqual(dpm, ['DPM', '+6.8', '+4.1', 1]);
});

test('dates, team pages and fantasy scoring become links', () => {
    const rewind = interpretAsk('rewind to 2016', CONTEXT).answers[0];
    assert.equal(rewind.href, '/rewind?asof=2016-04-13');
    assert.equal(rewind.title, 'Rewind to April 13, 2016');
    assert.equal(interpretAsk('2016-02-01', CONTEXT).answers[0].href, '/rewind?asof=2016-02-01');
    assert.equal(interpretAsk('go back to today', CONTEXT).answers[0].clearDate, true);

    assert.equal(interpretAsk('payroll Knicks', CONTEXT).answers[0].href, '/team/NYK#team-dna');
    assert.equal(interpretAsk('fantasy 9-cat', CONTEXT).answers[0].href, '/projections?scoring=categories');
    assert.equal(interpretAsk('draftkings', CONTEXT).answers[0].href, '/projections?scoring=draftkings');
});

test('comps questions open the player page at Comps & futures', () => {
    for (const question of ['comps for wembanyama', 'Wembanyama comps', "wembanyama's comps", 'players like Wembanyama']) {
        const [answer] = interpretAsk(question, CONTEXT).answers;
        assert.equal(answer?.kind, 'comps', question);
        assert.equal(answer.href, '/player/2#comps');
    }
    // Two players are still a comparison, not comps.
    assert.equal(interpretAsk('compare jokic and wemb', CONTEXT).answers[0].kind, 'compare');
    assert.equal(interpretAsk('comps for nobody at all', CONTEXT).answers.length, 0);
});

test('questions answer from the leaderboard; a bare team is just the team', () => {
    const board = interpretAsk('best defenders under 25', CONTEXT).answers[0];
    assert.equal(board.kind, 'board');
    assert.deepEqual(board.rows.map((row) => row.id), [2, 4]);

    const okc = interpretAsk('OKC', CONTEXT);
    assert.equal(okc.answers.length, 0);
    assert.equal(okc.teams[0].abbr, 'OKC');
});

test('pages open by name, with or without "go to"', () => {
    assert.deepEqual(interpretAsk('standings', CONTEXT).pages, [{ label: 'Standings', href: '/standings' }]);
    assert.deepEqual(interpretAsk('go to the roster lab', CONTEXT).pages, [{ label: 'Roster Lab', href: '/lab' }]);
    // "go to standings" is a page, not a date.
    assert.equal(interpretAsk('go to standings', CONTEXT).answers.length, 0);
});

test('without player data yet, questions wait but pages and dates still work', () => {
    const loading = { ...CONTEXT, players: null, pool: [] };
    assert.equal(interpretAsk('best defenders', loading).answers.length, 0);
    assert.equal(interpretAsk('rewind to 2016', loading).answers[0].kind, 'date');
    assert.equal(interpretAsk('lab', loading).pages[0].href, '/lab');
});
