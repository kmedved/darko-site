<script>
  import PageHeader from '$lib/components/PageHeader.svelte';
  let { data } = $props();
  const endpoint = 'https://www.darko.app/mcp';
  const claudeCommand = `claude mcp add --transport http --scope user darko ${endpoint}`;
  const codexCommand = `codex mcp add darko --url ${endpoint}`;
  const cursorConfig = JSON.stringify({ mcpServers: { darko: { url: endpoint } } }, null, 2);
  let copyStatus = $state('');
  let sampleFailed = $state(false);
  const request = $derived(data.chart ? `Reopen this DARKO chart: ${data.chart.source_url}. Keep its players, colors and chart settings.` : 'Chart Jayson Tatum and Paul George at the same age.');
  const dateLabel = $derived(data.datasetAsOf ? new Date(data.datasetAsOf + 'T12:00:00Z').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : null);
  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); copyStatus = label + ' copied.'; }
    catch { copyStatus = 'Copy is unavailable in this browser. Select and copy the text shown below.'; }
  }
</script>

<svelte:head>
  <title>Use DARKO in your assistant — DARKO</title>
  <meta name="description" content="Create, edit and share multi-player NBA career charts in ChatGPT, Claude, Codex or Cursor." />
</svelte:head>

<div class="assistant-page">
<PageHeader title="Use DARKO in your assistant" lede="Compare NBA careers, then make the chart your own." />
<div class="assistant-guide">
  <p class="intro">Ask for a career chart, add players, switch between total, offensive and defensive DPM, and adjust the range. Compare up to six players, start from a draft class or the latest rating movers, and download a wide or square image on a white background.</p>
  <figure class="sample-chart">
    {#if !sampleFailed}
      <a href={data.sample.source_url} aria-label="Open the Tatum and George example on darko.app"><img src={data.sample.image_url} alt="Jayson Tatum and Paul George's DARKO DPM career histories compared by age" width="1200" height="650" onerror={() => (sampleFailed = true)} /></a>
    {:else}
      <p>The example image is unavailable. <a href={data.sample.source_url}>Open the career comparison</a>.</p>
    {/if}
    <figcaption>Jayson Tatum and Paul George at the same age · {#if dateLabel}Games incorporated through <time datetime={data.datasetAsOf}>{dateLabel}</time>{:else}Data-through date unavailable{/if}</figcaption>
  </figure>

  <section class="continue-chart" aria-labelledby="continue-heading">
    <h2 id="continue-heading">{data.chart ? 'Continue your chart' : 'Start with a chart'}</h2>
    {#if data.chartInvalid}<p>This link uses settings outside the assistant's supported career charts. The assistant supports up to six NBA players and total, offensive or defensive DPM.</p>{/if}
    <p>Select DARKO in your assistant, then paste this request. Chart links keep the players, colors, metric, range, style and export settings.</p>
    <pre class="request-text">{request}</pre>
    <div class="actions"><button class="btn btn-primary" onclick={() => copy(request, 'Chart request')}>Copy chart request</button><a class="btn" href="https://chatgpt.com/">Open ChatGPT</a>{#if data.chart}<a href={data.chart.source_url}>Open this chart on darko.app</a>{/if}</div>
    <p class="copy-status" role="status">{copyStatus}</p>
  </section>

  <section id="chatgpt" aria-labelledby="chatgpt-heading">
    <h2 id="chatgpt-heading">Connect ChatGPT</h2>
    <ol><li>Open <a href="https://chatgpt.com/plugins">ChatGPT Plugins</a> and choose Add custom MCP server.</li><li>Name it DARKO, enter this endpoint, and choose No authentication.</li><li>Select DARKO from the <code>@</code> menu for your chart request and each conversational edit.</li></ol>
    <div class="setup-block"><pre>{endpoint}</pre><button class="btn btn-sm" onclick={() => copy(endpoint, 'Endpoint')}>Copy endpoint</button></div>
    <p>Use the widget controls to add or remove players, change metrics, crop a range, choose smoothing, or export a wide or square chart. Every chart includes an image link, a high-resolution download and a link to reopen it on darko.app.</p>
  </section>

  <section aria-labelledby="other-assistants-heading">
    <h2 id="other-assistants-heading">Connect another assistant</h2>
    <p>The same public endpoint works with MCP clients. Clients without the interactive chart receive the chart image with each result, plus links to the full-size download and to the chart on darko.app.</p>
    <details><summary>Claude.ai</summary>
      <ol><li>Go to Customize → Connectors → Add → Add custom connector.</li><li>Name it DARKO, paste the endpoint above and choose No sign in.</li><li>Enable DARKO for the conversation from + → Connectors.</li></ol>
      <p>Free Claude plans allow one custom connector. Claude receives the chart image with each result; whether it also shows the interactive chart depends on its support for apps in custom connectors.</p>
      <p>For the optional chart skill, <a href="/darko-analysis-skill.zip" download>download the DARKO skill ZIP</a>, then use Customize → Skills → + → Create skill → Upload a skill. Enable code execution and file creation, and enable the uploaded skill. Connect the MCP server separately.</p>
      <p><a href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp">Claude connector instructions</a> · <a href="https://support.claude.com/en/articles/12512180-use-skills-in-claude">Claude skill instructions</a></p>
    </details>
    <details><summary>Claude Code</summary>
      <p>Run this command to make DARKO available across your projects:</p>
      <div class="setup-block"><pre>{claudeCommand}</pre><button class="btn btn-sm" onclick={() => copy(claudeCommand, 'Claude Code command')}>Copy command</button></div>
      <p>Check the connection with <code>claude mcp get darko</code>. Claude Code receives the chart image with each result, plus a link to the full-size download.</p>
      <p><a href="https://code.claude.com/docs/en/mcp">Claude Code MCP instructions</a></p>
    </details>
    <details><summary>Codex</summary>
      <div class="setup-block"><pre>{codexCommand}</pre><button class="btn btn-sm" onclick={() => copy(codexCommand, 'Codex command')}>Copy command</button></div>
      <p>The connection is saved in your Codex MCP configuration. Codex receives the chart image with each result, plus direct image and download links.</p>
      <p><a href="https://developers.openai.com/codex/mcp">Codex MCP instructions</a></p>
    </details>
    <details><summary>Cursor</summary>
      <p>Merge this entry into <code>.cursor/mcp.json</code> for one project, or <code>~/.cursor/mcp.json</code> for all projects:</p>
      <div class="setup-block"><pre>{cursorConfig}</pre><button class="btn btn-sm" onclick={() => copy(cursorConfig, 'Cursor configuration')}>Copy configuration</button></div>
      <p>Enable the DARKO connection and ask for a career chart. Recent Cursor versions can show the interactive chart; every result also includes the chart image and links.</p>
      <p><a href="https://cursor.com/docs/mcp">Cursor MCP instructions</a></p>
    </details>
    <p>Clients that expose MCP prompts can select Compare NBA careers or Find and chart published player comps. The methodology resource explains the metrics and history limits.</p>
  </section>

  <section aria-labelledby="meaning-heading"><h2 id="meaning-heading">What the charts mean</h2>
    <p>DARKO histories are retrospective pregame estimates, with coverage beginning in 1996–97. Earlier careers are partial. The games axis counts played appearances in available history. A raw peak is the highest observed rating in the selected range; a smoothed peak is the maximum of the displayed curve. Smoothing is a presentation choice, not a future projection.</p>
    <p>The integration reads public basketball data without a DARKO account. DARKO counts tool calls by day, tool and assistant app, with timing, success and how many players were involved; the counts contain no player names, chart settings or conversation text. Your assistant provider handles your conversation under its own privacy settings.</p>
    <p><a href="/trajectories">Explore career trajectories</a> · <a href="/about">Read about DARKO</a> · <a href="/support">Get support</a> · <a href="/assistant-privacy">Privacy</a> · <a href="/assistant-terms">Terms and chart reuse</a></p>
  </section>
</div>
</div>

<style>
  .assistant-page { max-width: 1080px; margin: 0 auto; padding: 0 clamp(16px, 3vw, 28px); }
  .assistant-guide { max-width: 1040px; margin: 1.5rem auto 3rem; color: var(--text); line-height: 1.65; }
  .intro { max-width: 70ch; font-size: 18px; }
  section { margin-top: 2.5rem; }
  h2 { margin: 0 0 0.8rem; font-family: var(--font-display); }
  p, li { font-size: 16px; }
  a { color: var(--accent); }
  .sample-chart { margin: 1.5rem 0 2rem; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  .sample-chart img { display: block; width: 100%; height: auto; }
  figcaption { padding: 0.8rem 1rem; color: var(--text-muted); font-size: 13px; background: var(--bg-surface); }
  .continue-chart { border-left: 3px solid var(--accent); padding-left: 1.2rem; }
  pre { margin: 0; padding: 1rem; font-size: 14px; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--font-mono, monospace); min-width: 0; }
  .request-text, .setup-block { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius); }
  .setup-block { display: flex; align-items: flex-start; gap: 0.5rem; margin: 1rem 0; }
  .setup-block pre { flex: 1; }
  .setup-block button { margin: 0.75rem; flex: none; }
  .actions { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-top: 1rem; }
  .copy-status { min-height: 1.5em; color: var(--text-muted); font-size: 13px; }
  details { border-top: 1px solid var(--border-subtle); padding: 1rem 0; }
  summary { cursor: pointer; font-family: var(--font-display); font-size: 19px; font-weight: 600; }
  @media (max-width: 600px) { .intro { font-size: 16px; } .setup-block { flex-direction: column; gap: 0; } .setup-block button { margin-top: 0; } pre { font-size: 13px; } .continue-chart { padding-left: 0.8rem; } }
</style>
