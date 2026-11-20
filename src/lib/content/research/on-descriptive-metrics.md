> **Work in progress:** This is less a finished paper than a collection of stray thoughts and ruminations I have been turning over for a while. I am putting it up here as a living note while I keep thinking through the problem, and I expect parts of it to change.

Every spring, as MVP debates heat up, I get the same question: *Can you make a single-season, "descriptive" version of [DARKO](/)?*

I get why people want it. DARKO is explicitly built to be predictive. It estimates a player's current true talent to forecast how they will perform going forward, which means it uses multi-year priors, time decay, aging curves, and all kinds of machinery that feels wrong for an end-of-year award. If someone has a breakout season, you do not want their MVP case dragged down by what they looked like two years ago. You want a stat that just tells you what *actually happened* this season.

I would genuinely love to give DARKO a single-season metric for MVP debates. The problem is not that I have not gotten around to building it. The problem is that every time I sit down to design one in a principled way, the entire concept of a "descriptive" player-value metric falls apart in my hands.

## The Neat Split

In sports analytics, we usually draw a tidy line between two kinds of stats:

- **Descriptive stats** tell you what actually happened in the past. Good for awards, recaps, and historical arguments.
- **Predictive stats** try to estimate underlying talent to forecast the future. Good for front offices, trades, and betting markets.

In a recent conversation with some friends, one of them put the intuition cleanly: *"Last night Wemby was +5, meaning the Spurs outscored the Clippers by 5 when he was on the court. That is descriptive. It doesn't assign any causal aspect to it – it's just telling you something that did happen."*

That used to be roughly how I drew the line, too. Description is the ledger; prediction is the model.

The trouble starts the second you try to do anything meaningful with the ledger. Okay, Victor Wembanyama was `+5` last night. Now answer the question that actually motivates awards voting: how much credit does he get for that `+5`?

Maybe his teammates shot 60% from three while he stood in the dunker spot. Maybe the Clippers bricked four free throws while he stood on the lane line. Maybe he played half his minutes against backups. To figure out how much of that `+5` Wembanyama *caused*, you have to separate his contribution from his context. And the moment you start separating signal from context, you are not just recording the past anymore – you are modeling a counterfactual (*what would have happened without him?*).

Once you step onto that slope, there is nowhere objective to stop.

## The Baseball Rabbit Hole

You can see this collapse most starkly in baseball, where analysts have spent half a century trying to answer a seemingly simple question: *how well did this pitcher pitch this year?*

Decades ago, we judged pitchers by their Win-Loss record. That is as "what actually happened" as it gets. Did your team win the games you pitched? Eventually, people noticed that pitcher wins depend wildly on run support, bullpens, and the quirks of official scoring rules – things totally outside a pitcher's control.

So baseball shifted toward ERA. Notice something subtle here: we did not settle on *Runs Allowed* (RA/9). We settled on *Earned* Run Average. Even a century-old "traditional" stat already abandoned pure description. ERA makes an explicit causal judgment: *your shortstop booted a routine grounder, so that run was not your fault, and we are pretending it did not happen on your ledger.*

Wait a minute. If we are already excusing official errors because defense is not the pitcher's fault, why stop at errors? What about the slow shortstop with no range who never commits an error because he never gets a glove on the ball? What about bloop singles and unlucky BABIP?

So analysts went further. They modeled out defensive impact and batted-ball luck, arriving at FIP, xFIP, SIERA, and eventually pitch-modeling metrics that evaluate every throw before a bat even touches it.

Look at what happened along the way. Nobody set out to ignore what happened on the field. At every step, people were trying to build a *fairer* measure of what the pitcher actually contributed. Yet go down that rabbit hole far enough, and your "descriptive" metric converges into the exact same thing as your predictive metric.

And there is no mathematically principled place to plant a flag along the road. Fifty years ago, Win-Loss record felt like enough context. Thirty years ago, ERA felt like enough context. Today, maybe it is FIP or RA9-WAR. The boundary between "realized value" and "predictive adjustment" is not a law of statistics. It is a constantly shifting line drawn on vibes.

## Your Descriptive Stat Is Already Predicting

In basketball, this problem is ten times worse. Baseball at least gives you a neat pitcher-versus-batter duel. Basketball is ten players moving continuously in a coupled system where almost nothing happens in isolation.

If you want a purely un-modeled, single-season account of what happened when a player was on the court, you have raw plus-minus – which everyone agrees is too contaminated by lineups to use for MVP.

Okay, so let's adjust for the other nine players on the floor using ordinary single-season Adjusted Plus-Minus (APM): just linear regression on one season's stints, with no shrinkage and no priors. Purely what happened this year, adjusted for teammates and opponents.

