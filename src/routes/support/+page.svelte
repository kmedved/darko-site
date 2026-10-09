<script>
  import PageHeader from '$lib/components/PageHeader.svelte';
</script>

<svelte:head>
  <title>DARKO support — DARKO</title>
  <meta name="description" content="Get help with DARKO career charts, ratings and assistant connections." />
</svelte:head>

<PageHeader title="DARKO support" lede="Help with career charts, ratings and assistant connections." />

<section class="support-guide">
  <h2>Create or edit a chart</h2>
  <p>In ChatGPT, select DARKO from the <code>@</code> menu for each chart request or edit. You can also use the chart's controls to add players, change metrics, narrow the range, or choose a wide or square export.</p>
  <p>Each chart has a download link and a link to reopen the same settings on darko.app. If your assistant does not display the chart, open its image link in your browser.</p>
  <p><a href="/assistant">Read the connection and chart guide</a></p>

  <h2>Report a problem</h2>
  <p><a href="https://github.com/kmedved/darko-site/issues">Open a DARKO issue on GitHub</a>. Include the player names, the chart settings or shared chart link, what you expected, and what happened. Mention whether you were using ChatGPT, another assistant, or darko.app.</p>
  <p>GitHub issues are public. Keep passwords, API keys, personal information and private chat transcripts out of your report.</p>

  <h2>Understand the data</h2>
  <p>DARKO career histories are retrospective pregame estimates, with coverage beginning in 1996–97. Earlier careers are partial. The games axis counts played appearances in the available history, and historical values can change when the model is refit.</p>
  <p><a href="/about">Read how DARKO works</a> · <a href="/trajectories">Explore career trajectories</a></p>
</section>

<style>
  .support-guide { max-width: 760px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
  h2 { margin-top: 2rem; font-family: var(--font-display); }
  p { font-size: 16px; }
  a { color: var(--accent); }
</style>
