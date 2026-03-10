import test from 'node:test';
import assert from 'node:assert/strict';

import {
	LEGACY_COLUMNS,
	enrichPlayer,
	filterPlayers
} from '../src/lib/utils/legacyLeaderboard.js';

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
	x_ft_pct: 0.82
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
	x_ft_pct: 0.75
};

// --- LEGACY_COLUMNS ---

test('LEGACY_COLUMNS has 17 columns', () => {
	assert.equal(LEGACY_COLUMNS.length, 17);
});

test('LEGACY_COLUMNS starts with rank, player, and team to match the standard leaderboard', () => {
	assert.equal(LEGACY_COLUMNS[0].key, '_rank');
	assert.equal(LEGACY_COLUMNS[1].key, 'player_name');
	assert.equal(LEGACY_COLUMNS[2].key, 'team_name');
});

test('LEGACY_COLUMNS includes the standard salary and surplus columns', () => {
	const keys = LEGACY_COLUMNS.map((c) => c.key);
	assert.ok(keys.includes('sal_market_fixed'));
	assert.ok(keys.includes('surplus_value'));
	assert.ok(!keys.includes('actual_salary'));
	assert.ok(keys.includes('on_off_dpm'));
});

// --- enrichPlayer ---

test('enrichPlayer marks veteran (>= 164 games) as Vet', () => {
	const enriched = enrichPlayer(samplePlayer);
	assert.equal(enriched._experience, 'Vet');
});

test('enrichPlayer marks rookie (< 164 games) as Rk', () => {
	const enriched = enrichPlayer(rookiePlayer);
	assert.equal(enriched._experience, 'Rk');
});

test('enrichPlayer handles missing career_game_num as Rk', () => {
	const enriched = enrichPlayer({ ...samplePlayer, career_game_num: null });
	assert.equal(enriched._experience, 'Rk');
});

test('enrichPlayer computes _fg3a_rate as fg3a/fga', () => {
	const enriched = enrichPlayer(samplePlayer);
	const expected = 5.0 / 20.5;
	assert.ok(Math.abs(enriched._fg3a_rate - expected) < 0.001);
});

test('enrichPlayer computes _fta_rate as fta/fga', () => {
	const enriched = enrichPlayer(samplePlayer);
	const expected = 7.5 / 20.5;
	assert.ok(Math.abs(enriched._fta_rate - expected) < 0.001);
});

test('enrichPlayer returns null rates when fga is zero', () => {
	const enriched = enrichPlayer({ ...samplePlayer, x_fga_100: 0 });
	assert.equal(enriched._fg3a_rate, null);
	assert.equal(enriched._fta_rate, null);
});

test('enrichPlayer returns null rates when fga is missing', () => {
	const enriched = enrichPlayer({ ...samplePlayer, x_fga_100: null });
	assert.equal(enriched._fg3a_rate, null);
	assert.equal(enriched._fta_rate, null);
});

test('enrichPlayer preserves original fields', () => {
	const enriched = enrichPlayer(samplePlayer);
	assert.equal(enriched.player_name, 'Nikola Jokic');
	assert.equal(enriched.dpm, 7.4);
});

// --- filterPlayers ---

test('filterPlayers returns all players when no filters set', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, {});
	assert.equal(result.length, 2);
});

test('filterPlayers applies text substring filter on team_name', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, { team_name: 'denver' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers applies text substring filter on player_name', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, { player_name: 'rookie' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Test Rookie');
});

test('filterPlayers applies > threshold on numeric column', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, { dpm: '>5' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers applies < threshold on numeric column', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, { dpm: '<0' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Test Rookie');
});

test('filterPlayers applies exact match on numeric column', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, { dpm: '7.4' });
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers also works with raw standard leaderboard rows', () => {
	const players = [samplePlayer, rookiePlayer];
	const result = filterPlayers(players, LEGACY_COLUMNS, {
		player_name: 'nikola',
		dpm: '>5'
	});
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers combines multiple column filters with AND logic', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, {
		team_name: 'denver',
		dpm: '>5'
	});
	assert.equal(result.length, 1);
	assert.equal(result[0].player_name, 'Nikola Jokic');
});

test('filterPlayers returns empty when AND filters conflict', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, {
		team_name: 'denver',
		dpm: '<0'
	});
	assert.equal(result.length, 0);
});

test('filterPlayers ignores empty/whitespace filters', () => {
	const players = [enrichPlayer(samplePlayer), enrichPlayer(rookiePlayer)];
	const result = filterPlayers(players, LEGACY_COLUMNS, { dpm: '  ', team_name: '' });
	assert.equal(result.length, 2);
});
