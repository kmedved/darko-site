# DARKO methodology reference

Generated from src/lib/utils/aboutDarko.js, metricDefinitions.js and csvPresets.js. Regenerate with npm run plugin:reference after source changes.

Source: https://www.darko.app/about

## Interpretation

DARKO career histories are retrospective pregame estimates, not an archive of ratings originally published on each date. Past values can change after a refit. Coverage begins in 1996–97; earlier careers are partial. Games count played appearances in available history. LOESS is a presentation curve, not a future projection. Raw peaks and smoothed peaks are different statistics. Selected values use the nearest observed rating inside coverage; retain its actual date and axis value. Charts include played games only. Numeric monthly and seasonal summaries include all published rating states, including missed-game, scheduled-game and offseason states, so their starts, ends and peaks can differ from the chart.

## Metrics

- **DPM (dpm):** Full Daily Plus Minus, combining offensive and defensive contributions.
- **Offense (o_dpm):** Offensive DPM, representing projected offensive impact on scoreboard differential.
- **Defense (d_dpm):** Defensive DPM, representing projected defensive impact on scoreboard differential.
- **Box DPM (box_dpm):** Box-score-only DPM, built from core on-court box-score components.
- **On/Off DPM (on_off_dpm):** On/off DPM, incorporating team-level impact when a player is on vs. off the court.
- **RAPM (bayes_rapm_total):** Bayesian RAPM total estimate, in points per 100 possessions above league average.
- **WOWY RAPM (wowy_rapm):** Daily-grain synthetic RAPM estimate built consistently from the 1956-57 season onward. Historical dates use a modest hindsight refinement to sharpen career arcs.
- **WOWY O-RAPM (wowy_orapm):** Daily-grain synthetic offensive RAPM estimate with the same historical refinement. Offensive and defensive attribution is less stable than total impact.
- **WOWY D-RAPM (wowy_drapm):** Daily-grain synthetic defensive RAPM estimate with the same historical refinement, where positive values mean better defense. Offensive and defensive attribution is less stable than total impact.
- **wowy_exposure (wowy_exposure):** Model exposure at the latest observed game. It is a sample-support measure, not minutes or possessions.
- **wowy_sample_games (wowy_sample_games):** Played games in the available WOWY sample, including postseason games. It starts at the player's first published WOWY appearance.
- **Min (trend) (tr_minutes):** Time-decayed running-average minutes.
- **MPG (x_minutes):** Projected minutes per game.
- **Pace (x_pace):** Projected possession pace (higher values indicate faster-paced play).
- **Pts per 100 (x_pts_100):** Projected points per 100 possessions.
- **Ast per 100 (x_ast_100):** Projected assists per 100 possessions.
- **FG% (x_fg_pct):** Projected field-goal percentage.
- **3P% (x_fg3_pct):** Projected three-point percentage.
- **FT% (x_ft_pct):** Projected free-throw percentage.
- **Fair Salary (sal_market_fixed):** Annualized on-court value estimate based on DPM above replacement and DARKO’s time-decayed minutes estimate.
- **Surplus Value (surplus_value):** Difference between fair salary and actual salary. Positive means underpaid.
- **lineup_net_pm (lineup_net_pm):** Projected net plus/minus per 100 possessions for this lineup, relative to league average.
- **lineup_off_pm (lineup_off_pm):** Projected offensive plus/minus per 100 possessions for this lineup, relative to league average.
- **lineup_def_pm (lineup_def_pm):** Projected defensive plus/minus per 100 possessions for this lineup, relative to league average.
- **lineup_poss (lineup_poss):** Number of possessions this lineup has played together this season.
- **lineup_off_synergy (lineup_off_synergy):** Offensive synergy — the gap between this lineup's projected offensive rating and the sum of its individual players' offensive ratings.
- **lineup_def_synergy (lineup_def_synergy):** Defensive synergy — the gap between this lineup's projected defensive rating and the sum of its individual players' defensive ratings.

## Current DPM blend

On/off share is possessions / (possessions + prior). The offensive prior is 10,000 possessions and the defensive prior is 6,000.

## Current per-stat half-lives

The games conversion is the About page’s current schedule-based estimate; some per-day rates vary with age. These constants describe the distributed reference, not an authoritative model-vintage identifier.

| Statistic | Days | Games |
| --- | ---: | ---: |
| Starting | 1.9 | 0.9 |
| Minutes | 5.1 | 2.3 |
| Playing at all | 6.5 | 3 |
| Share of shots from three | 27.3 | 12.6 |
| Three-point attempts | 32.5 | 15 |
| Pace | 35.7 | 16.5 |
| Usage | 35.9 | 16.6 |
| Shot attempts | 36.8 | 17 |
| Two-point shot distance | 38.5 | 17.8 |
| Free-throw rate | 39.9 | 39.9 |
| Blocks | 40.6 | 40.6 |
| Assist rate | 52.3 | 24.2 |
| Three-point shot distance | 53 | 53 |
| Shots at the rim | 58.1 | 26.8 |
| Assists | 59.3 | 27.4 |
| Points | 66.5 | 30.7 |
| Free-throw attempts | 78 | 36 |
| Defensive rebounds | 98.6 | 45.5 |
| Two-point % | 106.4 | 79.9 |
| Block rate | 107.9 | 49.8 |
| Offensive rebound rate | 116.6 | 53.8 |
| Defensive rebound rate | 118.5 | 54.7 |
| Offensive rebounds | 119.8 | 55.3 |
| Steal rate | 130.4 | 74.6 |
| Field-goal % | 133.2 | 72.8 |
| Unassisted field-goal % | 135 | 62.3 |
| Fouls | 156.1 | 72.1 |
| Turnovers | 204.1 | 94.2 |
| Unassisted three-point % | 204.2 | 94.3 |
| Turnover rate | 233.9 | 108 |
| Free-throw % | 249.2 | 115 |
| Three-point % | 264.5 | 126.7 |
| Steals | 273.3 | 126.2 |
| % at the rim | 448.3 | 207 |
| Above-the-break three % | 598.2 | 276.2 |
| Corner three % | 1503.2 | 694 |
