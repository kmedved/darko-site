import test from 'node:test';
import assert from 'node:assert/strict';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { darkoMethodologyMarkdown } from '../src/lib/utils/darkoMethodology.js';
import { createDarkoServer, summarizeHistory } from '../src/lib/server/mcp/server.js';
import { chartSpecSchema, canonicalChartSpec } from '../src/lib/server/charts/schema.js';
import { clientFamily, createUsageRecorder } from '../src/lib/server/mcp/usage.js';

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
  getSeasonStartPlayers: async () => rows, getPlayersAsOf: async () => ({ rows, season: 2025 }),
  getRookieStarts: async (year) => year === 2022 ? [
    { nba_id: 1, player_name: 'A Williams', draft_slot: 1, date: '2022-10-19', age: 21.1, dpm: -1.2, o_dpm: -0.8, d_dpm: -0.4 },
    { nba_id: 4, player_name: 'Second Pick', draft_slot: 2, date: '2022-10-20', age: 19.5, dpm: -2, o_dpm: -1.5, d_dpm: -0.5 },
    { nba_id: 5, player_name: 'Undrafted Guard', draft_slot: null, date: '2022-11-01', age: 22, dpm: -3, o_dpm: -2, d_dpm: -1 }
  ] : [],
  getRatingMoves: async () => [
    { period: '7', start_date: '2025-01-01', end_date: '2025-01-08', nba_id: 1, player_name: 'A Williams', games: 3, dpm_from: 1, dpm_to: 2.5, delta: 1.5, o_delta: 1 },
    { period: '7', start_date: '2025-01-01', end_date: '2025-01-08', nba_id: 2, player_name: 'B Williams', games: 1, dpm_from: 0, dpm_to: 4, delta: 4, o_delta: 2 },
    { period: '7', start_date: '2025-01-01', end_date: '2025-01-08', nba_id: 3, player_name: 'Faller', games: 2, dpm_from: 2, dpm_to: 1, delta: -1, o_delta: -0.25 }
  ]
};
const handler = createMcpHandler(() => createDarkoServer({ sources, chartSpecSchema, charts: {
  buildCareerChart: async (specification) => ({ display: Buffer.from('test-png'), metadata: {
    specification: canonicalChartSpec(specification), coverage: [{ nba_id: 1, player_name: 'A Williams' }], dataset_as_of: '2025-01-01', limitations: []
  } })
} }));
const metrics = [];
// Mirrors src/routes/mcp/+server.ts: the client is recognized from the request's user agent.
const metricHandler = createMcpHandler(({ requestInfo }) => createDarkoServer({ sources, chartSpecSchema, charts: {},
  onToolCall: (value) => metrics.push(value), userAgent: requestInfo?.headers.get('user-agent') ?? '' }));
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

test('stateless MCP lists nine read-only tools with status text and its image resource', async () => {
  const initialized = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(initialized.serverInfo.name, 'DARKO');
  const result = await rpc('tools/list', {});
  assert.deepEqual(result.tools.map((tool) => tool.name), ['search_players', 'get_player_histories', 'create_career_chart', 'import_career_chart',
    'get_comparison_cohort', 'get_players', 'get_rankings', 'get_draft_class', 'get_rating_movers']);
  assert.ok(result.tools.every((tool) => tool.annotations.readOnlyHint && !tool.annotations.destructiveHint));
  for (const tool of result.tools) {
    for (const key of ['openai/toolInvocation/invoking', 'openai/toolInvocation/invoked']) {
      assert.equal(typeof tool._meta[key], 'string', `${tool.name} ${key}`);
      assert.ok(tool._meta[key].length > 0 && tool._meta[key].length <= 64, `${tool.name} ${key}`);
    }
  }
  assert.equal(result.tools.find((tool) => tool.name === 'create_career_chart')._meta['openai/toolInvocation/invoking'], 'Drawing career chart…');
  assert.ok(result.tools.every((tool) => tool._meta.ui.visibility.includes('app')));
  for (const name of ['create_career_chart', 'import_career_chart']) {
    const meta = result.tools.find((tool) => tool.name === name)._meta;
    assert.equal(meta['openai/outputTemplate'], 'ui://darko/career-chart/v4.html');
    assert.equal(meta['openai/outputTemplate'], meta.ui.resourceUri);
  }
  const resource = await rpc('resources/read', { uri: 'ui://darko/career-chart/v4.html' });
  assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
  assert.equal(resource.contents[0]._meta.ui.domain, 'https://www.darko.app');
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
  assert.equal(result.structuredContent.summary_basis, 'all_published_rating_states');
  assert.match(result.structuredContent.basis_note, /played games only/);
  assert.equal(player.partial_career, true);
  assert.deepEqual(player.periods[0].peak, { date: '2025-02-01', value: 4 });
  assert.equal(player.rows, undefined);
  assert.equal(player.periods.length, 1);
  assert.equal(summarizeHistory([{ date: '2025-01-01', dpm: null }], 'dpm', 'season').length, 0);
});

