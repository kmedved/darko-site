<script>
	import BlendSlider from '$lib/components/about/BlendSlider.svelte';
	import DpmScale from '$lib/components/about/DpmScale.svelte';
	import DpmWorth from '$lib/components/about/DpmWorth.svelte';
	import LearnDemo from '$lib/components/about/LearnDemo.svelte';
	import MemoryChart from '$lib/components/about/MemoryChart.svelte';
	import ModelFlow from '$lib/components/about/ModelFlow.svelte';
	import RookieStarts from '$lib/components/about/RookieStarts.svelte';
	import { HOOPSHYPE_SURVEY, SITE_TOOLS } from '$lib/utils/aboutDarko.js';
	import { dailyListed } from '$lib/utils/daily.js';

	let { data } = $props();

	const PODCAST = 'https://open.spotify.com/episode/2S4dqtsdntTNwxdlYuA7pr';
	const PODCAST_APPLE =
		'https://podcasts.apple.com/us/podcast/8-kostya-medvedovsky-darko-and-assorted-nba-analytics/id1469516033?i=1000549030577';

	const SECTIONS = [
		{ id: 'dpm', label: 'Reading DPM' },
		{ id: 'learn', label: 'Watch DARKO learn' },
		{ id: 'memory', label: 'How long it remembers' },
		{ id: 'model', label: 'Inside the model' },
		{ id: 'box-to-dpm', label: 'From box scores to DPM' },
		{ id: 'rookies', label: 'Rookies and the offseason' },
		{ id: 'accuracy', label: 'Accuracy' },
		{ id: 'tour', label: 'On the site' },
		{ id: 'faq', label: 'Questions' },
		{ id: 'glossary', label: 'Glossary' },
		{ id: 'origins', label: 'Origins and thanks' }
	];

	const totals = $derived(data.totals ?? null);
	const count = (value) => Number(value).toLocaleString('en-US');
	const facts = $derived(
		[
			data.players?.length ? { value: count(data.players.length), label: 'players rated today' } : null,
			totals ? { value: count(totals.seasons), label: `seasons, since 1996-97` } : null,
			totals ? { value: count(totals.playerGames), label: 'player games in the ratings' } : null
		].filter(Boolean)
	);
	const tools = SITE_TOOLS.filter((tool) => !tool.daily || dailyListed());
</script>

<svelte:head>
	<title>What is DARKO? — DARKO DPM</title>
	<meta
		name="description"
		content="DARKO forecasts every NBA player's next game and turns it into DPM, the points per 100 possessions he adds over an average player. How it works, with live data to play with."
	/>
</svelte:head>

