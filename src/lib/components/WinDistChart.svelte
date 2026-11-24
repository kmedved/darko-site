<script>
    import * as d3 from 'd3';
    import { getContext } from 'svelte';
    import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
    import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
    import { formatWinRange, winPoints, winRange } from '$lib/utils/winDistribution.js';
    import ChartDownloadMenu from '$lib/components/ChartDownloadMenu.svelte';

    /**
     * A team's simulated seasons by final win total. Totals sit on a wins axis (the table skips
     * totals no simulation reached), the solid bars are the middle 80%, and the line marks the
     * projection.
     */
    let { data = [], meanWins = 0, teamName = '', simulations = 10_000 } = $props();
    let chartRootEl = $state(null);
    let svgEl = $state(null);
    const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
    const exportFilenameBase = $derived(teamName ? `${teamName}-win-distribution` : 'team-win-distribution');

    const points = $derived(winPoints(data));
    const range = $derived(winRange(points));
    const half = $derived(winRange(points, 0.25, 0.75));
    const caption = $derived.by(() => {
        if (!range) return '';
        const who = teamName ? `the ${teamName}` : 'the team';
        if (range.low === range.high) return `In most of ${simulations.toLocaleString('en-US')} simulated seasons, ${who} finish with ${range.low} wins.`;
        return `In 80% of ${simulations.toLocaleString('en-US')} simulated seasons, ${who} finish with ${formatWinRange(range)} wins; in half of them, ${formatWinRange(half)}.`;
    });

    function clearChart() {
        if (!svgEl) return;
        d3.select(svgEl).selectAll('*').remove();
    }

    $effect(() => {
        if (!svgEl || !chartRootEl) return;
        if (!points.length) {
            clearChart();
            return;
        }

        renderChart();
        return withResizeObserver({ element: chartRootEl, onResize: renderChart });
    });

    function renderChart() {
        if (!points.length || !range) {
            clearChart();
            return;
        }

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const width = chartRootEl?.clientWidth ?? 0;
        if (!width) return;

        const height = 200;
        svg.attr('height', height);

        const margin = { top: 22, right: 16, bottom: 32, left: 40 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const color = getSeriesColor(0, displayMode.view);

        const x = d3.scaleLinear()
            .domain([points[0].wins - 1, points[points.length - 1].wins + 1])
            .range([0, w]);
        const step = x(1) - x(0);
        const barWidth = Math.max(1, step - (step > 6 ? 2 : step > 3 ? 1 : 0));

        const maxProb = d3.max(points, (d) => d.prob * 100);
        const y = d3.scaleLinear().domain([0, maxProb * 1.1]).range([h, 0]);

        // Y axis gridlines first, so the bars sit on top.
        g.append('g')
            .call(d3.axisLeft(y).ticks(4).tickFormat((d) => d.toFixed(0) + '%'))
            .call((axis) => axis.select('.domain').remove())
            .call((axis) => axis.selectAll('.tick line').style('stroke', 'var(--border)').attr('stroke-dasharray', '2,3').attr('x2', w))
            .call((axis) => axis.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '11px'));

        g.selectAll('rect.win-bar')
            .data(points)
            .join('rect')
            .attr('class', 'win-bar')
            .attr('x', (d) => x(d.wins) - barWidth / 2)
            .attr('y', (d) => y(d.prob * 100))
            .attr('width', barWidth)
            .attr('height', (d) => h - y(d.prob * 100))
            .attr('rx', 1.5)
            .style('fill', color)
            .attr('opacity', (d) => (d.wins < range.low || d.wins > range.high ? 0.3 : 0.9))
            .append('title')
            .text((d) => `${d.wins} wins: ${(d.prob * 100).toFixed(1)}% of seasons`);

        const projected = Number.parseFloat(meanWins);
        if (Number.isFinite(projected)) {
            const at = x(projected);
            g.append('line')
                .attr('x1', at)
                .attr('x2', at)
                .attr('y1', -6)
                .attr('y2', h)
                .style('stroke', 'var(--text)')
                .attr('stroke-width', 2);

            // The label reads away from whichever edge is nearer.
            const flip = at > w - 110;
            g.append('text')
                .attr('x', flip ? at - 6 : at + 6)
                .attr('y', -8)
                .attr('text-anchor', flip ? 'end' : 'start')
                .style('fill', 'var(--text-secondary)')
                .attr('font-size', '11px')
                .attr('font-family', 'var(--font-mono)')
                .text(`Projected ${projected.toFixed(1)}`);
        }

        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(w / 70))).tickFormat(d3.format('d')))
            .call((axis) => axis.select('.domain').style('stroke', 'var(--border)'))
            .call((axis) => axis.selectAll('.tick line').style('stroke', 'var(--border)'))
            .call((axis) => axis.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '11px'));
    }
</script>

<div class="chart-download-shell" bind:this={chartRootEl}>
    <div class="chart-download-toolbar">
        <ChartDownloadMenu
            {svgEl}
            captureRootEl={chartRootEl}
            filenameBase={exportFilenameBase}
        />
    </div>
    <div class="win-dist-chart-shell">
        <svg bind:this={svgEl} width="100%" height="200" style="overflow: visible;" role="img" aria-label={caption}></svg>
    </div>
    {#if caption}
        <p class="win-dist-caption">{caption}</p>
    {/if}
</div>

<style>
    .win-dist-chart-shell {
        width: 100%;
    }

    .win-dist-caption {
        margin: 10px 0 0;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.45;
    }
</style>