Anyone who has ever run unregularized single-season APM knows what happens next. Because starters play huge chunks of their minutes together, multicollinearity blows the estimates apart. Run unregularized centered APM on the 2025-26 regular season (minimum 3,000 total possessions), and Oso Ighodaro (`+12.2` per 100) and Hugo González (`+11.1`) land in the league's top 10, ahead of Nikola Jokić (`#19`, `+9.8`) and Victor Wembanyama (`#26`, `+8.9`, with a negative `-1.4` on offense), while Draymond Green grades near dead last at `-14.5`. You cannot look at those numbers and pretend they accurately describe the season.

So what do we do? We turn to single-season RAPM, adding ridge regularization (λ) to shrink extreme estimates back toward zero. People routinely treat ordinary, non-time-decayed, single-season RAPM as a gold-standard "descriptive" baseline.

Except ask yourself: *how do you pick λ?*

You pick λ by cross-validation (like LOOCV), literally testing which amount of shrinkage best predicts the held-out stints in your sample. Even in a single-season, no-prior, non-time-decayed RAPM, the central modeling choice is an explicit admission that your "descriptive" stat is doing out-of-sample prediction. And the choice moves real rankings around on the exact same basketball games: in 2025-26, dialing λ up to `2,000` rockets Wembanyama from `#26` to `#2` (`+6.95`) and drops Ighodaro to `#32`, with Kawhi Leonard at `#1` (`+7.28`). Dial λ to `5,000` and `#1` flips to Shai Gilgeous-Alexander (`+4.71`, beating Wembanyama by `0.01`), while Neemias Queta (`#6`) and Moussa Diabaté (`#9`) still sit in the top 10. Nothing on the court changed – only the shrinkage knob changed.

And if you *do not* pick λ via cross-validation, you end up in the awkward middle ground that plagues so much non-ML parameter estimation in sports: *"Here we inject some shrinkage to stabilize the numbers and make it look sane. Just... not too much."* In quantities that are, if we are being honest, fairly arbitrary.

It gets weirder once you look at priors. Standard single-season RAPM does not actually avoid using a prior; it just uses a zero prior for every player in the league. Mathematically, it assumes that Nikola Jokić and a two-way rookie enter the season with the exact same expectation of being league-average, and pulls both of them toward `0.0`. Popular single-season all-in-one metrics improve on this by anchoring RAPM to a box-score prior whose weights are almost always trained on *multi-year historical data* to predict future impact.

Pause and notice how arbitrary our cultural line is:

- Using ten years of league-wide history to decide how much a steal or rebound is worth? *Totally fine, still "single-season descriptive."*
- Using cross-validated ridge shrinkage to pull everyone toward zero so held-out possessions predict better? *Totally fine.*
- Using a player's own prior-season rating as a starting point? *Heresy! That's predictive!*

Or consider shooting luck. Suppose a player shoots 45% from three over a season when he is probably a true-talent 38% shooter. Most fans and voters say: *give him credit – the ball went through the hoop!* Now look at opponent free throws in the 2025-26 regular season, when the league shot 78.3% from the line. When Shai Gilgeous-Alexander was on the court defensively, opponents shot 74.5% (`843` of `1,131`), saving Oklahoma City 42 points relative to league average (`-0.9` points per 100 defensive possessions). When Cade Cunningham was on the floor defensively, opponents shot 81.7% (`930` of `1,138`) on virtually the exact same volume of free throws, costing Detroit 39 extra points (`+0.9` per 100). (And it was not schedule quality: opponents' own season free-throw averages predicted 78.2% against Gilgeous-Alexander and 78.4% against Cunningham.)

That is an 81-point, 1.8-point-per-100-possession swing between two stars purely from uncontested free throws. Almost every analyst wants to strip that out as noise. Yet *both* the hot three-point shooting and the missed free throws actually happened. Both moved the real scoreboard, and both sit right inside Wemby's `+5`. Why do we instinctively credit one and throw away the other? Because we have a causal model in our heads of what players actually control – and where the line is not as obvious as free throws (like opponent three-point percentage, or how well teammates finish off a player's passes), the only way we learn what players actually control is by checking what stabilizes out of sample. In other words: prediction.

<!-- interactive:spectrum -->

## The Clutch and Leverage Trap

Nowhere is this tension sharper than in how we treat clutch time and leverage.

If you genuinely believe a descriptive MVP stat should measure *what actually happened* – specifically, how much a player actually moved the needle on winning games this season – then a three-pointer down two with ten seconds left is not remotely equivalent to a three-pointer up 18 in the second quarter. One shot might swing your team's win probability by 35 or 40 percentage points; the other barely moves it at all. In a purely realized sense, one literally decided a win and the other was window dressing.

