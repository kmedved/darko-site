import { writeFileSync } from 'node:fs';
import { HALF_LIVES, DPM_BLEND } from '../src/lib/utils/aboutDarko.js';
import { metricDefinitions } from '../src/lib/utils/metricDefinitions.js';
import { getMetricDisplayLabel } from '../src/lib/utils/csvPresets.js';

const text = [
  '# DARKO methodology reference', '',
  'Generated from src/lib/utils/aboutDarko.js, metricDefinitions.js and csvPresets.js. Regenerate with npm run plugin:reference after source changes.', '',
  'Source: https://darko.app/about', '',
  '## Metrics', '',
  ...Object.entries(metricDefinitions).map(([key, definition]) => `- **${getMetricDisplayLabel(key)} (${key}):** ${definition}`), '',
  '## Current DPM blend', '',
  `On/off share is possessions / (possessions + prior). The offensive prior is ${DPM_BLEND.offense.toLocaleString('en-US')} possessions and the defensive prior is ${DPM_BLEND.defense.toLocaleString('en-US')}.`, '',
  '## Current per-stat half-lives', '',
  'The games conversion is the About page’s current schedule-based estimate; some per-day rates vary with age. These constants describe the distributed reference, not an authoritative model-vintage identifier.', '',
  '| Statistic | Days | Games |', '| --- | ---: | ---: |',
  ...HALF_LIVES.map((stat) => `| ${stat.label} | ${stat.days} | ${stat.games} |`), ''
].join('\n');
writeFileSync(new URL('../plugins/darko/skills/darko-analysis/references/methodology.md', import.meta.url), text);
console.log('Generated DARKO methodology from the site sources.');
