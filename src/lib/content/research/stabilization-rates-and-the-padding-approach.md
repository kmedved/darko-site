## Stabilization Rates

One of the most common issues NBA fans and analysts grapple with in analyzing players is when does a certain level of new performance become ‘real’, *e.g.*, “Marcus Smart is shooting 54% from three after 4 games: has he had a breakout, or this just noise?” Enter the concept of ‘stabilization rates’, which is the idea that a player needs some number of shooting attempts or possessions before they ‘own’ a skill (alternatively you can use [DARKO](/)).

Stabilization rates are a concept which were originally popularized by [Russell Carleton (AKA Pizza Cutter) writing about baseball](https://www.baseballprospectus.com/news/article/17659/baseball-therapy-its-a-small-sample-size-after-all/), but have come to [basketball as well from Darryl Blackport](https://fansided.com/2014/08/29/long-take-three-point-shooting-stabilize/), [Krishna Narsu](https://fansided.com/2017/12/21/nylon-calculus-team-stats-noise-stabilization-thunder/), [Nathan Walker](https://www.patreon.com/posts/31415520), [myself](https://twitter.com/kmedved/status/1063456469511737344) (and [again](https://twitter.com/kmedved/status/1257287058185388033)), and others. In short, the idea is that at some point in a season, the skill aspect of a player’s performance starts to outweigh in the inherent randomness in player performance, and stabilization rates are an attempt to figure out when that point is.

There are a lot of different ways to calculate stabilization rates – Carleton and Blackport used something called a “Kuder-Richardson 21 reliability score”, which involves grouping plate appearances/shooting attempts into buckets, and looking for the relationship in those buckets. Narsu simply looked for the point in the season at which a team’s current performance has more than 0.5 R^2 with their final statistics in a given metric. I prefer a predictive approach, via the ‘padding method’, which I first read about from [Justin Kubatko](http://statitudes.com/blog/2013/11/12/home-win-probability-using-srs/), but is commonly employed by [Tangotiger](http://tangotiger.com/index.php) as well, and I presume has some long storied history I’m ignorant of.

## The Padding Method

Under the ‘padding method’, at any given point in the season, you ‘pad’ a player’s performance with some sample of league-average performance, and that’s your projection of a player’s talent going forward the rest of the season. To take three point attempts as an example, Duncan Robinson opened the 2019-2020 season by shooting 17 of 34 from three (50%). There’s presumably some randomness in that performance, so we ‘pad’ both the numerator and the denominator there with some amount of league average performance (call this number X), to get a projection in the form of:

**`expected_fg3_pct = (17 + X * league_average_fg3_pct) / (34 + X)`**

If the padding number for threes is 240 (more on how to calculate this later), and the league average three-point-percentage is .355, then our projection becomes:

**`expected_fg3_pct = (17 + 240 * .355) / (34 + 240) = .373`**

So Robinson’s 34 attempts from three have raised our estimate of his three-point shooting talent from .355 (league average) to .373 (good, not great shooter). I think that roughly aligns with our intuitions as well – 34 attempts just isn’t very many, so we can’t go too wild, but it’s a nice sign all the same.

The beauty and elegance of the padding method is that **the amount of padding remains constant throughout the season**. You don’t need to use different coefficients depending how much of the season has elapsed. At all times – you just add 240 attempts of league average performance to a player’s shooting to get their future projection. Early on, the 240 ‘padding’ attempts totally dominate a player’s projection. But eventually, as the sample size grows, the player’s actual performance has a bigger and bigger impact.

Applying that to Robinson, you get the chart below, showing the progression of his projected shooting in red, and his actual YTD performance in blue. The cadence is the same, but the projection is naturally more conservative.

![Duncan Robinson's 2019-2020 three-point percentage, actual and padding projection](/research-figures/stabilization-rates-and-the-padding-approach/duncan-robinson-three-point-padding.png)

*Note even the more conservative projections eventually agree Robinson is an elite shooter.*

## Padding Values Are Stabilization Rates

So what does the padding approach have to do with stabilization rates? Well – they’re actually the same thing. Before games on January 3, 2020, Duncan Robinson had taken 237 threes, and made 110 of them. At that point in the season, his projection was:

**`expected_fg3_pct = (110 + 240 * .355) / (237 + 240) = .409`**

Meaning at that point, roughly half his projection was the 237 attempts he’d actually made, and half was the 240 padding attempts. After that game, the 240 padding attempts made up less and less of his projection, and his projection consisted **mostly** of his own performance. I emphasize ‘mostly’ here to reinforce that there’s nothing magical about the ‘stabilization point’, or about 50%. We still add 240 league average attempts to Robinson’s projection even after this point – they just have less and less relative impact. (I’m not a huge fan of the term ‘stabilization’ for this reason, since it implies after X attempts a player’s performance is “stable”, but I’ve given up fighting on this point).

I’m a big fan of the ‘padding approach’ as a way to address the stabilization question for its simplicity and directness. It doesn’t involve somewhat opaque statistical methods such as KR21 rates, and it directly answers the question most people want to know when they’re discussing stabilization: how do we project this player going forward?

With that somewhat lengthy preamble out of the way, here are the padding numbers/stabilization numbers for the main basic and advanced box-score metrics, sorted by most ‘stable’ to least, along with what I suggest ‘padding’ each metric’s performance with.

| Metric | Padding Denominator | Padding Value | League Average |
|:---|:---|---:|---:|
| minutes | games | 1.52 | 20.315 |
| fg3_ar | fga | 3.64 | 0.246 |
| ast_pct | ast_avail | 17.93 | 0.147 |
| ft_pct | fta | 24.11 | 0.758 |
| fg3a_100 | poss | 29.29 | 4.322 |
| ft_ar | fga | 51.28 | 0.289 |
| ast_100 | poss | 55.57 | 4.678 |
| trb_100 | poss | 60.52 | 9.059 |
| fg2a_100 | poss | 68.39 | 13.256 |
| usg_pct | poss | 72.41 | 0.2 |
| fga_100 | poss | 89.62 | 17.578 |
| orb_pct | poss | 98.55 | 0.051 |
| orb_100 | poss | 101.46 | 2.364 |
| blk_pct | on_opp_fg2a | 101.95 | 0.016 |
| fg_pct | fga | 102.92 | 0.453 |
| drb_pct | poss | 108.26 | 0.148 |
| drb_100 | poss | 109 | 6.696 |
| fg2_pct | fg2a | 127.33 | 0.485 |
| blk_100 | poss | 151.22 | 1.045 |
| fta_100 | poss | 197.58 | 5.114 |
| pf_100 | poss | 218.92 | 4.475 |
| fg3_pct | fg3a | 242.61 | 0.356 |
| tov_100 | poss | 425.69 | 2.949 |
| stl_pct | poss | 631.52 | 0.016 |
| stl_100 | poss | 632.61 | 1.618 |
| tov_pct | poss | 654.41 | 0.131 |
| pm_100 | poss | 1,007.21 | 0 |

These were calculated the simplest way I know how – trial and error via [differential evolution](https://docs.scipy.org/doc/scipy/reference/generated/scipy.optimize.differential_evolution.html), finding the best ‘padding’ number to add to year-to-date performance for each player, after every game of the season, for every season since 2001, to best predict rest-of-the-year performance (about 750K rows of data).

As you can see, minutes are extremely stable (duh), since they’re almost entirely a coach’s decision and not a question of randomness/noise. On the other side, plus/minus data is extremely noisy, and you should regress a player’s performance by over 1,000 league average possessions going forward.

Note that three point percentage is relatively noisy at 242 attempts before your performance is mostly ‘real’ rather than noise. But even 242 attempts is a much smaller number than Darryl Blackport had found in his 2014 piece, where he concluded you needed **750** attempts for ‘stabilization’. For context, [only 7 players have ever taken more than 750 three point attempts](https://www.basketball-reference.com/leaders/fg3a_season.html) in an entire season, so this is a pretty big difference.

Note that there are other ways to do this: you could attempt to predict the next game’s performance instead of the rest of the season’s performance. You could also use career-to-date performance to project rest-of-season performance, or career-to-date performance to project rest-of-career performance. There are pros and cons to all these approaches, although they mostly matter less than you may expect (which is one of the virtues of the padding approach in the first place). I’ll explore the others in upcoming posts however, and also revisit my prior research on team-stabilization-padding rates.
