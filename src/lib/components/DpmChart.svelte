<script>
    import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
    import { getMetricDisplayLabel } from '$lib/utils/csvPresets.js';

	let { data = [], color = 'var(--accent)', height = 120 } = $props();

	let containerEl = $state(null);
	let svgEl = $state(null);
	let activeStat = $state('dpm');
	let tooltipData = $state(null);
	let chartPoints = $state([]);
	const indexBisector = d3.bisector((point) => point.index).left;

    const stats = [
        { key: 'dpm', label: getMetricDisplayLabel('dpm') },
        { key: 'o_dpm', label: getMetricDisplayLabel('o_dpm') },
        { key: 'd_dpm', label: getMetricDisplayLabel('d_dpm') },
        { key: 'box_dpm', label: getMetricDisplayLabel('box_dpm') },
        { key: 'box_odpm', label: getMetricDisplayLabel('box_odpm') },
        { key: 'box_ddpm', label: getMetricDisplayLabel('box_ddpm') },
        { key: 'on_off_dpm', label: getMetricDisplayLabel('on_off_dpm') },
        { key: 'bayes_rapm_total', label: getMetricDisplayLabel('bayes_rapm_total') },
        { key: 'x_pts_100', label: getMetricDisplayLabel('x_pts_100') },
        { key: 'x_ast_100', label: getMetricDisplayLabel('x_ast_100') }
    ];

    function fmtDpm(val) {
        if (val === null || val === undefined) return '—';
        const n = parseFloat(val);
        if (!Number.isFinite(n)) return '—';
        if (activeStat === 'x_fg_pct' || activeStat === 'x_fg3_pct' || activeStat === 'x_ft_pct') {
            return `${(n * 100).toFixed(1)}%`;
        }
        if (
            activeStat === 'dpm' ||
            activeStat === 'o_dpm' ||
            activeStat === 'd_dpm' ||
            activeStat === 'box_dpm' ||
            activeStat === 'box_odpm' ||
            activeStat === 'box_ddpm' ||
            activeStat === 'on_off_dpm' ||
            activeStat === 'on_off_odpm' ||
            activeStat === 'on_off_ddpm' ||
            activeStat === 'bayes_rapm_total' ||
            activeStat === 'bayes_rapm_off' ||
            activeStat === 'bayes_rapm_def'
        ) {
            return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
        }
        return n.toFixed(1);
    }

    function fmtDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Stored scales so mousemove can use them without re-rendering
    let scalesRef = $state({ x: null, y: null, margin: null });

	function getMetricValue(row) {
		const n = Number.parseFloat(row?.[activeStat]);
		return Number.isFinite(n) ? n : null;
	}

	function clamp(value, min, max) {
		if (!Number.isFinite(value)) return min;
		return Math.min(Math.max(value, min), max);
	}

    $effect(() => {
        if (!svgEl || data.length === 0) {
            if (svgEl) d3.select(svgEl).selectAll('*').remove();
            tooltipData = null;
            chartPoints = [];
            scalesRef = { x: null, y: null, margin: null };
            return;
        }
        // Re-read activeStat to make this effect reactive to it
        void activeStat;
        void data;
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

        const points = data
            .map((row, index) => {
                const value = getMetricValue(row);
                if (value === null) return null;
                return { row, index, value };
            })
            .filter((point) => point !== null);

        if (points.length === 0) {
            tooltipData = null;
            chartPoints = [];
            scalesRef = { x: null, y: null, margin: null };
            return;
        }

        chartPoints = points;

        const x = d3.scaleLinear().domain([0, Math.max(data.length - 1, 0)]).range([0, w]);
        const yExtent = d3.extent(points, (point) => point.value);
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
            .x((point) => x(point.index))
            .y0(y(0))
            .y1((point) => y(point.value))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(points)
            .attr('class', 'chart-area')
            .attr('d', area)
            .attr('fill', color);

        // Line
        const line = d3.line()
            .x((point) => x(point.index))
            .y((point) => y(point.value))
            .curve(d3.curveMonotoneX);

        g.append('path')
            .datum(points)
            .attr('class', 'chart-line')
            .attr('d', line)
            .attr('stroke', color);

        // Endpoint dot
        const last = points[points.length - 1];
        g.append('circle')
            .attr('cx', x(last.index))
            .attr('cy', y(last.value))
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
		if (!scalesRef.x || chartPoints.length === 0 || !svgEl || !containerEl) return;
		const { x, y, margin } = scalesRef;
		const svgRect = svgEl.getBoundingClientRect();
		const containerRect = containerEl.getBoundingClientRect();
		const mouseX = e.clientX - svgRect.left - margin.left;

		const hoveredIndex = x.invert(mouseX);
        const insertion = indexBisector(chartPoints, hoveredIndex);
        const prev = chartPoints[Math.max(0, insertion - 1)];
        const next = chartPoints[Math.min(chartPoints.length - 1, insertion)];
        const point = !prev ? next
            : !next ? prev
            : Math.abs(prev.index - hoveredIndex) <= Math.abs(next.index - hoveredIndex) ? prev : next;
		if (!point) return;

		const rawX = svgRect.left - containerRect.left + x(point.index) + margin.left;
		const rawY = svgRect.top - containerRect.top + y(point.value) + margin.top;
		const tooltipX = clamp(rawX, 16, Math.max(16, containerRect.width - 16));
		const tooltipY = clamp(rawY, 16, Math.max(16, containerRect.height - 8));

		tooltipData = {
			date: point.row.date,
			value: point.value,
			px: tooltipX,
			py: tooltipY
		};

        // Update crosshair and hover dot
        const svg = d3.select(svgEl);
        svg.select('.chart-crosshair')
            .attr('x1', x(point.index)).attr('x2', x(point.index))
            .style('display', null);
        svg.select('.chart-hover-dot')
            .attr('cx', x(point.index)).attr('cy', y(point.value))
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
                type="button"
                class="chart-toggle-btn"
                class:active={activeStat === s.key}
                onclick={() => activeStat = s.key}
            >
                {s.label}
            </button>
        {/each}
    </div>

	<div
		bind:this={containerEl}
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
