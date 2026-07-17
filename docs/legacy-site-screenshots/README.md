# Legacy DARKO site screenshots

Store screenshots here that document the DARKO site as it appeared before the
SvelteKit rewrite. These files are historical design references and are not
served by the current application.

When possible, use descriptive filenames such as
`leaderboard-desktop-2024.png` or `player-page-mobile-2024.png`.

## Previewing Shiny View

Use `?display=shiny` on any site URL to preview Shiny View before the Svelte app
hydrates, for example `/trajectories?display=shiny`. The query parameter does
not overwrite the saved preference. Selecting Modern or Shiny under **Display**
in the site navigation saves the preference and removes the preview parameter.
The legacy `?view=shiny` form is accepted, but `display` avoids conflicts with
route-specific query state such as WOWY's current-season view.
