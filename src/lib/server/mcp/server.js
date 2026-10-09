import { chartSpecFromUrl } from '../charts/schema.js';
import { establishCareerCoverage, careerCoverage } from '../../utils/careerCoverage.js';
import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod';
import { careerChartLinks, CAREER_METRICS, MAX_CHART_PLAYERS } from '../../utils/careerChartSpec.js';
import { getMetricDefinition } from '../../utils/metricDefinitions.js';
import { getPositionCategory } from '../../utils/positionCategories.js';
import { ratingDate } from '../../utils/frozenRatings.js';
import { seasonOfRow } from '../../utils/seismograph.js';
import { darkoMethodologyMarkdown } from '../../utils/darkoMethodology.js';
import { movesByWindow, minGamesFor, WINDOWS } from '../../utils/daily.js';
import { CAREER_WIDGET_URI, careerWidgetHtml } from './widget.js';
import { clientFamily } from './usage.js';

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
export function createDarkoServer({ sources, charts, chartSpecSchema, origin = 'https://www.darko.app', version = '1.2.3', onToolCall, userAgent = '' }) {
  const server = new McpServer({ name: 'DARKO', version }, { instructions: 'DARKO serves NBA data only and is read-only. For WNBA histories, direct social posting, rating changes, model refits or publishing jobs, explain the unsupported scope without calling DARKO tools. Never search the NBA catalog for WNBA players. Resolve names in batches. For career comparisons create a chart; reuse the returned specification for edits. Full histories stay on the server, and charts plot played games only. Ratings are retrospective pregame estimates. Clients with MCP Apps can show the interactive chart widget; other clients receive the chart image in the tool result. If the host displays the widget, provide a caption and download link without duplicate images. Do not claim a widget appeared where none did. Never add unrelated photos, thumbnails or image cards.' });
  // `status` is the short text ChatGPT shows while a tool runs and after it finishes.
  const register = (name, description, inputSchema, handler, { status, ...meta } = {}) => server.registerTool(name, {
    title: name.replaceAll('_', ' '), description, inputSchema,
    outputSchema: z.record(z.string(), z.unknown()), annotations, _meta: {
      ...meta,
      ...(meta.ui?.resourceUri ? { 'openai/outputTemplate': meta.ui.resourceUri } : {}),
      ...(status ? { 'openai/toolInvocation/invoking': status[0], 'openai/toolInvocation/invoked': status[1] } : {}),
      ui: { visibility: ['model', 'app'], ...meta.ui }, 'openai/widgetAccessible': true
    }
  }, async (input, ctx) => {
    const started = performance.now();
    const client = clientFamily({ userAgent, meta: ctx?.mcpReq?._meta });
    let output;
    try { output = await handler(input, { client }); }
    catch (error) {
      const message = error?.name === 'ZodError' ? error.issues.map((issue) => issue.message).join('; ') : error?.message || 'DARKO data unavailable';
      output = { isError: true, content: [{ type: 'text', text: message }] };
    }
    const data = output?.structuredContent;
    const playerCount = data?.players?.length ?? data?.specification?.ids?.length ?? data?.ids?.length ??
      data?.matches?.length ?? input.ids?.length ?? input.queries?.length ?? (input.id ? 1 : 0);
    try { await onToolCall?.({ tool: name, client, ok: !output?.isError, duration_ms: Math.round(performance.now() - started), player_count: playerCount }); }
    catch { /* Metrics must not affect the tool result. */ }
    return output;
  });

  server.registerResource('methodology', 'darko://methodology', {
    title: 'DARKO methodology', description: 'Metric definitions, model parameters and interpretation limits.', mimeType: 'text/markdown'
  }, (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: darkoMethodologyMarkdown() }] }));
  server.registerPrompt('compare_career_histories', {
    title: 'Compare NBA careers', description: 'Create a multi-player DARKO chart.',
    argsSchema: z.object({ players: z.string().min(2).max(480), axis: z.enum(['age', 'games', 'seasons']).optional() })
  }, ({ players, axis }) => ({ messages: [{ role: 'user', content: { type: 'text',
    text: `Compare ${players} using DARKO career-history charts by ${axis || 'age'}. Resolve names together with search_players and clarify ambiguity. Call create_career_chart with all resolved IDs (up to six), Modern styling and white background. Preserve coverage notes and actual dates. Display the widget if supported; otherwise provide the image and download links. Read darko://methodology for interpretation. For edits reuse the returned specification and keep player/color pairs.` } }] }));
  server.registerPrompt('compare_with_darko_comps', {
    title: 'Find and chart published player comps', description: 'Use published DARKO comparisons to form an age-aligned cohort.',
    argsSchema: z.object({ player: z.string().min(2).max(80) })
  }, ({ player }) => ({ messages: [{ role: 'user', content: { type: 'text',
    text: `Compare ${player} with the closest published DARKO player comps by age. Resolve the name with search_players, clarify ambiguity, call get_comparison_cohort, then create_career_chart with its returned IDs. Explain the published matching-age/as-of basis. If comps are unavailable, report that instead of inventing peers. Provide the chart and download link, preserving coverage limits. These comps are not a future-career forecast.` } }] }));

  register('search_players', 'Resolve up to six NBA player names in one call, including retired players. Multiple plausible matches require clarification; do not assume the first is the intended player.', z.object({
    queries: z.array(z.string().trim().min(2).max(80)).min(1).max(MAX_CHART_PLAYERS), limit: z.number().int().min(1).max(15).default(8)
  }), async ({ queries, limit }) => {
    const active = new Map((await sources.getActivePlayers()).map((row) => [row.nba_id, row]));
    const matches = await Promise.all(queries.map(async (query) => {
      const candidates = (await sources.searchAllPlayers(query)).slice(0, limit);
      return { query, ambiguous: candidates.length > 1, candidates: candidates.map((row) => snapshot(active.get(row.nba_id) || row)) };
    }));
    return result({ matches, dataset_as_of: await sources.getLatestGameDate(), publication_time: null, model_vintage: null,
      limitation: matches.some((match) => !match.candidates.length) ? 'A name with no candidates has no published DARKO history yet; players drafted since the last publish appear after their first published game.' : null });
  }, { status: ['Finding players…', 'Players found'] });

  register('get_player_histories', 'Get compact per-season (ending year) or monthly retrospective pregame history summaries with dated start, end and peak. Summaries include all published rating states, including missed-game, scheduled-game and offseason states. Charts include played games only, so their range peaks may differ. For a visible career comparison use create_career_chart; these summaries are not chart points.', z.object({
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
    return result({ players, metric, definition: getMetricDefinition(metric), granularity,
      summary_basis: 'all_published_rating_states',
      basis_note: 'Includes missed-game, scheduled-game and offseason rating states. Chart summaries use played games only; their starts, ends and peaks may differ.',
      dataset_as_of: await sources.getLatestGameDate(),
      publication_time: null, model_vintage: null, limitations: ['Retrospective pregame series. Coverage begins in 1996–97. Games count available appearances, not model rows.'] });
  }, { status: ['Summarizing career histories…', 'Career histories summarized'] });

  server.registerResource('career-chart', CAREER_WIDGET_URI, { mimeType: 'text/html;profile=mcp-app' }, async () => ({
    contents: [{ uri: CAREER_WIDGET_URI, mimeType: 'text/html;profile=mcp-app', text: careerWidgetHtml(origin, charts.whiteThemeTokens),
      _meta: { ui: { domain: origin, prefersBorder: true, csp: { resourceDomains: [origin], connectDomains: [] } } } }]
  }));
  // ChatGPT draws the chart in its widget, and an image block there showed as a broken
  // placeholder. Every other client gets the 1200-pixel PNG in the result, so the model and the
  // reader can see the chart even where no widget renders.
  const chartResult = async (input, { client } = {}) => {
    const chart = await charts.buildCareerChart(input);
    const data = { ...chart.metadata, ...careerChartLinks(chart.metadata.specification, origin) };
    const names = data.coverage.map((p) => p.player_name).join(', ');
    const image = client !== 'chatgpt' && chart.display ? [{ type: 'image', mimeType: 'image/png', data: Buffer.from(chart.display).toString('base64') }] : [];
    const lead = image.length
      ? 'DARKO chart ready; the image is attached. Clients with MCP Apps may also show the interactive widget.'
      : 'DARKO chart ready. Show the widget when this client supports MCP Apps; otherwise provide the image/download/source links.';
    return { structuredContent: data, content: [
      { type: 'text', text: `${lead} Do not claim a widget rendered where none did. Avoid duplicate chart images and unrelated photos or image cards. ${names}. Pregame ${data.specification.metric}; games incorporated through ${data.dataset_as_of || 'unavailable'}. ${data.limitations.join(' ')}\nDisplay: ${data.image_url}\nDownload 2x PNG: ${data.download_url}\nOpen chart: ${data.source_url}` },
      ...image
    ] };
  };
  register('create_career_chart', 'Create and display an actual DARKO career-history comparison for up to six NBA IDs. Defaults to DPM over games played, Modern styling and a white background. Interactive widget supports player edits, metrics, age/games/seasons, crops and presets. format: wide or square; annotations: peak/smoothed_peak/latest/selected (optional); at: selected axis value. peak is the raw observed peak; smoothed_peak separately labels the displayed LOESS maximum. Choose up to three annotations. bandwidth is an optional smoothing span in (0,1]; null preserves the style preset. Peak/latest annotations describe the displayed range; the compact comparison also includes each player’s dated latest available rating. Selected points are nearest observations within coverage, never interpolated or extrapolated. Points are played games only. title: Latin letters, digits and common punctuation (no emoji or other scripts). For every conversational edit call this tool again with the current specification and requested changes; do not construct chart URLs manually. Preserve ID/color pairs. In widget clients return only a caption and the download/source links after the widget, without duplicate Markdown images. In other clients provide the returned image/download/source links and do not claim a widget appeared. Never add unrelated photos, web thumbnails or image cards, or use image search to decorate the answer. Full histories stay on the server.', chartSpecSchema, chartResult, { ui: { resourceUri: CAREER_WIDGET_URI }, status: ['Drawing career chart…', 'Career chart ready'] });

  register('import_career_chart', 'Reopen and edit an existing DARKO chart link: a trajectories page, a career chart image, or a player page (which opens as that player’s career chart). Restores IDs, colors, metric, axis, ranges, title, display, format and annotations. Only DARKO URLs or this server’s origin are accepted; the supplied URL is parsed, never fetched.', z.object({ url: z.string().url().max(4096) }), async ({ url }, options) => chartResult(chartSpecFromUrl(url, origin), options), { ui: { resourceUri: CAREER_WIDGET_URI }, status: ['Reopening chart…', 'Chart reopened'] });

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
  }, { status: ['Finding DARKO comps…', 'Comps found'] });

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
  }, { status: ['Reading ratings…', 'Ratings ready'] });

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
  }, { status: ['Ranking players…', 'Rankings ready'] });

  register('get_draft_class', 'List an NBA draft class (1996 onward) in pick order: each player’s DARKO rating going into his first played NBA game, an earlier initial estimate when available, and his current rating if he is on a current roster. Only players with at least one NBA game appear. Returns chart-ready IDs for the first six; chart them with create_career_chart, usually by games played or age.', z.object({
    year: z.number().int().min(1996).max(2100), limit: z.number().int().min(1).max(60).default(10), include_undrafted: z.boolean().default(false)
  }), async ({ year, limit, include_undrafted }) => {
    const [rows, active] = await Promise.all([sources.getRookieDebuts(year), sources.getActivePlayers()]);
    const current = new Map(active.map((row) => [row.nba_id, row]));
    const eligible = rows.filter((row) => include_undrafted || row.draft_slot != null);
    const players = eligible.slice(0, limit).map((row) => {
      const now = current.get(row.nba_id);
      return {
        nba_id: row.nba_id, player_name: row.player_name, pick: row.draft_slot ?? null, undrafted: row.draft_slot == null,
        first_game: { date: row.date ? String(row.date).slice(0, 10) : null, age: finite(row.age), dpm: finite(row.dpm), o_dpm: finite(row.o_dpm), d_dpm: finite(row.d_dpm) },
        initial_estimate: row.initial_estimate ? { date: row.initial_estimate.date ? String(row.initial_estimate.date).slice(0, 10) : null, age: finite(row.initial_estimate.age), dpm: finite(row.initial_estimate.dpm), o_dpm: finite(row.initial_estimate.o_dpm), d_dpm: finite(row.initial_estimate.d_dpm) } : null,
        current: now ? { team_name: now.team_name ?? null, dpm: finite(now.dpm), snapshot_date: ratingDate(now)?.slice(0, 10) ?? null } : null,
        source_url: `https://www.darko.app/player/${row.nba_id}`
      };
    });
    return result({ year, players, ids: players.slice(0, MAX_CHART_PLAYERS).map((player) => player.nba_id), players_with_games: eligible.length,
      basis: 'Players drafted that year with at least one NBA game in DARKO history, in pick order. first_game is the pregame rating entering the first actually played NBA game and matches game 1 on the career chart. initial_estimate is the first modeled state in the retrospective history; it can precede the NBA debut and differ from first_game.',
      dataset_as_of: await sources.getLatestGameDate(), snapshot_timing: 'pregame',
      limitation: players.length ? null : 'No player from this draft has a published DARKO game yet. Players appear after their first published game.' });
  }, { status: ['Reading draft class…', 'Draft class ready'] });

  register('get_rating_movers', 'Biggest DARKO DPM risers or fallers over the last 7 days, 30 days or the season, as of the latest published games. Each window reports its dates and the minimum games a player needs in it; between seasons the windows describe the last games published. Returns chart-ready IDs for the first six.', z.object({
    window: z.enum(['7', '30', 'season']).default('7'), direction: z.enum(['risers', 'fallers']).default('risers'), limit: z.number().int().min(1).max(25).default(10)
  }), async ({ window, direction, limit }) => {
    const [moves, datasetAsOf] = await Promise.all([sources.getRatingMoves(), sources.getLatestGameDate()]);
    const entry = movesByWindow(moves ?? [])[window];
    const label = WINDOWS.find((option) => option.key === window)?.label ?? window;
    if (!entry) return result({ window, window_label: label, direction, available: false, players: [], ids: [], dataset_as_of: datasetAsOf,
      limitation: 'No published rating moves for this window.' });
    const minGames = minGamesFor(window, entry);
    const sign = direction === 'risers' ? -1 : 1;
    const eligible = entry.rows.filter((row) => row.games >= minGames && row.delta !== null)
      .sort((a, b) => sign * (a.delta - b.delta) || a.id - b.id);
    const players = eligible.slice(0, limit).map((row) => ({
      nba_id: row.id, player_name: row.name, games: row.games, dpm_from: row.from, dpm_to: row.to, change: row.delta,
      offense_change: row.offenseDelta, defense_change: row.delta !== null && row.offenseDelta !== null ? row.delta - row.offenseDelta : null,
      source_url: `https://www.darko.app/player/${row.id}`
    }));
    return result({ window, window_label: label, direction, available: true, start_date: entry.start, end_date: entry.end, min_games: minGames,
      eligible_players: eligible.length, players, ids: players.slice(0, MAX_CHART_PLAYERS).map((player) => player.nba_id), dataset_as_of: datasetAsOf,
      basis: 'Change in total DPM from the window’s first rating to its latest, for players with enough games in the window. Offense and defense changes add up to the total.' });
  }, { status: ['Finding rating movers…', 'Rating movers ready'] });
  return server;
}
