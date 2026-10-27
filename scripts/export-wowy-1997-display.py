"""Build the site's small pregame WOWY extract from an explicitly supplied publication.

Usage: python scripts/export-wowy-1997-display.py /absolute/path/composite_rapm.parquet
Requires DuckDB. Update the documented source hash when the extract changes.
"""
import datetime
import hashlib
import json
import sys
from pathlib import Path
import duckdb

source = Path(sys.argv[1]).resolve(strict=True)
connection = duckdb.connect(config={'threads': '1', 'memory_limit': '256MB'})
rows = connection.execute("""
    SELECT nba_id, date, combo_O, combo_D FROM read_parquet(?)
    WHERE season = 1997 AND date >= '1996-11-01' AND date < '1997-04-20'
      AND nba_id > 0 AND isfinite(combo_O) AND isfinite(combo_D)
    ORDER BY nba_id, date
""", [str(source)]).fetchall()
start = datetime.date(1996, 11, 1)
players = {}
for nba_id, date, offense, defense in rows:
    day = (datetime.date.fromisoformat(date) - start).days
    players.setdefault(str(nba_id), []).append([day, round(offense, 4), round(defense, 4)])
out = Path(__file__).resolve().parent.parent / 'src/lib/server/data/wowy-pregame-1997.json'
out.write_text(json.dumps(players, separators=(',', ':')) + '\n')
with source.open('rb') as f:
    digest = hashlib.file_digest(f, 'sha256').hexdigest()
print(f'{len(players)} players, {len(rows)} rows; source SHA-256 {digest}; wrote {out}')
