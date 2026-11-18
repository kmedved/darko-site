## The five-point gap

One of the things NBA fans and analysts notice every so often is that the team that wins the opening tip seems to win the game more often than not, e.g., "tip winners have won 52.8% of their games since 1997-98: is the tip actually 'worth' something, or is this just noise?" (That 52.8% is from 29 seasons of possession-by-possession data, 1997-98 through 2025-26.) Note that it looks even better if you split it by the home team. When the home team wins the tip it goes on to win 61.4% of its games, and when it loses the tip that falls to 56.3%, i.e., a five-point swing from a two-second toss between two centers, which (if real) would make the jump ball one of the most valuable plays in basketball.

I don't think it's real. In short, the possession you win is handed right back by the rules, and the 52.8% is mostly telling us who is playing: good teams tend to have good centers, and good centers tend to win tips. Once we account for the closing point spread, about half a point is left. The one jump ball that does seem to matter is the one at the start of overtime (more on that below).

<!-- interactive:seasons -->

## What the tip actually wins

Let's start with what the tip actually buys you, because the answer is almost nothing.

The NBA's rules more or less cancel the jump ball out. The team that loses the opening tip gets the first possession of the second *and* third quarters, while the tip winner gets the ball to open the first and fourth. Add that up, and on average the tip winner finishes a game with no extra possessions at all (the gap is under one hundredth of a possession). In 37% of games the two teams end up with exactly the same number of possessions, and in virtually every game they are within two.

You can see this accounting quarter by quarter. The tip winner gets about half an extra possession in the first quarter and another half in the fourth, and gives back half in each of the second and third. The scoreboard follows along, i.e., tip winners outscore their opponents in the first and fourth quarters and get outscored in the second and third. Note that this is just the rulebook at work, and has nothing to do with 'momentum' or effort.

<!-- interactive:quarters -->

The possession itself isn't much of a prize either. The opening possession of a game is worth 0.97 points on average, against 1.08 for all possessions. For context, every quarter-opening possession is below average (about 0.99), presumably because the defense is set and there's no transition to run, and the game's very first possession is the weakest of the four. So the tip winner gets a below-average possession, and then has to give one back by halftime.

So the tip itself is worth roughly nothing. Why, then, do tip winners win 52.8% of the time?

## Winning tips is a skill

The first clue is that winning tips isn't a coin flip.

If jump balls were pure luck, almost every team's season-long tip rate would land somewhere between 39% and 61%. The actual range runs from 17% to 84%. The 2002-03 and 2003-04 Cavaliers, with 7'3" Žydrūnas Ilgauskas jumping, won 84% of their tips two years running. On the other side, the 2009-10 and 2010-11 Rockets, with Yao Ming hurt, mostly sent 6'9" power forward Luis Scola out to jump, and won 17% two years running. If you split any season into alternating games, the two halves' tip rates track each other closely (a correlation of 0.64, against 0.80 for win rates). The 2001-02 Heat, with Alonzo Mourning jumping nearly every night, once won 26 tips in a row, and Shaq's 2000-01 Lakers ran off 23 straight.

Note that this skill belongs to one player and not the roster. About seven in eight opening jumps are taken by a center or a center/forward, and the average jumper stands a shade over 6'11". As you'd expect, height helps.

<!-- interactive:height -->

But height is only part of it. Timing and leaping matter too, and jumpers are very consistent, e.g., a jumper's tip rate in one season has a correlation of 0.74 with his rate the next. Put in the terms of the [padding post](/research/stabilization-rates-and-the-padding-approach), tip rate needs only about 16 jumps of padding, meaning that after 16 opening tips a jumper's own record already counts for half of our estimate of him. (For context, three-point percentage needs about 260 attempts.)

Padding also means we don't need a minimum number of jumps to keep the guy who is 3-for-3 off the top of the list. If we add 16 jumps at 50% to every player's record, these are the best and worst jumpers since 1997-98:

| Best jumpers | Tips won | Padded |
| :--- | ---: | ---: |
| Victor Wembanyama | 147 of 192 | 74.5% |
| Andre Drummond | 513 of 702 | 72.6% |
| Arvydas Sabonis | 190 of 260 | 71.7% |
| Shaquille O'Neal | 727 of 1,021 | 70.9% |
| Steven Adams | 479 of 679 | 70.1% |

