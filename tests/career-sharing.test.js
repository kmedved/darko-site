import test from 'node:test';
import assert from 'node:assert/strict';
import { careerShareMetadata, socialChartResponse, socialImageUrl, SOCIAL_FALLBACK } from '../src/lib/server/charts/share.js';
import { chartSpecFromUrl, canonicalChartSpec } from '../src/lib/server/charts/schema.js';
import { careerChartLinks } from '../src/lib/utils/careerChartSpec.js';
import { careerComparisonTitle } from '../src/lib/utils/careerChartTitle.js';

const names = { 1628369: 'Jayson Tatum', 202331: 'Paul George', 202695: 'Kawhi Leonard' };
const lookupNames = async (ids) => ids.map((id) => names[id] ?? null);

test('chart previews name the players and always use the wide card, whatever the chart format', async () => {
  for (const metric of ['dpm', 'o_dpm', 'd_dpm']) {
    const spec = canonicalChartSpec({ ids: [1, 2, 3, 4, 5, 6], metric, scale: 'age', min: 19, max: 25,
      title: 'Career <comparison>', bandwidth: 0.5, format: 'square', at: 23, annotations: ['peak', 'smoothed_peak', 'selected'] });
    const social = await careerShareMetadata(new URL(careerChartLinks(spec).source_url));
    assert.equal(social.chart, true);
    assert.deepEqual([social.width, social.height], [1200, 630]);
    // The page link keeps every setting; the card drops the custom title, format and annotations.
    assert.deepEqual(chartSpecFromUrl(social.url), spec);
    const card = chartSpecFromUrl(new URL(social.image).href);
    assert.equal(new URL(social.image).pathname, '/api/charts/social.png');
    assert.deepEqual(card, canonicalChartSpec({ ...spec, title: '', format: 'wide', annotations: [], at: null }));
  }
});

test('preview titles are automatic, so a link cannot put its own headline on a darko.app card', async () => {
  const url = new URL('https://www.darko.app/trajectories?ids=1628369,202331&scale=age&title=DARKO%20says%20Tatum%20is%20washed');
  const social = await careerShareMetadata(url, { lookupNames });
  assert.equal(social.title, 'Jayson Tatum vs. Paul George · DARKO DPM by age');
  assert.equal(social.alt, social.title);
  assert.match(social.description, /for Jayson Tatum and Paul George, aligned by age/);
  assert.equal(JSON.stringify(social).includes('washed'), true, 'the page URL keeps its own title parameter');
  assert.equal(new URL(social.image).searchParams.get('title'), null);
  const three = await careerShareMetadata(new URL('https://www.darko.app/trajectories?ids=1628369,202331,202695&metric=d_dpm'), { lookupNames });
  assert.equal(three.title, 'Tatum, George and Leonard · DARKO defensive DPM by games played');
  assert.equal(careerComparisonTitle(['Gary Payton', 'Gary Payton II', 'Tim Hardaway Jr.'], { metric: 'o_dpm', scale: 'seasons' }),
    'Payton, Payton II and Hardaway Jr. · DARKO offensive DPM by season');
  // A failed name lookup still yields a truthful automatic title.
  const unnamed = await careerShareMetadata(url, { lookupNames: async () => { throw new Error('down'); } });
  assert.equal(unnamed.title, 'NBA career comparison · DARKO DPM by age');
});

test('an unsupported custom title does not prevent an automatic social chart preview', async () => {
  const url = new URL('https://www.darko.app/trajectories?ids=1628369,202331&scale=age');
  for (const title of ['🔥 Comparison', '对比', 'x'.repeat(101)]) {
    url.searchParams.set('title', title);
    const social = await careerShareMetadata(url, { lookupNames });
    assert.equal(social.chart, true);
    assert.equal(social.url, url.href, 'the original page link is preserved');
    assert.equal(social.title, 'Jayson Tatum vs. Paul George · DARKO DPM by age');
    assert.equal(new URL(social.image).searchParams.get('title'), null);
    assert.equal(chartSpecFromUrl(social.image).title, '');
  }
});

test('unsupported website charts and malformed inputs use the wide branded card without altering their URL', async () => {
  for (const query of ['ids=1&metric=x_minutes', 'ids=-10&metric=wowy_rapm', 'ids=1,2,3,4,5,6,7',
    'ids=1,1', 'ids=1&min=bad', 'ids=1&min=25&max=19', 'ids=1&bandwidth=bad', 'ids=1&bandwidth=0', '']) {
    const url = new URL('https://www.darko.app/trajectories' + (query ? '?' + query : ''));
    const social = await careerShareMetadata(url);
    assert.equal(social.chart, false);
    assert.equal(social.image, 'https://www.darko.app/og-default.png');
    assert.equal(social.url, url.href);
    assert.deepEqual([social.width, social.height], [SOCIAL_FALLBACK.width, SOCIAL_FALLBACK.height]);
  }
});

test("player pages keep their own title and preview that player's career card", async () => {
  const shareUrl = new URL('/player/1628369?ids=1628369', 'https://www.darko.app');
  const social = await careerShareMetadata(shareUrl, { title: 'Jayson Tatum — DARKO', description: 'Explore Jayson Tatum.' });
  assert.equal(social.title, 'Jayson Tatum — DARKO');
  assert.equal(social.description, 'Explore Jayson Tatum.');
  assert.equal(new URL(social.image).searchParams.get('ids'), '1628369');
  assert.equal(socialImageUrl(chartSpecFromUrl('https://www.darko.app/player/1628369')), social.image);
});

test('social image serves successful PNGs and redirects failures to the wide branded card', async () => {
  const event = {};
  const success = new Response('png', { headers: { 'content-type': 'image/png' } });
  assert.equal(await socialChartResponse(event, async () => success), success);
  for (const render of [async () => new Response('missing player', { status: 422 }), async () => { throw new Error('unavailable'); }]) {
    const response = await socialChartResponse(event, render);
    assert.equal(response.status, 302); assert.equal(response.headers.get('location'), '/og-default.png');
  }
});
