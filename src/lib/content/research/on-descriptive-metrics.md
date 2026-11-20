> **Work in progress:** This is less a finished paper than a collection of stray thoughts I've been turning over for a while. I'm putting it up here as a living note while I keep thinking through the problem, and I expect parts of it to change.

Every spring, as MVP debates heat up, people ask me the same question: can you make a single-season, "descriptive" version of [DARKO](/)?

I get why people want it. DARKO is explicitly built to be predictive – it estimates a player's current true talent to forecast how he'll play going forward, which means it uses multi-year priors, time decay, aging curves, and all kinds of machinery that feels wrong for an end-of-year award. If someone has a breakout season, you don't want his MVP case dragged down by what he looked like two years ago. You want a stat that just tells you what *actually happened* this season.

I'd genuinely like to give DARKO a single-season metric for MVP purposes. I just haven't been able to come up with a principled way to build one that doesn't rely on a bunch of arbitrary decisions about where to draw the line for what's 'real'.

## The Neat Split

In sports analytics, we usually divide stats into two clean buckets. Descriptive stats are supposed to tell you what actually happened in the past (good for awards, recaps, and historical arguments), while predictive stats try to estimate underlying talent to forecast the future (good for front offices, trades, and betting markets).

In a recent conversation with some friends, one of them put the intuition cleanly: *"Last night Wemby was +5, meaning the Spurs outscored the Clippers by 5 when he was on the court. That is descriptive. It doesn't assign any causal aspect to it – it's just telling you something that did happen."*

That used to be roughly how I drew the line too. Description tells you what happened on the scoreboard; prediction tries to attribute causality.

The trouble starts the second you dig into what "actually happened" means for an award. Okay, Victor Wembanyama was +5 last night. How much credit do we give him for that for MVP purposes?

Maybe his teammates shot 60% from three while he stood in the dunker spot. Maybe the Clippers missed four free throws while he was on the lane line. Maybe he played half his minutes against backups. To figure out how much of that +5 Wembanyama *caused*, you have to pull apart his contribution from his context. Once you start trying to isolate what a player caused from what happened around him, you're modeling a counterfactual (*what would have happened without him?*), and there's no obvious place to stop.

## The Baseball Rabbit Hole

This gets really stark in baseball, where people have spent decades trying to figure out how well a pitcher actually pitched in a given season.

Fifty years ago, we rewarded pitchers for their Win-Loss record. That's as close to "what actually happened" as you can get – did your team win the games you pitched? Eventually people decided wins aren't a great measure, since they depend on a ton of stuff outside the pitcher's control (run support, bullpens, and the quirks of official scoring).

So baseball shifted toward ERA. Critically, it settled on *Earned* Run Average rather than Runs Allowed (RA/9), because we don't want unearned runs held against a pitcher when his shortstop boots a routine grounder. Notice that even a century-old traditional stat is already making a causal call – pretending a run that went on the scoreboard didn't count against you because it wasn't your fault.

Of course, ERA still leaves a pitcher at the mercy of his defense. Excusing official errors doesn't help when you have a slow shortstop with no range who never commits an error because he never gets a glove on the ball, or when opponents string together bloop singles. So the next step is to model how much value the pitcher created versus what his defense created, which gets you to defense-adjusted RA9, FIP, xFIP, SIERA, and eventually pitch-modeling metrics that grade every pitch before a bat even touches it.

Go down that rabbit hole far enough – trying to make your "what actually happened on the field" stat isolate player contribution closely enough – and it just becomes the same thing as all the predictive metrics. And there's no objective line to draw along the way. Fifty years ago, Win-Loss record was enough context. Thirty years ago, we decided ERA was enough context. Today, maybe it's FIP or bWAR. It's a constantly shifting line based on vibes.

## Your Descriptive Stat Is Already Predicting

In basketball this is even messier, since ten players are moving continuously in a coupled system where almost nothing happens in isolation.

If you want a purely un-modeled, single-season account of what happened when a player was on the court, you have raw plus-minus, which everyone agrees is too tangled up with lineups to use for MVP. So the obvious next step is ordinary single-season Adjusted Plus-Minus (APM): just linear regression on one season's stints, controlling for the other nine players on the floor, with no shrinkage and no priors.

