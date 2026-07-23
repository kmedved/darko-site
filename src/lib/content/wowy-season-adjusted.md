# What Did Larry Bird Play Like in 1983?

*Season-by-season impact ratings from 1977-78 onward, now live on the DARKO site.*

Who was the best player in the NBA in 1983?

Not who won the MVP — Moses Malone did, and we'll get to him. Who actually moved the scoreboard
the most, per possession, on both ends of the floor? Here is my answer:

| Rank | Player | Offense | Defense | Total | Weighted daily baseline | Season adjustment |
| ---: | :--- | ---: | ---: | ---: | ---: | ---: |
| 1 | Larry Bird | +5.18 | +2.91 | **+8.09** | +6.82 | +1.27 |
| 2 | Magic Johnson | +6.10 | +1.01 | **+7.11** | +6.20 | +0.91 |
| 3 | Kareem Abdul-Jabbar | +3.47 | +2.61 | **+6.08** | +4.23 | +1.85 |
| 4 | Julius Erving | +2.64 | +2.78 | **+5.42** | +5.27 | +0.15 |
| 5 | Johnny Moore | +2.01 | +3.18 | **+5.20** | +2.90 | +2.30 |
| 6 | Larry Nance | +1.39 | +2.96 | **+4.35** | +2.42 | +1.93 |
| 7 | Sidney Moncrief | +3.12 | +1.19 | **+4.31** | +3.68 | +0.63 |
| 8 | Moses Malone | +3.64 | +0.41 | **+4.05** | +3.58 | +0.46 |
| 9 | Robert Parish | +2.32 | +1.70 | **+4.01** | +3.54 | +0.47 |
| 10 | Gus Williams | +2.93 | +0.91 | **+3.84** | +3.37 | +0.47 |

Bird and Magic, one and two, at the peak of their rivalry. The numbers are points per 100
possessions above an average player, the same scale RAPM uses — RAPM being the family of
plus-minus stats that credit a player for how the score moves while he is on the floor, adjusted
for who he played with and against.

Two names in that season tell you what this table can see.

Moses Malone won the 1983 MVP and swept through the playoffs with the Sixers. On per-possession
impact he lands eighth, at +4.05. But Moses played 91 games that year, regular season and
playoffs, more than almost anyone. Count total points added across the whole season instead of
impact per possession, and he climbs to sixth. That gap — between how good a
player was per minute and how much he gave you in total — is a tension MVP voters have argued
about forever. The model lets us calculate both kinds of value, even though the public leaderboard
ranks per-possession impact and shows minutes rather than a separate total-value column.

And then there is Tree Rollins. The Hawks center scored little and the box score of the era barely
knew what to do with him: the model rates his 1983 offense at -0.81. His defense comes in at +4.38,
the best defensive rating in the league that season. A player who was actively below average with
the ball was still one of the most impactful players in basketball, because of what happened at the
other end. The 1983 box score could never have told you that. Team results, with him and without
him, can.

That is the new product in one season: **Season-Adjusted WOWY**. One table, 21,128 player-seasons,
covering all 49 seasons from 1977-78 through 2025-26, every one scored by the same procedure. It is
live on the DARKO site now.

## Two numbers, two questions

On the WOWY season leaderboard you will now see a choice: **Average** or **Adjusted**.

WOWY is my attempt to estimate player impact back to 1977-78, including the years before the NBA had
complete play-by-play data. Underneath everything is a causal daily model that updates its opinion
before each game using only information then available. The public career trajectory applies a
separately tested retrospective pass called **Final Cut**, which uses later games to sharpen that
line after the fact. The two season numbers answer different questions:

- **Average** asks: what is the simple average of the published Final Cut game-by-game ratings?
- **Adjusted** asks: with the whole season in front of us, how well does the evidence say he
  actually played?

The adjusted rating is a second layer built on the retained causal daily ratings. It does not
replace either daily series or change the career trajectories already on the site. Every published
game row retains the causal pregame values alongside the displayed Final Cut values; Final Cut is
intentionally retrospective and should not be read as a before-game forecast.

## The best season in the table

Before anything else, the answer everyone asks for. Among seasons with substantial playing time,
the current top ten:

