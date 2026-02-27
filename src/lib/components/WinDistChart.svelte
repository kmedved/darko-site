<script>
    import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';

    let { data = [], meanWins = 0, currentWins = 0 } = $props();
    let svgEl = $state(null);
    

    function toChartData(rawRows) {
        return (rawRows || [])
            .map((row) => ({
                wins: Number.parseFloat(row.wins),
                prob: Number.parseFloat(row.prob)
            }))
            .filter((point) => Number.isFinite(point.wins) && Number.isFinite(point.prob));
    }

    function clearChart() {
        if (!svgEl) return;
        d3.select(svgEl).selectAll('*').remove();
    }

    $effect(() => {
        if (!svgEl) return;
        if (!data || data.length === 0) {
            d3.select(svgEl).selectAll('*').remove();
            return;
        }

        const _chartData = toChartData(data);
        if (!_chartData.length) {
            d3.select(svgEl).selectAll('*').remove();
            return;
        }

        renderChart();
        return withResizeObserver({ element: svgEl, onResize: renderChart });
    });

    function renderChart() {
        const chartData = toChartData(data);
        if (!chartData.length) {
            clearChart();
            return;
        }

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const width = svgEl.clientWidth;
        if (!width) return;

        const height = 200;
        svg.attr('height', height);

        const margin = { top: 12, right: 16, bottom: 32, left: 40 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;
        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand()
            .domain(chartData.map(d => d.wins))
            .range([0, w])
            .padding(0.15);

        const maxProb = d3.max(chartData, d => d.prob * 100);
        const y = d3.scaleLinear().domain([0, maxProb * 1.1]).range([h, 0]);

        // Bars
        g.selectAll('rect')
            .data(chartData)
            .join('rect')
            .attr('x', d => x(d.wins))
            .attr('y', d => y(d.prob * 100))
            .attr('width', x.bandwidth())
            .attr('height', d => h - y(d.prob * 100))
            .attr('rx', 1.5)
            .style('fill', 'var(--accent)')
            .attr('opacity', 0.7);

        // Mean wins line
        const parsedMeanWins = Number.parseFloat(meanWins);
        if (Number.isFinite(parsedMeanWins)) {
            const meanX = x(Math.round(parsedMeanWins));
            if (meanX !== undefined) {
                g.append('line')
                    .attr('x1', meanX + x.bandwidth() / 2)
                    .attr('x2', meanX + x.bandwidth() / 2)
                    .attr('y1', 0).attr('y2', h)
                    .style('stroke', 'var(--negative)')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,3');

                g.append('text')
                    .attr('x', meanX + x.bandwidth() / 2 + 6)
                    .attr('y', 10)
                    .style('fill', 'var(--negative)')
                    .attr('font-size', '11px')
                    .attr('font-family', 'var(--font-mono)')
                    .text(`Proj: ${parsedMeanWins.toFixed(1)}`);
            }
        }

        // Current wins line
        const parsedCurrentWins = Number.parseFloat(currentWins);
        if (parsedCurrentWins > 0) {
            const curX = x(parsedCurrentWins);
            if (curX !== undefined) {
                g.append('line')
                    .attr('x1', curX + x.bandwidth() / 2)
                    .attr('x2', curX + x.bandwidth() / 2)
                    .attr('y1', 0).attr('y2', h)
                    .style('stroke', 'var(--positive)')
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', '6,3');

                g.append('text')
                    .attr('x', curX + x.bandwidth() / 2 + 6)
                    .attr('y', 24)
                    .style('fill', 'var(--positive)')
                    .attr('font-size', '11px')
                    .attr('font-family', 'var(--font-mono)')
                    .text(`Now: ${parsedCurrentWins}`);
            }
        }

        // X axis
        const tickEvery = chartData.length > 30 ? 5 : chartData.length > 15 ? 2 : 1;
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).tickValues(chartData.filter((_, i) => i % tickEvery === 0).map(d => d.wins)))
            .call(g => g.select('.domain').style('stroke', 'var(--border)'))
            .call(g => g.selectAll('.tick line').style('stroke', 'var(--border)'))
            .call(g => g.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '10px'));

        // Y axis
        g.append('g')
            .call(d3.axisLeft(y).ticks(4).tickFormat(d => d.toFixed(0) + '%'))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').style('stroke', 'var(--border)').attr('stroke-dasharray', '2,3').attr('x2', w))
            .call(g => g.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '10px'));
    }
</script>

<div style="width: 100%;">
    <svg bind:this={svgEl} width="100%" height="200" style="overflow: visible;"></svg>
</div>