Baseball even has an explicit family of stats built around this idea: Win Probability Added (WPA) and context-dependent run expectancy. They measure, play by play, how much a player's actual outcomes swung actual games.

Yet notice what modern analytics does when it builds serious "descriptive" single-season value metrics – WAR in baseball, or EPM, LEBRON, and RAPM in basketball: it throws leverage right out the window. A first-quarter jumper counts the exact same as a game-winner at the buzzer.

Why? Because high-leverage moments are tiny samples soaked in context outside a player's control. Whether you even *play* in clutch situations depends on whether your team is scraping out close games or blowing opponents out by 20 (a dominant star who sits out fourth quarters should not be penalized for ending games early). And inside those tight final minutes, 50 possessions over an 82-game season is nowhere near enough data to separate genuine clutch skill from shooting variance and play-calling luck. How do we know clutch overperformance is mostly noise rather than a stable superpower? Because it barely repeats out of sample. Once again, our "descriptive" metric quietly overrules what actually decided games in favor of what predicts reliably.

Even funnier, we do not even ignore leverage consistently. Almost every serious NBA metric filters out or heavily downweights garbage time, because a team up 28 with three minutes left is not playing real basketball. Look at the weirdly specific leverage shelf our "descriptive" stats end up sitting on:

- **Down 28 with three minutes left?** Throw it out – zero weight, that context is too fake.
- **Tied game with ten seconds left?** Same weight as a Tuesday night first quarter – we refuse to credit the extra leverage, because that context is too noisy.

Meanwhile, to the extent that some clutch skill *is* real – say, an elite shot-creator whose value rises when the whistle tightens and defenses lock in late – context-neutral weighting erases that, too, simply because single-season samples cannot cleanly separate it from luck.

If you stick to pure realized impact on winning, you end up with WPA, and with rewarding lucky sequencing in close games. The second you make your metric context-neutral so you stop rewarding luck, you have walked straight back into predictive modeling.

## The Missing North Star

To be clear, there *are* real, legitimate differences between evaluating a single season for MVP and forecasting tomorrow's game:

- **Time weighting:** For MVP, a game in October should count the same as a game in April. A predictive model like DARKO rightly cares more about who you are right now.
- **Aging and trajectory:** Forecasting cares that a 37-year-old will probably decline next season. MVP should not dock you for your birthday.
- **Volume versus rate:** Prediction naturally lives in per-possession talent. MVP cares that you actually suited up and logged 2,500 minutes.

Those differences are easy to agree on. They are rules of the contest, not statistical mysteries.

What those rules *do not* solve is the credit-assignment problem: how much context to strip out, how much leverage to credit, how much shrinkage to apply, and how to separate a player's impact from the noise of a single 82-game sample. Even the cleanest candidate I have kicked around for a single-season DARKO – something like a prior-informed APM (not RAPM), where you account for the quality of the other nine players on the floor without arbitrarily shrinking the target player's own season – still smuggles a predictive model in through the back door to define the context, while leaving you stuck deciding how much single-season variance you are willing to live with.

This is why predictive modeling is actually on firmer philosophical ground than "descriptive" modeling. In DARKO, we have an objective umpire: the future. Every knob we turn – decay rates, priors, box-score weights, regularization – answers to out-of-sample error. If a change predicts future performance better, it stays. If it does not, it goes.

A "single-season descriptive MVP stat" has no umpire. There is no ground-truth dataset of *Who Truly Created How Much Value in 2025-26* waiting to score our model. Without an objective loss function, every step past raw box scores and raw plus-minus is a negotiation between competing philosophies of fairness.

## Meaning Requires a Model

As my friend put it at the end of our exchange, maybe the broader point is philosophical: raw facts about the past do not interpret themselves. The moment you try to interpret what happened – to assign credit, tell a coherent story, or decide who was "most valuable" – you are making causal assumptions. And causal assumptions live or die by whether they actually predict anything.

You can adjust for teammates, adjust for opponents, adjust for shooting luck, shrink your noisy estimates, and pretend you are still purely describing the past, as long as you stop right before the line that feels culturally uncomfortable.

Or you can admit there is no objective line at all.

Which is why my MLB MVP vote just goes to whoever leads the league in RBIs.

Those actually happened.

*Notes on the 2025-26 numbers: all 1,230 regular-season games from DARKO's possession database. Opponent free-throw rates count every free-throw attempt taken while a player was on the floor defensively; expected rates weight each opposing team's season free-throw percentage by the attempts it took against that player. The APM and RAPM figures come from standard centered offensive/defensive-split possession regressions with home-court advantage across players with at least 3,000 total possessions.*
