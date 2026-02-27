<script>
    import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';

    let { standings = [], sortMetric = 'W' } = $props();
    let svgEl = $state(null);

    function getMetricValue(team) {
        const value = team?.[sortMetric];

        if (value === null || value === undefined) return null;
        if (sortMetric === 'W' && typeof value === 'string') {
            const parsed = parseFloat(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        const parsed = typeof value === 'string' ? parseFloat(value.replace(/%/g, '')) : parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function getMetricLabel(value) {
        if (value === null || value === undefined) return '—';
        const n = parseFloat(value);
        if (!Number.isFinite(n)) return '—';
        if (sortMetric === 'W') return `${n.toFixed(0)}W`;
        if (sortMetric === 'SRS') return n.toFixed(2);
        if (sortMetric === 'ExpPick') return n.toFixed(1);
        if (sortMetric === 'Lottery%' || sortMetric === 'Playoffs' || sortMetric === 'Win Conf' || sortMetric === 'Win Finals') return `${n.toFixed(0)}%`;
        return n.toFixed(1);
    }

    $effect(() => {
        if (!svgEl) return;
        if (!standings || standings.length === 0) {
            d3.select(svgEl).selectAll('*').remove();
            return;
        }

        const _sortMetric = sortMetric;
        void _sortMetric;
        renderChart();
        return withResizeObserver({ element: svgEl, onResize: renderChart });
    });
    function renderChart() {
		if (!svgEl) return;
		const sorted = [...standings].sort((a, b) => {
            const aVal = getMetricValue(a);
            const bVal = getMetricValue(b);
            if (aVal === null && bVal === null) return 0;
            if (aVal === null) return 1;
            if (bVal === null) return -1;
            return bVal - aVal;
        });

        const metricValues = sorted
            .map(getMetricValue)
            .filter((value) => value !== null);
        const minVal = metricValues.length ? d3.min(metricValues) : 0;
        const maxVal = metricValues.length ? d3.max(metricValues) : 0;
        const pad = Math.max((maxVal - minVal) * 0.06, 1);
        const domainMin = Math.min(0, minVal - pad);
        const domainMax = Math.max(0, maxVal + pad);

        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const margin = { top: 16, right: 60, bottom: 24, left: 140 };
        const width = svgEl.clientWidth;
        if (!width) return;

        const barHeight = 28;
        const gap = 4;
        const height = sorted.length * (barHeight + gap) + margin.top + margin.bottom;
        svg.attr('height', height);

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const x = d3.scaleLinear().domain([domainMin, domainMax]).range([0, w]).nice();
        const x0 = x(0);
        const y = d3.scaleBand()
            .domain(sorted.map(d => d.team_name))
            .range([0, h])
            .padding(0.12);

        g.selectAll('rect')
            .data(sorted)
            .join('rect')
            .attr('x', d => {
                const metric = getMetricValue(d);
                if (metric === null) return x0;
                return Math.min(x0, x(metric));
            })
            .attr('y', d => y(d.team_name))
            .attr('width', d => {
                const metric = getMetricValue(d);
                if (metric === null) return 0;
                return Math.abs(x(metric) - x0);
            })
            .attr('height', y.bandwidth())
            .attr('rx', 3)
            .style('fill', d => {
                const playoff = parseFloat(d.Playoffs);
                if (!Number.isFinite(playoff)) return 'var(--text-muted)';
                if (playoff >= 66) return 'var(--positive)';
                if (playoff >= 33) return 'var(--accent)';
                return 'var(--negative)';
            });

        // Team names
        g.selectAll('.team-label')
            .data(sorted)
            .join('text')
            .attr('class', 'team-label')
            .attr('x', -8)
            .attr('y', d => y(d.team_name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .style('fill', 'var(--text)')
            .attr('font-size', '12px')
            .attr('font-family', 'var(--font-sans)')
            .text(d => d.team_name);

        // Win count + playoff %
        g.selectAll('.win-label')
            .data(sorted)
            .join('text')
            .attr('class', 'win-label')
            .attr('x', d => {
                const metric = getMetricValue(d) ?? 0;
                return metric >= 0 ? x(metric) + 6 : x(metric) - 6;
            })
            .attr('y', d => y(d.team_name) + y.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('fill', 'var(--text-muted)')
            .attr('font-size', '11px')
            .attr('font-family', 'var(--font-mono)')
            .attr('text-anchor', d => {
                const metric = getMetricValue(d) ?? 0;
                return metric >= 0 ? 'start' : 'end';
            })
            .text(d => `${getMetricLabel(getMetricValue(d))}`);

        // X axis
        g.append('g')
            .attr('transform', `translate(0,${h})`)
            .call(d3.axisBottom(x).ticks(7).tickSize(-h).tickFormat(d => d))
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').attr('stroke', 'var(--border-subtle)').attr('stroke-dasharray', '2,3'))
            .call(g => g.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '10px'));
    }
</script>

<div style="width: 100%;">
    <svg bind:this={svgEl} width="100%" height="500" style="overflow: visible;"></svg>
</div>