<div class="about-page" data-shiny-page>
	<header class="about-hero">
		<div class="container about-hero-inner">
			<div class="about-hero-text">
				<p class="about-kicker">What is DARKO?</p>
				<h1>How good is every NBA player, right now?</h1>
				<p class="about-deck">
					DARKO forecasts every player's next game, stat by stat, and turns the forecast into one
					number: DPM, the points per 100 possessions a player adds over an average one. It updates
					after every game, and its history goes back to 1996-97.
				</p>
				<p class="about-credential">
					The top-ranked all-in-one metric in
					<a href={HOOPSHYPE_SURVEY.url}>HoopsHype's survey of NBA team staff</a>.
				</p>
				<div class="about-actions">
					<a class="about-primary" href="/">Open the leaderboard</a>
					<a class="about-secondary" href={PODCAST}>Listen: Kostya on Sports on Paper</a>
				</div>
			</div>
			<img class="about-logo" src="/darko-about-logo.png" alt="DARKO basketball logo" width="560" height="443" />
		</div>
	</header>

	{#if facts.length}
		<section class="about-facts" aria-label="DARKO in numbers">
			<div class="container about-facts-inner">
				{#each facts as fact (fact.label)}
					<div>
						<strong>{fact.value}</strong>
						<span>{fact.label}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<nav class="container about-jump" aria-label="On this page">
		{#each SECTIONS as section (section.id)}
			<a href="#{section.id}">{section.label}</a>
		{/each}
	</nav>

	<div class="container about-layout">
		<article class="about-article">
			<section id="dpm">
				<h2>Reading DPM</h2>
				<p>
					DPM, for Daily Plus Minus, is how much DARKO thinks a player adds to his team's scoring
					margin, in points per 100 possessions, against an average player. Zero is average. It
					splits into offense and defense, and on both a higher number is better, so +2 on defense
					means good defense.
				</p>
				<p>
					It is a forecast: how DARKO expects a player to play in his next game, from every game he
					has played, the recent ones counting most. It is not a summary of one season. Here is
					today's league, one dot per player:
				</p>
				<DpmScale players={data.players} />

				<h3>What is +1 worth?</h3>
				<p>
					Put a player on a team with four average teammates, at the minutes DARKO projects for
					him, and the team's rating moves by his DPM times his share of the game. That is how the
					Roster Lab rates rosters.
				</p>
				<DpmWorth players={data.players} leagueMean={data.leagueMean} />
			</section>

			<section id="learn">
				<h2>Watch DARKO learn</h2>
				<p>
					DARKO updates every player's projection after every game. Each game moves the rating a
					little: more when it surprises DARKO, and more early in a career, when DARKO knows less.
					Here is one season in the player pages' Seismograph. The lines are the rating going into
					each game; the bars are how much each game moved it, split into offense and defense.
				</p>
				<LearnDemo initial={data.learn} />
			</section>

			<section id="memory">
				<h2>How long DARKO remembers</h2>
				<p>
					DARKO weighs every game a player has ever played, and each stat forgets at its own speed.
					It believes a new role within a couple of games and a new shot diet within a few weeks,
					but a hot shooting month barely moves its view of a shooter: three-point percentage takes
					about a season and a half to halve. Slide back through the games to see how much one from
					then still counts.
				</p>
				<MemoryChart />
			</section>

			<section id="model">
				<h2>Inside the model</h2>
				<ModelFlow />

				<p>
					DARKO is built using a combination of classical statistical techniques and modern machine
					learning methods. DARKO is Bayesian in nature, updating its projections in response to new
					information, with the amount of the update varying by player and by stat, depending on
					DARKO's confidence in its prior estimate.
				</p>

				<p id="model-inputs">
					The inputs for DARKO are NBA box scores, tracking data, and other game-level information
					from <a href="https://www.basketball-reference.com/">Basketball-Reference.com</a>,
					<a href="https://www.nba.com/stats">NBA.com</a>, and aided by
					<a href="https://github.com/dblackrun/pbpstats">Darryl Blackport's work in creating pbpstats.com</a>.
					{#if totals}
						DARKO's ratings cover every player's games since the 1996-97 season:
						{count(totals.playerGames)} of them so far.
					{:else}
						DARKO's ratings cover every player's games since the 1996-97 season.
					{/if}
				</p>

				<p>
					DARKO grapples with the core problem facing every fantasy player (and fan): understanding
					how much of a given player's development or decline in-season reflects real talent changes,
					and how much is just the random noise that is part of an NBA season. DARKO addresses these
					issues without any arbitrary endpoints, i.e., without looking at the last X games of a
					player's career.
				</p>

				<p id="model-decay">
					DARKO does this by modeling player performance via an exponential decay model, weighing
					each game a player has ever played by &beta;<sup>t</sup>, where &beta; is some number
					between 0 and 1, and 't' is the number of days ago a given game took place. The value of
					&beta; differs for each stat, selected to best predict future results. A differential
					evolution optimizer is used to calculate each &beta;.
				</p>

				<p>
					DARKO also combines this exponential decay approach with a
					<a href="https://en.wikipedia.org/wiki/Kalman_filter">modified Kalman filter</a>.
					Kalman filters are a standard approach used in time-series analysis to model the location
					of an object for which only noisy measurements are available. Commonly used in fields such
					as robotics, aviation, rocketry, and neuroscience, it is
					<a href="https://pdfs.semanticscholar.org/6dfd/7ee77c7503ef7f7feb5654149cca53f691c3.pdf">well suited for sports analysis as well</a>.
				</p>

				<p id="model-combine">
					A <a href="https://en.wikipedia.org/wiki/Gradient_boosting#Algorithm">gradient boosted decision tree</a>
					is used to combine the decay and Kalman projections.
				</p>

				<p id="model-adjustments">DARKO also accounts for several sports statistics phenomena. These include:</p>

				<ul>
					<li>
						<strong>Rest/Travel/Home Court Effects:</strong> As is widely known, players perform
						worse on the road or on the second night of a back-to-back. DARKO accounts for these
						effects on a component-by-component level, and the adjustments themselves update daily
						in response to new information (e.g.,
						<a href="http://harvardsportsanalysis.org/2017/03/nba-home-court-advantage-is-in-decline-are-3s-to-blame/">home court advantage has been decreasing in the NBA for some time</a>).
					</li>
					<li>
						<strong>Opponent Adjustments:</strong> DARKO's projections account for who each team is
						playing on a given night, accounting for the projected influence of a player's opponents
						on each individual stat.
					</li>
					<li>
						<strong>Aging:</strong> DARKO includes an aging curve. Because players improve
						differently with age in different stats, DARKO uses an independent aging curve for every
						stat it projects. DARKO also attempts to account for the selection biases which make
						<a href="http://blog.philbirnbaum.com/2019/11/why-you-cant-calculate-aging.html">aging studies very difficult to carry out in sports data</a>.
					</li>
					<li>
						<strong>Seasonality:</strong> Throughout the NBA, offensive efficiency to start the
						season is usually relatively low league-wide and increases throughout the year. DARKO
						accounts for a temporary flattening of the rise in assist rates (and other offensive
						metrics) around the all-star break. All seasonality effects are calculated separately
						for each component.
					</li>
					<li>
						<strong>Interaction Effects:</strong> DARKO accounts for interactions between various
						box-score components in making its projections. For example, if a player improves both
						his three-point shooting and his free throw shooting simultaneously, DARKO will be
						inherently more credulous of such an improvement.
					</li>
					<li>
						<strong>Free Agency:</strong> Changing teams has a big impact on some box-score
						components, and DARKO accounts for that. DARKO also gets less confident in its
						understanding of a player's talent when they change teams, effectively increasing its
						"learning rate" for these players.
					</li>
				</ul>
			</section>

			<section id="box-to-dpm">
				<h2>From box scores to DPM</h2>
				<p>
					While DARKO is at its core a box-score projection system, it can also be used to generate
					plus-minus projections, similar in nature to RPM, PIPM, etc. I have called this metric
					DPM, for "Daily Plus Minus." This metric provides an estimate of how much DARKO thinks
					each player impacts the score of a game.
				</p>
				<p>
					Daily Plus Minus is available in two flavors. A box-score-only version (Box DPM), which
					combines the core box-score metrics to predict player value, and another set (DPM) which
					adds in on-off data to do the same. Both DPM and Box DPM remain works in progress and may
					change substantially going forward.
				</p>
				<p>
					How much the on-off data counts grows with a player's career. Early on DPM is mostly the
					box score; a few seasons in, mostly on-off, and sooner on defense, where the box score
					sees less.
				</p>
				<BlendSlider examples={data.blend} />
				<p>
					The Active Leaderboard also translates DPM and minutes into an annualized
					<a href="/about/fair-salary">Fair Salary / $ Value estimate</a>.
				</p>
			</section>

			<section id="rookies">
				<h2>Rookies and the offseason</h2>
				<p>
					DARKO has no NCAA, summer league, or preseason data in it. Before a player's first game,
					his rating comes from his age, draft slot and height, and then DARKO learns about him as he
					plays, fastest at the start, as Kon Knueppel's season above shows.
				</p>
				<RookieStarts initial={data.rookies} />
				<p>
					Between seasons DARKO keeps projecting every player, pulled back toward average. Until the
					next season starts, the site shows each player as he stood going into his last game.
				</p>
			</section>

			<section id="accuracy">
				<h2>Accuracy</h2>
				<p>
					While DARKO is not intended to be a DFS tool, given the dearth of other projection systems
					out there for the NBA, a natural place to test DARKO was to compare how DARKO performs
					against DFS projections. With one exception, DARKO beat both sites in every stat tested
					(minutes, points, rebounds, assists, blocks, turnovers, and threes made), some by
					substantial margins.
				</p>
				<p>
					The only stat where DARKO lost was in minutes projections. Predictably, playing-time
					projections are the hardest part of any projection system, and DARKO is no different in
					this respect.
				</p>
				<p>
					In <a href={HOOPSHYPE_SURVEY.url}>HoopsHype's survey of NBA team staff</a>, DPM ranked first
					among the public all-in-one metrics: 8 of the {HOOPSHYPE_SURVEY.respondents} respondents
					named it their preferred metric, more than any other; 10 more said they trusted it; 1 said
					they did not.
				</p>
				<blockquote>
					<p>“…allowing him to confidently say when a players’ improvement is more signal than noise.”</p>
					<cite>Cory Jez, the Utah Jazz's former head of analytics, on DPM, to HoopsHype</cite>
				</blockquote>
			</section>

			<section id="tour">
				<h2>On the site</h2>
				<ul class="about-tools">
					{#each tools as tool (tool.href)}
						<li>
							<a href={tool.href}>
								<strong>{tool.label}</strong>
								<span>{tool.text}</span>
							</a>
						</li>
					{/each}
				</ul>
				<p class="about-ask">
					Or ask. Ask DARKO, the search in the menu, takes plain questions like "best defenders
					under 25", "Jokic vs Wembanyama" or "trade Giannis to the Knicks".
				</p>
			</section>

			<section id="faq">
				<h2>Questions</h2>
				<details>
					<summary>Why did a player's rating move after one game?</summary>
					<p>
						DARKO updates every rating after every game. A game that surprises it moves the rating
						more, and so does a game early in a career, when DARKO knows less. Each player page's
						Seismograph shows every game's move.
					</p>
				</details>
				<details>
					<summary>How is DPM different from RAPM, EPM or LEBRON?</summary>
					<p>
						DPM looks forward: it is DARKO's forecast for a player's next game, built from every game
						he has played with the recent ones counting most. Most other all-in-one numbers describe
						a season. Ask them who was best this year; ask DPM who is best now.
					</p>
				</details>
				<details>
					<summary>Why do the numbers change between seasons?</summary>
					<p>
						Between seasons DARKO pulls its projections back toward average. Until the next season
						starts, the site shows each player as he stood going into his last game.
					</p>
				</details>
				<details>
					<summary>How does DARKO rate rookies?</summary>
					<p>
						From his age, draft slot and height until he plays, and then from his games, fast at
						first. It has no college, summer league or preseason data.
					</p>
				</details>
				<details>
					<summary>What are projected minutes?</summary>
					<p>
						DARKO's forecast of a player's minutes a game, from his recent playing time and role.
						Minutes are the hardest thing any projection system forecasts.
					</p>
				</details>
				<details>
					<summary>Can I see what DARKO said on a past date?</summary>
					<p>
						Yes. The Time Machine, in the menu, sets the leaderboard, the player pages and the Roster
						Lab to any day since 1996-97, and <a href="/rewind">Rewind</a> replays a season week by
						week.
					</p>
				</details>
				<details>
					<summary>Can I download the data?</summary>
					<p>
						Yes: the leaderboard, team pages, Compare, Standings, WOWY, Lineups, Longevity and the
						Fantasy Lab each have a CSV download.
					</p>
				</details>
			</section>

			<section id="glossary">
				<h2>Glossary</h2>
				<dl class="about-glossary">
					<div id="glossary-dpm">
						<dt>DPM (Daily Plus Minus)</dt>
						<dd>
							The points per 100 possessions a player adds to his team's margin over an average
							player, forecast for his next game. Zero is average.
						</dd>
					</div>
					<div id="glossary-offense-defense">
						<dt>Offense and Defense</dt>
						<dd>DPM's two halves. Higher is better on both.</dd>
					</div>
					<div id="glossary-box-dpm">
						<dt>Box DPM</dt>
						<dd>The version built from box-score projections alone.</dd>
					</div>
					<div id="glossary-on-off-dpm">
						<dt>On/Off DPM</dt>
						<dd>The version that also uses the team's results with the player on and off the floor.</dd>
					</div>
					<div id="glossary-rapm">
						<dt>RAPM</dt>
						<dd>
							Regularized adjusted plus-minus: team results credited to the players on the floor,
							shrunk toward average.
						</dd>
					</div>
					<div id="glossary-wowy">
						<dt>WOWY RAPM</dt>
						<dd>A RAPM-style rating from with-or-without data, built the same way from 1956-57 on.</dd>
					</div>
					<div id="glossary-minutes">
						<dt>Projected minutes</dt>
						<dd>DARKO's forecast of a player's minutes a game.</dd>
					</div>
					<div id="glossary-fair-salary">
						<dt>Fair salary ($ Value)</dt>
						<dd>
							What a player's on-court value is worth a season, from his DPM and minutes.
							<a href="/about/fair-salary">How it is calculated</a>.
						</dd>
					</div>
					<div id="glossary-surplus">
						<dt>Surplus value</dt>
						<dd>Fair salary minus actual salary. Positive means underpaid.</dd>
					</div>
				</dl>
			</section>

			<section id="origins">
				<h2>Origins and thanks</h2>
				<p>
					When DARKO started, public basketball stats mostly explained the past. Few projected the
					future, and fewer did it stat by stat.
				</p>
				<p>
					DARKO (Daily Adjusted and Regressed Kalman Optimized projections) is an attempt to fill
					that gap. As will be familiar to baseball fans, DARKO is a basketball projection system
					similar in concept to Steamer, PECOTA, and ZiPS. To my knowledge, it is one of the few
					public computer-driven NBA box-score projection systems.
				</p>
				<p>
					Further, unlike the baseball projection systems listed above (or the CARMELO/RAPTOR
					projections), DARKO is built from the ground up to update its projections daily,
					responding to new information as it comes. Instead of just making a projection before the
					season and leaving users to guess whether a given breakout is "real" or not, DARKO updates
					its projections for every player in the NBA, for every box-score stat, for every day of
					the season.
				</p>
				<details class="about-original">
					<summary>The original introduction</summary>
					<p>
						The public basketball stats space has advanced wonderfully over the last decade, most
						prominently with the explosion of "all-in-one" metrics like RAPM, RPM,
						<a href="https://www.bball-index.com/lebron-introduction/">LEBRON</a>, and
						<a href="https://www.basketball-reference.com/about/bpm.html">BPM</a>, among others.
						Excellent research has also been done on a number of other topics, such as
						<a href="https://fansided.com/2016/09/14/positional-versatility-score/">positional versatility</a>,
						<a href="https://www.apbr.org/metrics/viewtopic.php?f=2&t=8575">clutch performance</a>,
						<a href="https://thepowerrank.com/2013/10/29/3-point-defense-in-the-nba-skill-or-luck/">shooting luck</a>, and
						<a href="https://fansided.com/2018/04/19/nylon-calculus-nba-matchup-data-defensive-roles/">matchups</a>.
					</p>
					<p>
						However, despite these advances, there has been a relative dearth of focus on
						forward-looking projections as opposed to backwards-looking explanations, and even less
						public work on basic box-score metrics (as opposed to "all-in-one" metrics).
						<a href="https://fansided.com/2017/12/21/nylon-calculus-team-stats-noise-stabilization-thunder/">Krishna Narsu has done excellent work on the "stability" of various stats</a>,
						<a href="https://twitter.com/kmedved/status/1063456469511737344">and I have contributed myself</a>,
						but this work has been on a team level. FiveThirtyEight, meanwhile, had been releasing
						their CARMELO/RAPTOR player projections (FiveThirtyEight has since closed), but these are
						likewise rolled-up, "all-in-one"-style projections that tell us relatively little about
						where a player's growth/decline is going to come from.
					</p>
				</details>
				<p>
					For an audio primer, listen to Kostya on Canzhi Ye's
					<a href={PODCAST}>Sports on Paper podcast</a>
					(January 2022; also on <a href={PODCAST_APPLE}>Apple Podcasts</a>): how DARKO works,
					listener questions about it, and a range of NBA analytics topics, most of them about
					prediction.
				</p>

				<h3>Acknowledgments</h3>
				<p>
					Thanks to almost everyone on NBA twitter for help with DARKO's development.
					Special thanks to
					<a href="https://twitter.com/DanRosenheck">Dan Rosenheck</a>,
					<a href="https://twitter.com/bbstats">Nathan Walker</a>, and
					<a href="https://twitter.com/tangotiger">TangoTiger</a> for inspiration in the design of
					DARKO, and assistance with the underlying math.
					Thanks to <a href="https://twitter.com/anpatt7">Andrew Patton</a> for building the
					original Shiny app.
					Thanks to <a href="https://github.com/rd11490">Ryan Davis</a> for extensive coding
					assistance, and to <a href="https://github.com/canzhiye">Canzhi Ye</a> for scraping
					assistance.
					Thanks to <a href="https://twitter.com/mlermo">Mike Lehrman</a> and Eric Westlund for
					additional design discussions.
					Thanks to <a href="https://twitter.com/knarsu3">Krishna Narsu</a> for providing much of
					the training data used by DARKO.
					Thanks to <a href="https://twitter.com/natesolon">Nate Solon</a> for help researching
					time-series analysis techniques.
				</p>
				<p>
					Special thanks to <a href="https://twitter.com/SethPartnow">Seth Partnow</a> for making
					sure I didn't just spend all this time building yet-another-all-in-one-stat. And thanks to
					<a href="https://twitter.com/bballstrategy">Crow</a> for making me build one anyway.
				</p>

				<div class="about-attribution">
					@kmedved | www.darko.app | @anpatt7
				</div>
			</section>
		</article>

		<aside class="about-rail" aria-label="On this page">
			<p>On this page</p>
			{#each SECTIONS as section (section.id)}
				<a href="#{section.id}">{section.label}</a>
			{/each}
		</aside>
	</div>
</div>

<style>
	.about-page {
		background: var(--bg);
	}

	.about-hero {
		border-bottom: 1px solid var(--border);
		background: var(--bg-surface);
	}

	.about-hero-inner {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(220px, 340px);
		align-items: center;
		gap: 40px;
		max-width: 1120px;
		padding-top: 56px;
		padding-bottom: 48px;
	}

	.about-kicker {
		margin: 0 0 14px;
		color: var(--text-muted);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.about-hero h1 {
		max-width: 720px;
		margin: 0;
		color: var(--text);
		font-family: var(--font-display);
		font-size: clamp(34px, 5vw, 52px);
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.05;
	}

	.about-deck {
		max-width: 680px;
		margin: 20px 0 0;
		color: var(--text-secondary);
		font-size: 19px;
		line-height: 1.55;
	}

	.about-credential {
		max-width: 680px;
		margin: 14px 0 0;
		color: var(--text);
		font-size: 15px;
		font-weight: 600;
	}

	.about-credential a,
	.about-secondary {
		color: var(--accent);
	}

	.about-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px 20px;
		margin-top: 26px;
	}

	.about-primary {
		display: inline-flex;
		align-items: center;
		min-height: 42px;
		padding: 0 18px;
		border-radius: 8px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		text-decoration: none;
	}

	.about-primary:hover {
		filter: brightness(0.95);
	}

	/* Shiny colours every page link; the button keeps its white label. */
	:global(:root[data-view='shiny']) .about-page .about-primary,
	:global(:root[data-view='shiny']) .about-page .about-primary:hover {
		color: #fff;
		text-decoration: none;
	}

	.about-secondary {
		font-size: 14px;
		font-weight: 700;
	}

	/* The logo is drawn on white; on a dark theme it sits as a card. */
	.about-logo {
		display: block;
		justify-self: end;
		width: 100%;
		max-width: 340px;
		height: auto;
		border-radius: 14px;
	}

	.about-facts {
		border-bottom: 1px solid var(--border);
	}

	.about-facts-inner {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		max-width: 1120px;
	}

	.about-facts-inner > div {
		display: grid;
		gap: 4px;
		padding: 20px 24px;
		border-right: 1px solid var(--border);
	}

	.about-facts-inner > div:first-child {
		border-left: 1px solid var(--border);
	}

	.about-facts strong {
		color: var(--text);
		font-family: var(--font-mono);
		font-size: 22px;
		font-weight: var(--figure-weight-strong);
	}

	.about-facts span {
		color: var(--text-muted);
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
	}

	.about-jump {
		display: none;
	}

	.about-layout {
		display: grid;
		grid-template-columns: minmax(0, 780px) 190px;
		justify-content: center;
		gap: 56px;
		max-width: 1120px;
		padding-top: 24px;
		padding-bottom: 72px;
	}

	.about-article {
		min-width: 0;
	}

	.about-article section {
		scroll-margin-top: calc(var(--nav-sticky-offset, 0px) + 16px);
	}

	.about-article h2 {
		margin: 48px 0 16px;
		padding-top: 18px;
		border-top: 1px solid var(--border-subtle);
		color: var(--text);
		font-family: var(--font-display);
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -0.01em;
		line-height: 1.2;
	}

	.about-article section:first-child h2 {
		margin-top: 28px;
	}

	.about-article h3 {
		margin: 30px 0 10px;
		color: var(--text);
		font-family: var(--font-display);
		font-size: 19px;
		font-weight: 800;
	}

	.about-article p {
		margin: 0 0 16px;
		color: var(--text-secondary);
		font-size: 16px;
		line-height: 1.72;
	}

	.about-article ul:not(.about-tools) {
		margin: 0 0 16px;
		padding: 0;
		list-style: none;
	}

	.about-article ul:not(.about-tools) li {
		position: relative;
		margin-bottom: 12px;
		padding-left: 20px;
		color: var(--text-secondary);
		font-size: 16px;
		line-height: 1.7;
	}

	.about-article ul:not(.about-tools) li::before {
		content: '';
		position: absolute;
		top: 10px;
		left: 0;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
	}

	.about-article a {
		color: var(--accent);
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--accent) 35%, transparent);
		text-underline-offset: 2px;
	}

	.about-article a:hover {
		text-decoration-color: var(--accent);
	}

	.about-article strong {
		color: var(--text);
	}

	blockquote {
		margin: 26px 0;
		padding: 4px 0 4px 20px;
		border-left: 3px solid var(--accent);
	}

	blockquote p {
		margin: 0 0 6px;
		color: var(--text);
		font-family: var(--font-display);
		font-size: 21px;
		font-weight: 700;
		line-height: 1.35;
	}

	blockquote cite {
		color: var(--text-muted);
		font-size: 13px;
		font-style: normal;
	}

	.about-tools {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
		margin: 16px 0 18px;
		padding: 0;
		list-style: none;
	}

	.about-tools a {
		display: grid;
		gap: 4px;
		height: 100%;
		padding: 14px 16px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-surface);
		color: var(--text-secondary);
		text-decoration: none;
		transition: border-color 0.15s ease;
	}

	.about-tools a:hover,
	.about-tools a:focus-visible {
		border-color: var(--accent);
	}

	.about-tools strong {
		font-family: var(--font-display);
		font-size: 15px;
		font-weight: 800;
	}

	.about-tools span {
		font-size: 14px;
		line-height: 1.45;
	}

	details {
		border-top: 1px solid var(--border-subtle);
	}

	details:last-of-type {
		border-bottom: 1px solid var(--border-subtle);
	}

	summary {
		padding: 14px 0;
		color: var(--text);
		font-size: 16px;
		font-weight: 700;
		cursor: pointer;
	}

	details p {
		margin-top: -4px;
	}

	.about-original {
		margin: 8px 0 22px;
	}

	.about-glossary {
		display: grid;
		gap: 0;
		margin: 0;
	}

	.about-glossary > div {
		display: grid;
		grid-template-columns: 12em minmax(0, 1fr);
		gap: 14px;
		padding: 12px 0;
		border-top: 1px solid var(--border-subtle);
		scroll-margin-top: calc(var(--nav-sticky-offset, 0px) + 16px);
	}

	.about-glossary dt {
		color: var(--text);
		font-weight: 800;
	}

	.about-glossary dd {
		margin: 0;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.about-attribution {
		margin-top: 48px;
		padding-top: 24px;
		border-top: 1px solid var(--border);
		color: var(--text-muted);
		font-size: 12px;
		text-align: center;
	}

	.about-rail {
		position: sticky;
		top: calc(var(--nav-sticky-offset, 0px) + 24px);
		align-self: start;
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 28px;
		padding-left: 18px;
		border-left: 1px solid var(--border);
	}

	.about-rail p {
		margin: 0 0 2px;
		color: var(--text);
		font-size: 12px;
		font-weight: 800;
		text-transform: uppercase;
	}

	.about-rail a {
		color: var(--text-muted);
		font-size: 13px;
		line-height: 1.35;
		text-decoration: none;
	}

	.about-rail a:hover {
		color: var(--accent);
	}

	@media (max-width: 1000px) {
		.about-layout {
			grid-template-columns: minmax(0, 780px);
		}

		.about-rail {
			display: none;
		}

		.about-jump {
			display: flex;
			gap: 8px;
			padding-top: 14px;
			padding-bottom: 4px;
			overflow-x: auto;
			scrollbar-width: none;
		}

		.about-jump::-webkit-scrollbar {
			display: none;
		}

		.about-jump a {
			flex: none;
			padding: 6px 12px;
			border: 1px solid var(--border);
			border-radius: 999px;
			color: var(--text-secondary);
			font-size: 13px;
			font-weight: 700;
			text-decoration: none;
		}
	}

	@media (max-width: 760px) {
		.about-hero-inner {
			grid-template-columns: 1fr;
			gap: 20px;
			padding-top: 30px;
			padding-bottom: 32px;
		}

		.about-logo {
			grid-row: 1;
			justify-self: start;
			max-width: 220px;
		}

		.about-deck {
			font-size: 17px;
		}

		.about-facts-inner {
			grid-template-columns: 1fr;
		}

		.about-facts-inner > div {
			grid-template-columns: auto minmax(0, 1fr);
			align-items: baseline;
			gap: 10px;
			padding: 12px 0;
			border-right: 0;
			border-bottom: 1px solid var(--border-subtle);
		}

		.about-facts-inner > div:first-child {
			border-left: 0;
		}

		.about-facts-inner > div:last-child {
			border-bottom: 0;
		}

		.about-tools {
			grid-template-columns: 1fr;
		}

		.about-glossary > div {
			grid-template-columns: 1fr;
			gap: 4px;
		}
	}
</style>
