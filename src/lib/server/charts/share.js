import { chartSpecFromUrl } from './schema.js';
import { careerChartLinks } from '../../utils/careerChartSpec.js';
import { careerComparisonDescription, careerComparisonTitle } from '../../utils/careerChartTitle.js';

const ORIGIN = 'https://www.darko.app';
// A wide branded card (scripts/generate-og-default.mjs) for links that are not a supported chart.
export const SOCIAL_FALLBACK = Object.freeze({
  image: ORIGIN + '/og-default.png', width: 1200, height: 630,
  alt: 'DARKO: daily NBA player ratings and career histories'
});

/**
 * The link-preview image for a chart: the wide social card. A link's custom title, square
 * format and annotations stay out of it, so a darko.app card always says what the chart shows.
 */
export function socialImageUrl(spec) {
  const image = new URL(careerChartLinks({ ...spec, title: '', format: 'wide', annotations: [], at: null }).image_url);
  image.pathname = '/api/charts/social.png';
  return image.href;
}

/**
 * Open Graph and Twitter metadata for a trajectories or player URL. Titles are automatic and
 * name the players (looked up by ID); `title` and `description` override them for pages with an
 * identity of their own, such as a player page.
 */
export async function careerShareMetadata(url, { title = null, description = null, lookupNames = null } = {}) {
  const canonical = new URL(url.pathname + url.search, ORIGIN);
  const fallback = {
    title: title ?? 'DARKO career comparison',
    description: description ?? 'Compare NBA career histories with DARKO.',
    url: canonical.href, image: SOCIAL_FALLBACK.image, width: SOCIAL_FALLBACK.width, height: SOCIAL_FALLBACK.height,
    alt: SOCIAL_FALLBACK.alt, chart: false
  };
  let spec;
  try {
    const cardUrl = new URL('/trajectories' + url.search, ORIGIN);
    // Social cards use automatic titles; export-font validation must not reject a page link.
    cardUrl.searchParams.delete('title');
    spec = chartSpecFromUrl(cardUrl.href);
  }
  catch { return fallback; }
  let names = [];
  if (lookupNames) {
    try { names = (await lookupNames(spec.ids)) ?? []; }
    catch { names = []; }
  }
  const automatic = careerComparisonTitle(names, spec);
  const summary = careerComparisonDescription(names, spec);
  return {
    ...fallback,
    title: title ?? automatic,
    description: description ?? `${summary} Explore and edit the chart on darko.app.`,
    url: canonical.href,
    image: socialImageUrl(spec), width: 1200, height: 630,
    alt: automatic, chart: true
  };
}

/** A failed render still produces a branded, correctly shaped image for social crawlers. */
export async function socialChartResponse(event, render) {
  try {
    const response = await render(event);
    if (response.ok) return response;
  } catch { /* Missing data or an unavailable renderer falls back to the branded card. */ }
  return new Response(null, { status: 302, headers: { location: '/og-default.png', 'cache-control': 'public, max-age=60' } });
}
