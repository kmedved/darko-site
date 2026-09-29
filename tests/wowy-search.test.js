import fs from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeWowyPages, namesMatching, wowyRowOrder, wowySearchWord } from '../src/lib/utils/wowySearch.js';

const read = (file) => fs.readFile(file, 'utf8');

test('a WOWY search that finds nothing looks again by its longest word', () => {
	assert.equal(wowySearchWord('jokíc nik'), 'jokic');
	assert.equal(wowySearchWord('chamberlain wilt'), 'chamberlain');
	assert.equal(wowySearchWord('jokíc'), 'jokic', 'an accent the database would not match');
	// The same search again would find nothing again.
	assert.equal(wowySearchWord('wembanyana'), null);
	assert.equal(wowySearchWord('sga'), null);
	assert.equal(wowySearchWord(''), null);

	const rows = [
		{ player_name: 'Nikola Jokic' },
		{ player_name: 'Nikola Jokic' },
		{ player_name: 'Jokic Brother' },
		{ player_name: null }
	];
	assert.deepEqual(namesMatching('jokíc nik', rows), ['Nikola Jokic']);
	assert.deepEqual(namesMatching('bird larry', [{ player_name: 'Larry Bird' }, { player_name: 'Birdie Larson' }]), ['Larry Bird']);
});

test('several players\' seasons make one page, in the order asked for', () => {
	const row = (nba_id, season, wowy_rapm, player_name = `P${nba_id}`) => ({ nba_id, season, wowy_rapm, player_name, team_sort_label: 'SAS' });
	const pages = [
		{ players: [row(1, 2024, 2.5), row(1, 2025, 4.1), row(1, 2026, null)] },
		{ players: [row(2, 2025, 3.2), row(1, 2025, 4.1)] }
	];
	const page = mergeWowyPages(pages, { sortColumn: 'wowy_rapm', sortDirection: 'desc', offset: 0, limit: 3 });
	assert.deepEqual(page.players.map((entry) => [entry.nba_id, entry.season]), [[1, 2025], [2, 2025], [1, 2024]]);
	assert.equal(page.totalCount, 4, 'a season in two pages counts once');
	assert.equal(page.hasMore, true);
	const next = mergeWowyPages(pages, { sortColumn: 'wowy_rapm', sortDirection: 'desc', offset: 3, limit: 3 });
	assert.deepEqual(next.players.map((entry) => entry.season), [2026], 'nulls last');
	assert.equal(next.hasMore, false);
	// Names sort without case; ties fall back to the rating.
	const byName = [row(3, 2020, 1, 'bob'), row(4, 2020, 2, 'Al'), row(5, 2020, 3, 'Al')].sort(wowyRowOrder('player_name', 'asc'));
	assert.deepEqual(byName.map((entry) => entry.nba_id), [5, 4, 3]);
});

test('WOWY searches forgive like every player search, on the server and in the table', async () => {
	const loader = await read('src/lib/server/supabase.js');
	// Only a search that found nothing as typed, on a published page, looks again.
	assert.match(loader, /const page = await fetchWowyAllTimePage\(ratingMode, normalized\);\s*if \(!normalized\.search \|\| page\.totalCount > 0 \|\| !page\.activated\) return page;\s*return \(await wowyPageByNames\(ratingMode, normalized\)\) \?\? page;/);
	assert.match(loader, /names = searchByName\(index, normalized\.search, \{ rank, limit: 5 \}\)/);

	const page = await read('src/routes/wowy/+page.svelte');
	assert.match(page, /return searchable\.includes\(query\) \|\| matchName\(typed, player\?\.player_name, \{ typos: false \}\) !== null;/);
	assert.match(page, /if \(strict\.length > 0\) return strict;\s*return possessionScopedPlayers\.filter\(\(player\) => matchName\(typed, player\?\.player_name\) !== null\);/);
});
