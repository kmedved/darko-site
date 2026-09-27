import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { heightOptionsFromRows, teamOptionsFromRows } from '../src/lib/utils/wowyFilterOptions.js';

test('all-time WOWY team choices cover every published team once, with all its names', () => {
    const options = teamOptionsFromRows([
        { team_codes: ['NYK'], team_names: ['New York Knicks'] },
        { team_codes: ['CHA', 'NYK'], team_names: ['Charlotte Bobcats', 'New York Knicks'] },
        { team_codes: ['CHA'], team_names: ['Charlotte Hornets'] },
        { team_codes: ['  '], team_names: ['Blank'] },
        { team_codes: null }
    ]);
    assert.deepEqual(options, [
        { value: 'CHA', label: 'CHA — Charlotte Bobcats / Charlotte Hornets', title: 'Charlotte Bobcats / Charlotte Hornets' },
        { value: 'NYK', label: 'NYK — New York Knicks', title: 'New York Knicks' }
    ]);
});

test('all-time WOWY height choices are whole inches in the filterable range', () => {
    assert.deepEqual(heightOptionsFromRows([{ height: 79 }, { height: 79.4 }, { height: 59 }, { height: 97 }, { height: null }, { height: 72 }]), [72, 79]);
});

test('the all-time WOWY page takes its filter choices from the whole publication', () => {
    const page = readFileSync('src/routes/wowy/+page.svelte', 'utf8');
    const api = readFileSync('src/routes/api/wowy/filter-options/+server.js', 'utf8');
    // The leaderboard is Season-Adjusted only, so it fetches one set of choices.
    assert.match(page, /fetch\('\/api\/wowy\/filter-options\?rating=adjusted'\)/);
    assert.match(page, /allTimeFilterOptions\?\.teams/);
    assert.match(page, /allTimeFilterOptions\?\.heights/);
    assert.match(api, /getWowyAllTimeFilterOptions\(ratingMode\)/);
});
