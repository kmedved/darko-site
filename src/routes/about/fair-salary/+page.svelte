<svelte:head>
	<title>How DARKO Calculates Fair Salary — DARKO DPM</title>
	<meta
		name="description"
		content="How DARKO converts DPM and minutes into its Fair Salary, $ Value, Salary, and Surplus estimates."
	/>
</svelte:head>

<div class="container about-page" data-shiny-page>
	<article class="about-article fair-salary-article">
		<a class="back-link" href="/about">← About DARKO</a>
		<h1>How DARKO Calculates Fair Salary</h1>

		<p class="lede">
			On the Active Leaderboard, <strong>Fair Salary</strong> is labeled <strong>$ Value</strong>.
			The underlying field is <code>sal_market_fixed</code>. It is an annualized estimate of a
			player's projected on-court value, not a prediction of what contract the player will sign.
		</p>

		<h2>The calculation</h2>

		<ol class="calculation-steps">
			<li>
				<strong>Estimate value above replacement.</strong>
				DARKO combines DPM with its time-decayed minutes estimate (<code>tr_minutes</code>):
				<div class="formula">Game value = (DPM + 2.0) × (tr_minutes ÷ 48)</div>
				The 2.0 comes from a replacement level of &minus;2.0 DPM. Both impact and workload
				therefore affect the result. After the regular season, the current snapshot uses each
				player's same-season regular-season MPG in place of <code>tr_minutes</code>.
			</li>
			<li>
				<strong>Set one dollar rate for the season.</strong>
				The estimated league-wide payroll per regular-season game is divided by the average
				league-wide game value per game. Using one fixed seasonal exchange rate keeps a
				player's estimate from moving merely because the other players in a single daily
				snapshot changed.
			</li>
			<li>
				<strong>Annualize and smooth.</strong>
				<div class="formula">Raw fair salary = game value × seasonal dollar rate × 82</div>
				Historical daily values are Kalman-smoothed for each player, with higher-minute
				observations carrying more weight, so one game does not whipsaw the running estimate.
				After the regular season, the current snapshot shows the raw fixed-rate value described
				above.
			</li>
		</ol>

		<h2>Related fields</h2>

		<dl class="field-list">
			<div>
				<dt>Salary <code>actual_salary</code></dt>
				<dd>
					Reported salary expressed in 2025&ndash;26 cap dollars by preserving the player's
					salary as a share of that season's cap.
				</dd>
			</div>
			<div>
				<dt>Surplus <code>surplus_value</code></dt>
				<dd>
					<code>sal_market_fixed - actual_salary</code>. A positive number means DARKO's
					fair-salary estimate is above the player's Salary; a negative number means it is below.
				</dd>
			</div>
		</dl>

		<p class="interpretation-note">
			Fair Salary is deliberately an on-court value estimate. It does not apply the NBA's
			minimum- or maximum-salary rules, and it does not price age, contract length, options,
			negotiating leverage, roster fit, or positional scarcity. Below-replacement estimates can
			therefore be negative.
		</p>
	</article>
</div>

<style>
	.about-article {
		max-width: 800px;
		margin: 0 auto;
		padding: 48px 0 64px;
		overflow-wrap: anywhere;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 20px;
		color: var(--accent);
		font-size: 13px;
		font-weight: 700;
	}

	.about-article h1 {
		margin-bottom: 20px;
		color: var(--text);
		font-size: 28px;
		font-weight: 700;
		letter-spacing: -0.02em;
	}

	.about-article h2 {
		margin-top: 40px;
		margin-bottom: 16px;
		padding-top: 16px;
		border-top: 1px solid var(--border-subtle);
		color: var(--text);
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.about-article p,
	.about-article li,
	.about-article dd {
		color: var(--text-secondary);
		font-size: 15px;
		line-height: 1.7;
	}

	.about-article strong,
	.about-article dt {
		color: var(--text);
	}

	.lede {
		margin-bottom: 16px;
		font-size: 16px;
	}

	code,
	.formula {
		font-family: var(--font-mono);
	}

	code {
		color: var(--text);
		font-size: 0.9em;
	}

	.calculation-steps {
		display: grid;
		gap: 18px;
		margin: 0;
		padding-left: 22px;
	}

	.calculation-steps li {
		padding-left: 4px;
	}

	.formula {
		margin: 10px 0;
		padding: 12px 14px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 14px;
		line-height: 1.5;
	}

	.field-list {
		display: grid;
		gap: 12px;
		margin: 0 0 24px;
	}

	.field-list > div {
		padding: 14px 16px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-surface);
	}

	.field-list dt {
		margin-bottom: 4px;
		font-size: 14px;
		font-weight: 700;
	}

	.field-list dd {
		margin: 0;
	}

	.interpretation-note {
		margin-top: 24px;
		padding-left: 14px;
		border-left: 3px solid var(--accent);
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

		.formula {
			font-size: 12px;
		}
	}
</style>
