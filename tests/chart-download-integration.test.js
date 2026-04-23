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

test('ChartDownloadMenu context actions use the chart surface and shared image export paths', async () => {
    const menuPath = path.resolve(process.cwd(), 'src/lib/components/ChartDownloadMenu.svelte');
    const contents = await fs.readFile(menuPath, 'utf8');

    assert.match(contents, /setupQuickChartExport/, 'ChartDownloadMenu should wire up chart context gestures');
    assert.match(
        contents,
        /const\s+interactionTargetEl\s*=\s*\$derived\(svgEl\?\.parentElement\s*\?\?\s*null\)/,
        'ChartDownloadMenu should target the chart surface rather than the toolbar'
    );
    assert.match(
        contents,
        /onQuickExport:\s*\(_format,\s*event\)\s*=>\s*openContextMenu\(event\)/,
        'chart context gestures should open the action menu'
    );
    assert.match(contents, /await\s+exportChartImage\(/, 'downloads should continue to use the chart image export helper');
    assert.match(
        contents,
        /actionError\s*=\s*error\?\.message\s*\|\|\s*'Chart download failed\.';/,
        'download failures should be visible in the popup'
    );
    assert.match(contents, /await\s+copyChartImageToClipboard\(/, 'copy actions should use the clipboard export helper');
});

test('chart image export exposes a clipboard path through a PNG blob', async () => {
    const exportPath = path.resolve(process.cwd(), 'src/lib/utils/chartImageExport.js');
    const contents = await fs.readFile(exportPath, 'utf8');

    assert.match(contents, /export\s+async\s+function\s+createChartImageBlob/, 'image export should expose blob creation');
    assert.match(contents, /export\s+async\s+function\s+copyChartImageToClipboard/, 'image export should expose clipboard copy');
    assert.match(contents, /new\s+ClipboardItem/, 'clipboard copy should write an image ClipboardItem');
    assert.match(contents, /format:\s*'png'/, 'clipboard copy should render a PNG image');
});
