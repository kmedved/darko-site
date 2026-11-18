## The five-point gap

Every so often someone notices that the team that wins the opening tip tends to win the game, and asks whether the tip matters. It's a fair question. Across 29 seasons of possession-by-possession data, 1997-98 through 2025-26, the team that wins the opening tip goes on to win **52.8%** of its games. Put it in terms of the home team, and the gap looks even bigger: when the home team wins the tip it wins **61.4%** of its games, and when it loses the tip that falls to **56.3%**. That's a five-point swing on a two-second toss between two centers.

If the tip really caused that, it would be a big deal. I don't think it does. The short answer is that the possession you win is given right back by the rules, and the 52.8% is mostly about who is playing. Good teams tend to have good centers, and good centers tend to win tips. Once you account for the closing point spread, about half a point is left, which is too small to tell apart from zero. The one jump ball that does seem to matter is the one at the start of overtime.

<!-- interactive:seasons -->

## What the tip actually wins

Start with what the tip buys you, because the answer is almost nothing.

The NBA's rules even out the jump ball. The team that loses the tip gets the first possession of the second *and* third quarters, and the tip winner opens the first and fourth. Add it up, and on average the tip winner finishes a game with **no extra possessions**: the gap is under one hundredth of a possession, smaller than the noise. In 37% of games the counts come out exactly even, and in virtually every game they are within two.

You can see that accounting quarter by quarter. The tip winner gets about half an extra possession in the first quarter and half an extra in the fourth, and gives back half in each of the second and third. The scoreboard follows: tip winners outscore their opponents in the first and fourth quarters and get outscored in the second and third. That's just the rulebook, not momentum or effort.

<!-- interactive:quarters -->

The possession itself isn't much of a prize either. The opening possession of the game scores **0.97 points** on average, against **1.08** for all possessions. Every quarter-opening possession is below average (about 0.99), probably because the defense is set and there's no transition to run, and the game's first possession is the weakest of the four. So the tip winner gets a below-average possession, and has to give one back by halftime.

So the tip itself is worth roughly nothing. Then why do tip winners win 52.8% of the time?

## Winning tips is a skill

The first clue is that winning tips isn't a coin flip.

If jump balls were pure luck, almost every team's season-long tip rate would land between 39% and 61%. The actual range runs from **17% to 84%**. The 2002-03 and 2003-04 Cavaliers, jumping 7'3" Žydrūnas Ilgauskas, won 84% of their tips two years running. The 2009-10 and 2010-11 Rockets, with Yao Ming hurt, mostly sent 6'9" power forward Luis Scola out to jump and won 17% two years running. Split any season into alternating games and the two halves' tip rates track each other (a correlation of 0.64, against 0.80 for win rates). The 2001-02 Heat, with Alonzo Mourning jumping nearly every night, once won **26 tips in a row**, and Shaq's 2000-01 Lakers ran off 23 straight.

The skill belongs to one player, not the roster. About seven in eight opening jumps are taken by a center or a center/forward, and the average jumper stands a shade over 6'11". Unsurprisingly, height helps.

<!-- interactive:height -->

But height is only part of it. Timing and leaping matter too, and individual jumpers are consistent from year to year (a correlation of 0.74 between one season and the next). Shawn Bradley and Yao Ming both stood 7'6", but Bradley won nearly two-thirds of his jumps and Yao won 41%. Ben Wallace, at 6'9", won 61%. Nikola Jokić, maybe the best center of his generation, is a coin flip at 51.5%.

<!-- interactive:jumpers -->

| Best jumpers | Won | Worst jumpers | Won |
| :--- | ---: | :--- | ---: |
| Andre Drummond | 73.1% | Domantas Sabonis | 29.4% |
| Shaquille O'Neal | 71.2% | Tristan Thompson | 31.8% |
| Steven Adams | 70.5% | Myles Turner | 33.3% |
| Žydrūnas Ilgauskas | 69.9% | Nikola Vučević | 35.3% |
| Jarrett Allen | 69.5% | Rasheed Wallace | 35.6% |

*Share of opening jump balls won, from the league's play-by-play record of who actually jumped. Minimum 300 career opening jumps (77 players qualify). Victor Wembanyama had 192 through 2025-26, too few for the list.*

That's the key point for everything that follows: being good at tips and being good at basketball are different skills, but they tend to show up in the same kinds of players.

## Good teams win more tips

Better teams do win more tips. Across 863 team-seasons the relationship between tip rate and win rate is clear but loose, because good teams tend to have good centers, and good centers tend to be big and athletic. An extra 10 points of tip rate goes with about 3 extra wins per 82 games. That's a correlation, not a cause, and the exceptions make that pretty obvious.

<!-- interactive:scatter -->

A cleaner check is to look at a jump ball from a different game. If the tip helps you win tonight, then tonight's tip should predict tonight's result, and a tip in some *other* game shouldn't. But it does. Regular-season teams that go on to win the tip in their **next** game, a jump ball that hasn't happened yet, win tonight 51.3% of the time, against 48.8% for teams about to lose it.

