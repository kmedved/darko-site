# Legacy Shiny App — Design Language

This dossier translates the legacy DARKO Shiny app into a design contract for
the SvelteKit site's **Shiny View**. It describes the old app's visual ethos,
information architecture, chart and table recipes, and interaction patterns.
Shiny View should preserve modern behavior, accessibility, responsiveness, and
performance while expressing this language.

Implementation guidance for extending new pages without forks lives in
[`../SHINY-VIEW.md`](../SHINY-VIEW.md).

## Provenance and interpretation

The primary sources are the final archived application files from
[anpatton/darko-app](https://github.com/anpatton/darko-app): `DARKO/app.R`,
`DARKO/utils.R`, and `DARKO/load_data.R`. The supplied `app.R` is byte-for-byte
identical to that archived revision. The PNG files beside this document are
visual evidence from multiple deployed eras of the app.

There is one important source caveat: the final `app.R` begins the UI with a
client-side redirect to `https://www.darko.app`. The complete legacy interface
still exists immediately after that redirect. This dossier treats that inner UI
as the design source and the redirect as deployment history, not as a visual
rule.

Where source and screenshots differ:

1. Use source for exact colors, geometry, data formatting, and interaction
   mechanics.
2. Use screenshots for rendered proportions, whitespace, type scale, and the
   feel of older deployed versions.
3. Prefer the recurring pattern over a one-off artifact.
4. Do not reproduce Shiny runtime failures. The archived
   `shiny-disconnected-from-server-overlay.png` documents history, not a target
   state.

## Design ethos

The legacy app is an analytical workbench, not a marketing dashboard. Its
identity comes from a few repeated choices:

- **Data first.** Tables and plots are the page; decoration does not compete
  with them.
- **Flat and utilitarian.** Default Bootstrap 3 controls, gray wells, white
  plotting panels, thin borders, and very little elevation.
- **Dense but legible.** Wide tables expose many metrics at once. Filters live
  directly under column names and labels state exactly what controls do.
- **Controls next to consequences.** A row click updates the charts beneath the
  table; a sidebar or inline control block sits beside or immediately above its
  plot.
- **Color carries data.** Outside links and a few status labels, saturated color
  belongs to series, highlights, probability bands, and heat cells—not to
  ornamental card chrome.
- **Repeated structures build familiarity.** The same header block, table
  behavior, captions, chart borders, and five-series palette recur across tabs.
- **Charts feel exported from an analysis notebook.** Titles, axis labels,
  legends, reference lines, and citations are explicit and visible.

This means a Shiny-styled page should not look like the modern page with merely
different colors. It should reduce card-like framing, compress ornamental
spacing, use conventional form controls, center analytical tables, and let the
primary visualization or dataset dominate.

## Information architecture

The source used an unthemed `navbarPage("DARKO Exploration")` with these active
tabs:

| Legacy tab | Source layout | Defining behavior |
| --- | --- | --- |
| What is DARKO? | Single main column | H2 explainer, 120×100 logo floated right, Markdown body |
| Current Player Skill Projections | Vertical table/detail flow | Download; selectable talent table; rank subtable; inline metric radios; trend and derivative plots side by side |
| Lineup Projections | Full-width table | Two plain H3 qualifiers above a filterable lineup table |
| Player Profile | Inline control well, then split rows | Player/trend/percentile controls; headshot and summary; paired charts; grouped metric tables |
| Daily Player Per-Game Projections | Full-width table | Download and one dense, heat-formatted table |
| Historical Career Trajectory | Sidebar + main plot | Time scale, metric, and up-to-five-player comparison controls |
| Current Season Snapshot | Sidebar + main plot | Metric and up-to-five-player controls |
| Longevity Projections (BETA) | Two plots over one table | Selected table row drives both charts |
| Scatterplots | Sidebar + square plot | Axis, player, mode, range, minute, and label controls |

A Win and Playoff Projections tab remains in the file but is fully commented
out. It is not part of the active legacy contract.

### Canonical layout primitives

- `verticalLayout`: full-width outputs stacked in reading order.
- `splitLayout`: equal-width analytical outputs placed side by side, with no
  card hierarchy between them.
- `sidebarLayout`: Bootstrap's gray `sidebarPanel` well beside a wider white
  `mainPanel` plot area.
- `inputPanel`: a gray inline well for related profile controls.
- `br()` elements: plain vertical gaps rather than a bespoke spacing system.

The source was desktop-first and included no deliberate mobile composition.
Shiny View should reproduce the hierarchy, not its responsiveness limitations:
split rows may stack on narrow screens and wide tables should scroll rather than
clip.

## Page chrome and typography

- Bootstrap 3 defaults throughout: Helvetica/Arial sans serif, a light gray
  `#f8f8f8` navbar, standard rectangular inputs, subtle gray borders, and gray
  sidebar/input wells.
- Shiny View keeps the current navigation mark as the primary identity and
  pairs the archived DARKO mascot beside it as a smaller secondary mark. The
  archival mark disappears at the drawer breakpoint so navigation stays on one
  line.
- No custom Shiny theme was loaded. Most non-chart typography inherits browser
  and Bootstrap defaults.
- Every analytical tab begins with a compact source/date block:
  - version in H4, `#1F2024`;
  - `$ Support DARKO $` in H4, `#0CCE6B`;
  - `DARKO by: @kmedved` and `Application by @anpatt7` in H5, `#1F2024`.
- Longevity and Scatterplots render the version line in beta red `#991D37`.
- Links are text links, not icon buttons or branded chips.
- Loading charts show a `#44A8F3` spinner.
- Plot captions use `@kmedved | www.darko.app | @anpatt7` in small type.
- Plot titles and subtitles are plain, direct descriptions. Comparison titles
  are centered; single-player titles remain left aligned under the chart theme.
- The old site did not use persistent footers. Credits were page-header text or
  plot captions.

## Brand palette

The old app did **not** use RColorBrewer Set1 for multi-player charts. It used a
five-color DARKO palette consistently across trajectories and snapshots:

| Hex | Role |
| --- | --- |
| `#385BBB` | Series 1, royal blue |
| `#EF2D56` | Series 2, crimson; scatter highlight; `<25% on Roster` band |
| `#0CCE6B` | Series 3, emerald; `>75% on Roster` band; support link |
| `#ED7D3A` | Series 4, orange; derivative/change line |
| `#DCED31` | Series 5, chartreuse; `75%–25% on Roster` band |

Comparisons were capped at five players, so there is no sixth series color.

Supporting colors:

| Hex | Role |
| --- | --- |
| `#006BB6` | Single-player trend points (NBA blue) |
| `#ED174C` | Single-player LOESS uncertainty ribbon; no smoother line |
| `#636166` | Season-start and single-player zero reference lines |
| `#363537` | Scatter regression line; heavy `gt` row borders |
| `#0C39CE` | Scatter base point color |
| `#44A8F3` | Loading spinner |
| `#1F2024` | Header and credit text |
| `#991D37` | Beta version text |

RColorBrewer **Set1** appears only in the profile percentile bars and positional
density plot. It is not the DARKO comparison palette.

## Chart foundation

Active analytical charts use `theme_bw` as their base: white panels, thin gray
panel borders, black axis text, and an unmistakable ggplot feel. The player
headshot tile is the exception and uses `theme_void`.

- Most trend, comparison, density, and scatter charts remove all panel grids.
- Longevity probability and current-season snapshot charts keep major grids and
  remove minor grids.
- Comparison charts use a large base size of 24; single-player and supporting
  plots use 18.
- Legends sit above comparison/scatter charts and below longevity charts.
- Percentage metrics use percentage axes. DPM-family metrics receive a zero
  reference line; unrelated metrics do not.
- Season boundaries use thin `#636166` vertical lines and 45° season labels.
- Plot dimensions in source are intentional composition clues, not rigid modern
  CSS sizes.

ggplot-to-pixel conversions below assume the app's 72 dpi renders: `lwd 1` is
about 2.1 px and point size `n` is about `2.1 × n` px in diameter.

### Multi-player trajectory comparison — 900×620

- Points: size 3 (about 6 px), alpha 0.25, shape 16, DARKO palette by player.
- Smoother: LOESS, span 0.5, `lwd 2` (about 4 px), no confidence band.
- DPM zero line: black, dashed (`linetype 2`), `lwd 1` (about 2 px).
- Legend: top, 14 pt labels, line/point key enlarged to size 4.
- Title and subtitle: centered. Caption: 12 pt.
- X axis may be career games, player age, or season-start index. Season mode
  adds `#636166` verticals (`lwd 0.25`) and 45° labels.
- Empty selection shows the direct validation message `Please Select at Least
  One Player.`

### Single-player trend — 600×300 in the leaderboard detail

This is deliberately different from a multi-player comparison:

- Points: `#006BB6`, size 2, alpha 0.65.
- Smoother: `color = NA`, `fill = #ED174C`; only the red uncertainty ribbon is
  visible. Do not add a red center line.
- DPM-family zero line: solid `#636166`, `lwd 0.5`.
- Season lines: solid `#636166`, `lwd 0.25`; labels rotated 45°.
- Base size 18; legend bottom; caption 10 pt; no panel grid.
- X label: `Season Start Points`. Title: player name. Subtitle:
  `Career DARKO {metric} Progression`.

The Player Profile trend uses the same recipe and adds zero lines for DPM and
Box DPM families. The source does not set a LOESS span here, so ggplot2's default
applies; do not assume the comparison chart's 0.5 span.

### Talent derivative/change — 600×300

- A LOESS model is sampled every 0.1 career game and numerically differentiated.
- Change line: `#ED7D3A`, `lwd 2`.
- Zero line: solid `#636166`, `lwd 1`.
- Season lines and labels match the single-player trend.
- Subtitle: `Career DARKO {metric} Change`; y axis:
  `DARKO {metric} Slope`.

### Player percentile bars

- Up to five user-selected metrics, in selection order.
- Percentiles are calculated only against players at the selected player's
  position.
- Vertical `geom_col` bars use Set1 fills and dark-gray outlines.
- Y axis runs 0–100% in 10-point increments; fill legend is hidden.
- Subtitle states `{position} Only ({date})`.

### Positional distribution

- One density per position, ordered PG, SG, SF, PF, C.
- Set1 fill and stroke, alpha 0.25, `lwd 1.5`.
- Selected player's value is a black vertical line, `lwd 2`.
- Y labels and ticks are removed; percentage metrics format the x axis as
  percentages.

### Player headshot and summary

- NBA CDN headshot at its native 260×190 composition inside a borderless,
  square `theme_void` plot.
- Player name: centered, 28 pt, bold. Team: centered, 18 pt, pulled upward with
  a negative bottom margin.
- Adjacent centered `gt` tables show Overview, Box DPM, demographics, Plus-
  Minus, Efficiency Talent, Play Style Talent, Box Score Talent, and Per-100
  Talent. The profile reads as a compact analytical report, not a collection of
  independent cards.

### Longevity probability — 650×300

- Vertical probability zones, alpha 0.35:
  - `>75% on Roster`: `#0CCE6B`;
  - `75%–25% on Roster`: `#DCED31`;
  - `<25% on Roster`: `#EF2D56`.
- Boundaries are determined by the player's actual crossings of 0.75 and 0.25;
  they are not fixed thirds.
- Probability curve: black, `lwd 2`; points: black, size 4.
- X axis: `+1` through `+12`; y axis: percent.
- Legend sits below the chart and names the zones. Major grids remain visible.

### Career-length projection — 650×300

- Uses the single-player recipe: `#006BB6` points, alpha 0.65, plus the
  `#ED174C` ribbon-only LOESS treatment.
- Thin season verticals and 45° season labels.
- Y axis: `Projected Age at Retirement`; subtitle:
  `Career Length Projections`.

### Current-season snapshot — 800×400

- DARKO palette by player; path `lwd 1.5`.
- Points: size 3, stroke 2. Shape 16 means played; shape 4 (X) means DNP.
- X axis is reversed and labeled `# Games Ago`, with a heavy vertical at 1.
- Major gridlines remain. Title and subtitle are centered.

### Scatterplot — 800×800

- Base points: `#0C39CE`; selected player: `#EF2D56`; size 3, alpha 0.65.
- Trendline mode: linear model, `#363537`, `lwd 1.5`.
- Quadrant mode: dashed black horizontal and vertical lines at the filtered
  sample means, `lwd 2`.
- Optional player labels use repelled white labels.
- No panel grids and no color legend. Subtitle reports DPM range, minutes
  range, and highlighted player.

## Tables

Legacy tables are DT/DataTables or compact `gt` summaries—not card lists.

- Per-column filters sit directly below headers (`filter = "top"`).
- Every column is center aligned, including player, team, and lineup names.
- Headers retain DataTables sort indicators.
- Most primary tables preselect the first row and allow one selected row.
- Numeric values use one decimal unless otherwise specified; percentages use
  one decimal.
- Captions on daily and longevity tables are centered, black, top-aligned, and
  200% font size.
- Page lengths: current talent 10; lineups 20; longevity 20; daily projections
  30.
- A modern player headshot may sit inline with a player name when it stays
  decorative and no larger than 20px. It must not increase the source-like row
  height, widen the player column, or replace the text link.
- Lineups keep the five players together in one centered, wrapping `Lineup`
  column; they do not spend five columns on player portraits. Team and lineup
  names remain fully readable so the rating columns stay in the first desktop
  viewport.
- A row click is functional, not decorative: current talent drives rank/trend/
  derivative detail, while longevity drives both charts.

### Table-specific formatting

| Table | Heat-formatted columns | Other defining behavior |
| --- | --- | --- |
| Current talent | DPM, DPM Improvement, Box DPM | First row selected; player rank subtable; 5% quantile bins |
| Lineups | Net, Offense, Defense | Two plain-language qualifiers above table; 5% quantile bins |
| Daily per-game | Minutes, Pace, PTS, AST, DREB, OREB, BLK, STL, TOV, FGA, FTA, FG3A, RimFGA, PF | Download; 10% quantile bins |
| Longevity | `+1` through `+12` | Selected player drives charts; percentages; 10% quantile bins |

The current-player rank subtable ranks every numeric field descending and uses
a centered striped Kable captioned `{Player} Talent Ranks`.

### Heat scale — one ramp, per-metric quantile bins

All conditional formatting uses the same reversed
`colorspace::heat_hcl(n)` ramp: pale yellow-green at the low end, through amber
and orange, to raspberry at the high end.

- Approximate low/high endpoints: `#E2E6BD` → `#D33F6A`.
- Representative 12-stop ramp:
  `#E2E6BD #E7E180 #EAD357 #EBC438 #EBB428 #EAA428 #E89331 #E6833D #E27449 #DE6355 #D95260 #D33F6A`.
- Current-talent and lineup columns use per-column breakpoints at the 5th–95th
  percentiles in 5-point steps: 19 thresholds, 20 discrete bins.
- Daily and longevity columns use the 5th–95th percentiles in 10-point steps:
  10 thresholds, 11 discrete bins.
- Values below the first threshold get the palest color; values above the last
  get the deepest raspberry.
- Text is always black, even on deep raspberry cells.

Different columns therefore appear to favor different parts of the ramp because
each is binned against its own distribution. There are no metric-specific heat
families and no contrast-switched white text.

## Interaction language

- Controls use explicit noun labels: `Talent Type`, `Time Scale`, `Player`,
  `Add Player Labels`, `Filter by DPM`.
- Radio buttons are ordinary radios and may render inline for short metric
  choices. They are not segmented pill navigation.
- Selectize inputs support long searchable player lists. Comparison and
  percentile selections are capped at five.
- Download actions use the standard `Download Data` button.
- Range filtering is immediate and uses conventional dual-handle sliders.
- Validation is direct and local: `Please Select a Player`, `Please Select at
  Least One Player.`, or `Please Select a Player & Trend` appears where output
  would render.
- Selected rows should remain visibly selected, but selection must not erase
  heat colors or disable text contrast.

For the modern implementation, retain a single DOM and state model across
Modern and Shiny views. CSS re-layout must preserve logical DOM, focus, and
screen-reader order. Shiny View changes presentation, never data semantics or
available functionality.

## Translation contract for Shiny View

### Reproduce

- White analysis canvas, light-gray Bootstrap-like controls and borders.
- Flat wells and split layouts instead of stacked elevated cards.
- Dense, center-aligned, filter-first tables with horizontal overflow.
- Source-derived plot palettes, point opacity, line weights, grids, captions,
  and reference lines.
- One quantile-binned heat ramp with black text.
- Controls immediately before or beside their output.
- The five-player ceiling and stable player-to-color assignment.
- Plain language, visible axis labels, and restrained typography.
- Direct analytical headings without modern editorial overlines; mark reusable
  overlines with `data-shiny-role="editorial-kicker"` so Shiny View omits them
  without forking content or structure.

### Preserve from the modern app

- Current data, routes, filtering, sorting, exports, deep links, and navigation.
- Responsive stacking and touch-safe controls.
- Keyboard order, visible focus, accessible names, and reduced-motion support.
- Fast client-side transitions, durable loading/error states, and no server-
  disconnect failure mode.

### Avoid

- Generic dashboard cards, rounded KPI tiles, decorative gradients, glass
  effects, large shadows, icon-only controls, and oversized whitespace.
- Blue as a universal UI accent when the source used it only for data or
  loading state.
- Replacing tables with mobile-style ranked lists on desktop.
- Invented per-metric color scales, continuous heat interpolation, white heat-
  cell text, or a Set1 comparison palette.
- Duplicating routes or components just for Shiny View.
- Reintroducing the old persistent credit footer or the disconnected-server
  overlay.

## Extending the language to new features

The legacy app defines a finite set of recipes; new features often will not
have a legacy counterpart (standings, WOWY, compare, rate, and the leaderboard
distribution panel already don't). Generalize by **archetype**, not by page:
identify the pattern a new feature belongs to, apply that pattern's rules, and
only invent something new when no pattern fits — then name it and register it.

### Page archetypes

Every page — existing or future — should be one of these. The semantic hooks
that implement them are documented in [`../SHINY-VIEW.md`](../SHINY-VIEW.md).

| Archetype | Legacy exemplars | Reading order | Modern examples |
| --- | --- | --- | --- |
| **Table-first** | Current Talent, Daily, Lineups | Compact hero → optional summary strip → filter-first dense table dominating the first screenful | Leaderboard, standings, lineups, WOWY |
| **Workbench** | Trajectory, Snapshot, Scatterplots | Control well beside one dominant plot; controls listed in the order they affect the output | Trajectories, scatterplot, compare |
| **Drill-down** | Talent table detail, Longevity | Primary table where row/entity selection drives detail charts beneath or beside it | Longevity |
| **Analytical report** | Player Profile | Entity header (identity, key facts) followed by grouped charts and compact metric tables that read as one document | Player profile, team profile |
| **Explainer** | What is DARKO? | A single readable prose column; no analytical chrome | About |

A new feature takes the archetype whose reading order matches its task. If two
could apply, prefer the one that puts data on screen sooner.

### Chart family chooser

Map any new visualization to the closest family before designing anything
bespoke. Families are implemented as presets in `src/lib/utils/shinyDesign.js`.

| If the chart shows… | Family | Defining recipe |
| --- | --- | --- |
| Several entities compared over a continuous axis | comparison | DARKO five-color palette, translucent points under LOESS smoothers, dashed black zero |
| One entity's metric over time | single-player | `#006BB6` points, `#ED174C` uncertainty ribbon, no smoother line |
| Likelihood/status over a horizon | probability | Black curve and points over `#0CCE6B`/`#DCED31`/`#EF2D56` zones |
| Two metrics across a population | scatter | `#0C39CE` base points, `#EF2D56` highlight, `#363537` trendline or dashed quadrants |
| Distribution of one metric | distribution | Single-series curve or Set1 positional densities; reference line for the anchor value; suppressed y labels |
| Rate of change | derivative | `#ED7D3A` line over a `#636166` zero |

If none fits, compose from the foundation instead of inventing freely:
`theme_bw` chrome (white panel, thin gray border, dark axis text), color from
the allocation rules below, explicit title/axis labels, the standard caption,
and geometry borrowed from the nearest family. If the result will recur,
register it as a named preset and add it to the table above in the same PR.

### Color allocation rules

Color carries data. When a new feature needs color, allocate in this order and
never introduce a new saturated hue for chrome:

1. **Multi-entity series** → the five DARKO colors in stable selection order.
   The legacy cap is five; past five, fall back to the golden-angle generator
   only where product requirements genuinely demand more.
2. **Categorical groups** (positions, roles) → Set1, in legacy order.
3. **Single-entity emphasis** → `#006BB6`; **uncertainty** → `#ED174C` ribbon.
4. **Probability/status zones** → `#0CCE6B` / `#DCED31` / `#EF2D56` at 0.35.
5. **Magnitude in tables** → the shared heat ramp, quantile-binned, black text.
6. **References and annotations** → `#636166` subtle, `#363537` emphatic,
   black for zero/median dashes.
7. **Highlight against a population** → `#EF2D56` over a `#0C39CE` base.

### Table rules for new datasets

- Heat-format only the columns that are the table's analytical payload, not
  every numeric column. The legacy talent table heats 3 of ~30 columns; the
  daily table heats nearly all, because projections *are* its payload.
- Bins always come from the full unfiltered dataset via the shared quantile
  mechanism (see `buildMetricHeatScales` in
  [`../SHINY-VIEW.md`](../SHINY-VIEW.md)): 5% steps for talent-like tables,
  10% for projection-like tables. Never fixed linear domains.
- Center every column, keep filters under headers, keep sort indicators, and
  follow the page-length conventions of the nearest legacy table.

### Worked examples

Decisions already made under these rules, kept here as precedent:

- **Scatterplot position coloring** — a modern feature with no legacy analog.
  Functionality preserved; expressed with Set1 categorical fills (rule 2) over
  the legacy scatter geometry.
- **Leaderboard distribution panel** — no legacy analog. Derived from the
  foundation: `theme_bw` chrome, single blue series, black dashed median
  (rule 6), standard caption.
- **Standings / lineups / WOWY** — table-first archetype; heat ramp applied to
  payload columns with dataset-level quantile bins.

## Maintaining this contract

This document is the design authority; `docs/SHINY-VIEW.md` is the
implementation contract; `src/lib/utils/shinyDesign.js` is the code of record
for constants. Keep the three consistent:

1. A feature that only reuses existing archetypes and presets requires no doc
   change.
2. A feature that creates a **new recurring pattern** (used, or clearly about
   to be used, on two or more pages) must register the preset or semantic hook
   and document it here — archetype table, chart family table, or table rules —
   in the same PR. `tests/shiny-view.test.js` should assert any newly
   documented constants.
3. A genuinely one-off correction stays in page-scoped CSS and is deliberately
   *not* documented here.
4. Precedence when sources conflict: legacy source values (this document) →
   archived screenshots → taste. The "Preserve from the modern app" list is
   never weakened by a Shiny View change.
5. Run `npm run context:sync` after changing these contracts (repo policy).

## Quick visual QA checklist

- [ ] Page reads as an analytical tool before it reads as a branded dashboard.
- [ ] Primary table or chart dominates the first screenful.
- [ ] Controls are conventional, compact, and adjacent to their output.
- [ ] Tables center every column and expose filters under headers.
- [ ] Heat cells use quantile bins from the shared yellow-green→raspberry ramp
      with black text.
- [ ] Comparison series use the five DARKO colors in stable selection order.
- [ ] Single-player trends show blue points and a red ribbon without a red line.
- [ ] DPM zero lines, season markers, grids, legends, and captions match the
      chart-specific rules above.
- [ ] Shiny View remains responsive and passes a keyboard-only traversal.
- [ ] No runtime artifacts, footer duplication, or Modern/Shiny state fork was
      introduced.
- [ ] New pages declare a page archetype and consume shared presets/semantic
      hooks; any new recurring pattern was registered and documented, not left
      as bespoke CSS.
