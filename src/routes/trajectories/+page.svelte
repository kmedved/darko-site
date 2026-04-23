<script>
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import TrajectoryChart from '$lib/components/TrajectoryChart.svelte';
	import { apiPlayerHistory, apiActivePlayers } from '$lib/api.js';
	import { computeSeasonX, getSeasonStartYear, formatSeasonLabel } from '$lib/utils/seasonUtils.js';
	import {
		formatFixed,
		formatMillions,
		formatPercent,
		formatSignedMetric,
		getMetricDisplayLabel
	} from '$lib/utils/csvPresets.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	let selectedPlayers = $state([]);
	let timeScale = $state('games');
	let talentType = $state('dpm');
	let pendingLoads = $state(0);
	let loading = $derived(pendingLoads > 0);
	let error = $state(null);
	let initialLoadDone = $state(false);
	let yAxisMin = $state(null);
	let yAxisMax = $state(null);
	let rangeFilterMin = $state(null);
	let rangeFilterMax = $state(null);
	let prevTalentType = $state('dpm');
	let prevTimeScale = $state('games');

	$effect(() => {
		if (talentType !== prevTalentType) {
			prevTalentType = talentType;
			yAxisMin = null;
			yAxisMax = null;
		}
	});

	$effect(() => {
		if (timeScale !== prevTimeScale) {
			prevTimeScale = timeScale;
			rangeFilterMin = null;
			rangeFilterMax = null;
		}
	});

	function handleYMinChange(e) {
		const v = parseFloat(e.target.value);
		yAxisMin = Number.isFinite(v) ? v : null;
	}

	function handleYMaxChange(e) {
		const v = parseFloat(e.target.value);
		yAxisMax = Number.isFinite(v) ? v : null;
	}

	function handleRangeMinChange(e) {
		const v = parseFloat(e.target.value);
		rangeFilterMin = Number.isFinite(v) ? v : null;
	}

	function handleRangeMaxChange(e) {
		const v = parseFloat(e.target.value);
		rangeFilterMax = Number.isFinite(v) ? v : null;
	}

	const PLAYER_COLORS = [
		'#5b8def',
		'#ef4444',
		'#34d399',
		'#f59e0b',
		'#a78bfa',
		'#06b6d4',
		'#f97316',
		'#22c55e',
		'#ec4899',
		'#eab308'
	];

	const PERCENT_METRICS = new Set(['tr_fg3_pct', 'tr_ft_pct', 'x_fg_pct', 'x_fg3_pct', 'x_ft_pct']);
	const MONEY_METRICS = new Set(['sal_market_fixed']);
	const SIGNED_METRICS = new Set([
		'dpm',
		'o_dpm',
		'd_dpm',
		'box_dpm',
		'box_odpm',
		'box_ddpm',
		'on_off_dpm',
		'on_off_odpm',
		'on_off_ddpm',
		'bayes_rapm_total',
		'bayes_rapm_off',
		'bayes_rapm_def'
	]);

	const ROLLING_WINDOW_SIZE = 10;

	function hslToHex(h, s, l) {
		const saturation = s / 100;
		const lightness = l / 100;
		const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
		const huePrime = h / 60;
		const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
		let red = 0;
		let green = 0;
		let blue = 0;

		if (huePrime >= 0 && huePrime < 1) {
			red = chroma;
			green = x;
		} else if (huePrime < 2) {
			red = x;
			green = chroma;
		} else if (huePrime < 3) {
			green = chroma;
			blue = x;
		} else if (huePrime < 4) {
			green = x;
			blue = chroma;
		} else if (huePrime < 5) {
			red = x;
			blue = chroma;
		} else {
			red = chroma;
			blue = x;
		}

		const match = lightness - chroma / 2;
		const toHex = (value) =>
			Math.round((value + match) * 255)
				.toString(16)
				.padStart(2, '0');

		return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
	}

	function getPlayerColor(index) {
		const presetColor = PLAYER_COLORS[index];
		if (presetColor) return presetColor;

		const hue = (index * 137.508) % 360;
		return hslToHex(hue, 68, 56);
	}

	const talentTypes = [
		{ key: 'dpm', label: 'DARKO DPM' },
		{ key: 'o_dpm', label: 'O-DPM' },
		{ key: 'd_dpm', label: 'D-DPM' },
		{ key: 'box_dpm', label: 'Box DPM' },
		{ key: 'box_odpm', label: 'Box O-DPM' },
		{ key: 'box_ddpm', label: 'Box D-DPM' },
		{ key: 'on_off_dpm', label: 'On/Off DPM' },
		{ key: 'bayes_rapm_total', label: 'RAPM' },
		{ key: 'x_pts_100', label: 'Pts per 100' },
		{ key: 'x_ast_100', label: 'Ast per 100' },
		{ key: 'x_fg_pct', label: 'FG%' },
		{ key: 'x_fg3_pct', label: '3P%' },
		{ key: 'x_ft_pct', label: 'FT%' },
		{ key: 'x_minutes', label: 'MPG' },
		{ key: 'x_pace', label: 'Pace' },
		{ key: 'sal_market_fixed', label: 'Fair Salary' }
	];

	const timeScaleOptions = [
		{ key: 'games', label: 'Games' },
		{ key: 'age', label: 'Age' },
		{ key: 'seasons', label: 'Seasons' }
	];

	const selectedMetricLabel = $derived(getMetricDisplayLabel(talentType));
	const chartTitle = $derived(`DARKO Career ${selectedMetricLabel} Progression`);

	const availableSeasons = $derived.by(() => {
		const years = new Set();
		for (const p of selectedPlayers) {
			for (const row of p.rows) {
				const y = getSeasonStartYear(row.date);
				if (y != null) years.add(y);
			}
		}
		return [...years].sort((a, b) => a - b);
	});

	const rangeLabel = $derived(
		timeScale === 'seasons' ? 'Season Range' : timeScale === 'age' ? 'Age Range' : 'Games Range'
	);

	const showRangeFilter = $derived(
		selectedPlayers.length > 0 &&
		(timeScale === 'seasons' ? availableSeasons.length > 1 : selectedPlayers.some((p) => p.rows.length > 0))
	);

	const chartData = $derived(
		selectedPlayers.map((p) => {
			let rows = p.rows;
			if (rangeFilterMin != null || rangeFilterMax != null) {
				rows = rows.filter((row) => {
					let val;
					if (timeScale === 'seasons') {
						val = getSeasonStartYear(row.date);
					} else if (timeScale === 'age') {
						val = Number.parseFloat(row.age);
					} else {
						val = Number.parseFloat(row.career_game_num);
					}
					if (val == null || !Number.isFinite(val)) return false;
					if (rangeFilterMin != null && val < rangeFilterMin) return false;
					if (rangeFilterMax != null && val > rangeFilterMax) return false;
					return true;
				});
			}
			if (timeScale === 'seasons') {
				rows = computeSeasonX(rows);
			}
			return { ...p, rows };
		})
	);

	const excludeIds = $derived(selectedPlayers.map((p) => p.nba_id));
	const metricPoints = $derived.by(() => buildMetricPoints(chartData));
	const rollingSummaries = $derived.by(() => buildRollingSummaries(chartData));
	const trajectoryStats = $derived.by(() => buildTrajectoryStats());

	function formatInteger(value) {
		const n = Number.parseFloat(value);
		if (!Number.isFinite(n)) return '-';
		return Math.round(n).toLocaleString();
	}

	function formatMetricValue(value, decimals = 2) {
		if (MONEY_METRICS.has(talentType)) return formatMillions(value);
		if (PERCENT_METRICS.has(talentType)) return formatPercent(value);
		if (SIGNED_METRICS.has(talentType)) return formatSignedMetric(value, decimals);
		return formatFixed(value, decimals);
	}

	function valueFromRow(row) {
		const value = Number.parseFloat(row?.[talentType]);
		return Number.isFinite(value) ? value : null;
	}

	function xFromRow(row) {
		if (timeScale === 'seasons') {
			const value = Number.parseFloat(row?._seasonX);
			return Number.isFinite(value) ? value : null;
		}
		if (timeScale === 'age') {
			const value = Number.parseFloat(row?.age);
			return Number.isFinite(value) ? value : null;
		}
		const value = Number.parseFloat(row?.career_game_num);
		return Number.isFinite(value) ? value : null;
	}

	function buildMetricPoints(players) {
		return players.flatMap((player) =>
			(player.rows || [])
				.map((row) => {
					const value = valueFromRow(row);
					const x = xFromRow(row);
					if (value == null || x == null) return null;
					return { player, row, value, x };
				})
				.filter(Boolean)
		);
	}

	function buildRollingSummaries(players) {
		const summaries = [];

		for (const player of players) {
			const points = (player.rows || [])
				.map((row) => {
					const value = valueFromRow(row);
					const x = xFromRow(row);
					if (value == null || x == null) return null;
					return { value, x };
				})
				.filter(Boolean)
				.sort((a, b) => a.x - b.x);

			if (points.length < ROLLING_WINDOW_SIZE) continue;

			for (let index = 0; index <= points.length - ROLLING_WINDOW_SIZE; index += 1) {
				const window = points.slice(index, index + ROLLING_WINDOW_SIZE);
				const average = window.reduce((sum, point) => sum + point.value, 0) / ROLLING_WINDOW_SIZE;
				summaries.push({ player, value: average });
			}
		}

		return summaries;
	}

	function standardDeviation(values) {
		if (values.length < 2) return null;
		const average = values.reduce((sum, value) => sum + value, 0) / values.length;
		const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
		return Math.sqrt(variance);
	}

	function bestBy(items, getValue) {
		return items.reduce((best, item) => {
			if (!best || getValue(item) > getValue(best)) return item;
			return best;
		}, null);
	}

	function worstBy(items, getValue) {
		return items.reduce((worst, item) => {
			if (!worst || getValue(item) < getValue(worst)) return item;
			return worst;
		}, null);
	}

	function mostConsistentPlayer(players) {
		const playerStats = players
			.map((player) => {
				const values = (player.rows || [])
					.map(valueFromRow)
					.filter((value) => value != null);
				const deviation = standardDeviation(values);
				return deviation == null ? null : { player, deviation };
			})
			.filter(Boolean);

		return worstBy(playerStats, (entry) => entry.deviation);
	}

	function buildTrajectoryStats() {
		const values = metricPoints.map((point) => point.value);
		const minValue = values.length
			? values.reduce((minimum, value) => Math.min(minimum, value), Infinity)
			: null;
		const maxValue = values.length
			? values.reduce((maximum, value) => Math.max(maximum, value), -Infinity)
			: null;
		const peakPoint = bestBy(metricPoints, (point) => point.value);
		const bestRolling = bestBy(rollingSummaries, (summary) => summary.value);
		const worstRolling = worstBy(rollingSummaries, (summary) => summary.value);
		const consistent = mostConsistentPlayer(chartData);

		return [
			{
				label: 'Games Tracked',
				value: formatInteger(metricPoints.length),
				detail: 'Total',
				tone: 'neutral'
			},
			{
				label: `${selectedMetricLabel} Range`,
				value: minValue == null || maxValue == null
					? '-'
					: `${formatMetricValue(minValue)} to ${formatMetricValue(maxValue)}`,
				detail: 'Across selected players',
				tone: 'accent'
			},
			{
				label: `Peak ${selectedMetricLabel}`,
				value: peakPoint ? formatMetricValue(peakPoint.value) : '-',
				detail: peakPoint?.player?.player_name || '-',
				tone: 'positive'
			},
			{
				label: `Best ${ROLLING_WINDOW_SIZE}-Game ${selectedMetricLabel}`,
				value: bestRolling ? formatMetricValue(bestRolling.value) : '-',
				detail: bestRolling?.player?.player_name || '-',
				tone: 'positive'
			},
			{
				label: `Worst ${ROLLING_WINDOW_SIZE}-Game ${selectedMetricLabel}`,
				value: worstRolling ? formatMetricValue(worstRolling.value) : '-',
				detail: worstRolling?.player?.player_name || '-',
				tone: 'negative'
			},
			{
				label: 'Most Consistent',
				value: consistent?.player?.player_name || '-',
				detail: consistent ? `Std Dev: ${formatFixed(consistent.deviation, 2)}` : '-',
				tone: 'accent'
			}
		];
	}

	async function preloadPlayersById(idList) {
		if (!Array.isArray(idList) || idList.length === 0) return;

		const uniqueIds = [...new Set(
			idList
				.map((id) => Number.parseInt(id, 10))
				.filter((id) => Number.isInteger(id) && id > 0)
		)];
		if (uniqueIds.length === 0) return;

		pendingLoads += uniqueIds.length;
		error = null;

		try {
			const results = await Promise.allSettled(
				uniqueIds.map((id) => apiPlayerHistory(id, { full: true }))
			);

			const additions = [];
			for (const [index, result] of results.entries()) {
				const nbaId = uniqueIds[index];
				if (result.status !== 'fulfilled') {
					error = error || result.reason?.message || `Failed to load player ${nbaId}`;
					continue;
				}

				const rows = result.value || [];
				if (rows.length === 0) {
					error = error || `No history found for player ${nbaId}`;
					continue;
				}

				const colorIndex = selectedPlayers.length + additions.length;
				additions.push({
					nba_id: nbaId,
					player_name: rows[0].player_name,
					team_name: rows[0].team_name,
					color: getPlayerColor(colorIndex),
					rows
				});
			}

			if (additions.length > 0) {
				const merged = [...selectedPlayers];
				const seenIds = new Set(merged.map((player) => player.nba_id));
				for (const player of additions) {
					if (!seenIds.has(player.nba_id)) {
						seenIds.add(player.nba_id);
						merged.push(player);
					}
				}
				selectedPlayers = merged;
			}
		} finally {
			pendingLoads = Math.max(0, pendingLoads - uniqueIds.length);
		}
	}

	// Load players from URL params on mount
	$effect(() => {
		if (initialLoadDone) return;
		const ids = $page.url.searchParams.get('ids');
		if (ids) {
			const idList = ids.split(',');
			preloadPlayersById(idList);
		} else {
			loadRandomPlayer();
		}
		initialLoadDone = true;
	});

	// Sync selected player IDs to URL
	$effect(() => {
		if (!initialLoadDone || loading) return;
		const ids = selectedPlayers.map((p) => p.nba_id).join(',');
		const currentIds = $page.url.searchParams.get('ids') || '';
		if (ids !== currentIds) {
			const url = new URL($page.url);
			if (ids) {
				url.searchParams.set('ids', ids);
			} else {
				url.searchParams.delete('ids');
			}
			goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true });
		}
	});

	async function loadPlayerById(nbaId) {
		if (selectedPlayers.some((p) => p.nba_id === nbaId)) return;

		const colorIndex = selectedPlayers.length;
		const color = getPlayerColor(colorIndex);

		pendingLoads += 1;
		error = null;
		try {
			const rows = await apiPlayerHistory(nbaId, { full: true });
			if (rows.length === 0) {
				error = `No history found for player ${nbaId}`;
				return;
			}
			selectedPlayers = [
				...selectedPlayers,
				{
					nba_id: nbaId,
					player_name: rows[0].player_name,
					team_name: rows[0].team_name,
					color,
					rows
				}
			];
		} catch (err) {
			error = err.message;
		} finally {
			pendingLoads = Math.max(0, pendingLoads - 1);
		}
	}

	async function loadRandomPlayer() {
		pendingLoads += 1;
		error = null;
		try {
			const players = await apiActivePlayers();
			if (players.length === 0) {
				error = 'No players available for random selection.';
				return;
			}

			const randomIndex = Math.floor(Math.random() * players.length);
			const randomPlayer = players[randomIndex];
			await loadPlayerById(randomPlayer.nba_id);
		} catch (err) {
			error = err.message;
		} finally {
			pendingLoads = Math.max(0, pendingLoads - 1);
		}
	}

	async function addPlayer(player) {
		if (selectedPlayers.some((p) => p.nba_id === player.nba_id)) return;

		const colorIndex = selectedPlayers.length;
		const color = getPlayerColor(colorIndex);

		pendingLoads += 1;
		error = null;

		try {
			const rows = await apiPlayerHistory(player.nba_id, { full: true });
			if (rows.length === 0) {
				error = `No history found for player ${player.nba_id}`;
				return;
			}
			selectedPlayers = [
				...selectedPlayers,
				{
					nba_id: player.nba_id,
					player_name: player.player_name,
					team_name: player.team_name,
					color,
					rows
				}
			];
		} catch (err) {
			error = err.message;
		} finally {
			pendingLoads = Math.max(0, pendingLoads - 1);
		}
	}

	function removePlayer(nbaId) {
		selectedPlayers = selectedPlayers
			.filter((p) => p.nba_id !== nbaId)
			.map((p, i) => ({
				...p,
				color: getPlayerColor(i)
			}));
	}
