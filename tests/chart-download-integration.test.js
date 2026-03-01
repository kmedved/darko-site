import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const CHART_COMPONENTS = [
    'src/lib/components/DpmChart.svelte',
    'src/lib/components/TrajectoryChart.svelte',
    'src/lib/components/TalentTrendChart.svelte',
    'src/lib/components/TalentPercentilesChart.svelte',
    'src/lib/components/ConferenceChart.svelte',
    'src/lib/components/WinDistChart.svelte',
    'src/lib/components/SeedChart.svelte',
    'src/lib/components/LongevityRosterChart.svelte',
    'src/lib/components/LongevityCareerLengthChart.svelte'
];

test('all chart components include ChartDownloadMenu integration', async () => {
    for (const file of CHART_COMPONENTS) {
        const absolutePath = path.resolve(process.cwd(), file);
        const contents = await fs.readFile(absolutePath, 'utf8');

        assert.match(contents, /ChartDownloadMenu/, `${file} should import ChartDownloadMenu`);
        assert.match(contents, /<ChartDownloadMenu[\s\S]*\{svgEl\}/, `${file} should render ChartDownloadMenu with svgEl`);
    }
});

test('parent components pass filename context props to chart components', async () => {
    const playerCardPath = path.resolve(process.cwd(), 'src/lib/components/PlayerCard.svelte');
    const teamDetailPath = path.resolve(process.cwd(), 'src/lib/components/TeamDetailView.svelte');

    const playerCard = await fs.readFile(playerCardPath, 'utf8');
    const teamDetail = await fs.readFile(teamDetailPath, 'utf8');

    assert.match(playerCard, /<DpmChart[\s\S]*playerName=\{player\.player_name\}/, 'PlayerCard should pass playerName to DpmChart');
    assert.match(teamDetail, /<WinDistChart[\s\S]*\{teamName\}/, 'TeamDetailView should pass teamName to WinDistChart');
    assert.match(teamDetail, /<SeedChart[\s\S]*\{teamName\}/, 'TeamDetailView should pass teamName to SeedChart');
});