test('ChatGPT gets widget data and links without an image; other clients also get the chart image', async () => {
  // ChatGPT tags tool calls with openai/* metadata and draws the chart in its widget.
  const chatgpt = await rpc('tools/call', { name: 'create_career_chart', arguments: { ids: [1], scale: 'age' },
    _meta: { 'openai/subject': 'anonymous-user', 'openai/locale': 'en-US' } });
  assert.equal(chatgpt.content.filter((part) => part.type === 'image').length, 0);
  assert.match(chatgpt.content[0].text, /Show the widget/);
  const result = await rpc('tools/call', { name: 'create_career_chart', arguments: { ids: [1], scale: 'age' } });
  const images = result.content.filter((part) => part.type === 'image');
  assert.equal(images.length, 1);
  assert.equal(images[0].mimeType, 'image/png');
  assert.equal(Buffer.from(images[0].data, 'base64').toString(), 'test-png');
  assert.match(result.content[0].text, /image is attached/);
  assert.equal(result.structuredContent.specification.display, 'modern');
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

test('public prompts and methodology are discoverable without a packaged skill', async () => {
  const prompts = await rpc('prompts/list', {});
  assert.deepEqual(prompts.prompts.map((p) => p.name), ['compare_career_histories','compare_with_darko_comps']);
  const prompt = await rpc('prompts/get', { name: 'compare_career_histories', arguments: { players: 'Tatum and George', axis: 'age' } });
  assert.match(prompt.messages[0].content.text, /Tatum and George/);
  assert.match(prompt.messages[0].content.text, /create_career_chart/);
  const resources = await rpc('resources/list', {});
  assert.ok(resources.resources.some((r) => r.uri === 'darko://methodology'));
  const methodology = await rpc('resources/read', { uri: 'darko://methodology' });
  assert.equal(methodology.contents[0].text, darkoMethodologyMarkdown());
  assert.equal(methodology.contents[0].mimeType, 'text/markdown');
});

test('tool usage records the tool, client family, outcome, duration and count, never names or arguments', async () => {
  const response = await metricHandler.fetch(new Request('https://www.darko.app/mcp', { method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'user-agent': 'claude-code/2.1.293' },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name: 'search_players', arguments: { queries: ['Private title must not be logged'] } } }) }));
  assert.equal(response.status, 200);
  await response.text();
  assert.deepEqual(Object.keys(metrics.at(-1)).sort(), ['client','duration_ms','ok','player_count','tool']);
  assert.equal(metrics.at(-1).client, 'claude-code'); assert.equal(metrics.at(-1).ok, true);
  assert.equal(metrics.at(-1).tool, 'search_players'); assert.equal(metrics.at(-1).player_count, 1);
  assert.ok(metrics.at(-1).duration_ms >= 0);
  assert.equal(JSON.stringify(metrics).includes('Private title'), false);
});