| Rank | Player | Season | Offense | Defense | Total |
| ---: | :--- | ---: | ---: | ---: | ---: |
| 1 | LeBron James | 2009 | +7.27 | +3.74 | **+11.01** |
| 2 | LeBron James | 2017 | +8.04 | +2.67 | **+10.71** |
| 3 | Nikola Jokic | 2025 | +8.25 | +2.08 | **+10.33** |
| 4 | Michael Jordan | 1993 | +6.92 | +3.37 | **+10.29** |
| 5 | Michael Jordan | 1991 | +7.06 | +3.20 | **+10.25** |
| 6 | LeBron James | 2010 | +7.70 | +2.43 | **+10.13** |
| 7 | LeBron James | 2016 | +7.02 | +3.07 | **+10.09** |
| 8 | Michael Jordan | 1988 | +7.10 | +2.90 | **+10.00** |
| 9 | Michael Jordan | 1996 | +7.52 | +2.27 | **+9.79** |
| 10 | Nikola Jokic | 2026 | +8.28 | +1.45 | **+9.73** |

LeBron's 2009 season edges Jordan's 1993 by about seven-tenths of a point. Both are scored from the same
kind of evidence under the same rules. More importantly, they belong in the same tier: differences
of a few tenths should be read as uncertainty around two extraordinary seasons, not as proof that
one peak was definitively better.

The table is not meant to settle every argument. It is meant to put those arguments on a
consistent footing: 2009 LeBron and 1991 Jordan and 1983 Bird, finally scored by one procedure.

## Great is not the same as valuable

In the fall of 1985, Michael Jordan broke a bone in his foot three games into the season. He
played only 18 regular-season games. The model watched every one of them and rated his level at
+4.31 in the weighted daily baseline; with the full season's evidence, the adjusted figure comes
to +5.03 — already an excellent level in year two.

Was that a great season? Per possession, absolutely. In total value, Jordan added roughly 76
points above average all year. Larry Bird that same season played at +9.05 and added about 732.
Same league, same year, a tenfold gap in delivered value. The site puts per-possession rating and
minutes side by side; it ranks the former, while total value is a derived comparison rather than a
displayed leaderboard column. The distinction — how good a player *was* versus how much he *gave
you* — runs through the whole table.

Injured superstars are also why the table has no minimum-games cutoff. In 1996-97, David Robinson
hurt his back, came back, broke his foot, and played six games. In 1988-89, Larry Bird had bone
spurs removed from both heels after six games. A "filter out low-minutes players" rule would
quietly flag two Hall of Famers as noise. Instead the model does what a sensible observer would
do: it starts from everything it already knew about the player and lets six games move that
belief only a little. Robinson's six games rate +6.9; Bird's rate +7.5. Great players, briefly
seen, still look like great players — the rating just refuses to pretend six games taught it
much.

## Why not just average the daily ratings?

The daily WOWY line is designed to move carefully. Before every game, it carries forward what it
has learned from previous games and previous seasons. A great week should not turn an average
player into an MVP overnight, and a terrible week should not erase a decade of evidence. That
caution is exactly right when the question is, "How good is this player right now?"

But it creates a lag when the question becomes, "How well did he play this season?"

Imagine a player begins the year rated +3 and then plays at a +5 level. Because the daily model is
cautious, perhaps he finishes the year at +4, and his average daily rating for the season is only
+3.5. That +3.5 is not wrong — it is a fair summary of what the model believed while it was still
learning. But with the full season behind us, we know more. To drag a stubborn daily estimate from
+3 to +4, the player probably had to perform at something closer to +5.

The gap between those two readings shows up in real seasons:

| Player-season | Weighted daily baseline | Season adjustment | Adjusted rating |
| :--- | ---: | ---: | ---: |
| Larry Bird, 1983 | +6.82 | +1.27 | **+8.09** |
| Michael Jordan, 1991 | +8.37 | +1.89 | **+10.25** |
| Michael Jordan, 1993 | +8.44 | +1.85 | **+10.29** |
| LeBron James, 2009 | +8.55 | +2.46 | **+11.01** |
| LeBron James, 2013 | +8.71 | +0.85 | **+9.56** |
| Nikola Jokic, 2025 | +9.16 | +1.17 | **+10.33** |

