<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SocialMetadata from '$lib/components/SocialMetadata.svelte';
	import AllPlayerSearch from '$lib/components/AllPlayerSearch.svelte';
	import CompsFutures from '$lib/components/CompsFutures.svelte';
	import EchoesToday from '$lib/components/EchoesToday.svelte';
	import ProjectedBoxScore from '$lib/components/ProjectedBoxScore.svelte';
	import SeasonBySeason from '$lib/components/SeasonBySeason.svelte';
	import LongevityCareerLengthChart from '$lib/components/LongevityCareerLengthChart.svelte';
	import OffenseDefenseBar from '$lib/components/OffenseDefenseBar.svelte';
	import OffenseDefenseGlyph from '$lib/components/OffenseDefenseGlyph.svelte';
	import OffenseDefenseSplit from '$lib/components/OffenseDefenseSplit.svelte';
	import SeismographChart from '$lib/components/SeismographChart.svelte';
	import TalentPercentilesChart from '$lib/components/TalentPercentilesChart.svelte';
	import TalentTrendChart from '$lib/components/TalentTrendChart.svelte';
	import WatchStar from '$lib/components/WatchStar.svelte';
	import { apiActivePlayers } from '$lib/api.js';
	import { createRequestSequencer } from '$lib/utils/requestSequencer.js';
	import {
		buildSeismograph,
		formatGameDate,
		formatSigned,
		getSeismographSeasons,
		lastPlayedDate,
		seasonLabel
	} from '$lib/utils/seismograph.js';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { unpackRows } from '$lib/utils/columnar.js';
	import { normalizeComps } from '$lib/utils/comps.js';
	import { AS_OF_PARAM, formatAsOfDate, parseAsOfDate } from '$lib/utils/timeMachine.js';
	import { isRapmMetric, staleRapmDate } from '$lib/utils/latestRapm.js';
	import { seasonRows, seasonUnderWay } from '$lib/utils/playerSeasons.js';
	import { projectedBoxScore } from '$lib/utils/boxScore.js';
	import { seasonOfRow } from '$lib/utils/seismograph.js';
	import {
		careerGames,
		compsSummary,
		contractTiles,
		formatHeight,
		profileSections
	} from '$lib/utils/playerProfile.js';
	import { percentileAmong, SKILL_LABELS, SKILL_METRICS, withSkillRates } from '$lib/utils/playerSkills.js';

	let { data } = $props();

	const TALENT_OPTIONS = [
		{ value: 'dpm', label: 'DPM' },
		{ value: 'o_dpm', label: 'Offense' },
		{ value: 'd_dpm', label: 'Defense' },
		{ value: 'box_dpm', label: 'Box DPM' },
		{ value: 'box_odpm', label: 'Box offense' },
		{ value: 'box_ddpm', label: 'Box defense' },
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

	// The ratings, the redesign's ten skills (SKILL_METRICS), and the rest of the shooting.
	const PERCENTILE_GROUPS = [
		{
			label: 'Ratings',
			options: [
				{ value: 'dpm', label: 'DPM' },
				{ value: 'o_dpm', label: 'Offense' },
				{ value: 'd_dpm', label: 'Defense' },
				{ value: 'on_off_dpm', label: 'On/Off DPM' },
				{ value: 'bayes_rapm_total', label: 'RAPM' }
			]
		},
		{
			label: 'Skills',
			options: [
				{ value: 'x_pts_100', label: 'Scoring' },
				{ value: 'ts_pct', label: 'Efficiency (TS%)' },
				{ value: 'x_ft_pct', label: 'Touch (FT%)' },
				{ value: 'x_fg3a_100', label: '3PT volume' },
				{ value: 'x_ast_100', label: 'Playmaking' },
				{ value: 'tov_pct', label: 'Ball security' },
				{ value: 'x_orb_100', label: 'Off. boards' },
				{ value: 'x_drb_100', label: 'Def. boards' },
				{ value: 'x_blk_100', label: 'Rim protection' },
				{ value: 'x_stl_100', label: 'Steals' }
			]
		},
		{
			label: 'Shooting',
			options: [
				{ value: 'x_fg_pct', label: 'FG%' },
				{ value: 'x_fg3_pct', label: '3P%' },
				{ value: 'tr_fg3_pct', label: '3P% (trend)' },
				{ value: 'tr_ft_pct', label: 'FT% (trend)' }
			]
		}
	];
	// Worth against style: the five ratings (the default), or the ten skills.
	const PERCENTILE_PRESETS = {
		ratings: PERCENTILE_GROUPS[0].options.map((option) => option.value),
		skills: [...SKILL_METRICS]
	};

	let allActivePlayers = $state([]);
	let percentilesLoading = $state(true);
	let percentileNotice = $state(null);
	let talentType = $state('dpm');
	let selectedPercentileMetrics = $state([...PERCENTILE_PRESETS.ratings]);
	let imgFailed = $state(false);
	let pickedSeason = $state(null);
	let showGameLog = $state(false);
	const loadSeq = createRequestSequencer();

	const nbaId = $derived(data.nbaId ?? data.playerInfo?.nba_id ?? null);
	const playerInfo = $derived(data.playerInfo ?? null);
	const historyRows = $derived(data.history ? unpackRows(data.history) : (data.historyRows ?? []));
	const historyMeta = $derived(data.historyMeta ?? { truncated: false, maxRows: null });
	const comps = $derived(normalizeComps(data.comps));

	// With the Time Machine set, the sidebar rating and the Seismograph follow that date.
	const asOfDate = $derived(parseAsOfDate($page.url.searchParams.get(AS_OF_PARAM)));
	// Season by season: in the Time Machine only seasons over by its date; in season, a current
	// player's current season (a recent next-game row with a real team) is marked "so far". A
	// retired player's last row also has a real team, which alone would mark their final season.
	const inProgressSeason = $derived.by(() => {
		const latest = historyRows.at(-1);
		return seasonUnderWay(latest) && !asOfDate && isCurrentPlayer ? Number(latest.season) : null;
	});
	// The player's last game played (not the next game's forecast row).
	const lastPlayed = $derived(lastPlayedDate(historyRows));
	const seasonsTable = $derived(seasonRows(data.seasons, { asOf: asOfDate, inProgress: inProgressSeason }));
	const echoes = $derived(data.echoes ?? []);
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

	// Only current players have a projection worth showing: a retired player's last row still
	// carries the projections from his final season.
	const isCurrentPlayer = $derived(Boolean(playerInfo) && Number(playerInfo.active_roster) === 1);
	const boxScore = $derived(
		playerInfo && !asOfDate && isCurrentPlayer ? projectedBoxScore(playerInfo) : null
	);

	// Today's rank on the board, and the team to open in the Roster Lab (current players only).
	const rankLabel = $derived(
		data.dpmRank && !asOfDate ? `#${data.dpmRank.rank} of ${data.dpmRank.of}` : null
	);
	const labTeam = $derived(isCurrentPlayer && !asOfDate ? teamAbbr(playerInfo.team_name) : null);

	// Contract & longevity: today's figures, so current players only and not in the Time Machine.
	// Between seasons (no season in progress) the placeholder row's WARP is left out.
	const contract = $derived(
		isCurrentPlayer && !asOfDate ? contractTiles(playerInfo, { inSeason: inProgressSeason !== null }) : []
	);
	// How the latest season ranks for its age, and the closest comp, over Comps & futures.
	const compsLine = $derived(asOfDate ? null : compsSummary(seasonsTable, comps));

	// The player's row with the two skill rates (true shooting, turnovers per play) added.
	const skillInfo = $derived(withSkillRates(playerInfo));

	const percentiles = $derived.by(() => {
		if (!skillInfo || allActivePlayers.length === 0) return [];

		const position = skillInfo.position;
		const positionPlayers = (
			position ? allActivePlayers.filter((player) => player.position === position) : allActivePlayers
		).map(withSkillRates);

		if (positionPlayers.length === 0) return [];

		// A metric with no value for this player (or anyone) is left out, not drawn at the 0th
		// percentile. For turnovers, fewer is better.
		return selectedPercentileMetrics.map((metric) => {
			const playerValue = Number.parseFloat(skillInfo[metric]);
			if (Number.isNaN(playerValue)) return null;

			const values = positionPlayers
				.map((player) => Number.parseFloat(player[metric]))
				.filter((value) => !Number.isNaN(value));

			if (values.length === 0) return null;

			return { metric, value: percentileAmong(playerValue, values, metric) };
		}).filter(Boolean);
	});

	// RAPM hasn't come with each day's ratings since March: the percentiles use each player's
	// latest published value, and say how old it is.
	const percentileRapmFrom = $derived(
		isRapmMetric(selectedPercentileMetrics.find(isRapmMetric)) ? staleRapmDate([playerInfo]) : null
	);

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

	// Two lines under the name: who the player is (age, size, country), then the career (draft,
	// rookie season, games).
	const playerBioText = $derived.by(() => {
		if (!playerInfo) return '';
		const parts = [];
		if (playerInfo.age) parts.push('Age ' + Math.floor(playerInfo.age));
		const height = formatHeight(playerInfo.height);
		if (height) parts.push(height);
		if (Number(playerInfo.weight) > 0) parts.push(Math.round(playerInfo.weight) + ' lb');
		if (playerInfo.country) parts.push(playerInfo.country);
		return parts.join(' · ');
	});

	const playerDetailText = $derived.by(() => {
		if (!playerInfo) return '';
		const parts = [];
		if (playerInfo.draft_year) {
			let d = '';
			if (playerInfo.draft_slot) d += 'Pick #' + Math.round(playerInfo.draft_slot) + ', ';
			d += Math.round(playerInfo.draft_year) + ' Draft';
			parts.push(d);
		}
		if (playerInfo.rookie_season) parts.push('Rookie ' + playerInfo.rookie_season);
		// The season table starts in 1996-97, so an earlier debut's games count from there.
		const games = careerGames(data.seasons);
		const since = Number(playerInfo.rookie_season) < 1997 ? ' since 1996-97' : '';
		if (games.regular > 0) parts.push(`${games.regular.toLocaleString('en-US')} games${since}`);
		if (games.playoffs > 0) parts.push(`${games.playoffs.toLocaleString('en-US')} playoff games`);
		return parts.join(' · ');
	});

		const hasLongevityData = $derived(
		longevityPlayer !== null &&
		longevityPlayer.p1 !== null
	);
	// The roster-odds chart projects from today, so it sits with the contract figures and, like
	// them, only for current players outside the Time Machine.
	const showLongevity = $derived(hasLongevityData && isCurrentPlayer && !asOfDate);
	const showContract = $derived(contract.length > 0 || showLongevity);

	// The jump menu lists the sections this player's page shows, in page order.
	const sections = $derived(
		profileSections({
			seismograph: Boolean(seismograph),
			comps: comps.length > 0 && !asOfDate,
			echoes: echoes.length > 0 && !asOfDate,
			career: Boolean(playerInfo),
			contract: showContract,
			seasons: seasonsTable.length > 0,
			percentiles: allActivePlayers.length > 0,
			'box-score': Boolean(boxScore)
		})
	);

	// The jump menu marks the section in view, and names the player once the header has gone by.
	let jumpNav = $state(null);
	let activeSection = $state(null);
	let jumpStuck = $state(false);

	$effect(() => {
		if (!jumpNav) return;
		const ids = sections.map((section) => section.id);
		let frame = 0;
		const update = () => {
			frame = 0;
			if (!jumpNav) return;
			const bar = jumpNav.getBoundingClientRect();
			let current = null;
			for (const id of ids) {
				const top = document.getElementById(id)?.getBoundingClientRect().top;
				if (top !== undefined && top <= bar.bottom + 24) current = id;
			}
			// At the foot of the page the last section is the one being read, however short.
			const root = document.documentElement;
			if (current && window.innerHeight + window.scrollY >= root.scrollHeight - 2) current = ids.at(-1);
			activeSection = current;
			// Stuck once the bar sits at its sticky offset; resting under the header it is lower,
			// and in the Shiny view (not sticky) the offset is "auto", so never.
			const stickyTop = Number.parseFloat(getComputedStyle(jumpNav).top);
			jumpStuck = Number.isFinite(stickyTop) && Math.abs(bar.top - stickyTop) < 1;
		};
		const schedule = () => {
			if (!frame) frame = requestAnimationFrame(update);
		};
		schedule();
		window.addEventListener('scroll', schedule, { passive: true });
		window.addEventListener('resize', schedule);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener('scroll', schedule);
			window.removeEventListener('resize', schedule);
		};
	});

	// On a phone the links scroll sideways; the marked one is brought into view.
	$effect(() => {
		if (!jumpNav || !activeSection || jumpNav.scrollWidth <= jumpNav.clientWidth) return;
		const link = jumpNav.querySelector(`a[href="#${activeSection}"]`);
		if (!link) return;
		const hidden =
			link.offsetLeft < jumpNav.scrollLeft ||
			link.offsetLeft + link.offsetWidth > jumpNav.scrollLeft + jumpNav.clientWidth;
		if (hidden) jumpNav.scrollTo({ left: link.offsetLeft - 16, behavior: 'smooth' });
	});

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

