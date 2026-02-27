<script>
    import * as d3 from 'd3';

    let { player = null } = $props();
    let svgEl = $state(null);

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
        const currentPlayer = player;
        if (!svgEl) return;

        if (!currentPlayer) {
            d3.select(svgEl).selectAll('*').remove();
            return;
        }

        renderChart(currentPlayer);
    });

    function renderChart(currentPlayer) {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const data = getProbabilities(currentPlayer);
        if (!data.length) return;

        const width = svgEl.clientWidth || 520;
        const height = 290;
        const margin = { top: 14, right: 20, bottom: 70, left: 62 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3.scaleLinear().domain([1, 12]).range([0, innerWidth]);
        const y = d3.scaleLinear().domain([0, 100]).range([innerHeight, 0]);

        const cutoff = d3.max(data.filter((point) => point.value >= 75).map((point) => point.horizon)) || 0;

        const chartGroup = svg
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        if (cutoff > 0) {
            chartGroup
                .append('rect')
                .attr('x', x(1))
                .attr('y', 0)
                .attr('width', Math.max(0, x(cutoff + 0.5) - x(1)))
                .attr('height', innerHeight)
                .attr('fill', 'var(--positive-bg)');
        }

        if (cutoff < 12) {
            chartGroup
                .append('rect')
                .attr('x', x(Math.max(1, cutoff + 0.5)))
                .attr('y', 0)
                .attr('width', Math.max(0, x(12) - x(Math.max(1, cutoff + 0.5))))
                .attr('height', innerHeight)
                .attr('fill', 'var(--bg-hover)');
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
            .call((group) => group.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '11px'));

        const xAxis = chartGroup
            .append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(
                d3
                    .axisBottom(x)
                    .tickValues(d3.range(1, 13))
                    .tickFormat((tick) => `+${tick}`)
            );
        xAxis.select('.domain').attr('stroke', 'var(--border)');
        xAxis.selectAll('.tick line').attr('stroke', 'var(--border-subtle)');
        xAxis.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '11px');

        const lineGenerator = d3
            .line()
            .x((point) => x(point.horizon))
            .y((point) => y(point.value))
            .curve(d3.curveMonotoneX);

        chartGroup
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--text)')
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', lineGenerator);

        chartGroup
            .selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', (point) => x(point.horizon))
            .attr('cy', (point) => y(point.value))
            .attr('r', 3.8)
            .attr('fill', 'var(--text)');

        chartGroup
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 48)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text)')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text('NBA Seasons From Current');

        chartGroup
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -44)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text('Probability of Being on Roster');
    }
</script>

<div class="chart-shell">
    <svg bind:this={svgEl} class="chart-svg" role="img" aria-label="Roster longevity projection chart"></svg>
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