The baseline column is not a literal copy of the site's **Average** toggle. The public Average is a
simple mean in which every published game counts equally. The adjustment model uses a
playing-time-weighted daily baseline before adding the season evidence. For Bird in 1983, the
public Average is +6.05, the weighted baseline is +6.82, and the **Adjusted** rating is +8.09.

## How it works, briefly

Start with the baseline: a playing-time-weighted average of the player's daily WOWY rating across
the season, playoffs included at full weight.

Then ask whether the season gives us a reason to move that baseline. The model looks only at
evidence that exists for every season from 1977-78 onward: how the player's teams did with him and without
him; results by game and by quarter; box-score production and role; team offense and defense; a
dynamic plus-minus track that follows how each part of a player's game (scoring, shooting
efficiency, turnovers, rebounding, foul-drawing) changes over time; and how much evidence the
season actually contains. A player in 1983 and a player in 2025
are judged on the same information. Modern players get no special inputs that older players could
never have had.

Modern play-by-play supplies the comparison target, not a modern-only input. Recent seasons show
how full-season performance tends to differ from the cautious daily average. The model learns that
relationship, then applies it everywhere using only the evidence available in every era. Offense
and defense are estimated separately and added together exactly; the total is always offense plus
defense, in points per 100 possessions.

The modern teaching seasons are used only to learn the general relationship between season
evidence and season performance. A player's published rating is always produced without training
on that player's season result. The same scoring procedure is then applied from 1978 through 2026.

How much the rating moves depends on how much the season can actually tell us. A full, information-
rich season can move meaningfully away from the daily baseline. A six-game season usually cannot.
Adjustments are bounded, and each season remains centered around league average, so a short hot
streak cannot create a new all-time peak by itself.

The timing of the layers is also deliberate. Each internal daily baseline uses only information
that was available before that game. Final Cut retrospectively sharpens the public game-by-game
line, while the season adjustment asks what the completed season tells us as one evidence block.
That is why **Average** and **Adjusted** can differ without contradicting each other.

## Why trust it?

Three kinds of evidence support the ratings.

**Comparison with play-by-play RAPM.** In modern seasons, where full play-by-play provides a much
more direct season-level comparison, the adjusted ratings land closer to season RAPM than the
daily averages do — on offense, on defense, and in total. The scale also lines up: a one-point
adjustment generally corresponds to about a one-point difference in the comparison ratings.

**Historical team results.** Before 1998 there is no complete play-by-play comparison, but there
are final scores. Adding the player ratings back up reproduces historical team performance more
closely with the adjusted ratings than with the daily averages, both for total impact and defense.

**Playoff performance.** Players whose season evidence moved them above their daily baseline also
tended to outperform that baseline in the playoffs. The relationship carried through at about 60
percent strength, which is substantial given the smaller samples and stronger opponents.

The table also behaves consistently at the places where historical ratings often break: offense
plus defense equals total everywhere, the 1997-to-1998 play-by-play boundary is smooth, and
low-minute seasons remain within reasonable bounds.

## What the box score missed

BPM is the natural comparison: the best-known box-score impact stat, and itself one input to WOWY.
The question is whether everything else — team results, with-and-without evidence, quarter-by-
quarter results, and the dynamic component ratings — improves on what the box score alone can see.

The BPM values here recreate Basketball Reference's published BPM 2.0 method from the box score.
They are not an official download, but the reconstruction is effectively exact: player-season
values correlate at 0.9996 with archived Basketball Reference values, with a mean error of 0.08
points. That is close enough for the comparison to be about basketball rather than data plumbing.

Season-Adjusted WOWY and BPM agree far more than they disagree — their correlation is 0.881 across
all player-seasons weighted by playing time, and about 0.893 among seasons with at least 3,000
possessions. Box scores contain a lot of real information, and WOWY uses it.

The disagreements are the interesting part. One technical note first: BPM's numbers are spread
wider than WOWY's, so raw subtraction would make every star look worse and every bench player look
better. To compare fairly, I first put BPM on WOWY's scale within each season. The final column
shows how much higher or lower WOWY rates each career than that scale-matched BPM expectation,
among players with at least 20,000 tracked possessions:

