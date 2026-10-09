# DARKO assistant plugin

The implementation lives in this site: `/mcp`, `/api/charts/career.png`, and
`plugins/darko`. It reads the existing public Supabase helpers and performs no
model, pipeline or database writes. The package's production URL is a release
target; it is usable only after the site change is deployed.

The seven tools are `search_players`, `get_player_histories`,
`create_career_chart`, `import_career_chart`, `get_comparison_cohort`,
`get_players`, and `get_rankings`. Career charts support
up to six players, DPM/offense/defense, games/age/seasons, axis/date ranges,
stable colors, raw points and shared LOESS presets. Each chart returns its
editable specification, coverage, a widget loading a 1200-pixel PNG and a 2400-pixel download
link. Full daily series stay server-side. Both sizes come from the same SVG.

## Run and verify locally

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 4192
```

Example image: `http://127.0.0.1:4192/api/charts/career.png?ids=1628369,202331&scale=age&display=modern`

Add `width=2400&download=1` for the download. The same `ids`, `metric`, `scale`,
`min`/`max`, `from`/`to`, display, colors and display options work on
`/trajectories`. Season bounds are season-start years; numerical summary and
rankings season identifiers are ending years. URL defaults omit DPM/games.

Use MCP Inspector with `http://127.0.0.1:4192/mcp` to initialize, list and call
the tools. The transport is the official SDK v2 Fetch handler with stateless
legacy compatibility. GET/DELETE session operations return 405. Browser-origin
and host validation are enforced. Local hosts are enabled in development; set
`DARKO_MCP_ALLOWED_HOSTS=127.0.0.1,localhost` for a local production preview.
Vercel deployment/branch hostnames are read from its standard environment.

Before the career-renderer client test, run the private image probe:

```bash
node scripts/mcp-image-probe.mjs
```

It serves stdio MCP and returns the site's favicon PNG without a history query.
Use Secure MCP Tunnel with that command to check native image visibility. The
finished endpoint also supplies an MCP Apps image/download resource. It uses
`ui/initialize`, `ui/notifications/tool-result`, `tools/call`,
`ui/update-model-context` and `ui/open-link`; create/import chart tools mount it. Its CSP allows images from the endpoint's origin.

Run `node scripts/check-darko-plugin.mjs http://127.0.0.1:4192` for the six
reference charts, seven tools, follow-ups, PNG sizes and negative cases. It writes
public-data evidence under `.agents/audit-evidence/darko-plugin`.

For boundary careers, the published `rookie_season` can be clipped to 1997.
The server verifies the first NBA date through the existing broader-history
helper when available. This establishes coverage only; every plotted value
remains from the DARKO trajectory reader. Unverified debut coverage is explicit.

## Build the package

```bash
npm run plugin:reference
npm run plugin:package
```

The second command produces `.agents/artifacts/darko-plugin.zip`. Override the
packaged endpoint for a preview with `DARKO_PLUGIN_MCP_URL`; no credentials go
in the archive. This portable MCP package is for desktop clients: ChatGPT's
browser import marks packages declaring their own MCP server as desktop only.
For browser ChatGPT, first register the endpoint as a custom MCP server, then
build a package referencing that app with the same skill:

```bash
DARKO_PLUGIN_APP_ID=asdk_app_YOUR_REGISTERED_ID npm run plugin:package -- .agents/artifacts/darko-chatgpt-plugin.zip
```

