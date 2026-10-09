import * as z from 'zod';
import { readCareerQuery, CAREER_METRICS, CAREER_SCALES, MAX_CHART_PLAYERS, resolveChartColors } from '../../utils/careerChartSpec.js';
import { undrawableTitleCharacters } from './titleCharacters.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a real calendar date, YYYY-MM-DD');
const bound = z.number().finite().min(-10000).max(10000).nullable().default(null);
// Titles are drawn with the bundled Latin font only; emoji and other scripts would render as
// empty boxes, so they are refused with a message the assistant can act on.
const title = z.string().max(100).transform((value) => value.normalize('NFC')).superRefine((value, ctx) => {
  const missing = undrawableTitleCharacters(value);
  if (missing.length) {
    ctx.addIssue({ code: 'custom', message: `Chart titles can use Latin letters, digits and common punctuation. Remove ${missing.join(' ')} (emoji and other scripts cannot be drawn).` });
  }
});
export const chartSpecSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(MAX_CHART_PLAYERS),
  metric: z.enum(CAREER_METRICS).default('dpm'), scale: z.enum(CAREER_SCALES).default('games'),
  min: bound, max: bound, from: date.nullable().default(null), to: date.nullable().default(null),
  ymin: bound, ymax: bound, title: title.default(''),
  display: z.enum(['modern', 'shiny']).default('modern'),
  format: z.enum(['wide', 'square']).default('wide'),
  annotations: z.array(z.enum(['peak', 'smoothed_peak', 'latest', 'selected'])).max(3).default([]),
  at: bound.default(null),
  points: z.boolean().default(true), smooth: z.boolean().default(true),
  bandwidth: z.number().finite().gt(0).max(1).nullable().default(null),
  colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(MAX_CHART_PLAYERS).default([])
}).strict().superRefine((spec, ctx) => {
  for (const [low, high] of [['min', 'max'], ['from', 'to'], ['ymin', 'ymax']]) {
    if (spec[low] != null && spec[high] != null && (low === 'ymin' ? spec[low] >= spec[high] : spec[low] > spec[high])) {
      ctx.addIssue({ code: 'custom', path: [high], message: `${low} must precede ${high}` });
    }
  }
  if (new Set(spec.annotations).size !== spec.annotations.length) ctx.addIssue({ code: 'custom', path: ['annotations'], message: 'Annotations must be unique' });
  if (spec.annotations.includes('selected') && spec.at == null) ctx.addIssue({ code: 'custom', path: ['at'], message: 'Select an axis value for the selected-point annotation' });
  if (spec.annotations.includes('smoothed_peak') && !spec.smooth) ctx.addIssue({ code: 'custom', path: ['annotations'], message: 'Enable smoothing for a smoothed-peak annotation' });
  if (new Set(spec.ids).size !== spec.ids.length) ctx.addIssue({ code: 'custom', path: ['ids'], message: 'Player IDs must be unique' });
  if (spec.colors.length > spec.ids.length) ctx.addIssue({ code: 'custom', path: ['colors'], message: 'Extra colors have no selected player' });
});


export function canonicalChartSpec(input) {
  const spec = chartSpecSchema.parse(input);
  return { ...spec, colors: resolveChartColors(spec) };
}


const CHART_PATHS = new Set(['/trajectories', '/api/charts/career.png', '/api/charts/social.png']);
const PLAYER_PATH = /^\/player\/(\d+)\/?$/;

/**
 * Import a spec, never fetch the supplied URL. Accepts DARKO chart links, chart images and
 * player pages; a player page opens as that player's career chart.
 */
export function chartSpecFromUrl(value, origin = 'https://www.darko.app') {
  const url = new URL(value);
  const allowed = new Set(['https://darko.app', 'https://www.darko.app', origin]);
  const player = url.pathname.match(PLAYER_PATH);
  if (url.username || url.password || !allowed.has(url.origin) || !(player || CHART_PATHS.has(url.pathname))) {
    throw new Error('Use a DARKO trajectories, player page or career chart image link.');
  }
  if (player) url.searchParams.set('ids', player[1]);
  for (const key of ['min', 'max', 'ymin', 'ymax', 'at', 'bandwidth']) {
    const v = url.searchParams.get(key);
    if (v !== null && v !== '' && !Number.isFinite(Number(v))) throw new Error(`${key} must be a finite number`);
  }
  return canonicalChartSpec(readCareerQuery(url.searchParams));
}
