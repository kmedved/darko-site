// Draws static/og-default.png: the 1200 × 630 link-preview card for darko.app pages that are
// not a supported career chart. Run with `node scripts/generate-og-default.mjs` after a logo or
// tagline change. Uses the logo's own cream background and the bundled chart font.
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const BACKGROUND = '#fcf2de';
const INK = '#0b1f24';
const logo = readFileSync(new URL('../static/logo-light.png', import.meta.url)).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630" font-family="Archivo">
  <defs>
    <!-- The logo's own background is not perfectly flat; fade its square edges into the card. -->
    <radialGradient id="fade" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.95" stop-color="#fff" stop-opacity="1"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <mask id="logo-mask"><rect x="70" y="75" width="480" height="480" fill="url(#fade)"/></mask>
  </defs>
  <rect width="1200" height="630" fill="${BACKGROUND}"/>
  <image x="70" y="75" width="480" height="480" mask="url(#logo-mask)" xlink:href="data:image/png;base64,${logo}"/>
  <text x="600" y="268" font-size="50" font-weight="700" fill="${INK}">NBA player ratings</text>
  <text x="600" y="330" font-size="50" font-weight="700" fill="${INK}">and career histories</text>
  <text x="600" y="398" font-size="26" fill="${INK}" opacity="0.72">Daily Plus-Minus · www.darko.app</text>
</svg>`;
const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { fontFiles: [new URL('../src/lib/server/charts/assets/Archivo.ttf', import.meta.url).pathname], loadSystemFonts: false, defaultFontFamily: 'Archivo' }
}).render().asPng();
writeFileSync(new URL('../static/og-default.png', import.meta.url), png);
console.log(`Wrote static/og-default.png (${png.length} bytes).`);