<!-- interactive:placebo -->

You can also come at it from the other side. Compare only games between the same two teams, in the same building, in the same season, where the tip went one way in some games and the other way in others, and the five-point gap shrinks to about **2.3 points**. Rate every team's strength using only its earlier results, then compare tip winners to tip losers of equal strength, and about **1.9 points** survive. So roughly three of the five points go away once you account for who is playing whom. (The full set of comparisons, including the betting line, is further down.)

## Who takes the tip

Is the last couple of points the tip's real effect? Mostly not, because the tip also tells you something a season-long rating can't: **who actually takes the tip tonight**.

The opening tip is usually taken by the starting center, who is usually one of the team's best players. When he doesn't take it (hurt, resting, traded, or swapped out for the matchup), two things happen at once: the team's tip rate falls, and the team gets worse. Take the 573 team-seasons where a team's usual jumper took at least 20 opening tips and didn't take at least 10 others. In the games he didn't jump, the team won **7.4 points fewer tips** and **4.0 points fewer games**. So winning the tip is partly a sign that your best big man is on the floor.

Add that one fact, whether the usual jumper took the tip, to the strength-adjusted comparison, and the leftover edge drops from 1.9 points to about **1.4**. It's a crude flag. It knows nothing about the other four starters, minute limits or back-to-backs, which all tend to go along with center absences. A sharper cut makes the point. In games where both teams' usual jumpers took the tip, the leftover edge is about **1 point**, too small to tell apart from zero. In games where at least one usual jumper was missing, it's about **3 points**. (Both figures adjust for team strength.)

The playoffs lean the same way, though not conclusively. In the postseason, when everyone who can play does, tip winners win 51.8%. That's lower, but within the noise for 2,368 games.

Home court shows up too. Home teams win **51.4%** of opening tips, and it isn't about personnel, because the *same jumper* wins about 3 points more of his jumps at home than on the road. Whatever home court is made of (sleep, familiarity, crowd), some of it shows up even here. It's a small piece, worth about a quarter of a point of the headline number.

## Controlling for the betting line

A strength rating only knows results. Bookmakers know more: by tip-off their price reflects injuries, rest, back-to-backs and how a matchup is likely to go. If the leftover edge is hidden team quality, the betting line should absorb it.

So I took the closing point spread for **32,394** regular-season games, every one since 1999-2000 that has a line on record, and ran the same comparison on exactly the same games. The last two rows of the chart are new: the spread on its own, and the spread plus the usual-jumper flags.

<!-- interactive:ladder -->

The line does what the strength rating couldn't. The raw gap is **4.9 points**. The strength rating takes it to 1.9, the rating plus the jumper flags to 1.4, and the closing spread to **0.65**. Add the jumper flags to the spread and it's **0.45**. Both of those have 95% ranges that include zero (−0.3 to +1.6, and −0.5 to +1.4). The answer barely moved when I let the link between spread and winning bend and added season effects, kept the strength rating in alongside the spread, grouped the uncertainty by season, or built the jumper flags from earlier games only. Every variant landed between 0.59 and 0.67. Moneylines, which exist from 2006-07 on, tell the same story: 0.74 on 23,778 games.

<!-- interactive:priced -->

To put that in plainer terms: in the games with moneylines, the teams that won the tip won 52.8% of the time. Before the game, the betting market had already rated those same teams at 52.4%. So the market had priced in almost nine-tenths of the edge, and what was left was 0.4 of a point, give or take 0.6.

The line even knows about the tip. Bookmakers don't price the jump ball, yet the spread predicts which team wins it, and once you have the spread, the strength rating adds nothing. To me that's the clearest sign that the tip is picking up things the market already knew: lineups, health and who is likely to jump. The usual-jumper split from the last section shrinks too. With the spread in, games where both usual jumpers took the tip show 0.1 points, and games with at least one missing show 1.3, both within the noise.

That isn't proof the tip is worth nothing, though. Three caveats:

- **Indistinguishable from zero isn't zero.** The 95% range runs to about 1.6 points, and a test of this size would reliably catch an effect only if it were larger than about 1.4. A small real effect is possible.
- **The line did clearly more than the strength rating.** On the same games, swapping the rating for the spread lowers the estimate by about 1.3 points (1.0 to 1.5 when I resample the games), even though the two ranges overlap.
- **The leftover isn't the same in every era.** Split into three stretches, it's about zero in 1999-2000 to 2009-10 (−0.1) and 2018-19 to 2025-26 (+0.3), and about 2 points in 2010-11 to 2017-18 (+0.1 to +3.7). One of three stretches landing near 2 is weak evidence on its own, but it's why the same test run on 2011-12 to 2021-22 alone finds about 1 point.

None of this is a betting system. Knowing the tip winner before the line closed would have been worth about 0.4 of a point of win probability, give or take 0.6, against an average bookmaker margin of about 3%. And nobody knows the tip winner before the tip.

## Close games and overtime

