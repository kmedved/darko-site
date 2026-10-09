<script>
  import PageHeader from '$lib/components/PageHeader.svelte';
</script>
<svelte:head>
  <title>DARKO assistant privacy policy — DARKO</title>
  <meta name="description" content="How DARKO processes assistant chart requests, links, usage counts and support information." />
</svelte:head>
<PageHeader title="Assistant privacy policy" lede="Effective October 9, 2026 · DARKO" />
<section class="policy">
  <p>This policy covers DARKO's public NBA assistant integration and its chart links on darko.app. Your assistant provider manages your conversation under its own policy and controls. For support or privacy requests, contact <a href="mailto:kostya@darko.app">kostya@darko.app</a>.</p>
  <h2>What DARKO processes</h2>
  <p>DARKO processes the tool arguments your assistant sends: player searches and NBA IDs, metrics, filters, date and chart ranges, colors, titles, annotations and imported DARKO links. Requests include technical client information and standard HTTP metadata. Hosting providers receive network information, including IP addresses, to deliver and protect the service.</p>
  <p>These inputs retrieve public basketball data, generate charts, return results and help maintain the service. DARKO requires no user account or OAuth sign-in and does not request your entire conversation. Widget edits send the current chart settings and compact comparisons back to your assistant.</p>
  <h2>Links and service providers</h2>
  <p>Chart links contain their settings, including custom titles. Anyone with a link can access the chart. Links can appear in browser history, caches and provider logs. Avoid putting confidential information in titles or requests; stopping sharing does not revoke an existing link.</p>
  <p>Vercel hosts the service. Supabase serves basketball queries and aggregate usage counters. Your assistant provider receives returned settings, comparisons, images and links. Website pages store local display preferences; optional website fonts can contact Google Fonts. GitHub handles public issue reports, and the support mail service processes email sent to DARKO.</p>
  <p>Vercel Web Analytics is disabled. No external Vercel or Supabase log drains are configured. DARKO's own usage logs and daily counters record only the UTC day, tool, coarse client family, outcome, duration and player count. They contain no user or session identifier, player name or ID, title, URL, request body, IP address or raw user agent. Infrastructure logs are separate.</p>
  <h2>Retention</h2>
  <p>Chart and search memory caches have freshness intervals of five and two minutes; entries can remain until a subsequent read, eviction or process termination. PNG delivery requests one-day CDN freshness and one-day stale allowances. These cache settings are not guaranteed deletion deadlines. DARKO has no personal chart account or individual-cache purge control.</p>
  <p>The currently configured Vercel Pro plan without Observability Plus provides one-day runtime-log and standard Observability windows; firewall traffic is shown for the last 24 hours. The currently configured Supabase Pro plan provides a seven-day API and database log window. Provider-held security or legal records and live database storage are separate. See <a href="https://vercel.com/legal/privacy-notice">Vercel's privacy notice</a> and <a href="https://supabase.com/privacy">Supabase's privacy policy</a>.</p>
  <p>Aggregate daily usage counters have no automatic expiry. DARKO does not currently promise a fixed deletion deadline for support and privacy correspondence, which may be retained indefinitely. Contact us to request deletion; records needed for an ongoing dispute or legal obligation may be retained.</p>
  <h2>Your choices</h2>
  <p>You can omit or change titles, choose whether to share links, clear local website preferences and manage your connection and conversation through your assistant provider. Email privacy questions or requests to <a href="mailto:kostya@darko.app">kostya@darko.app</a>. Keep private information out of public GitHub issues.</p>
  <p><a href="/assistant-terms">Assistant terms</a> · <a href="/support">Support</a> · <a href="/assistant">Connection guide</a></p>
</section>
<style>
  .policy { max-width: 760px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
  h2 { margin-top: 2rem; font-family: var(--font-display); }
  p { font-size: 16px; }
  a { color: var(--accent); }
</style>