| Player | Season-Adjusted WOWY | Recreated BPM | WOWY difference after scale matching |
| :--- | ---: | ---: | ---: |
| Larry Bird | +7.37 | +6.94 | **+2.31** |
| Steve Nash | +4.03 | +2.96 | **+1.87** |
| Dennis Rodman | +2.18 | +0.72 | **+1.65** |
| Magic Johnson | +7.09 | +7.52 | **+1.61** |
| Dikembe Mutombo | +2.80 | +1.67 | **+1.58** |
| Alonzo Mourning | +3.14 | +2.18 | **+1.54** |
| Collin Sexton | -3.43 | -1.27 | **-2.51** |
| Clarence Weatherspoon | -2.53 | -0.50 | **-2.16** |
| Martell Webster | -2.82 | -0.91 | **-2.16** |
| Trae Young | -0.23 | +2.46 | **-2.03** |
| Donyell Marshall | -1.16 | +0.94 | **-1.84** |
| Ricky Davis | -2.49 | -1.01 | **-1.76** |

The gainers are defenders the box score never captured — Rodman, Mutombo, Mourning — plus the great
offensive organizers, Bird, Magic, and Nash, whose effect on teammates does not fit in a stat line.
The losers are mostly high-volume scorers whose teams did not move the way their box scores imply.
Trae Young stays genuinely strong on offense, but the team evidence charges him a much larger
defensive bill than BPM does.

None of this proves every WOWY rating is right, and since BPM feeds into WOWY, this is not a
contest between two strangers. The stronger evidence is the modern play-by-play comparison above.
What the BPM comparison shows is where the extra tools change the basketball answer: defense,
playmaking, and empty-calorie scoring.

## What the model cannot know

This is a season rating, not a reliable map of every hot or cold month. At realistic within-season
swing sizes, game outcomes carry far more noise than recoverable signal. The evidence supports one
careful estimate for the season much better than it supports a precise claim about a player's
January form or post-All-Star surge.

Some limits remain even at the season level.

**The 1994 Bulls problem.** Michael Jordan spent 1994 playing minor-league baseball, and the Bulls
won 55 games without him. It is the most famous natural experiment in NBA history — and it is
genuinely misleading. Scottie Pippen delivered his best season and finished third in MVP voting.
Toni Kukoc, a European star, arrived that fall. The roster the Bulls fielded without Jordan was
not the roster minus Jordan; it was a different, better-timed team. The model does not know that.
It watches a Jordan-less team win 55 games and prices it in. No with-or-without-you method can
fully un-see that season, and I will not pretend mine does.

**Short seasons stay humble.** The rating deliberately blends what was known about a player before
the season with what he did during it. For the six-game seasons of Robinson and Bird, that is a
feature. But it means a short season's rating is not a raw summary of those games alone.

**The model tells you when it is unsure.** Because every season is scored five separate times, the
five runs can disagree, and the size of that disagreement is an honest error bar. For most players
the runs nearly agree. The two least-settled ratings in the entire table, among full-time players,
belong to Joe Dumars's 1992 and Mark Eaton's 1984 — a quiet two-way guard and a defense-only
7-foot-4 shot blocker, exactly the players whose value lives where the historical record is
thinnest. The model says so rather than bluffing.

**And the obvious one.** There is no hidden file containing true RAPM for Larry Bird in 1983.
Before the play-by-play era the evidence is necessarily indirect. The historical ratings are
supported by modern comparisons, team reconstructions, playoff performance, and consistent
behavior at both ends of the table. That is meaningful evidence, not certainty — differences of a
few tenths should never be read as proof.

## How to read the site

Use **Average** when you want a season summary of the daily trajectory already shown on DARKO —
the model's evolving, cautious view of the player's level, with every published game counting
equally.

Use **Adjusted** when you want the retrospective verdict: the weighted daily baseline plus however
much season-specific performance the broader evidence actually supports.

Both views are useful. They answer different questions — which is the whole point. What did we
think of Larry Bird while 1983 was happening, and what do we know now? For the first time, the
table answers both across the league, back to 1977-78.
