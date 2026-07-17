# Legacy leaderboard cleanup

## Decision

Delete `src/lib/components/LegacyLeaderboard.svelte`. The component had no source,
dynamic, route, or build imports; the active leaderboard in `src/routes/+page.svelte`
already owns both display modes. The user identified the component as unmounted and
authorized either removal or mounting; mounting it would recreate the duplicate render
path the Shiny View intentionally avoids.

The reusable `filterPlayers` behavior remains live under the neutral
`src/lib/utils/playerTableFilters.js` module. Component-only columns, enrichment logic,
tests, architecture pointers, and sticky-table test entries were removed.

## Isomorphism contract

- Inputs, ordering, tie-breaking, errors, laziness, floating point, and side effects:
  unchanged for the active leaderboard.
- Rendering: unchanged; the deleted component had zero runtime call sites.
- Shared filtering: function body unchanged; only its module path changed.
- Rollback: restore the deleted component and legacy exports from Git history if the
  product later chooses to introduce a genuinely distinct table contract.

## Dead-code safety evidence

| Check | Result |
|---|---|
| Source and route imports | 0 |
| Dynamic or string-based imports | 0 |
| Build and feature-flag references | 0 |
| Component behavior tests | 0; two generic path lists named the file and were redirected to live tables |
| Documentation references | Stale architecture pointers, updated to the active route |
| Git history | No WIP, scaffold, or future-intent signal |
| Companion files | The legacy-named test covered the shared filter helper, which was retained and renamed |
| Owner/user approval | Repository owner identified the component as unmounted and requested delete-or-mount cleanup |

## Metrics

| Metric | Before | After | Delta |
|---|---:|---:|---:|
| Component + helper + helper-test LOC | 687 | 141 | -546 |
| Dead column/sort exports | 9 LOC | 0 | -9 |
| Test pass count | 223 | 211 | -12 dead-only tests; all remaining tests pass |
| Svelte diagnostics | 0 errors / 0 warnings | 0 errors / 0 warnings | unchanged |
| Server `leaderboardColumns` chunk | 6.47 kB | 6.21 kB | -0.26 kB |
| Runtime rendering paths | 1 active + 1 unreachable | 1 active | -1 unreachable path |

Opportunity score: `(5 LOC × 5 confidence) / 1 risk = 25`.

Verification: `npm run context:sync`, `npm run validate`, focused table/Shiny tests,
and `git diff --check` all pass.
