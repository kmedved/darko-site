<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import LongevityCareerLengthChart from '$lib/components/LongevityCareerLengthChart.svelte';
	import OffenseDefenseBar from '$lib/components/OffenseDefenseBar.svelte';
	import OffenseDefenseGlyph from '$lib/components/OffenseDefenseGlyph.svelte';
	import OffenseDefenseSplit from '$lib/components/OffenseDefenseSplit.svelte';
	import SeismographChart from '$lib/components/SeismographChart.svelte';
	import TalentPercentilesChart from '$lib/components/TalentPercentilesChart.svelte';
	import TalentTrendChart from '$lib/components/TalentTrendChart.svelte';
	import { apiActivePlayers } from '$lib/api.js';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
	import {
		buildSeismograph,
		formatGameDate,
		formatSigned,
		getSeismographSeasons,
		seasonLabel
	} from '$lib/utils/seismograph.js';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { unpackRows } from '$lib/utils/columnar.js';
	import { AS_OF_PARAM, formatAsOfDate, parseAsOfDate } from '$lib/utils/timeMachine.js';
	import { seasonOfRow } from '$lib/utils/seismograph.js';

	let { data } = $props();

	const TALENT_OPTIONS = [
		{ value: 'dpm', label: 'DPM' },
		{ value: 'o_dpm', label: 'O-DPM' },
		{ value: 'd_dpm', label: 'D-DPM' },
		{ value: 'box_dpm', label: 'Box DPM' },
		{ value: 'box_odpm', label: 'Box O-DPM' },
		{ value: 'box_ddpm', label: 'Box D-DPM' },
		{ value: 'on_off_dpm', label: 'On/Off DPM' },
		{ value: 'bayes_rapm_total', label: 'RAPM' },
		{ value: 'x_pts_100', label: 'Pts per 100' },
		{ value: 'x_ast_100', label: 'Ast per 100' },
		{ value: 'x_minutes', label: 'MPG' },
		{ value: 'x_pace', label: 'Pace' },
		{ value: 'x_fg_pct', label: 'FG%' },
		{ value: 'x_fg3_pct', label: '3P%' },
		{ value: 'x_ft_pct', label: 'FT%' },
		{ value: 'sal_market_fixed', label: 'Fair Salary' }
	];

	const PERCENTILE_OPTIONS = [
		{ value: 'dpm', label: 'DPM' },
		{ value: 'o_dpm', label: 'O-DPM' },
		{ value: 'd_dpm', label: 'D-DPM' },
		{ value: 'on_off_dpm', label: 'On/Off DPM' },
		{ value: 'bayes_rapm_total', label: 'RAPM' },
		{ value: 'x_pts_100', label: 'Pts per 100' },
		{ value: 'x_ast_100', label: 'Ast per 100' },
		{ value: 'x_fg_pct', label: 'FG%' },
		{ value: 'x_fg3_pct', label: '3P%' },
		{ value: 'x_ft_pct', label: 'FT%' },
		{ value: 'tr_fg3_pct', label: '3P% (trend)' },
		{ value: 'tr_ft_pct', label: 'FT% (trend)' }
	];

	let allActivePlayers = $state([]);
	let percentilesLoading = $state(true);
	let percentileNotice = $state(null);
	let talentType = $state('dpm');
	let selectedPercentileMetrics = $state(['dpm', 'o_dpm', 'd_dpm', 'x_pts_100', 'x_fg3_pct']);
	let imgFailed = $state(false);
	let pickedSeason = $state(null);
	let showGameLog = $state(false);
	const loadSeq = createRequestSequencer();

	const nbaId = $derived(data.nbaId ?? data.playerInfo?.nba_id ?? null);
	const playerInfo = $derived(data.playerInfo ?? null);
	const historyRows = $derived(data.history ? unpackRows(data.history) : (data.historyRows ?? []));
	const historyMeta = $derived(data.historyMeta ?? { truncated: false, maxRows: null });

	// With the Time Machine set, the sidebar rating and the Seismograph follow that date.
	const asOfDate = $derived(parseAsOfDate($page.url.searchParams.get(AS_OF_PARAM)));
	const asOfRow = $derived.by(() => {
		if (!asOfDate) return null;
		let latest = null;
		for (const row of historyRows) {
			const date = typeof row?.date === 'string' ? row.date.slice(0, 10) : null;
			if (date && date <= asOfDate && Number(row.tm_id) > 0) latest = row;
		}
		return latest;
	});
	const ratingRow = $derived(asOfDate ? asOfRow : playerInfo);

	const playerRating = $derived.by(() => {
		const dpm = Number.parseFloat(ratingRow?.dpm);
		const offense = Number.parseFloat(ratingRow?.o_dpm);
		let defense = Number.parseFloat(ratingRow?.d_dpm);
		if (!Number.isFinite(defense)) defense = dpm - offense;
		return [dpm, offense, defense].every(Number.isFinite) ? { dpm, offense, defense } : null;
	});

	// A picked season sticks only for the player it was picked on.
	const seismographSeasons = $derived(getSeismographSeasons(historyRows));
	const asOfSeason = $derived(asOfRow ? seasonOfRow(asOfRow) : null);
	const seismographSeason = $derived(
		pickedSeason?.nbaId === nbaId && seismographSeasons.includes(pickedSeason.season)
			? pickedSeason.season
			: seismographSeasons.includes(asOfSeason)
				? asOfSeason
				: (seismographSeasons[0] ?? null)
	);
	const seismograph = $derived(
		seismographSeason === null ? null : buildSeismograph(historyRows, seismographSeason)
	);
	const seismographSummary = $derived(seismograph?.summary ?? null);
	const gameLog = $derived((seismograph?.points ?? []).filter((point) => point.played).reverse());
	const SEASON_END_LABELS = { upcoming: 'now', final: 'before the last game', dnp: 'at the end' };

	function pickSeismographSeason(value) {
		const season = Number.parseInt(value, 10);
		if (Number.isInteger(season)) pickedSeason = { nbaId, season };
	}

	function gameLabel(point) {
		const opponent = point.opponent ? ` vs ${point.opponent}` : '';
		return `${formatGameDate(point.date)}${opponent} · ${Math.round(point.minutes)} min`;
	}

	function getInitials(name) {
		if (!name) return '?';
		return name
			.split(/\s+/)
			.map((word) => word[0])
			.filter(Boolean)
			.slice(0, 2)
			.join('')
			.toUpperCase();
	}

	const percentiles = $derived.by(() => {
		if (!playerInfo || allActivePlayers.length === 0) return [];

		const position = playerInfo.position;
		const positionPlayers = position
			? allActivePlayers.filter((player) => player.position === position)
			: allActivePlayers;

		if (positionPlayers.length === 0) return [];

		return selectedPercentileMetrics.map((metric) => {
			const playerValue = Number.parseFloat(playerInfo[metric]);
			if (Number.isNaN(playerValue)) return { metric, value: 0 };

			const values = positionPlayers
				.map((player) => Number.parseFloat(player[metric]))
				.filter((value) => !Number.isNaN(value));

			if (values.length === 0) return { metric, value: 0 };

			const below = values.filter((value) => value < playerValue).length;
			return {
				metric,
				value: Math.round((below / values.length) * 100)
			};
		});
	});

	const currentDate = $derived.by(() => {
		if (!playerInfo?.date) return '';
		const dateOnly = playerInfo.date.includes('T')
			? playerInfo.date.split('T')[0]
			: playerInfo.date;
		const d = new Date(dateOnly + 'T00:00:00');
		return Number.isNaN(d.getTime())
			? dateOnly
			: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	});

	$effect(() => {
		void playerInfo;
		imgFailed = false;
	});

	async function loadActivePlayersWithRetry() {
		try {
			return await apiActivePlayers({ view: 'percentiles' });
		} catch {
			return await apiActivePlayers({ view: 'percentiles' });
		}
	}

	$effect(() => {
		if (!playerInfo?.nba_id) {
			allActivePlayers = [];
			percentileNotice = null;
			percentilesLoading = false;
			return;
		}

		const reqId = loadSeq.next();
		allActivePlayers = [];
		percentilesLoading = true;
		percentileNotice = null;

		loadActivePlayersWithRetry()
			.then((activePlayers) => {
				if (!loadSeq.isCurrent(reqId)) return;
				allActivePlayers = Array.isArray(activePlayers) ? activePlayers : [];
				percentileNotice =
					allActivePlayers.length === 0
						? 'Active-player percentile data is temporarily unavailable.'
						: null;
			})
			.catch(() => {
				if (!loadSeq.isCurrent(reqId)) return;
				allActivePlayers = [];
				percentileNotice = 'Active-player percentile data is temporarily unavailable.';
			})
			.finally(() => {
				if (!loadSeq.isCurrent(reqId)) return;
				percentilesLoading = false;
			});

		return () => {
			loadSeq.next();
		};
	});

	function normalizeProbability(value) {
		const parsed = Number.parseFloat(value);
		if (!Number.isFinite(parsed)) return null;
		return parsed <= 1 ? parsed * 100 : parsed;
	}

	const longevityPlayer = $derived.by(() => {
		if (!playerInfo) return null;
		return {
			player_name: playerInfo.player_name,
			p1: normalizeProbability(playerInfo.s1),
			p2: normalizeProbability(playerInfo.s2),
			p3: normalizeProbability(playerInfo.s3),
			p4: normalizeProbability(playerInfo.s4),
			p5: normalizeProbability(playerInfo.s5),
			p6: normalizeProbability(playerInfo.s6),
			p7: normalizeProbability(playerInfo.s7),
			p8: normalizeProbability(playerInfo.s8),
			p9: normalizeProbability(playerInfo.s9),
			p10: normalizeProbability(playerInfo.s10),
			p11: normalizeProbability(playerInfo.s11),
			p12: normalizeProbability(playerInfo.s12)
		};
	});

	const playerDetailText = $derived.by(() => {
		if (!playerInfo) return '';
		const parts = [];
		if (playerInfo.age) parts.push('Age ' + Math.floor(playerInfo.age));
		if (playerInfo.draft_year) {
			let d = '';
			if (playerInfo.draft_slot) d += 'Pick #' + Math.round(playerInfo.draft_slot) + ', ';
			d += Math.round(playerInfo.draft_year) + ' Draft';
			parts.push(d);
		}
		if (playerInfo.rookie_season) parts.push('Rookie ' + playerInfo.rookie_season);
		return parts.join(' · ');
	});

		const hasLongevityData = $derived(
		longevityPlayer !== null &&
		longevityPlayer.p1 !== null
	);

	function handleSelectPlayer(player) {
		goto(`/player/${player.nba_id}`);
	}

	function togglePercentileMetric(metric) {
		if (selectedPercentileMetrics.includes(metric)) {
			if (selectedPercentileMetrics.length > 1) {
				selectedPercentileMetrics = selectedPercentileMetrics.filter((item) => item !== metric);
			}
			return;
		}

		selectedPercentileMetrics = [...selectedPercentileMetrics, metric];
	}
