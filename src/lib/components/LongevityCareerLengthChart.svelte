<script>
    import * as d3 from 'd3';

    let { player = null } = $props();
    let svgEl = $state(null);

    $effect(() => {
        const currentPlayer = player;
        if (!svgEl) return;

        if (!currentPlayer?.trajectory?.length) {
            d3.select(svgEl).selectAll('*').remove();
            return;
        }

        renderChart(currentPlayer);
    });

    function renderChart(currentPlayer) {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const data = [...currentPlayer.trajectory]
            .map((point) => ({
                season_start: point.season_start,
                season_start_year: Number.parseFloat(point.season_start_year),
                projected_retirement_age: Number.parseFloat(point.projected_retirement_age)
            }))
            .filter((point) => Number.isFinite(point.season_start_year) && Number.isFinite(point.projected_retirement_age))
            .sort((left, right) => left.season_start_year - right.season_start_year);

        if (!data.length) return;

        const width = svgEl.clientWidth || 520;
        const height = 290;
        const margin = { top: 14, right: 24, bottom: 68, left: 62 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        svg.attr('viewBox', `0 0 ${width} ${height}`);

        const x = d3
            .scalePoint()
            .domain(data.map((point) => point.season_start))
            .range([0, innerWidth]);

        const yExtent = d3.extent(data, (point) => point.projected_retirement_age);
        const yPadding = Math.max(0.8, (yExtent[1] - yExtent[0]) * 0.22);
        const y = d3
            .scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .nice()
            .range([innerHeight, 0]);

        const chartGroup = svg
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        chartGroup
            .append('g')
            .call(d3.axisLeft(y).ticks(6).tickSize(-innerWidth))
            .call((group) => group.select('.domain').remove())
            .call((group) => group.selectAll('.tick line').attr('stroke', 'var(--border-subtle)').attr('stroke-dasharray', '2,3'))
            .call((group) => group.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '11px'));

        const xAxis = chartGroup
            .append('g')
            .attr('transform', `translate(0, ${innerHeight})`)
            .call(d3.axisBottom(x));
        xAxis.select('.domain').attr('stroke', 'var(--border)');
        xAxis.selectAll('.tick line').attr('stroke', 'var(--border)');
        xAxis.selectAll('.tick text')
            .style('fill', 'var(--text-muted)')
            .attr('font-size', '10px')
            .attr('transform', 'rotate(-42)')
            .style('text-anchor', 'end')
            .attr('dx', '-0.35em')
            .attr('dy', '0.55em');

        const lineGenerator = d3
            .line()
            .x((point) => x(point.season_start))
            .y((point) => y(point.projected_retirement_age))
            .curve(d3.curveMonotoneX);

        chartGroup
            .append('path')
            .datum(data)
            .attr('fill', 'none')
            .attr('stroke', 'var(--accent)')
            .attr('stroke-width', 2.5)
            .attr('stroke-linecap', 'round')
            .attr('stroke-linejoin', 'round')
            .attr('d', lineGenerator);

        chartGroup
            .selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', (point) => x(point.season_start))
            .attr('cy', (point) => y(point.projected_retirement_age))
            .attr('r', 3.4)
            .attr('fill', 'var(--accent)');

        chartGroup
            .append('text')
            .attr('x', innerWidth / 2)
            .attr('y', innerHeight + 52)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text)')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text('Season Start Points');

        chartGroup
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('x', -innerHeight / 2)
            .attr('y', -44)
            .attr('text-anchor', 'middle')
            .attr('fill', 'var(--text-secondary)')
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .text('Projected Age at Retirement');
    }
</script>

<div class="chart-shell">
    <svg bind:this={svgEl} class="chart-svg" role="img" aria-label="Career length trajectory chart"></svg>
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
