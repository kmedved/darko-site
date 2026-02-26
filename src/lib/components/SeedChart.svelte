<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    let { team = {} } = $props();
    let svgEl = $state(null);

    $effect(() => {
        if (svgEl && team) renderChart();
    });

    function renderChart() {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const seeds = [];
        for (let s = 1; s <= 10; s++) {
            const key = `seed_${s}`;
            seeds.push({ seed: s, prob: parseFloat(team[key]) || 0 });
        }

        const width = svgEl.clientWidth;
        const height = 160;
        svg.attr('height', height);

        const margin = { top: 12, right: 16, bottom: 28, left: 40 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().domain(seeds.map(d => d.seed)).range([0, w]).padding(0.2);
        const maxP = Math.max(d3.max(seeds, d => d.prob), 1);
        const y = d3.scaleLinear().domain([0, maxP * 1.15]).range([h, 0]);

        const colorScale = d3.scaleLinear()
            .domain([0, maxP])
            .range(['#232430', '#5b8def']);

        g.selectAll('rect')
            .data(seeds)
            .join('rect')
            .attr('x', d => x(d.seed))
            .attr('y', d => y(d.prob))
            .attr('width', x.bandwidth())
            .attr('height', d => h - y(d.prob))
            .attr('rx', 2)
            .attr('fill', d => colorScale(d.prob));

        // Labels on bars
        g.selectAll('.bar-label')
            .data(seeds.filter(d => d.prob > 0))
            .join('text')
            .attr('x', d => x(d.seed) + x.bandwidth() / 2)
            .attr('y', d => y(d.prob) - 4)
            .attr('text-anchor', 'middle')
            .attr('fill', '#8b8ca0')
            .attr('font-size', '10px')
            .attr('font-family', "'DM Mono', monospace")
            .text(d => d.prob >= 1 ? d.prob.toFixed(0) + '%' : '<1%');

        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).tickFormat(d => '#' + d))
            .call(g => g.select('.domain').attr('stroke', '#232430'))
            .call(g => g.selectAll('.tick line').remove())
            .call(g => g.selectAll('.tick text').attr('fill', '#8b8ca0').attr('font-size', '10px'));
    }
</script>

<div style="width: 100%;">
    <svg bind:this={svgEl} width="100%" height="160" style="overflow: visible;"></svg>
</div>
