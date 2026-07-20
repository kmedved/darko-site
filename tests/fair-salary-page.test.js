import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

const fairSalaryPage = readFileSync(
	join(projectRoot, 'src/routes/about/fair-salary/+page.svelte'),
	'utf8'
);
const leaderboardPage = readFileSync(join(projectRoot, 'src/routes/+page.svelte'), 'utf8');
const aboutPage = readFileSync(join(projectRoot, 'src/routes/about/+page.svelte'), 'utf8');

test('fair salary explainer documents the published calculation and fields', () => {
	assert.match(fairSalaryPage, /Game value = \(DPM \+ 2\.0\) × \(tr_minutes ÷ 48\)/);
	assert.match(fairSalaryPage, /Raw fair salary = game value × seasonal dollar rate × 82/);
	assert.match(fairSalaryPage, /Kalman-smoothed/);
	assert.match(fairSalaryPage, /sal_market_fixed - actual_salary/);
	assert.match(fairSalaryPage, /surplus_value/);
	assert.match(fairSalaryPage, /not a prediction of what contract the player will sign/);
});

test('public entry points link to the fair salary explainer', () => {
	assert.match(leaderboardPage, /href="\/about\/fair-salary"/);
	assert.match(leaderboardPage, /\$ Value<\/strong> is DARKO's fair-salary estimate/);
	assert.match(aboutPage, /href="\/about\/fair-salary"/);
});
