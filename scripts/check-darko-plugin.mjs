import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// End-to-end check of the assistant endpoint, chart images and link previews. Run against a local
// server or production (`node scripts/check-darko-plugin.mjs https://www.darko.app`); the daily
// GitHub workflow (.github/workflows/production-check.yml) runs it against production.
const origin = new URL(process.argv[2] || 'http://127.0.0.1:4192').origin;
const directory = resolve(process.argv[3] || '.agents/audit-evidence/darko-plugin');
mkdirSync(directory, { recursive: true });
// Counted as the "monitor" client in usage, so checks never look like real use.
const USER_AGENT = 'darko-production-check/1.0';
const get = (url) => fetch(url, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(60_000) });
const pngSize = (png) => [png.readUInt32BE(16), png.readUInt32BE(20)];
let id = 0;
async function rpc(method, params, allowProtocolError = false) {
  const response = await fetch(origin + '/mcp', {
    method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'user-agent': USER_AGENT },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }), signal: AbortSignal.timeout(60_000)
  });
  const text = await response.text();
  const data = text.startsWith('{') ? JSON.parse(text) : JSON.parse(text.split('\n').find((line) => line.startsWith('data: ')).slice(6));
  assert.equal(response.status, 200); if (!allowProtocolError) assert.equal(data.error, undefined);
  return data.error ? { protocol_error: data.error } : data.result;
}
async function call(name, input) {
  const result = await rpc('tools/call', { name, arguments: input });
  if (result.isError) throw new Error(result.content.map((part) => part.text || '').join('\n'));
  return result;
}
const initialized = await rpc('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'DARKO acceptance check', version: '1.0.0' } });
assert.equal(initialized.serverInfo.name, 'DARKO');
const tools = (await rpc('tools/list', {})).tools;
assert.equal(tools.length, 9);
assert.ok(tools.every((tool) => tool.annotations.readOnlyHint));
assert.ok(tools.every((tool) => typeof tool._meta['openai/toolInvocation/invoking'] === 'string'));
const groups = [
  ['tatum-george-age', ['Jayson Tatum', 'Paul George'], 'age'],
  ['matas-six-age', ['Matas Buzelis', 'Karl-Anthony Towns', 'Jalen Williams', 'Jaylen Brown', 'Jamal Murray', 'Draymond Green'], 'age'],
  ['murray-barnes-age', ['Keegan Murray', 'Scottie Barnes'], 'age'],
  ['wemby-five-games', ['Victor Wembanyama', 'LeBron James', 'Kevin Durant', 'Stephen Curry', 'Nikola Jokic'], 'games'],
  ['rollins-five-games', ['Ryan Rollins', 'Dyson Daniels', 'Jaden Ivey', 'Bennedict Mathurin', 'Shaedon Sharpe'], 'games'],
  ['kessler-centers-games', ['Walker Kessler', 'Rudy Gobert', 'Brook Lopez', 'Ivica Zubac'], 'games']
];
const examples = [];
for (const [name, names, scale] of groups) {
  const lookup = await call('search_players', { queries: names });
  const ids = lookup.structuredContent.matches.map((match) => { assert.equal(match.candidates.length, 1, match.query); return match.candidates[0].nba_id; });
  const start = Date.now();
  const chart = await call('create_career_chart', { ids, scale, display: 'shiny' });
  // Clients other than ChatGPT receive the display PNG in the result itself.
  const attached = chart.content.find((part) => part.type === 'image');
  assert.equal(pngSize(Buffer.from(attached.data, 'base64'))[0], 1200);
  const response = await get(chart.structuredContent.image_url);
  assert.equal(response.status, 200);
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(chart.structuredContent.coverage.length, ids.length);
  assert.ok(chart.structuredContent.coverage.every((player) => player.displayed_rows > 0 && player.points === undefined));
  writeFileSync(resolve(directory, name + '.png'), png);
  examples.push({ name, elapsed_ms: Date.now() - start, image_bytes: png.length, data: chart.structuredContent });
  console.log(`${name}: ${ids.length} players, ${png.length} PNG bytes`);
}
const spec = examples[0].data.specification;
const edit = await call('create_career_chart', { ...spec, ids: [...spec.ids, 202695], metric: 'd_dpm', min: 19, max: 25 });
assert.deepEqual(edit.structuredContent.specification.colors.slice(0, 2), spec.colors);
assert.ok(edit.structuredContent.coverage.every((player) => player.displayed_rows > 0));
const full = await call('create_career_chart', { ids: [2544, 201939] });
assert.equal(full.structuredContent.specification.display, 'modern');
const first200 = await call('create_career_chart', { ...full.structuredContent.specification, max: 200 });
assert.deepEqual(first200.structuredContent.coverage.map((player) => player.displayed_rows), [200, 200]);
assert.ok(full.structuredContent.coverage[0].history_rows > 2000);
const garnett = await call('create_career_chart', { ids: [708] });
assert.equal(garnett.structuredContent.coverage[0].partial_career, true);
assert.equal(garnett.structuredContent.coverage[0].nba_debut_date, '1995-11-03');
assert.match(garnett.structuredContent.coverage[0].available_from, /^1996-11/);
const ambiguous = await call('search_players', { queries: ['Williams'] });
assert.equal(ambiguous.structuredContent.matches[0].ambiguous, true);
const histories = await call('get_player_histories', { ids: [2544, 708] });
assert.ok(histories.structuredContent.players[0].periods.length > 20);
assert.equal(histories.structuredContent.players[1].partial_career, true);
const ratings = await call('get_players', { ids: [1628369, 203999], groups: ['impact', 'value', 'longevity'] });
assert.equal(ratings.structuredContent.players.length, 2);
for (const input of [{ minutes_min: 20 }, { season: 2025 }, { asof: '2024-01-01' }]) {
  const ranking = await call('get_rankings', { ...input, limit: 3 });
  assert.equal(ranking.structuredContent.players.length, 3);
}
for (const input of [{ ids: [1628369], scale: 'age', min: 80, max: 90 }, { ids: [-1] }]) {
  const result = await rpc('tools/call', { name: 'create_career_chart', arguments: input });
  assert.equal(result.isError, true);
}
const write = await rpc('tools/call', { name: 'change_production_rating', arguments: {} }, true);
assert.match(write.protocol_error.message, /not found/);
for (const width of [1200, 2400]) {
  const url = new URL(examples[0].data.image_url); url.searchParams.set('width', String(width));
  const response = await get(url); const png = Buffer.from(await response.arrayBuffer());
  assert.equal(response.status, 200); assert.equal(png.readUInt32BE(16), width);
}
const hostile = await fetch(origin + '/mcp', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{}' });
assert.equal(hostile.status, 403);
const resource = await rpc('resources/read', { uri: 'ui://darko/career-chart/v4.html' });
assert.equal(resource.contents[0].mimeType, 'text/html;profile=mcp-app');
const draft = await call('get_draft_class', { year: 2022, limit: 5 });
assert.equal(draft.structuredContent.players.length, 5);
assert.deepEqual(draft.structuredContent.players.map((player) => player.pick), [1, 2, 3, 4, 5]);
const movers = await call('get_rating_movers', { window: 'season' });
assert.equal(movers.structuredContent.available, true);
assert.ok(movers.structuredContent.players.length > 0);
const player = await call('import_career_chart', { url: origin + '/player/1628369' });
assert.deepEqual(player.structuredContent.specification.ids, [1628369]);
// Link previews: chart pages and player pages unfurl with a wide card naming the players.
const page = await (await get(origin + '/trajectories?ids=1628369,202331&scale=age&format=square&title=Custom')).text();
const meta = (property) => page.match(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`))?.[1]?.replaceAll('&amp;', '&');
assert.equal(meta('og:title'), 'Jayson Tatum vs. Paul George · DARKO DPM by age');
assert.equal(meta('twitter:card'), 'summary_large_image');
const card = await get(meta('og:image').replace('https://www.darko.app', origin));
assert.equal(card.status, 200);
assert.deepEqual(pngSize(Buffer.from(await card.arrayBuffer())), [1200, 630]);
const fallback = await get(origin + '/og-default.png');
assert.deepEqual(pngSize(Buffer.from(await fallback.arrayBuffer())), [1200, 630]);
writeFileSync(resolve(directory, 'validation.json'), JSON.stringify({ checked_at: new Date().toISOString(), endpoint: origin,
  tools: tools.map((tool) => tool.name), examples, edits: edit.structuredContent, first_200: first200.structuredContent,
  garnett: garnett.structuredContent, negative_cases: true, image_widths: [1200, 2400], origin_rejected: true }, null, 2) + '\n');
console.log('All nine live tools, six charts, edits, negative cases, image resolutions and link previews passed.');
