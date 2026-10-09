<script>
  let { metadata } = $props();
</script>

<svelte:head>
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="DARKO" />
  <meta property="og:title" content={metadata.title} />
  <meta property="og:description" content={metadata.description} />
  <meta property="og:url" content={metadata.url} />
  <meta property="og:image" content={metadata.image} />
  <meta property="og:image:width" content={String(metadata.width)} />
  <meta property="og:image:height" content={String(metadata.height)} />
  <meta property="og:image:alt" content={metadata.alt} />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={metadata.title} />
  <meta name="twitter:description" content={metadata.description} />
  <meta name="twitter:image" content={metadata.image} />
  <meta name="twitter:image:alt" content={metadata.alt} />
</svelte:head>