</script>

<svelte:head>
	<title>{playerInfo?.player_name || 'Player'} Profile — DARKO DPM</title>
</svelte:head>

<div class="container player-profile-page" data-shiny-page>
	<div class="profile-layout" data-shiny-layout="sidebar">
		<aside class="profile-sidebar" data-shiny-surface="well">
			<div class="sidebar-section">
				<p class="sidebar-label">Player</p>
				<AllPlayerSearch onSelect={handleSelectPlayer} exclude={[]} />
			</div>

			{#if playerInfo}
				<div class="sidebar-player-info">
					<div class="profile-headshot">
						{#if nbaId && !imgFailed}
							<img
								src={`https://cdn.nba.com/headshots/nba/latest/260x190/${nbaId}.png`}
								alt=""
								class="headshot-img"
								onerror={() => {
									imgFailed = true;
								}}
							/>
						{:else}
							<div class="headshot-placeholder">
								{getInitials(playerInfo?.player_name)}
							</div>
						{/if}
					</div>
					<h1>{playerInfo.player_name}</h1>
					<p class="player-meta">
						{[playerInfo.team_name, playerInfo.position || '?'].filter(Boolean).join(' · ')}
					</p>
					<p class="player-detail">{playerDetailText}</p>
					{#if asOfDate && !playerRating}
						<p class="sidebar-rating sidebar-rating-note">
							No DARKO rating yet on {formatAsOfDate(asOfDate)}.
						</p>
					{/if}
					{#if playerRating}
						<div class="sidebar-rating">
							<p class="sidebar-rating-head">
								<span class="sidebar-label">
									DPM{#if asOfDate && asOfRow}<span class="sidebar-asof">{' · '}{formatAsOfDate(asOfRow.date.slice(0, 10), { short: true })}</span>{/if}
								</span>
								<span class="sidebar-rating-value">{formatSigned(playerRating.dpm, 1)}</span>
							</p>
							<OffenseDefenseBar offense={playerRating.offense} defense={playerRating.defense} />
							<OffenseDefenseSplit
								offense={playerRating.offense}
								defense={playerRating.defense}
								labels
							/>
						</div>
					{/if}
				</div>
				<a href="/compare?ids={nbaId}" class="compare-link">Compare this player</a>
			{/if}

			<div class="sidebar-section">
				<label class="sidebar-label" for="talent-trend-select">Talent Trend</label>
				<select id="talent-trend-select" class="sidebar-select" bind:value={talentType}>
					{#each TALENT_OPTIONS as opt (opt.value)}
						<option value={opt.value}>{opt.label}</option>
					{/each}
				</select>
			</div>

			<div class="sidebar-section">
				<p class="sidebar-label">Talent Percentiles</p>
				<div class="percentile-checkboxes">
					{#each PERCENTILE_OPTIONS as opt (opt.value)}
						<label class="checkbox-label">
							<input
								type="checkbox"
								checked={selectedPercentileMetrics.includes(opt.value)}
								onchange={() => togglePercentileMetric(opt.value)}
							/>
							{opt.label}
						</label>
					{/each}
				</div>
			</div>
		</aside>

		<div class="profile-content">
			{#if playerInfo}
				{#if seismograph}
					<section
						class="chart-panel seismograph-panel"
						data-shiny-surface="plot"
						aria-labelledby="seismograph-title"
					>
						<header class="seismograph-header">
							<div>
								<p class="seismograph-kicker" data-shiny-role="editorial-kicker">Game by game</p>
								<h2 id="seismograph-title">Seismograph</h2>
								<p class="seismograph-lede">
									DARKO updates every rating after every game. The lines show the rating going
									into each game; the bars show how much each game moved it, split into offense
									and defense.
								</p>
							</div>
							<label class="seismograph-season">
								<span class="sidebar-label">Season</span>
								<select
									class="sidebar-select"
									value={seismographSeason}
									onchange={(event) => pickSeismographSeason(event.currentTarget.value)}
								>
									{#each seismographSeasons as season (season)}
										<option value={season}>{seasonLabel(season)}</option>
									{/each}
								</select>
							</label>
						</header>

						<div class="seismograph-body">
							<div class="seismograph-chart">
								<SeismographChart
									{seismograph}
									playerName={playerInfo.player_name}
									markerDate={asOfDate}
								/>
							</div>
							{#if seismographSummary}
								<dl class="seismograph-callouts">
									<div class="seismograph-callout">
										<dt>Season change</dt>
										<dd class="seismograph-callout-value">
											{formatSigned(seismographSummary.change)}
										</dd>
										<dd class="seismograph-callout-note">
											{formatSigned(seismographSummary.start)} before the first game,
											{formatSigned(seismographSummary.end)}
											{SEASON_END_LABELS[seismographSummary.endStatus] ?? 'at the end'}
										</dd>
									</div>
									{#if seismographSummary.best?.update.dpm > 0}
										<div class="seismograph-callout">
											<dt>Biggest boost</dt>
											<dd class="seismograph-callout-value">
												{formatSigned(seismographSummary.best.update.dpm)}
											</dd>
											<dd class="seismograph-callout-note">{gameLabel(seismographSummary.best)}</dd>
										</div>
									{/if}
									{#if seismographSummary.worst?.update.dpm < 0}
										<div class="seismograph-callout">
											<dt>Biggest drop</dt>
											<dd class="seismograph-callout-value">
												{formatSigned(seismographSummary.worst.update.dpm)}
											</dd>
											<dd class="seismograph-callout-note">{gameLabel(seismographSummary.worst)}</dd>
										</div>
									{/if}
									{#if seismographSummary.typicalUpdate !== null}
										<div class="seismograph-callout">
											<dt>Typical change per game</dt>
											<dd class="seismograph-callout-value">
												{(seismographSummary.recentUpdate ?? seismographSummary.typicalUpdate).toFixed(2)}
											</dd>
											<dd class="seismograph-callout-note">
												{#if seismographSummary.window}
													Last {seismographSummary.window} games, vs
													{seismographSummary.earlyUpdate.toFixed(2)} in the first
													{seismographSummary.window}.
												{:else}
													Average size of a game's change this season.
												{/if}
												Smaller changes mean each game moves DARKO's view less.
											</dd>
										</div>
									{/if}
								</dl>
							{/if}
						</div>

						<button
							type="button"
							class="seismograph-log-toggle"
							aria-expanded={showGameLog}
							aria-controls="seismograph-game-log"
							onclick={() => (showGameLog = !showGameLog)}
						>
							{showGameLog ? 'Hide game log' : 'Show game log'}
						</button>
						<div id="seismograph-game-log" class="seismograph-log" hidden={!showGameLog}>
							{#if showGameLog}
								<table class="seismograph-log-table">
									<caption class="sr-only">
										{playerInfo.player_name}, {seismograph.label}, game by game
									</caption>
									<thead>
										<tr>
											<th scope="col">Date</th>
											<th scope="col" class="log-team">Team</th>
											<th scope="col">Opp</th>
											<th scope="col">Min</th>
											<th scope="col">DPM going in</th>
											<th scope="col">Change</th>
											<th scope="col"><OffenseDefenseGlyph side="offense" /> Offense</th>
											<th scope="col"><OffenseDefenseGlyph side="defense" /> Defense</th>
										</tr>
									</thead>
									<tbody>
										{#each gameLog as game (game.date)}
											<tr>
												<td>{formatGameDate(game.date)}</td>
												<td class="log-team">{teamAbbr(game.team)}</td>
												<td>{game.opponent ?? '—'}</td>
												<td>{Math.round(game.minutes)}</td>
												<td>{formatSigned(game.dpm)}</td>
												<td>{game.update ? formatSigned(game.update.dpm) : '—'}</td>
												<td>{game.update ? formatSigned(game.update.o) : '—'}</td>
												<td>{game.update ? formatSigned(game.update.d) : '—'}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							{/if}
						</div>
					</section>
				{/if}

				<div class="charts-row" data-shiny-layout="split">
					<div class="chart-panel chart-half" data-shiny-surface="plot">
						<TalentTrendChart
							rows={historyRows}
							{talentType}
							playerName={playerInfo.player_name}
						/>
						{#if historyMeta.truncated}
							<p class="history-note">
								Showing the first {historyMeta.maxRows} rows of career history.
							</p>
						{/if}
					</div>
					{#if hasLongevityData}
						<div class="chart-panel chart-half" data-shiny-surface="plot">
							<h3 class="chart-panel-title">{playerInfo.player_name}</h3>
							<p class="chart-panel-subtitle">Career Length Projections</p>
							<LongevityCareerLengthChart player={longevityPlayer} />
						</div>
					{/if}
				</div>

				{#if percentilesLoading}
					<div class="chart-panel" data-shiny-surface="panel">
						<div class="loading">Loading percentile context...</div>
					</div>
				{:else if percentileNotice}
					<div class="chart-panel" data-shiny-surface="panel">
						<p class="percentile-notice">{percentileNotice}</p>
					</div>
				{:else if allActivePlayers.length > 0}
					<div class="chart-panel" data-shiny-surface="plot">
						<TalentPercentilesChart
							playerName={playerInfo.player_name}
							position={playerInfo.position}
							date={currentDate}
							{percentiles}
							selectedMetrics={selectedPercentileMetrics}
							rawValues={playerInfo}
						/>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	.profile-layout {
		display: grid;
		grid-template-columns: 280px 1fr;
		gap: 24px;
		padding: 32px 0 64px;
		align-items: start;
	}

	.profile-sidebar {
		display: flex;
		flex-direction: column;
		gap: 20px;
		position: sticky;
		top: 230px;
	}

	.sidebar-player-info {
		padding: 16px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.sidebar-player-info h1 {
		font-size: 18px;
		font-weight: 700;
		color: var(--text);
	}

	.profile-headshot {
		display: flex;
		justify-content: center;
		margin-bottom: 12px;
	}

	.profile-headshot .headshot-img {
		width: 130px;
		height: 95px;
		object-fit: cover;
		border-radius: 6px;
	}

	.profile-headshot .headshot-placeholder {
		width: 90px;
		height: 90px;
		border-radius: 50%;
		background: var(--bg-elevated);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 28px;
		font-weight: 700;
		color: var(--text-muted);
	}

	.compare-link {
		display: block;
		text-align: center;
		padding: 8px 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		text-decoration: none;
	}

	.compare-link:hover {
		background: var(--accent);
		color: var(--bg);
	}

	.player-meta {
		font-size: 13px;
		color: var(--text-secondary);
		margin-top: 4px;
	}

	.player-detail {
		font-size: 12px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.sidebar-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.sidebar-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
	}

	.sidebar-select {
		width: 100%;
		padding: 8px 12px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--text);
		font-family: var(--font-sans);
		font-size: 13px;
		outline: none;
		cursor: pointer;
	}

	.sidebar-select:focus {
		border-color: var(--accent);
	}

	.percentile-checkboxes {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		accent-color: var(--accent);
	}

	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 24px;
		min-width: 0;
	}

	.charts-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.chart-panel {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px;
	}

	.chart-half {
		min-width: 0;
	}

	.chart-panel-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
		text-align: center;
		margin-bottom: 2px;
	}

	.chart-panel-subtitle {
		font-size: 13px;
		color: var(--text-secondary);
		text-align: center;
		margin-bottom: 8px;
	}

	.percentile-notice {
		color: var(--text-muted);
		font-size: 13px;
	}

	.history-note {
		margin-top: 12px;
		color: var(--text-muted);
		font-size: 12px;
	}

	.sidebar-rating {
		display: grid;
		gap: 8px;
		margin-top: 14px;
		padding-top: 12px;
		border-top: 1px solid var(--border-subtle);
		font-size: 12px;
	}

	.sidebar-rating-note {
		color: var(--time-text);
		font-weight: 600;
	}

	.sidebar-asof {
		color: var(--time-text);
		text-transform: none;
		letter-spacing: 0;
	}

	.sidebar-rating-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.sidebar-rating-value {
		font-family: var(--font-mono);
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.seismograph-panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
	}

	.seismograph-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}

	.seismograph-kicker {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.seismograph-header h2 {
		font-size: 18px;
		font-weight: 700;
		letter-spacing: -0.01em;
		color: var(--text);
	}

	.seismograph-lede {
		max-width: 76ch;
		margin-top: 4px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.seismograph-season {
		display: flex;
		flex: none;
		flex-direction: column;
		gap: 6px;
		min-width: 120px;
	}

	.seismograph-body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 220px;
		gap: 24px;
		align-items: start;
	}

	.seismograph-chart {
		min-width: 0;
	}

	.seismograph-callouts {
		display: grid;
		gap: 14px;
		padding-top: 40px;
	}

	.seismograph-callout {
		display: grid;
		gap: 2px;
		padding-bottom: 14px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.seismograph-callout:last-child {
		padding-bottom: 0;
		border-bottom: 0;
	}

	.seismograph-callout dt {
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.seismograph-callout-value {
		font-family: var(--font-mono);
		font-size: 22px;
		font-weight: 600;
		line-height: 1.2;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.seismograph-callout-note {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.seismograph-log-toggle {
		align-self: flex-start;
		padding: 6px 12px;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.seismograph-log-toggle:hover {
		border-color: var(--accent);
	}

	.seismograph-log-toggle:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.seismograph-log {
		max-height: 420px;
		overflow: auto;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.seismograph-log-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.seismograph-log-table th,
	.seismograph-log-table td {
		padding: 6px 10px;
		text-align: right;
		white-space: nowrap;
	}

	.seismograph-log-table th:first-child,
	.seismograph-log-table td:first-child,
	.seismograph-log-table .log-team {
		text-align: left;
	}

	.seismograph-log-table thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-elevated);
	}

	.seismograph-log-table td {
		font-family: var(--font-mono);
		color: var(--text);
		border-top: 1px solid var(--border-subtle);
	}

	@media (max-width: 1180px) {
		.seismograph-body {
			grid-template-columns: 1fr;
		}

		.seismograph-callouts {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			padding-top: 0;
		}

		.seismograph-callout {
			padding-bottom: 0;
			border-bottom: 0;
		}
	}

	@media (max-width: 768px) {
		.profile-layout {
			grid-template-columns: 1fr;
			padding: 20px 0 48px;
		}

		.profile-sidebar {
			position: static;
		}

		.charts-row {
			grid-template-columns: 1fr;
		}

		.seismograph-header {
			flex-direction: column;
		}
	}

	@media (max-width: 560px) {
		.seismograph-callouts {
			grid-template-columns: 1fr;
		}

		.seismograph-log-table .log-team {
			display: none;
		}
	}
</style>
