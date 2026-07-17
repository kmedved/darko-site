# Extending Shiny View

Shiny View is a presentation mode over the existing DARKO application. It is
not a second application, a route fork, or a legacy component tree. Every page
keeps one set of data, state, controls, events, and accessible DOM; the active
view changes layout and rendering recipes through shared contracts.

The source-derived visual specification lives in
[`legacy-site-screenshots/DESIGN-LANGUAGE.md`](legacy-site-screenshots/DESIGN-LANGUAGE.md).
This document explains how new SvelteKit features inherit it.

For a feature with no legacy counterpart, start with the **"Extending the
language to new features"** section of DESIGN-LANGUAGE.md — pick the page
archetype and chart family there first, then implement it with the hooks and
presets below. If you had to invent a new recurring pattern, register it here
and document it there in the same PR.

## Architecture

| Layer | Responsibility |
| --- | --- |
| `src/lib/displayMode.js` | Display-view names, normalization, storage key, and Svelte context key |
| `src/app.html` | Stamps `data-view` before hydration; `?display=shiny` is a non-persistent preview |
| `src/routes/+layout.svelte` | Owns the shared view state and the explicit Modern/Shiny toggle |
| `src/lib/utils/shinyDesign.js` | Brand colors plus reusable chart and table presets |
| `src/lib/utils/chartTheme.js` | Maps the active view to comparison-chart geometry and series colors |
| `src/lib/utils/loessConfidenceBand.js` | Gives single-player chart families one shared uncertainty-ribbon geometry |
| `src/lib/utils/metricHeatScales.js` | Builds source-like stepped quantile heat scales from stable datasets |
| `src/shiny-view.css` | Global tokens, semantic surface/layout/table rules, and narrow source-specific corrections |

The root selector is `:root[data-view='shiny']`. Modern View remains the
default and should not need Shiny-specific conditionals for ordinary layout.

## Add a page

Opt the page into the shared contract and describe the role of its existing
elements. Do not duplicate them.

```svelte
<main class="container example-page" data-shiny-page>
    <header class="page-header" data-shiny-surface="hero">…</header>

    <section class="filters" data-shiny-surface="well">…controls…</section>

    <div class="results" data-shiny-surface="panel" data-shiny-table>
        <table>…</table>
    </div>
</main>
```

Available semantic hooks:

- `data-shiny-surface="hero"`: compact analytical page heading;
- `data-shiny-surface="well"`: Bootstrap-like input/sidebar well;
- `data-shiny-surface="panel"`: flat white content region;
- `data-shiny-surface="plot"`: flat chart region;
- `data-shiny-surface="summary"`: compact source-like summary block;
- `data-shiny-layout="sidebar"`: narrow control well beside a wider output;
- `data-shiny-layout="split"`: equal analytical outputs, stacked when narrow;
- `data-shiny-role="editorial-kicker"`: modern editorial overline that is
  omitted in Shiny View while its adjacent analytical heading remains;
- `data-shiny-table`: centered, dense, filter-first analytical table.
- `data-shiny-table-variant="lineups"`: one full-name lineup column followed
  by compact rating columns, matching the archived lineup table while keeping
  player links, sorting, filtering, pagination, and export intact.

Use a page class only for a correction that is genuinely unique to that
feature. A new recurring pattern belongs in the semantic contract instead.
Visual CSS reordering must not make the visible order disagree with keyboard
or screen-reader order.

## Add a chart

Render one SVG and read the display context inside the existing component:

```svelte
<script>
    import { getContext } from 'svelte';
    import { DISPLAY_VIEW_CONTEXT } from '$lib/displayMode.js';
    import { getShinyChartPreset } from '$lib/utils/shinyDesign.js';

    const displayMode = getContext(DISPLAY_VIEW_CONTEXT);
    const shinyComparison = getShinyChartPreset('comparison');
</script>
```

Use `getChartTheme(displayMode.view)` and
`getSeriesColor(index, displayMode.view)` for comparison charts. Use a
source-derived preset for specialized charts:

- `comparison`: multi-player LOESS, DARKO five-series palette, dashed zero;
- `singlePlayer`: NBA-blue points, red confidence ribbon, no smoother line;
- `scatter`: source point geometry and grid/border treatment;
- `probability`: black curve/points over roster-probability zones.

Add a named preset to `shinyDesign.js` when a new chart belongs to a new
recurring family. Keep D3 color values in the shared preset or CSS variables,
not in a component. Preserve mobile margin/tick reductions and modern tooltip,
export, resize, keyboard, and loading behavior.

## Add a heat table

Heat is semantic conditional formatting, not decoration. It uses one shared
yellow-green-to-raspberry ramp, black text, and per-column quantile bins built
from a stable source dataset before filtering/sorting/pagination.

Use a source-derived preset when the table matches an established role:

```js
const heatScales = $derived(buildPresetHeatScales(allRows, 'talent'));
```

Current presets are `talent`, `lineup`, `wowy`, `longevity`, and `daily`.
When a dataset uses different field names, map them to preset roles through the
optional accessor argument. For a genuinely new table family, declare its
metrics explicitly with `buildMetricHeatScales`; unknown declared metrics are
supported without editing a global allowlist.

```js
const heatScales = $derived(buildMetricHeatScales(allRows, {
    expected_value: (row) => row.model.expected_value
}));
```

Apply `getMetricHeatVariables(metricKey, value, heatScales)` to the cell. Never
derive scales from filtered rows or replace the quantile bins with fixed linear
domains.

## Definition of done for a new feature

- One route/component/state tree serves both views.
- The route has `data-shiny-page` and uses semantic hooks for recurring layout.
- New charts consume a shared theme/preset and remain responsive below 500 px.
- Heat tables use stable source-level quantile scales and black text.
- Controls keep logical DOM order, visible focus, labels, and touch-safe sizing.
- Modern behavior, filters, sorting, export, deep links, errors, and loading
  states still work.
- Desktop and mobile are checked in both views; wide-table overflow does not
  break sticky headers.
- `npm run validate` passes. Run `npm run context:sync` after changing these
  contracts or module boundaries.

For local review, use `?display=shiny` without changing saved preference. An
explicit toggle click removes the preview parameter and saves the user's
choice. The old `?view=shiny` form remains compatible, but new links must use
`display` because application routes such as WOWY use `view` for data state.
