# DARKO public plugin submission

Status: October 9, 2026. The production server and existing private ChatGPT plugin are version 1.2.3. The portable package is finalized and its ZIP inspected; it has not been uploaded, submitted or published in the directory.

## Publisher and public materials

Publisher: DARKO. Support and privacy contact: kostya@darko.app. Availability: worldwide, free, no payments or purchases. Individual charts may be reused for noncommercial purposes with DARKO attribution. Commercial use of charts, data, ratings or other outputs is prohibited without prior permission from DARKO; attribution alone is insufficient. See the published terms for the distinction between chart reuse and bulk data/model redistribution.

- Website and setup: https://www.darko.app/assistant
- MCP endpoint: https://www.darko.app/mcp
- Support: https://www.darko.app/support
- Privacy: https://www.darko.app/assistant-privacy
- Terms: https://www.darko.app/assistant-terms
- Walkthrough: https://www.darko.app/assistant-demo
- Recorded video: https://www.darko.app/assistant-demo-1.2.3.mp4

The privacy notice describes the actual hosting, aggregate usage counters and support-email handling without promising an unimplemented retention deadline. The source package is `plugins/darko`; it contains a portable MCP connection and no personal app bindings. The private installation retains its original identity, USER scope, PRIVATE visibility, presentation and production app binding.

## Released behavior and decisive verification

PRs 3–6 released the assistant tools, sharing, widget metadata, NBA-only scope, policies and original recorded walkthrough. PR 7 fixes an actual data discrepancy: draft `first_game` previously returned the first modeled roster state, which could precede the NBA debut. It now reads the first actually played NBA game; `initial_estimate` retains the earlier state separately. The About page's existing opening-prior reader remains unchanged.

All 15 MCP contract tests pass, including a delayed-debut regression. Through the local server and the production connection, all six debut dates and DPM values for the first six 2022 picks exactly match the chart's game-1 observation. Chet Holmgren's played debut is October 25, 2023 at +0.0689642 DPM, separately from his October 19, 2022 opening estimate of -2.21025. Keegan Murray's played debut is October 22, 2022. Vercel preview and production builds for PR 7 passed. PR 8 published the 74.375-second version 1.2.3 walkthrough: it fully decodes, encoded frames were inspected, browser playback reached 70.5 seconds without errors, and the production recording loaded anonymously. Unrelated leaderboard and Roster Lab edits stayed outside the release.

Earlier verification: isolated release 498 tests, Svelte check with zero errors/warnings, production build and migration replay; the mixed checkout had 501 tests including three unrelated tests. These are earlier full-suite results, not fresh runs after every small delta. Relevant widget/scope tests and preview builds passed after their changes. The numeric review case matched all 94 displayed table cells to live source data. Actual ChatGPT controls, smoothing, colors, ranges and PNG exports were exercised.

The final portable ZIP contains six source-matched files with valid CRC, 64-pixel composer and 1024-pixel listing icons, four verified listing URLs, the verified recording URL, five positive and three negative cases, and no personal app binding. It is a preparation package, not an uploaded or reviewed release.

## Target-host review cases

Exactly five positive and three negative cases are in `plugin.json`. They were exercised through the private production connection; they must be rerun against the exact saved public submission after upload. Private chat URLs and raw evidence remain in ignored local evidence rather than this public document.

| Case | Preparation result |
| --- | --- |
| Positive 1: Tatum/George by age | Passed: displayed chart and download/source links. |
| Positive 2: first six 2022 picks, first 200 games | Chart behavior passed previously; the explanation was made explicit in the prompt. Corrected version 1.2.3 data matches chart game 1; fresh version 1.2.3 host retest passed chart rendering and the corrected debut explanation. |
| Positive 3: reopen/add Kawhi/defense/range/square/annotations | Passed after the supported widget template metadata fix. |
| Positive 4: published Tatum comps | Passed: matched-age/as-of explanation and partial-career caveat. |
| Positive 5: rankings/ratings/season summaries/movers | Passed: all 94 displayed table cells matched source/date/precision expectations. |
| Negative 1: write ratings/refit/publish | Passed: read-only explanation, no claimed update. |
| Negative 2: post to X | Passed: unsupported-action explanation, nothing posted. |
| Negative 3: WNBA histories | Passed after the NBA-only guidance fix, without claiming an NBA lookup. |

## Remaining portal work

The portal blocks creation/upload until the publisher completes developer identity verification. Only the Personal organization was available in the checked session. Individual and business verification choices were visible; neither was started. No identity documents or legal attestations were entered, and no domain challenge token was issued or invented.

After verification, upload the finalized ZIP as a draft in the intended verified organization. Inspect the imported metadata, connect the anonymous read-only MCP endpoint, satisfy the actual domain challenge and scans, and run the cases against that exact saved draft. The authorized publisher completes legal/policy attestations. Submission for review and publication are separate subsequent actions; neither has happened.

## Sources

- [Upload and submit](https://developers.openai.com/plugins/deploy/submission)
- [Submission validation](https://developers.openai.com/plugins/deploy/submission-errors#final-directory-submission)
- [ChatGPT UI metadata](https://developers.openai.com/plugins/build/chatgpt-ui)
- [Plugin reference](https://developers.openai.com/plugins/reference)
- [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines)
