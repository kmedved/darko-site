# DARKO public plugin submission

Status: preparation draft, October 8, 2026. Not uploaded, submitted or published.

The production endpoint is `https://www.darko.app/mcp`. The public-upload source
is `plugins/darko`; it declares that endpoint in `mcp.json` and contains no
personal app bindings. The existing private ChatGPT plugin remains unchanged.

## Prepared

- Package version 1.2.0, listing text focused on multiplayer career charts and
  two standalone starter prompts.
- Existing 1024 × 1024 DARKO logo for the directory, with the existing 64 × 64
  composer icon retained.
- Exactly five positive and three negative review cases in
  `extensions.com.openai.review.test_cases`, covering all nine tools.
- Release notes in `extensions.com.openai.publication.release_notes`.
- Shared chart previews, assistant handoff and a richer setup page.
- Optional shared smoothing spans and separately named smoothed peaks; raw values remain unchanged.
- Two MCP prompts and a generated methodology resource for clients without the skill.
- Coarse daily tool usage counts (tool, client family, outcome, duration and player count) with policy disclosure pending confirmation.
- A local `/support` page using the existing GitHub issue channel.
- Explicit `_meta.ui.domain` in the chart resource and its contract test.
- Privacy and terms drafts in `docs/assistant-policy-drafts.md`.

These source changes are local. The deployed site and installed personal package
still use the preceding release. Do not upload the incomplete draft ZIP as if it
were submission-ready.

## Local update verification

The 1.2.0 draft ZIP matches the current six source payload files and contains no
private app binding. Its standalone Claude skill ZIP contains only the skill
and methodology. All 486 tests pass; Svelte check has zero errors/warnings and
the production build succeeds. Live localhost checks verified both PNG sizes,
SSR social previews and fallback, prompt/resource discovery and skill download.
The assistant guide passed a 390px overflow check and a chart-settings handoff.
An actual ephemeral Claude Code session resolved players and created a chart,
then its PNG returned HTTP 200 at 1200×650. This does not verify graphical v4
widgets or replace the exact directory review cases below.

Draft artifact: `darko-submission-draft-1.2.0.zip` in the task's visualization
folder. Private technical evidence: `.agents/audit-evidence/darko-sharing-1.2.0`.

## Required decisions and materials

1. Publisher name is DARKO; private support/privacy contact is kostya@darko.app.
   This is the publisher's instruction, not evidence of completed portal identity verification.
2. Availability is worldwide, free, with no payments or purchases. The manifest
   records `publication.countries: []` and `review.commerce: false`.
   Individual charts may be reused with DARKO attribution.
3. Confirm a private support/privacy contact, actual hosting/log retention,
   external logging/analytics integrations and the policy/terms text. Publish
   the approved privacy and terms pages, and the support page, before putting
   their URLs in the manifest. The intended support path is
   `https://www.darko.app/support`; it is not yet a verified public listing URL.
4. Record and host a readable walkthrough of the final package. Only put the
   verified recording URL in `review.demo_recording_url`. A script or screenshot
   is not a completed recording.
5. Run the exact review cases in the target host against the final saved draft.
   Existing unit tests and older acceptance runs do not replace these checks.
6. Complete identity/domain verification, required scans and policy
   attestations in the submission portal. Submission and publication require
   separate actions; the authorized publisher completes the attestations.

## Review case execution

Select DARKO before each case and use a fresh conversation unless its description
specifies setup. Case prompts, tool expectations and observable results are in
the manifest; the table below records execution separately.

| Case | Purpose | Status |
| --- | --- | --- |
| Positive 1 | Tatum/George by age with source and download | Not run |
| Positive 2 | First six 2022 draft picks, first 200 available games | Not run |
| Positive 3 | Reopen, add Kawhi, defense, ages 19–25, square, annotations | Not run |
| Positive 4 | Published Tatum comps and age-aligned chart | Not run |
| Positive 5 | Filtered rankings, batch ratings, all-state summaries and season movers | Not run |
| Negative 1 | Change a rating and republish the model | Not run |
| Negative 2 | Post a chart to X using only DARKO | Not run |
| Negative 3 | Request WNBA histories from the NBA integration | Not run |

The positive 4 prerequisite was checked directly on production on October 8:
Tatum has five distinct published comps, with comps as-of May 2, 2026. This
checks availability only; the full natural-language case remains not run.

Other useful recovery checks are already represented in existing tests: ambiguous
names, unavailable ranges and partial careers. Garnett is the partial-career
example: his NBA debut predates the available 1996–97 history. These are
supported workflows with limits, not unsupported-intent negative cases.

## Demo walkthrough

Record a clean chat with the unrelated history sidebar hidden. Use public NBA
examples and keep credentials, account menus and private conversations off screen.

| Approximate time | Real interaction to show |
| --- | --- |
| 0:00–0:20 | Installed DARKO package and production connection; select DARKO |
| 0:20–1:05 | Positive 1: two-player age chart, widget and returned links |
| 1:05–2:00 | Positive 3: reopen, add Kawhi, defense, range, square and annotations; open the downloaded PNG |
| 2:00–2:40 | Positive 2: six-player first-200-games chart and available coverage |
| 2:40–3:20 | Positive 4: published comps and matching-age/as-of explanation |
| 3:20–4:10 | Positive 5: current filtered rankings and dated numeric summaries |
| 4:10–4:50 | Three negative prompts with correct capability explanations |
| 4:50–5:00 | Support link and retrospective pregame/history limitations |

Rehearse first, then capture the actual final-version interactions. Play the video
back and check readability, expected outputs and absence of private content.
Host it at a reviewer-accessible URL and verify playback without a login.

An initial browser recording attempt stopped when the browser's admin-policy
security check became unavailable, before the first prompt was sent. It is not a
completed demo or passed case. Do not bypass the browser check; resume when it is
available, or use a user-operated screen recorder for the visible walkthrough.

Screenshots are optional. If included for this custom UI, provide one real PNG
or JPEG per starter prompt, each exactly 706 pixels wide and 400–860 pixels tall.
The second starter is a LeBron/Curry first-200-games square chart.

## Final portal setup

After preparation is complete, open <https://platform.openai.com/plugins>, use
the intended organization/project and verified publishing identity, and upload
the complete portable ZIP as a draft. Connect the production MCP server using
no authentication, host the exact domain challenge token at the URL generated
by the portal, and check package/skill/tool scans and imported review metadata.
Run the review cases against that saved version before authorized submission.
After approval, publication is a separate action.

Sources:
- [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission)
- [Final submission validation](https://developers.openai.com/plugins/deploy/submission-errors#final-directory-submission)
- [Widget resource metadata](https://developers.openai.com/plugins/reference)
- [Plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines)

The guidelines say annotation justifications are no longer required; the
submission-errors page still lists an older justification requirement. The tools
already declare all three required boolean hints. Use the live portal findings
to resolve any discrepancy rather than inventing extra package fields.