Anyone who has run unregularized single-season APM knows what happens. Starters share huge chunks of their minutes together, so multicollinearity blows the estimates apart. Run unregularized centered APM on the 2025-26 regular season (minimum 3,000 total possessions), and Oso Ighodaro (+12.2 per 100) and Hugo González (+11.1) land in the league's top 10, ahead of Nikola Jokić (#19, +9.8) and Victor Wembanyama (#26, +8.9, with a -1.4 on offense), while Draymond Green grades near dead last at -14.5. Nobody is looking at those numbers and calling them an accurate description of the season.

So we move to single-season RAPM, adding ridge regularization (λ) to shrink extreme estimates back toward zero. People routinely treat ordinary, non-time-decayed, single-season RAPM as a descriptive baseline, but it's actually a weird mix of descriptive and predictive. Typically you pick λ by cross-validation (like LOOCV) to figure out which amount of shrinkage best predicts the held-out stints in your sample. That's completely fine, except it's an implicit admission that your descriptive stat is doing out-of-sample prediction.

And that choice moves real rankings around on the exact same games. In 2025-26, setting λ to 2,000 jumps Wembanyama from #26 to #2 (+6.95) and drops Ighodaro to #32, with Kawhi Leonard at #1 (+7.28). Set λ to 5,000 and #1 flips to Shai Gilgeous-Alexander (+4.71, edging Wembanyama by 0.01), while Neemias Queta (#6) and Moussa Diabaté (#9) still sit in the top 10. Whenever I look into non-ML parameter estimation in sports, it tends to sound like this: *"and here we just inject some shrinkage to make it predict better – but not too much"*, often in fairly arbitrary quantities.

It gets weirder once you look at priors. Standard single-season RAPM doesn't actually avoid using a prior; it just uses a zero prior for every player in the league, mathematically assuming that Nikola Jokić and a two-way rookie enter the season with the exact same expectation of being league-average and pulling both of them toward 0. Popular single-season all-in-one metrics improve on this by anchoring RAPM to a box-score prior whose weights are almost always trained on *multi-year* historical data to predict future impact. So by convention, using ten years of league-wide history to decide how much a steal or rebound is worth counts as "single-season descriptive", and using cross-validated ridge shrinkage toward zero counts too, while using a player's own prior-season rating as a starting point is considered crossing the line into prediction.

Shooting luck shows the same split. Suppose a player shoots 45% from three over a season when he's probably a true-talent 38% shooter. Most fans and voters say to give him credit, since the ball actually went through the hoop. Now compare that with opponent free throws in the 2025-26 regular season, when the league shot 78.3% from the line. When Shai Gilgeous-Alexander was on the floor defensively, opponents shot 74.5% (843 of 1,131), saving Oklahoma City 42.4 points relative to league average (-0.9 points per 100 defensive possessions). When Cade Cunningham was on the floor defensively, opponents shot 81.7% (930 of 1,138) on virtually the same volume of free throws, costing Detroit 39.1 extra points (+0.9 per 100). Schedule quality doesn't explain it either – opponents' own season free-throw averages predicted 78.2% against Gilgeous-Alexander and 78.4% against Cunningham.

That's an 81.5-point (1.8 points per 100 possessions) swing between two stars purely from uncontested free throws, and almost every analyst wants to strip that out as noise. Yet *both* the hot three-point shooting and the missed free throws actually happened, both moved the scoreboard, and both sit inside Wemby's +5. We credit one and throw away the other because we have a causal model in our heads of what players actually control – and where the line isn't as obvious as free throws (like opponent three-point percentage, or how well teammates finish off a player's passes), the only way we learn what players actually control is by checking what stabilizes out of sample. In other words, prediction.

<!-- interactive:spectrum -->

## The Clutch and Leverage Trap

Clutch time and leverage run into the exact same wall.

If a descriptive MVP stat is really supposed to measure *what actually happened* – specifically, how much a player actually helped his team win games this season – then a three-pointer down two with ten seconds left isn't remotely equal to a three-pointer up 18 in the second quarter. One shot might swing your team's win probability by 35 or 40 percentage points, while the other barely moves it at all. Baseball even has an explicit family of stats for this, like Win Probability Added (WPA) and context-dependent run expectancy, which track play by play how much a player's actual outcomes swung actual games.

