import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import { projectedBoxScore } from '../src/lib/utils/boxScore.js';
import { projectPerGame } from '../src/lib/utils/fantasyScoring.js';
import { echoRows, seasonRows, seasonUnderWay } from '../src/lib/utils/playerSeasons.js';

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('season by season: newest first, minutes per game, the rank for its age, and the Time Machine', () => {
    const seasons = [
        { season: 2025, date: '2025-04-13', tm_id: 1610612743, age: 29.9, games: 70, minutes: 2590, playoff_games: 7, dpm: 7.1, o_dpm: 5.0, d_dpm: null, age_rank: 3, age_count: 580 },
        { season: 2026, date: '2026-06-05', tm_id: 1610612743, age: 31.19, games: 65, minutes: 2210, playoff_games: 0, dpm: 7.35, o_dpm: 5.2, d_dpm: 2.15, age_rank: 4, age_count: 616 }
    ];
    const rows = seasonRows(seasons, { inProgress: null });
    assert.deepEqual(rows.map((row) => row.label), ['2025-26', '2024-25']);
    assert.equal(rows[0].team, 'DEN');
    assert.equal(rows[0].age, 31);
    assert.ok(near(rows[0].mpg, 2210 / 65));
    assert.ok(near(rows[1].defense, 7.1 - 5.0), 'defense fills from DPM minus offense');
    assert.deepEqual([rows[0].ageRank, rows[0].ageCount], [4, 616]);
    // The Time Machine keeps only seasons over by its date.
    assert.deepEqual(seasonRows(seasons, { asOf: '2025-12-01' }).map((row) => row.season), [2025]);
    assert.equal(seasonRows(seasons, { inProgress: 2026 })[0].inProgress, true);
});

test('echoes today: each current player once, at his closest match, closest first', () => {
    const comps = [
        { nba_id: 1, comp_season: 1999, similarity: 81.2, rank: 3 },
        { nba_id: 1, comp_season: 2000, similarity: 88.6, rank: 1 },
        { nba_id: 2, comp_season: 2001, similarity: 84.4, rank: 2 },
        { nba_id: 3, comp_season: 2001, similarity: 90, rank: 1 }
    ];
    const players = new Map([
        [1, { player_name: 'Victor Wembanyama', team_name: 'San Antonio Spurs' }],
        [2, { player_name: 'Chet Holmgren', team_name: 'Oklahoma City Thunder' }]
    ]);
    // Player 3 isn't on the active leaderboard, so he isn't named.
    assert.deepEqual(echoRows(comps, players), [
        { id: 1, name: 'Victor Wembanyama', team: 'San Antonio Spurs', season: 2000, seasonLabel: '1999-00', similarity: 89 },
        { id: 2, name: 'Chet Holmgren', team: 'Oklahoma City Thunder', season: 2001, seasonLabel: '2000-01', similarity: 84 }
    ]);
    assert.equal(echoRows(comps, players, 1).length, 1);
});

test("the projected box score is the Fantasy Lab's per-game line, with its per-100 inputs", () => {
    const player = {
        x_minutes: 34.5, x_pace: 99.2,
        x_pts_100: 38.1, x_orb_100: 4.2, x_drb_100: 12.6, x_ast_100: 13.4, x_stl_100: 2.1, x_blk_100: 1.0,
        x_tov_100: 4.4, x_fg3a_100: 6.3, x_fga_100: 26.0, x_fta_100: 9.8,
        x_fg_pct: 0.58, x_fg3_pct: 0.36, x_ft_pct: 0.81
    };
    const box = projectedBoxScore(player);
    const line = projectPerGame(player);
    const by = Object.fromEntries(box.rows.map((row) => [row.label, row]));
    assert.ok(near(by.Points.perGame, line.pts));
    assert.ok(near(by.Rebounds.perGame, line.reb));
    assert.ok(near(by.Rebounds.per100, 4.2 + 12.6));
    assert.ok(near(by.Offensive.perGame + by.Defensive.perGame, line.reb) && by.Offensive.sub);
    assert.ok(near(by['FG attempts'].perGame, line.fga));
    assert.deepEqual(box.shooting, { fg: 0.58, fg3: 0.36, ft: 0.81 });
    assert.equal(box.minutes, 34.5);
    // Without projected minutes or pace there's no box score.
    assert.equal(projectedBoxScore({ x_pts_100: 30 }), null);
});

test('player pages and the Teams page wire the ports in', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const read = (file) => fs.readFile(path.resolve(process.cwd(), file), 'utf8');
    const page = await read('src/routes/player/[nbaId]/+page.svelte');
    // Echoes and the box score come from today's data, so the Time Machine hides them.
    assert.match(page, /\{#if echoes\.length > 0 && !asOfDate\}/);
    assert.match(page, /<SeasonBySeason rows=\{seasonsTable\}/);
    assert.match(page, /seasonRows\(data\.seasons, \{ asOf: asOfDate, inProgress: inProgressSeason \}\)/);
    // Only current players get a projected box score.
    assert.match(page, /const isCurrentPlayer = \$derived\(Boolean\(playerInfo\) && Number\(playerInfo\.active_roster\) === 1\);/);
    assert.match(page, /playerInfo && !asOfDate && isCurrentPlayer \? projectedBoxScore\(playerInfo\) : null/);

    const comps = await read('src/lib/server/comps.js');
    assert.match(comps, /\.eq\('comp_id', nbaId\)\s*\.lte\('rank', ECHO_MAX_RANK\)/);
    const seasons = await read('src/lib/server/daily.js');
    assert.match(seasons, /from\('player_seasons'\)[\s\S]*?\.eq\('nba_id', nbaId\)/);

    const teams = await read('src/routes/teams/+page.server.js');
    assert.match(teams, /teamsOverview\(ratings, sim\)/);
    const layout = await read('src/routes/+layout.svelte');
    assert.match(layout, /\{ href: '\/teams', label: 'Teams'/);
});

test('a season is "so far" only while its latest row is recent, so the 2026 Finalists read final', async () => {
    const today = new Date('2026-09-29T12:00:00Z');
    // Wembanyama: his rows end at a June 5 forecast, with the Spurs; no offseason row followed.
    assert.equal(seasonUnderWay({ date: '2026-06-05', tm_id: 1610612759, future_game: 1 }, today), false);
    // In season: the next game's forecast, or a game a few weeks back.
    assert.equal(seasonUnderWay({ date: '2026-10-24', tm_id: 1610612759, future_game: 1 }, new Date('2026-10-22T12:00:00Z')), true);
    assert.equal(seasonUnderWay({ date: '2026-02-10', tm_id: 1610612759 }, new Date('2026-02-24T12:00:00Z')), true);
    // An offseason row, or none.
    assert.equal(seasonUnderWay({ date: '2026-07-26', tm_id: -999 }, new Date('2026-07-27T12:00:00Z')), false);
    assert.equal(seasonUnderWay(null, today), false);

    const page = await fs.readFile('src/routes/player/[nbaId]/+page.svelte', 'utf8');
    assert.match(page, /return seasonUnderWay\(latest\) && !asOfDate && isCurrentPlayer \? Number\(latest\.season\) : null;/);
    assert.match(page, /DPM going into each season's last game, since 1996-97\./);
});
