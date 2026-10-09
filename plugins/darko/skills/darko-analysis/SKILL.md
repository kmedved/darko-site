---
name: darko-analysis
description: Create, edit and reopen DARKO NBA career-history comparison charts, find published player comps, export wide or square images, and answer questions about public DARKO ratings and rankings.
---

Career charts are the main workflow. Resolve requested player names together
with `search_players`, including retired players. Clarify genuinely ambiguous
names; the first candidate is not automatically the intended player.

Call `create_career_chart` once with all resolved NBA IDs. Present the actual
widget when the client supports MCP Apps, along with its download link. After
the widget renders, use a concise caption and links without a duplicate Markdown
image. Clients without the widget receive the chart image in the tool result;
show it with the download and source links, and do not claim a widget appeared. Never add unrelated photos, web thumbnails
or image cards, or use image search to decorate chart answers. A table or verbal description does not
fulfill a chart request. Defaults are DPM over games played; “at the same age”
selects `scale: age`. Metrics are `dpm`, `o_dpm` and `d_dpm`. Up to six players
can be overlaid together. Use Modern styling by default (`display: modern`) on a white export background.
Modern uses the site’s current palette and LOESS settings. Shiny is available
when explicitly requested; preserve the display preset during edits.
An optional `bandwidth` in (0,1] controls the smoothing span; null keeps the preset.
Higher values smooth more. Preserve this setting in edited and shared charts.

Use the connected DARKO tools for every chart and edit. If the tools are not
available, ask the user to enable the DARKO connector: in ChatGPT, attach DARKO
from the `@` menu; in Claude, turn it on under + → Connectors. Do not recreate
DARKO trajectories from web snippets, seasonal tables, or invented values.

Each point is a played game's pregame rating; missed games, scheduled games and
offseason dates are not plotted. Titles use Latin letters, digits and common
punctuation; emoji and other scripts are refused, so translate or omit them.

The widget supports adding/removing players, changing metrics and axes, range
presets, titles, and wide/square exports without a new chat prompt. Widget edits
update the current specification in the model context; use that state when
continuing the conversation. `format: square` produces a 1200×1200 display
and 2400×2400 download; `wide` is the default 1200×650 / 2400×1300.
To reopen a pasted DARKO chart link, chart image link or player page, call
`import_career_chart` with its URL. This restores the full specification,
including colors and export settings; a player page opens as that player's chart.

For a draft class ("chart the top five picks of 2022"), call `get_draft_class`
with the draft year, then `create_career_chart` with its returned `ids`, usually
by games played. Players appear only after their first published game. For
recent risers and fallers, call `get_rating_movers` with window `7`, `30` or
`season`; always state its dates, because between seasons the windows describe
the last games published, not the past week.

For “compare with similar players,” call `get_comparison_cohort` with the anchor
NBA ID, then `create_career_chart` using its returned IDs and usually `scale: age`.
These are published nearest player-season comps at a matching age. Report that
basis and the comps as-of date; they are not an invented cohort or a forecast.
When comps are unavailable, say so. Do not substitute arbitrary stars.

Every chart includes a compact `comparison`: dated latest available ratings,
raw peaks and last observations in the displayed range. `at` selects an axis
value (for example age 23 or game 200); `selected.observed` is the nearest
observation inside coverage. Report the actual x/date and do not call it an
exact observation at the requested x when those differ. Null means unavailable.
`annotations` can contain up to three of `peak`, `smoothed_peak`, `latest`, `selected`.
`smoothed_peak` separately labels the maximum of the displayed LOESS samples and
requires smoothing; it changes with the selected range and bandwidth.
`annotations: [peak, latest, selected]` optionally labels these raw observations;
defaults are unannotated. `latest` means last in the displayed range, not the
latest globally. `selected` requires `at`. Never describe a raw peak as a LOESS
peak or extrapolate a missing player’s value.

For follow-up edits, resend the returned `specification` with only the requested
changes. Keep IDs and their corresponding colors paired when removing or
reordering players; append a new player without replacing existing colors.
Crop with `min`/`max` in the selected axis's units; “since 2022” uses
`from: 2022-01-01`. Seasons use calendar season-start years, not years since
debut. Do not carry age bounds into a games view unless explicitly requested.
Use the returned `download_url` for the 2x PNG and `source_url` to open the same
settings on darko.app. Full daily arrays belong on the server, not in the chat.

Numerical questions can use `get_player_histories` for dated seasonal or monthly
start/end/peak summaries. These include all published rating states, including
missed-game, scheduled-game and offseason states; charts use played games only.
Explain that basis when comparing a numeric summary with a chart's peak, start
or end. `get_players` batches current/last available ratings
with requested impact, projection, value or longevity groups. `get_rankings`
labels its population; its minutes filter means projected minutes per game.
Historical `season` rankings are opening-roster snapshots, with season ending
years. Interpret only returned data and preserve per-player snapshot dates.

Read [methodology](references/methodology.md) when explaining metrics or model
parameters. This reference is generated from the site's About-page sources.

Histories are retrospective pregame estimates, not an archive of values
published on each date. Past values may change after a refit. The coverage
starts in 1996–97: Kevin Garnett and other earlier debuts have partial careers.
For those players, game 1 means the first played appearance in available
history. DNP, future-game and offseason rows do not advance game counts.
Missing coverage is not zero and must not be invented. LOESS describes the
displayed curve; it is not a future projection. DPM is predictive talent, not
descriptive credit for a completed season.

Use `dataset_as_of` for the incorporated-game date and each player's
`snapshot_date` for their rating state. Neither is a publication timestamp or
model version. Report unavailable metadata plainly when relevant. The server
is read-only; it cannot alter ratings or trigger model/pipeline jobs.