There is one place where the tip looks like it matters. In games that are close entering the fourth quarter (within three points, about a fifth of all games), the team that won the opening tip wins **54.1%** of the time. The obvious explanation is that the tip winner gets the first possession of the fourth quarter, right when games are decided.

But that's not what's happening. By the end of the third quarter the tip winner has had half a possession *fewer* than its opponent, since it has opened one quarter and its opponent has opened two. Half a possession is worth about half a point (opening a period is worth about +0.46 points). So a game that's tied after three quarters isn't really even: the tip winner has kept pace while short half a possession, and the fourth-quarter possession just evens it out.

<!-- interactive:iou -->

Over the full 48 minutes the possessions balance to within a hundredth, which is why none of this adds anything to the 52.8%. It does make for some decent trivia, though. If the score is tied heading into the fourth, the team that won the opening tip is effectively about half a point ahead. In the roughly 1,200 games that were dead even after three quarters, it went on to win 51.5%, which is too few games to say much more.

Overtime is different, because it starts with a *new* jump ball, and this time nobody gets the possession back. The period just ends. The team that wins the overtime tip ends up with about half a possession more than its opponent (**0.48** on average) in what starts as a tied game, and wins **55.7%** of the time (56.9% when there's only one overtime). Half a point is a lot in a period usually decided by four or five. By itself it's worth three or four points of win probability, so between half and two-thirds of that edge is real, mechanical value. A sliver of the rest is the same story as the opening tip, since the favorite wins the overtime tip 53% of the time, and the remainder is within the margin of error for 2,176 games.

| | Opening tip | Overtime tip |
| :--- | ---: | ---: |
| Games | 36,765 | 2,176 |
| Won by the tip winner | 52.8% | 55.7% |
| Possessions gained | about 0, given back by rule | +0.48, never given back |

This is a different jump ball. The team that won the opening tip wins the overtime tip only 54% of the time, and only 6% of games get that far, so overtime explains essentially none of the opening-tip gap (a few hundredths of a percentage point). It's the one jump ball all night that is worth winning.

## Where the five points go

Here is the whole accounting, built by adding one control at a time. The order matters, so these bars aren't shares of causes. They show how much of the gap each added control removes.

<!-- interactive:ledger -->

- **Who you are.** Good teams have good centers, and good centers win tips. Team strength removes about 3 of the 5 points.
- **Who is on the floor.** The tip is usually taken by your starting center. Counting who took the tip removes about half a point more.
- **What the market knew.** The closing spread removes about two-thirds of what the strength rating and the jumper flags left behind.
- **What is left.** Under half a point, with a range that includes zero. The possession itself adds nothing, because the rules give it back.

Home court is held fixed in this accounting, because the comparison is home teams that won the tip against home teams that lost it. In the 52.8% headline, home court is worth about a quarter of a point.

So I wouldn't read "tip winners win 52.8%" as "the tip is worth 2.8 points of win probability." The tip tells you about the roster, the center's health and home court, and as far as I can tell from the possession math, it adds nothing measurable to the next 48 minutes. Teams that win tips were mostly going to win anyway. The one exception is the tip at the start of overtime.

## What this does and does not show

What it shows:

- The tip nets no possessions over a game, and the gap in win rate shrinks from five points to under one as the controls get stricter.
- Winning tips is a persistent individual skill, and the usual jumper being absent is a real signal.
- The overtime tip is worth roughly half a possession.

What it doesn't:

- It isn't an experiment. Every adjusted number is an association, and a small causal effect of one or two points is still possible.
- The lines are archived closing lines from several sources, and most carry no per-quote timestamp, so some may not be the final price.
- "Usual jumper" is defined after the fact, as whoever jumped most for a team that season. Defining it from earlier games only, as a bettor would have had to, moves the final estimate from 0.45 to about 0.65.
- It isn't a betting strategy. It says nothing about prices available after the tip.

*How it was measured: possession-level data covers 36,765 regular-season and playoff games, 1997-98 through 2025-26 (about 7 million possessions). Game winners come from official NBA results. Quarter-by-quarter points come from play-by-play, which differs from the official score, almost always by two points or fewer, in about 15% of games. "Winning the tip" means gaining the game's first possession, which matches the officially recorded jump-ball result in 99.98% of games. Jumpers are the actual jump-ball participants recorded in the league's play-by-play, available for 99.9% of games. "Team strength" is a rating updated after every game and built only from earlier results. Adjusted comparisons use regular-season games since 1999-2000 and carry a margin of about ±1 point. "Regular season" includes play-in games. Quarter-opening rules are in [NBA Rule 6](https://official.nba.com/rule-no-6-putting-ball-in-play-live-dead-ball/).*

*The betting-line test uses the closing point spread for 32,394 regular-season games from 1999-2000 to 2025-26 (43 games from those seasons have no line), joined on the official game id. The spread enters the model as the market's expected margin for the home team. Moneylines, from 2006-07 on, have the bookmaker's margin removed by scaling the two implied probabilities to sum to one; a few games with implausible prices were set aside. Effects are average changes in home win probability from a logistic model, with 95% ranges robust to unequal variance.*
