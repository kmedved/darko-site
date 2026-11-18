> **Updated November 17, 2026.** I reran this study with every season from 2000-01 through 2025-26 and added a section on teams. The 2020 numbers hold up: rerun the original way, 24 of the 27 player stats land within 5% of what I published then. The tables now cover all 26 seasons, pad toward each season's own league average (threes have changed too much for one average to fit every year), and let you plug in your own numbers. The original post was published August 6, 2020.

## When is a hot start real?

One of the most common issues NBA fans and analysts grapple with in analyzing players is when a certain level of new performance becomes 'real', e.g., "Marcus Smart is shooting 54% from three after 4 games: has he had a breakout, or is this just noise?" Enter the concept of 'stabilization rates', which is the idea that a player needs some number of shooting attempts or possessions before they 'own' a skill (alternatively, you can just use [DARKO](/)).

Stabilization rates are a concept which was originally popularized by [Russell Carleton (AKA Pizza Cutter) writing about baseball](https://www.baseballprospectus.com/news/article/17659/baseball-therapy-its-a-small-sample-size-after-all/), but has come to basketball as well from [Darryl Blackport](https://fansided.com/2014/08/29/long-take-three-point-shooting-stabilize/), [Krishna Narsu](https://fansided.com/2017/12/21/nylon-calculus-team-stats-noise-stabilization-thunder/), [Nathan Walker](https://www.patreon.com/posts/31415520), [myself](https://twitter.com/kmedved/status/1063456469511737344) ([and again](https://twitter.com/kmedved/status/1257287058185388033)), and others. In short, the idea is that at some point in a season, the skill aspect of a player's performance starts to outweigh the inherent randomness in it, and stabilization rates are an attempt to figure out when that point is.

There are a lot of different ways to calculate stabilization rates. Carleton and Blackport used something called a "Kuder-Richardson 21 reliability score", which involves grouping plate appearances or shooting attempts into buckets, and looking at the relationship between those buckets. Narsu simply looked for the point in the season at which a team's current performance has more than 0.5 R^2 with its final statistics in a given metric. I prefer a predictive approach, via the 'padding method', which I first read about from [Justin Kubatko](http://statitudes.com/blog/2013/11/12/home-win-probability-using-srs/), but which is commonly employed by [Tangotiger](http://tangotiger.com/index.php) as well, and which I presume has some long storied history I'm ignorant of.

## The padding method

Under the 'padding method', at any given point in the season, you 'pad' a player's performance with some sample of league-average performance, and that's your projection of the player's talent going forward the rest of the season.

To take three-point attempts as an example, Duncan Robinson opened the 2019-20 season by shooting 17 of 34 from three (50%). There's presumably some randomness in that performance, so we 'pad' both the numerator and the denominator with some amount of league-average performance (call this number X), to get a projection in the form of:

**`projected 3P% = (17 + X × league 3P%) / (34 + X)`**

If the padding number for threes is 240 (more on how to calculate this later), and the league-average three-point percentage is .355, then our projection becomes:

**`projected 3P% = (17 + 240 × .355) / (34 + 240) = .373`**

So Robinson's 34 attempts from three have raised our estimate of his three-point shooting talent from .355 (league average) to .373 (a good, not great, shooter). I think that roughly aligns with our intuitions as well: 34 attempts just isn't very many, so we can't go too wild, but it's a nice sign all the same.

The beauty and elegance of the padding method is that the amount of padding remains constant throughout the season. You don't need to use different coefficients depending on how much of the season has elapsed. At all times, you just add 240 attempts of league-average performance to a player's shooting to get his future projection. Early on, the 240 'padding' attempts totally dominate a player's projection. But eventually, as the sample size grows, the player's actual performance has a bigger and bigger impact.

Applying that to Robinson, you get the chart below, showing the progression of his projected shooting alongside his actual year-to-date performance. The cadence is the same, but the projection is naturally more conservative. (Note that even the more conservative projections eventually agree Robinson is an elite shooter.)

<!-- interactive:robinson -->

## Padding values are stabilization rates

So what does the padding approach have to do with stabilization rates? Well, they're actually the same thing. Before games on January 3, 2020, Duncan Robinson had taken 237 threes, and made 110 of them. At that point in the season, his projection was:

**`projected 3P% = (110 + 240 × .355) / (237 + 240) = .409`**

Meaning at that point, roughly half his projection was the 237 attempts he'd actually taken, and half was the 240 padding attempts. After that game, the 240 padding attempts made up less and less of his projection, and his projection consisted mostly of his own performance.

I emphasize 'mostly' here to reinforce that there's nothing magical about the 'stabilization point', or about 50%. We still add 240 league-average attempts to Robinson's projection even after this point. They just have less and less relative impact. (I'm not a huge fan of the term 'stabilization' for this reason, since it implies that after X attempts a player's performance is "stable", but I've given up fighting on this point.)

I'm a big fan of the 'padding approach' as a way to address the stabilization question, for its simplicity and directness. It doesn't involve somewhat opaque statistical methods such as KR-21 rates, and it directly answers the question most people want answered when they're discussing stabilization: how do we project this player going forward?

## The numbers for players

With that somewhat lengthy preamble out of the way, here are the padding numbers (i.e., the stabilization numbers) for the main basic and advanced box-score metrics, sorted from most 'stable' to least, along with what I suggest 'padding' each metric's performance with.

<!-- interactive:players -->

These were calculated the simplest way I know how: trial and error, finding the best 'padding' number to add to year-to-date performance for each player, after every game of the season, for every season since 2000-01, to best predict rest-of-the-year performance (about 637,000 player-games in all).

As you can see, minutes are extremely stable (duh), since they're almost entirely a coach's decision and not a question of randomness or noise. On the other side, plus-minus data is extremely noisy, and you should regress a player's performance by about 1,000 league-average possessions going forward.

Note that three-point percentage is relatively noisy, at about 260 attempts before your performance is mostly 'real' rather than noise. But even 260 attempts is a much smaller number than Darryl Blackport found in his 2014 piece, where he concluded you needed 750 attempts for 'stabilization'. For context, through 2025-26 a player has taken more than 750 threes in a season only 12 times (and only five players have done it), so this is a pretty big difference.

Note also that a few of these have shifted over the last six seasons, judging by how well each padding number predicts seasons it wasn't fit on. Field-goal and two-point percentage now settle much faster, after roughly 65 and 80 attempts instead of 105 and 150, and turnovers per 100 possessions settle a little faster. On the other side, fouls, assists and three-point attempts per 100 possessions take longer. Most other stats are about where they were.

## The numbers for teams

The same method works for teams, i.e., take every team after every game since 2000-01, and pad toward that season's league average.

<!-- interactive:teams -->

A few things stand out here. Win percentage needs about 13 games of padding, and point margin about 10, meaning that ten games into a season a team's margin is about half 'real'. That fits with [the early-season strength-of-schedule post](/research/early-season-strength-of-schedule), which found about 8 games for SRS. (That one adjusts for schedule and covers different seasons, so the two numbers measure slightly different things.)

Interestingly, net rating settles faster than either half of it. Offensive and defensive rating each need about 28 to 32 games of possessions, while net rating needs about 9. Some of a game's randomness hits both ends at once (e.g., both teams shoot hot, or the whistle is tight), and cancels out in the difference.

On the other side, opponent three-point percentage is mostly luck. It needs about 9,000 attempts of padding, which is roughly three seasons' worth, and opponent free-throw percentage is noisier still, at roughly nine seasons' worth. Shot profile, by contrast, is set early: a team's share of shots from three needs less than four games.

Note that free-throw rates, for and against, now take much longer to settle than they used to, since teams have become more alike in how often they get to the line.

## Other ways to do this

Note that there are other ways to do this: you could attempt to predict the next game's performance instead of the rest of the season's performance. You could also use career-to-date performance to project rest-of-season performance, or career-to-date performance to project rest-of-career performance. There are pros and cons to all these approaches, although they mostly matter less than you may expect (which is one of the virtues of the padding approach in the first place).

*How the numbers are fit: for each stat, the one padding amount that minimizes squared error in predicting each player's or team's rest-of-season rate, weighted by the rest-of-season sample, padding toward that season's league average. Possession-based rates such as usage and rebound rate are padded in possessions, as in 2020.*