</script>

<svelte:head>
	<title>Player Career Trajectories - DARKO DPM</title>
</svelte:head>

<div class="trajectory-page">
	<div class="container trajectory-container">
		<section class="trajectory-hero" aria-labelledby="trajectory-title">
			<div class="trajectory-title-block">
				<div class="trajectory-icon" aria-hidden="true">
					<svg viewBox="0 0 48 48" role="presentation">
						<path d="M8 38V10" />
						<path d="M8 38H42" />
						<path d="M13 31L22 22L29 26L39 14" />
						<path d="M36 14H39V17" />
					</svg>
				</div>
				<div>
					<h1 id="trajectory-title">Player Career Trajectories</h1>
					<p>Compare career arcs for any number of players.</p>
				</div>
			</div>
		</section>

		<div class="trajectory-workspace">
			<aside class="trajectory-controls" aria-label="Trajectory controls">
				<fieldset class="control-group">
					<legend class="control-label">Time Scale</legend>
					<div class="radio-stack">
						{#each timeScaleOptions as opt (opt.key)}
							<label class="radio-label">
								<input
									type="radio"
									name="timeScale"
									value={opt.key}
									bind:group={timeScale}
								/>
								<span>{opt.label}</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="control-group">
					<label class="control-label" for="talent-type">Talent Type</label>
					<select
						id="talent-type"
						class="control-select"
						bind:value={talentType}
					>
						{#each talentTypes as tt (tt.key)}
							<option value={tt.key}>{tt.label}</option>
						{/each}
					</select>
				</div>

				<div class="control-group">
					<span class="control-label">Y-Axis Range</span>
					<div class="range-inputs">
						<label class="range-field">
							<span>Min</span>
							<input
								type="number"
								step="any"
								placeholder="Auto"
								value={yAxisMin ?? ''}
								oninput={handleYMinChange}
							/>
						</label>
						<label class="range-field">
							<span>Max</span>
							<input
								type="number"
								step="any"
								placeholder="Auto"
								value={yAxisMax ?? ''}
								oninput={handleYMaxChange}
							/>
						</label>
					</div>
				</div>

				{#if showRangeFilter}
					<div class="control-group">
						<span class="control-label">{rangeLabel}</span>
						<div class="range-inputs">
							{#if timeScale === 'seasons'}
								<label class="range-field">
									<span>From</span>
									<select
										class="control-select"
										value={rangeFilterMin ?? ''}
										onchange={(e) => {
											rangeFilterMin = e.currentTarget.value
												? Number(e.currentTarget.value)
												: null;
										}}
									>
										<option value="">Earliest</option>
										{#each availableSeasons as yr (yr)}
											<option value={yr}>{formatSeasonLabel(yr)}</option>
										{/each}
									</select>
								</label>
								<label class="range-field">
									<span>To</span>
									<select
										class="control-select"
										value={rangeFilterMax ?? ''}
										onchange={(e) => {
											rangeFilterMax = e.currentTarget.value
												? Number(e.currentTarget.value)
												: null;
										}}
									>
										<option value="">Latest</option>
										{#each availableSeasons as yr (yr)}
											<option value={yr}>{formatSeasonLabel(yr)}</option>
										{/each}
									</select>
								</label>
							{:else}
								<label class="range-field">
									<span>Min</span>
									<input
										type="number"
										step={timeScale === 'age' ? 'any' : '1'}
										placeholder="Auto"
										value={rangeFilterMin ?? ''}
										oninput={handleRangeMinChange}
									/>
								</label>
								<label class="range-field">
									<span>Max</span>
									<input
										type="number"
										step={timeScale === 'age' ? 'any' : '1'}
										placeholder="Auto"
										value={rangeFilterMax ?? ''}
										oninput={handleRangeMaxChange}
									/>
								</label>
							{/if}
						</div>
					</div>
				{/if}

				<div class="control-group player-control-group">
					<span class="control-label">Select Players to Compare</span>
					<div class="player-chip-list">
						{#each selectedPlayers as p (p.nba_id)}
							<span class="player-chip" style:--player-color={p.color}>
								<span>
									<strong>{p.player_name}</strong>
									<small>{p.nba_id}</small>
								</span>
								<button
									type="button"
									class="chip-remove"
									onclick={() => removePlayer(p.nba_id)}
									aria-label={`Remove ${p.player_name}`}
								>
									x
								</button>
							</span>
						{/each}
					</div>
					<AllPlayerSearch
						onSelect={addPlayer}
						exclude={excludeIds}
					/>
				</div>
			</aside>

			<main class="trajectory-main">
				<section class="trajectory-chart-area" aria-label="Career trajectory chart">
					{#if error}
						<div class="trajectory-message error-msg">{error}</div>
					{/if}

					{#if loading}
						<div class="trajectory-loading" aria-live="polite">
							<span></span>
							<span></span>
							<span></span>
						</div>
					{/if}

					{#if selectedPlayers.length > 0}
						<TrajectoryChart
							players={chartData}
							{timeScale}
							{talentType}
							title={chartTitle}
							yMin={yAxisMin}
							yMax={yAxisMax}
						/>
					{:else if !loading}
						<div class="trajectory-message empty-state">
							Search for players to view career trajectories.
						</div>
					{/if}
				</section>

				{#if selectedPlayers.length > 0}
					<section class="trajectory-stat-grid" aria-label="Trajectory summary">
						{#each trajectoryStats as card (card.label)}
							<article class="trajectory-stat-card {card.tone}">
								<div class="stat-icon" aria-hidden="true">
									<span></span>
								</div>
								<div>
									<p>{card.label}</p>
									<strong>{card.value}</strong>
									<small>{card.detail}</small>
								</div>
							</article>
						{/each}
					</section>
				{/if}
			</main>
		</div>
	</div>
</div>

<style>
	.trajectory-page {
		min-height: calc(100dvh - var(--nav-sticky-offset));
		padding: 24px 0 34px;
		background:
			radial-gradient(circle at 92% 4%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
			var(--bg);
	}

	.trajectory-container {
		max-width: 1880px;
		display: grid;
		gap: 18px;
	}

	.trajectory-hero {
		position: relative;
		overflow: hidden;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius);
		background:
			radial-gradient(circle at 88% -10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 24rem),
			var(--bg);
		box-shadow: 0 18px 48px color-mix(in srgb, var(--text) 10%, transparent);
		padding: 26px 28px;
	}

	.trajectory-hero::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			repeating-radial-gradient(circle at 72% 6%, transparent 0 34px, color-mix(in srgb, var(--border-subtle) 65%, transparent) 35px 36px);
		opacity: 0.42;
		pointer-events: none;
	}

	.trajectory-title-block {
		position: relative;
		z-index: 1;
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.trajectory-title-block > div:last-child {
		min-width: 0;
	}

	.trajectory-icon {
		width: 70px;
		height: 70px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: var(--bg-surface);
		border: 1px solid var(--border-subtle);
		box-shadow: 0 12px 28px color-mix(in srgb, var(--text) 12%, transparent);
		color: var(--accent);
		flex: 0 0 auto;
	}

	.trajectory-icon svg {
		width: 42px;
		height: 42px;
		fill: none;
		stroke: currentColor;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	h1 {
		font-size: 34px;
		line-height: 1;
		letter-spacing: 0;
		color: var(--text);
		font-weight: 850;
	}

	.trajectory-title-block p {
		color: var(--text-secondary);
		font-size: 17px;
		margin-top: 8px;
		overflow-wrap: anywhere;
	}

	.trajectory-workspace {
		display: grid;
		grid-template-columns: 340px minmax(0, 1fr);
		gap: 34px;
		align-items: start;
	}

	.trajectory-controls {
		position: sticky;
		top: calc(var(--nav-sticky-offset) + 18px);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 18px;
		background: color-mix(in srgb, var(--bg-elevated) 78%, var(--bg));
		box-shadow: 0 18px 42px color-mix(in srgb, var(--text) 12%, transparent);
	}

	.trajectory-main,
	.trajectory-chart-area {
		min-width: 0;
	}

	.trajectory-chart-area {
		position: relative;
	}

	.control-group {
		margin-bottom: 22px;
		border: none;
		padding: 0;
	}

	.control-group:last-child {
		margin-bottom: 0;
	}

	.control-label {
		display: block;
		font-size: 12px;
		font-weight: 850;
		line-height: 1.15;
		letter-spacing: 0;
		margin-bottom: 9px;
		color: var(--text);
	}

	.radio-stack {
		display: grid;
		gap: 9px;
	}

	.radio-label {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		width: fit-content;
		color: var(--text-secondary);
		cursor: pointer;
		font-size: 14px;
		line-height: 1.1;
	}

	.radio-label input {
		appearance: none;
		width: 18px;
		height: 18px;
		border: 1px solid var(--text-muted);
		border-radius: 50%;
		background: transparent;
		display: grid;
		place-items: center;
		margin: 0;
		cursor: pointer;
		transition: border-color 0.15s, box-shadow 0.15s;
	}

	.radio-label input::before {
		content: '';
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent);
		transform: scale(0);
		transition: transform 0.15s;
	}

	.radio-label input:checked {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.radio-label input:checked::before {
		transform: scale(1);
	}

	.radio-label:has(input:checked) {
		color: var(--text);
	}

	.control-select,
	.range-field input {
		width: 100%;
		min-height: 38px;
		padding: 0 12px;
		font-size: 13px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--text);
		font-family: var(--font-sans);
		outline: none;
	}

	.control-select:focus,
	.range-field input:focus {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
	}

	.range-inputs {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.range-field {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
	}

	.range-field span {
		font-size: 11px;
		color: var(--text-secondary);
	}

	.player-control-group {
		display: grid;
		gap: 10px;
	}

	.player-chip-list {
		display: grid;
		gap: 6px;
		min-height: 0;
	}

	.player-chip {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 22px;
		align-items: center;
		gap: 10px;
		padding: 8px 8px 8px 12px;
		border: 1px solid color-mix(in srgb, var(--player-color) 80%, var(--border));
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--player-color) 64%, var(--bg-surface));
		color: var(--text);
	}

	.player-chip span {
		display: flex;
		align-items: baseline;
		gap: 8px;
		min-width: 0;
	}

	.player-chip strong {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 13px;
		font-weight: 850;
	}

	.player-chip small {
		font-family: var(--font-mono);
		font-size: 11px;
		color: color-mix(in srgb, var(--text) 74%, transparent);
	}

	.chip-remove {
		width: 22px;
		height: 22px;
		border: none;
		border-radius: 50%;
		background: color-mix(in srgb, var(--bg) 35%, transparent);
		color: var(--text);
		cursor: pointer;
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 850;
		line-height: 1;
		transition: background-color 0.15s, color 0.15s, transform 0.15s;
	}

	.chip-remove:hover {
		background: var(--negative-bg);
		color: var(--negative);
	}

	.chip-remove:active {
		transform: scale(0.94);
	}

	.trajectory-message {
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--text-secondary);
		padding: 24px;
		text-align: center;
	}

	.error-msg {
		border-color: color-mix(in srgb, var(--negative) 42%, var(--border));
		background: var(--negative-bg);
		color: var(--negative);
		margin-bottom: 12px;
	}

	.trajectory-loading {
		display: grid;
		gap: 10px;
		max-width: 520px;
		margin: 0 auto 12px;
	}

	.trajectory-loading span {
		display: block;
		height: 12px;
		border-radius: 999px;
		background:
			linear-gradient(90deg, transparent, color-mix(in srgb, var(--text) 12%, transparent), transparent),
			var(--bg-surface);
		background-size: 220% 100%;
		animation: trajectory-shimmer 1.2s linear infinite;
	}

	.trajectory-loading span:nth-child(2) {
		width: 72%;
	}

	.trajectory-loading span:nth-child(3) {
		width: 46%;
	}

	.trajectory-stat-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 14px;
		margin-top: 18px;
	}

	.trajectory-stat-card {
		min-width: 0;
		display: grid;
		grid-template-columns: 44px minmax(0, 1fr);
		align-items: center;
		gap: 13px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--bg-surface) 88%, var(--bg));
		padding: 16px 16px;
		box-shadow: 0 10px 24px color-mix(in srgb, var(--text) 7%, transparent);
	}

	.stat-icon {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
		color: var(--accent);
		position: relative;
	}

	.stat-icon::before,
	.stat-icon::after,
	.stat-icon span {
		content: '';
		position: absolute;
		display: block;
	}

	.stat-icon::before {
		width: 17px;
		height: 10px;
		border-left: 2px solid currentColor;
		border-bottom: 2px solid currentColor;
		left: 10px;
		bottom: 10px;
	}

	.stat-icon::after {
		width: 16px;
		height: 2px;
		background: currentColor;
		left: 15px;
		top: 18px;
		transform: rotate(-31deg);
		transform-origin: left center;
	}

	.stat-icon span {
		width: 6px;
		height: 6px;
		border-top: 2px solid currentColor;
		border-right: 2px solid currentColor;
		right: 9px;
		top: 12px;
		transform: rotate(0deg);
	}

	.trajectory-stat-card.positive .stat-icon {
		background: color-mix(in srgb, var(--positive) 12%, var(--bg-surface));
		color: var(--positive);
	}

	.trajectory-stat-card.negative .stat-icon {
		background: color-mix(in srgb, var(--negative) 12%, var(--bg-surface));
		color: var(--negative);
	}

	.trajectory-stat-card p {
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 700;
		line-height: 1.15;
		margin-bottom: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trajectory-stat-card strong {
		display: block;
		color: var(--text);
		font-size: 18px;
		font-weight: 850;
		line-height: 1.08;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trajectory-stat-card small {
		display: block;
		color: var(--text-secondary);
		font-size: 11px;
		line-height: 1.2;
		margin-top: 6px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	@keyframes trajectory-shimmer {
		from {
			background-position: 220% 0;
		}

		to {
			background-position: -220% 0;
		}
	}

	@media (max-width: 1320px) {
		.trajectory-workspace {
			grid-template-columns: 320px minmax(0, 1fr);
			gap: 24px;
		}

		.trajectory-stat-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 980px) {
		.trajectory-workspace {
			grid-template-columns: 1fr;
		}

		.trajectory-controls {
			position: static;
		}

		.trajectory-stat-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 768px) {
		.trajectory-page {
			padding: 16px 0 26px;
		}

		.trajectory-workspace {
			grid-template-columns: 1fr;
			align-items: stretch;
		}

		.trajectory-chart-area {
			width: 100%;
			min-width: 0;
		}

		.trajectory-hero {
			padding: 20px;
		}

		.trajectory-title-block {
			align-items: flex-start;
			gap: 14px;
		}

		.trajectory-icon {
			width: 54px;
			height: 54px;
		}

		.trajectory-icon svg {
			width: 32px;
			height: 32px;
		}

		h1 {
			font-size: 26px;
		}

		.trajectory-title-block p {
			font-size: 14px;
		}

		.trajectory-stat-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
