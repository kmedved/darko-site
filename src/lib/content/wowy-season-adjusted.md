# What Did Larry Bird Play Like in 1983?

*A season-by-season impact rating for every NBA player since 1980, now live on the DARKO site.*

Who was the best player in the NBA in 1983?

Not who won the MVP — Moses Malone did, and we'll get to him. Who actually moved the scoreboard
the most, per possession, on both ends of the floor? Here is my answer:

| Rank | Player | Offense | Defense | Total | Weighted daily baseline | Season adjustment |
| ---: | :--- | ---: | ---: | ---: | ---: | ---: |
| 1 | Larry Bird | +5.32 | +2.80 | **+8.12** | +6.68 | +1.45 |
| 2 | Magic Johnson | +6.16 | +1.23 | **+7.39** | +6.52 | +0.87 |
| 3 | Julius Erving | +2.61 | +2.61 | **+5.21** | +4.83 | +0.38 |
| 4 | Kareem Abdul-Jabbar | +3.20 | +1.96 | **+5.15** | +3.50 | +1.66 |
| 5 | Johnny Moore | +1.90 | +3.17 | **+5.07** | +3.42 | +1.65 |
| 6 | Sidney Moncrief | +2.97 | +1.71 | **+4.68** | +4.17 | +0.51 |
| 7 | Larry Nance | +1.33 | +3.04 | **+4.37** | +2.65 | +1.72 |
| 8 | Gus Williams | +2.76 | +1.13 | **+3.88** | +3.30 | +0.59 |
| 9 | Maurice Cheeks | +0.52 | +3.25 | **+3.78** | +2.82 | +0.96 |
| 10 | Robert Parish | +2.22 | +1.51 | **+3.73** | +3.21 | +0.52 |

Bird and Magic, one and two, at the peak of their rivalry. The numbers are points per 100
possessions above an average player, the same scale RAPM uses — RAPM being the family of
plus-minus stats that credit a player for how the score moves while he is on the floor, adjusted
for who he played with and against.

Two names in that season tell you what this table can see.

Moses Malone won the 1983 MVP, swept through the playoffs with the Sixers, and does not crack this
top ten. On per-possession impact he lands 12th, at +3.57. But Moses played 91 games that year,
regular season and playoffs, more than almost anyone. Count total points added across the whole
season instead of impact per possession, and he climbs to 8th. That gap — between how good a
player was per minute and how much he gave you in total — is a tension MVP voters have argued
about forever. The model lets us calculate both kinds of value, even though the public leaderboard
ranks per-possession impact and shows minutes rather than a separate total-value column.

And then there is Tree Rollins. The Hawks center scored little and the box score of the era barely
knew what to do with him: the model rates his 1983 offense at -0.9. His defense comes in at +4.1,
the best defensive rating in the league that season. A player who was actively below average with
the ball was still one of the most impactful players in basketball, because of what happened at the
other end. The 1983 box score could never have told you that. Team results, with him and without
him, can.

That is the new product in one season: **Season-Adjusted WOWY**. One table, 20,543 player-seasons,
covering all 47 seasons from 1979-80 through 2025-26, every one scored by the same procedure. It is
live on the DARKO site now.

## Two numbers, two questions

On the WOWY season leaderboard you will now see a choice: **Average** or **Adjusted**.

WOWY is my attempt to estimate player impact back to 1980, including the years before the NBA had
complete play-by-play data. The daily WOWY model updates its opinion of every player game by game,
and that daily line is still the foundation. The two season numbers answer different questions:

- **Average** asks: what did the daily model believe about this player, game by game, over the
  season?
- **Adjusted** asks: with the whole season in front of us, how well does the evidence say he
  actually played?

The adjusted rating is a second layer built on top of the daily model. It does not replace the
daily model or change the career trajectories already on the site.

## The best season since 1980

Before anything else, the answer everyone asks for. Among seasons with substantial playing time,
the current top ten:

| Rank | Player | Season | Offense | Defense | Total |
| ---: | :--- | ---: | ---: | ---: | ---: |
| 1 | LeBron James | 2009 | +7.12 | +3.68 | **+10.80** |
| 2 | Michael Jordan | 1991 | +7.08 | +3.12 | **+10.20** |
| 3 | LeBron James | 2010 | +7.56 | +2.44 | **+10.01** |
| 4 | LeBron James | 2013 | +7.67 | +2.24 | **+9.92** |
| 5 | LeBron James | 2017 | +7.42 | +2.44 | **+9.86** |
| 6 | Michael Jordan | 1993 | +6.78 | +3.07 | **+9.85** |
| 7 | LeBron James | 2016 | +6.80 | +2.96 | **+9.76** |
| 8 | Giannis Antetokounmpo | 2020 | +5.56 | +4.19 | **+9.75** |
| 9 | Nikola Jokic | 2025 | +8.16 | +1.43 | **+9.58** |
| 10 | Giannis Antetokounmpo | 2022 | +4.52 | +4.94 | **+9.46** |

LeBron's 2009 season edges Jordan's 1991 by six-tenths of a point. Nobody wrote a Jordan rule or
an era bonus; the gap emerged after requiring every season to use the same information and the
same scoring process. One disclosure: when I chose among candidate models, I required the winner
to keep the best modern peak and the best pre-1998 peak within one point of each other. That was a
guardrail to keep eras comparable, not independent proof that six-tenths is the true gap.

The table is not meant to settle every argument. It is meant to put those arguments on a
consistent footing: 2009 LeBron and 1991 Jordan and 1983 Bird, finally scored by one procedure.

## Great is not the same as valuable

In the fall of 1985, Michael Jordan broke a bone in his foot three games into the season. He
played only 18 regular-season games. The model watched every one of them and rated his level at
+5.4 while he played; with the full season's evidence, the adjusted figure comes to +6.4 — already
near-MVP territory in year two.

Was that a great season? Per possession, absolutely. In total value, Jordan added roughly 76
points above average all year. Larry Bird that same season played at +8.84 and added about 715.
Same league, same year, a tenfold gap in delivered value. The site puts per-possession rating and
minutes side by side; it ranks the former, while total value is a derived comparison rather than a
displayed leaderboard column. The distinction — how good a player *was* versus how much he *gave
you* — runs through the whole table.

Injured superstars are also why the table has no minimum-games cutoff. In 1996-97, David Robinson
hurt his back, came back, broke his foot, and played six games. In 1988-89, Larry Bird had bone
spurs removed from both heels after six games. A "filter out low-minutes players" rule would
quietly flag two Hall of Famers as noise. Instead the model does what a sensible observer would
do: it starts from everything it already knew about the player and lets six games move that
belief only a little. Robinson's six games rate +6.7; Bird's rate +7.3. Great players, briefly
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
| Larry Bird, 1983 | +6.68 | +1.45 | **+8.12** |
| Michael Jordan, 1991 | +8.38 | +1.82 | **+10.20** |
| Michael Jordan, 1993 | +8.21 | +1.65 | **+9.85** |
| LeBron James, 2009 | +8.55 | +2.25 | **+10.80** |
| LeBron James, 2013 | +8.51 | +1.41 | **+9.92** |
| Nikola Jokic, 2025 | +8.73 | +0.85 | **+9.58** |

The baseline column is not a literal copy of the site's **Average** toggle. The public Average is a
simple mean in which every published game counts equally. The adjustment model uses a
playing-time-weighted daily baseline before adding the season evidence. For Bird in 1983, the
public Average is +5.99, the weighted baseline is +6.68, and the **Adjusted** rating is +8.12.

## How it works, briefly

Start with the baseline: a playing-time-weighted average of the player's daily WOWY rating across
the season, playoffs included at full weight.

Then ask whether the season gives us a reason to move that baseline. The model looks only at
evidence that exists for every season since 1980: how the player's teams did with him and without
him; results by game and by quarter; box-score production and role; team offense and defense; a
proprietary dynamic plus-minus system — a custom RAPM variant we built to track how each part of a
player's game (scoring, shooting efficiency, turnovers, rebounding, foul-drawing) changes over
time; and how much evidence the season actually contains. A player in 1983 and a player in 2025
are judged on the same information. Modern players get no special inputs that older players could
never have had.

Modern play-by-play still matters, but as the teacher rather than the ingredient. For recent
seasons I can compute a season-by-season RAPM answer sheet from full play-by-play. The model
studies those seasons to learn how full-season evidence tends to differ from the cautious daily
average, then applies that lesson everywhere using only the every-era inputs. Offense and defense
are estimated separately and added together exactly; the total is always offense plus defense, in
points per 100 possessions.