| Worst jumpers | Tips won | Padded |
| :--- | ---: | ---: |
| Jeremiah Robinson-Earl | 3 of 40 | 19.6% |
| Olivier-Maxence Prosper | 0 of 24 | 20.0% |
| Luis Scola | 24 of 141 | 20.4% |
| Derrick Coleman | 5 of 41 | 22.8% |
| David Lee | 24 of 123 | 23.0% |

*Opening jump balls, 1997-98 through 2025-26, from the league's play-by-play record of who actually jumped. "Padded" is the share won after adding 16 jumps at 50% to each player's record.*

Victor Wembanyama has only taken 192 opening tips, but he has won 77% of them, and even after padding he comes out narrowly ahead of Andre Drummond (it's close, and Drummond has done it over 702 jumps). The worst list is all forwards, e.g., Luis Scola, who jumped for those Rockets teams while Yao was hurt. Among regulars, the worst is Domantas Sabonis, who has won 29% of his 327 jumps, the lowest rate of anyone with 300 or more. His father, Arvydas, is third on the best list. (Apparently this is not hereditary.)

<!-- interactive:jumpers -->

The most stunning name in the data, though, is Yao Ming. Yao was 7'6", and on average he was almost seven inches taller than the man jumping against him. The other players 7'3" or taller in the data won 69% of their opening tips between them. Yao won 41%, i.e., he lost more tips than he won, and about 100 more than his height alone would predict. In 2003-04 Yao started all 82 games, and in the 67 where 6'11" Kelvin Cato started next to him, it was Cato who took the opening tip 61 times (he won 54% of them). The year before, Yao and Eddie Griffin started together 56 times, and Griffin took the tip in 29 of those. I don't know why, but the obvious guess is that the Rockets had noticed the same thing.

On the other side, Ben Wallace won 61% of his tips at 6'9", and Andre Drummond has won about 23 points more of his than his height predicts, which is the biggest gap of anyone after padding. Nikola Jokić, maybe the best center of his generation, is a coin flip at 51.5%.

Note that this skill does pay off in one visible way, which is who scores first. The tip winner scores the game's first points (free throws included) 65% of the time, which is almost exactly what you'd expect from simply going first (about 46% of opening possessions score, so the other team gets its turn a little over half the time). Because the tip is fairly predictable, so is this, e.g., when one jumper came into a game with a padded tip rate at least 20 points better than the other's, his team scored first 60% of the time, and Wembanyama's Spurs have scored first in 59% of the games where he took the tip. Sportsbooks take bets on who scores first. I haven't checked what those bets pay, so this isn't a betting system, but if that's the bet you're making, the tip matters quite a bit.

The key point for everything that follows is that being good at tips and being good at basketball are different skills, but they tend to show up in the same kinds of players.

## Good teams win more tips

Better teams do win more tips. Across 863 team-seasons, the relationship between tip rate and win rate is clear but fairly loose, since good teams tend to have good centers, and good centers tend to be big and athletic. An extra 10 points of tip rate goes with about 3 extra wins per 82 games. That's a correlation and nothing more, which the exceptions make pretty obvious.

<!-- interactive:scatter -->

A cleaner way to check this is to look at a jump ball from a *different* game. If the tip helps you win tonight, then tonight's tip should predict tonight's result, and a tip from some other game shouldn't. But it does. Regular-season teams that go on to win the tip in their *next* game (i.e., a jump ball that hasn't happened yet) win tonight 51.3% of the time, against 48.8% for teams that are about to lose it.

<!-- interactive:placebo -->

You can also come at this from the other direction. If we only compare games between the same two teams, in the same building, in the same season, where the tip went one way in some games and the other way in others, the five-point gap shrinks to about 2.3 points. And if we rate every team's strength using only its earlier results, and then compare tip winners to tip losers of equal strength, about 1.9 points survive. So roughly three of the five points go away once we account for who is playing whom. (The full set of comparisons, including the betting line, is further down.)

## Who takes the tip

So is the last couple of points the 'real' effect of the tip? Mostly not, because the tip also tells us something a season-long rating can't, which is who actually took the tip tonight.

