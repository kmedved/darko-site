> **Updated November 17, 2026.** I reran this study with every season from 2000-01 through 2025-26 and added a section on teams. The 2020 numbers hold up: rerun the original way, 24 of the 27 player stats land within 5% of what I published then. The tables now cover all 26 seasons, pad toward each season's own league average (threes have changed too much for one average to fit every year), and let you plug in your own numbers. The original post was published August 6, 2020.

## When is a hot start real?

One of the most common questions about a player is when new performance becomes real. Marcus Smart is shooting 54% from three after four games. Has he broken out, or is it noise?

"Stabilization rates" try to answer that: how many shots or possessions a player needs before he "owns" a skill. (Or you can just check [DARKO](/).)

The idea was popularized by [Russell Carleton (aka Pizza Cutter) in baseball](https://www.baseballprospectus.com/news/article/17659/baseball-therapy-its-a-small-sample-size-after-all/) and came to basketball through [Darryl Blackport](https://fansided.com/2014/08/29/long-take-three-point-shooting-stabilize/), [Krishna Narsu](https://fansided.com/2017/12/21/nylon-calculus-team-stats-noise-stabilization-thunder/), [Nathan Walker](https://www.patreon.com/posts/31415520), [me](https://twitter.com/kmedved/status/1063456469511737344) ([twice](https://twitter.com/kmedved/status/1257287058185388033)) and others. At some point in a season, skill starts to outweigh randomness. Stabilization rates try to find that point.

There are many ways to measure it. Carleton and Blackport used a reliability score called KR-21, which splits attempts into buckets and checks how well the buckets agree. Narsu looked for the point where a team's numbers so far explain half the variation in its final numbers. I prefer a predictive approach, the padding method. I first read about it from [Justin Kubatko](http://statitudes.com/blog/2013/11/12/home-win-probability-using-srs/), [Tangotiger](http://tangotiger.com/index.php) uses it often, and I assume it has a long history I don't know.

## The padding method

At any point in the season, add a fixed amount of league-average performance to a player's numbers. The result is your projection for the rest of his season.

Take threes. Duncan Robinson opened 2019-20 by making 17 of 34 (50%). Some of that is luck, so pad both the makes and the attempts with X attempts of league-average shooting:

**`projected 3P% = (17 + X × league 3P%) / (34 + X)`**

With 240 attempts of padding and a league average of .355:

**`projected 3P% = (17 + 240 × .355) / (34 + 240) = .373`**

So his 34 attempts move Robinson from league average (.355) to .373: a good shooter, not yet a great one. That fits intuition. Thirty-four attempts isn't many, so we can't go wild, but it's a good sign.

The nice part is that **the padding never changes during the season**. You don't need different weights for different points of the season. You always add 240 attempts at league average. Early on, the padding dominates. As his own sample grows, his shooting takes over.

<!-- interactive:robinson -->

## Padding values are stabilization rates

Padding and stabilization rates are the same thing. Before games on January 3, 2020, Robinson had made 110 of 237 threes. His projection:

**`projected 3P% = (110 + 240 × .355) / (237 + 240) = .409`**

At that point his projection was about half his own 237 attempts and half the 240 padding attempts. After that, it was mostly his own shooting.

"Mostly" is the point. Nothing magical happens at 50%. The 240 padding attempts never go away; they just matter less and less. (That's why I don't love the word "stabilization": it suggests a player's performance is "stable" after some number of attempts. I've given up that fight.)

I like padding because it is simple and direct. It needs no opaque reliability scores, and it answers the question people actually care about: what should we expect from this player from here on?

## The numbers for players

Here is how much padding each main box-score stat needs, from most stable to least. To project a player, add that much league-average performance to what he has done so far. The padding is also the point where his own numbers count for half.

<!-- interactive:players -->

I found each number by trial and error: for every player after every game of every season since 2000-01, about 637,000 player-games in all, find the one padding amount that best predicts the rest of his season.

Minutes are extremely stable, since they're mostly the coach's call. Plus-minus is the opposite: add about 1,000 possessions of league average before trusting it.

Three-point percentage is fairly noisy. A player needs about 260 attempts before his own shooting outweighs the padding. That is still far fewer than the 750 Blackport found in 2014. Through 2025-26, a player has taken more than 750 threes in a season only 12 times, and only five players have done it.

A few stats have shifted over the last six seasons, judged by how well each padding predicts seasons it wasn't fit on. Field-goal and 2-point percentage now settle much faster, after roughly 65 and 80 attempts instead of 105 and 150, and turnovers per 100 possessions a little faster. Fouls, assists and 3-point attempts per 100 possessions take longer. Most other stats are about where they were.

## The numbers for teams

The same method works for teams: every team after every game since 2000-01, padded toward that season's league average.

<!-- interactive:teams -->

- **Win percentage needs about 13 games of padding, point margin about 10.** Ten games into a season, a team's margin is about half real. That fits [the early-season strength-of-schedule post](/research/early-season-strength-of-schedule), which found about 8 games for SRS. That one adjusts for schedule and covers different seasons, so the two numbers measure slightly different things.
- **Net rating settles faster than either half of it.** Offensive and defensive rating each need about 28 to 32 games of possessions, net rating about 9. Some of a game's randomness hits both ends at once (both teams shoot hot, or the whistle is tight) and cancels out in the difference.
- **Opponent 3-point percentage is mostly luck.** It needs about 9,000 attempts of padding, roughly three seasons' worth. Opponent free-throw percentage is noisier still, at roughly nine seasons' worth.
- **Shot profile is set early.** A team's share of shots from three needs less than four games.

Free-throw rates, for and against, now take much longer to settle than they used to. Teams have become more alike in how often they get to the line.

## Other ways to do this

You could predict a player's next game instead of the rest of his season. You could also use career-to-date numbers to project the rest of a season, or the rest of a career. Each has pros and cons, and the choice matters less than you might expect. That is one of the virtues of the padding approach.

*How the numbers are fit: for each stat, the one padding amount that minimizes squared error in predicting each player's or team's rest-of-season rate, weighted by the rest-of-season sample, padding toward that season's league average. Possession-based rates such as usage and rebound rate are padded in possessions, as in 2020.*
