<script>
  import PageHeader from '$lib/components/PageHeader.svelte';
  const endpoint = 'https://www.darko.app/mcp';
</script>

<svelte:head><title>Use DARKO in your assistant — DARKO</title><meta name="description" content="Create and share DARKO NBA career-history charts with ChatGPT or another MCP assistant." /></svelte:head>

<PageHeader title="Use DARKO in your assistant" subtitle="Career comparisons, one request at a time." />
<section class="assistant-guide">
  <p>Ask for a career chart, then add players, change the metric, or narrow the age or games range. Compare up to six players and download a high-resolution image.</p>
  <h2>Connect DARKO</h2>
  <p>In <a href="https://chatgpt.com/plugins">ChatGPT Plugins</a>, choose Add custom MCP server, enter the endpoint below, and choose No authentication. Review the connection and create the plugin.</p>
  <p class="endpoint"><code>{endpoint}</code></p>
  <p>For Claude or another MCP assistant, add this same URL through its custom connector settings. Image display depends on the client; every chart includes a direct image and download link.</p>
  <h2>Start with a chart</h2>
  <p>In ChatGPT, select DARKO from the <code>@</code> menu for the first request and each chart edit. Keep the DARKO chip in the composer so follow-ups use the connected chart tool.</p>
  <ul>
    <li>Chart Jayson Tatum and Paul George at the same age.</li>
    <li>Add Kawhi Leonard, switch to defensive DPM, and show ages 19–25.</li>
    <li>Compare LeBron James and Stephen Curry over their full careers by games played.</li>
    <li>Only show the first 200 games, then give me the image to share.</li>
  </ul>
  <h2>What the charts mean</h2>
  <p>DARKO histories are retrospective pregame estimates and begin in 1996–97. Earlier careers are partial; their games axis counts appearances in the available history. Smoothing shows the career curve and is not a future projection.</p>
  <p>The integration reads public basketball data. It does not require a DARKO account, modify ratings, or run the model. Your assistant provider handles your conversation under its own privacy settings.</p>
  <p><a href="/trajectories">Explore career trajectories</a> · <a href="/about">Read about DARKO</a> · <a href="https://github.com/kmedved/darko-site/issues">Report an issue</a></p>
</section>

<style>
  .assistant-guide { max-width: 760px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
  h2 { margin-top: 2rem; font-family: var(--font-display); }
  p, li { font-size: 16px; }
  a { color: var(--accent); }
  .endpoint { padding: 1rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-surface); overflow-wrap: anywhere; }
</style>
