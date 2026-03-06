<script>
    import * as d3 from 'd3';
	import { withResizeObserver } from '$lib/utils/chartResizeObserver.js';
    import ChartDownloadMenu from '$lib/components/ChartDownloadMenu.svelte';

    let { team = {}, teamName = '' } = $props();
    let chartRootEl = $state(null);
    let svgEl = $state(null);
    const exportFilenameBase = $derived(teamName ? `${teamName}-seed-probabilities` : 'team-seed-probabilities');
    

    function clearChart() {
        if (!svgEl) return;
        d3.select(svgEl).selectAll('*').remove();
    }


    $effect(() => {
        if (!svgEl || !chartRootEl) return;

        if (!team || Object.keys(team).length === 0) {
            d3.select(svgEl).selectAll('*').remove();
            return;
        }

        renderChart();
        return withResizeObserver({ element: chartRootEl, onResize: renderChart });
    });

	function renderChart() {
		if (!svgEl) return;

		const seeds = [];
		for (let s = 1; s <= 10; s++) {
			const key = `seed_${s}`;
			const prob = parseFloat(team[key]);
			seeds.push({ seed: s, prob: Number.isFinite(prob) ? prob : 0 });
		}

		const width = chartRootEl?.clientWidth ?? 0;
		if (!width) return clearChart();
		const height = 160;
		const svg = d3.select(svgEl);
		svg.attr('height', height);
		svg.selectAll('*').remove();

		const margin = { top: 12, right: 16, bottom: 28, left: 40 };
		const w = width - margin.left - margin.right;
		const h = height - margin.top - margin.bottom;
		const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

		const x = d3
			.scaleBand()
			.domain(seeds.map((d) => d.seed))
			.range([0, w])
			.padding(0.2);
		const maxP = Math.max(d3.max(seeds, (d) => d.prob), 1);
		const y = d3.scaleLinear().domain([0, maxP * 1.15]).range([h, 0]);

		g.selectAll('rect')
			.data(seeds)
			.join('rect')
			.attr('x', (d) => x(d.seed))
			.attr('y', (d) => y(d.prob))
			.attr('width', x.bandwidth())
			.attr('height', (d) => h - y(d.prob))
			.attr('rx', 2)
			.style('fill', (d) => {
				if (d.prob >= 66) return 'var(--positive)';
				if (d.prob >= 33) return 'var(--accent)';
				return 'var(--negative)';
			});

        // Labels on bars
		g.selectAll('.bar-label')
			.data(seeds.filter((d) => d.prob > 0))
			.join('text')
			.attr('x', (d) => x(d.seed) + x.bandwidth() / 2)
			.attr('y', (d) => y(d.prob) - 4)
			.attr('text-anchor', 'middle')
			.style('fill', 'var(--text-muted)')
			.attr('font-size', '10px')
			.attr('font-family', 'var(--font-mono)')
			.text((d) => (d.prob >= 1 ? d.prob.toFixed(0) + '%' : '<1%'));

		g.append('g')
			.attr('transform', `translate(0,${h})`)
			.call(d3.axisBottom(x).tickFormat((d) => `#${d}`))
			.call((g) => g.select('.domain').style('stroke', 'var(--border)'))
			.call((g) => g.selectAll('.tick line').remove())
			.call((g) =>
				g.selectAll('.tick text').style('fill', 'var(--text-muted)').attr('font-size', '10px')
			);
	}
</script>

<div class="chart-download-shell" bind:this={chartRootEl}>
    <div class="chart-download-toolbar">
        <ChartDownloadMenu
            {svgEl}
            captureRootEl={chartRootEl}
            filenameBase={exportFilenameBase}
        />
    </div>
    <div class="seed-chart-shell">
        <svg bind:this={svgEl} width="100%" height="160" style="overflow: visible;"></svg>
    </div>
</div>

<style>
    .seed-chart-shell {
        width: 100%;
    }
</style>
