"""Historical comps and futures for active players.

Prototype method, not a DARKO model output. Each current player's 2025-26 season-end
snapshot is matched to player-seasons from 1996-97 through 2020-21 (20+ games, within
0.75 years of age) by weighted distance on standardized DARKO features. Futures are the
comps' season-end DPM over the next five seasons (10+ games), weighted by similarity.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import polars as pl

PROJECTION_COLUMNS = [
    "x_pts_100", "x_ast_100", "x_orb_100", "x_drb_100", "x_stl_100", "x_blk_100", "x_tov_100",
    "x_fga_100", "x_fg3a_100", "x_fta_100", "x_fg_pct", "x_fg3_pct", "x_ft_pct", "x_minutes",
    "career_game_num", "position",
]
FEATS = {  # feature: weight
    "dpm": 3.0, "o_dpm": 1.4, "d_dpm": 1.4, "dpm_p1f": 1.4, "dpm_p2f": 0.7,
    "x_pts_100": 0.9, "x_ast_100": 0.9, "reb_100": 0.9, "x_blk_100": 0.6, "x_stl_100": 0.4,
    "tpa_rate": 0.8, "fta_rate": 0.4, "x_tov_100": 0.3, "height": 0.6, "exp_log": 0.8, "age": 1.6,
}
LAST_COMP_SEASON = 2021  # leaves five observable seasons after every comp


def season_end_snapshots(player_ratings: Path) -> pl.DataFrame:
    """Last game row of every player-season, plus games and minutes played (playoffs included)."""
    games = pl.scan_parquet(player_ratings).filter(pl.col("future_game") == 0)
    return (
        games.sort("date")
        .group_by("nba_id", "season")
        .agg(
            pl.col("date").last(), pl.col("age").last(), pl.col("tm_id").last(), pl.col("dpm").last(),
            pl.col("o_dpm").last(), pl.col("d_dpm").last(), pl.col("box_dpm").last(),
            pl.col("on_off_dpm").last(),
            *[pl.col(c).last() for c in PROJECTION_COLUMNS],
            (pl.col("seconds_played") > 0).sum().alias("gp"),
            (pl.col("seconds_played").sum() / 60).alias("min"),
        )
        .collect()
    )


class Comps:
    def __init__(self, player_ratings: Path, players: Path) -> None:
        heights = pl.read_parquet(players).select("nba_id", "height")
        se = season_end_snapshots(player_ratings).join(heights, on="nba_id", how="left")
        se = se.with_columns(
            (pl.col("x_orb_100") + pl.col("x_drb_100")).alias("reb_100"),
            (pl.col("x_fg3a_100") / pl.col("x_fga_100")).alias("tpa_rate"),
            (pl.col("x_fta_100") / pl.col("x_fga_100")).alias("fta_rate"),
        ).sort(["nba_id", "season"])
        se = se.with_columns(
            pl.col("dpm").shift(1).over("nba_id").alias("dpm_p1"),
            pl.col("season").shift(1).over("nba_id").alias("season_p1"),
            pl.col("dpm").shift(2).over("nba_id").alias("dpm_p2"),
            pl.col("season").shift(2).over("nba_id").alias("season_p2"),
        )
        # a prior season only counts when it was the immediately preceding season
        se = se.with_columns(
            pl.when(pl.col("season_p1") == pl.col("season") - 1).then(pl.col("dpm_p1")).otherwise(None).alias("dpm_p1"),
            pl.when(pl.col("season_p2") == pl.col("season") - 2).then(pl.col("dpm_p2")).otherwise(None).alias("dpm_p2"),
        )
        # rookies and players without history: trajectory neutral, experience feature separates them
        se = se.with_columns(
            pl.col("dpm_p1").fill_null(pl.col("dpm")).alias("dpm_p1f"),
            pl.col("dpm_p2").fill_null(pl.col("dpm_p1").fill_null(pl.col("dpm"))).alias("dpm_p2f"),
            pl.col("height").fill_null(pl.col("height").median()),
            pl.col("career_game_num").log1p().alias("exp_log"),
        )
        self.se = se
        pool = se.filter((pl.col("season") <= LAST_COMP_SEASON) & (pl.col("gp") >= 20))
        x = pool.select(list(FEATS)).to_numpy().astype(float)
        self._mu, self._sd = x.mean(0), x.std(0)
        self._w = np.array(list(FEATS.values()))
        self._z = (x - self._mu) / self._sd * self._w
        self._ids = pool["nba_id"].to_numpy()
        self._seasons = pool["season"].to_numpy()
        self._ages = pool["age"].to_numpy()
        out = se.filter(pl.col("gp") >= 10).select("nba_id", "season", "dpm")
        self.outcome = {(a, b): c for a, b, c in out.iter_rows()}

    def comps_for(self, row: dict, k: int = 25) -> list[tuple[int, int, float]]:
        """Best-matching season per comp player: [(nba_id, season, distance)], closest first."""
        x = np.array([row[f] for f in FEATS], dtype=float)
        z = (x - self._mu) / self._sd * self._w
        d = np.sqrt(((self._z - z) ** 2).sum(1))
        age_ok = np.abs(self._ages - row["age"]) <= 0.75
        d = np.where(age_ok & (self._ids != row["nba_id"]), d, np.inf)
        seen, picks = set(), []
        for i in np.argsort(d):
            if not np.isfinite(d[i]):
                break
            if self._ids[i] in seen:
                continue
            seen.add(self._ids[i])
            picks.append(i)
            if len(picks) == k:
                break
        return [(int(self._ids[i]), int(self._seasons[i]), float(d[i])) for i in picks]
