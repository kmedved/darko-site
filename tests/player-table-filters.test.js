import test from 'node:test';
import assert from 'node:assert/strict';

import { filterPlayers } from '../src/lib/utils/playerTableFilters.js';
import { LEADERBOARD_COLUMNS } from '../src/lib/utils/leaderboardColumns.js';

const samplePlayer = {
	nba_id: 203999,
	player_name: 'Nikola Jokic',
	team_name: 'Denver Nuggets',
	career_game_num: 750,
	dpm: 7.4,
	o_dpm: 5.5,
	d_dpm: 2.0,
	box_dpm: 4.9,
	box_odpm: 3.8,
	box_ddpm: 1.1,
	x_fga_100: 20.5,
	x_fg_pct: 0.562,
	x_fg3a_100: 5.0,
	x_fg3_pct: 0.35,
	x_fta_100: 7.5,
	x_ft_pct: 0.82,
	sal_market_fixed: 12_300_000
};

const rookiePlayer = {
	nba_id: 999,
	player_name: 'Test Rookie',
	team_name: 'Test Team',
	career_game_num: 50,
	dpm: -1.2,
	o_dpm: -0.5,
	d_dpm: -0.7,
	box_dpm: -1.0,
	box_odpm: -0.3,
	box_ddpm: -0.7,
	x_fga_100: 15.0,
	x_fg_pct: 0.42,
	x_fg3a_100: 6.0,
	x_fg3_pct: 0.32,
	x_fta_100: 3.0,
	x_ft_pct: 0.75,
	sal_market_fixed: 4_200_000
};

test('filterPlayers returns all players when no filters set', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, {});
	assert.equal(result.length, 2);
});

test('filterPlayers applies text substring filter on team_name', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, { team_name: 'denver' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers applies text substring filter on player_name', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, { player_name: 'rookie' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Test Rookie');
});

test('filterPlayers applies > threshold on numeric column', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, { dpm: '>5' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers applies < threshold on numeric column', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, { dpm: '<0' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Test Rookie');
});

test('filterPlayers applies exact match on numeric column', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, { dpm: '7.4' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers compares percentages in their displayed units', () => {
	const players = [samplePlayer, rookiePlayer];
	assert.deepEqual(
		filterPlayers(players, LEADERBOARD_COLUMNS, { x_fg_pct: '56.2%' }).map((player) => player.player_name),
		['Nikola Jokic']
	);
	assert.deepEqual(
		filterPlayers(players, LEADERBOARD_COLUMNS, { x_fg_pct: '>50' }).map((player) => player.player_name),
		['Nikola Jokic']
	);
});

test('filterPlayers compares money columns in displayed millions', () => {
	const players = [samplePlayer, rookiePlayer];
	assert.deepEqual(
		filterPlayers(players, LEADERBOARD_COLUMNS, { sal_market_fixed: '$12.3M' }).map((player) => player.player_name),
		['Nikola Jokic']
	);
	assert.deepEqual(
		filterPlayers(players, LEADERBOARD_COLUMNS, { sal_market_fixed: '>$10M' }).map((player) => player.player_name),
		['Nikola Jokic']
	);
});

test('filterPlayers combines multiple column filters with AND logic', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, {
		team_name: 'denver',
		dpm: '>5'
	});
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers returns empty when AND filters conflict', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, {
		team_name: 'denver',
		dpm: '<0'
	});
	assert.equal(result.length, 0);
});

test('filterPlayers ignores empty/whitespace filters', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEADERBOARD_COLUMNS, { dpm: '  ', team_name: '' });
	assert.equal(result.length, 2);
});