Yet almost every respected "descriptive" single-season value metric – WAR in baseball, or EPM, LEBRON, and RAPM in basketball – throws leverage right out the window. A first-quarter jumper counts the same as a game-winner at the buzzer.

The reason is straightforward: high-leverage moments are tiny samples full of context outside a player's control. Whether you even *play* in clutch situations depends on whether your team is scraping out close games or blowing opponents out by 20 (a star on a dominant team shouldn't be penalized for sitting out fourth quarters). And inside those tight final minutes, 50 possessions over an 82-game season isn't nearly enough data to separate genuine clutch skill from shooting variance and play-calling luck. We know clutch overperformance is mostly noise because it barely repeats out of sample. Once again, the "descriptive" metric overrules what actually decided games in favor of what predicts reliably.

We don't even ignore leverage consistently. Almost every serious NBA metric filters out or heavily downweights garbage time, since a team up 28 with three minutes left isn't playing real basketball. So our standard "descriptive" stats end up sitting on a weirdly specific shelf: down 28 with three minutes left gets zero weight (because that context is too fake), while a tied game with ten seconds left gets the same flat weight as a Tuesday night first quarter (because that context is too noisy). Meanwhile, to the extent some clutch skill *is* real – say, a star shot-creator whose value rises when the whistle tightens and defenses lock in late – flat weighting erases that too, simply because single-season samples can't cleanly separate it from luck.

If you stick to pure realized impact on winning, you end up with WPA and with rewarding lucky sequencing in close games. The moment you go context-neutral to stop rewarding luck, you're back to predictive modeling.

## The Missing North Star

To be clear, there *are* a few obvious, uncontroversial ways evaluating a single season for MVP differs from forecasting tomorrow's game. For MVP, October should count the same as April rather than decaying older games, a 37-year-old shouldn't be penalized for next year's aging curve, and actually playing 2,500 minutes matters rather than just per-possession rate. Those are just rules of the contest, and they're easy to agree on.

What those rules *don't* solve is the credit-assignment problem: how much context to strip out, how much leverage to credit, how much shrinkage to apply, and how to separate a player's impact from single-season variance. In concrete terms, the closest thing to a principled single-season DARKO I've been able to wrap my head around is something like a prior-informed APM (not RAPM). You'd use DARKO to account for the talent of the other nine players on the court, then leave the target player's own realized season unshrunk instead of applying an arbitrary ridge penalty to him. Even that feels uneasy, though: you're still relying on a predictive model to define the context on every possession, and without shrinkage on the player himself, you're back to deciding how much shooting and free-throw luck you're willing to leave in the numbers.

In a weird way, predictive modeling is on firmer philosophical ground than "descriptive" modeling. In DARKO, we have an objective test: future games. Every knob we turn – decay rates, priors, box-score weights, regularization – either reduces out-of-sample error or it doesn't.

A single-season descriptive MVP stat has no equivalent test. There is no ground-truth dataset of *Who Truly Created How Much Value in 2025-26* waiting to score our choices. Without an objective target, every step past raw box scores and raw plus-minus comes down to where you personally feel comfortable drawing the line.

## Meaning Requires a Model

As my friend put it at the end of our exchange, maybe the broader point is philosophical: all description of the past is subjective once you try to interpret it and give it meaning. The moment you move from recording what happened to assigning credit – deciding who was "most valuable" – you're making causal assumptions, and causal assumptions end up leaning on what predicts out of sample.

You can adjust for teammates, adjust for opponents, adjust for shooting luck, shrink your noisy estimates, and call it purely descriptive as long as you stop right before the line that feels uncomfortable. Or you can admit there isn't an objective line at all.

Which is why my MLB MVP vote just goes to whoever leads the league in RBIs.

Those actually happened.

*Notes on the 2025-26 numbers: all 1,230 regular-season games from DARKO's possession database. Opponent free-throw rates count every free-throw attempt taken while a player was on the floor defensively; expected rates weight each opposing team's season free-throw percentage by the attempts it took against that player. The APM and RAPM figures come from standard centered offensive/defensive-split possession regressions with home-court advantage across players with at least 3,000 total possessions.*
