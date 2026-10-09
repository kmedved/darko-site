# DARKO assistant policies for publisher review

Publisher and contact are confirmed: DARKO, kostya@darko.app.
Access is worldwide and free, with no payments or purchases. Individual charts
may be reused with attribution. Public pages use the current retention disclosure: no promised support-mail deletion deadline, with deletion requests sent to DARKO. The previously proposed 12-month rule was not adopted. Effective date: October 9, 2026.


## Privacy policy

DARKO provides an assistant integration for public NBA ratings and career charts.
This policy covers that integration and its chart links on darko.app. Your
assistant provider manages your conversation under its own policy and controls.
For private support or privacy questions, contact kostya@darko.app.

### What DARKO processes

DARKO processes the tool arguments your assistant sends: player searches and NBA
IDs, metrics, filters, date and chart ranges, colors, titles, annotations and
imported DARKO links. Requests also include technical client information and
standard HTTP metadata. The hosting provider receives network information such
as an IP address to deliver and protect the service.

These inputs are used to retrieve public basketball data, generate charts,
return results, maintain the service and diagnose errors. DARKO has no user
account or OAuth requirement and does not retrieve your entire conversation.
Widget edits send the current chart settings and compact comparisons back to
your assistant.

### Links and providers

Chart links contain their settings, including custom titles. Anyone with a link
can access the chart. Links can appear in browser history, caches and provider
logs; avoid putting confidential information in them. Stopping sharing does not
revoke a link that was already shared.

Vercel hosts and delivers the service. Supabase serves basketball queries and
aggregate usage counters. Your assistant provider receives the returned settings,
comparisons, images and links. Ordinary website pages store local display
preferences; optional website fonts can contact Google Fonts. GitHub handles
public issue reports. Email sent to kostya@darko.app is processed by the support
mail service.

Vercel Web Analytics is disabled, and no external Vercel or Supabase log drains
are configured. The integration's own logs and daily usage counters contain only
the UTC day, tool, coarse client family, outcome, duration and player count.
They contain no user/session identifier, player name or ID, title, URL, request
body, IP address or raw user agent. Infrastructure logs are separate.

### Retention

Application-memory chart and search caches have freshness intervals of five and
two minutes. Entries may remain until a subsequent read, eviction or process
termination. PNG delivery requests one-day CDN freshness and one-day stale
allowances. These are cache settings, not guaranteed deletion deadlines. There
is no personal chart account or individual-cache purge control.

Vercel's current Pro plan without Observability Plus has one-day runtime-log and
standard Observability windows, including CDN request events. Its firewall
traffic view covers the last 24 hours. Supabase's current Pro plan provides a
seven-day API/database log window. These feature windows are separate from any
provider-held security or legal records and from live database storage; see the
providers' policies. Aggregate daily usage counters have no automatic expiry.

DARKO does not currently promise a fixed deletion deadline for support and privacy correspondence, which may be retained indefinitely. Contact DARKO to request deletion; records needed for an ongoing dispute or legal obligation may be retained.

### Your choices

You can change or omit custom titles, decide whether to share links, clear local
website preferences and manage the connection and conversation through your
assistant provider. Send privacy questions or requests to kostya@darko.app.
Keep private information out of public GitHub issues.

## Terms

DARKO provides public NBA ratings, comparisons and career-history charts worldwide
and free of charge. There are no payments or purchases. Questions can be sent
to kostya@darko.app.

The integration reads published data. It cannot change ratings, refit or publish
the model, post to social accounts, or provide WNBA histories. Charts support up
to six NBA players. Assistant features and availability depend on your provider.

Ratings are estimates, not guarantees. Histories are retrospective pregame
estimates rather than an archive of values originally published each day. Past
values can change after model refits. Coverage begins in 1996–97, so earlier
careers are partial. Smoothing describes the displayed curve; it does not
predict a future career. Preserve the data-date and coverage context when
interpreting a chart.

You may freely reuse individual charts, including in commercial work, with
attribution to DARKO. Credit DARKO; a source link and incorporated-game date are encouraged. This permission does not grant a separate license
to bulk datasets, the model, or third-party marks and data.

Do not interfere with the service, bypass its access or rate limits, or send
confidential information in chart titles or tool inputs. Reasonable limits may
be applied to keep chart generation available. The service and its estimates
are provided as available, and features or availability may change.

## Verification and sources

Checked against the released route, chart cache/CDN headers, usage migration,
widget, shared methodology and configured dashboards. Vercel Pro/no Plus,
Web Analytics disabled/no team drains; Supabase actual Pro badge/no configured
log-drain destinations. Usage counters were verified from real production calls.

- [Vercel runtime logs](https://vercel.com/docs/logs/runtime)
- [Vercel Observability limits](https://vercel.com/docs/observability/observability-plus#limitations)
- [Vercel firewall traffic](https://vercel.com/docs/vercel-firewall/firewall-observability)
- [Vercel privacy and retention](https://vercel.com/legal/privacy-notice#how-we-retain-your-information)
- [Supabase plan limits](https://supabase.com/pricing)
- [OpenAI plugin privacy requirements](https://developers.openai.com/plugins/plugin-guidelines#privacy-policy)
