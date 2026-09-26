"""Extract a compact JSON snapshot of the published DARKO tables for the redesign prototype.

Inputs come from the shared DARKO runtime (set NBA_DARKO_RUNTIME_ROOT): the published Supabase
bundle (players / player_ratings), the season sim, PI lineups, spm_outputs (opponents) and
historical_player_dpm.csv (regular-season calendar). Writes data.json next to this script.
"""
from __future__ import annotations

import json
import math
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import polars as pl

HERE = Path(__file__).resolve().parent
OUT = HERE / "data.json"
if not os.environ.get("NBA_DARKO_RUNTIME_ROOT"):
    sys.exit("Set NBA_DARKO_RUNTIME_ROOT to the shared DARKO runtime (nba_darko_live).")
RUNTIME = Path(os.environ["NBA_DARKO_RUNTIME_ROOT"])
PLAYER_RATINGS = RUNTIME / "supabase_tables" / "player_ratings.parq"
PLAYERS = RUNTIME / "supabase_tables" / "players.parq"
SEASON_SIM = RUNTIME / "calculated_data" / "season_sim.csv"
LINEUPS_PI = RUNTIME / "external_share" / "lineup_elo_pi_2pass.parq"
SPM_OUTPUTS = RUNTIME / "calculated_data" / "temp" / "spm_outputs.parq"
HIST_CSV = RUNTIME / "external_share" / "historical_player_dpm.csv"
SEASON = 2026

# fixed team order (alphabetical by abbreviation): tm_id, abbr, city, nickname, conference, primary, secondary
TEAMS = [
    (1610612737, "ATL", "Atlanta", "Hawks", "E", "#C8102E", "#FDB927"),
    (1610612751, "BKN", "Brooklyn", "Nets", "E", "#111111", "#777D84"),
    (1610612738, "BOS", "Boston", "Celtics", "E", "#007A33", "#BA9653"),
    (1610612766, "CHA", "Charlotte", "Hornets", "E", "#1D1160", "#00788C"),
    (1610612741, "CHI", "Chicago", "Bulls", "E", "#CE1141", "#111111"),
    (1610612739, "CLE", "Cleveland", "Cavaliers", "E", "#860038", "#FDBB30"),
    (1610612742, "DAL", "Dallas", "Mavericks", "W", "#00538C", "#B8C4CA"),
    (1610612743, "DEN", "Denver", "Nuggets", "W", "#0E2240", "#FEC524"),
    (1610612765, "DET", "Detroit", "Pistons", "E", "#C8102E", "#1D42BA"),
    (1610612744, "GSW", "Golden State", "Warriors", "W", "#1D428A", "#FFC72C"),
    (1610612745, "HOU", "Houston", "Rockets", "W", "#CE1141", "#111111"),
    (1610612754, "IND", "Indiana", "Pacers", "E", "#002D62", "#FDBB30"),
    (1610612746, "LAC", "Los Angeles", "Clippers", "W", "#C8102E", "#1D428A"),
    (1610612747, "LAL", "Los Angeles", "Lakers", "W", "#552583", "#FDB927"),
    (1610612763, "MEM", "Memphis", "Grizzlies", "W", "#5D76A9", "#12173F"),
    (1610612748, "MIA", "Miami", "Heat", "E", "#98002E", "#F9A01B"),
    (1610612749, "MIL", "Milwaukee", "Bucks", "E", "#00471B", "#EEE1C6"),
    (1610612750, "MIN", "Minnesota", "Timberwolves", "W", "#0C2340", "#78BE20"),
    (1610612740, "NOP", "New Orleans", "Pelicans", "W", "#0C2340", "#85714D"),
    (1610612752, "NYK", "New York", "Knicks", "E", "#006BB6", "#F58426"),
    (1610612760, "OKC", "Oklahoma City", "Thunder", "W", "#007AC1", "#EF3B24"),
    (1610612753, "ORL", "Orlando", "Magic", "E", "#0077C0", "#C4CED4"),
    (1610612755, "PHI", "Philadelphia", "76ers", "E", "#006BB6", "#ED174C"),
    (1610612756, "PHX", "Phoenix", "Suns", "W", "#1D1160", "#E56020"),
    (1610612757, "POR", "Portland", "Trail Blazers", "W", "#E03A3E", "#111111"),
    (1610612758, "SAC", "Sacramento", "Kings", "W", "#5A2D81", "#63727A"),
    (1610612759, "SAS", "San Antonio", "Spurs", "W", "#111111", "#C4CED4"),
    (1610612761, "TOR", "Toronto", "Raptors", "E", "#CE1141", "#111111"),
    (1610612762, "UTA", "Utah", "Jazz", "W", "#3E2680", "#111111"),
    (1610612764, "WAS", "Washington", "Wizards", "E", "#002B5C", "#E31837"),
]
TM_IDX = {t[0]: i for i, t in enumerate(TEAMS)}
NAME_IDX = {f"{t[2]} {t[3]}": i for i, t in enumerate(TEAMS)}


