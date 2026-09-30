<script>
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { browser } from '$app/environment';
	import { afterNavigate, replaceState } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContext, untrack } from 'svelte';
	import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
	import MinutesChart from '$lib/components/MinutesChart.svelte';
	import OffenseDefenseSplit from '$lib/components/OffenseDefenseSplit.svelte';
	import { getSeriesColor } from '$lib/utils/chartTheme.js';
	import { NBA_TEAMS, teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { formatAsOfDate, relativeHref, seasonLabelFromEndYear } from '$lib/utils/timeMachine.js';
	import { mergeSavedEdits, savedEditsByKey } from '$lib/utils/labStorage.js';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import { searchByName } from '$lib/utils/nameSearch.js';
	import {
		SLIDER_MAX_MINUTES,
		TEAM_MINUTES,
		WINS_PER_POINT,
		addToScenario,
		addedPlayerMinutes,
		dedupeEdits,
		defaultRoster,
		gameWinProbability,
		leagueRank,
		playersByTeam,
		rateRoster,
		rebalance,
		resetScenarioTeam,
		scenarioRoster,
		seriesWinProbability,
		winsFor
	} from '$lib/utils/rosterLab.js';
	import { foldDeepBench, minutesProfile, rosterContributions } from '$lib/utils/teamDna.js';

	let { data } = $props();

	// Saved scenarios keep each date's edits (utils/labStorage.js).
	const STORAGE_KEY = 'darko-roster-lab';
	const SIDES = ['a', 'b'];
	const DEFAULT_SIDES = { a: 'NYK', b: 'SAS' };
	const TEAM_BY_ABBR = new Map(NBA_TEAMS.map((team) => [team.abbr, team]));
	const SCENARIOS = [
		{ label: 'Giannis to the Knicks', a: 'NYK', b: 'MIL', moves: [['a', 'Giannis Antetokounmpo']] },
		{ label: 'Swap Luka and Jokic', a: 'LAL', b: 'DEN', moves: [['b', 'Luka Doncic'], ['a', 'Nikola Jokic']] },
		{ label: 'Wembanyama to Detroit', a: 'DET', b: 'SAS', moves: [['a', 'Victor Wembanyama']] }
	];
	const displayMode = getContext(DISPLAY_VIEW_CONTEXT) ?? { view: 'modern' };

	let sides = $state({ ...DEFAULT_SIDES });
	let edits = $state({});
	let auto = $state(true);
	let restoredKey = $state(null);
	let queries = $state({ a: '', b: '' });
	let highlighted = $state({ a: 0, b: 0 });
	let stripWidth = $state(0);
	let routerReady = $state(false);

	// SvelteKit calls afterNavigate before it marks the router started on the first load,
	// and replaceState throws until then, so the URL sync waits one tick.
	afterNavigate(() => {
		setTimeout(() => {
			routerReady = true;
		}, 0);
	});

	const players = $derived(data.players ?? []);
	const asOf = $derived(data.asOf ?? null);
	const dataKey = $derived(asOf?.date ?? 'current');
	const playersById = $derived(new Map(players.map((player) => [player.nba_id, player])));
	const byTeam = $derived(playersByTeam(players));
	const baseRosters = $derived(
		new Map(NBA_TEAMS.map((team) => [team.abbr, defaultRoster(byTeam.get(team.abbr) ?? [])]))
	);
	const baseRatings = $derived(
		new Map(NBA_TEAMS.map((team) => [team.abbr, rateRoster(baseRosters.get(team.abbr), playersById)]))
	);
	const leagueMean = $derived.by(() => {
		const ratings = [...baseRatings.values()].filter((rating) => rating.minutes > 0);
		return ratings.length ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length : 0;
	});
	const pace = $derived.by(() => {
		let minutes = 0;
		let total = 0;
		for (const player of players) {
			const playerPace = Number.parseFloat(player.x_pace);
			const playerMinutes = Number.parseFloat(player.x_minutes);
			if (Number.isFinite(playerPace) && playerMinutes > 0) {
				total += playerPace * playerMinutes;
				minutes += playerMinutes;
			}
		}
		return minutes > 0 ? total / minutes : 100;
	});
	const sideColors = $derived({ a: getSeriesColor(0, displayMode.view), b: getSeriesColor(1, displayMode.view) });
	const scenarios = $derived(
		asOf ? [] : SCENARIOS.filter((scenario) => scenario.moves.every(([, name]) => findPlayer(name)))
	);

	// Every team's roster comes from the scenario, so a player is never on two teams at once.
	function rosterFor(abbr) {
		return scenarioRoster(abbr, edits, baseRosters, auto);
	}

	function homeOf(id) {
		return teamAbbr(playersById.get(id)?.team_name) || null;
	}

	const scenarioRatings = $derived(
		new Map(NBA_TEAMS.map((team) => [team.abbr, rateRoster(rosterFor(team.abbr), playersById)]))
	);

	function salaryOf(roster) {
		return roster.reduce((total, row) => total + (Number.parseFloat(playersById.get(row.id)?.actual_salary) || 0), 0);
	}

	const view = $derived.by(() => {
		const result = {};
		for (const side of SIDES) {
			const abbr = sides[side];
			const otherAbbr = sides[side === 'a' ? 'b' : 'a'];
			const roster = rosterFor(abbr);
			const rating = rateRoster(roster, playersById);
			const base = baseRatings.get(abbr) ?? rating;
			const others = NBA_TEAMS.filter((team) => team.abbr !== abbr).map(
				(team) => scenarioRatings.get(team.abbr)?.rating ?? 0
			);
			result[side] = {
				abbr,
				team: TEAM_BY_ABBR.get(abbr),
				roster: [...roster].sort((x, y) => y.minutes - x.minutes),
				rating,
				base,
				wins: winsFor(rating.rating, leagueMean),
				baseWins: winsFor(base.rating, leagueMean),
				rank: leagueRank(rating.rating, others),
				minutes: roster.reduce((total, row) => total + row.minutes, 0),
				salary: salaryOf(roster),
				baseSalary: salaryOf(baseRosters.get(abbr) ?? []),
				edited: roster !== baseRosters.get(abbr)
			};
		}
		return result;
	});
	// Each side's Minutes chart: DPM against share of minutes, both on one DPM scale.
	const minutesRows = $derived({
		a: foldDeepBench(rosterContributions(view.a.roster, playersById)),
		b: foldDeepBench(rosterContributions(view.b.roster, playersById))
	});
	const minutesDomain = $derived.by(() => {
		const profiles = SIDES.map((side) => minutesProfile(minutesRows[side]));
		return {
			low: Math.min(...profiles.map((profile) => profile.low)),
			high: Math.max(...profiles.map((profile) => profile.high))
		};
	});
	const matchup = $derived.by(() => {
		if (sides.a === sides.b) return null;
		const game = gameWinProbability(view.a.rating.rating, view.b.rating.rating, pace);
		return { ...game, series: seriesWinProbability(game.probability) };
	});

	function normalize(text) {
		return String(text ?? '')
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.toLowerCase()
			.trim();
	}

	function findPlayer(name) {
		const wanted = normalize(name);
		return players.find((player) => normalize(player.player_name) === wanted) ?? null;
	}

	function suggestions(side) {
		const query = normalize(queries[side]);
		if (query.length < 2) return [];
		const onRoster = new Set(rosterFor(sides[side]).map((row) => row.id));
		// Accents, word order, initials and typos forgiven (nameSearch.js), better players first.
		return searchByName(
			players.filter((player) => !onRoster.has(player.nba_id)),
			queries[side],
			{ rank: (player) => Number(player.dpm) || 0, limit: 8 }
		);
	}

	const suggestionLists = $derived({ a: suggestions('a'), b: suggestions('b') });

	function setRoster(abbr, roster) {
		edits = { ...edits, [abbr]: roster };
	}

	function setTeam(side, abbr) {
		sides = { ...sides, [side]: abbr };
	}

	function resetTeam(side) {
		edits = resetScenarioTeam(edits, baseRosters, sides[side], { homeOf, auto });
	}

	function setMinutes(side, id, minutes) {
		const abbr = sides[side];
		let roster = rosterFor(abbr).map((row) => (row.id === id ? { ...row, minutes } : row));
		if (auto) roster = rebalance(roster, id);
		setRoster(abbr, roster);
	}

	function removePlayer(side, id) {
		const abbr = sides[side];
		let roster = rosterFor(abbr).filter((row) => row.id !== id);
		if (auto) roster = rebalance(roster);
		setRoster(abbr, roster);
	}

	function addPlayer(side, id, minutes = null) {
		const player = playersById.get(id);
		if (!player) return;
		edits = addToScenario(edits, baseRosters, {
			to: sides[side],
			id,
			minutes,
			defaultMinutes: addedPlayerMinutes(player),
			homeOf,
			auto
		});
	}

	function movePlayer(side, id) {
		const other = side === 'a' ? 'b' : 'a';
		if (sides[other] === sides[side]) return;
		addPlayer(other, id);
	}

	function pickSuggestion(side, player) {
		addPlayer(side, player.nba_id);
		queries = { ...queries, [side]: '' };
		highlighted = { ...highlighted, [side]: 0 };
	}

	function handleSearchKeydown(side, event) {
		const items = suggestionLists[side];
		if (!items.length) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			highlighted = { ...highlighted, [side]: Math.min(highlighted[side] + 1, items.length - 1) };
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			highlighted = { ...highlighted, [side]: Math.max(highlighted[side] - 1, 0) };
		} else if (event.key === 'Enter') {
			event.preventDefault();
			pickSuggestion(side, items[Math.min(highlighted[side], items.length - 1)]);
		} else if (event.key === 'Escape') {
			queries = { ...queries, [side]: '' };
		}
	}

	function runScenario(scenario) {
		sides = { a: scenario.a, b: scenario.b };
		let next = resetScenarioTeam(edits, baseRosters, scenario.a, { homeOf, auto });
		next = resetScenarioTeam(next, baseRosters, scenario.b, { homeOf, auto });
		edits = next;
		for (const [side, name] of scenario.moves) {
			const player = findPlayer(name);
			if (player) addPlayer(side, player.nba_id);
		}
	}

	function money(value, signed = false) {
		if (!value) return '$0';
		const text = `$${(Math.abs(value) / 1e6).toFixed(1)}M`;
		if (!signed) return text;
		return `${value > 0 ? '+' : '-'}${text}`;
	}

	function playerMeta(player) {
		const age = Number.parseFloat(player.age);
		return [player.position, Number.isFinite(age) ? String(Math.floor(age)) : null].filter(Boolean).join(' · ') || '—';
	}

	function logoUrl(team) {
		return team ? `/api/img/logo/${team.id}` : '';
	}

	// Restore saved sides and edits for this data (today or a Time Machine date), then save changes.
	$effect(() => {
		if (!browser || restoredKey === dataKey) return;
		let saved = null;
		try {
			saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
		} catch {
			saved = null;
		}
		const params = $page.url.searchParams;
		const fromUrl = { a: params.get('a')?.toUpperCase(), b: params.get('b')?.toUpperCase() };
		const pick = (side) =>
			[fromUrl[side], saved?.sides?.[side], DEFAULT_SIDES[side]].find((abbr) => TEAM_BY_ABBR.has(abbr));
		sides = { a: pick('a'), b: pick('b') };
		auto = saved?.auto ?? true;
		const savedEdits = savedEditsByKey(saved)[dataKey];
		edits = savedEdits ? dedupeEdits(savedEdits) : {};
		restoredKey = dataKey;
	});

	// Slider drags change edits many times a second, so saving waits for a pause.
	$effect(() => {
		if (!browser || restoredKey !== dataKey) return;
		const snapshot = JSON.stringify({ key: dataKey, sides, auto, edits });
		const timer = setTimeout(() => {
			try {
				const current = JSON.parse(snapshot);
				let stored = null;
				try {
					stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
				} catch {
					stored = null;
				}
				const editsByKey = mergeSavedEdits(stored, current.key, current.edits);
				localStorage.setItem(STORAGE_KEY, JSON.stringify({ sides: current.sides, auto: current.auto, editsByKey }));
			} catch {
				// Storage can be unavailable; the lab still works for this visit.
			}
		}, 250);
		return () => clearTimeout(timer);
	});

	// Ask DARKO's "trade X to Y" arrives as ?trade=<player id>&to=<team>: the player's team and the
	// new one, side by side and reset, with the move made. The URL sync below drops both parameters.
	let appliedTrade = null;
	$effect(() => {
		if (!browser || restoredKey !== dataKey) return;
		const params = $page.url.searchParams;
		const key = `${params.get('trade')}:${params.get('to')}`;
		if (!params.has('trade') || key === appliedTrade) return;
		appliedTrade = key;
		untrack(() => applyTrade(Number.parseInt(params.get('trade'), 10), params.get('to')?.toUpperCase()));
	});

	function applyTrade(id, to) {
		if (!playersById.has(id) || !TEAM_BY_ABBR.has(to)) return;
		const from = homeOf(id);
		const other = from && from !== to ? from : sides.b !== to ? sides.b : sides.a !== to ? sides.a : DEFAULT_SIDES.b;
		sides = { a: to, b: other };
		let next = resetScenarioTeam(edits, baseRosters, to, { homeOf, auto });
		next = resetScenarioTeam(next, baseRosters, other, { homeOf, auto });
		edits = next;
		addPlayer('a', id);
	}

	$effect(() => {
		if (!browser || restoredKey !== dataKey || !routerReady) return;
		const url = new URL(window.location.href);
		const tradeLink = url.searchParams.has('trade') || url.searchParams.has('to');
		if (tradeLink || url.searchParams.get('a') !== sides.a || url.searchParams.get('b') !== sides.b) {
			url.searchParams.set('a', sides.a);
			url.searchParams.set('b', sides.b);
			url.searchParams.delete('trade');
			url.searchParams.delete('to');
			replaceState(relativeHref(url), {});
		}
	});

	const stripScale = $derived.by(() => {
		const values = [...scenarioRatings.values()].map((rating) => rating.rating);
		values.push(view.a.rating.rating, view.b.rating.rating);
		const low = Math.min(-10, ...values) - 0.5;
		const high = Math.max(10, ...values) + 0.5;
		const left = 18;
		const right = Math.max(left + 1, stripWidth - 18);
		return {
			x: (value) => left + ((value - low) / (high - low)) * (right - left),
			ticks: Array.from({ length: Math.floor(high / 5) - Math.ceil(low / 5) + 1 }, (_, i) => (Math.ceil(low / 5) + i) * 5)
		};
	});
