import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createDarkoServer, summarizeHistory } from '../src/lib/server/mcp/server.js';
import { chartSpecSchema, canonicalChartSpec } from '../src/lib/server/charts/schema.js';

const rows = [
  { nba_id: 1, player_name: 'A Williams', date: '2025-01-01', season: 2025, dpm: 1, x_minutes: 30, position: 'G', age: 25 },
  { nba_id: 2, player_name: 'B Williams', date: '2025-01-02', season: 2025, dpm: 1, x_minutes: 10, position: 'F', age: 23 },
  { nba_id: 3, player_name: 'No rating', date: '2025-01-02', dpm: null }
];
const sources = {
  searchAllPlayers: async () => rows.slice(0, 2), getLatestGameDate: async () => '2025-01-01',
  getActivePlayers: async () => rows,
  getPlayerComps: async (id) => id === 1 ? [
    { rank: 1, comp_id: 2, comp_name: 'B Williams', comp_season: 2010, comp_age: 25, age: 25, as_of: '2025-01-01', similarity: 0.8 },
    { rank: 2, comp_id: 2, comp_name: 'B Williams', comp_season: 2011 },
    { rank: 3, comp_id: 1, comp_name: 'A Williams' },
    { rank: 4, comp_id: 3, comp_name: 'Another comp' }
  ] : [],
  getFullPlayerTrajectoryHistory: async (id) => ({ rows: [{ ...rows[0], nba_id: id, rookie_season: 1996 }, { ...rows[0], nba_id: id, date: '2025-02-01', dpm: 4 }], truncated: false }),
  getFullPlayerHistory: async () => ({ rows: [] }),
  getSeasonStartPlayers: async () => rows, getPlayersAsOf: async () => ({ rows, season: 2025 })
};
const handler = createMcpHandler(() => createDarkoServer({ sources, chartSpecSchema, charts: {
  buildCareerChart: async (specification) => ({ display: Buffer.from('test-png'), metadata: {
    specification: canonicalChartSpec(specification), coverage: [{ nba_id: 1, player_name: 'A Williams' }], dataset_as_of: '2025-01-01', limitations: []
  } })
} }));
let id = 0;
async function rpc(method, params) {
  const response = await handler.fetch(new Request('https://darko.app/mcp', { method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }) }));
  const text = await response.text();
  const data = text.startsWith('{') ? JSON.parse(text) : JSON.parse(text.split('\n').find((line) => line.startsWith('data: ')).slice(6));
  assert.equal(response.status, 200);
  assert.equal(data.error, undefined);
  return data.result;
}

