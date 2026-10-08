import { chartSpecFromUrl } from '../charts/schema.js';
import { establishCareerCoverage, careerCoverage } from '../../utils/careerCoverage.js';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { careerChartLinks, CAREER_METRICS, MAX_CHART_PLAYERS } from '../../utils/careerChartSpec.js';
import { getMetricDefinition } from '../../utils/metricDefinitions.js';
import { getPositionCategory } from '../../utils/positionCategories.js';
import { ratingDate } from '../../utils/frozenRatings.js';
import { seasonOfRow } from '../../utils/seismograph.js';
import { CAREER_WIDGET_URI, careerWidgetHtml } from './widget.js';

const idsSchema = z.array(z.number().int().positive()).min(1).max(MAX_CHART_PLAYERS).refine((ids) => new Set(ids).size === ids.length, 'Player IDs must be unique');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => { const d = new Date(v + 'T00:00:00Z'); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v; });
export const METRIC_GROUPS = Object.freeze({
  impact: ['dpm', 'o_dpm', 'd_dpm', 'box_dpm', 'box_odpm', 'box_ddpm', 'on_off_dpm', 'on_off_odpm', 'on_off_ddpm'],
  projections: ['x_minutes', 'x_pace', 'x_pts_100', 'x_ast_100', 'x_orb_100', 'x_drb_100', 'x_stl_100', 'x_blk_100', 'x_tov_100', 'x_fga_100', 'x_fg3a_100', 'x_fta_100', 'x_fg_pct', 'x_fg3_pct', 'x_ft_pct'],
  value: ['sal_market_fixed', 'actual_salary', 'surplus_value', 'warp'],
  longevity: ['projected_years_remaining_cal', 'projected_years_remaining', 'x_retirement_age_cal', 'x_retirement_age', ...Array.from({ length: 15 }, (_, i) => `s${i + 1}`)]
});
const RANK_METRICS = Object.freeze([...new Set(Object.values(METRIC_GROUPS).flat())]);
const finite = (value) => { const n = Number.parseFloat(value); return Number.isFinite(n) ? n : null; };
const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

function snapshot(row) {
  return {
    nba_id: row.nba_id, player_name: row.player_name,
    team_name: row.team_name ?? null, position: row.position ?? null, age: finite(row.age),
    season: row.season ?? null, snapshot_date: ratingDate(row)?.slice(0, 10) ?? null,
    snapshot_timing: 'pregame', source_url: `https://www.darko.app/player/${row.nba_id}`
  };
}

function result(data, message) {
  return { structuredContent: data, content: [{ type: 'text', text: message || JSON.stringify(data) }] };
}

export function summarizeHistory(rows, metric, granularity) {
  const periods = new Map();
  for (const row of rows) {
    const value = finite(row[metric]);
    if (value === null) continue;
    const date = ratingDate(row)?.slice(0, 10);
    if (!date) continue;
    const key = granularity === 'monthly' ? date.slice(0, 7) : String(seasonOfRow(row));
    const point = { date, value };
    if (!periods.has(key)) periods.set(key, { period: key, start: point, end: point, peak: point, rows: 0 });
    const period = periods.get(key); period.rows += 1; period.end = point;
    if (value > period.peak.value) period.peak = point;
  }
  return [...periods.values()];
}

