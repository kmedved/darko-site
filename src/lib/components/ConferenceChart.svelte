<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    let { standings = [], conference = 'East' } = $props();
    let svgEl = $state(null);

    $effect(() => {
        if (svgEl && standings.length > 0) renderChart();
    });

    function renderChart() {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const sorted = [...standings].sort((a, b) => a.W - b.W);
        const margin = { top: 16, right: 60, bottom: 24, left: 140 };
        const width = svgEl.clientWidth;
        const barHeight = 28;
        const gap = 4;
        const height = sorted.length * (barHeight + gap) + margin.top + margin.bottom;
        svg.attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const x = d3.scaleLinear().domain([0, 70]).range([0, w]);
        const y = d3.scaleBand()
            .domain(sorted.map(d => d.team_name))
            .range([h, 0])
            .padding(0.12);

        const colorScale = d3.scaleLinear()
            .domain([0, 50, 100])
            .range(['#f87171', '#fbbf24', '#34d399']);

        g.selectAll('rect')
            .data(sorted)
            .join('rect')
            .attr('x', 0)
            .attr('y', d => y(d.team_name))
            .attr('width', d => x(d.W))
            .attr('height', y.bandwidth())
            .attr('rx', 3)
            .attr('fill', d => colorScale(d.Playoffs));

        // Team names
        g.selectAll('.team-label')
            .data(sorted)
            .join('text')
            .attr('class', 'team-label')
            .attr('x', -8)
            .attr('y', d => y(d.team_name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('fill', '#e4e4ec')
            .attr('font-size', '12px')
            .attr('font-family', "'DM Sans', sans-serif")
            .text(d => d.team_name);

        // Win count + playoff %
        g.selectAll('.win-label')
            .data(sorted)
            .join('text')
            .attr('class', 'win-label')
            .attr('x', d => x(d.W) + 6)
            .attr('y', d => y(d.team_name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('fill', '#8b8ca0')
            .attr('font-size', '11px')
            .attr('font-family', "'DM Mono', monospace")
            .text(d => `${d.W.toFixed(0)}W  ${d.Playoffs.toFixed(0)}%`);

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).ticks(7).tickSize(-h).tickFormat(d => d))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').attr('stroke', '#232430').attr('stroke-dasharray', '2,3'))
            .call(g => g.selectAll('.tick text').attr('fill', '#505168').attr('font-size', '10px'));
    }
</script>

<div style="width: 100%;">
    <svg bind:this={svgEl} width="100%" height="500" style="overflow: visible;"></svg>
</div>
