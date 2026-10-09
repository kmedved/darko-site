<script>
  import PageHeader from '$lib/components/PageHeader.svelte';
</script>
<svelte:head>
  <title>DARKO in ChatGPT — walkthrough</title>
  <meta name="description" content="A real DARKO 1.2.3 ChatGPT walkthrough: six-player career charts, edits, PNG export and NBA-only scope." />
</svelte:head>
<PageHeader title="DARKO in ChatGPT" lede="A real walkthrough of version 1.2.3." />
<section class="walkthrough">
  <video controls preload="metadata" aria-label="DARKO ChatGPT walkthrough">
    <source src="/assistant-demo-1.2.3.mp4" type="video/mp4" />
    <track kind="captions" src="/assistant-demo-1.2.3.vtt" srclang="en" label="English" />
    <p><a href="/assistant-demo-1.2.3.mp4">Download the walkthrough video</a>.</p>
  </video>
  <p>Recorded in ChatGPT with DARKO version 1.2.3 and the production DARKO Charts Beta connection. The walkthrough creates a six-player draft-class chart, changes its metric, age range, smoothing and export shape, downloads the PNG, and explains the NBA-only limit.</p>
  <p>Waiting intervals were shortened, scenes were arranged for the walkthrough, and reading pauses were added. The requests, controls and responses are actual recorded interactions; the final square image is the PNG downloaded during this session.</p>
  <p><a href="/assistant">Connect DARKO to your assistant</a> · <a href="/assistant-demo-1.2.3.mp4">Download video</a> · <a href="/assistant-privacy">Privacy</a> · <a href="/assistant-terms">Terms and chart reuse</a></p>
</section>
<style>
  .walkthrough { max-width: 1100px; margin: 1.5rem auto; color: var(--text); line-height: 1.7; }
  video { display: block; width: 100%; max-height: 80vh; background: var(--bg); }
  p { font-size: 16px; }
  a { color: var(--accent); }
</style>
