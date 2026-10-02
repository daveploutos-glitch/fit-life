#!/usr/bin/env python3
"""Heuristic sync: /home/box/fitness/log.md → data/log.json

The markdown log is free-form coach notes. This script extracts what it can
(date headers, steps, kcal/protein ranges, workout lines) and MERGES into the
existing data/log.json so hand-tuned fields are preserved when possible.

Usage (from repo root):
  python3 tools/sync_data.py
  python3 tools/sync_data.py --log /home/box/fitness/log.md --out data/log.json
"""
from __future__ import annotations

import argparse
import json
import re
from datetime import datetime
from pathlib import Path

DATE_RE = re.compile(r"^##\s+(\d{4}-\d{2}-\d{2})")
STEPS_RE = re.compile(r"步數[：: ].*?([\d,]+)")
KCAL_RANGE_RE = re.compile(
    r"(?:全日|今日|更新全日估|粗估).*?([\d,]+)\s*[–\-〜~]\s*([\d,]+)\s*kcal",
    re.I,
)
PROTEIN_RANGE_RE = re.compile(
    r"蛋白(?:質)?\s*(?:約)?\s*([\d.]+)\s*[–\-〜~]\s*([\d.]+)\s*g",
    re.I,
)
WEIGHT_RE = re.compile(r"體重\s+\*\*?([\d.]+)\s*kg", re.I)
BF_RE = re.compile(r"體脂率\s+\*\*?([\d.]+)%")


def parse_md(text: str) -> dict[str, dict]:
    blocks: dict[str, list[str]] = {}
    current = None
    for line in text.splitlines():
        m = DATE_RE.match(line)
        if m:
            current = m.group(1)
            blocks.setdefault(current, [])
            continue
        if current:
            blocks[current].append(line)

    out: dict[str, dict] = {}
    for date, lines in blocks.items():
        blob = "\n".join(lines)
        entry: dict = {"date": date, "source": "sync_data.py"}
        sm = STEPS_RE.search(blob)
        if sm:
            entry["steps"] = int(sm.group(1).replace(",", ""))
        km = list(KCAL_RANGE_RE.finditer(blob))
        if km:
            a, b = km[-1].groups()
            entry["kcal"] = {
                "min": int(a.replace(",", "")),
                "max": int(b.replace(",", "")),
                "est": (int(a.replace(",", "")) + int(b.replace(",", ""))) // 2,
            }
        pm = list(PROTEIN_RANGE_RE.finditer(blob))
        if pm:
            a, b = pm[-1].groups()
            entry["proteinG"] = {
                "min": float(a),
                "max": float(b),
                "est": (float(a) + float(b)) / 2,
            }
        wm = WEIGHT_RE.search(blob)
        if wm:
            entry["weightKg"] = float(wm.group(1))
        if "Workout A" in blob and ("完成" in blob or "COMPLETE" in blob.upper()):
            entry.setdefault("training", {})["workout"] = "A"
            entry["training"]["status"] = "complete"
        if "自由餐" in blob or "free meal" in blob.lower():
            entry["freeMeal"] = True
        if "休息" in blob[:80]:
            entry["type"] = "rest"
        out[date] = entry
    return out


def merge(existing: dict, parsed: dict[str, dict]) -> dict:
    by_date = {e["date"]: e for e in existing.get("entries", [])}
    for date, patch in parsed.items():
        if date in by_date:
            base = by_date[date]
            for k, v in patch.items():
                if k == "date":
                    continue
                # only fill missing / incomplete numeric fields
                if k not in base or base.get(k) in (None, "", []):
                    base[k] = v
                elif k in ("kcal", "proteinG") and isinstance(v, dict):
                    if base.get(k, {}).get("incomplete") or mid_missing(base.get(k)):
                        base[k] = v
        else:
            by_date[date] = patch
    entries = sorted(by_date.values(), key=lambda e: e["date"])
    existing["entries"] = entries
    existing["generated"] = datetime.now().strftime("%Y-%m-%d %H:%M")
    existing["tz"] = "HKT"
    existing["source"] = "merged via tools/sync_data.py"
    return existing


def mid_missing(r) -> bool:
    if not isinstance(r, dict):
        return True
    return r.get("est") is None and r.get("min") is None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default="/home/box/fitness/log.md")
    ap.add_argument("--out", default="data/log.json")
    args = ap.parse_args()
    root = Path(__file__).resolve().parents[1]
    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = root / out_path
    log_path = Path(args.log)
    existing = {"entries": []}
    if out_path.exists():
        existing = json.loads(out_path.read_text(encoding="utf-8"))
    parsed = parse_md(log_path.read_text(encoding="utf-8"))
    merged = merge(existing, parsed)
    out_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out_path} ({len(merged['entries'])} entries, parsed {len(parsed)} day headers)")


if __name__ == "__main__":
    main()