<SocialMetadata metadata={data.social} />

<svelte:head>
	<title>{playerInfo?.player_name || 'Player'} Profile — DARKO DPM</title>
</svelte:head>

{#snippet talentTrendControl(id)}
	<div class="sidebar-section talent-trend-control">
		<label class="sidebar-label" for={id}>Talent Trend</label>
		<select {id} class="sidebar-select" bind:value={talentType}>
			{#each TALENT_OPTIONS as opt (opt.value)}
				<option value={opt.value}>{opt.label}</option>
			{/each}
		</select>
	</div>
{/snippet}

{#snippet percentilePresets()}
	<div class="percentile-presets" role="group" aria-label="Percentile sets">
		{#each Object.entries(PERCENTILE_PRESETS) as [name, metrics] (name)}
			{@const active = metrics.length === selectedPercentileMetrics.length && metrics.every((metric) => selectedPercentileMetrics.includes(metric))}
			<button
				type="button"
				class:active
				aria-pressed={active}
				onclick={() => (selectedPercentileMetrics = [...metrics])}
			>
				{name === 'skills' ? 'Skills' : 'Ratings'}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet percentileCheckboxes()}
	<div class="percentile-checkboxes">
		{#each PERCENTILE_GROUPS as group (group.label)}
			<div class="percentile-group-options">
				<p class="percentile-group">{group.label}</p>
				{#each group.options as opt (opt.value)}
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
		{/each}
	</div>
{/snippet}

<!-- One tree for both views. The Modern view puts the player in a full-width header, with each
     chart's controls beside the chart; the Shiny view keeps its sidebar, controls and all. -->
<div class="container player-profile-page" data-shiny-page>
	<div class="profile-layout" data-shiny-layout="sidebar">
		<div class="profile-sidebar" data-shiny-surface="well">
			<div class="sidebar-section profile-search">
				<p class="sidebar-label">Player</p>
				<AllPlayerSearch onSelect={handleSelectPlayer} exclude={[]} />
			</div>

			{#if playerInfo}
				<header class="profile-header">
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
					<div class="profile-id">
						<div class="player-title">
							<h1>{playerInfo.player_name}</h1>
							{#if nbaId}<WatchStar nbaId={nbaId} name={playerInfo.player_name} />{/if}
						</div>
						<p class="player-meta">
							{[playerInfo.team_name, playerInfo.position || '?'].filter(Boolean).join(' · ')}
						</p>
						{#if playerBioText}<p class="player-detail">{playerBioText}</p>{/if}
						{#if playerDetailText}<p class="player-detail">{playerDetailText}</p>{/if}
					</div>
					{#if asOfDate && !playerRating}
						<p class="profile-score profile-score-note">
							No DARKO rating yet on {formatAsOfDate(asOfDate)}.
						</p>
					{/if}
					{#if playerRating}
						<div class="profile-score">
							<p class="profile-score-label">
								DPM{#if asOfDate && asOfRow}<span class="profile-asof">{' · '}{formatAsOfDate(asOfRow.date.slice(0, 10), { short: true })}</span>{:else if rankLabel}<span class="profile-rank">{' · '}{rankLabel}</span>{/if}
							</p>
							<span class="profile-score-value">{formatSigned(playerRating.dpm, 1)}</span>
							<div class="profile-score-split">
								<OffenseDefenseBar offense={playerRating.offense} defense={playerRating.defense} />
								<OffenseDefenseSplit
									offense={playerRating.offense}
									defense={playerRating.defense}
									labels
								/>
								{#if !asOfDate && lastPlayed}
									<span class="profile-score-date">Last played {formatAsOfDate(lastPlayed, { short: true })}</span>
								{/if}
							</div>
						</div>
					{/if}
					<div class="profile-actions">
						<a href="/compare?ids={nbaId}" class="btn compare-link">Compare this player</a>
						<a href="/assistant?chart={encodeURIComponent(`https://www.darko.app/trajectories?ids=${nbaId}`)}" class="btn">Explore in an assistant</a>
						{#if labTeam}
							<a href="/lab?a={labTeam}" class="btn compare-link">Open {labTeam} in the Roster Lab</a>
						{/if}
					</div>
				</header>
			{/if}

			<!-- The Shiny view's sidebar controls; the Modern view shows each over its chart. -->
			<div class="sidebar-controls">
				{@render talentTrendControl('talent-trend-select-sidebar')}
				<div class="sidebar-section">
					<p class="sidebar-label">Talent Percentiles</p>
					{@render percentilePresets()}
					{@render percentileCheckboxes()}
				</div>
			</div>
		</div>

		<div class="profile-content">
			{#if playerInfo}
				{#if sections.length > 1}
					<nav
						class="profile-jump"
						class:stuck={jumpStuck}
						bind:this={jumpNav}
						aria-label="Sections of {playerInfo.player_name}'s page"
					>
						<span class="profile-jump-name" aria-hidden="true">{playerInfo.player_name}</span>
						{#each sections as section (section.id)}
							<a
								href="#{section.id}"
								class:active={activeSection === section.id}
								aria-current={activeSection === section.id ? 'location' : undefined}
							>
								{section.label}
							</a>
						{/each}
					</nav>
				{/if}

				{#if seismograph}
					<section
						class="chart-panel seismograph-panel"
						id="seismograph"
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
							class="btn btn-sm seismograph-log-toggle"
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

				<!-- Comps come from today's ratings, so the Time Machine hides them. -->
				{#if comps.length > 0 && !asOfDate}
					<section
						class="chart-panel comps-panel"
						id="comps"
						data-shiny-surface="plot"
						aria-labelledby="comps-title"
					>
						<header class="seismograph-header">
							<div>
								<p class="seismograph-kicker" data-shiny-role="editorial-kicker">Historical comps</p>
								<h2 id="comps-title">Comps &amp; futures</h2>
								<p class="seismograph-lede">
									The ten most similar player-seasons since 1996-97 at the same age, and what
									happened to them next.
								</p>
								{#if compsLine}
									<p class="comps-summary">
										<strong>{compsLine.dpm} at age {compsLine.age}</strong> in {compsLine.season}{compsLine.inProgress ? ' so far' : ''}
										ranks <strong>{compsLine.rank} of {compsLine.count}</strong> age-{compsLine.age} seasons since 1996-97.
										{#if compsLine.closest}
											Closest match:
											<a href="/player/{compsLine.closest.id}">{compsLine.closest.name}</a>, {compsLine.closest.season}.
										{/if}
									</p>
								{/if}
							</div>
						</header>
						<CompsFutures {comps} history={historyRows} playerName={playerInfo.player_name} />
					</section>
				{/if}

				<!-- Echoes read today's comps backwards, so the Time Machine hides them too. -->
				{#if echoes.length > 0 && !asOfDate}
					<section
						class="chart-panel comps-panel"
						id="echoes"
						data-shiny-surface="panel"
						aria-labelledby="echoes-title"
					>
						<header class="seismograph-header">
							<div>
								<p class="seismograph-kicker" data-shiny-role="editorial-kicker">Historical comps</p>
								<h2 id="echoes-title">Echoes today</h2>
								<p class="seismograph-lede">
									Current players whose ten closest comps include one of {playerInfo.player_name}'s
									seasons, at the same age.
								</p>
							</div>
						</header>
						<EchoesToday {echoes} />
					</section>
				{/if}

				<div class="chart-panel" id="career" data-shiny-surface="plot">
					<div class="panel-controls">
						{@render talentTrendControl('talent-trend-select')}
					</div>
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

				{#if showContract}
					<section
						class="chart-panel comps-panel"
						id="contract"
						data-shiny-surface="panel"
						aria-labelledby="contract-title"
					>
						<header class="seismograph-header">
							<div>
								<p class="seismograph-kicker" data-shiny-role="editorial-kicker">Value</p>
								<h2 id="contract-title">Contract &amp; longevity</h2>
								<p class="seismograph-lede">
									DARKO's fair salary from projected wins against {playerInfo.player_name}'s salary,
									and the odds of still being on an NBA roster in each coming season.
								</p>
							</div>
						</header>
						<div class="contract-body" class:contract-body--tiles-only={!showLongevity}>
							{#if contract.length > 0}
								<dl class="contract-tiles">
									{#each contract as tile (tile.key)}
										<div class="contract-tile">
											<dt>{tile.label}</dt>
											<dd class="contract-value contract-value--{tile.tone ?? 'plain'}">{tile.value}</dd>
											<dd class="contract-note">{tile.note}</dd>
										</div>
									{/each}
								</dl>
							{/if}
							{#if showLongevity}
								<div class="contract-chart">
									<LongevityCareerLengthChart player={longevityPlayer} />
								</div>
							{/if}
						</div>
					</section>
				{/if}

				{#if seasonsTable.length > 0}
					<section
						class="chart-panel comps-panel"
						id="seasons"
						data-shiny-surface="panel"
						aria-labelledby="seasons-title"
					>
						<header class="seismograph-header">
							<div>
								<p class="seismograph-kicker" data-shiny-role="editorial-kicker">Career</p>
								<h2 id="seasons-title">Season by season</h2>
								<p class="seismograph-lede">DPM going into each season's last game, since 1996-97.</p>
							</div>
						</header>
						<SeasonBySeason rows={seasonsTable} playerName={playerInfo.player_name} />
					</section>
				{/if}

				{#if percentilesLoading}
					<div class="chart-panel" data-shiny-surface="panel">
						<div class="loading">Loading percentile context...</div>
					</div>
				{:else if percentileNotice}
					<div class="chart-panel" data-shiny-surface="panel">
						<p class="percentile-notice">{percentileNotice}</p>
					</div>
				{:else if allActivePlayers.length > 0}
					<div class="chart-panel" id="percentiles" data-shiny-surface="plot">
						<div class="panel-controls">
							<p class="sidebar-label">Talent Percentiles</p>
							{@render percentilePresets()}
							<details class="percentile-picker">
								<summary>Choose metrics ({selectedPercentileMetrics.length})</summary>
								{@render percentileCheckboxes()}
							</details>
						</div>
						<TalentPercentilesChart
							playerName={playerInfo.player_name}
							position={playerInfo.position}
							date={currentDate}
							{percentiles}
							selectedMetrics={selectedPercentileMetrics}
							rawValues={skillInfo}
							labels={SKILL_LABELS}
						/>
						{#if percentileRapmFrom}
							<p class="percentile-notice">RAPM is from {formatAsOfDate(percentileRapmFrom)}, the latest published.</p>
						{/if}
					</div>
				{/if}

				{#if boxScore}
					<section
						class="chart-panel comps-panel"
						id="box-score"
						data-shiny-surface="panel"
						aria-labelledby="box-score-title"
					>
						<header class="seismograph-header">
							<div>
								<p class="seismograph-kicker" data-shiny-role="editorial-kicker">Projections</p>
								<h2 id="box-score-title">Projected box score</h2>
								<p class="seismograph-lede">
									{#if boxScore.projected}
										DARKO's per-100 projections, and per game at {boxScore.minutes.toFixed(1)} projected minutes
										and a pace of {boxScore.pace?.toFixed(1) ?? '—'}.
									{:else}
										DARKO's per-100 projections. It projects no minutes for {playerInfo.player_name} right now,
										so there is no per-game line.
									{/if}
								</p>
							</div>
						</header>
						<ProjectedBoxScore box={boxScore} playerName={playerInfo.player_name} />
					</section>
				{/if}
			{/if}
		</div>
	</div>
</div>

<style>
	/* Search, then the player's header, then the sections, each the page's full width. The Shiny
	   view lays the same tree out as its sidebar (src/shiny-view.css). */
	.profile-layout {
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 20px 0 64px;
	}

	.profile-sidebar {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.profile-search {
		align-self: flex-end;
		width: min(100%, 360px);
	}

	/* The sidebar's own label and controls are for the Shiny view. */
	.profile-search .sidebar-label,
	.sidebar-controls {
		display: none;
	}

	/* The photo, who the player is, the rating on the right, and the actions under the name. */
	.profile-header {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas:
			'photo id score'
			'photo actions score';
		align-items: center;
		gap: 10px 28px;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--border);
	}

	.profile-headshot {
		grid-area: photo;
	}

	.profile-headshot .headshot-img {
		display: block;
		width: 164px;
		height: 120px;
		object-fit: cover;
		object-position: top;
		border-radius: var(--radius);
		background: var(--bg-elevated);
	}

	.profile-headshot .headshot-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 120px;
		height: 120px;
		border-radius: 50%;
		background: var(--bg-elevated);
		color: var(--text-muted);
		font-size: 36px;
		font-weight: 700;
	}

	.profile-id {
		grid-area: id;
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
		align-self: end;
	}

	.player-title {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.player-title h1 {
		min-width: 0;
		font-family: var(--font-display);
		font-size: clamp(32px, 3.2vw, 44px);
		font-weight: 800;
		font-stretch: 116%;
		letter-spacing: -0.015em;
		line-height: 1.05;
		color: var(--text);
		text-wrap: balance;
	}

	/* Team and position read as the line over the name. */
	.player-meta {
		order: -1;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.player-detail {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.profile-actions {
		grid-area: actions;
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-self: start;
	}

	.profile-score {
		grid-area: score;
		display: grid;
		justify-items: end;
		gap: 6px;
		text-align: right;
	}

	.profile-score-label {
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.profile-score-value {
		font-family: var(--font-display);
		font-size: clamp(52px, 5vw, 64px);
		font-weight: 800;
		font-stretch: 116%;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		line-height: 0.9;
		color: var(--text);
	}

	.profile-score-split {
		display: grid;
		justify-items: end;
		gap: 6px;
		font-size: 13px;
	}

	.profile-score-split :global(.od-bar) {
		width: 180px;
	}

	.profile-score-date {
		color: var(--text-muted);
		font-size: 12px;
	}

	.profile-score-note {
		color: var(--time-text);
		font-size: 13px;
		font-weight: 600;
	}

	/* With the Time Machine set, the date the rating is from, in its colour. */
	.profile-asof {
		color: var(--time-text);
		text-transform: none;
		letter-spacing: 0;
	}

	/* Today's rank on the board, beside the DPM label. */
	.profile-rank {
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		text-transform: none;
		letter-spacing: 0;
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

	/* Over a chart, the controls that change it. */
	.panel-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px 14px;
		margin-bottom: 8px;
	}

	.panel-controls .talent-trend-control {
		flex-direction: row;
		align-items: center;
		gap: 10px;
	}

	.panel-controls .talent-trend-control .sidebar-select {
		width: auto;
		min-width: 160px;
		padding: 6px 10px;
	}

	/* Ratings or the ten skills in one click; the boxes fine-tune either. */
	.percentile-presets {
		display: grid;
		grid-template-columns: 1fr 1fr;
		margin: 2px 0 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.panel-controls .percentile-presets {
		min-width: 190px;
		margin: 0;
	}

	.percentile-presets button {
		padding: 6px 8px;
		border: 0;
		background: var(--bg-surface);
		color: var(--text-secondary);
		font-family: var(--font-sans);
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
	}

	.percentile-presets button + button {
		border-left: 1px solid var(--border);
	}

	.percentile-presets button.active {
		background: color-mix(in srgb, var(--accent) 12%, var(--bg-surface));
		color: var(--text);
	}

	.percentile-presets button:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
	}

	.percentile-checkboxes,
	.percentile-group-options {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.percentile-group {
		margin-top: 6px;
		color: var(--text-muted);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	/* 25px to tap in the same room: the padding reaches into the 6px gap between rows. */
	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-block: 3px;
		margin-block: -3px;
		font-size: 13px;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.checkbox-label input[type='checkbox'] {
		accent-color: var(--accent);
	}

	/* Every metric, by group, one click away and out of the way until wanted. */
	.percentile-picker[open] {
		flex-basis: 100%;
	}

	.percentile-picker summary {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 10px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 12px;
		font-weight: 650;
		list-style: none;
		cursor: pointer;
	}

	.percentile-picker summary::-webkit-details-marker {
		display: none;
	}

	.percentile-picker summary::after {
		content: '▾';
		font-size: 10px;
	}

	.percentile-picker[open] summary::after {
		content: '▴';
	}

	.percentile-picker summary:hover,
	.percentile-picker summary:focus-visible {
		border-color: var(--accent);
		color: var(--text);
	}

	.percentile-picker .percentile-checkboxes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
		gap: 4px 24px;
		margin-top: 10px;
		padding: 4px 14px 12px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.profile-content {
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-width: 0;
	}

	.chart-panel {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 18px 20px;
		/* The jump menu's links land with the heading clear of the sticky nav. */
		scroll-margin-top: calc(var(--nav-sticky-offset, 64px) + var(--section-clearance, 16px));
	}

	/* The jump menu: one quiet row of links to the sections this player's page shows. It stays
	   under the site's bar as the page scrolls, marks the section in view and, once the header
	   has gone by, names the player. Section headings land clear of both. */
	.player-profile-page {
		--section-clearance: 60px;
	}

	.profile-jump {
		position: sticky;
		top: var(--nav-sticky-offset, 64px);
		z-index: 20;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 2px;
		margin: -8px 0 -4px -10px;
		padding: 4px 0;
		background: var(--bg);
	}

	.profile-jump.stuck {
		box-shadow: 0 1px 0 var(--border);
	}

	.profile-jump-name {
		display: none;
	}

	.profile-jump.stuck .profile-jump-name {
		display: inline-block;
		max-width: 15rem;
		margin-right: 6px;
		padding: 5px 12px 5px 10px;
		border-right: 1px solid var(--border);
		overflow: hidden;
		color: var(--text);
		font-family: var(--font-display);
		font-size: 14px;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.profile-jump a {
		padding: 6px 10px;
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 13px;
		font-weight: 600;
		white-space: nowrap;
	}

	.profile-jump a:hover,
	.profile-jump a:focus-visible {
		background: var(--bg-hover);
		color: var(--text);
	}

	.profile-jump a.active {
		background: var(--bg-hover);
		color: var(--text);
		box-shadow: inset 0 -2px 0 var(--accent);
	}

	/* The Shiny view keeps its sidebar layout, with the links where they sit. */
	:global(:root[data-view='shiny']) .player-profile-page {
		--section-clearance: 16px;
	}

	:global(:root[data-view='shiny']) .profile-jump {
		position: static;
	}

	:global(:root[data-view='shiny']) .profile-jump.stuck {
		box-shadow: none;
	}

	:global(:root[data-view='shiny']) .profile-jump.stuck .profile-jump-name {
		display: none;
	}

	.comps-summary {
		margin-top: 8px;
		color: var(--text-secondary);
		font-size: 13px;
		line-height: 1.5;
	}

	.comps-summary strong {
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.comps-summary a {
		color: var(--accent);
		font-weight: 650;
	}

	.comps-summary a:hover {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	/* Contract & longevity: the figures beside the roster-odds chart. */
	.contract-body {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: 24px;
		align-items: start;
	}

	.contract-body--tiles-only {
		grid-template-columns: minmax(0, 1fr);
	}

	.contract-tiles {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}

	.contract-body--tiles-only .contract-tiles {
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
	}

	.contract-tile {
		display: grid;
		gap: 2px;
		padding: 10px 12px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg);
	}

	.contract-tile dt {
		color: var(--text-secondary);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.contract-value {
		color: var(--text);
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 750;
		font-stretch: 106%;
		font-variant-numeric: tabular-nums;
	}

	.contract-value--up {
		color: var(--positive, var(--text));
	}

	.contract-value--down {
		color: var(--negative, var(--text));
	}

	.contract-note {
		color: var(--text-muted);
		font-size: 12px;
	}

	.contract-chart {
		min-width: 0;
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

	.comps-panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
		/* Ask DARKO links to #comps; the heading clears the sticky nav. */
		scroll-margin-top: calc(var(--nav-sticky-offset, 64px) + var(--section-clearance, 16px));
	}

	.seismograph-panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
		min-width: 0;
		/* What's new links to #seismograph; the heading clears the sticky nav. */
		scroll-margin-top: calc(var(--nav-sticky-offset, 64px) + var(--section-clearance, 16px));
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
		font-size: 17px;
		font-weight: 750;
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
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 750;
		font-stretch: 106%;
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
		font-size: 13px;
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

	@media (max-width: 900px) {
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

		.contract-body {
			grid-template-columns: minmax(0, 1fr);
		}

		.contract-tiles {
			grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		}

		/* The rating moves under the name: the number, then its offense and defense beside it. */
		.profile-header {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas:
				'photo id'
				'photo actions'
				'score score';
		}

		.profile-score {
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas:
				'label label'
				'value split';
			align-items: center;
			justify-items: start;
			column-gap: 18px;
			text-align: left;
		}

		.profile-score-label {
			grid-area: label;
		}

		.profile-score-value {
			grid-area: value;
		}

		.profile-score-split {
			grid-area: split;
			justify-items: start;
		}
	}

	@media (max-width: 768px) {
		.profile-layout {
			padding: 16px 0 48px;
		}

		.profile-search {
			align-self: stretch;
			width: auto;
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

		.profile-header {
			grid-template-areas:
				'photo id'
				'score score'
				'actions actions';
			gap: 12px 14px;
		}

		.profile-headshot .headshot-img {
			width: 92px;
			height: 67px;
		}

		.profile-headshot .headshot-placeholder {
			width: 64px;
			height: 64px;
			font-size: 22px;
		}

		.player-title h1 {
			font-size: 28px;
			font-stretch: 104%;
		}

		.profile-score-value {
			font-size: 44px;
			font-stretch: 108%;
		}

		.profile-actions .btn {
			flex: 1 1 auto;
		}

		/* One row of section links that scrolls sideways rather than three rows of them. */
		.profile-jump {
			flex-wrap: nowrap;
			margin-right: -16px;
			padding-right: 16px;
			overflow-x: auto;
			scrollbar-width: none;
		}

		.profile-jump::-webkit-scrollbar {
			display: none;
		}

		/* No room for the name beside the links; the site's bar names the page. */
		.profile-jump.stuck .profile-jump-name {
			display: none;
		}
	}
</style>