</script>

<svelte:head>
	<title>Roster Lab — DARKO DPM</title>
</svelte:head>

<div class="container lab-page" data-shiny-page>
	<PageHeader eyebrow={asOf ? `Rosters as of ${formatAsOfDate(asOf.date)}` : 'Trade machine'} title="Roster Lab">
		<p class="page-lede">
			Start from each team's rotation in DARKO's projected minutes, then trade, sign and re-slot
			minutes. A team's rating is its players' DPM weighted by minutes; wins are 41 plus {WINS_PER_POINT}
			for every point above the league's average team.
			{#if asOf}The Time Machine is set to {formatAsOfDate(asOf.date)}{asOf.season ? `, in the ${seasonLabelFromEndYear(asOf.season)} season` : ''}.{/if}
		</p>
		{#if scenarios.length}
			<div class="lab-scenarios">
				<span>Try a what-if</span>
				{#each scenarios as scenario (scenario.label)}
					<button type="button" class="btn btn-sm" onclick={() => runScenario(scenario)}>{scenario.label}</button>
				{/each}
			</div>
		{/if}
	</PageHeader>

	<div class="lab-sides">
		{#each SIDES as side (side)}
			{@const state = view[side]}
			{@const otherAbbr = sides[side === 'a' ? 'b' : 'a']}
			<section class="lab-side" style:--side-color={sideColors[side]} aria-label={`${state.team?.name ?? state.abbr} roster`} data-shiny-surface="panel">
				<div class="lab-team">
					<img class="lab-logo" src={logoUrl(state.team)} alt="" width="36" height="36" />
					<label class="sr-only" for={`lab-team-${side}`}>Team</label>
					<select id={`lab-team-${side}`} class="lab-select" value={state.abbr} onchange={(event) => setTeam(side, event.currentTarget.value)}>
						{#each NBA_TEAMS as team (team.abbr)}
							<option value={team.abbr}>{team.name}</option>
						{/each}
					</select>
					<button type="button" class="btn btn-sm" disabled={!state.edited} onclick={() => resetTeam(side)}>Reset</button>
				</div>

				<div class="lab-score">
					<div class="lab-stat">
						<span class="lab-stat-label">DARKO rating</span>
						<span class="lab-stat-value">{formatSigned(state.rating.rating, 1)}</span>
						<span class="lab-stat-note">
							{#if Math.abs(state.rating.rating - state.base.rating) >= 0.05}
								<span class:up={state.rating.rating > state.base.rating} class:down={state.rating.rating < state.base.rating}>
									{formatSigned(state.rating.rating - state.base.rating, 1)}
								</span> vs start
							{:else}
								<OffenseDefenseSplit offense={state.rating.offense} defense={state.rating.defense} />
							{/if}
						</span>
					</div>
					<div class="lab-stat">
						<span class="lab-stat-label">Projected wins</span>
						<span class="lab-stat-value">{Math.round(state.wins)}</span>
						<span class="lab-stat-note">
							{#if Math.abs(state.wins - state.baseWins) >= 0.5}
								<span class:up={state.wins > state.baseWins} class:down={state.wins < state.baseWins}>
									{formatSigned(state.wins - state.baseWins, 1)}
								</span> vs start
							{:else}
								of 82
							{/if}
						</span>
					</div>
					<div class="lab-stat">
						<span class="lab-stat-label">League rank</span>
						<span class="lab-stat-value">#{state.rank}</span>
						<span class="lab-stat-note">of 30 teams</span>
					</div>
				</div>

				<div class="lab-dna">
					<MinutesChart
						rows={minutesRows[side]}
						domain={minutesDomain}
						color={sideColors[side]}
						height={200}
						listNarrow={false}
						playerHref={(id) => (asOf ? `/player/${id}?asof=${asOf.date}` : `/player/${id}`)}
					/>
				</div>

				<div class="lab-minutes">
					<!-- Where the sides stack, this bar stays under the site's bar while this team's
					     sliders scroll: the rating being changed, beside its minutes. -->
					<p class="lab-live" aria-hidden="true">
						<img class="lab-live-logo" src={logoUrl(state.team)} alt="" width="20" height="20" />
						<b>{state.abbr}</b>
						<span class="lab-live-rating">{formatSigned(state.rating.rating, 1)}</span>
						{#if Math.abs(state.rating.rating - state.base.rating) >= 0.05}
							<span class:up={state.rating.rating > state.base.rating} class:down={state.rating.rating < state.base.rating}>
								{formatSigned(state.rating.rating - state.base.rating, 1)}
							</span>
						{/if}
						<span class="lab-live-wins">{Math.round(state.wins)} wins</span>
					</p>
					<div class="lab-minutes-row">
						<span>Minutes <b class:off={Math.abs(state.minutes - TEAM_MINUTES) > 1}>{Math.round(state.minutes)}</b> of {TEAM_MINUTES}</span>
						{#if state.salary > 0}
							<span>
								Salary <b>{money(state.salary)}</b>
								{#if Math.abs(state.salary - state.baseSalary) >= 50_000}
									<span class="lab-muted">({money(state.salary - state.baseSalary, true)})</span>
								{/if}
							</span>
						{/if}
					</div>
					<div class="lab-meter" aria-hidden="true">
						<i class:off={Math.abs(state.minutes - TEAM_MINUTES) > 1} style:width={`${Math.min(state.minutes / TEAM_MINUTES, 1) * 100}%`}></i>
					</div>
				</div>

				<ul class="lab-roster">
					<li class="lab-row lab-row-head" aria-hidden="true">
						<span>Player</span><span class="num">DPM</span><span>Minutes</span><span class="num">Min</span><span></span>
					</li>
					{#each state.roster as row (row.id)}
						{@const player = playersById.get(row.id)}
						{#if player}
							<li class="lab-row" class:added={row.from}>
								<span class="lab-who">
									<a href={asOf ? `/player/${player.nba_id}?asof=${asOf.date}` : `/player/${player.nba_id}`}>{player.player_name}</a>
									<span class="lab-meta">
										{#if row.from}<span class="lab-from">from {row.from}</span>{' · '}{/if}{playerMeta(player)}
									</span>
								</span>
								<span class="num lab-dpm">{formatSigned(player.dpm, 1)}</span>
								<input
									type="range"
									min="0"
									max={SLIDER_MAX_MINUTES}
									step="0.5"
									value={row.minutes}
									aria-label={`Minutes for ${player.player_name}`}
									oninput={(event) => setMinutes(side, row.id, Number(event.currentTarget.value))}
								/>
								<span class="num lab-min">{row.minutes.toFixed(1)}</span>
								<span class="lab-actions">
									<button
										type="button"
										class="lab-icon"
										disabled={otherAbbr === state.abbr}
										aria-label={`Send ${player.player_name} to ${otherAbbr}`}
										title={`Send to ${otherAbbr}`}
										onclick={() => movePlayer(side, row.id)}
									>
										<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 5h10l-3-3M14 11H4l3 3" /></svg>
									</button>
									<button
										type="button"
										class="lab-icon"
										aria-label={`Remove ${player.player_name}`}
										title="Remove"
										onclick={() => removePlayer(side, row.id)}
									>
										<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
									</button>
								</span>
							</li>
						{/if}
					{/each}
				</ul>

				<div class="lab-add">
					<label class="sr-only" for={`lab-add-${side}`}>Add a player to {state.team?.name}</label>
					<input
						id={`lab-add-${side}`}
						class="lab-search"
						type="search"
						autocomplete="off"
						placeholder="Add any player to sign or trade for…"
						value={queries[side]}
						oninput={(event) => {
							queries = { ...queries, [side]: event.currentTarget.value };
							highlighted = { ...highlighted, [side]: 0 };
						}}
						onkeydown={(event) => handleSearchKeydown(side, event)}
					/>
					{#if suggestionLists[side].length}
						<ul class="lab-suggestions" role="listbox" aria-label="Players">
							{#each suggestionLists[side] as player, index (player.nba_id)}
								<li role="option" aria-selected={index === highlighted[side]}>
									<button type="button" class:active={index === highlighted[side]} onmousedown={(event) => { event.preventDefault(); pickSuggestion(side, player); }}>
										<b>{player.player_name}</b>
										<span>{teamAbbr(player.team_name) || 'FA'}</span>
										<span class="num">{formatSigned(player.dpm, 1)}</span>
									</button>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			</section>
		{/each}
	</div>

	<div class="lab-bottom">
		<section class="lab-panel" aria-labelledby="lab-matchup-title" data-shiny-surface="panel">
			<h2 id="lab-matchup-title">Neutral-floor matchup</h2>
			<p class="lab-sub">One game from the two ratings, with a {Math.round(pace)}-possession pace and a 12.5-point spread; the series is best of seven.</p>
			{#if matchup}
				<div class="lab-odds">
					<div>
						<span class="lab-pct">{Math.round(matchup.probability * 100)}%</span>
						<span>{view.a.team?.name}</span>
					</div>
					<span class="lab-vs">vs</span>
					<div class="right">
						<span class="lab-pct">{Math.round((1 - matchup.probability) * 100)}%</span>
						<span>{view.b.team?.name}</span>
					</div>
				</div>
				<div
					class="lab-probbar"
					role="img"
					aria-label={`${view.a.abbr} ${Math.round(matchup.probability * 100)} percent, ${view.b.abbr} ${Math.round((1 - matchup.probability) * 100)} percent`}
				>
					<i style:width={`${matchup.probability * 100}%`} style:background={sideColors.a}></i>
					<i style:flex="1" style:background={sideColors.b}></i>
				</div>
				<p class="lab-note">
					Expected margin: {matchup.margin >= 0 ? view.a.abbr : view.b.abbr} by {Math.abs(matchup.margin).toFixed(1)}.
					Best of seven: {view.a.abbr} {Math.round(matchup.series * 100)}%, {view.b.abbr} {Math.round((1 - matchup.series) * 100)}%.
				</p>
			{:else}
				<p class="lab-note">Pick two different teams to see the matchup.</p>
			{/if}
		</section>

		<section class="lab-panel" aria-labelledby="lab-league-title" data-shiny-surface="plot">
			<div class="lab-panel-head">
				<div>
					<h2 id="lab-league-title">Across the league</h2>
					<p class="lab-sub">Every team's DARKO rating from its starting rotation. The two lab teams show where your moves take them.</p>
				</div>
				<label class="lab-check">
					<input type="checkbox" bind:checked={auto} />
					Keep minutes at 240
				</label>
			</div>
			<div class="lab-strip" bind:clientWidth={stripWidth}>
				{#if stripWidth > 0}
					<svg width={stripWidth} height="104" viewBox={`0 0 ${stripWidth} 104`} role="img" aria-label="Team ratings across the league">
						{#each stripScale.ticks as tick (tick)}
							<line class:zero={tick === 0} class="lab-grid" x1={stripScale.x(tick)} x2={stripScale.x(tick)} y1="26" y2="80" />
							<text class="lab-tick" x={stripScale.x(tick)} y="98" text-anchor="middle">{tick > 0 ? `+${tick}` : tick}</text>
						{/each}
						{#each NBA_TEAMS as team (team.abbr)}
							{#if team.abbr !== sides.a && team.abbr !== sides.b && scenarioRatings.get(team.abbr)?.minutes}
								<circle class="lab-dot" cx={stripScale.x(scenarioRatings.get(team.abbr).rating)} cy="58" r="4.5">
									<title>{team.name} {formatSigned(scenarioRatings.get(team.abbr).rating, 1)}</title>
								</circle>
							{/if}
						{/each}
						{#each SIDES as side, index (side)}
							{@const state = view[side]}
							{#if index === 0 || sides.a !== sides.b}
								{@const from = stripScale.x(state.base.rating)}
								{@const to = stripScale.x(state.rating.rating)}
								{#if Math.abs(to - from) > 2}
									<line class="lab-shift" x1={from} x2={to} y1="58" y2="58" style:stroke={sideColors[side]} />
									<circle class="lab-start" cx={from} cy="58" r="4" style:stroke={sideColors[side]} />
								{/if}
								<image href={logoUrl(state.team)} x={to - 13} y="45" width="26" height="26" />
								<text class="lab-label" x={to} y={index === 0 ? 36 : 88} text-anchor="middle">
									{state.abbr} {formatSigned(state.rating.rating, 1)}
								</text>
							{/if}
						{/each}
					</svg>
				{/if}
			</div>
		</section>
	</div>
</div>

<style>
	.lab-page {
		padding-bottom: 64px;
	}

	.lab-scenarios {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin-top: 14px;
	}

	.lab-scenarios > span {
		margin-right: 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.lab-select,
	.lab-search {
		height: 32px;
		padding: 0 12px;
		font-family: var(--font-sans);
		font-size: 13px;
		color: var(--text);
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.lab-sides {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	.lab-side,
	.lab-panel {
		min-width: 0;
		padding: 16px 18px;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.lab-side {
		border-top: 3px solid var(--side-color);
	}

	.lab-team {
		display: flex;
		gap: 10px;
		align-items: center;
	}

	.lab-logo {
		flex: none;
		width: 36px;
		height: 36px;
		object-fit: contain;
	}

	.lab-select {
		flex: 1;
		min-width: 0;
		font-weight: 600;
	}

	.lab-score {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin: 16px 0 12px;
	}

	.lab-stat {
		display: grid;
		gap: 2px;
		min-width: 0;
	}

	.lab-stat-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.lab-stat-value {
		font-family: var(--font-display);
		font-size: 30px;
		font-weight: 800;
		font-stretch: 110%;
		line-height: 1.1;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.lab-stat-note {
		font-size: 12px;
		color: var(--text-muted);
	}

	.lab-stat-note .up {
		color: var(--positive);
		font-weight: 700;
	}

	.lab-stat-note .down {
		color: var(--negative);
		font-weight: 700;
	}

	.lab-minutes {
		display: grid;
		gap: 6px;
		margin-bottom: 10px;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.lab-minutes-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
	}

	.lab-minutes b {
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
		color: var(--text);
	}

	.lab-minutes b.off {
		color: var(--negative);
	}

	.lab-muted {
		color: var(--text-muted);
	}

	.lab-meter {
		height: 5px;
		overflow: hidden;
		background: var(--border-subtle);
		border-radius: 3px;
	}

	.lab-meter i {
		display: block;
		height: 100%;
		background: var(--side-color);
		border-radius: 3px;
	}

	.lab-meter i.off {
		background: var(--negative);
	}

	.lab-live {
		display: none;
	}

	.lab-roster {
		display: grid;
		list-style: none;
	}

	.lab-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 46px minmax(70px, 130px) 38px 58px;
		gap: 10px;
		align-items: center;
		min-height: 42px;
		padding: 4px 0;
		border-top: 1px solid var(--border-subtle);
	}

	.lab-row-head {
		min-height: 28px;
		border-top: 0;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.lab-row.added {
		background: color-mix(in srgb, var(--side-color) 8%, transparent);
	}

	.lab-who {
		display: grid;
		min-width: 0;
	}

	.lab-who a {
		overflow: hidden;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.lab-meta {
		font-size: 12px;
		color: var(--text-muted);
	}

	.lab-from {
		font-weight: 700;
		color: var(--text-secondary);
	}

	.num {
		font-family: var(--font-mono);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.lab-dpm {
		color: var(--text);
	}

	.lab-min {
		color: var(--text-secondary);
	}

	.lab-row input[type='range'] {
		width: 100%;
		accent-color: var(--side-color);
	}

	.lab-actions {
		display: flex;
		gap: 4px;
		justify-content: flex-end;
	}

	.lab-icon {
		display: inline-grid;
		place-items: center;
		width: 26px;
		height: 26px;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.lab-icon:hover:not(:disabled) {
		color: var(--text);
		border-color: var(--border);
	}

	.lab-icon:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}

	.lab-icon svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.lab-add {
		position: relative;
		margin-top: 10px;
	}

	.lab-search {
		width: 100%;
	}

	.lab-suggestions {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		z-index: 20;
		max-height: 280px;
		overflow-y: auto;
		list-style: none;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
	}

	.lab-suggestions button {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto 48px;
		gap: 10px;
		width: 100%;
		padding: 8px 12px;
		font-family: var(--font-sans);
		font-size: 13px;
		text-align: left;
		color: var(--text);
		background: transparent;
		border: 0;
		cursor: pointer;
	}

	.lab-suggestions button span {
		color: var(--text-muted);
	}

	.lab-suggestions button.active,
	.lab-suggestions button:hover {
		background: var(--bg-hover);
	}

	.lab-dna {
		/* The chart's label halos match the panel. */
		--mc-halo: var(--bg-surface);
		margin: 4px 0 14px;
	}

	.lab-bottom {
		display: grid;
		grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
		gap: 16px;
		margin-top: 16px;
	}

	.lab-panel h2 {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.lab-sub {
		margin: 2px 0 12px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.lab-panel-head {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		align-items: flex-start;
	}

	.lab-check {
		display: flex;
		flex: none;
		gap: 6px;
		align-items: center;
		font-size: 13px;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.lab-check input {
		accent-color: var(--accent);
	}

	.lab-odds {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
		gap: 12px;
		align-items: end;
	}

	.lab-odds > div {
		display: grid;
		gap: 2px;
		color: var(--text-secondary);
	}

	.lab-odds .right {
		text-align: right;
	}

	.lab-pct {
		font-family: var(--font-display);
		font-size: 30px;
		font-weight: 800;
		font-stretch: 110%;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
		color: var(--text);
	}

	.lab-vs {
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
	}

	.lab-probbar {
		display: flex;
		gap: 2px;
		height: 12px;
		margin-top: 12px;
		overflow: hidden;
		border-radius: 3px;
	}

	.lab-probbar i {
		display: block;
		height: 100%;
	}

	.lab-note {
		margin-top: 10px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.lab-strip {
		width: 100%;
	}

	.lab-strip svg {
		display: block;
		overflow: visible;
	}

	.lab-grid {
		stroke: var(--border-subtle);
		stroke-dasharray: 2 3;
	}

	.lab-grid.zero {
		stroke: var(--graphic-muted);
		stroke-dasharray: none;
	}

	.lab-tick {
		font-size: 11px;
		fill: var(--text-muted);
	}

	.lab-dot {
		fill: color-mix(in srgb, var(--text-secondary) 45%, transparent);
		stroke: var(--bg-surface);
		stroke-width: 1.5;
	}

	.lab-shift {
		stroke-width: 2.5;
	}

	.lab-start {
		fill: var(--bg-surface);
		stroke-width: 2;
	}

	.lab-label {
		font-family: var(--font-mono);
		font-size: 12px;
		font-weight: var(--figure-weight-strong);
		fill: var(--text);
	}

	.lab-select:focus-visible,
	.lab-search:focus-visible,
	.lab-icon:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	@media (max-width: 1100px) {
		.lab-sides,
		.lab-bottom {
			grid-template-columns: 1fr;
		}

		/* One side at a time on screen: the team being edited keeps its rating and minutes in view,
		   just under the site's bar, until its own section scrolls away. */
		.lab-minutes {
			position: sticky;
			top: var(--nav-sticky-offset);
			z-index: 5;
			gap: 4px;
			margin: 0 -18px 10px;
			padding: 6px 18px 8px;
			background: var(--bg-surface);
			border-bottom: 1px solid var(--border-subtle);
		}

		.lab-live {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 4px 10px;
			margin: 0;
			font-size: 13px;
			color: var(--text-secondary);
		}

		.lab-live-logo {
			width: 20px;
			height: 20px;
			object-fit: contain;
		}

		.lab-live b {
			color: var(--text);
		}

		.lab-live-rating {
			font-family: var(--font-display);
			font-size: 19px;
			font-weight: 800;
			font-stretch: 108%;
			font-variant-numeric: tabular-nums;
			color: var(--text);
		}

		.lab-live .up,
		.lab-live .down {
			font-family: var(--font-mono);
			font-weight: var(--figure-weight-strong);
		}

		.lab-live .up {
			color: var(--positive);
		}

		.lab-live .down {
			color: var(--negative);
		}

		.lab-live-wins {
			margin-left: auto;
		}
	}

	@media (max-width: 560px) {
		.lab-side,
		.lab-panel {
			padding: 14px;
		}

		.lab-row {
			grid-template-columns: minmax(0, 1fr) 40px 34px 58px;
			grid-template-areas:
				'who dpm min actions'
				'slider slider slider slider';
			gap: 2px 8px;
		}

		.lab-row-head {
			display: none;
		}

		.lab-who {
			grid-area: who;
		}

		.lab-dpm {
			grid-area: dpm;
		}

		.lab-min {
			grid-area: min;
		}

		.lab-actions {
			grid-area: actions;
		}

		.lab-row input[type='range'] {
			grid-area: slider;
		}

		.lab-score {
			gap: 8px;
		}

		.lab-stat-value {
			font-size: 22px;
		}

		.lab-minutes {
			margin: 0 -14px 10px;
			padding: 6px 14px 8px;
		}

		/* The roster's sliders come straight after the rating; the Minutes chart follows them. */
		.lab-side {
			display: flex;
			flex-direction: column;
		}

		.lab-dna {
			order: 1;
			margin: 16px 0 0;
		}

		.lab-panel-head {
			flex-direction: column;
			gap: 0;
		}
	}
</style>
