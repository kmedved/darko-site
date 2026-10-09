import { getLatestGameDate } from '$lib/server/daily.js';
import { chartSpecFromUrl } from '$lib/server/charts/schema.js';
import { careerChartLinks } from '$lib/utils/careerChartSpec.js';

export async function load({ url }) {
  let chart = null, chartInvalid = false;
  if (url.searchParams.has('chart')) {
    try { chart = careerChartLinks(chartSpecFromUrl(url.searchParams.get('chart'))); }
    catch { chartInvalid = true; }
  }
  const datasetAsOf = await getLatestGameDate().catch(() => null);
  const sample = careerChartLinks(chartSpecFromUrl('https://www.darko.app/trajectories?ids=1628369,202331&scale=age&display=modern'));
  return { datasetAsOf, chart, chartInvalid, sample };
}
