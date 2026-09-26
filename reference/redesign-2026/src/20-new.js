/* ---------- What's new: the ten features, with live links ---------- */
const byName = (n) => (CUR.find((c) => c.name === n) || CUR[0]).id;
VIEWS.new = {
  title: () => "What's new",
  html() {
    const flagg = byName('Cooper Flagg'); const wemby = byName('Victor Wembanyama'); const jokic = byName('Nikola Jokic');
    const topTeam = TEAM_ORDER[0].t.abbr;
    const F = [
      ['The Daily', 'The front page writes itself each night: headline, risers and fallers over 7 days, 30 days or the season, the biggest single-game rating shocks, age-curve records and your watchlist.', '#today', 'Open Today'],
      ['Rewind', 'A time machine under the menu. Drag it to any date since November 1996 and the site follows. Press play to watch 30 seasons of the top 15 race, with a running count of weeks at No. 1.', '#rewind', 'Play the race'],
      ['Seismograph', "DARKO re-estimates every player after every game. The Seismograph plots each update under the season's rating line, split into offense and defense, so you can see which nights moved the needle.", `#p${flagg}-seismo`, "See Cooper Flagg's season"],
      ['Comps & Futures', 'The ten most similar player-seasons since 1996-97 at the same age, and a fan chart of what happened to 25 comps over the next five years, including how many were still in the league.', `#p${wemby}-comps`, "Wembanyama's comps"],
      ['Roster Lab', "Start from any team's late-season rotation, sign or trade players between two teams, drag minutes, and watch the DARKO rating, projected wins, league rank and head-to-head odds update.", '#lab', 'Open the lab'],
      ['Team DNA', "Every team gets a page: where its rating comes from player by player, its best five-man lineups, payroll against DARKO value, and how long its core is likely to last.", `#t-${topTeam}`, `See ${topTeam}`],
      ['Fantasy Lab', "DARKO's per-100 projections become a per-game draft board under ESPN, Yahoo, DraftKings, 9-cat or your own scoring, with Mine/Taken tracking and best-available.", '#fantasy', 'Rank players'],
      ['Ask DARKO', 'Press ⌘K or / anywhere. Ask for “best rim protectors under 25”, “trade Giannis to the Knicks”, “Jokic vs Wembanyama” or “rewind to 2016” and get an answer, not a search page.', 'ask', 'Try it'],
      ['DARKOdle', "A daily puzzle: name the mystery player from the shape of his career DPM curve. Misses unlock hints and overlay your guess's curve for comparison.", '#darkodle', "Play today's"],
      ['Card Studio', 'Branded, share-ready player cards in square, story or wide formats, with DPM, the offense/defense split, the skill fingerprint and a game-by-game trace.', `#card-${jokic}`, 'Make a card'],
    ];
    return `
    <section class="page-head"><div class="t">
      <span class="eyebrow">DARKO redesign prototype</span>
      <h1 class="display">Ten new things to do with DARKO</h1>
      <p class="lede">Built on the published DARKO tables as of ${esc(dateStr(LATEST))}: every rating, projection, lineup, contract value and survival curve here is real. The comps, the Roster Lab team ratings and the fantasy values are new calculations layered on top.</p>
    </div></section>
    <div class="feat-grid">
      ${F.map(([t, d, href, cta], i) => `<a class="feat" href="${href === 'ask' ? '#new' : href}"${href === 'ask' ? ' data-openask="1"' : ''}><span class="n">${String(i + 1).padStart(2, '0')} / 10</span><h3>${esc(t)}</h3><p>${esc(d)}</p><span class="cta">${esc(cta)} →</span></a>`).join('')}
    </div>
    <section class="panel" style="margin-top:24px">
      <div class="ph"><div class="ph-l"><h2>The design system underneath</h2><span class="sub">What changed across every page</span></div></div>
      <div class="ds-grid">
        <div><h3 style="font-size:15px;margin-bottom:6px">${gO} ${gX} Offense and defense, drawn</h3><p class="note">Color only carries meaning. Offense is orange and marked with a circle, defense is blue and marked with a cross, the way coaches diagram plays. Everything else is ink, so a split reads at a glance and still works without color.</p></div>
        <div><h3 style="font-size:15px;margin-bottom:6px">Skill fingerprints</h3><p class="note">Each player gets a glyph built from ten percentile ranks (scoring through rim protection). It identifies a player's shape at a glance in tables, cards and headers, and works where headshots can't load.</p></div>
        <div><h3 style="font-size:15px;margin-bottom:6px">One timeline</h3><p class="note">The maple strip under the menu is the site's clock. Every page reads its date, so “as of” is never buried in a dropdown. The faint line on it traces the league's top DPM, week by week, since 1996-97.</p></div>
      </div>
    </section>`;
  },
  mount() {
    $$('[data-openask]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); openAsk('best rim protectors under 25'); }));
  },
};
