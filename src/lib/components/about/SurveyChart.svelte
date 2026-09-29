<script>
	// HoopsHype's 2021 survey of all-in-one metrics, in its order: to the right, the respondents who
	// named each metric their preferred one and those who trusted it; to the left, those who did not.
	import { HOOPSHYPE_SURVEY } from '$lib/utils/aboutDarko.js';

	const survey = HOOPSHYPE_SURVEY;
	const SCALE = 24;
	// Each side is half the row; 24 respondents fill it.
	const pct = (count) => `${(Math.max(0, count ?? 0) / SCALE) * 100}%`;
</script>

<figure class="survey">
	<div class="survey-legend" aria-hidden="true">
		<span><i class="distrust"></i>Don't trust</span>
		<span><i class="preferred"></i>Preferred</span>
		<span><i class="trust"></i>Trust</span>
	</div>
	<ol class="survey-rows">
		{#each survey.metrics as metric, index (metric.key)}
			<li class:ours={metric.key === 'dpm'}>
				<span class="survey-name">{index + 1}. {metric.name}</span>
				<span class="survey-bars">
					<span class="left">
						{#if metric.distrust}<i class="distrust" style:width={pct(metric.distrust)}><b>{metric.distrust}</b></i>{/if}
					</span>
					<span class="right">
						{#if metric.preferred}<i class="preferred" style:width={pct(metric.preferred)}><b>{metric.preferred}</b></i>{/if}
						{#if metric.trust}<i class="trust" style:width={pct(metric.trust)}><b>{metric.trust}</b></i>{/if}
					</span>
				</span>
				<span class="sr-only">
					{metric.preferred} preferred{metric.trust === null ? '' : `, ${metric.trust} trust`}, {metric.distrust} don't trust
				</span>
			</li>
		{/each}
	</ol>
	<figcaption>
		The {survey.respondents} respondents to
		<a href={survey.url}>HoopsHype's survey</a> ({survey.author}, September 17, 2021), ranked by
		HoopsHype from most trusted. It reported no "trust" count for the last four.
	</figcaption>
</figure>

<style>
	.survey {
		margin: 24px 0 30px;
		padding: 18px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.survey-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 16px;
		margin-bottom: 12px;
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 700;
	}

	.survey-legend span {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}

	.survey-legend i {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}

	.survey-rows {
		display: grid;
		gap: 5px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.survey-rows li {
		display: grid;
		grid-template-columns: 7.5em minmax(0, 1fr);
		align-items: center;
		gap: 10px;
		min-height: 24px;
	}

	.survey-name {
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 700;
	}

	.ours .survey-name {
		color: var(--text);
		font-weight: 850;
	}

	.survey-bars {
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: 20px;
	}

	.survey-bars .left {
		display: flex;
		justify-content: flex-end;
		border-right: 1px solid var(--border);
	}

	.survey-bars .right {
		display: flex;
	}

	.survey-bars i,
	.survey-legend i {
		font-style: normal;
	}

	.survey-bars i {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 0;
		height: 100%;
		overflow: hidden;
		white-space: nowrap;
	}

	.survey-bars b {
		font-family: var(--font-mono);
		font-size: 11px;
		font-weight: var(--figure-weight-strong);
	}

	.distrust {
		background: color-mix(in srgb, var(--negative) 55%, transparent);
		color: var(--text);
	}

	.preferred {
		background: var(--accent);
		color: #fff;
	}

	.trust {
		background: color-mix(in srgb, var(--accent) 30%, transparent);
		color: var(--text);
	}

	.survey-bars .left i {
		border-radius: 3px 0 0 3px;
	}

	.survey-bars .right i:last-child {
		border-radius: 0 3px 3px 0;
	}

	.ours .survey-bars {
		outline: 2px solid color-mix(in srgb, var(--accent) 35%, transparent);
		outline-offset: 2px;
		border-radius: 3px;
	}

	figcaption {
		margin-top: 12px;
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.5;
	}

	figcaption a {
		color: var(--accent);
	}
</style>
