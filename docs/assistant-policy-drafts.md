# DARKO assistant policy drafts

These drafts are not published policies. Confirm the publisher, private contact,
retention and any external integrations before turning them into public pages.
Proposed terms below require the publisher's decision; they are not statements
of an existing license or contract.

## Facts checked in the current code

- The integration reads public NBA data and has no DARKO account or OAuth flow.
- Inputs include player names and IDs, metrics, dates, filters, custom titles,
  colors, annotations and imported chart URLs. Requests also carry protocol/
  client information and HTTP headers. The integration does not retrieve a
  user's entire conversation; it processes supplied tool arguments.
- Widget edits send chart settings and compact comparisons back to the assistant.
- Chart source/image/download URLs carry chart settings, including custom titles.
  They are publicly accessible to people with the URL and can appear in browser
  history and infrastructure logs.
- Chart specifications and PNGs enter an in-process cache bounded to 16 entries
  and 16 MiB, with five-minute freshness. Search strings are used in memory cache
  keys with two-minute freshness. Freshness is not a deletion deadline: entries
  can remain until a subsequent read, eviction or process termination.
- PNG responses request public CDN caching with one-day freshness and one-day stale
  allowances. There is no per-user control to purge individual cached charts.
- The chart service does not write charts or chats to a database or durable chart
  files. Its temporary disk file is the embedded rendering font.
- Each tool call writes one log line and increments one daily counter row (`mcp_usage_daily`, written only through `service_role`): UTC day, tool name, a coarse client family (chatgpt, claude, claude-code, cursor, codex, vscode, monitor or other, from ChatGPT's `openai/*` request metadata or the user agent), success, elapsed milliseconds and player count. Neither contains player names, IDs, titles, chart URLs, request bodies, IP addresses or user agents. Hosting may separately record request metadata; its retention still needs confirmation.
- Unhandled errors log request method/path, route, Vercel request ID and error
  details. The code does not explicitly log complete request bodies or query
  strings. Hosting and database logging are separate and need confirmation.
- Vercel hosts the site; Supabase supplies basketball data. The widget uses
  transient state rather than its own localStorage. Ordinary website pages store
  theme/font/display preferences in browser storage. Optional website fonts can
  load from Google Fonts. No analytics integration was found in the reviewed code;
  that does not establish what is configured outside the code.

Evidence: `src/routes/mcp/+server.ts`, `src/lib/server/mcp/server.js`,
`src/lib/server/mcp/widget.js`, `src/lib/server/charts/service.js`,
`src/lib/server/supabase.js`, `src/lib/utils/careerChartSpec.js`,
`src/routes/api/charts/career.png/+server.js`, `src/lib/server/cacheHeaders.js`,
`src/hooks.server.js`, `src/app.html` and `src/lib/fonts.js`.

## Privacy page draft

### Scope

This policy covers the DARKO assistant integration and the career charts and links
it creates on darko.app. Your assistant provider handles your conversation under
its own privacy policy and account controls.

Publisher: **DARKO**. Private support and privacy contact: **kostya@darko.app**.
Effective date: set to the date the approved policy is published.

### Information processed and purposes

DARKO receives the tool inputs sent by your assistant: player searches and NBA
IDs, selected metrics, filters, date and chart ranges, colors, titles, annotations
and imported DARKO links. The requests also include technical client/protocol
information and standard HTTP metadata. The hosting provider receives the
network information needed to serve those requests, such as an IP address.

These inputs are used to find public basketball data, generate requested charts,
return results, keep the service working and diagnose errors. DARKO does not
require an account or retrieve your entire chat. When you edit a widget, its
current settings and comparison results are sent back to your assistant.

### Chart links and service providers

Chart links include the selected settings and any custom title. Anyone with a
link can access its chart, and links may be saved in browser history or service
logs. Avoid placing personal or confidential information in a chart title or link.

Vercel provides hosting and delivery. Supabase provides the basketball-data
service and processes the queries needed to retrieve it. Your assistant provider
receives the returned chart links, settings and comparison results. Visiting the
ordinary website can store local display preferences; selecting optional web
fonts can contact Google Fonts. Public issue reports are handled by GitHub.

Any additional configured analytics, log drains or service providers:
**pending confirmation before publication**.

### Retention

Rendered charts, their settings and search keys are cached in application memory
and chart images may be cached by the delivery network. These caches support
performance and freshness, rather than personal chart accounts. Entries can
remain until expiry is acted on, eviction or process termination; there is no
user-facing control to purge an individual cache entry.

Actual hosting/security/error/database log retention periods and support-message
retention: **pending confirmation before publication**. Do not replace these with
the application's five-minute cache freshness interval.

### Choices and contact

You can omit or change custom titles, choose whether to share a chart link, clear
website preferences from your browser, and manage the connection and conversation
through your assistant provider. Stopping sharing does not revoke a previously
shared link. DARKO has no personal chart account or per-chart deletion control.

Private questions or requests: **kostya@darko.app**. Do not post
private information in public GitHub issues. A private request process and any
applicable retention/deletion commitments need confirmation before publication.

## Terms page draft

Publisher: **DARKO**. Contact: **kostya@darko.app**. Effective date: the date the approved terms are published.
DARKO is available worldwide, free, with no payments or purchases.
Review the remaining proposed access conditions before publication.

### Using DARKO

DARKO provides public NBA ratings, comparisons and career-history charts. The
assistant integration supports up to six players per chart and reads published
data; it cannot change ratings, refit the model, publish model updates or post to
your social accounts. Availability in an assistant depends on that provider's
supported features.

### Reading ratings and histories

Ratings are estimates, not guarantees of player performance. Career histories are
retrospective pregame estimates and are not an archive of values originally
published on each day. Historical values can change after a model refit. Coverage
starts in 1996–97; earlier careers are partial. Chart smoothing does not project
a future career.

### Charts, sharing and reuse

Users may download and reuse individual charts with attribution to DARKO. Keep
the DARKO credit and data date intact. This permission covers individual charts;
it does not grant a separate license to bulk datasets, the model, or third-party
marks and data.

### Responsible access

Proposed access condition: do not interfere with the service, bypass its access
or rate limits, or send confidential information in chart titles or tool inputs.
The service can impose reasonable limits to keep chart generation available.
**Confirm this condition and the desired availability/change terms.**

### Questions

Public bug reports can use the existing DARKO GitHub issue channel. A private
support contact, any required jurisdiction-specific terms and additional legal
commitments remain **pending the publisher's decision**.