/** Register once per request; injected readers let tests exercise public MCP contracts. */
export function createDarkoServer({ sources, charts, chartSpecSchema, origin = 'https://www.darko.app', version = '1.1.0' }) {
  const server = new McpServer({ name: 'DARKO', version }, { instructions: 'DARKO is read-only. Resolve names in batches. For career comparisons create a chart; reuse the returned specification for edits. Full histories stay on the server. Ratings are retrospective pregame estimates. The chart widget displays the image. After rendering, provide a caption and download link; do not add Markdown images, photos, web thumbnails or image cards. The widget is the only chart visual.' });
  const register = (name, description, inputSchema, handler, meta = {}) => server.registerTool(name, {
    title: name.replaceAll('_', ' '), description, inputSchema,
    outputSchema: z.record(z.string(), z.unknown()), annotations, _meta: { ...meta, ui: { visibility: ['model', 'app'], ...meta.ui }, 'openai/widgetAccessible': true }
  }, async (input) => {
    try { return await handler(input); }
    catch (error) {
      const message = error?.name === 'ZodError' ? error.issues.map((issue) => issue.message).join('; ') : error?.message || 'DARKO data unavailable';
      return { isError: true, content: [{ type: 'text', text: message }] };
    }
  });

  register('search_players', 'Resolve up to six NBA player names in one call, including retired players. Multiple plausible matches require clarification; do not assume the first is the intended player.', z.object({
    queries: z.array(z.string().trim().min(2).max(80)).min(1).max(MAX_CHART_PLAYERS), limit: z.number().int().min(1).max(15).default(8)
  }), async ({ queries, limit }) => {
    const active = new Map((await sources.getActivePlayers()).map((row) => [row.nba_id, row]));
    const matches = await Promise.all(queries.map(async (query) => {
      const candidates = (await sources.searchAllPlayers(query)).slice(0, limit);
      return { query, ambiguous: candidates.length > 1, candidates: candidates.map((row) => snapshot(active.get(row.nba_id) || row)) };
    }));
    return result({ matches, dataset_as_of: await sources.getLatestGameDate(), publication_time: null, model_vintage: null });
  });

  register('get_player_histories', 'Get compact per-season (ending year) or monthly retrospective pregame history summaries with dated start, end and peak. For a visible career comparison use create_career_chart; these summaries are not chart points.', z.object({
    ids: idsSchema, metric: z.enum(CAREER_METRICS).default('dpm'), granularity: z.enum(['season', 'monthly']).default('season'),
    from: dateSchema.optional(), to: dateSchema.optional()
  }).refine((v) => !v.from || !v.to || v.from <= v.to, 'from must precede to'), async ({ ids, metric, granularity, from, to }) => {
    const histories = await Promise.all(ids.map(async (id) => establishCareerCoverage(await sources.getFullPlayerTrajectoryHistory(id), id, sources.getWowyPlayerHistory)));
    const players = histories.map((history, index) => {
      if (!history.rows.length) throw new Error(`No history for player ${ids[index]}.`);
      const filtered = history.rows.filter((row) => (!from || row.date.slice(0, 10) >= from) && (!to || row.date.slice(0, 10) <= to));
      const summaries = summarizeHistory(filtered, metric, granularity);
      return { ...snapshot(history.rows.at(-1)), available_from: history.rows[0].date.slice(0, 10),
        ...careerCoverage(history), truncated: history.truncated,
        periods: summaries.slice(0, 360), periods_truncated: summaries.length > 360 };
    });
    return result({ players, metric, definition: getMetricDefinition(metric), granularity, dataset_as_of: await sources.getLatestGameDate(),
      publication_time: null, model_vintage: null, limitations: ['Retrospective pregame series. Coverage begins in 1996–97. Games count available appearances, not model rows.'] });
  });

  server.registerResource('career-chart', CAREER_WIDGET_URI, { mimeType: 'text/html;profile=mcp-app' }, async () => ({
    contents: [{ uri: CAREER_WIDGET_URI, mimeType: 'text/html;profile=mcp-app', text: careerWidgetHtml(origin, charts.whiteThemeTokens),
      _meta: { ui: { prefersBorder: true, csp: { resourceDomains: [origin], connectDomains: [] } } } }]
  }));
  const chartResult = async (input) => {
    const chart = await charts.buildCareerChart(input);
    const data = { ...chart.metadata, ...careerChartLinks(chart.metadata.specification, origin) };
    const names = data.coverage.map((p) => p.player_name).join(', ');
    return { structuredContent: data, content: [
      { type: 'text', text: `Chart displayed in the DARKO widget. Do not add Markdown images, photos, web thumbnails or image cards. The widget is the only chart visual. ${names}. Pregame ${input.metric}; games incorporated through ${data.dataset_as_of || 'unavailable'}. ${data.limitations.join(' ')}\nDisplay: ${data.image_url}\nDownload 2x PNG: ${data.download_url}\nOpen chart: ${data.source_url}` }
    ] };
  };
  register('create_career_chart', 'Create and display an actual DARKO career-history comparison for up to six NBA IDs. Defaults to DPM over games played, Modern styling and a white background. Interactive widget supports player edits, metrics, age/games/seasons, crops and presets. format: wide or square; annotations: peak/latest/selected (optional); at: selected axis value. Peak/latest annotations describe the displayed range; the compact comparison also includes each player’s dated latest available rating. Selected points are nearest observations within coverage, never interpolated or extrapolated. For every conversational edit call this tool again with the current specification and requested changes; do not construct chart URLs manually. Preserve ID/color pairs. Return only a caption and the download/source links after the widget. Do not add Markdown images, photos, web thumbnails or image cards, and do not use image search to decorate the answer. Full histories stay on the server.', chartSpecSchema, chartResult, { ui: { resourceUri: CAREER_WIDGET_URI } });

  register('import_career_chart', 'Reopen and edit an existing DARKO trajectories or career PNG URL. Restores IDs, colors, metric, axis, ranges, title, display, format and annotations. Only DARKO URLs or this server’s origin are accepted; the supplied URL is parsed, never fetched.', z.object({ url: z.string().url().max(4096) }), async ({ url }) => chartResult(chartSpecFromUrl(url, origin)), { ui: { resourceUri: CAREER_WIDGET_URI } });

  register('get_comparison_cohort', 'Suggest up to five distinct players from a player’s published DARKO historical comps. These are nearest player-season comps at the published matching age, not an arbitrary list of stars or a career forecast. Repeated player seasons are deduplicated in rank order; the anchor is excluded from suggestions. Returns a chart-ready ID list. No published comps means unavailable; do not invent peers.', z.object({ id: z.number().int().positive(), limit: z.number().int().min(1).max(5).default(5) }), async ({ id, limit }) => {
    const published = await sources.getPlayerComps(id);
    const seen = new Set([id]), comparisons = [];
    for (const row of [...published].sort((a, b) => Number(a.rank) - Number(b.rank))) {
      const nbaId = Number(row.comp_id);
      if (!Number.isInteger(nbaId) || nbaId <= 0 || seen.has(nbaId)) continue;
      seen.add(nbaId);
      comparisons.push({ nba_id: nbaId, player_name: row.comp_name, source_url: `https://www.darko.app/player/${nbaId}`,
        rank: Number(row.rank), matched_season: row.comp_season, matched_age: finite(row.comp_age), similarity: finite(row.similarity),
        snapshot_date: row.as_of ?? null, snapshot_timing: 'pregame' });
      if (comparisons.length === limit) break;
    }
    return result({ anchor_id: id, available: comparisons.length > 0, ids: [id, ...comparisons.map((row) => row.nba_id)], comparisons,
      basis: 'Published DARKO nearest player-season comps at the anchor’s matching age; one season per distinct player, in published rank order.',
      matched_age: finite(published[0]?.age), as_of: published[0]?.as_of ?? null, snapshot_timing: 'pregame',
      dataset_as_of: await sources.getLatestGameDate(), limitation: comparisons.length ? null : 'No published DARKO comps for this player. No substitute cohort was invented.' });
  });

  register('get_players', 'Get current DARKO player ratings in batches, or explicitly labeled last available ratings for retired players. Select impact, projections, value or longevity groups. Salary/value and longevity answer different questions from DPM.', z.object({
    ids: idsSchema, groups: z.array(z.enum(['impact', 'projections', 'value', 'longevity'])).min(1).max(4).default(['impact'])
  }), async ({ ids, groups }) => {
    const current = new Map((await sources.getActivePlayers()).map((row) => [row.nba_id, row]));
    const players = await Promise.all(ids.map(async (id) => {
      const active = current.get(id);
      const row = active || (await sources.getFullPlayerHistory(id)).rows.at(-1);
      if (!row) throw new Error(`No ratings for player ${id}.`);
      const values = {};
      for (const group of groups) values[group] = Object.fromEntries(METRIC_GROUPS[group].map((key) => [key, finite(row[key])]));
      return { ...snapshot(row), current: Boolean(active), values };
    }));
    const definitions = Object.fromEntries(groups.flatMap((group) => METRIC_GROUPS[group]).map((key) => [key, getMetricDefinition(key) || null]));
    return result({ players, definitions, dataset_as_of: await sources.getLatestGameDate(), publication_time: null, model_vintage: null,
      limitations: ['Dates can differ by player. Retired-player values are last available, not current forecasts. Longevity probabilities s1–s15 refer to remaining season horizons; missing values are unavailable.'] });
  });

  register('get_rankings', 'Rank a bounded player population by any supported public numeric metric. Current roster by default; season chooses its opening-roster snapshot (ending year), or asof chooses a Time Machine date. Filters use the snapshot team, position, age and projected minutes per game. Null metric values are excluded; ties sort by NBA ID.', z.object({
    metric: z.enum(RANK_METRICS).default('dpm'), direction: z.enum(['desc', 'asc']).default('desc'), limit: z.number().int().min(1).max(50).default(10),
    season: z.number().int().min(1997).max(2100).optional(), asof: dateSchema.optional(), team: z.string().trim().min(1).max(80).optional(),
    position: z.enum(['G', 'F', 'C', 'G-F', 'F-C']).optional(), age_min: z.number().min(0).max(100).optional(), age_max: z.number().min(0).max(100).optional(),
    minutes_min: z.number().min(0).max(48).optional()
  }).refine((v) => !(v.season && v.asof), 'Choose season or asof, not both').refine((v) => v.age_min == null || v.age_max == null || v.age_min <= v.age_max, 'age_min must not exceed age_max'), async (input) => {
    let rows, population;
    if (input.asof) { const data = await sources.getPlayersAsOf(input.asof); rows = data.rows; population = `Time Machine snapshot as of ${input.asof}; season ${data.season ?? 'unavailable'}`; }
    else if (input.season) { rows = await sources.getSeasonStartPlayers(input.season); population = `Opening roster for season ending ${input.season}`; }
    else { rows = await sources.getActivePlayers(); population = 'Current roster'; }
    const matching = rows.filter((row) => {
      const age = finite(row.age), mpg = finite(row.x_minutes);
      return finite(row[input.metric]) !== null && (!input.team || row.team_name?.toLowerCase() === input.team.toLowerCase()) &&
        (!input.position || getPositionCategory(row.position) === input.position) &&
        (input.age_min == null || (age !== null && age >= input.age_min)) && (input.age_max == null || (age !== null && age <= input.age_max)) &&
        (input.minutes_min == null || (mpg !== null && mpg >= input.minutes_min));
    });
    matching.sort((a, b) => (input.direction === 'desc' ? -1 : 1) * (finite(a[input.metric]) - finite(b[input.metric])) || a.nba_id - b.nba_id);
    return result({ metric: input.metric, definition: getMetricDefinition(input.metric) || null, population, matching_players: matching.length,
      minutes_filter: 'Projected minutes per game', season_convention: 'Season ending year', dataset_as_of: await sources.getLatestGameDate(), publication_time: null, model_vintage: null,
      players: matching.slice(0, input.limit).map((row, index) => ({ ...snapshot(row), rank: index + 1, value: finite(row[input.metric]) })) });
  });
  return server;
}
