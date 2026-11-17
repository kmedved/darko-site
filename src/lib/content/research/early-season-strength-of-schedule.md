Fourteen games into the season, Boston is outscoring opponents by 11.5 points a game. Its SRS is +7.5. Utah is being outscored by 10.9 a game. Its SRS is -5.8. The schedule adjustment is taking four points away from one team and handing five to the other. Across the league, the gap between point differential and SRS is the biggest at this stage of any season since 1994-95.

A big part of the cause is simple. East and West teams have met only 47 times, the West has won 33 of them by 7.3 points a game, and SRS has to apply that gap to every team in both conferences. That split accounts for about 40 percent of the spread in schedule strength this year, against about 10 percent in a normal season. Vegas had the conferences about even in October, and the gap is already fading. A week ago SRS had the West 12.4 points better than the East. Now it is 6.4.

But it made me finally check something I have suspected for years: that early-season strength of schedule is not as useful as it used to be.

It isn't. The short version:

- **A schedule point used to be worth about 70 cents.** SRS counts a point of schedule strength the same as a point of margin. Ten games in, from 1994-95 through 2018-19, it was really worth about 0.7 of one.
- **Since 2020 it has been worth about nothing.** It was negative in four of the last seven seasons. Plain point differential beat SRS in five of the seven.
- **The obvious explanations don't account for the whole decline.** Noisier games explain a small piece. The versions of injuries, blowouts, home court, late-season changes and the NBA Cup that I tested do not explain the rest.
- **Two seasons do most of the damage, for different reasons.** In 2020-21 the schedule number measured nothing. In 2025-26 the schedule itself was stacked, and a few teams' early shooting was far from their norm.
- **SRS is not broken.** By game 20 the adjustment works as well as it ever did. Before then, give it half weight and lean on a prior.

## The test

SRS is Doug Drinen's Simple Rating System, the one Basketball-Reference publishes. It is a team's average margin plus the average rating of its opponents. Margin plus schedule.

I asked one narrow question. After ten games, when you are predicting the rest of a team's season, how much is a point of schedule worth compared with a point of margin? SRS says one for one. If the real answer is 0.7, a schedule point is worth 70 cents on the dollar. If it is zero, you would do just as well ignoring the schedule. If it is negative, the adjustment is pointing the wrong way: teams that had played tough schedules went on to be *worse* than their margin suggested.

![What a point of schedule strength was worth after 10 games](/research-figures/early-season-strength-of-schedule/fig_value_by_season.png)

Through 2018-19 the answer was about 0.7, and it went negative twice in 25 seasons. In the seven seasons since, it has been negative four times and has never reached 0.7. Last season's -1.8 is the second-worst on record.

Head to head at the ten-game mark, with nothing padded or regressed, SRS predicted the rest of the season better than plain point differential in 19 of 25 seasons before 2020. Since then it has won 2 of 7.

One thing did not change. A team's own point differential is exactly as predictive as it used to be. A point of early margin was worth 0.54 points over the rest of the season before 2020 and 0.55 since. Only the opponent half of SRS stopped working.

## Not noise, and not just luck

**Noisier games.** NBA games have become less predictable. The typical miss between a game's result and what team quality would predict grew from about 11.5 points to 13.5. That makes every ten-game number shakier, opponents' numbers included. But when I simulate the recent seasons with the old noise level, the value of the adjustment recovers by only about 0.1. The real drop is 0.4 to 0.7, depending on which seasons you count.

**Bad luck.** A single season of this number is very noisy, so one bad year means little. Seven years is different. I drew 20,000 random sets of seven pre-2020 seasons, and none came in as low as the last seven.

## What I had missed: the schedule can make the adjustment wrong

Here is the idea that reorganized the whole thing for me. What a schedule adjustment is worth depends on who happened to play whom.

Suppose the good teams happen to open against weak opponents, and the bad teams against strong ones. Now an easy schedule tells you two things. The team's margin is inflated, which is what SRS corrects for. But the team is also probably good, because this year the good teams are the ones who got the easy schedules. Those two pull in opposite directions. If the second is strong enough, the right weight on schedule is zero or below, even if you knew every opponent's true strength perfectly.

That is what 2025-26 looked like. Oklahoma City's first ten opponents turned out to be four points worse than average. Brooklyn and Washington opened against brutal slates. Across the league, the better a team turned out to be, the weaker its first ten opponents were, with a correlation of -0.62. It was the most stacked opening schedule in my 32 seasons. The runner-up is 2002-03, which produced the single worst value on the chart.

![2025-26: good teams opened against weak ones](/research-figures/early-season-strength-of-schedule/fig_draw_2026.png)

It holds across the whole sample, too. The more an opening schedule was stacked this way, the less the adjustment was worth that year.

Was that just teams reacting to a hard start, with the ones buried early giving up later? Mostly not. Rate teams by their preseason Vegas win totals instead of how they turned out, and the 2021-22, 2024-25 and 2025-26 openers were already tilted the same way before a game was played. 2025-26 was less extreme on that measure, so part of its tilt did appear during the season.

## Grading each season against its own schedule

So the raw value is not a fair grade. A season with a stacked schedule *should* score low.

To grade fairly, I replayed each season's real schedule 4,000 times, with every team held at one steady strength and ordinary game-to-game randomness. That gives the value the adjustment should have had that year, and a range around it. It is the blue line and band in the first chart.

Before 2020, reality landed in the middle of that range on average, at the 55th percentile. Since 2020 it has averaged the 26th.

