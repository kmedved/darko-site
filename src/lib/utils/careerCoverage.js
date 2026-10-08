/** A boundary cohort's published rookie_season may be clipped to 1997.
 * Verify only the debut date through the existing broader NBA history;
 * never splice that history's ratings into DARKO series.
 */
export async function establishCareerCoverage(history, nbaId, loadFirstHistory) {
  const first = history.rows?.[0];
  if (!first || String(first.date).slice(0, 4) > '1997') return history;
  let debut = null;
  if (loadFirstHistory) {
    try {
      const wider = await loadFirstHistory(nbaId, { maxRows: 1 });
      const row = wider.rows?.[0];
      // This deliberately bounded read may be truncated: only its first date is used.
      if (row?.league === 'NBA' && row.date) debut = String(row.date).slice(0, 10);
    } catch { /* Coverage remains explicitly unverified; the DARKO chart is still usable. */ }
  }
  return { ...history, nba_debut_date: debut, boundary_coverage_checked: true };
}

export function careerCoverage(history) {
  const first = history.rows?.[0];
  const availableFrom = first?.date?.slice(0, 10) ?? null;
  const rookie = Number(first?.rookie_season);
  const boundary = availableFrom && availableFrom.slice(0, 4) <= '1997';
  const partial = history.nba_debut_date ? history.nba_debut_date < availableFrom :
    rookie > 0 && rookie < 1997 ? true : boundary || !rookie ? null : false;
  return {
    partial_career: partial,
    nba_debut_date: history.nba_debut_date ?? null,
    coverage_note: partial === true ? 'Career begins before the available DARKO series; games start at 1 within available history.' :
      partial === null ? 'Debut coverage is unverified; game 1 is the first played appearance in available history.' : null
  };
}
