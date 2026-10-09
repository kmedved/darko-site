<script>
  import PageHeader from '$lib/components/PageHeader.svelte';
</script>
<svelte:head>
  <title>DARKO assistant terms — DARKO</title>
  <meta name="description" content="DARKO assistant terms: noncommercial chart reuse with attribution; commercial use requires prior permission." />
</svelte:head>
<PageHeader title="Assistant terms" lede="Effective October 9, 2026 · DARKO" />
<section class="policy">
  <p>DARKO provides public NBA ratings, comparisons and career-history charts worldwide and free of charge. There are no payments or purchases. Questions can be sent to <a href="mailto:kostya@darko.app">kostya@darko.app</a>.</p>
  <h2>Chart reuse and commercial use</h2>
  <p>You may freely reuse individual charts for noncommercial purposes with attribution to DARKO. Credit DARKO; a link to the source chart and its incorporated-game date are encouraged.</p>
  <p><strong>Commercial use of DARKO charts, data, ratings or other outputs is prohibited without prior permission from DARKO.</strong> Attribution alone does not authorize commercial use. To request permission, contact <a href="mailto:kostya@darko.app">kostya@darko.app</a>.</p>
  <p>The permission for noncommercial chart reuse does not grant a separate license to bulk datasets, the model, or third-party marks and data. Contact DARKO about those uses.</p>
  <h2>Capabilities and data limits</h2>
  <p>The integration reads published NBA data. It cannot change ratings, refit or publish the model, post to social accounts, or provide WNBA histories. Charts support up to six players. Assistant features and availability depend on your provider.</p>
  <p>Ratings are estimates, not guarantees. Histories are retrospective pregame estimates rather than an archive of values originally published each day. Past values can change after model refits. Coverage begins in 1996–97, so earlier careers are partial. Smoothing describes the displayed curve; it does not predict a future career. Preserve the date and coverage context when interpreting a chart.</p>
  <h2>Using the service</h2>
  <p>Do not interfere with the service or bypass its access or rate limits. Keep confidential information out of chart titles and tool inputs. Reasonable limits may be applied to keep chart generation available. The service and estimates are provided as available; features and availability may change.</p>
  <p><a href="/assistant-privacy">Privacy policy</a> · <a href="/support">Support</a> · <a href="/assistant">Connection guide</a></p>
</section>
<style>
  .policy { max-width: 760px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
  h2 { margin-top: 2rem; font-family: var(--font-display); }
  p { font-size: 16px; }
  a { color: var(--accent); }
</style>