test('client families come from ChatGPT metadata or the user agent, coarsely', () => {
  assert.equal(clientFamily({ meta: { 'openai/subject': 'x' } }), 'chatgpt');
  assert.equal(clientFamily({ userAgent: 'openai-mcp/1.0.0' }), 'chatgpt');
  assert.equal(clientFamily({ userAgent: 'claude-code/2.1.293 (external, cli)' }), 'claude-code');
  assert.equal(clientFamily({ userAgent: 'Claude-User' }), 'claude');
  assert.equal(clientFamily({ userAgent: 'Cursor/3.10.20' }), 'cursor');
  assert.equal(clientFamily({ userAgent: 'codex_cli_rs/0.50.0' }), 'codex');
  assert.equal(clientFamily({ userAgent: 'darko-production-check/1.0' }), 'monitor');
  assert.equal(clientFamily({ userAgent: 'node', meta: { progressToken: 1 } }), 'other');
  assert.equal(clientFamily(), 'other');
});

test('usage recording never delays a tool past its timeout or fails it', async () => {
  const lines = [];
  let aborted = false;
  const slow = createUsageRecorder({ record: (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => { aborted = true; reject(signal.reason); }, { once: true });
  }), log: (line) => lines.push(line), timeoutMs: 20 });
  const started = Date.now();
  await slow({ tool: 'create_career_chart', client: 'other', ok: true, duration_ms: 5, player_count: 2 });
  assert.ok(Date.now() - started < 1000);
  assert.equal(aborted, true, 'the outstanding recording request is cancelled');
  const failing = createUsageRecorder({ record: async () => { throw new Error('missing function'); }, log: (line) => lines.push(line) });
  await failing({ tool: 'search_players', client: 'chatgpt', ok: false, duration_ms: 1, player_count: 0 });
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), { tool: 'create_career_chart', client: 'other', ok: true, duration_ms: 5, player_count: 2 });
});

test('draft classes list drafted players in pick order with first-game and current ratings', async () => {
  const draft = (await rpc('tools/call', { name: 'get_draft_class', arguments: { year: 2022 } })).structuredContent;
  assert.deepEqual(draft.players.map((player) => player.pick), [1, 2]);
  assert.deepEqual(draft.ids, [1, 4]);
  assert.equal(draft.players[0].first_game.dpm, -1.2);
  assert.equal(draft.players[0].current.dpm, 1);
  assert.equal(draft.players[1].current, null);
  const withUndrafted = (await rpc('tools/call', { name: 'get_draft_class', arguments: { year: 2022, include_undrafted: true } })).structuredContent;
  assert.equal(withUndrafted.players.at(-1).undrafted, true);
  const empty = (await rpc('tools/call', { name: 'get_draft_class', arguments: { year: 2026 } })).structuredContent;
  assert.deepEqual(empty.players, []);
  assert.match(empty.limitation, /first published game/);
});

test('rating movers sort by change among players with enough games and report the window dates', async () => {
  const risers = (await rpc('tools/call', { name: 'get_rating_movers', arguments: {} })).structuredContent;
  // B Williams rose most but played one game, under the 7-day window's two-game minimum.
  assert.deepEqual(risers.ids, [1, 3]);
  assert.equal(risers.min_games, 2);
  assert.deepEqual([risers.start_date, risers.end_date], ['2025-01-01', '2025-01-08']);
  assert.equal(risers.players[0].change, 1.5);
  assert.equal(risers.players[0].defense_change, 0.5);
  const fallers = (await rpc('tools/call', { name: 'get_rating_movers', arguments: { direction: 'fallers', limit: 1 } })).structuredContent;
  assert.deepEqual(fallers.ids, [3]);
  const missing = (await rpc('tools/call', { name: 'get_rating_movers', arguments: { window: '30' } })).structuredContent;
  assert.equal(missing.available, false);
});