test('stateless MCP lists seven read-only tools and its image resource', async () => {
  const initialized = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(initialized.serverInfo.name, 'DARKO');
  const result = await rpc('tools/list', {});
  assert.deepEqual(result.tools.map((tool) => tool.name), ['search_players', 'get_player_histories', 'create_career_chart', 'import_career_chart', 'get_comparison_cohort', 'get_players', 'get_rankings']);
  assert.ok(result.tools.every((tool) => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
  assert.ok(result.tools.every((tool) => tool._meta.ui.visibility.includes('app')));
  const resource = await rpc('resources/read', { uri: 'ui://darko/career-chart/v3.html' });
  assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.deepEqual(resource.contents[0]._meta.ui.csp.resourceDomains, ['https://www.darko.app']);
});

test('ambiguous names are explicit; no player is silently selected', async () => {
  const result = await rpc('tools/call', { name: 'search_players', arguments: { queries: ['Williams'] } });
  assert.equal(result.structuredContent.matches[0].ambiguous, true);
  assert.equal(result.structuredContent.matches[0].candidates.length, 2);
});

test('summaries retain dated start/end/peak without daily arrays', async () => {
  const result = await rpc('tools/call', { name: 'get_player_histories', arguments: { ids: [1] } });
  const player = result.structuredContent.players[0];
  assert.equal(player.partial_career, true);
  assert.deepEqual(player.periods[0].peak, { date: '2025-02-01', value: 4 });
  assert.equal(player.rows, undefined);
  assert.equal(player.periods.length, 1);
  assert.equal(summarizeHistory([{ date: '2025-01-01', dpm: null }], 'dpm', 'season').length, 0);
});

test('chart returns widget data, links and Modern specification without a duplicate image', async () => {
  const result = await rpc('tools/call', { name: 'create_career_chart', arguments: { ids: [1], scale: 'age' } });
  assert.equal(result.content.filter((part) => part.type === 'image').length, 0);
  assert.equal(result.structuredContent.specification.display, 'modern');
  assert.match(result.content[0].text, /widget/);
  assert.equal(result.structuredContent.specification.scale, 'age');
  assert.match(result.structuredContent.download_url, /width=2400/);
  assert.equal(result.structuredContent.points, undefined);
  assert.equal(result.structuredContent.coverage[0].points, undefined);
});

test('rankings exclude null values, apply MPG filters and settle ties by NBA ID', async () => {
  const tied = await rpc('tools/call', { name: 'get_rankings', arguments: {} });
  assert.deepEqual(tied.structuredContent.players.map((row) => row.nba_id), [1, 2]);
  const filtered = await rpc('tools/call', { name: 'get_rankings', arguments: { minutes_min: 20 } });
  assert.deepEqual(filtered.structuredContent.players.map((row) => row.nba_id), [1]);
  const invalid = await rpc('tools/call', { name: 'get_rankings', arguments: { season: 2025, asof: '2025-01-01' } });
  assert.equal(invalid.isError, true);
});

test('player group selection omits unrequested fields; retired missing IDs fail clearly', async () => {
  const result = await rpc('tools/call', { name: 'get_players', arguments: { ids: [1] } });
  assert.equal(result.structuredContent.players[0].values.value, undefined);
  assert.equal(result.structuredContent.players[0].values.impact.dpm, 1);
  const missing = await rpc('tools/call', { name: 'get_players', arguments: { ids: [99] } });
  assert.equal(missing.isError, true);
  assert.match(missing.content[0].text, /No ratings/);
});


test('published cohorts deduplicate player seasons, exclude the anchor and handle missing comps', async () => {
  const cohort = (await rpc('tools/call', { name: 'get_comparison_cohort', arguments: { id: 1 } })).structuredContent;
  assert.deepEqual(cohort.ids, [1, 2, 3]);
  assert.equal(cohort.comparisons[0].matched_season, 2010);
  assert.equal(cohort.as_of, '2025-01-01');
  const limited = (await rpc('tools/call', { name: 'get_comparison_cohort', arguments: { id: 1, limit: 1 } })).structuredContent;
  assert.deepEqual(limited.ids, [1, 2]);
  const missing = (await rpc('tools/call', { name: 'get_comparison_cohort', arguments: { id: 99 } })).structuredContent;
  assert.equal(missing.available, false); assert.deepEqual(missing.comparisons, []);
  assert.match(missing.limitation, /No published/);
});

test('import tool restores square annotations and refuses unrelated URLs', async () => {
  const created = await rpc('tools/call', { name: 'create_career_chart', arguments: { ids: [1], scale: 'age',
    min: 19, max: 25, at: 23, format: 'square', annotations: ['peak', 'selected'], title: 'Young career' } });
  const imported = await rpc('tools/call', { name: 'import_career_chart', arguments: { url: created.structuredContent.download_url } });
  const spec = imported.structuredContent.specification;
  assert.equal(spec.format, 'square'); assert.equal(spec.at, 23);
  assert.deepEqual(spec.annotations, ['peak', 'selected']);
  assert.deepEqual(spec.colors, created.structuredContent.specification.colors);
  const invalid = await rpc('tools/call', { name: 'import_career_chart', arguments: { url: 'https://evil.example/trajectories?ids=1' } });
  assert.equal(invalid.isError, true);
});
