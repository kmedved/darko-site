# We Found Tomorrow in a Before-Game Rating

*How a subtle timing mistake entered causal Daily WOWY, why it made validation
look better, and how I rebuilt the ratings without it.*

The causal Daily WOWY series makes a simple promise: the rating attached to a
game reflects what the model could have known before that game.

DARKO also publishes two deliberately retrospective views. The Daily trajectory
currently shows **Final Cut**, a game-by-game historian that uses later evidence
to sharpen the shape of a career after the fact. Every published game row still
retains the causal before-game offensive, defensive, and total ratings alongside
that display series. **Season-Adjusted WOWY** is the third object: one
retrospective estimate for each completed player-season. This post is about
repairing the causal series underneath those products, not removing hindsight
from the two historian views where it is intentional.

That promise matters. If a player is rated +4 on January 10, games from March
cannot be allowed to help produce the January number. Otherwise the line may
look impressively smooth and accurate while quietly borrowing from the future.

Late in the Season-Adjusted WOWY project, I discovered that one input to the
daily ratings broke that rule.

The mistake was not as obvious as directly feeding tomorrow's box score into
today's rating. It came from a historical player-strength model that had been
fit over the complete timeline and then joined back onto earlier dates. A
January value did not contain a future game's score as a column, but the fit
that produced it had learned from games that happened later.

In plain English: a small part of the model knew how the story ended.

## Proving the problem

The first job was to establish that this was not merely a suspicious-looking
code path.

I rebuilt the old, full-history version in isolation. It reproduced the
then-current causal production ratings exactly: the same players, dates,
component values, and final offensive, defensive, and total ratings across
4,126,431 rows. The maximum difference was zero.

That value-level match turned a concern into a finding. The production daily
model really was using the future-informed version.

It also explained why the issue had survived. On an ordinary prediction test,
the future-informed version scored best. Its combined validation error was
3.0415, compared with 3.0521 for the clean version. Looking ahead helps a model
predict. That is precisely why leakage is dangerous: it rewards the broken
method.

## Rebuilding the input honestly

The repair was conceptually simple and computationally repetitive.

For each of the 9,374 published game dates, I refit the historical input using
only games that had already happened. Then I rebuilt the daily WOWY ratings
from those strictly pregame states.

I tested the result in two ways:

- Changing later data could not change an earlier state.
- The nightly update path could append a genuinely new date without falling
  back to the retired full-history method.

For the second test, I removed the final certified date, resumed from the prior
checkpoint, and rebuilt it. The append took 11.15 seconds and reproduced all
4,126,431 state rows exactly. The update receipt also proves that no
retrospective fallback was available.

The clean input still carried real information. Compared with throwing the
channel away entirely, it reduced combined validation error from 3.1291 to
3.0521, an improvement of about 2.46 percent, and won in all 5 folds. The
lesson was not that the input was useless. It was that useful information had
to be built on the right side of the clock.

## How much did the ratings move?

Less than you might expect, but enough to matter.

The clean and old daily ratings correlate at 0.9953. Weighted by playing time,
the average absolute change is about 0.16 points per 100 possessions. This was
not a wholesale rewrite of basketball history. It was a correction to a
widely distributed, low-level timing advantage.

After the timing repair, I also added strictly lagged role and playing-time
signals. Those features use only information available before the game. A
broader retune then reopened every already-authorized blend family and selected
the same final model again, with identical serialized parameters and ratings.

Many causal Daily star peaks rose in that final clean rebuild, but not all of
them. Among the 18 standing sentinel players, 14 peaks increased and 4
decreased. Jordan's causal daily peak rose from 8.06 to 8.39; Bird's from 7.23
to 7.69; Hakeem's from 5.94 to 6.75.
Julius Erving, Dennis Rodman, Giannis Antetokounmpo, and Kareem Abdul-Jabbar
moved slightly down. That mixed direction is important: this was not an era
boost or a rule designed to manufacture higher stars.

The headline comparisons survived. The causal model still prefers LeBron's
best before-game peak to Jordan's, and the Season-Adjusted table has 2009
LeBron ahead of 1993 Jordan by about 0.54 points. The purpose of the repair was
not to choose a winner. It was to make sure both players were judged with the
same information contract.

## Rebuilding everything downstream

Fixing one upstream input is not enough if old outputs remain on the site.

After the repair, I rebuilt the causal daily canonical, the Final Cut historian,
the Season-Adjusted ratings, and all five public WOWY tables from the same clean
foundation. The site currently displays Final Cut on the game-by-game Daily
trajectory; it begins from the repaired causal foundation but intentionally
uses later evidence. The causal before-game series remains stored alongside it
on every published row. The final daily battery is GREEN, with no unresolved
chaining misses. The global model search returned `NO_CHANGE`: once every
eligible model was compared on the clean basis, the promoted configuration
remained the winner.

Then I ran the strongest check in the project: a raw clean-room rebuild from
hash-pinned inputs in a separate, non-Dropbox checkout. One script regenerated
the upstream ratings, the daily composite, the selected blend, the battery,
and the acceptance panel in 21 minutes 25 seconds. The resulting 2.1 GB
canonical file matched production byte for byte. Every one of its 122 columns,
its row order, and its keys were identical; the battery had zero metric
differences and the acceptance panel had zero reconciliation differences.

That clean-room certificate is now a required closeout step after every future
daily promotion.

## Why publish a mistake?

Because this is what model maintenance actually looks like.

Leakage is usually described as a beginner's error with an obvious train/test
split. In a long-running system, it can be quieter: a valid retrospective
model reused on a surface that claims to be contemporaneous, a cached feature
whose timing contract changed, or a full-history fit joined to an earlier
date. The code runs. The metrics improve. The output looks plausible.

The defense is not confidence. It is provenance that can be checked at the
value level, update paths that fail loudly, and a full reconstruction that has
to reproduce the shipped bytes.

The causal ratings are better because the accidental future-informed input is
gone. More importantly, the claim attached to them is now true: a causal
before-game WOWY rating uses before-game information.

The two historian products answer different retrospective questions. Final Cut,
which is currently the visible Daily trajectory, asks how a player's
game-by-game arc looks with later evidence available. Season-Adjusted asks how
well the player performed over the completed season. The causal game-date
series, the retrospective Final Cut trajectory, and the retrospective
Season-Adjusted table are three distinct statistical objects. Keeping those
objects explicit lets DARKO show both what was knowable then and what the full
record suggests now without pretending they are the same statistic.

---

The project retains the timing-study comparison, append-replay receipt,
promotion record, global-retune decision, clean-room certificate, and complete
failed-run history.
