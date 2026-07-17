<script>
    import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
    import { getProbabilityBands } from '$lib/utils/longevityProbabilityBands.js';
    import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
    import ChartDownloadMenu from '$lib/components/ChartDownloadMenu.svelte';
    import { getContext } from 'svelte';

    let { player = null } = $props();
    let chartRootEl = $state(null);
    let svgEl = $state(null);
    
    let chartPlayer = $state(null);
    const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
    const exportFilenameBase = $derived.by(() => {
        const prefix = player?.player_name ? `${player.player_name}-` : '';
        return `${prefix}longevity-career-length`;
    });

    function clearChart() {
        if (!svgEl) return;
        d3.select(svgEl).selectAll('*').remove();
    }

    function getProbabilities(currentPlayer) {
        return Array.from({ length: 12 }, (_, index) => {
            const horizon = index + 1;
            const raw = currentPlayer?.[`p${horizon}`];
            const value = Number.parseFloat(raw);
            return {
                horizon,
                value: Number.isFinite(value) ? value : null
            };
        }).filter((point) => point.value !== null);
    }

    $effect(() => {
        if (!svgEl || !chartRootEl) return;
        void displayMode.view;
        chartPlayer = player;

        const currentPlayer = chartPlayer;
        if (!currentPlayer) {
            clearChart();
            return;
        }

        renderChart(currentPlayer);

        return withResizeObserver({
            element: chartRootEl,
            onResize: () => {
                if (chartPlayer) renderChart(chartPlayer);
            }
        });
    });

    function renderChart(currentPlayer) {
        const width = chartRootEl?.clientWidth ?? 0;
        if (!width) {
            clearChart();
            return;
        }

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const data = getProbabilities(currentPlayer);
        if (!data.length) return;

        const isMobile = width < 500;
        const isShinyView = displayMode.view === 'shiny';
        const height = isShinyView ? (isMobile ? 340 : 330) : (isMobile ? 260 : 290);
        const margin = {
            top: isMobile ? 24 : 28,
            right: isMobile ? 12 : 20,
            bottom: isShinyView ? (isMobile ? 118 : 98) : (isMobile ? 56 : 70),
            left: isMobile ? 58 : 78
        };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear().domain([1, 12]).range([0, innerWidth]);
        const y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

        const chartGroup = svg
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        if (isShinyView) {
            const probabilityBands = getProbabilityBands(data);
            chartGroup
                .selectAll('.probability-band')
                .data(probabilityBands)
                .join('rect')
                .attr('class', 'probability-band')
                .attr('x', (band) => x(band.start))
                .attr('y', 0)
                .attr('width', (band) => Math.max(0, x(band.end) - x(band.start)))
                .attr('height', innerHeight)
                .attr('fill', (band) => {
                    if (band.zone === 'high') return 'var(--shiny-probability-high)';
                    if (band.zone === 'low') return 'var(--shiny-probability-low)';
                    return 'var(--shiny-probability-mid)';
                });
        }

        chartGroup
            .append('g')
            .call(
                d3
                    .axisLeft(y)
                    .tickValues([0, 25, 50, 75, 100])
                    .tickSize(-innerWidth)
                    .tickFormat((tick) => `${tick}%`)
            )
            .call((group) => group.select('.domain').remove())
            .call((group) => group.selectAll('.tick line').attr('stroke', 'var(--border-subtle)'))
            .call((group) =>
                group
                    .selectAll('.tick text')
                    .style('fill', 'var(--text-muted)')
                    .attr('font-size', isMobile ? '10px' : '11px')
            );

        const xAxis = chartGroup
            .append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(
                d3
                    .axisBottom(x)
                    .tickValues(isMobile ? [1, 3, 5, 7, 9, 11] : d3.range(1, 13))
                    .tickFormat((tick) => `+${tick}`)
            );
        xAxis.select('.domain').attr('stroke', 'var(--border)');
        xAxis.selectAll('.tick line').attr('stroke', 'var(--border-subtle)');
        xAxis.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '11px');

        const areaGenerator = d3
            .area()
            .x((point) => x(point.horizon))
            .y0(innerHeight)
            .y1((point) => y(point.value))
            .curve(d3.curveMonotoneX);

        const lineGenerator = d3
            .line()
            .x((point) => x(point.horizon))
            .y((point) => y(point.value))
            .curve(d3.curveMonotoneX);

        if (!isShinyView) {
            chartGroup
                .append('path')
                .datum(data)
                .attr('fill', 'var(--positive-bg)')
                .attr('d', areaGenerator);
        }

        chartGroup
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', isShinyView ? 'var(--shiny-chart-line)' : 'var(--accent)')
            .attr('stroke-width', isShinyView ? 3.5 : 2.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', lineGenerator);

        chartGroup
            .selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', (point) => x(point.horizon))
            .attr('cy', (point) => y(point.value))
            .attr('r', isShinyView ? 4.2 : 3.8)
            .attr('fill', isShinyView ? 'var(--shiny-chart-line)' : 'var(--accent)');

        if (!isMobile && !isShinyView) {
            chartGroup
                .selectAll('.point-label')
                .data(data)
                .join('text')
                .attr('class', 'point-label')
                .attr('x', (point) => x(point.horizon))
                .attr('y', (point) => y(point.value) - 10)
                .attr('text-anchor', 'middle')
                .attr('fill', 'var(--text)')
                .attr('font-size', '10px')
                .attr('font-weight', '700')
                .text((point) => `${point.value.toFixed(point.value >= 99.95 ? 0 : 1)}%`);
        }

        chartGroup
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + (isMobile ? 42 : 48))
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text)')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text('NBA Seasons From Current');

        chartGroup
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', isMobile ? -44 : -56)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text('Probability of Being on Roster');

        if (isShinyView) {
            const legendItems = [
                { fill: 'var(--shiny-probability-high)', label: '>75% on Roster' },
                { fill: 'var(--shiny-probability-mid)', label: '75%-25% on Roster' },
                { fill: 'var(--shiny-probability-low)', label: '<25% on Roster' }
            ];
            const legend = svg.append('g').attr('class', 'probability-legend');

            legendItems.forEach((item, index) => {
                const itemGroup = legend
                    .append('g')
                    .attr(
                        'transform',
                        isMobile
                            ? `translate(${margin.left}, ${height - 62 + index * 18})`
                            : `translate(${margin.left + index * (innerWidth / 3)}, ${height - 28})`
                    );

                itemGroup
                    .append('rect')
                    .attr('width', 14)
                    .attr('height', 14)
                    .attr('fill', item.fill);
                itemGroup
                    .append('text')
                    .attr('x', 20)
                    .attr('y', 11)
                    .attr('fill', 'var(--text)')
                    .attr('font-size', isMobile ? '10px' : '11px')
                    .text(item.label);
            });
        }
    }
</script>

<div class="chart-download-shell" bind:this={chartRootEl}>
    <div class="chart-download-toolbar">
        <ChartDownloadMenu
            {svgEl}
            captureRootEl={chartRootEl}
            filenameBase={exportFilenameBase}
            buttonLabel="..."
            buttonAriaLabel="Download roster probability chart"
        />
    </div>
    <div class="chart-shell">
        <svg bind:this={svgEl} class="chart-svg" role="img" aria-label="Roster longevity projection chart"></svg>
    </div>
</div>

<style>
    .chart-shell {
        width: 100%;
    }

    .chart-svg {
        width: 100%;
        height: auto;
        display: block;
    }
</style>