def r1(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 1)


def r2(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else round(float(x), 2)


def i100(x):
    return None if x is None or (isinstance(x, float) and math.isnan(x)) else int(round(float(x) * 100))


def tmi(tm_id):
    if tm_id is None:
        return -1
    return TM_IDX.get(int(tm_id), -1)


def main() -> None:
    pr = pl.scan_parquet(PLAYER_RATINGS).with_columns(pl.col("team_name").cast(pl.Utf8))
    players = pl.read_parquet(PLAYERS)
    games = pr.filter(pl.col("future_game") == 0)

    # --- season calendar (regular-season windows) -----------------------------------------
    phases = (
        pl.scan_csv(HIST_CSV)
        .filter(pl.col("season_phase") == "regular_season")
        .group_by("season")
        .agg(pl.col("snapshot_date").min().alias("start"), pl.col("snapshot_date").max().alias("end"))
        .sort("season")
        .collect()
    )
    reg = {s: (date.fromisoformat(a), date.fromisoformat(b)) for s, a, b in phases.iter_rows()}

    # --- current leaderboard rows (mirrors get_active_player_ratings) ----------------------
    cur_rows = (
        pr.filter((pl.col("season") == SEASON) & (pl.col("active_roster") == 1))
        .sort("date")
        .group_by("nba_id")
        .last()
        .collect()
    )
    last_team = (
        pr.filter((pl.col("season") == SEASON) & (pl.col("tm_id") > 0) & pl.col("team_name").is_not_null())
        .sort("date")
        .group_by("nba_id")
        .agg(pl.col("tm_id").last().alias("last_tm"), pl.col("career_game_num").last().alias("career_games"))
        .collect()
    )
    reg_start, reg_end = reg[SEASON]
    season_games = games.filter(pl.col("season") == SEASON).collect()
    reg_games = season_games.filter(pl.col("date") <= reg_end)
    played = reg_games.filter(pl.col("seconds_played") > 0)
    gp = played.group_by("nba_id").agg(
        pl.len().alias("gp"), (pl.col("seconds_played").mean() / 60).alias("mpg")
    )
    cur = (
        cur_rows.join(last_team, on="nba_id", how="left")
        .join(gp, on="nba_id", how="left")
        .join(players.select("nba_id", "player_name"), on="nba_id", how="left")
        .sort("dpm", descending=True)
    )
    CUR_FIELDS = [
        "id", "tm", "dpm", "o", "box", "boxo", "onoff", "age", "xmin", "pace",
        "pts", "ast", "orb", "drb", "stl", "blk", "tov", "fga", "fg3a", "fta", "fgp", "fg3p", "ftp",
        "starter", "yrs", "retAge", "fair", "sal", "surplus", "warp", "rapm", "gp", "mpg", "cgames", "pos",
        "s",
    ]
    cur_out = []
    for r in cur.iter_rows(named=True):
        surv = [r2(r[f"s{k}"]) for k in range(1, 16)]
        cur_out.append([
            int(r["nba_id"]), tmi(r["last_tm"]), r2(r["dpm"]), r2(r["o_dpm"]), r2(r["box_dpm"]), r2(r["box_odpm"]),
            r2(r["on_off_dpm"]), r2(r["age"]), r1(r["x_minutes"]), r1(r["x_pace"]),
            r1(r["x_pts_100"]), r1(r["x_ast_100"]), r1(r["x_orb_100"]), r1(r["x_drb_100"]), r2(r["x_stl_100"]),
            r2(r["x_blk_100"]), r1(r["x_tov_100"]), r1(r["x_fga_100"]), r1(r["x_fg3a_100"]), r1(r["x_fta_100"]),
            round(float(r["x_fg_pct"]), 3), round(float(r["x_fg3_pct"]), 3), round(float(r["x_ft_pct"]), 3),
            r2(r["tr_starter"]), r1(r["projected_years_remaining"]), r1(r["x_retirement_age"]),
            None if r["sal_market_fixed"] is None else int(round(r["sal_market_fixed"] / 1e4)),
            None if r["actual_salary"] is None else int(round(r["actual_salary"] / 1e4)),
            None if r["surplus_value"] is None else int(round(r["surplus_value"] / 1e4)),
            r1(r["warp"]), r2(r["bayes_rapm_total"]), int(r["gp"] or 0), r1(r["mpg"]),
            int(r["career_games"] or r["career_game_num"] or 0), r["position"], surv,
        ])
    cur_ids = [c[0] for c in cur_out]
    print("cur", len(cur_out))

    # --- current-season daily history ------------------------------------------------------
    spm = (
        pl.scan_parquet(SPM_OUTPUTS)
        .filter(pl.col("season") == float(SEASON))
        .select(
            pl.col("nba_id").cast(pl.Int64),
            pl.col("date").cast(pl.Date),
            pl.col("opp_id").cast(pl.Int64).alias("opp"),
        )
        .collect()
    )
    hist_rows = (
        pr.filter((pl.col("season") == SEASON) & pl.col("nba_id").is_in(cur_ids))
        .select("nba_id", "date", "dpm", "o_dpm", "seconds_played", "future_game", "tm_id")
        .collect()
        .join(spm, on=["nba_id", "date"], how="left")
        .sort(["nba_id", "date"])
    )
    days = sorted(hist_rows["date"].unique().to_list())
    day_idx = {d: i for i, d in enumerate(days)}
    hist = {}
    for (pid,), grp in hist_rows.group_by(["nba_id"], maintain_order=True):
        rows = []
        for d_, dpm, odpm, secs, fut, tm, opp in grp.select(
            "date", "dpm", "o_dpm", "seconds_played", "future_game", "tm_id", "opp"
        ).iter_rows():
            mins = -1 if fut == 1 else int(round((secs or 0) / 60))
            rows.append([day_idx[d_], i100(dpm), i100(odpm), mins, tmi(opp), tmi(tm)])
        hist[str(pid)] = rows
    print("hist rows", hist_rows.height, "days", len(days))

    # --- season-end snapshots for every player-season -------------------------------------
    se = (
        games.sort("date")
        .group_by("nba_id", "season")
        .agg(
            pl.col("date").last(), pl.col("age").last(), pl.col("tm_id").last(), pl.col("dpm").last(),
            pl.col("o_dpm").last(), pl.col("box_dpm").last(),
            (pl.col("seconds_played") > 0).sum().alias("gp"),
            (pl.col("seconds_played").sum() / 60).alias("min"),
        )
        .filter(pl.col("gp") > 0)
        .sort(["season", "nba_id"])
        .collect()
    )
    se_out = [
        [int(p), int(s), int(round(a * 10)), tmi(t), i100(dp), i100(o), i100(b), int(g), int(round(m))]
        for p, s, _, a, t, dp, o, b, g, m in se.select(
            "nba_id", "season", "date", "age", "tm_id", "dpm", "o_dpm", "box_dpm", "gp", "min"
        ).iter_rows()
    ]
    print("se", len(se_out))

    # --- weekly race frames (regular season, top 20) ---------------------------------------
    frames, tops = [], []
    all_games = games.select("nba_id", "season", "date", "dpm", "tm_id", "seconds_played").collect()
    for season in sorted(reg):
        start, end = reg[season]
        srows = all_games.filter(
            (pl.col("season") == season) & (pl.col("date") >= start) & (pl.col("date") <= end)
        ).sort("date")
        f = start + timedelta(days=6)
        fdates = []
        while f < end:
            fdates.append(f)
            f += timedelta(days=7)
        fdates.append(end)
        for fd in fdates:
            upto = srows.filter(pl.col("date") <= fd)
            last = upto.group_by("nba_id").agg(
                pl.col("date").last(), pl.col("dpm").last(), pl.col("tm_id").last(),
                (pl.col("seconds_played") > 0).sum().alias("gp"),
            )
            last = last.filter(
                (pl.col("date") >= fd - timedelta(days=28)) & (pl.col("gp") >= 3)
            ).sort("dpm", descending=True).head(20)
            frames.append(fd.isoformat())
            tops.append([[int(p), i100(v), tmi(t)] for p, v, t in last.select("nba_id", "dpm", "tm_id").iter_rows()])
    print("race frames", len(frames))

    # --- comps + futures --------------------------------------------------------------------
    sys.path.insert(0, str(HERE))
    from comps import Comps  # noqa: E402

    C = Comps(PLAYER_RATINGS, PLAYERS)
    comps_out = {}
    cur_se = C.se.filter(pl.col("season") == SEASON)
    cur_se_by = {r["nba_id"]: r for r in cur_se.iter_rows(named=True)}
    for pid in cur_ids:
        row = cur_se_by.get(pid)
        if row is None:
            continue
        cs = C.comps_for(row, k=25)
        if not cs:
            continue
        sims = [max(0.0, 100 - 8 * d) for _, _, d in cs]
        weights = np.array([max(s, 1.0) for s in sims])
        top = []
        for (cid, cseason, d), sim in list(zip(cs, sims))[:10]:
            crow = C.se.filter((pl.col("nba_id") == cid) & (pl.col("season") == cseason)).row(0, named=True)
            fut = [C.outcome.get((cid, cseason + j)) for j in range(1, 6)]
            top.append([cid, cseason, int(round(crow["age"] * 10)), i100(crow["dpm"]), int(round(sim)),
                        [i100(v) for v in fut]])
        fan = []
        for j in range(1, 6):
            vals, ws, inl = [], [], 0.0
            for (cid, cseason, _), w in zip(cs, weights):
                v = C.outcome.get((cid, cseason + j))
                if v is not None:
                    vals.append(v); ws.append(w); inl += w
            share = inl / weights.sum()
            if len(vals) >= 4:
                order = np.argsort(vals)
                v_ = np.array(vals)[order]; w_ = np.array(ws)[order]
                cw = (np.cumsum(w_) - 0.5 * w_) / w_.sum()
                q = [float(np.interp(p, cw, v_)) for p in (0.1, 0.25, 0.5, 0.75, 0.9)]
                fan.append([j, *[i100(x) for x in q], int(round(share * 100)), len(vals)])
            else:
                fan.append([j, None, None, None, None, None, int(round(share * 100)), len(vals)])
        comps_out[str(pid)] = {"c": top, "fan": fan}
    print("comps", len(comps_out))

    # --- rotations (minutes per team game, current team = last team) ------------------------
    jan1 = date(SEASON, 1, 1)
    late = reg_games.filter(pl.col("date") >= jan1)
    team_games = late.group_by("tm_id").agg(pl.col("date").n_unique().alias("tg"))
    last_reg_team = reg_games.sort("date").group_by("nba_id").agg(pl.col("tm_id").last().alias("cur_tm"))
    with_team = late.join(last_reg_team, on="nba_id").filter(pl.col("tm_id") == pl.col("cur_tm"))
    first_date = with_team.group_by("nba_id").agg(pl.col("date").min().alias("joined"))
    rot_rows = (
        with_team.group_by("nba_id", "tm_id")
        .agg((pl.col("seconds_played").sum() / 60).alias("mins"), (pl.col("seconds_played") > 0).sum().alias("gpt"))
        .join(first_date, on="nba_id")
    )
    rot = {}
    for tm_id, grp in rot_rows.group_by("tm_id"):
        tm_id = tm_id[0]
        tdates = late.filter(pl.col("tm_id") == tm_id).select("date").unique()
        out = []
        for pid, _, mins, gpt, joined in grp.iter_rows():
            n = tdates.filter(pl.col("date") >= joined).height
            mptg = mins / max(n, 1)
            if mins <= 0:
                continue
            out.append([int(pid), round(mptg, 1), int(gpt)])
        out.sort(key=lambda x: (-x[1], x[0]))
        rot[str(tmi(tm_id))] = out
    rot = dict(sorted(rot.items(), key=lambda kv: int(kv[0])))
    print("rot teams", len(rot))

    # --- lineups (PI, 5-man, >=100 poss) ----------------------------------------------------
    lu = pl.read_parquet(LINEUPS_PI).filter(
        (pl.col("lineup_size") == 5) & (pl.col("min_season_poss") >= 100)
    )
    lineups = {}
    for tm_id, grp in lu.group_by("tm_id"):
        tm_id = tm_id[0]
        g2 = grp.sort(["total_net_rating", "group_key"], descending=[True, False]).head(6)
        lineups[str(tmi(tm_id))] = [
            [int(a), int(b), int(c), int(d_), int(e), int(round(p)), round(n, 1), round(o, 1), round(df, 1)]
            for a, b, c, d_, e, p, n, o, df in g2.select(
                "player_1_id", "player_2_id", "player_3_id", "player_4_id", "player_5_id",
                "min_season_poss", "total_net_rating", "total_off_rating", "total_def_rating",
            ).iter_rows()
        ]
    lineups = dict(sorted(lineups.items(), key=lambda kv: int(kv[0])))
    lu_ids = set()
    for v in lineups.values():
        for row in v:
            lu_ids.update(row[:5])

    # --- teams (season sim / final standings) ----------------------------------------------
    sim = pl.read_csv(SEASON_SIM)
    teams_out = []
    for i, (tid, abbr, city, nick, conf, c1, c2) in enumerate(TEAMS):
        row = sim.filter(pl.col("team_name") == f"{city} {nick}")
        r = row.row(0, named=True) if row.height else {}
        if r.get("Win Finals", 0) >= 50:
            result = "Champion"
        elif r.get("Win Conf", 0) >= 50:
            result = "Finals"
        elif r.get("Playoffs", 0) >= 50:
            result = "Playoffs"
        else:
            result = "Lottery"
        teams_out.append({
            "id": tid, "abbr": abbr, "city": city, "name": nick, "conf": conf, "c": [c1, c2],
            "w": int(r.get("W", 0)), "l": int(r.get("L", 0)), "srs": r.get("SRS"), "rk": r.get("Rk"),
            "result": result,
        })

    # --- player meta for everything referenced ----------------------------------------------
    ref_ids = set(int(x[0]) for x in se_out) | set(cur_ids) | lu_ids
    for v in comps_out.values():
        ref_ids.update(c[0] for c in v["c"])
    meta = {}
    for r in players.filter(pl.col("nba_id").is_in(list(ref_ids))).iter_rows(named=True):
        dob = r["dob"][:10] if r["dob"] else None
        meta[str(r["nba_id"])] = [
            r["player_name"], r["position"], None if r["height"] is None else int(r["height"]),
            None if r["weight"] is None else int(r["weight"]), dob,
            None if r["draft_year"] is None or math.isnan(r["draft_year"]) else int(r["draft_year"]),
            None if r["draft_slot"] is None or math.isnan(r["draft_slot"]) else int(r["draft_slot"]),
            r["country"], None if r["rookie_season"] is None or math.isnan(r["rookie_season"]) else int(r["rookie_season"]),
        ]
    missing = ref_ids - set(int(k) for k in meta)
    print("meta", len(meta), "missing", len(missing))

    # --- DARKOdle pool -----------------------------------------------------------------------
    sedf = pl.DataFrame(se_out, schema=["id", "season", "age10", "tm", "dpm", "o", "box", "gp", "min"], orient="row")
    pool = (
        sedf.filter(pl.col("gp") >= 20)
        .group_by("id")
        .agg(pl.len().alias("n"), pl.col("dpm").max().alias("peak"), pl.col("season").min().alias("first"))
        .filter((pl.col("n") >= 6) & (pl.col("peak") >= 250) & (pl.col("first") >= 1995))
        .sort("id")
    )
    pool_ids = [int(x) for x in pool["id"].to_list() if str(int(x)) in meta]
    print("pool", len(pool_ids))

    data = {
        "meta": {
            "asOf": max(days).isoformat(),
            "season": SEASON,
            "regStart": reg_start.isoformat(),
            "regEnd": reg_end.isoformat(),
            "reg": {str(s): [a.isoformat(), b.isoformat()] for s, (a, b) in reg.items()},
            "winsModel": {"a": 40.7, "b": 2.7, "r": 0.94},
        },
        "teams": teams_out,
        "players": meta,
        "curFields": CUR_FIELDS,
        "cur": cur_out,
        "days": [d.isoformat() for d in days],
        "hist": hist,
        "se": se_out,
        "race": {"frames": frames, "top": tops},
        "comps": comps_out,
        "rot": rot,
        "lineups": lineups,
        "pool": pool_ids,
    }
    OUT.write_text(json.dumps(data, separators=(",", ":"), allow_nan=False))
    print("wrote", OUT, OUT.stat().st_size / 1e6, "MB")
    for k, v in data.items():
        print(f"  {k:10s} {len(json.dumps(v, separators=(',', ':'))) / 1e3:8.0f} KB")


if __name__ == "__main__":
    main()
