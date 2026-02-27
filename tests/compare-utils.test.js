import test from 'node:test';
import assert from 'node:assert/strict';

import { buildComparePlayer } from '../src/lib/utils/compareUtils.js';


test('buildComparePlayer carries current snapshot metrics into payload', () => {
    const rows = [
        {
            nba_id: 999,
            player_name: 'First',
            dpm: '1.2',
            o_dpm: '0.4',
            age: '21',
            position: 'PG'
        },
        {
            nba_id: 999,
            player_name: 'Second',
            dpm: '2.3',
            o_dpm: '0.9',
            age: '22',
            position: 'SG'
        }
    ];

    const player = buildComparePlayer({
        currentRow: rows.at(-1),
        rows,
        color: 'var(--accent)'
    });

    assert.equal(player.player_name, 'Second');
    assert.equal(player.dpm, '2.3');
    assert.equal(player.o_dpm, '0.9');
    assert.equal(player.age, '22');
    assert.equal(player.position, 'SG');
    assert.equal(player.color, 'var(--accent)');
    assert.equal(player.rows.length, 2);
});
