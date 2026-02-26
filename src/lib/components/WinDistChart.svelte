<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    let { data = [], meanWins = 0, currentWins = 0 } = $props();
    let svgEl = $state(null);

    $effect(() => {
        if (svgEl && data.length > 0) renderChart();
    });

    function renderChart() {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const width = svgEl.clientWidth;
        const height = 200;
        svg.attr('height', height);

        const margin = { top: 12, right: 16, bottom: 32, left: 40 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(data.map(d => d.wins))
            .range([0, w])
            .padding(0.15);

        const maxProb = d3.max(data, d => d.prob * 100);
        const y = d3.scaleLinear().domain([0, maxProb * 1.1]).range([h, 0]);

        // Bars
        g.selectAll('rect')
            .data(data)
            .join('rect')
            .attr('x', d => x(d.wins))
            .attr('y', d => y(d.prob * 100))
            .attr('width', x.bandwidth())
            .attr('height', d => h - y(d.prob * 100))
            .attr('rx', 1.5)
            .attr('fill', '#5b8def')
            .attr('opacity', 0.7);

        // Mean wins line
        const meanX = x(Math.round(meanWins));
        if (meanX !== undefined) {
            g.append('line')
                .attr('x1', meanX + x.bandwidth() / 2)
                .attr('x2', meanX + x.bandwidth() / 2)
                .attr('y1', 0).attr('y2', h)
                .attr('stroke', '#f87171')
                .attr('stroke-width', 2)
                .attr('stroke-dasharray', '6,3');

            g.append('text')
                .attr('x', meanX + x.bandwidth() / 2 + 6)
                .attr('y', 10)
                .attr('fill', '#f87171')
                .attr('font-size', '11px')
                .attr('font-family', "'DM Mono', monospace")
                .text(`Proj: ${meanWins.toFixed(1)}`);
        }

        // Current wins line
        if (currentWins > 0) {
            const curX = x(currentWins);
            if (curX !== undefined) {
                g.append('line')
                    .attr('x1', curX + x.bandwidth() / 2)
                    .attr('x2', curX + x.bandwidth() / 2)
                    .attr('y1', 0).attr('y2', h)
                    .attr('stroke', '#34d399')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,3');

                g.append('text')
                    .attr('x', curX + x.bandwidth() / 2 + 6)
                    .attr('y', 24)
                    .attr('fill', '#34d399')
                    .attr('font-size', '11px')
                    .attr('font-family', "'DM Mono', monospace")
                    .text(`Now: ${currentWins}`);
            }
        }

        // X axis
        const tickEvery = data.length > 30 ? 5 : data.length > 15 ? 2 : 1;
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).tickValues(data.filter((_, i) => i % tickEvery === 0).map(d => d.wins)))
            .call(g => g.select('.domain').attr('stroke', '#232430'))
            .call(g => g.selectAll('.tick line').attr('stroke', '#232430'))
            .call(g => g.selectAll('.tick text').attr('fill', '#8b8ca0').attr('font-size', '10px'));

        // Y axis
        g.append('g')
            .call(d3.axisLeft(y).ticks(4).tickFormat(d => d.toFixed(0) + '%'))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').attr('stroke', '#232430').attr('stroke-dasharray', '2,3').attr('x2', w))
            .call(g => g.selectAll('.tick text').attr('fill', '#505168').attr('font-size', '10px'));
    }
</script>

<div style="width: 100%;">
    <svg bind:this={svgEl} width="100%" height="200" style="overflow: visible;"></svg>
</div>