The opening tip is usually taken by the starting center, who is usually one of the team's best players. When he doesn't take it (because he's hurt, resting, traded, or swapped out for the matchup), two things happen at once: the team's tip rate falls, and the team gets worse. To take the 573 team-seasons where a team's usual jumper took at least 20 opening tips and didn't take at least 10 others, in the games he didn't jump the team won 7.4 points fewer tips and 4.0 points fewer games. In other words, winning the tip is partly just a sign that your best big man is on the floor.

If we add that one fact (whether the usual jumper took the tip) to the strength-adjusted comparison, the leftover edge drops from 1.9 points to about 1.4. Note that this is a pretty crude flag. It knows nothing about the other four starters, minute limits or back-to-backs, all of which tend to go along with a center sitting out. A sharper cut makes the same point: in games where both teams' usual jumpers took the tip, the leftover edge is about 1 point, and in games where at least one of them was missing, it's about 3 points. (Both figures adjust for team strength.)

The playoffs point the same way. In the postseason, when everyone who can play does, tip winners win 51.8% of the time, a bit less than in the regular season.

Home court shows up here too. Home teams win 51.4% of opening tips, and this isn't about personnel, since the *same jumper* wins about 3 points more of his jumps at home than on the road. Whatever home court advantage is made of (sleep, familiarity, the crowd), some of it apparently shows up even here. It's a small piece though, worth about a quarter of a point of the headline number.

## Controlling for the betting line

A strength rating only knows results. Bookmakers know a lot more than that, i.e., by tip-off their price reflects injuries, rest, back-to-backs and how a matchup is likely to go. So if the leftover edge is really just hidden team quality, the betting line should soak it up.

To check this, I took the closing point spread for 32,394 regular-season games (every one since 1999-2000 that has a line on record), and ran the same comparison on exactly the same games. The last two rows of the chart below are the new ones: the spread on its own, and the spread plus the usual-jumper flags.

<!-- interactive:ladder -->

As you can see, the line does what the strength rating couldn't. The raw gap is 4.9 points. The strength rating takes it down to 1.9, the rating plus the jumper flags to 1.4, and the closing spread to 0.65. Add the jumper flags to the spread and we're at 0.45. Note that the answer barely moved when I let the link between the spread and winning bend and added season effects, kept the strength rating in alongside the spread, or built the jumper flags from earlier games only (every variant landed between 0.59 and 0.67). Moneylines tell the same story, at 0.74 on 23,778 games. (I only have moneylines from 2006-07 on.)

<!-- interactive:priced -->

To put this in plainer terms: in the games with moneylines, the teams that won the tip went on to win 52.8% of the time. Before the game, the betting market had already rated those same teams at 52.4%. Meaning the market had already priced in almost nine-tenths of the edge, and what was left was 0.4 of a point.

Interestingly, the line even 'knows' about the tip. Bookmakers don't price the jump ball, and yet the spread predicts which team wins it, and once you have the spread, the strength rating adds nothing. To me that's the clearest sign that the tip is picking up things the market already knew about, e.g., lineups, health and who is likely to jump. The usual-jumper split from the last section shrinks too: with the spread in, games where both usual jumpers took the tip show 0.1 points, and games with at least one missing show 1.3.

The line also clearly beats the strength rating. On the same games, swapping the rating for the spread lowers the estimate by about 1.3 points.

To be clear, none of this is a betting system. Knowing the tip winner before the line closed would have been worth about 0.4 of a point of win probability, against an average bookmaker margin of about 3%. And of course nobody knows the tip winner before the tip.

## Close games and overtime

There is one place where the tip looks like it matters. In games that are close entering the fourth quarter (within three points, which is about a fifth of all games), the team that won the opening tip wins 54.1% of the time. The obvious explanation is that the tip winner gets the first possession of the fourth quarter, right when games are being decided.

But that's not actually what's going on. By the end of the third quarter the tip winner has had half a possession *fewer* than its opponent, since it has opened one quarter and its opponent has opened two. Half a possession is worth about half a point (opening a period is worth about +0.46 points). So a game that's tied after three quarters isn't really even, i.e., the tip winner has kept pace while being short half a possession, and the fourth-quarter possession just evens things out.

<!-- interactive:iou -->

Over the full 48 minutes the possessions balance to within a hundredth, which is why none of this adds anything to the 52.8%. It does make for some decent trivia though: if the score is tied heading into the fourth, the team that won the opening tip is effectively about half a point ahead. In the roughly 1,200 games that were dead even after three quarters, it went on to win 51.5% (which isn't enough games to say much more than that).

Overtime is different, because it starts with a *new* jump ball, and this time nobody gets the possession back. The period just ends. The team that wins the overtime tip ends up with about half a possession more than its opponent (0.48 on average) in what starts as a tied game, and wins 55.7% of the time (56.9% when there's only one overtime). For context, half a point is a lot in a period that's usually decided by four or five. By itself it's worth three or four points of win probability, so somewhere between half and two-thirds of that edge is real, mechanical value. A sliver of the rest is the same story as the opening tip, since the favorite wins the overtime tip 53% of the time.

| | Opening tip | Overtime tip |
| :--- | ---: | ---: |
| Games | 36,765 | 2,176 |
| Won by the tip winner | 52.8% | 55.7% |
| Possessions gained | about 0, given back by rule | +0.48, never given back |

Note that this is a different jump ball from the opening one. The team that won the opening tip wins the overtime tip only 54% of the time, and only 6% of games get that far, so overtime explains essentially none of the opening-tip gap (a few hundredths of a percentage point). It is, however, the one jump ball all night that's actually worth winning.

## Where the five points go

With all of that out of the way, here is the whole accounting, built by adding one control at a time. Note that the order matters here, so these bars aren't shares of 'causes'. They just show how much of the gap each added control removes.

<!-- interactive:ledger -->

About 3 of the 5 points are simply who you are: good teams have good centers, and good centers win tips, so controlling for team strength removes them. About half a point more is who is on the floor, since the tip is usually taken by your starting center, and counting who actually took it removes that. The closing spread then removes about two-thirds of what the strength rating and the jumper flags left behind. What's left is under half a point, and the possession itself adds nothing, because the rules give it back.

(Home court is held fixed in this accounting, since the comparison is between home teams that won the tip and home teams that lost it. In the 52.8% headline, home court is worth about a quarter of a point.)

So I wouldn't read "tip winners win 52.8% of the time" as "the tip is worth 2.8 points of win probability". The tip tells us about the roster, the center's health and home court, and as far as I can tell from the possession math, it adds nothing measurable to the next 48 minutes. Teams that win tips were mostly going to win anyway. The one exception is the tip at the start of overtime.

## What this does and does not show

In short: the tip nets no possessions over a game, the gap in win rate shrinks from five points to under one as the controls get stricter, winning tips is a persistent individual skill (and the usual jumper being absent is a real signal), and the overtime tip is worth roughly half a possession.

There are of course limits to this analysis. Most notably, it isn't an experiment. Every adjusted number here is an association, and a small causal effect of one or two points is still possible. The betting lines are archived closing lines from several sources, and most carry no per-quote timestamp, so some of them may not be the final price. "Usual jumper" is defined after the fact, as whoever jumped most for a team that season, and defining it from earlier games only (as a bettor would have had to) moves the final estimate from 0.45 to about 0.65. And again, this isn't a betting strategy. It says nothing about prices available after the tip.

*How it was measured: possession-level data covers 36,765 regular-season and playoff games, 1997-98 through 2025-26 (about 7 million possessions). Game winners come from official NBA results. Quarter-by-quarter points come from play-by-play, which differs from the official score, almost always by two points or fewer, in about 15% of games. "Winning the tip" means gaining the game's first possession, which matches the officially recorded jump-ball result in 99.98% of games. Jumpers are the actual jump-ball participants recorded in the league's play-by-play, available for 99.9% of games. Padded tip rates add 16 jumps at 50% to each player's record. Sixteen is the amount that best predicts the rest of a jumper's season, fit the same way as in the padding post; predicting the rest of a career takes more (about 44), and at that amount Drummond and Wembanyama are level. "What height alone predicts" comes from a model of who wins a jump given the height gap between the two jumpers and which of them is at home. "Team strength" is a rating updated after every game and built only from earlier results. Adjusted comparisons use regular-season games since 1999-2000. "Regular season" includes play-in games. Quarter-opening rules are in [NBA Rule 6](https://official.nba.com/rule-no-6-putting-ball-in-play-live-dead-ball/).*

*The betting-line test uses the closing point spread for 32,394 regular-season games from 1999-2000 to 2025-26 (43 games from those seasons have no line), joined on the official game id. The spread enters the model as the market's expected margin for the home team. Moneylines (my record of them starts in 2006-07) have the bookmaker's margin removed by scaling the two implied probabilities to sum to one; a few games with implausible prices were set aside. Effects are average changes in home win probability from a logistic model.*
