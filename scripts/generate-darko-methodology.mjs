import { writeFileSync } from 'node:fs';
import { darkoMethodologyMarkdown } from '../src/lib/utils/darkoMethodology.js';

writeFileSync(new URL('../plugins/darko/skills/darko-analysis/references/methodology.md', import.meta.url), darkoMethodologyMarkdown());
console.log('Generated DARKO methodology from the site sources.');