There is an obvious trap here: a model taught with modern answer sheets could simply memorize
them. So the published ratings are built the way a fair teacher grades — the model never grades a
season it was trained on. I split the modern seasons into large blocks; whenever a block was
scored, the answer sheets for those seasons were hidden from the model. I repeated this five times
with different blocks and averaged the results. Every season from 1980 to 2026, ancient or modern,
goes through that same five-pass process, so no season's published value ever comes from a model
that saw that season's answer key.

One more piece of restraint. Early versions of this project were too aggressive: amplify every
wiggle in the daily ratings and stars look dramatic, but little-used players get absurd numbers
and one strange week becomes a historic season. The final version moves ratings less when a season
contains little evidence, caps how large any single correction can be, and forces the positive and
negative adjustments to balance within each season. Six games are not allowed to manufacture a
brand-new peak.

## A timing mistake we found in our own model

Late in the project, I found that one input to the daily ratings was not as "before the game" as I
thought it was. It had been rebuilt using the full history and then joined back onto earlier dates.
The effect was subtle, but the principle was not: a rating labeled as what we knew before a game
should not contain even a faint imprint of games that had not happened yet.

The fix was computationally tedious and conceptually simple. I rebuilt that input separately for
all 9,374 game dates. At each date, the fitting process could see only earlier games. The audit found
zero timing violations, and changing later data left earlier states unchanged. The clean rebuild
still improved prediction by about 2.5 percent compared with throwing that evidence away entirely.

The future-informed version scored a little better than the clean one on a conventional accuracy
test. That is exactly what accidental peeking tends to do. I rejected it anyway, then rebuilt the
daily ratings, the season ratings, and the public tables from the clean foundation. A separate set
of strictly lagged role and playing-time signals recovered additional predictive value without
looking ahead. The headline rankings survived, but they now rest on a claim the pipeline actually
keeps: before-game ratings use before-game information.

## Did it work?

Three checks, in plain terms.

**The hidden-season test.** For modern seasons, I repeatedly hid the play-by-play answer sheet and
asked whether the adjusted rating landed closer to it than the daily average did. It did — on
offense, on defense, and on total impact. The size of the corrections also checked out: a
one-point adjustment in the published table corresponded to about a one-point movement in the
hidden answers. A model can look accurate while making every correction too timid or too bold;
this one moves about the right amount.

**The team test.** Before 1998 there is no play-by-play answer sheet, but there are final scores.
Add the player ratings back up and you can ask how well they reconstruct each team's actual
results. The adjusted ratings came closer to historical team performance than the daily averages
did, for total impact and for defense.

**The playoff test.** While the adjustment model was being developed, playoff games were kept out
of its training data. Then I asked: when the model says a player genuinely played better than his
daily rating that season, did his playoff minutes agree? They did. The season adjustments carried
through to playoff results at about 60 percent of full strength — a relationship more than five
standard errors from chance. Playoffs are small samples against brutal opponents, so 60 percent is
roughly what honest signal should look like. I will note that this playoff check was consulted
more than once during development, so I treat it as strong support rather than a pristine final
exam. The pristine exam is coming — more on that at the end.

The table also passed the boring tests that usually expose a historical model: offense plus
defense equals total everywhere, the 1997-to-1998 boundary (where play-by-play begins) is smooth,
and the low-minute tails stay bounded. The daily WOWY foundation was rebuilt once under the clean
before-game timing rule, then the season layer and every public table were regenerated from that
same version.

## What the box score missed

BPM is the natural comparison: the best-known box-score impact stat, and itself one input to WOWY.
The question is whether everything else — team results, with-and-without evidence, quarter-by-
quarter results, and the dynamic component ratings — improves on what the box score alone can see.

A note on sourcing. My archive has Basketball Reference's game-level BPM starting in 1985, and for
the full sample I recreated BPM 2.0 from the published Basketball Reference method. The recreation
is effectively exact: against the archived Basketball Reference values, one-game numbers correlate
at 0.9998 with a mean error of 0.12 points, and player-season numbers correlate at 0.9996 with a
mean error of 0.08 points (0.07 among 3,000-possession seasons). The check matches all 1,060,583
played Basketball Reference rows and 99.92% of reconstructed rows; the small remainder is mostly
play-in games without an archived value. So: recreated BPM 2.0, not an official download, but the
same statistic for this purpose.

