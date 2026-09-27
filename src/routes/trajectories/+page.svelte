<script>
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import TrajectoryChart from '$lib/components/TrajectoryChart.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatTile from '$lib/components/StatTile.svelte';
	import {
		apiPlayerHistory,
		apiActivePlayers,
		apiWowyPlayerHistory,
		apiWowyPublication
	} from '$lib/api.js';
	import {
		computeSeasonX,
		computeSeasonXFromEndYear,
		getSeasonStartYear,
		formatSeasonLabel,
		formatSeasonEndYearLabel
	} from '$lib/utils/seasonUtils.js';
	import {
		formatFixed,
		formatMillions,
		formatPercent,
		formatSignedMetric,
		getMetricDisplayLabel
	} from '$lib/utils/csvPresets.js';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { isWowyPlayerId } from '$lib/utils/wowyPlayerId.js';

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
	let chartOptionsOpen = $state(false);
	let wowyPublication = $state(null);
	let wowyPublicationRequested = false;
	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };
	const historyLoads = new Map();
	const STARTER_PLAYERS = [
		{ nbaId: 203999, label: 'Nikola Jokic', detail: 'Modern peak big' },
		{ nbaId: 1641705, label: 'Victor Wembanyama', detail: 'Early career rise' },
		{ nbaId: 2544, label: 'LeBron James', detail: 'Full career arc' },
		{ nbaId: 201939, label: 'Stephen Curry', detail: 'Shooting prime' }
	];
	const starterPlayerById = new Map(STARTER_PLAYERS.map((player) => [player.nbaId, player]));

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
		'bayes_rapm_def',
		'wowy_rapm',
		'wowy_orapm',
		'wowy_drapm'
	]);
	const WOWY_METRICS = new Set(['wowy_rapm', 'wowy_orapm', 'wowy_drapm']);

	const ROLLING_WINDOW_SIZE = 10;

	const talentTypes = [
		{ key: 'dpm', label: 'DARKO DPM' },
		{ key: 'o_dpm', label: 'O-DPM' },
		{ key: 'd_dpm', label: 'D-DPM' },
		{ key: 'box_dpm', label: 'Box DPM' },
		{ key: 'box_odpm', label: 'Box O-DPM' },
		{ key: 'box_ddpm', label: 'Box D-DPM' },
		{ key: 'on_off_dpm', label: 'On/Off DPM' },
		{ key: 'bayes_rapm_total', label: 'RAPM' },
		{ key: 'wowy_rapm', label: 'WOWY RAPM' },
		{ key: 'wowy_orapm', label: 'WOWY O-RAPM' },
		{ key: 'wowy_drapm', label: 'WOWY D-RAPM' },
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
	const isWowyMetric = $derived(WOWY_METRICS.has(talentType));
	const chartTitle = $derived(
		isWowyMetric
			? `Career ${selectedMetricLabel} Progression`
			: `DARKO Career ${selectedMetricLabel} Progression`
	);
	const wowyPublicationLabel = $derived(
		wowyPublication?.season_through
			? `Data through ${formatSeasonEndYearLabel(wowyPublication.season_through)}`
			: null
	);

	function rowsForPlayer(player) {
		return isWowyMetric ? (player.wowyRows || []) : (player.rows || []);
	}

	const availableSeasons = $derived.by(() => {
		const years = new Set();
		for (const p of selectedPlayers) {
			for (const row of rowsForPlayer(p)) {
				const y = isWowyMetric
					? Number.parseInt(row.season, 10) - 1
					: getSeasonStartYear(row.date);
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
		(timeScale === 'seasons'
			? availableSeasons.length > 1
			: selectedPlayers.some((p) => rowsForPlayer(p).length > 0))
	);

	const chartData = $derived(
		selectedPlayers.map((p, index) => {
			let rows = rowsForPlayer(p);
			if (rangeFilterMin != null || rangeFilterMax != null) {
				rows = rows.filter((row) => {
					let val;
					if (timeScale === 'seasons') {
						val = isWowyMetric
							? Number.parseInt(row.season, 10) - 1
							: getSeasonStartYear(row.date);
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
				rows = isWowyMetric ? computeSeasonXFromEndYear(rows) : computeSeasonX(rows);
			}
			return { ...p, color: getSeriesColor(index, displayMode.view), rows };
		})
	);
	const hasChartRows = $derived(chartData.some((player) => player.rows.length > 0));

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
		const peakPoint = bestBy(metricPoints, (point) => point.value);
		const lowPoint = worstBy(metricPoints, (point) => point.value);
		const bestRolling = bestBy(rollingSummaries, (summary) => summary.value);
		const worstRolling = worstBy(rollingSummaries, (summary) => summary.value);
		const consistent = mostConsistentPlayer(chartData);

		return [
			{
				label: 'Games Tracked',
				value: formatInteger(metricPoints.length),
				detail: 'Total'
			},
			{
				label: `Peak ${selectedMetricLabel}`,
				value: peakPoint ? formatMetricValue(peakPoint.value) : '-',
				detail: peakPoint?.player?.player_name || '-'
			},
			{
				label: `Low ${selectedMetricLabel}`,
				value: lowPoint ? formatMetricValue(lowPoint.value) : '-',
				detail: lowPoint?.player?.player_name || '-'
			},
			{
				label: `Best ${ROLLING_WINDOW_SIZE}-Game ${selectedMetricLabel}`,
				value: bestRolling ? formatMetricValue(bestRolling.value) : '-',
				detail: bestRolling?.player?.player_name || '-'
			},
			{
				label: `Worst ${ROLLING_WINDOW_SIZE}-Game ${selectedMetricLabel}`,
				value: worstRolling ? formatMetricValue(worstRolling.value) : '-',
				detail: worstRolling?.player?.player_name || '-'
			},
			{
				label: 'Most Consistent (Std Dev)',
				value: consistent ? formatFixed(consistent.deviation, 2) : '-',
				detail: consistent?.player?.player_name || '-'
			}
		];
	}

	function isPlayerIdForHistory(nbaId, kind) {
		return kind === 'wowy'
			? isWowyPlayerId(nbaId)
			: Number.isInteger(nbaId) && nbaId > 0;
	}

	function addPlayerShell(player, historyKind = null) {
		const nbaId = Number.parseInt(player?.nba_id ?? player?.nbaId, 10);
		const kind = historyKind ?? (isWowyMetric ? 'wowy' : 'darko');
		if (!isPlayerIdForHistory(nbaId, kind)) return false;
		if (selectedPlayers.some((entry) => entry.nba_id === nbaId)) return false;

		selectedPlayers = [
			...selectedPlayers,
			{
				nba_id: nbaId,
				player_name: player?.player_name || player?.label || `Player ${nbaId}`,
				team_name: player?.team_name || null,
				color: getSeriesColor(selectedPlayers.length, displayMode.view),
				rows: [],
				darkoLoaded: false,
				wowyRows: [],
				wowyLoaded: false
			}
		];
		return true;
	}

	async function loadHistory(nbaId, kind) {
		if (!isPlayerIdForHistory(nbaId, kind)) return [];
		const player = selectedPlayers.find((entry) => entry.nba_id === nbaId);
		if (!player) return [];
		const loadedKey = kind === 'wowy' ? 'wowyLoaded' : 'darkoLoaded';
		const rowsKey = kind === 'wowy' ? 'wowyRows' : 'rows';
		if (player[loadedKey]) return player[rowsKey] || [];

		const requestKey = `${kind}:${nbaId}`;
		if (historyLoads.has(requestKey)) return historyLoads.get(requestKey);

		pendingLoads += 1;
		const request = (async () => {
			const rows = kind === 'wowy'
				? await apiWowyPlayerHistory(nbaId)
				: await apiPlayerHistory(nbaId, { full: true, view: 'trajectory' });
			const first = rows[0];
			selectedPlayers = selectedPlayers.map((entry) =>
				entry.nba_id === nbaId
					? {
						...entry,
						[rowsKey]: rows,
						[loadedKey]: true,
						player_name: first?.player_name || entry.player_name,
						team_name: first?.team_name || entry.team_name
					}
					: entry
			);
			return rows;
		})().finally(() => {
			historyLoads.delete(requestKey);
			pendingLoads = Math.max(0, pendingLoads - 1);
		});
		historyLoads.set(requestKey, request);
		return request;
	}

	async function ensureSelectedHistories(kind) {
		const playersToLoad = selectedPlayers.filter((player) =>
			isPlayerIdForHistory(player.nba_id, kind) &&
			(kind === 'wowy' ? !player.wowyLoaded : !player.darkoLoaded)
		);
		if (playersToLoad.length === 0) return;

		const results = await Promise.allSettled(
			playersToLoad.map((player) => loadHistory(player.nba_id, kind))
		);
		const failed = results.find((result) => result.status === 'rejected');
		if (failed) error = failed.reason?.message || `Failed to load ${kind.toUpperCase()} history`;
	}

	async function loadWowyPublication() {
		if (wowyPublicationRequested) return;
		wowyPublicationRequested = true;
		try {
			wowyPublication = await apiWowyPublication();
		} catch (publicationError) {
			wowyPublicationRequested = false;
			error = publicationError?.message || 'Failed to load WOWY publication metadata';
		}
	}

	async function preloadPlayersById(idList, historyKind = null) {
		if (!Array.isArray(idList) || idList.length === 0) return;
		const kind = historyKind ?? (isWowyMetric ? 'wowy' : 'darko');
		const uniqueIds = [...new Set(
			idList
				.map((id) => Number.parseInt(id, 10))
				.filter((id) => isPlayerIdForHistory(id, kind))
		)];
		for (const nbaId of uniqueIds) {
			addPlayerShell({ nba_id: nbaId, label: starterPlayerById.get(nbaId)?.label }, kind);
		}

		const results = await Promise.allSettled(
			uniqueIds.map((nbaId) => loadHistory(nbaId, kind))
		);
		for (const [index, result] of results.entries()) {
			if (result.status === 'rejected') {
				error = error || result.reason?.message || `Failed to load player ${uniqueIds[index]}`;
			}
		}
	}

	// Load players from URL params on mount
	$effect(() => {
		if (initialLoadDone) return;
		const requestedMetric = $page.url.searchParams.get('metric');
		const requestedScale = $page.url.searchParams.get('scale');
		if (talentTypes.some((option) => option.key === requestedMetric)) {
			talentType = requestedMetric;
		}
		if (timeScaleOptions.some((option) => option.key === requestedScale)) {
			timeScale = requestedScale;
		}

		const initialKind = WOWY_METRICS.has(talentType) ? 'wowy' : 'darko';
		const ids = $page.url.searchParams.get('ids');
		if (ids) {
			const idList = ids.split(',');
			preloadPlayersById(idList, initialKind);
		} else {
			loadRandomPlayer(initialKind);
		}
		initialLoadDone = true;
	});

	$effect(() => {
		if (!initialLoadDone) return;
		const kind = isWowyMetric ? 'wowy' : 'darko';
		void ensureSelectedHistories(kind);
		if (isWowyMetric) void loadWowyPublication();
	});

	// Sync selected player IDs and chart controls to URL
	$effect(() => {
		if (!initialLoadDone || loading) return;
		const ids = selectedPlayers.map((p) => p.nba_id).join(',');
		const currentIds = $page.url.searchParams.get('ids') || '';
		const desiredMetric = talentType === 'dpm' ? null : talentType;
		const desiredScale = timeScale === 'games' ? null : timeScale;
		const currentMetric = $page.url.searchParams.get('metric');
		const currentScale = $page.url.searchParams.get('scale');
		if (
			ids !== currentIds ||
			desiredMetric !== currentMetric ||
			desiredScale !== currentScale
		) {
			const url = new URL($page.url);
			if (ids) {
				url.searchParams.set('ids', ids);
			} else {
				url.searchParams.delete('ids');
			}
			if (desiredMetric) {
				url.searchParams.set('metric', desiredMetric);
			} else {
				url.searchParams.delete('metric');
			}
			if (desiredScale) {
				url.searchParams.set('scale', desiredScale);
			} else {
				url.searchParams.delete('scale');
			}
			goto(`${url.pathname}${url.search}`, { replaceState: true, keepFocus: true });
		}
	});

	async function loadPlayerById(nbaId) {
		const starter = STARTER_PLAYERS.find((player) => player.nbaId === nbaId);
		const kind = isWowyMetric ? 'wowy' : 'darko';
		if (!addPlayerShell({ nba_id: nbaId, label: starter?.label }, kind)) return;
		error = null;
		try {
			const rows = await loadHistory(nbaId, kind);
			if (rows.length === 0) {
				error = `No ${selectedMetricLabel} history found for player ${nbaId}`;
			}
		} catch (err) {
			error = err.message;
		}
	}

	async function loadRandomPlayer(historyKind = null) {
		pendingLoads += 1;
		error = null;
		try {
			const players = await apiActivePlayers({ view: 'random' });
			if (players.length === 0) {
				error = 'No players available for random selection.';
				return;
			}

			const randomIndex = Math.floor(Math.random() * players.length);
			const randomPlayer = players[randomIndex];
			const kind = historyKind ?? (isWowyMetric ? 'wowy' : 'darko');
			if (addPlayerShell(randomPlayer, kind)) {
				await loadHistory(randomPlayer.nba_id, kind);
			}
		} catch (err) {
			error = err.message;
		} finally {
			pendingLoads = Math.max(0, pendingLoads - 1);
		}
	}

	async function addPlayer(player) {
		const kind = isWowyMetric ? 'wowy' : 'darko';
		if (!addPlayerShell(player, kind)) return;
		error = null;
		try {
			const rows = await loadHistory(player.nba_id, kind);
			if (rows.length === 0) {
				error = `No ${selectedMetricLabel} history found for ${player.player_name}`;
			}
		} catch (err) {
			error = err.message;
		}
	}

	function removePlayer(nbaId) {
		selectedPlayers = selectedPlayers
			.filter((p) => p.nba_id !== nbaId)
			.map((p, i) => ({
				...p,
				color: getSeriesColor(i, displayMode.view)
			}));
	}
</script>

<svelte:head>
	<title>Player Career Trajectories - DARKO DPM</title>
</svelte:head>

<div class="trajectory-page" data-shiny-page>
	<div class="container trajectory-container">
		<PageHeader id="trajectory-title" title="Player Career Trajectories" lede="Compare career arcs for any number of players." />

		<div class="trajectory-workspace" data-shiny-layout="sidebar">
			<aside class="trajectory-controls" data-shiny-surface="well" aria-label="Trajectory controls">
				<!-- On phones and tablets the chart settings fold away so the chart comes first. -->
				<button
					type="button"
					class="btn chart-options-toggle"
					aria-expanded={chartOptionsOpen}
					aria-controls="trajectory-chart-options"
					onclick={() => (chartOptionsOpen = !chartOptionsOpen)}
				>
					<span>Chart options</span>
					<span class="chart-options-summary">{selectedMetricLabel} · by {timeScale === 'seasons' ? 'season' : timeScale === 'age' ? 'age' : 'game'}</span>
				</button>
				<div id="trajectory-chart-options" class="chart-options" class:open={chartOptionsOpen}>
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
						{#if isWowyMetric}
							{#if wowyPublicationLabel}
								<div class="metric-freshness">{wowyPublicationLabel}</div>
							{/if}
							<!-- Daily WOWY reaches back into the ABA, so its linkage is disclosed where it is charted. -->
							<p class="metric-note">
								Includes ABA seasons. The ABA-to-NBA level is explicitly unidentified from 1967-68 through
								1970-71 and identified from 1971-72 through 1975-76.
							</p>
						{/if}
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
				</div>

				<div class="control-group player-control-group">
					<span class="control-label">Select Players to Compare</span>
					<div class="player-chip-list">
						{#each selectedPlayers as p, index (p.nba_id)}
							<span class="player-chip" style:--player-color={getSeriesColor(index, displayMode.view)}>
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
					<div class="trajectory-starter-grid" aria-label="Starter players">
						{#each STARTER_PLAYERS as starter (starter.nbaId)}
							<button
								type="button"
								class="trajectory-starter"
								onclick={() => loadPlayerById(starter.nbaId)}
								disabled={loading || selectedPlayers.some((p) => p.nba_id === starter.nbaId)}
							>
								<strong>{starter.label}</strong>
								<span>{starter.detail}</span>
							</button>
						{/each}
					</div>
				</div>
			</aside>

			<main class="trajectory-main">
				<section class="trajectory-chart-area" data-shiny-surface="plot" aria-label="Career trajectory chart">
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

					{#if selectedPlayers.length > 0 && hasChartRows}
						<TrajectoryChart
							players={chartData}
							{timeScale}
							{talentType}
							title={chartTitle}
							yMin={yAxisMin}
							yMax={yAxisMax}
						/>
					{:else if selectedPlayers.length > 0 && !loading}
						<div class="trajectory-message empty-state trajectory-empty-state">
							<strong>No {selectedMetricLabel} history is available for the selected players.</strong>
						</div>
					{:else if !loading}
						<div class="trajectory-message empty-state trajectory-empty-state">
							<strong>Start with a player search or one of the examples.</strong>
							<span>Career charts appear here once at least one player is selected.</span>
							<div class="trajectory-empty-actions" aria-label="Example trajectory players">
								{#each STARTER_PLAYERS.slice(0, 3) as starter (starter.nbaId)}
									<button
										type="button"
										onclick={() => loadPlayerById(starter.nbaId)}
										disabled={loading}
									>
										{starter.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</section>

				{#if selectedPlayers.length > 0 && hasChartRows}
					<section class="stat-strip trajectory-stat-strip" aria-label="Trajectory summary">
						{#each trajectoryStats as card (card.label)}
							<StatTile label={card.label} value={card.value} detail={card.detail} />
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
		padding: 0 0 34px;
		background: var(--bg);
	}

	.trajectory-container {
		max-width: 1880px;
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

	.chart-options-toggle {
		display: none;
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

	.metric-freshness {
		margin-top: 7px;
		font-size: 12px;
		font-weight: 650;
		color: var(--text-muted);
	}

	.metric-note {
		margin-top: 6px;
		color: var(--text-muted);
		font-size: 12px;
		line-height: 1.4;
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

	.trajectory-empty-state {
		display: grid;
		gap: 10px;
		max-width: 620px;
		margin: 0 auto;
	}

	.trajectory-empty-state strong {
		color: var(--text);
		font-size: 16px;
	}

	.trajectory-empty-state span {
		color: var(--text-secondary);
	}

	.trajectory-starter-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}

	.trajectory-starter,
	.trajectory-empty-actions button {
		appearance: none;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--text);
		cursor: pointer;
		font-family: var(--font-sans);
		text-align: left;
		transition: border-color 0.15s, background-color 0.15s, color 0.15s;
	}

	.trajectory-starter {
		display: grid;
		gap: 2px;
		padding: 9px 10px;
	}

	.trajectory-starter:hover:not(:disabled),
	.trajectory-empty-actions button:hover:not(:disabled) {
		border-color: var(--accent);
		background: var(--bg-elevated);
	}

	.trajectory-starter:disabled,
	.trajectory-empty-actions button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.trajectory-starter strong {
		font-size: 12px;
		font-weight: 850;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.trajectory-starter span {
		color: var(--text-secondary);
		font-size: 11px;
		line-height: 1.2;
	}

	.trajectory-empty-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
	}

	.trajectory-empty-actions button {
		padding: 8px 10px;
		font-size: 12px;
		font-weight: 800;
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

	.trajectory-stat-strip {
		--stat-tile-min: 150px;
		margin: 18px 0 0;
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
	}

	@media (max-width: 980px) {
		.trajectory-workspace {
			grid-template-columns: 1fr;
		}

		.trajectory-controls {
			position: static;
		}

		.chart-options-toggle {
			display: flex;
			justify-content: space-between;
			width: 100%;
			margin-bottom: 14px;
		}

		.chart-options-summary {
			overflow: hidden;
			color: var(--text-muted);
			font-weight: 500;
			text-overflow: ellipsis;
		}

		.chart-options:not(.open) {
			display: none;
		}
	}

	@media (max-width: 768px) {
		.trajectory-page {
			padding: 0 0 26px;
		}

		.trajectory-workspace {
			grid-template-columns: 1fr;
			align-items: stretch;
		}

		.trajectory-chart-area {
			width: 100%;
			min-width: 0;
		}

		.trajectory-starter-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
