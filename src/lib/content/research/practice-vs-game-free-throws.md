LeBron James was on *Mind the Game* this week saying he has never figured out why he can't become an 80% free-throw shooter, and Steve Nash offered him a list of reasons: the sudden stop in the flow of the game, fatigue, the awkward distance, and having an entire arena watching. [Tangotiger picked it up](https://x.com/tangotiger/status/2122890665256165452) and pointed out just how large the gap between practice and games is: the odds of a make in practice are about THREE TIMES the odds in a game. A 90% shooter in practice (9:1) is a 75% shooter in games (3:1).

That number comes out of a [back and forth Tango and I had in 2020](https://x.com/kmedved/status/1231194243030450178) over a photo of a whiteboard, so I wanted to show where it comes from, and then ask which of Nash's explanations actually show up in the data.

## The Lakers Board

<figure class="story-photo">

![Whiteboard listing each Lakers player's practice and game free throws through the 2013 All-Star break](/research-figures/practice-vs-game-free-throws/lakers-practice-board.jpg)

<figcaption>Photo: Beto Duran, ESPN Radio LA (March 2013)</figcaption>
</figure>

In March 2013, Beto Duran of ESPN Radio in Los Angeles posted a photo of a board from the Lakers' practice facility, which tracked every player's practice free throws for the season through the All-Star break, next to what they had shot in games. It's the best public data on this I know of, and it's where the 'Dwight Howard makes 80% in practice' factoid comes from. That one is true: Howard was 1,252 of 1,532 in practice (81.7%), and 213 of 430 in games (49.5%).

<!-- interactive:lakers -->

As a team, the Lakers had made 16,527 of 18,644 practice free throws (88.6%), and 1,018 of 1,468 in games (69.3%). In odds, that's 7.8:1 in practice against 2.3:1 in games. Several of these players had only taken a dozen or so free throws in games, so I prefer to compare each player's practice number against their DARKO projection at the time, which puts the same group at about 72% in games, and practice odds at about 3 times game odds. Steve Nash made 97% in practice.

Note that it isn't the same for everyone. Pau Gasol and Kobe Bryant lost the least (their practice odds were about twice their game odds), and Howard lost the most (4.6 times). But nobody on the roster was as good in games as they were in practice, or particularly close.

(I went looking for other boards like this one and came up empty. If you know of one, I'd love to see it.)

## What Could Explain It?

So what are the candidates? Nash's list, plus the replies to Tango's tweet, boil down to four: fatigue, rhythm (in practice you shoot a bunch in a row), the crowd, and pressure. We don't have more practice data, but we do have every free throw taken in an NBA game from 1996-97 through 2024-25 (about 1.76 million of them), and each of these explanations predicts something we can check within games. E.g., if fatigue matters, players should shoot worse late in quarters, and deep into their minutes.

For all of these I'm comparing each player to themselves in the same season, since who shoots when isn't random (teams foul bad shooters on purpose late, and the best shooter takes the technical).

## Rhythm

Let's start with the one that shows up most clearly. On two-shot fouls, players make 73.5% of the first shot and 78.0% of the second, and comparing each player to themselves the gap is 4.6 percentage points. (Kyler Kelton had this at about 5% in the replies, which is right.)

Three-shot fouls let us go one further, and the third shot is 6.0 points better than the first. Occasionally a player ends up shooting four or more in a row (e.g., a technical on top of a shooting foul), and those look like the third: about 5 points better than the first, with no sign it keeps climbing after that.

<!-- interactive:rhythm -->

LeBron is a good example of this. For his career (through 2024-25) he's a 74% free-throw shooter, but that's 71.1% on the first of two and 77.2% on the second, and 78.5% when it's his third or later in a row. He has shot 80% on his second shots in 6 of his 22 seasons, and on his first shots in none of them.

How long does this last? The play-by-play has the time of day for each event (reliably through 2018-19), so we can look at the first shot of a trip by how long it's been since that player's last free throw. Within a minute or so, they're 4.2 points better than on their first trip of the game, which is nearly the whole second-shot bump. After 5 to 9 minutes it's 2.5 points, after 10 to 19 minutes 1.7, and after 40 minutes or more (roughly, the other side of halftime) 0.6.

<!-- interactive:warmup -->

There's a longer-run version of this too. A player's very first free throw of the game goes in 72% of the time, and the first shot of their later trips is about 2 points better than that. A player who checked into the game within the last two minutes is about 1.7 points worse than they are once they've been on the floor a while. And technical free throws (one shot, cold, usually by the team's best shooter) are no better than that player's ordinary first shots.

Does any of this carry over from one game to the next, e.g., are you better coming off a game where you shot 10 free throws than off one where you shot 2? At first glance, yes: a player's first free throw of the night is about 1 point better for every 10 free throws they took in their previous game. But it's also about 1 point better for every 10 free throws they take in their *next* game, which can't be warming anybody up. Players shoot a bit better during the stretches of a season when they're getting to the line a lot, and once you account for that there's nothing left over for the previous game. Whatever one free throw buys you is gone by the next night.

Two other things about the second-shot bump are worth noting. First, it hasn't moved: it's been between 4.3 and 5.3 points in every one of the 29 seasons, while league free-throw shooting went from 74% to 78%, meaning first shots and second shots improved by the same amount. Second, it's about the same size for bad shooters and good ones (between 3.5 and 5 points at every level from sub-60% shooters to 85% shooters), so it's closer to a fixed number of points than to a fixed multiple of odds.

I don't know how the Lakers shot theirs, but if practice free throws come in sets of 10, then nine of every ten are 'second shots'.

## Everything Else

Here is every other explanation I tested, with how much worse (or better) players shoot in each situation than they otherwise do that season.

| Explanation | Situation | Difference (percentage points) | Free throws |
|---|---|---|---|
| Fatigue | Last 4 minutes of a quarter vs. first 4 | +0.4, +0.8, 0.0, -0.2 (Q1 to Q4) | 760,000 |
| Fatigue | 30+ minutes already played | -0.5 | 350,000 |
| Fatigue | Second night of a back-to-back | +0.3 | 355,000 |
| Fatigue | Overtime vs. fourth quarter | -0.9 | 17,000 |
| Out of breath | Fouled in transition | -0.1 | 116,000 |
| Out of breath | And-one after a dunk | -0.3 | 10,000 |
| Out of breath | Fouled in the bonus (no shot) vs. fouled shooting | 0.0 | 151,000 |
| Crowd | Road vs. home | -0.2 | 832,000 |
| Crowd | Visitors in Denver vs. their other road games | -0.7 | 29,000 |
| Crowd | Visitors in Utah | +0.1 | 30,000 |
| Crowd | 2020 bubble (no fans) vs. a normal late season | +0.8 | 8,000 |
| Low stakes | Preseason vs. the regular season that follows | -1.0 | 16,000 |
| Pressure | Last 5 minutes, within 5 | -1.1 | 123,000 |
| Pressure | Last 30 seconds, within 3 | -2.1 | 27,000 |
| Pressure | Last 10 seconds, within 1 | -3.7 | 3,900 |
| Pressure | Playoffs | -0.8 | 113,000 |
| Pressure | Finals | -1.7 | 6,300 |
| Pressure | Game 7s | +0.2 | 3,300 |
| Score | Trailing vs. leading | -0.1 | 781,000 |
| Time off | Opening night (after a full preseason) | -2.6 | 21,000 |
| Time off | First game back after missing 5+ team games | -3.3 | 12,000 |
| Time off | 5-9 days off without missing a game (mostly the All-Star break) | -0.3 | 30,000 |

Most of these are small. A few notes on the ones that aren't, and on some of the more surprising ones that are.

Pressure is 'real', and it scales the way you'd expect: about a point in ordinary clutch time, two in the last 30 seconds of a one-possession game, and nearly four in the last 10 seconds of a one-point game. It's worse when trailing (about 3 points in the last 30 seconds) than when leading (about 2), and it costs bad shooters more than good ones: sub-75% shooters lose about 3.5 points in the last 30 seconds, and 82%+ shooters about 1. (I'm excluding the free throws a trailing team misses on purpose.) There's no 'rubber band' in any of this, by the way. Outside of the last minute, trailing teams and leading teams shoot the same.

Fatigue mostly isn't there. Tango suggested the easy check, which is to compare the start, middle and end of each quarter, and players shoot the same or slightly better late in quarters. There's about half a point for players past 30 minutes once you account for them being warmed up, nothing on back-to-backs, and nothing for being out of breath: free throws after a fast break, or after a dunk, look like any others.

The crowd is worth about a quarter of a point (home against road), and it's been exactly that in every era. The 2020 bubble, with no fans at all, was about 0.8 points better than a normal late season for the same players, though ordinary seasons bounce around by about that much.

I also checked whether particular buildings are harder to shoot in, and they are, slightly. After padding, the hardest ones cost about a third to half a point, with the Lakers' building and Denver at that end. But whatever it is hits the home team's shooters just as much as visitors, so it looks like the building (the backdrop, the rims, in Denver's case presumably the altitude) and not the fans. Indiana, for what it's worth, is dead average.

Preseason is the one I find most interesting. If the gap were about stakes, then exhibition games in half-empty arenas in early October should be closer to practice. Instead the same players shoot about a point *worse* in preseason than in the regular season that follows.

Related, and stranger, is opening night. In their team's first game of the regular season, players shoot 2.6 points worse than they do the rest of the year, and that's with a full preseason behind them. It's worst on the first free throw of the night (about 4 points), but it lasts all game, and it takes until about the fourth game of the season to go away. Players coming back from an absence of five or more team games are about 3.3 points worse in their first game back, which you could put down to whatever kept them out. I don't have a good explanation for opening night.

## Icing and the Free Chicken

Two specific versions of these stories are worth a look. The first is 'icing' the shooter, where the defense calls timeout before a free throw. On the first shot of a trip, it does next to nothing: players shoot 0.3 points worse after a defensive timeout than without one (29,000 trips), and about the same after their own team's timeout. (Most of these are ordinary timeouts which happen to come after a foul. There are only about 340 defensive timeouts before a late-and-close free throw in the data, which isn't enough to say much, and for what it's worth those shooters did fine.)

A timeout *between* the two shots is different. Those are rare (about 5,000 in 29 seasons, almost all of them called by the defense), and the second shot after one is about 2.4 points worse than a normal second shot, meaning roughly half of the second-shot bump is gone. Even a substitution between shots, which happens on nearly a third of trips, costs about 0.6. That fits with the warm-up curve above, i.e., what the first shot buys you starts fading right away.

The second is the one LeBron brought up in the clip, which is fans winning free chicken when a visiting player misses two in a row late in the game. If the crowd matters anywhere, it should be on a visitor's second shot in the fourth quarter after missing the first. Visitors make 73.4% of those (30,000 shots), and home players in the same spot make 73.6%. Note that second shots after a miss are about 2 points worse than second shots after a make for everybody, home and road, in every quarter, so that part isn't the crowd. What we're looking for is an extra penalty for being the visitor in the fourth quarter, and it comes out to somewhere between zero and half a point. It also hasn't grown as these promotions spread in the 2010s.

## The G League

[PENDING: the G League's single free throw for all the points, as a natural test of rhythm.]

## Adding It Up

How much of the practice gap does all of this explain? The average free throw in my data goes in 75.8% of the time. If practice odds are three times game odds, that's a shooter who makes about 90% in practice, so there are about 15 points to explain. Putting all of the above into one model, the best conditions you can find inside a game (the third shot in a row, at home, warmed up, not late and close) get that shooter to about 79.5%. That's about a quarter of the gap in percentage points, or a fifth of it in odds terms, and nearly all of it is rhythm.

<!-- interactive:summary -->

That leaves most of the gap unexplained by anything we can see inside games. I don't think that means Nash is wrong about the rest of his list. Every free throw in my data, including the garbage-time ones in January, is taken in a game, in front of people, with a stop in play before it, so comparing games to other games can't tell us what the game itself costs. What it can tell us is that the cost doesn't vary much: home or road, fresh or tired, preseason or the Finals, players shoot within a few points of what they usually do, and nothing like what they shoot in an empty gym.

## Is Any of This a Skill?

One last question, which is whether some players are 'chokers' or slow starters in a way you could act on. For the most part, no. Using the [padding approach](/research/stabilization-rates-and-the-padding-approach), a player's first-shot penalty needs about 2,400 two-shot trips before it's half 'real' (LeBron has about 5,900 in this data), and it barely carries over from one season to the next. A late-game penalty needs about 1,100 clutch free throws, which is more than anyone has taken. So when a player shoots 60% in the clutch one year, the best guess for the next year is their usual percentage, minus the point or two everyone loses.

*How the numbers are calculated: free throws from the NBA's play-by-play for 1996-97 through 2024-25, regular season and playoffs, plus preseason games from 2020-21 on. Each comparison is made within a player's season (and within the same shot of the trip, except where the shot number is the thing being compared) and then averaged across players. Time on the floor is reconstructed from substitutions. The Lakers numbers are read off the practice board photographed in March 2013.*