Use the actual app ID, removing the `plugin_` prefix from its plugin URL. This
mode includes `.app.json` and omits `mcp.json`; do not set both packaging
variables. It reuses the registered app's existing access and permissions.
See [OpenAI's package metadata](https://developers.openai.com/plugins/build/plugins#add-openai-specific-metadata)
and [registered app mappings](https://learn.chatgpt.com/docs/enterprise/plugin-management#reference-an-existing-app-with-appjson).
The methodology reference is generated from the About-page constants, glossary
and labels. The workflow skill is hand-authored.

Connect the deployed endpoint in ChatGPT Plugins with no authentication, then
test the five positive and three negative prompts in the implementation plan.
For custom-server connections in ChatGPT, attach DARKO from the `@` menu on
each chart edit. In the real-client test, an untagged follow-up used web search
and constructed a seasonal chart instead of invoking DARKO; that output does
not validate the integration.
The same endpoint can be connected to Claude or another MCP client; image and
MCP Apps rendering vary by client. Real-client display verification remains
distinct from passing local transport tests. Directory submission is optional.

## Vercel and operations

The rasterizer is native `@resvg/resvg-js`, left external by Vite SSR. Its
platform-specific optional binary must be installed by the deployment build.
The licensed Archivo TTF is embedded as a Vite asset, then materialized under
the function's temporary directory for resvg's native `fontFiles` API. No
system fonts or browser process are required. Verify both sizes on a Vercel
preview: a macOS build cannot certify the Linux binary/runtime.

History readers retain their 5000-row bound and cache. Truncation fails chart
creation explicitly. The chart cache is bounded to 16 entries/16 MB with a
five-minute TTL; concurrent distinct chart builds are capped at two per warm
process. GET images use short edge caching. This is not a global cache or rate
limiter. Configure the production Vercel firewall's per-IP limits before broad
anonymous distribution; MCP POSTs do not inherit GET edge protection.

Images represent currently served data within the cache TTL, not immutable
publication vintages. Publication timestamp and model vintage remain null
until an authorized public source is available. Histories are retrospective
pregame estimates and begin in 1996–97; earlier debuts are labeled partial.

## Beta release and source scope

The production endpoint is `https://www.darko.app/mcp`; the connection guide is
`https://www.darko.app/assistant`. Use www directly rather than relying on an
apex-domain redirect for MCP POSTs. Connect with no authentication: the tools read
public basketball data. The same endpoint works with other Streamable HTTP clients.

A browser package references a registered app ID through `.app.json`. Register
the production endpoint, then generate that package with `DARKO_PLUGIN_APP_ID`.
Keep personal app IDs and private test chat links out of the source repository.
When moving an existing private package to a production connection, preserve its
plugin identity, skills, assets, prompts and audience, and bump its release version.
Some custom-server registrations expose no editable URL; in that case register
the production connection and update the existing package's required app mapping.

The release includes only the assistant, MCP and chart routes, shared career
utilities, trajectory integration, plugin package and scripts, licensed renderer
assets and their tests. Unrelated homepage, Roster Lab and data-helper edits are
excluded. No model, database or pipeline changes are part of this release.

## Interactive career charts — version 1.1.1

The v3 MCP Apps widget edits up to six players, metrics, axes and range/date
bounds. Presets cover full career, first 200 games, ages 19–25 and the last
three seasons in the dataset. Changing axes clears old axis bounds and the
selected point. Player edits preserve ID/color pairs; ambiguous names require
a candidate choice. Published comps replace the cohort with the anchor and
up to five distinct historical peers in published rank order, and use the age
axis. Missing comps are explicit.

Compact comparison rows distinguish the latest available rating in the full
history from the last and peak raw observations in the displayed range. LOESS
values are not used for these statistics. `at` returns the nearest observation's
actual axis/date, or null outside coverage. Optional `peak`, `latest` and
`selected` annotations mark those raw observations; the default is unannotated.

Wide exports are 1200×650 and 2400×1300; square exports are 1200×1200 and
2400×2400. Modern styling on a white background is the default; Shiny is an
explicit option. The white palette is independent of the display preset.
`format`, `annotations` and `at` are shared URL keys. The trajectories page
preserves export settings; its chart displays the trajectories, while the PNG
and widget render export annotations/aspect ratio. Import accepts DARKO page or
PNG links from www/apex DARKO or the current server origin and restricted paths.
It parses the URL without fetching an arbitrary destination.

Widget edits send the current specification, compact comparison and any
published cohort basis through `ui/update-model-context`. v3 explicitly asks
the model to call `create_career_chart` for conversational edits. Full history
series stay on the server. The chart result contains no base64 image block;
server and skill instructions ask for a caption and links without added imagery.

## Local update — version 1.2.0

This update is implemented locally and has not been deployed. The v4 widget and
trajectories page accept an optional `bandwidth` in (0,1]; omitted values keep
the existing Modern or Shiny preset. `smoothed_peak` is an optional annotation
for the maximum of the displayed LOESS samples, distinct from the raw `peak`.
Up to three annotations can be selected. Selected labels say “Near age 23”
rather than implying an exact age observation.

Trajectories and player pages serve Open Graph and Twitter metadata before
JavaScript runs. `/api/charts/social.png` uses the career renderer and redirects
to the DARKO logo when a chart cannot render. Unsupported website metrics and
cohorts use the logo without changing the website's chart settings.

The assistant guide is in More and linked beside chart downloads. It preserves
current chart settings in a copyable request, shows an actual example and the
data-through date, and includes setup blocks for ChatGPT, Claude.ai, Claude Code,
Codex and Cursor. Packaging also creates `static/darko-analysis-skill.zip`, a
skill-only archive for Claude.ai; it does not include the plugin manifest or MCP
configuration.

MCP clients can discover `compare_career_histories` and
`compare_with_darko_comps` prompts and read `darko://methodology`. The methodology
resource and packaged reference use the same generator. Tool-call logs contain
only `tool`, `duration_ms` and `player_count`; hosting request logs are separate.

Verification: all 486 tests pass. Live localhost checks exercised both PNG sizes,
raw/smoothed/selected statistics, SSR social tags on both pages, render-failure
fallback, prompt/resource discovery and the downloadable skill. A 390px guide
had no horizontal overflow; editing smoothing preserved the value and chart
settings in the assistant handoff. Claude Code made actual search/chart calls
and received a valid 1200×650 PNG. This does not establish v4 widget behavior
in Claude.ai, Cursor or ChatGPT, and is not execution of the directory's eight
natural-language review cases. Existing production host evidence below applies
to the preceding release.

## Pre-release fixes for 1.2.0 (October 8, 2026)

Added before 1.2.0 shipped; the package version stays 1.2.0.

- **Played games only.** Trajectory rows also carry rating states for missed,
  scheduled and offseason dates (`game_num` null). Charts, the PNG renderer and the
  trajectories page plot played games only, on every axis, so a frozen July carrier
  no longer extends age curves or opens a 2026-27 season. `available_to` is now the
  last played game.
- **Smoothing.** `loess.js` picks each point's k nearest neighbours by distance. The
  index-centred window jumped between adjacent days near season gaps (0.12 DPM for
  Paul George at the Modern default; 0.004 after). This also changes the site's own
  trajectory, talent-trend and longevity curves, slightly and only near gaps.
- **Link previews.** `/api/charts/social.png` renders a dedicated 1200 × 630 card with
  an automatic title naming the players, and ignores a link's custom title, square
  format and annotations. Page titles and alt text are automatic too
  (`src/lib/utils/careerChartTitle.js`). Unsupported links use the wide branded
  `static/og-default.png` (regenerate with `node scripts/generate-og-default.mjs`).
- **Titles.** Chart titles must be drawable by the bundled Archivo font
  (`src/lib/server/charts/titleCharacters.js`, checked against the font by a test);
  emoji and other scripts are refused with a clear message.
- **Images.** The renderer prints the site's credit line
  (`@kmedved | www.darko.app | @anpatt7`), labels seasons `2003-04`, and gives the
  sixth player the reference palette's light-surface violet `#4a3aa7` on white images
  (green sat too close to aqua, and the dark-surface violet too close to blue). Chart
  images and social cards cache for a day at the edge; each publish redeploys.
- **Clients.** ChatGPT is recognized by its `openai/*` request metadata (or user
  agent) and gets the widget without an image block; every other client also gets the
  1200-pixel PNG in the result. A headless Claude Code run received and described it.
  Tools carry `openai/toolInvocation/*` status text.
- **Tools.** `get_draft_class` (pick order, first-game and current DPM, from
  `getRookieStarts`) and `get_rating_movers` (the Daily's 7-day, 30-day and season
  windows with their dates). `import_career_chart` also accepts player pages and
  social-card URLs.
- **Usage counts.** Each tool call logs one line and increments a daily row in
  `mcp_usage_daily` through `record_mcp_usage` (service role only): day, tool, client
  family, success, milliseconds, player count. **Apply
  `supabase/migrations/20261008_001_add_mcp_usage_daily.sql` in the SQL editor
  before or with the deploy;** until then the counter fails quietly and only the log
  line remains. Local development never writes counts.
- **Monitoring.** `.github/workflows/production-check.yml` runs
  `scripts/check-darko-plugin.mjs` against production daily, as the `monitor` client.
- **Guide and skill.** The guide no longer claims Claude or Cursor show the widget,
  notes Claude's one-connector free limit and the new usage counts. The skill is
  client-neutral, and a test keeps `static/darko-analysis-skill.zip` identical to it.

Verification: 500 tests, Svelte check, production build, `npm run migrations:replay`,
and the acceptance script against a local server with live data, including link
previews, the draft class, movers and a player-page import.

## Final release corrections

Social-preview eligibility clears the page's custom title before font validation;
the automatic card title remains independent of it, and the original page URL is
preserved. Numeric history results identify their basis as
`all_published_rating_states`: missed-game, scheduled-game and offseason states
are included, whereas chart summaries use played games only. Starts, ends and
peaks may therefore differ. The skill and methodology explain the distinction.
Usage recording passes an abort signal to the Supabase request and cancels it
at the deadline, without failing the tool result.

The five positive directory cases now cover all nine tools. The six-player case
uses the first six picks of the 2022 draft; the numeric case includes the latest
published season's rating movers. Exact host execution is recorded separately
in `docs/assistant-submission.md`.

## Verification and remaining client limitations

All 480 tests pass; Svelte check reports zero errors/warnings and the production
build succeeds. The seven live tools, six reference charts, partial-career
coverage, compact summaries, imports, cohorts, negative requests and both PNG
sizes passed. Additional checks covered 13 backend contract groups and nine
Linux preview groups across 22 requests. Final instruction/resource changes
passed all eight MCP tests. The final packages passed archive integrity and source parity checks. Detailed
private test evidence is kept in the task workspace, outside the release.

A real installed Codex skill handled an untagged initial request and follow-up
using actual DARKO tools. A fresh browser ChatGPT request without the DARKO name
or an @ tag also selected the installed package and displayed the actual chart.
Real ChatGPT widget controls passed defensive metric/age crop, square export,
published Tatum cohort, rejected unrelated URL, saved-link restoration and
source-page opening. The actual Download 2x control saved a 2400×2400 PNG.
An explicitly attached request rendered a fresh 1200×1200 inline widget.


Two ChatGPT behaviors remain unreliable: an untagged conversational edit can
construct valid export links without invoking the chart tool, leaving the
inline widget unchanged; some responses add an unrelated image card or disabled
image placeholder despite the instructions. The v3 context was visibly present
in ChatGPT, so the missed refresh was not missing widget state. Use the widget
controls or explicitly attach DARKO for chart edits, and verify the rendered
widget. The added image card is not DARKO output. These limitations prevent a
claim that automatic edit dispatch or clean response presentation is guaranteed.

The production release check enabled ChatGPT's custom-app CSP enforcement and
verified an actual square chart plus a metric edit through the widget. Resource CSP restricts
images to the server origin. Local responsive checks passed a 390px iframe with
no horizontal overflow and correct intrinsic-height resizing; they do not prove
ChatGPT mobile behavior.

Games incorporated through June 3, 2026 is the served dataset date. A June 5
Wembanyama snapshot is an upcoming-game pregame forecast (`future_game: 1`),
so the dates are consistent. Neither is a publication timestamp/model vintage.
No pipeline refresh was performed. The server reads the existing published data; this release does not refresh it.
