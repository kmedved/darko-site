<svelte:head>
	<title>What is DARKO? — DARKO DPM</title>
</svelte:head>

<div class="container">
	<article class="about-article">
		<h1>What Is DARKO?</h1>

		<p>
			DARKO is a machine learning-driven basketball player box-score projection system.
		</p>

		<p>
			<a href="https://callin.com/link/jyShrOvLtk">For an audio primer check out Kostya on Seth Partnow's show here.</a>
		</p>

		<p>
			The public basketball stats space has advanced wonderfully over the last decade, most
			prominently with the explosion of "all-in-one" metrics like
			<a href="http://nbashotcharts.com/rapm?id=1109440799">RAPM</a>,
			<a href="http://www.espn.com/nba/statistics/rpm">RPM</a>,
			<a href="https://www.bball-index.com/lebron-introduction/">LEBRON</a>, and
			<a href="https://www.basketball-reference.com/about/bpm.html">BPM</a>, among others.
			Excellent research has also been done on a number of other topics, such as
			<a href="https://fansided.com/2016/09/14/positional-versatility-score/">positional versatility</a>,
			<a href="http://www.apbr.org/metrics/viewtopic.php?f=2&t=8575">clutch performance</a>,
			<a href="https://thepowerrank.com/2013/10/29/3-point-defense-in-the-nba-skill-or-luck/">shooting luck</a>, and
			<a href="https://fansided.com/2018/04/19/nylon-calculus-nba-matchup-data-defensive-roles/">matchups</a>.
		</p>

		<p>
			However, despite these advances, there has been a relative dearth of focus on
			forward-looking projections as opposed to backwards-looking explanations, and even less
			public work on basic box-score metrics (as opposed to "all-in-one" metrics).
			<a href="https://fansided.com/2017/12/21/nylon-calculus-team-stats-noise-stabilization-thunder/">Krishna Narsu has done excellent work on the "stability" of various stats</a>,
			<a href="https://twitter.com/kmedved/status/1063456469511737344">and I have contributed myself</a>,
			but this work has been on a team level. FiveThirtyEight, meanwhile, has been releasing their
			<a href="https://projects.fivethirtyeight.com/2020-nba-player-projections/">CARMELO/RAPTOR player projections</a>,
			but these are likewise rolled-up, "all-in-one"-style projections that tell us relatively
			little about where a player's growth/decline is going to come from.
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

		<h2>Model Summary</h2>

		<p>
			DARKO is built using a combination of classical statistical techniques and modern machine
			learning methods. DARKO is Bayesian in nature, updating its projections in response to new
			information, with the amount of the update varying by player and by stat, depending on
			DARKO's confidence in its prior estimate.
		</p>

		<p>
			The inputs for DARKO are NBA box scores, tracking data, and other game-level information
			from <a href="https://www.basketball-reference.com/">Basketball-Reference.com</a>,
			<a href="https://stats.nba.com/">NBA.com</a>, and aided by
			<a href="https://github.com/dblackrun/pbpstats">Darryl Blackport's work in creating pbpstats.com</a>.
			DARKO is trained on every player game log since the 2001 season (about 736,000 so far).
		</p>

		<p>
			DARKO grapples with the core problem facing every fantasy player (and fan): understanding
			how much of a given player's development or decline in-season reflects real talent changes,
			and how much is just the random noise that is part of an NBA season. DARKO addresses these
			issues without any arbitrary endpoints, i.e., without looking at the last X games of a
			player's career.
		</p>

		<p>
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

		<p>
			A <a href="https://en.wikipedia.org/wiki/Gradient_boosting#Algorithm">gradient boosted decision tree</a>
			is used to combine the decay and Kalman projections.
		</p>

		<p>DARKO also accounts for several sports statistics phenomena. These include:</p>

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

		<h2>Daily Plus Minus (DPM)</h2>

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

		<h2>Rookies</h2>

		<p>
			DARKO presently has no NCAA, summer league, or preseason data in it. That means rookies
			are all initialized to essentially the same starting point (with some differences for age),
			and then DARKO "learns" about them as they play.
		</p>

		<h2>Further Improvements</h2>

		<p>
			DARKO is currently calibrated to generate projections for each player for the next day of
			the season. The framework is extendable to other types of projections as well, such as
			season-long projections or upside/peak projections, along with adding more tracking data,
			biometric data, and G-League data into the model.
		</p>

		<h2>Acknowledgments</h2>

		<p>
			Thanks to almost everyone on NBA twitter for help with DARKO's development.
			Special thanks to
			<a href="https://twitter.com/DanRosenheck">Dan Rosenheck</a>,
			<a href="https://twitter.com/bbstats">Nathan Walker</a>, and
			<a href="https://twitter.com/tangotiger">TangoTiger</a> for inspiration in the design of
			DARKO, and assistance with the underlying math.
			Thanks to <a href="https://twitter.com/anpatt7">Andrew Patton</a> for building this
			application.
			Thanks to <a href="https://twitter.com/rd11490">Ryan Davis</a> for extensive coding
			assistance, and to <a href="https://twitter.com/canzhiye">Canzhi Ye</a> for scraping
			assistance.
			Thanks to <a href="https://twitter.com/mlermo">Mike Lehrman</a> and
			<a href="http://@EricEsq503">Eric Westlund</a> for additional design discussions.
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
	</article>
</div>

<style>
	.about-article {
		max-width: 800px;
		margin: 0 auto;
		padding: 48px 0 64px;
	}

	.about-article h1 {
		font-size: 28px;
		font-weight: 700;
		letter-spacing: -0.02em;
		color: var(--text);
		margin-bottom: 24px;
	}

	.about-article h2 {
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text);
		margin-top: 40px;
		margin-bottom: 16px;
		padding-top: 16px;
		border-top: 1px solid var(--border-subtle);
	}

	.about-article p {
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 1.7;
		margin-bottom: 16px;
	}

	.about-article ul {
		list-style: none;
		padding: 0;
		margin-bottom: 16px;
	}

	.about-article li {
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 1.7;
		margin-bottom: 12px;
		padding-left: 20px;
		position: relative;
	}

	.about-article li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 10px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
	}

	.about-article a {
		color: var(--accent);
		text-decoration: underline;
		text-decoration-color: rgba(91, 141, 239, 0.3);
		text-underline-offset: 2px;
	}

	.about-article a:hover {
		text-decoration-color: var(--accent);
	}

	.about-attribution {
		margin-top: 48px;
		padding-top: 24px;
		border-top: 1px solid var(--border);
		text-align: center;
		font-size: 12px;
		color: var(--text-muted);
	}

	@media (max-width: 768px) {
		.about-article {
			padding: 32px 0 48px;
		}
		.about-article h1 {
			font-size: 22px;
		}
		.about-article h2 {
			font-size: 18px;
		}
	}
</style>
