---
name: darko-analysis
description: Create, edit and reopen DARKO NBA career-history comparison charts, find published player comps, export wide or square images, and answer questions about public DARKO ratings and rankings.
---

Career charts are the main workflow. Resolve requested player names together
with `search_players`, including retired players. Clarify genuinely ambiguous
names; the first candidate is not automatically the intended player.

Call `create_career_chart` once with all resolved NBA IDs. Present the actual
widget and its download link. After the widget renders, use a concise caption
and links. Do not add Markdown images, photos, web thumbnails or image cards,
and do not use image search to decorate chart answers. The widget is the only
chart visual. Clients without widget support
can open the returned PNG link. A table or verbal description does not
fulfill a chart request. Defaults are DPM over games played; “at the same age”
selects `scale: age`. Metrics are `dpm`, `o_dpm` and `d_dpm`. Up to six players
can be overlaid together. Use Modern styling by default (`display: modern`) on a white export background.
Modern uses the site’s current palette and LOESS settings. Shiny is available
when explicitly requested; preserve the display preset during edits.

Use the connected DARKO tools for every chart and edit. If the tools are not
available, ask the user to attach DARKO from ChatGPT’s `@` menu. Do not recreate
DARKO trajectories from web snippets, seasonal tables, or invented values.

The widget supports adding/removing players, changing metrics and axes, range
presets, titles, and wide/square exports without a new chat prompt. Widget edits
update the current specification in the model context; use that state when
continuing the conversation. `format: square` produces a 1200×1200 display
and 2400×2400 download; `wide` is the default 1200×650 / 2400×1300.
To reopen a pasted DARKO chart link, call `import_career_chart` with its URL.
This restores the full specification, including colors and export settings.

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
start/end/peak summaries. `get_players` batches current/last available ratings
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
