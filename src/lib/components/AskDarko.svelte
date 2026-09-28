<script>
	// Ask DARKO: the site-wide command bar (⌘K, Ctrl+K or /). Typing finds players, teams and
	// pages, and answers questions (a trade, a comparison, "best defenders under 25", a date) with
	// links into the site. utils/askDarko.js reads the question; this component shows and runs it.
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { tick } from 'svelte';
	import { timeMachine } from '$lib/timeMachineState.svelte.js';
	import { relativeHref, withAsOf } from '$lib/utils/timeMachine.js';
	import {
		ASK_EXAMPLES,
		ASK_PAGES,
		activePlayerPool,
		interpretAsk,
		matchPlayers,
		normalizeAskText
	} from '$lib/utils/askDarko.js';
	import { formatSigned } from '$lib/utils/seismograph.js';
	import { teamAbbr } from '$lib/utils/teamAbbreviations.js';
	import { leagueTeamRatings } from '$lib/utils/teamDna.js';

	let { open = $bindable(false) } = $props();

	let query = $state('');
	let active = $state(0);
	let players = $state(null);
	let calendar = $state([]);
	let loadFailed = $state(false);
	let historical = $state([]);
	let inputEl = $state(null);
	let dialogEl = $state(null);
	let returnFocus = null;
	let requested = false;
	let searchSeq = 0;
	let wasOpen = false;

	const today = new Date().toISOString().slice(0, 10);
	const pool = $derived(players ? activePlayerPool(players) : []);
	const season = $derived(Number.parseInt(players?.find((row) => row.season)?.season, 10) || null);
	const teamRanks = $derived.by(() => {
		if (!players) return new Map();
		const ratings = leagueTeamRatings(players).filter((team) => team.minutes > 0);
		const ordered = [...ratings].sort((a, b) => b.rating - a.rating);
		return new Map(ordered.map((team, index) => [team.abbr, { rank: index + 1, rating: team.rating }]));
	});
	const result = $derived(interpretAsk(query, { players, pool, calendar, season, today }));

	// Current players first, then former players from the search API.
	const playerMatches = $derived.by(() => {
		if (normalizeAskText(query).length < 2) return [];
		const currentIds = new Set(pool.map((player) => player.id));
		const former = historical
			.filter((row) => !currentIds.has(row.nba_id))
			.map((row) => ({
				id: row.nba_id,
				name: row.player_name,
				current: false,
				dpm: Number.parseFloat(row.dpm),
				team: row.team_name ?? null,
				lastYear: typeof row.date === 'string' ? row.date.slice(0, 4) : null
			}));
		return matchPlayers(query, [...pool, ...former], { limit: 6 });
	});

	/** Groups of options, in reading order; every option gets its flat index. */
	const groups = $derived.by(() => {
		const out = [];
		let index = 0;
		const add = (group) => {
			for (const option of group.options) option.index = index++;
			if (group.options.length) out.push(group);
		};
		if (!normalizeAskText(query)) {
			add({
				key: 'pages',
				title: 'Go to',
				options: ASK_PAGES.map((entry) => ({ key: entry.href, kind: 'page', label: entry.label, href: entry.href }))
			});
			return out;
		}
		result.answers.forEach((answer, answerIndex) => {
			if (answer.kind === 'board') {
				add({
					key: `answer-${answerIndex}`,
					title: answer.title,
					options: answer.rows.map((row, rank) => ({
						key: `board-${row.id}`,
						kind: 'board',
						rank: rank + 1,
						row,
						href: `/player/${row.id}`
					}))
				});
			} else {
				add({
					key: `answer-${answerIndex}`,
					title: answer.title,
					options: [{ key: `answer-${answerIndex}`, kind: answer.kind, answer, href: answer.href, clearDate: answer.clearDate }]
				});
			}
		});
		add({
			key: 'teams',
			title: 'Teams',
			options: result.teams.map((team) => ({ key: team.abbr, kind: 'team', team, href: `/team/${team.abbr}` }))
		});
		add({
			key: 'players',
			title: 'Players',
			options: playerMatches.map((player) => ({ key: `p-${player.id}`, kind: 'player', player, href: `/player/${player.id}` }))
		});
		add({
			key: 'pages',
			title: 'Go to',
			options: result.pages.map((entry) => ({ key: entry.href, kind: 'page', label: entry.label, href: entry.href }))
		});
		return out;
	});
	const options = $derived(groups.flatMap((group) => group.options));
	const activeOption = $derived(options[Math.min(active, options.length - 1)] ?? null);

	$effect(() => {
		void query;
		active = 0;
	});

	// Opening loads the players once, focuses the field and holds the page still; closing hands
	// focus back to wherever it was.
	$effect(() => {
		if (open === wasOpen) return;
		wasOpen = open;
		if (open) {
			returnFocus = document.activeElement;
			query = '';
			loadData();
			document.documentElement.classList.add('ask-open');
			tick().then(() => inputEl?.focus());
		} else {
			document.documentElement.classList.remove('ask-open');
			historical = [];
			if (returnFocus instanceof HTMLElement && returnFocus.isConnected) returnFocus.focus();
			returnFocus = null;
		}
	});

	// Former players come from the search API once a name has three letters.
	$effect(() => {
		const text = query.trim();
		if (!open || normalizeAskText(text).length < 3) {
			historical = [];
			return;
		}
		const seq = ++searchSeq;
		const timer = setTimeout(async () => {
			try {
				const response = await fetch(`/api/search-players?q=${encodeURIComponent(text)}`);
				if (!response.ok) return;
				const rows = await response.json();
				if (seq === searchSeq) historical = Array.isArray(rows) ? rows : [];
			} catch {
				// Former players are an extra; current players and pages still answer.
			}
		}, 180);
		return () => clearTimeout(timer);
	});

	function loadData() {
		if (requested) return;
		requested = true;
		fetch('/api/active-players?view=ask')
			.then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
			.then((rows) => {
				players = Array.isArray(rows) ? rows : [];
			})
			.catch(() => {
				loadFailed = true;
				requested = false;
			});
		fetch('/api/history/timeline')
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				calendar = data?.calendar ?? [];
			})
			.catch(() => {});
	}

	function close() {
		open = false;
	}

	function run(option) {
		if (!option) return;
		close();
		if (option.clearDate) {
			timeMachine.date = null;
			void goto(relativeHref(withAsOf($page.url, null)), { noScroll: true });
			return;
		}
		if (option.href) void goto(option.href);
	}

	function move(step) {
		if (!options.length) return;
		active = Math.min(Math.max(active + step, 0), options.length - 1);
		tick().then(() => document.getElementById(`ask-opt-${active}`)?.scrollIntoView({ block: 'nearest' }));
	}

	function handleInputKey(event) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			move(1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			move(-1);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			run(activeOption);
		}
	}

	// Tab stays inside the dialog.
	function handleDialogKey(event) {
		if (event.key === 'Escape') {
			event.preventDefault();
			close();
			return;
		}
		if (event.key !== 'Tab' || !dialogEl) return;
		const focusable = [...dialogEl.querySelectorAll('input, button:not([disabled]), a[href]')];
		if (!focusable.length) return;
		const first = focusable[0];
		const last = focusable.at(-1);
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function handleWindowKey(event) {
		if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
			event.preventDefault();
			open = !open;
			return;
		}
		if (open || event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
		const target = event.target;
		const typing =
			target instanceof HTMLElement &&
			(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
		if (typing) return;
		event.preventDefault();
		open = true;
	}

	// Pages open the box with a question typed in (openAskDarko in askDarko.js). Opening clears
	// the field, so the question goes in once that has run.
	$effect(() => {
		const ask = async (event) => {
			open = true;
			await tick();
			query = event.detail?.query ?? '';
			inputEl?.focus();
		};
		window.addEventListener('darko:ask', ask);
		return () => window.removeEventListener('darko:ask', ask);
	});

	function useExample(example) {
		query = example;
		inputEl?.focus();
	}

	function boardMeta(row) {
		const team = teamAbbr(row.team) || 'FA';
		return row.age === null ? team : `${team} · ${Math.floor(row.age)}`;
	}

	function teamMeta(team) {
		const entry = teamRanks.get(team.abbr);
		return entry ? `#${entry.rank} · ${formatSigned(entry.rating, 1)}` : '';
	}

	function playerMeta(player) {
		if (player.current) {
			const abbr = teamAbbr(player.team) || 'Free agent';
			return `${abbr} · ${formatSigned(player.dpm, 1)}`;
		}
		return player.lastYear ? `Last played ${player.lastYear}` : 'Former player';
	}
</script>

<svelte:window onkeydown={handleWindowKey} />

{#if open}
	<div class="ask-layer">
		<button class="ask-scrim" type="button" tabindex="-1" aria-label="Close Ask DARKO" onclick={close}></button>
		<div
			class="ask-dialog"
			role="dialog"
			aria-modal="true"
			aria-labelledby="ask-title"
			tabindex="-1"
			bind:this={dialogEl}
			onkeydown={handleDialogKey}
		>
			<h2 id="ask-title" class="sr-only">Ask DARKO</h2>
			<div class="ask-field">
				<svg class="ask-icon" viewBox="0 0 20 20" aria-hidden="true">
					<circle cx="8.5" cy="8.5" r="5.5" />
					<path d="M12.6 12.6 17 17" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					class="ask-input"
					type="text"
					role="combobox"
					aria-expanded="true"
					aria-controls="ask-listbox"
					aria-autocomplete="list"
					aria-activedescendant={activeOption ? `ask-opt-${activeOption.index}` : undefined}
					aria-describedby="ask-hint"
					placeholder="Ask DARKO: a player, a team, “best defenders under 25”…"
					autocomplete="off"
					autocapitalize="off"
					spellcheck="false"
					onkeydown={handleInputKey}
				/>
				<button class="ask-close" type="button" onclick={close}>Esc</button>
			</div>

			<div class="ask-body">
				{#if !normalizeAskText(query)}
					<p class="ask-group-title">Try asking</p>
					<div class="ask-examples">
						{#each ASK_EXAMPLES as example (example)}
							<button type="button" class="ask-example" onclick={() => useExample(example)}>{example}</button>
						{/each}
					</div>
				{/if}

				<div class="ask-results" role="listbox" id="ask-listbox" aria-label="Suggestions">
					{#each groups as group (group.key)}
						<div class="ask-group" role="group" aria-labelledby="ask-group-{group.key}">
							<p class="ask-group-title" id="ask-group-{group.key}">
								{group.title}
							</p>
							{#each group.options as option (option.key)}
								<div
									id="ask-opt-{option.index}"
									class="ask-option ask-option--{option.kind}"
									class:active={activeOption === option}
									role="option"
									tabindex="-1"
									aria-selected={activeOption === option}
									onclick={() => run(option)}
									onkeydown={(event) => event.key === 'Enter' && run(option)}
									onpointermove={() => (active = option.index)}
								>
									{#if option.kind === 'board'}
										<span class="ask-rank">{option.rank}</span>
										<span class="ask-main">{option.row.name}</span>
										<span class="ask-meta">{boardMeta(option.row)}</span>
										<span class="ask-value">{option.row.value}</span>
									{:else if option.kind === 'compare'}
										<span class="ask-compare">
											<span class="ask-compare-row ask-compare-head">
												<span></span>
												<span>{option.answer.names[0]}</span>
												<span>{option.answer.names[1]}</span>
											</span>
											{#each option.answer.stats as [label, a, b, better] (label)}
												<span class="ask-compare-row">
													<span class="ask-compare-label">{label}</span>
													<span class:ask-better={better === 1}>{a}</span>
													<span class:ask-better={better === 2}>{b}</span>
												</span>
											{/each}
										</span>
										<span class="ask-action">↵ {option.answer.action}</span>
									{:else if option.answer}
										<span class="ask-answer">
											<span class="ask-action">↵ {option.answer.action}</span>
											{#if option.answer.detail}<span class="ask-detail">{option.answer.detail}</span>{/if}
										</span>
									{:else if option.kind === 'team'}
										<img class="ask-logo" src="/api/img/logo/{option.team.id}" alt="" loading="lazy" />
										<span class="ask-main">{option.team.name}</span>
										<span class="ask-meta">{teamMeta(option.team)}</span>
									{:else if option.kind === 'player'}
										<span class="ask-dot" class:former={!option.player.current} aria-hidden="true"></span>
										<span class="ask-main">{option.player.name}</span>
										<span class="ask-meta">{playerMeta(option.player)}</span>
									{:else}
										<span class="ask-arrow" aria-hidden="true">→</span>
										<span class="ask-main">{option.label}</span>
									{/if}
								</div>
							{/each}
						</div>
					{/each}
				</div>

				{#if normalizeAskText(query) && options.length === 0}
					<p class="ask-empty">
						{#if !players && !loadFailed}
							Loading players…
						{:else}
							No match for “{query.trim()}”. Try a player, a team, or a question like “best rim protectors”.
						{/if}
					</p>
				{/if}
				{#if loadFailed}
					<p class="ask-empty">Player data didn't load, so questions about players can't be answered right now.</p>
				{/if}
			</div>

			<p class="ask-hint" id="ask-hint">
				<span><kbd>↑</kbd><kbd>↓</kbd> move</span>
				<span><kbd>↵</kbd> open</span>
				<span><kbd>Esc</kbd> close</span>
			</p>
		</div>
	</div>
{/if}

<style>
	:global(html.ask-open) {
		overflow: hidden;
	}

	.ask-layer {
		position: fixed;
		inset: 0;
		z-index: 400;
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: min(12vh, 96px) 16px 16px;
	}

	.ask-scrim {
		position: absolute;
		inset: 0;
		border: 0;
		padding: 0;
		background: rgba(0, 0, 0, 0.38);
		backdrop-filter: blur(2px);
		cursor: default;
	}

	.ask-dialog {
		position: relative;
		display: flex;
		flex-direction: column;
		width: min(640px, 100%);
		max-height: min(640px, calc(100dvh - 32px - min(12vh, 96px)));
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		box-shadow: 0 18px 60px rgba(0, 0, 0, 0.35);
		overflow: hidden;
	}

	.ask-dialog:focus {
		outline: none;
	}

	.ask-field {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		border-bottom: 1px solid var(--border);
	}

	.ask-icon {
		flex: none;
		width: 18px;
		height: 18px;
		fill: none;
		stroke: var(--graphic-muted);
		stroke-width: 1.8;
		stroke-linecap: round;
	}

	.ask-input {
		flex: 1;
		min-width: 0;
		padding: 4px 0;
		font: inherit;
		font-size: 16px;
		color: var(--text);
		background: transparent;
		border: 0;
		outline: none;
	}

	.ask-input::placeholder {
		color: var(--text-muted);
	}

	.ask-close {
		flex: none;
		padding: 2px 7px;
		font-family: var(--font-mono);
		font-size: 11px;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: 4px;
		cursor: pointer;
	}

	.ask-close:hover,
	.ask-close:focus-visible {
		color: var(--text);
		border-color: var(--text-muted);
	}

	.ask-body {
		flex: 1;
		min-height: 0;
		padding: 6px 8px 10px;
		overflow-y: auto;
		overscroll-behavior: contain;
	}

	.ask-group {
		margin-top: 4px;
	}

	.ask-group-title {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 8px 8px 4px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.ask-examples {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 0 8px 6px;
	}

	.ask-example {
		padding: 4px 10px;
		font: inherit;
		font-size: 12px;
		color: var(--text-secondary);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 999px;
		cursor: pointer;
	}

	.ask-example:hover,
	.ask-example:focus-visible {
		color: var(--text);
		border-color: var(--accent);
	}

	.ask-option {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 36px;
		padding: 7px 10px;
		font-size: 13px;
		color: var(--text);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.ask-option.active {
		background: var(--bg-hover);
		box-shadow: inset 2px 0 0 var(--accent);
	}

	.ask-main {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ask-meta {
		flex: none;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.ask-rank {
		flex: none;
		width: 18px;
		font-family: var(--font-mono);
		font-size: 12px;
		color: var(--text-muted);
		text-align: right;
	}

	.ask-value {
		flex: none;
		min-width: 64px;
		font-family: var(--font-mono);
		font-weight: var(--figure-weight-strong);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.ask-logo {
		flex: none;
		width: 20px;
		height: 20px;
	}

	.ask-dot {
		flex: none;
		width: 8px;
		height: 8px;
		margin: 0 6px 0 5px;
		background: var(--text-secondary);
		border-radius: 50%;
	}

	.ask-dot.former {
		background: transparent;
		border: 1.5px solid var(--graphic-muted);
	}

	.ask-arrow {
		flex: none;
		width: 20px;
		color: var(--text-muted);
		text-align: center;
	}

	.ask-answer {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ask-action {
		font-weight: 700;
	}

	.ask-detail {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.ask-option--compare {
		flex-direction: column;
		align-items: stretch;
		gap: 8px;
	}

	.ask-compare {
		display: grid;
		gap: 2px;
	}

	.ask-compare-row {
		display: grid;
		grid-template-columns: 76px 1fr 1fr;
		gap: 8px;
		font-family: var(--font-mono);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.ask-compare-head {
		font-family: var(--font-sans);
		font-weight: 700;
	}

	.ask-compare-label {
		font-family: var(--font-sans);
		color: var(--text-muted);
	}

	.ask-better {
		font-weight: 800;
	}

	.ask-empty {
		margin: 12px 10px;
		font-size: 13px;
		color: var(--text-secondary);
	}

	.ask-hint {
		display: flex;
		gap: 16px;
		margin: 0;
		padding: 8px 14px;
		font-size: 11px;
		color: var(--text-muted);
		border-top: 1px solid var(--border);
	}

	.ask-hint kbd {
		margin-right: 3px;
		padding: 0 4px;
		font-family: var(--font-mono);
		font-size: 11px;
		border: 1px solid var(--border);
		border-radius: 3px;
	}

	@media (max-width: 600px) {
		.ask-layer {
			padding: 8px;
		}

		.ask-dialog {
			max-height: calc(100dvh - 16px);
		}

		.ask-hint {
			display: none;
		}
	}
</style>
