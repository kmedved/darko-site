<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    let { data = [], color = 'var(--accent)', height = 64 } = $props();

    let svgEl = $state(null);

    $effect(() => {
        if (!svgEl || data.length === 0) return;
        renderChart();
    });

    function renderChart() {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const width = svgEl.clientWidth;
        const margin = { top: 4, right: 2, bottom: 4, left: 2 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, w]);
        const yExtent = d3.extent(data, d => d.dpm);
        const yPad = Math.max(Math.abs(yExtent[1] - yExtent[0]) * 0.15, 0.5);
        const y = d3.scaleLinear()
            .domain([yExtent[0] - yPad, yExtent[1] + yPad])
            .range([h, 0]);

        // Zero line
        if (yExtent[0] < 0 && yExtent[1] > 0) {
            g.append('line')
                .attr('class', 'chart-zero')
                .attr('x1', 0).attr('x2', w)
                .attr('y1', y(0)).attr('y2', y(0));
        }

        // Area
        const area = d3.area()
            .x((d, i) => x(i))
            .y0(y(0))
            .y1(d => y(d.dpm))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('class', 'chart-area')
            .attr('d', area)
            .attr('fill', color);

        // Line
        const line = d3.line()
            .x((d, i) => x(i))
            .y(d => y(d.dpm))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('class', 'chart-line')
            .attr('d', line)
            .attr('stroke', color);

        // Endpoint dot
        const last = data[data.length - 1];
        g.append('circle')
            .attr('cx', x(data.length - 1))
            .attr('cy', y(last.dpm))
            .attr('r', 3)
            .attr('fill', color);
    }
</script>

<div class="chart-container">
    <svg bind:this={svgEl} height={height}></svg>
</div>