| Season | What happened | What its schedule predicted | Grade |
|---|---|---|---|
| 2019-20 | +0.26 | +0.93 | Below |
| 2020-21 | -0.17 | +0.96 | Far below |
| 2021-22 | -0.17 | -0.15 | On target. The schedule was stacked. |
| 2022-23 | -0.13 | +0.25 | A little below |
| 2023-24 | +0.55 | +1.16 | Below, though it looked fine |
| 2024-25 | +0.51 | +0.10 | Above, despite a stacked schedule |
| 2025-26 | -1.80 | -0.31 | Far below |

Stacked schedules are part of the story. 2021-22 landed right where its stacked schedule predicted. But they are not the whole story, because 2020-21 and 2023-24 had friendly schedules and came in low anyway. Five of the seven seasons fell short of what their own schedules predicted, and two of them, 2020-21 and 2025-26, landed below the 5th percentile.

Those two I can partly explain.

## 2020-21: the schedule number measured nothing

The COVID season started on December 22, and to cut travel the league had teams play each other twice in a row, baseball style. A quarter of all early games were part of one of those sets. Ten games covered about eight different opponents instead of the usual nine.

That alone should not have sunk the adjustment. My replays know the schedule was thin and still expected +0.96.

What stands out is that ten-game strength of schedule that year had no relationship with how good those opponents turned out to be. The correlation was 0.02. In a normal season it is between 0.4 and 0.8.

![Did the game-10 schedule number measure anything?](/research-figures/early-season-strength-of-schedule/fig_sos_measurement_2021.png)

Five teams did most of that:

- **Utah** started 4-4, then won 20 of its next 21. It rated +0.4 early and +10.2 afterward.
- **Houston** traded James Harden and later lost 20 straight. It went from -0.1 to -8.4.
- **Cleveland** fell from -1.4 to -9.1.
- **Minnesota**, missing Karl-Anthony Towns early, climbed from -11.6 to -4.8.
- **Indiana** slid from +5.9 to -0.9.

With every team seeing only eight opponents, often twice each, those five misrated teams sat inside a lot of other teams' schedule numbers at once. Swap in what just those five turned out to be, and the correlation jumps from 0.02 to 0.49. The value of the adjustment goes from -0.17 to +0.63.

A caution: I took 2020-21 apart after seeing it was the outlier, and I chose those five because they were the most misrated. This locates the failure. It does not prove the cause.

## 2025-26: a stacked schedule, then early shooting

Last season failed differently. The schedule number was a fine measurement that year. Its correlation with later opponent quality was a normal 0.65. But the opening schedule was the most stacked on record, and that alone drags the expected value down to about -0.3.

Part of the remaining fall to -1.80 looks like shooting. Chicago made 39.9 percent of its threes in its first ten games, against the 35.9 its shooters' track records implied. Boston made 32.2 against an expected 37.4. Oklahoma City made 34.2 against 37.8. Chicago looked like a +4 team after ten games and played like a -6 team afterward.

Move every team's early margins halfway toward expected shooting, and the value goes from -1.80 to -0.7. Move them all the way and it is about zero. That is a sensitivity check, not a measurement. The adjustment cannot tell luck from real changes in shot quality, so I read it as shooting explaining part of the gap. It is also a 2025-26 story only. The same adjustment does not help the earlier seasons.

## What else I checked

Given this year's East-West mess, the obvious question is whether it is all conference noise. It is not. The East-West part of the schedule swings wildly from year to year and has made recent seasons look worse. But with the conference gap taken out, the within-conference part of the schedule also fell, from about 0.54 to 0.15.

I also checked injuries and rest, blowouts, home court, pace, late-season changes and the NBA Cup. None of the tested versions explains the whole decline. The pattern survives when I predict only each team's next ten games. Removing Cup games helps in 2025-26, but removing the same number of random games does as well about a quarter of the time. These checks narrow the possibilities. They do not prove those factors had no effect.

Two things stay open. Five of seven seasons came in under what their own schedules predicted, which is unusual under my steady-strength replays. And three of the five most stacked opening schedules in 32 years were 2021-22, 2024-25 and 2025-26. I found no clear evidence that the Cup is behind that. I would rather leave both open than pick a story.

## What to do about it

- **Before game 20, give the schedule half weight.** Margin plus half of the opponents' average margin had the lowest error from 2019-20 through 2024-25: 3.83 points, against 3.86 for margin alone and 3.90 for full SRS. I picked the half after looking, so call it a rule of thumb.
- **Pad toward a prior.** About 8 games of padding toward league average, or about 20 toward a preseason Vegas win total. The Vegas version cuts early-season error by about 14 percent.
- **Check the schedule.** You do not know real team strength in November, but you do know preseason expectations. By that measure this season's first 139 games were an ordinary draw. Much of the Boston and Utah gaps comes from an East-West split built on 47 games.
- **After game 20, relax.** The adjustment works as well as it ever did.

## Caveats

I chose the ten-game cutoff and the season groupings after looking at the data. Single seasons are very noisy, and 32 seasons is not many. The replays assume every team has one true strength all year, so anything that breaks that lands in "unexplained." The 2020-21 and 2025-26 explanations were fitted after the fact.

*For the technically inclined: the "value of a schedule point" is the ratio b/a from predicting each team's rest-of-season SRS as a × margin + b × SOS at its tenth game, weighted by games remaining. Code and a longer write-up exist. Ask if you want them.*