Season-Adjusted WOWY and BPM agree far more than they disagree — their correlation is 0.885 across
all player-seasons weighted by playing time, and about 0.897 among seasons with at least 3,000
possessions. Box scores contain a lot of real information, and WOWY uses it.

The disagreements are the interesting part. One technical note first: BPM's numbers are spread
wider than WOWY's, so raw subtraction would make every star look worse and every bench player look
better. To compare fairly, I first put BPM on WOWY's scale within each season. The final column
shows how much higher or lower WOWY rates each career than that scale-matched BPM expectation,
among players with at least 20,000 tracked possessions:

| Player | Season-Adjusted WOWY | Recreated BPM | WOWY difference after scale matching |
| :--- | ---: | ---: | ---: |
| Larry Bird | +7.23 | +6.94 | **+2.26** |
| Steve Nash | +4.09 | +2.96 | **+1.97** |
| Magic Johnson | +7.13 | +7.52 | **+1.73** |
| Dikembe Mutombo | +2.89 | +1.67 | **+1.69** |
| Alonzo Mourning | +3.21 | +2.18 | **+1.65** |
| Dennis Rodman | +2.09 | +0.72 | **+1.57** |
| Collin Sexton | -3.40 | -1.27 | **-2.49** |
| Clarence Weatherspoon | -2.60 | -0.50 | **-2.23** |
| Donyell Marshall | -1.42 | +0.94 | **-2.10** |
| Ricky Davis | -2.66 | -1.01 | **-1.94** |
| Trae Young | -0.06 | +2.46 | **-1.83** |
| Zach LaVine | -1.30 | +0.46 | **-1.63** |

This is the pattern I hoped the extra evidence would find. The gainers are defenders the box score
never captured — Rodman, Mutombo, Mourning — plus the great offensive organizers, Bird, Magic, and
Nash, whose effect on teammates does not fit in a stat line. The losers are mostly high-volume
scorers whose teams did not move the way their box scores imply. Trae Young stays genuinely strong
on offense, but the team evidence charges him a much larger defensive bill than BPM does.

None of this proves every WOWY rating is right, and since BPM feeds into WOWY, this is not a
contest between two strangers. The stronger evidence is the hidden-season test above. What this
comparison shows is where the extra tools actually change the basketball answer — and it is
exactly where you would want them to: defense, playmaking, and empty-calorie scoring.

## What the model cannot know

Before building this, I tried to build something more ambitious: a rating that tracks a player's
form *within* a season — the hot January, the post-All-Star surge. I tested whether that is even
possible by planting fake mid-season swings of realistic size into simulated seasons built on real
schedules, then asking the machinery to recover them. It could not come close. At realistic swing
sizes, the reconstructed swings carried more than twenty times as much noise as signal. The
information simply is not in the game outcomes. That failure shaped this product: one honest
number per season, because that is what the evidence can support. I would rather tell you what the
data cannot say than sell you a decimal it cannot back.

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
supported by the hidden-season tests, the team reconstructions, the playoff check, and sensible
behavior at both ends of the table. That is meaningful evidence, not certainty — differences of a
few tenths should never be read as proof. The 2025-26 season was also visible while I built this,
so it is included but is not an untouched test.

## The test we cannot cheat

Which brings me to the last piece. The cleanest way to grade a model is on a season it has never
seen, judged by rules written before anyone knows the answer. So the rules are already written:
before this article was published, I froze a protocol specifying exactly how the model will be
evaluated on the 2026-27 season — which questions get asked, which checks are binding — a year
before the season can be scored. When 2027 arrives, the model takes an exam it cannot have studied
for, and I will publish the grade either way.

## How to read the site

Use **Average** when you want a season summary of the daily trajectory already shown on DARKO —
the model's evolving, cautious view of the player's level, with every published game counting
equally.

Use **Adjusted** when you want the retrospective verdict: the weighted daily baseline plus however
much season-specific performance the broader evidence actually supports.

Both views are useful. They answer different questions — which is the whole point. What did we
think of Larry Bird while 1983 was happening, and what do we know now? For the first time, the
table answers both, for every player, in every season, back to 1980.

---

The underlying project retains a complete audit trail: the model record, failed approaches,
validation results, and artifact hashes.
