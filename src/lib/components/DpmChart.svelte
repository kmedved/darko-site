<script>
    import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';

    let { data = [], color = 'var(--accent)', height = 120 } = $props();

    let svgEl = $state(null);
    let activeStat = $state('dpm');
    let tooltipData = $state(null);

    const stats = [
        { key: 'dpm', label: 'DPM' },
        { key: 'o_dpm', label: 'O-DPM' },
        { key: 'd_dpm', label: 'D-DPM' },
        { key: 'box_dpm', label: 'Box' },
        { key: 'box_odpm', label: 'Box Off' },
        { key: 'box_ddpm', label: 'Box Def' },
    ];

    function fmtDpm(val) {
        if (val === null || val === undefined) return '—';
        const n = parseFloat(val);
        return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
    }

    function fmtDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Stored scales so mousemove can use them without re-rendering
    let scalesRef = $state({ x: null, y: null, margin: null });

    $effect(() => {
        if (!svgEl || data.length === 0) return;
        // Re-read activeStat to make this effect reactive to it
        const _stat = activeStat;
        renderChart();
        return withResizeObserver({ element: svgEl, onResize: renderChart });
    });

    function renderChart() {
        const svg = d3.select(svgEl);
        svg.selectAll('*').remove();

        const width = svgEl.clientWidth;
        const margin = { top: 4, right: 2, bottom: 4, left: 2 };
        const w = width - margin.left - margin.right;
        const h = height - margin.top - margin.bottom;

        const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const accessor = d => parseFloat(d[activeStat]) || 0;

        const x = d3.scaleLinear().domain([0, data.length - 1]).range([0, w]);
        const yExtent = d3.extent(data, accessor);
        const yPad = Math.max(Math.abs(yExtent[1] - yExtent[0]) * 0.15, 0.5);
        const y = d3.scaleLinear()
            .domain([yExtent[0] - yPad, yExtent[1] + yPad])
            .range([h, 0]);

        scalesRef = { x, y, margin };

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
            .y1(d => y(accessor(d)))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(data)
            .attr('class', 'chart-area')
            .attr('d', area)
            .attr('fill', color);

        // Line
        const line = d3.line()
            .x((d, i) => x(i))
            .y(d => y(accessor(d)))
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
            .attr('cy', y(accessor(last)))
            .attr('r', 3)
            .attr('fill', color);

        // Tooltip elements (initially hidden)
        g.append('line')
            .attr('class', 'chart-crosshair')
            .attr('y1', 0).attr('y2', h)
            .style('display', 'none');

        g.append('circle')
            .attr('class', 'chart-hover-dot')
            .attr('r', 4)
            .attr('fill', color)
            .attr('stroke', 'var(--bg-surface)')
            .attr('stroke-width', 2)
            .style('display', 'none');
    }

    function handleMouseMove(e) {
        if (!scalesRef.x || data.length === 0) return;
        const { x, y, margin } = scalesRef;
        const rect = svgEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - margin.left;

        const idx = Math.round(x.invert(mouseX));
        const clamped = Math.max(0, Math.min(data.length - 1, idx));
        const d = data[clamped];

        const accessor = v => parseFloat(v[activeStat]) || 0;
        const val = accessor(d);

        tooltipData = {
            date: d.date,
            value: val,
            px: x(clamped) + margin.left,
            py: y(val) + margin.top,
        };

        // Update crosshair and hover dot
        const svg = d3.select(svgEl);
        svg.select('.chart-crosshair')
            .attr('x1', x(clamped)).attr('x2', x(clamped))
            .style('display', null);
        svg.select('.chart-hover-dot')
            .attr('cx', x(clamped)).attr('cy', y(val))
            .style('display', null);
    }

    function handleMouseLeave() {
        tooltipData = null;
        if (!svgEl) return;
        const svg = d3.select(svgEl);
        svg.select('.chart-crosshair').style('display', 'none');
        svg.select('.chart-hover-dot').style('display', 'none');
    }
</script>

<div class="chart-wrapper">
    <div class="chart-toggles">
        {#each stats as s}
            <button
                class="chart-toggle-btn"
                class:active={activeStat === s.key}
                onclick={() => activeStat = s.key}
            >
                {s.label}
            </button>
        {/each}
    </div>

    <div
        class="chart-container"
        onmousemove={handleMouseMove}
        onmouseleave={handleMouseLeave}
        role="img"
        aria-label="DPM trend chart"
    >
        <svg bind:this={svgEl} {height}></svg>

        {#if tooltipData}
            <div
                class="chart-tooltip"
                style="left: {tooltipData.px}px; top: {tooltipData.py}px;"
            >
                <span class="chart-tooltip-value {tooltipData.value >= 0 ? 'pos' : 'neg'}">
                    {fmtDpm(tooltipData.value)}
                </span>
                <span class="chart-tooltip-date">{fmtDate(tooltipData.date)}</span>
            </div>
        {/if}
    </div>
</div>
