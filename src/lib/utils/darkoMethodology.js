import { HALF_LIVES, DPM_BLEND } from './aboutDarko.js';
import { metricDefinitions } from './metricDefinitions.js';
import { getMetricDisplayLabel } from './csvPresets.js';

/** One source for the packaged skill and the public MCP resource. */
export function darkoMethodologyMarkdown() {
  return [
    '# DARKO methodology reference', '',
    'Generated from src/lib/utils/aboutDarko.js, metricDefinitions.js and csvPresets.js. Regenerate with npm run plugin:reference after source changes.', '',
    'Source: https://www.darko.app/about', '',
    '## Interpretation', '',
    'DARKO career histories are retrospective pregame estimates, not an archive of ratings originally published on each date. Past values can change after a refit. Coverage begins in 1996–97; earlier careers are partial. Games count played appearances in available history. LOESS is a presentation curve, not a future projection. Raw peaks and smoothed peaks are different statistics. Selected values use the nearest observed rating inside coverage; retain its actual date and axis value. Charts include played games only. Numeric monthly and seasonal summaries include all published rating states, including missed-game, scheduled-game and offseason states, so their starts, ends and peaks can differ from the chart.', '',
    '## Metrics', '',
    ...Object.entries(metricDefinitions).map(([key, definition]) => `- **${getMetricDisplayLabel(key)} (${key}):** ${definition}`), '',
    '## Current DPM blend', '',
    `On/off share is possessions / (possessions + prior). The offensive prior is ${DPM_BLEND.offense.toLocaleString('en-US')} possessions and the defensive prior is ${DPM_BLEND.defense.toLocaleString('en-US')}.`, '',
    '## Current per-stat half-lives', '',
    'The games conversion is the About page’s current schedule-based estimate; some per-day rates vary with age. These constants describe the distributed reference, not an authoritative model-vintage identifier.', '',
    '| Statistic | Days | Games |', '| --- | ---: | ---: |',
    ...HALF_LIVES.map((stat) => `| ${stat.label} | ${stat.days} | ${stat.games} |`), ''
  ].join('\n');
}
