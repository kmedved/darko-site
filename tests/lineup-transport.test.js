import test from 'node:test';
import assert from 'node:assert/strict';

import { groupLineupRows } from '../src/lib/server/lineupRatings.js';
import { packLineups, unpackLineups } from '../src/lib/utils/lineupTransport.js';

const NAMES = ['Stephen Curry', 'Draymond Green', 'Klay Thompson', 'Andrew Wiggins', 'Kevon Looney', 'Jordan Poole'];

function rawRow(variant, ids, overrides = {}) {
    const row = {
        variant,
        lineup_size: ids.length,
        min_season_poss: 640,
        total_net_rating: 4.1234,
        total_off_rating: 6.5,
        total_def_rating: 2.3766,
        off_synergy: 0.125,
        def_synergy: -0.0625,
        tm_id: 1610612744
    };
    ids.forEach((id, index) => {
        row[`player_${index + 1}`] = NAMES[id % NAMES.length];
        row[`player_${index + 1}_id`] = 201000 + id;
    });
    return { ...row, ...overrides };
}

test('packed lineups rebuild the exact server rows', () => {
    const rows = [
        rawRow('pi', [0, 1]),
        rawRow('raw', [0, 1]),
        rawRow('pi', [0, 2], { tm_id: null, off_synergy: null }),
        rawRow('pi', [3, 4], { tm_id: 1610612738, min_season_poss: 812 }),
        rawRow('raw', [1, 5], { player_2_id: null }),
        rawRow('raw', [2, 3], { player_1_id: null, player_2_id: null })
    ];
    const lineups = groupLineupRows(rows, { minPoss: 500, playerCount: 2 });

    const packed = packLineups(lineups, 2);
    assert.deepEqual(unpackLineups(structuredClone(packed)), lineups);
    assert.deepEqual(packed.keys, { pi: {}, npi: {} }, 'every key here is rebuilt, none sent');
    assert.equal(Object.keys(packed.players).length, 5, 'each named player id is listed once');
});

test('packed lineups keep five-man slots, name spellings and unrebuildable keys', () => {
    const rows = [
        rawRow('pi', [0, 1, 2, 3, 4]),
        rawRow('pi', [0, 1, 2, 3, 5], { player_1: 'Wardell Curry' }),
        rawRow('raw', [0, 1, 2, 3, 4], {
            player_1_id: null, player_2_id: null, player_3_id: null, player_4_id: null, player_5_id: null,
            player_1: null, player_2: null, player_3: null, player_4: null, player_5: null
        })
    ];
    const lineups = groupLineupRows(rows, { minPoss: 100, playerCount: 5 });
    const packed = packLineups(lineups, 5);
    const rebuilt = unpackLineups(packed);

    assert.deepEqual(rebuilt, lineups);
    assert.equal(rebuilt.pi[1].player_1, 'Wardell Curry', 'a second spelling of one id survives');
    assert.equal(rebuilt.npi[0].lineup_label, 'Unnamed lineup');
    assert.deepEqual(packed.keys.npi, {}, 'a name-less, id-less row rebuilds its fallback key');
});

test('packed lineups round numbers to four decimals and send a key the page cannot rebuild', () => {
    const [row] = groupLineupRows([rawRow('pi', [0, 1], {
        total_net_rating: 1.23456789,
        total_off_rating: -0.00001,
        player_1_id: null,
        player_2_id: null,
        player_1: null,
        player_2: null
    })], { minPoss: 500, playerCount: 2 }).pi;

    const packed = packLineups({ pi: [row], npi: [] }, 2);
    const [rebuilt] = unpackLineups(packed).pi;

    assert.equal(rebuilt.net_pm, 1.2346);
    assert.ok(Object.is(rebuilt.off_pm, 0), 'a rounded negative zero becomes zero');
    assert.equal(rebuilt.row_key, row.row_key, 'the fallback key uses unrounded numbers, so it travels');
    assert.deepEqual(packed.keys.pi, { 0: row.row_key });
});

test('unpackLineups passes row objects through and fills missing buckets', () => {
    const lineups = { pi: [{ lineup_label: 'A' }] };
    assert.deepEqual(unpackLineups(lineups), { pi: [{ lineup_label: 'A' }], npi: [] });
    assert.deepEqual(unpackLineups(undefined), { pi: [], npi: [] });
});

test('a realistic two-man page packs to a fraction of its row objects', () => {
    const rows = [];
    for (let first = 0; first < 60; first += 1) {
        for (let second = first + 1; second < first + 12; second += 1) {
            for (const variant of ['pi', 'raw']) {
                rows.push(rawRow(variant, [first, second], {
                    total_net_rating: Math.sin(first * second) * 7.123456789,
                    total_off_rating: Math.cos(first + second) * 5.987654321,
                    total_def_rating: Math.sin(first - second) * 3.14159265,
                    off_synergy: Math.cos(first * 3) * 0.5,
                    def_synergy: Math.sin(second * 3) * 0.5,
                    min_season_poss: 600 + first * 10 + second
                }));
            }
        }
    }
    const lineups = groupLineupRows(rows, { minPoss: 500, playerCount: 2 });
    const before = JSON.stringify(lineups).length;
    const after = JSON.stringify(packLineups(lineups, 2)).length;
    assert.ok(after < before * 0.35, `packed ${after} bytes vs ${before}`);
});
