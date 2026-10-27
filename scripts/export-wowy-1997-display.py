"""Build the site's small pregame WOWY extract from explicitly supplied publications.

Usage: python scripts/export-wowy-1997-display.py /absolute/path/composite_rapm.parquet /absolute/path/player_ratings.parq
Requires DuckDB. Update the documented source hashes when the extract changes.

WOWY's first state for a player is his debut day, but the published ratings can carry him on earlier no-minute
rows (on a roster, not yet played). Those rows get his debut-day pregame state. It holds no game of his, so it adds
no future information about him, and the display doesn't jump at his debut. A player who logged minutes before his
first WOWY state (none in the current sources) is left out, so the site shows DPM for his whole season instead of
switching to the blend part-way through.
"""
import datetime
import hashlib
import json
import sys
from pathlib import Path
import duckdb


def sha256(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


source, ratings = (Path(arg).resolve(strict=True) for arg in sys.argv[1:3])
connection = duckdb.connect(config={'threads': '1', 'memory_limit': '256MB'})
rows = connection.execute("""
    SELECT nba_id, date, combo_O, combo_D FROM read_parquet(?)
    WHERE season = 1997 AND date >= '1996-11-01' AND date < '1997-04-20'
      AND nba_id > 0 AND isfinite(combo_O) AND isfinite(combo_D)
    ORDER BY nba_id, date
""", [str(source)]).fetchall()
start = datetime.date(1996, 11, 1)
rated = {}
for nba_id, date, seconds in connection.execute("""
    SELECT nba_id, CAST(date AS DATE), coalesce(seconds_played, 0) FROM read_parquet(?)
    WHERE CAST(date AS DATE) >= DATE '1996-11-01' AND CAST(date AS DATE) < DATE '1997-04-20'
""", [str(ratings)]).fetchall():
    rated.setdefault(nba_id, []).append(((date - start).days, seconds))
players = {}
for nba_id, date, offense, defense in rows:
    day = (datetime.date.fromisoformat(date) - start).days
    players.setdefault(nba_id, []).append([day, round(offense, 4), round(defense, 4)])
kept, carried, dropped = {}, [], []
for nba_id, states in players.items():
    if nba_id not in rated:
        continue
    first_day = min(day for day, _ in rated[nba_id])
    if states[0][0] > first_day:
        if any(seconds > 0 for day, seconds in rated[nba_id] if day < states[0][0]):
            dropped.append(nba_id)
            continue
        states = [[first_day, *states[0][1:]], *states]
        carried.append(nba_id)
    kept[str(nba_id)] = states
out = Path(__file__).resolve().parent.parent / 'src/lib/server/data/wowy-pregame-1997.json'
out.write_text(json.dumps(kept, separators=(',', ':')) + '\n')
print(f'{len(kept)} players, {sum(map(len, kept.values()))} rows; debut state carried back over no-minute rows for '
      f'{len(carried)}: {sorted(carried)}; shown as DPM (minutes before first WOWY): {sorted(dropped)}')
print(f'WOWY source SHA-256 {sha256(source)}; ratings source SHA-256 {sha256(ratings)}; wrote {out}')
