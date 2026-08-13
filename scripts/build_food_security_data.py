#!/usr/bin/env python3
"""Derive a small per-country food-security snapshot from the HDX HAPI
food security CSV (source_data/hdx_hapi_food_security_global.csv) for use
as a globe heatmap layer.

Source: HDX HAPI - Food Security, Nutrition & Poverty: Food Security
https://data.humdata.org/dataset/hdx-hapi-food-security

The source CSV (~78MB, ~425k rows) covers admin levels 0/1/2, several IPC
phase rows per period, and multiple time periods (current + projections)
per location. This script keeps only country-level (admin_level == 0),
"current" (not projected) rows, picks the single most recent reference
period per country, and writes a compact JSON keyed by ISO3 country code
for the browser to fetch directly — nowhere near the size of the source
CSV, and no CSV parsing has to happen client-side.

Re-run this whenever source_data/hdx_hapi_food_security_global.csv is
refreshed with a newer HDX export:
    python3 scripts/build_food_security_data.py
"""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "source_data" / "hdx_hapi_food_security_global.csv"
OUTPUT_JSON = ROOT / "public" / "data" / "food_security_current.json"

PHASE_LABELS = {
    "1": "Minimal",
    "2": "Stressed",
    "3": "Crisis",
    "4": "Emergency",
    "5": "Catastrophe/Famine",
}


def main() -> None:
    # location_code -> reference_period_start of the latest "current" period
    # seen so far for that country.
    latest_period_start: dict[str, str] = {}
    # (location_code, reference_period_start) -> row, for every ipc_phase at
    # that period (only kept for periods that are currently "latest").
    rows_by_country_period: dict[tuple[str, str], dict[str, dict]] = {}

    with SOURCE_CSV.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["admin_level"] != "0" or row["ipc_type"] != "current":
                continue
            loc = row["location_code"]
            period_start = row["reference_period_start"]
            current_latest = latest_period_start.get(loc)
            if current_latest is not None and period_start < current_latest:
                continue  # older than what we already have for this country
            if current_latest != period_start:
                # New latest period for this country — drop any rows
                # collected for the previous (now stale) period.
                rows_by_country_period.pop((loc, current_latest or ""), None)
                latest_period_start[loc] = period_start
            rows_by_country_period.setdefault((loc, period_start), {})[row["ipc_phase"]] = row

    countries: dict[str, dict] = {}
    for (loc, period_start), phases in rows_by_country_period.items():
        all_row = phases.get("all")
        if all_row is None:
            continue
        population_analyzed = int(float(all_row["population_in_phase"]))
        phase_breakdown = {}
        for phase_num, label in PHASE_LABELS.items():
            phase_row = phases.get(phase_num)
            if phase_row is None:
                continue
            phase_breakdown[phase_num] = {
                "label": label,
                "population": int(float(phase_row["population_in_phase"])),
                "fraction": float(phase_row["population_fraction_in_phase"]),
            }
        phase_3plus = phases.get("3+")

        countries[loc] = {
            "periodStart": period_start,
            "periodEnd": all_row["reference_period_end"],
            "populationAnalyzed": population_analyzed,
            "phase3PlusFraction": float(phase_3plus["population_fraction_in_phase"]) if phase_3plus else None,
            "phase3PlusPopulation": int(float(phase_3plus["population_in_phase"])) if phase_3plus else None,
            "phases": phase_breakdown,
        }

    output = {
        "source": "HDX HAPI - Food Security, Nutrition & Poverty: Food Security",
        "sourceUrl": "https://data.humdata.org/dataset/hdx-hapi-food-security",
        "countries": dict(sorted(countries.items())),
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {len(countries)} countries to {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
