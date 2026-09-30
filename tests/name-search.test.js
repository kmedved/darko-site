import test from 'node:test';
import assert from 'node:assert/strict';

import { editDistance, matchName, MATCH, searchableName, searchByName } from '../src/lib/utils/nameSearch.js';
import { filterPlayerSearchResults } from '../src/lib/utils/playerSearch.js';
import { activePlayerPool, matchPlayers } from '../src/lib/utils/askDarko.js';
import { filterPlayers } from '../src/lib/utils/playerTableFilters.js';
import { filterLongevityRows } from '../src/lib/utils/longevityTable.js';

const NAMES = [
	'Alexandre Sarr',
	'Olivier Sarr',
	'Alex Caruso',
	'Jalen Duren',
	'Nicolas Claxton',
	'Kasparas Jakučionis',
	'Victor Wembanyama',
	'Shai Gilgeous-Alexander',
	'Karl-Anthony Towns',
	'Giannis Antetokounmpo',
	'Anthony Davis',
	'Andre Drummond',
	'Herbert Jones',
	'Nikola Jokic',
	'Nikola Jovic',
	"De'Aaron Fox",
	'P.J. Washington',
	'Kevin Durant'
];
const POOL = NAMES.map((player_name, index) => ({ nba_id: index + 1, player_name, dpm: 5 - index * 0.25 }));
const find = (query) => searchByName(POOL, query, { rank: (player) => player.dpm }).map((player) => player.player_name);

test('names match without accents, case or punctuation', () => {
	assert.equal(searchableName('Kasparas Jakučionis'), 'kasparas jakucionis');
	assert.equal(searchableName("De'Aaron Fox"), 'deaaron fox');
	assert.equal(searchableName('Shai Gilgeous-Alexander'), 'shai gilgeous alexander');
	assert.equal(searchableName('P.J. Washington'), 'pj washington');
	assert.deepEqual(find('jakucionis'), ['Kasparas Jakučionis']);
	assert.deepEqual(find('gilgeous alexander'), ['Shai Gilgeous-Alexander']);
	assert.deepEqual(find('deaaron'), ["De'Aaron Fox"]);
	assert.deepEqual(find('pj wash'), ['P.J. Washington']);
});

test('each typed word starts a word of the name, in any order', () => {
	// The case a reader sent: the system has him as Alexandre.
	assert.deepEqual(find('alex sa'), ['Alexandre Sarr']);
	assert.deepEqual(find('sarr alex'), ['Alexandre Sarr']);
	assert.deepEqual(find('nic claxton'), ['Nicolas Claxton']);
	assert.deepEqual(find('herb jones'), ['Herbert Jones']);
	// A name that starts with the text ranks ahead of one with a word that does.
	assert.deepEqual(find('alex'), ['Alexandre Sarr', 'Alex Caruso', 'Shai Gilgeous-Alexander']);
	assert.equal(matchName('alex sa', 'Alexandre Sarr').level, MATCH.WORDS);
});

test('initials, and typos when nothing else matches', () => {
	assert.deepEqual(find('sga'), ['Shai Gilgeous-Alexander']);
	assert.deepEqual(find('kat'), ['Karl-Anthony Towns']);
	// Two players with those initials: the better one first.
	assert.deepEqual(find('ad'), ['Anthony Davis', 'Andre Drummond']);
	for (const [typo, name] of [
		['wemby', 'Victor Wembanyama'],
		['wembanyana', 'Victor Wembanyama'],
		['antetokoumpo', 'Giannis Antetokounmpo'],
		['jokci', 'Nikola Jokic'],
		['durnt', 'Kevin Durant']
	]) {
		assert.deepEqual(find(typo), [name], typo);
	}
	// A real match leaves typos out: jokic is Jokic, not Jovic too.
	assert.deepEqual(find('jokic'), ['Nikola Jokic']);
	assert.deepEqual(find('zzz'), []);
	assert.equal(editDistance('jokci', 'jokic'), 1);
	assert.equal(matchName('al', 'Alexandre Sarr', { typos: false }).level, MATCH.START);
});

test('every player search on the site uses it', () => {
	// The nav search and Compare's picker.
	assert.deepEqual(filterPlayerSearchResults(POOL, 'alex sa').map((player) => player.player_name), ['Alexandre Sarr']);
	assert.deepEqual(filterPlayerSearchResults(POOL, 'a'), []);
	// Ask DARKO.
	const pool = activePlayerPool(POOL);
	assert.deepEqual(matchPlayers('alex sa', pool).map((player) => player.name), ['Alexandre Sarr']);
	assert.deepEqual(matchPlayers('wemby', pool).map((player) => player.name), ['Victor Wembanyama']);
	// The leaderboard's search and the Shiny view's name filter.
	const columns = [{ key: 'player_name', type: 'text' }];
	assert.deepEqual(filterPlayers(POOL, columns, { player_name: 'jakucionis' }).map((player) => player.player_name), ['Kasparas Jakučionis']);
	// Longevity's search: the name, or any column with the text.
	assert.deepEqual(filterLongevityRows(POOL, 'alex sa').map((player) => player.player_name), ['Alexandre Sarr']);
});
