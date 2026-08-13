#!/usr/bin/env python3
"""Derive per-country, per-admin1 (state/province), AND per-admin2
(district) food-security data from the HDX HAPI food security CSV
(source_data/hdx_hapi_food_security_global.csv) for use as globe heatmap
layers plus a "starvation zones" marker layer.

Source: HDX HAPI - Food Security, Nutrition & Poverty: Food Security
https://data.humdata.org/dataset/hdx-hapi-food-security

The source CSV (~78MB, ~425k rows) covers admin levels 0/1/2, several IPC
phase rows per period, and multiple time periods (current + projections)
per location. This script:

1. Country level (admin_level == 0): filters to "current" rows, keeps the
   latest reference period per country, writes
   public/data/food_security_current.json.
2. Admin1 level (admin_level == 1): same filtering, but the HDX data has
   no boundary geometry of its own — admin1_code follows each country's
   own COD/OCHA p-code scheme, which does not line up with any bundled or
   easily-joinable boundary dataset. So this script also DOWNLOADS real
   admin1 boundary polygons from geoBoundaries.org (open, CC-licensed,
   simplified geometry) for every country present in the HDX data, and
   joins HDX's admin1_name (or provider_admin1_name as a fallback) to
   geoBoundaries' shapeName by normalized-string match *within the same
   country* — there is no shared ID space, so exact name matching (after
   stripping accents/punctuation/common admin-unit suffixes) is the only
   available join key. This is approximate, not exact: some regions will
   not match due to spelling/transliteration differences, and are simply
   left out (reported in this script's console output, not silently
   dropped without a trace).
3. Admin2 level (admin_level == 2): same idea, but only for the subset of
   districts classified Phase 4 (Emergency) or Phase 5
   (Catastrophe/Famine) by the 20% rule below — these become "starvation
   zones", a flat highlight layer baked on top of the country/admin1 fill
   heatmap (not a separate client-side marker — see bake_heatmap_texture).
   ADM2 boundaries are fetched from geoBoundaries the same way as ADM1,
   but only for countries that actually have a qualifying zone (keeps the
   fetch volume small — tens of countries, not all ~190). Many admin2
   names in this dataset describe operational/informal areas (IDP camps,
   named clusters) rather than real administrative units, so a lot of
   zones won't match a boundary at all; those get a synthetic circular
   highlight instead (FALLBACK_ZONE_RADIUS_DEG), centered on the parent
   admin1 centroid, then the country centroid, so every qualifying zone
   still gets *something* drawn even without a matched polygon.

Classification standard: every area (country/admin1/admin2) gets a single
discrete "area phase" (1-5) via the actual IPC convention — the highest
phase P for which at least 20% of the analyzed population is in phase P
or worse — via classify_area_phase() below. This replaces the old
continuous "Phase 3+ population fraction" color ramp with the standard
IPC 5-color, 5-label scheme (IPC_PHASE_COLORS / PHASE_LABELS), used
identically for country fill, admin1 fill, boundary line color, starvation
zone color, and the legend — one classification rule, one color table, no
per-layer drift.

Downloaded boundary files are cached in source_data/admin1_raw/ and
source_data/admin2_raw/ so re-running this script doesn't re-fetch
anything unless those caches are cleared.

Bakes a single raster heatmap texture (country fill -> admin1 fill ->
starvation zone highlight, in that order — see bake_heatmap_texture's
docstring) to public/data/heatmap_texture.png. Country/admin1 boundary
*lines* are the one thing NOT baked here — those are real vector geometry
rendered client-side in src/main.ts, colored by the same areaPhase field
this script writes into the JSON — see IPC_PHASE_COLORS in main.ts (kept
in sync by hand with this script's copy, different languages). Starvation
zones used to be a client-side 3D marker sprite; they're a flat baked fill
now (see the "flat 2D highlighter zones" update in SPEC.md), so
starvation_zones.json / starvation_zone_boundaries.geojson exist for
click-to-inspect hit-testing, not for rendering.

Requires Pillow (`pip install pillow`) for the rasterization step only —
everything else in this script is standard library.

Outputs:
- public/data/food_security_current.json        (admin0, +areaPhase)
- public/data/admin1_boundaries.geojson          (merged, matched countries only)
- public/data/food_security_admin1.json          (keyed by boundary shapeID, +areaPhase)
- public/data/starvation_zones.json              (admin2 Phase 4/5 zones, for click-to-inspect)
- public/data/starvation_zone_boundaries.geojson (matched zones' real polygons, for click hit-testing)
- public/data/heatmap_texture.png                (baked country+admin1+zone-highlight texture)

Re-run whenever source_data/hdx_hapi_food_security_global.csv is
refreshed:
    python3 scripts/build_food_security_data.py
"""

import collections
import csv
import json
import math
import re
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "source_data" / "hdx_hapi_food_security_global.csv"
ADMIN1_CACHE_DIR = ROOT / "source_data" / "admin1_raw"
ADMIN2_CACHE_DIR = ROOT / "source_data" / "admin2_raw"
COUNTRY_GEOJSON = ROOT / "public" / "data" / "ne_110m_admin_0_countries.geojson"
OUTPUT_ADMIN0_JSON = ROOT / "public" / "data" / "food_security_current.json"
OUTPUT_ADMIN1_GEOJSON = ROOT / "public" / "data" / "admin1_boundaries.geojson"
OUTPUT_ADMIN1_JSON = ROOT / "public" / "data" / "food_security_admin1.json"
OUTPUT_ZONES_JSON = ROOT / "public" / "data" / "starvation_zones.json"
OUTPUT_ZONE_BOUNDARIES_GEOJSON = ROOT / "public" / "data" / "starvation_zone_boundaries.geojson"
OUTPUT_TEXTURE = ROOT / "public" / "data" / "heatmap_texture.png"

TEXTURE_WIDTH = 4096
TEXTURE_HEIGHT = 2048
GLOBE_SURFACE_COLOR = (11, 18, 32)  # 0x0b1220

# Standard IPC/CH color-coding (Integrated Food Security Phase
# Classification cartographic standard) — mirrors IPC_PHASE_COLORS in
# src/main.ts. Used for fill (this script) and for boundary lines +
# starvation zone markers + the legend (main.ts) — one shared standard,
# not an invented ramp.
IPC_PHASE_COLORS = {
    1: (205, 250, 205),  # #cdfacd Minimal
    2: (250, 230, 30),  # #fae61e Stressed
    3: (230, 120, 0),  # #e67800 Crisis
    4: (200, 0, 0),  # #c80000 Emergency
    5: (100, 0, 0),  # #640000 Catastrophe/Famine
}
IPC_PHASE_OPACITY = {1: 0.30, 2: 0.42, 3: 0.55, 4: 0.68, 5: 0.82}

PHASE_LABELS = {
    "1": "Minimal",
    "2": "Stressed",
    "3": "Crisis",
    "4": "Emergency",
    "5": "Catastrophe/Famine",
}

# A district is a "starvation zone" once its area phase reaches Emergency
# (4) or worse (5) — i.e. at least 20% of its analyzed population is in
# Phase 4 or Phase 5.
ZONE_PHASE_THRESHOLD = 4

GEOBOUNDARIES_API = "https://www.geoboundaries.org/api/current/gbOpen/{iso3}/ADM{level}/"
BOUNDARY_CACHE_DIRS = {"1": ADMIN1_CACHE_DIR, "2": ADMIN2_CACHE_DIR}

ADMIN_UNIT_SUFFIXES = [
    "province",
    "region",
    "state",
    "county",
    "governorate",
    "district",
    "prefecture",
    "department",
    "departamento",
    "province of",
    "autonomous region",
    "administrative region",
    # admin2-specific: HDX often splits one boundary into named
    # sub-populations ("X Urban" / "X Rural" / "X IDPs") that geoBoundaries
    # has no separate shape for — stripping these lets both sides of the
    # split still resolve to the same underlying polygon's centroid.
    "urban",
    "rural",
    "idp camp",
    "idps",
    "camp",
]


def normalize_name(name: str) -> str:
    """Lowercase, strip accents/punctuation/common admin-unit suffixes, so
    "Al Hodeidah" / "Al-Hodeidah Governorate" / "AL HODEIDAH" all collapse
    to the same join key."""
    if not name:
        return ""
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    lowered = ascii_only.lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", lowered)
    for suffix in ADMIN_UNIT_SUFFIXES:
        cleaned = re.sub(rf"\b{suffix}\b", " ", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def classify_area_phase(phase_breakdown: dict) -> int | None:
    """Standard IPC-style area classification: the highest phase P such
    that at least 20% of the analyzed population is in phase P or worse.
    Returns None only if there's no phase data at all (fractions across
    phases 1-5 always sum to ~1, so classification always resolves to at
    least Phase 1 once any data exists)."""
    if not phase_breakdown:
        return None
    cumulative = 0.0
    for phase_num in (5, 4, 3, 2, 1):
        row = phase_breakdown.get(str(phase_num))
        if row is None:
            continue
        cumulative += row["fraction"]
        if cumulative >= 0.20:
            return phase_num
    return 1


def build_phase_breakdown(phases: dict) -> dict:
    breakdown = {}
    for phase_num, label in PHASE_LABELS.items():
        phase_row = phases.get(phase_num)
        if phase_row is None:
            continue
        breakdown[phase_num] = {
            "label": label,
            "population": int(float(phase_row["population_in_phase"])),
            "fraction": float(phase_row["population_fraction_in_phase"]),
        }
    return breakdown


# --- Admin0 (country) snapshot ---------------------------------------------


def build_admin0(rows_by_country_period: dict) -> dict:
    countries: dict[str, dict] = {}
    for (loc, period_start), phases in rows_by_country_period.items():
        all_row = phases.get("all")
        if all_row is None:
            continue
        phase_breakdown = build_phase_breakdown(phases)
        phase_3plus = phases.get("3+")
        countries[loc] = {
            "periodStart": period_start,
            "periodEnd": all_row["reference_period_end"],
            "populationAnalyzed": int(float(all_row["population_in_phase"])),
            "areaPhase": classify_area_phase(phase_breakdown),
            "phase3PlusFraction": float(phase_3plus["population_fraction_in_phase"]) if phase_3plus else None,
            "phase3PlusPopulation": int(float(phase_3plus["population_in_phase"])) if phase_3plus else None,
            "phases": phase_breakdown,
        }
    return countries


def normalize_key_name(name: str) -> str:
    """Light normalization used only to decide whether two CSV rows refer
    to the same region — casefold + strip accents/punctuation, but
    deliberately NOT normalize_name()'s admin-unit-suffix stripping. The
    source CSV spells the same region inconsistently across different HDX
    export periods (e.g. "Deir al-balah & khan younis governorates" vs
    "Deir al Balah & Khan Younis Governorates"), which without this made
    latest_current_rows() treat them as two different locations and keep
    a stale period alongside the current one — this collapses that.
    Suffix-stripping is intentionally excluded here because it would
    incorrectly merge distinct sub-population splits the CSV does treat
    as separate rows, e.g. "X Urban" vs "X Rural" both reducing to "X"."""
    if not name:
        return ""
    decomposed = unicodedata.normalize("NFKD", name)
    ascii_only = "".join(c for c in decomposed if not unicodedata.combining(c))
    lowered = ascii_only.lower()
    cleaned = re.sub(r"[^a-z0-9\s]", " ", lowered)
    return re.sub(r"\s+", " ", cleaned).strip()


def latest_current_rows(reader_rows: list[dict], admin_level: str) -> tuple[dict, dict]:
    """Shared logic for admin0/admin1/admin2: keep only "current" ipc_type
    rows, and for each location keep only the single most recent
    reference_period_start. Key granularity grows with admin_level:
    admin0 -> location_code; admin1 -> (location_code, normalized
    admin1_name); admin2 -> (location_code, normalized admin1_name,
    normalized admin2_name) (admin1_name may be blank for countries HDX
    reports admin2 directly under the country, e.g. PSE). Returns
    (rows_by_key_period, display_names) — display_names maps each level
    1/2 key to the original (non-normalized) name(s) from whichever
    period ended up winning, since the key itself only has the
    normalized form; empty for admin_level "0" (no name involved)."""
    latest_period_start: dict[str, str] = {}
    rows_by_key_period: dict[tuple, dict[str, dict]] = {}
    display_names: dict[tuple, object] = {}

    for row in reader_rows:
        if row["admin_level"] != admin_level or row["ipc_type"] != "current":
            continue
        if admin_level == "0":
            key = row["location_code"]
        elif admin_level == "1":
            name = row["admin1_name"] or row["provider_admin1_name"]
            if not name:
                continue
            key = (row["location_code"], normalize_key_name(name))
        else:
            admin1_name = row["admin1_name"] or row["provider_admin1_name"] or ""
            admin2_name = row["admin2_name"] or row["provider_admin2_name"]
            if not admin2_name:
                continue
            key = (row["location_code"], normalize_key_name(admin1_name), normalize_key_name(admin2_name))
        period_start = row["reference_period_start"]
        current_latest = latest_period_start.get(key)
        if current_latest is not None and period_start < current_latest:
            continue
        if current_latest != period_start:
            rows_by_key_period.pop((key, current_latest or ""), None)
            latest_period_start[key] = period_start
            if admin_level == "1":
                display_names[key] = name
            elif admin_level == "2":
                display_names[key] = (admin1_name, admin2_name)
        rows_by_key_period.setdefault((key, period_start), {})[row["ipc_phase"]] = row

    return rows_by_key_period, display_names


# --- Boundary fetch (shared by admin1 + admin2) ----------------------------


def fetch_admin_boundary(iso3: str, level: str) -> list[dict] | None:
    cache_dir = BOUNDARY_CACHE_DIRS[level]
    cache_file = cache_dir / f"{iso3}.geojson"
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))["features"]

    api_url = GEOBOUNDARIES_API.format(iso3=iso3, level=level)
    try:
        with urllib.request.urlopen(api_url, timeout=20) as resp:
            meta = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"  [{iso3}] ADM{level} metadata fetch failed: {e}")
        return None

    download_url = meta.get("simplifiedGeometryGeoJSON") or meta.get("gjDownloadURL")
    if not download_url:
        print(f"  [{iso3}] no ADM{level} boundary available from geoBoundaries")
        return None

    try:
        with urllib.request.urlopen(download_url, timeout=30) as resp:
            geojson = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"  [{iso3}] ADM{level} geometry download failed: {e}")
        return None

    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(geojson), encoding="utf-8")
    return geojson["features"]


# --- Centroid math (shared: admin1 fallback point, country fallback point,
# and matched admin2 zone placement) -----------------------------------


def polygon_rings(geometry: dict) -> list[list[list[float]]]:
    """Outer ring of every part of a Polygon/MultiPolygon — holes are
    ignored, same simplification used everywhere else in this pipeline
    (and in src/main.ts's centroid math) for these already-simplified
    boundary datasets."""
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    return [polygon[0] for polygon in polygons]


def ring_centroid(ring: list[list[float]]) -> tuple[float, float, float]:
    """Shoelace-formula centroid + area of a single [lng,lat] ring.
    Mirrors ringCentroid in src/main.ts."""
    signed_area = 0.0
    cx = 0.0
    cy = 0.0
    for i in range(len(ring) - 1):
        x0, y0 = ring[i]
        x1, y1 = ring[i + 1]
        cross = x0 * y1 - x1 * y0
        signed_area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    signed_area *= 0.5
    if signed_area == 0:
        lng, lat = ring[0]
        return (lat, lng, 0.0)
    cx /= 6 * signed_area
    cy /= 6 * signed_area
    return (cy, cx, abs(signed_area))  # (lat, lng, area)


def feature_centroid(geometry: dict) -> tuple[float, float]:
    """For MultiPolygon features, use the largest part's centroid rather
    than averaging every part — otherwise the point can land in open
    ocean/empty space between disconnected pieces. Mirrors
    countryCentroid in src/main.ts."""
    best: tuple[float, float, float] | None = None
    for ring in polygon_rings(geometry):
        candidate = ring_centroid(ring)
        if best is None or candidate[2] > best[2]:
            best = candidate
    return (best[0], best[1]) if best else (0.0, 0.0)


# --- Admin1 boundary matching ------------------------------------------


def build_admin1(rows_by_key_period: dict, display_names: dict) -> tuple[dict, list[dict], list[str], dict]:
    # Group HDX rows by country first, keyed by the real display name
    # (display_names), not the normalized key.
    by_country: dict[str, dict[str, dict]] = {}
    for (key, period_start), phases in rows_by_key_period.items():
        loc, _ = key
        name = display_names[key]
        by_country.setdefault(loc, {})[name] = (period_start, phases)

    admin1_records: dict[str, dict] = {}
    matched_features: list[dict] = []
    unmatched: list[str] = []
    # (locationCode, normalized admin1 name) -> centroid — reused by
    # build_admin2_zones as the fallback point for zones whose own admin2
    # boundary doesn't match anything.
    admin1_centroid_by_key: dict[tuple[str, str], tuple[float, float]] = {}

    countries = sorted(by_country.keys())
    for i, iso3 in enumerate(countries):
        print(f"[{i + 1}/{len(countries)}] {iso3}: fetching ADM1 boundary...")
        features = fetch_admin_boundary(iso3, "1")
        if not features:
            unmatched.append(f"{iso3}: no boundary data at all ({len(by_country[iso3])} HDX regions unmatched)")
            continue

        boundary_by_norm_name: dict[str, dict] = {}
        for feature in features:
            norm = normalize_name(feature["properties"]["shapeName"])
            boundary_by_norm_name[norm] = feature

        country_matched = 0
        seen_shape_ids: set[str] = set()
        for hdx_name, (period_start, phases) in by_country[iso3].items():
            norm = normalize_name(hdx_name)
            feature = boundary_by_norm_name.get(norm)
            if feature is None:
                unmatched.append(f"{iso3}: '{hdx_name}' (normalized: '{norm}') has no boundary match")
                continue
            shape_id_check = feature["properties"]["shapeID"]
            if shape_id_check in seen_shape_ids:
                # Two different HDX names normalized to the same boundary
                # (e.g. "Al Hodeidah" vs "Al Hodeidah Governorate") — keep
                # the first match's data rather than writing a duplicate
                # polygon feature.
                continue
            seen_shape_ids.add(shape_id_check)

            all_row = phases.get("all")
            if all_row is None:
                continue
            phase_breakdown = build_phase_breakdown(phases)
            phase_3plus = phases.get("3+")

            shape_id = feature["properties"]["shapeID"]
            admin1_records[shape_id] = {
                "locationCode": iso3,
                "name": hdx_name,
                "periodStart": period_start,
                "periodEnd": all_row["reference_period_end"],
                "populationAnalyzed": int(float(all_row["population_in_phase"])),
                "areaPhase": classify_area_phase(phase_breakdown),
                "phase3PlusFraction": float(phase_3plus["population_fraction_in_phase"]) if phase_3plus else None,
                "phase3PlusPopulation": int(float(phase_3plus["population_in_phase"])) if phase_3plus else None,
                "phases": phase_breakdown,
            }
            # Keep the feature lean — only what the app needs to render +
            # look up food security data (shapeID is the join key).
            matched_features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "shapeID": shape_id,
                        "shapeName": feature["properties"]["shapeName"],
                        "locationCode": iso3,
                    },
                    "geometry": feature["geometry"],
                }
            )
            admin1_centroid_by_key[(iso3, norm)] = feature_centroid(feature["geometry"])
            country_matched += 1
        print(f"  matched {country_matched}/{len(by_country[iso3])} regions")

    return admin1_records, matched_features, unmatched, admin1_centroid_by_key


# --- Admin2 starvation zones -------------------------------------------


# Fallback zones (no matched admin2 boundary) get a synthetic circular
# highlight instead of a real polygon — deliberately smaller than a real
# district would usually be, since it's marking "approximately here", not
# a boundary. Phase 5 draws slightly larger than Phase 4 for the same
# severity-as-size signal the old marker size used.
FALLBACK_ZONE_RADIUS_DEG = {4: 0.45, 5: 0.65}


def ellipse_ring(lat: float, lng: float, radius_deg: float, num_points: int = 40) -> list[list[float]]:
    return [
        [lng + radius_deg * math.cos(2 * math.pi * i / num_points), lat + radius_deg * math.sin(2 * math.pi * i / num_points)]
        for i in range(num_points + 1)
    ]


def build_admin2_zones(
    rows_by_key_period: dict,
    display_names: dict,
    admin1_centroid_by_key: dict[tuple[str, str], tuple[float, float]],
    country_centroid_by_iso3: dict[str, tuple[float, float]],
    country_name_by_iso3: dict[str, str],
) -> tuple[list[dict], list[dict]]:
    candidates: dict[tuple, dict] = {}
    for (key, period_start), phases in rows_by_key_period.items():
        iso3 = key[0]
        admin1_name, admin2_name = display_names[key]
        all_row = phases.get("all")
        if all_row is None:
            continue
        phase_breakdown = build_phase_breakdown(phases)
        area_phase = classify_area_phase(phase_breakdown)
        if area_phase is None or area_phase < ZONE_PHASE_THRESHOLD:
            continue
        phase4 = phase_breakdown.get("4", {}).get("fraction", 0.0)
        phase5 = phase_breakdown.get("5", {}).get("fraction", 0.0)
        candidates[key] = {
            "locationCode": iso3,
            "admin1Name": admin1_name,
            "admin2Name": admin2_name,
            "periodStart": period_start,
            "periodEnd": all_row["reference_period_end"],
            "populationAnalyzed": int(float(all_row["population_in_phase"])),
            "areaPhase": area_phase,
            "phase4PlusFraction": round(phase4 + phase5, 4),
            "phase5Fraction": round(phase5, 4),
            "phases": phase_breakdown,
        }

    countries_needing_adm2 = sorted({c["locationCode"] for c in candidates.values()})
    print(
        f"\n{len(candidates)} admin2 starvation-zone candidates "
        f"(areaPhase >= {ZONE_PHASE_THRESHOLD}, IPC 20% rule) across "
        f"{len(countries_needing_adm2)} countries: {countries_needing_adm2}"
    )

    adm2_boundary_by_country: dict[str, list[dict]] = {}
    for i, iso3 in enumerate(countries_needing_adm2):
        print(f"[{i + 1}/{len(countries_needing_adm2)}] {iso3}: fetching ADM2 boundary for starvation zones...")
        features = fetch_admin_boundary(iso3, "2")
        if features:
            adm2_boundary_by_country[iso3] = features

    zones: list[dict] = []
    zone_boundaries: list[dict] = []  # matched real polygons only, keyed by zone id
    used_points: dict[tuple[float, float], int] = {}
    dropped: list[str] = []

    for key in sorted(candidates.keys()):
        data = candidates[key]
        iso3 = data["locationCode"]
        admin1_name = data["admin1Name"]
        admin2_name = data["admin2Name"]

        lat = lng = None
        location_source = None
        matched_geometry = None

        adm2_features = adm2_boundary_by_country.get(iso3)
        if adm2_features:
            norm = normalize_name(admin2_name)
            for feature in adm2_features:
                if normalize_name(feature["properties"]["shapeName"]) == norm:
                    lat, lng = feature_centroid(feature["geometry"])
                    location_source = "admin2"
                    matched_geometry = feature["geometry"]
                    break

        if lat is None:
            centroid = admin1_centroid_by_key.get((iso3, normalize_name(admin1_name)))
            if centroid:
                lat, lng = centroid
                location_source = "admin1"

        if lat is None:
            centroid = country_centroid_by_iso3.get(iso3)
            if centroid:
                lat, lng = centroid
                location_source = "country"

        if lat is None:
            dropped.append(f"{iso3}: '{admin2_name}' — no admin2/admin1/country centroid available at all")
            continue

        # Jitter apart zones that land on the exact same point (shared
        # centroid fallback, or genuinely co-located urban/rural splits of
        # one boundary) so each stays individually visible and clickable.
        # Only applies to fallback points — matched real boundaries are
        # never at the exact same spot as each other.
        if matched_geometry is None:
            point_key = (round(lat, 3), round(lng, 3))
            collision = used_points.get(point_key, 0)
            used_points[point_key] = collision + 1
            if collision:
                angle = collision * 2.39996  # golden angle spiral — spreads points evenly, no two overlap
                radius = 0.35 * math.sqrt(collision)
                lat += radius * math.cos(angle)
                lng += radius * math.sin(angle)

        zone_id = f"{iso3}-{normalize_name(admin1_name)}-{normalize_name(admin2_name)}".replace(" ", "-")
        zone_id = zone_id or f"{iso3}-zone-{len(zones)}"
        fallback_radius_deg = None if matched_geometry is not None else FALLBACK_ZONE_RADIUS_DEG[data["areaPhase"]]

        zones.append(
            {
                "id": zone_id,
                "locationCode": iso3,
                "countryName": country_name_by_iso3.get(iso3, iso3),
                "admin1Name": admin1_name,
                "admin2Name": admin2_name,
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "locationSource": location_source,
                "fallbackRadiusDeg": fallback_radius_deg,
                "periodStart": data["periodStart"],
                "periodEnd": data["periodEnd"],
                "populationAnalyzed": data["populationAnalyzed"],
                "areaPhase": data["areaPhase"],
                "phase4PlusFraction": data["phase4PlusFraction"],
                "phase5Fraction": data["phase5Fraction"],
                "phases": data["phases"],
            }
        )
        if matched_geometry is not None:
            zone_boundaries.append(
                {
                    "type": "Feature",
                    "properties": {"zoneId": zone_id},
                    "geometry": matched_geometry,
                }
            )

    source_counts = collections.Counter(z["locationSource"] for z in zones)
    print(f"Resolved {len(zones)}/{len(candidates)} zones to a point ({dict(source_counts)})")
    if dropped:
        print(f"{len(dropped)} candidate zones dropped (no centroid at any granularity):")
        for line in dropped:
            print(f"  - {line}")

    return zones, zone_boundaries


# --- Heatmap texture baking -----------------------------------------------


def heat_color(area_phase: int) -> tuple[int, int, int]:
    """Standard IPC phase color, pre-composited over GLOBE_SURFACE_COLOR
    at a per-phase opacity (severity reads as both a color shift and a
    boldness shift) — baked in advance instead of alpha-blended by the GPU
    at render time."""
    color = IPC_PHASE_COLORS[area_phase]
    opacity = IPC_PHASE_OPACITY[area_phase]
    return tuple(round(GLOBE_SURFACE_COLOR[k] + (color[k] - GLOBE_SURFACE_COLOR[k]) * opacity) for k in range(3))


def lnglat_to_px(lng: float, lat: float) -> tuple[float, float]:
    # Standard equirectangular (plate carrée) mapping — matches the
    # convention every public earth texture (incl. the one this project
    # used before removing the photographic skin) uses for
    # ThreeGlobe's .globeImageUrl()/globeMaterial map: lng -180 at the
    # left edge, +180 at the right; lat +90 (north pole) at the top, -90
    # at the bottom.
    x = (lng + 180.0) / 360.0 * TEXTURE_WIDTH
    y = (90.0 - lat) / 180.0 * TEXTURE_HEIGHT
    return (x, y)


def draw_fill(draw: ImageDraw.ImageDraw, geometry: dict, color: tuple[int, int, int]) -> None:
    for ring in polygon_rings(geometry):
        points = [lnglat_to_px(lng, lat) for lng, lat in ring]
        draw.polygon(points, fill=color)


# Starvation zones draw as a "highlighter" pass: a bold, near-saturated
# fill (deliberately more opaque than the country/admin1 IPC_PHASE_OPACITY
# table — it's meant to visually pop on top of the base heatmap, not blend
# into it) plus a crisp full-strength outline, like a highlighter pen's
# translucent body with a slightly more defined edge where the tip
# pressed down. Replaces the old client-side 3D "tetraX" marker sprite —
# see the "flat 2D highlighter zones" update in SPEC.md.
ZONE_HIGHLIGHT_OPACITY = 0.88
ZONE_OUTLINE_WIDTH_PX = 4


def draw_zone_highlight(draw: ImageDraw.ImageDraw, ring_lnglat: list[list[float]], area_phase: int) -> None:
    color = IPC_PHASE_COLORS[area_phase]
    fill = tuple(round(GLOBE_SURFACE_COLOR[k] + (color[k] - GLOBE_SURFACE_COLOR[k]) * ZONE_HIGHLIGHT_OPACITY) for k in range(3))
    points = [lnglat_to_px(lng, lat) for lng, lat in ring_lnglat]
    draw.polygon(points, fill=fill)
    draw.polygon(points, outline=color, width=ZONE_OUTLINE_WIDTH_PX)


def bake_heatmap_texture(
    country_features: list[dict],
    countries: dict[str, dict],
    admin1_features: list[dict],
    admin1_records: dict[str, dict],
    zones: list[dict],
    zone_boundaries: list[dict],
) -> None:
    """Three layers, in this order (later overwrites earlier where they
    overlap): country fill -> admin1 fill -> starvation zone highlights.
    No boundary lines are baked here — a rasterized 1px line at 4096x2048
    reads as blurry once texture-filtered onto a sphere ("SVG-like
    crispness" was explicitly asked for). Boundaries are rendered as
    actual vector line geometry in src/main.ts instead (plain
    THREE.LineSegments, not the extruded ConicPolygonGeometry that caused
    the Chromium crash — see SPEC.md). Starvation zones, by contrast, ARE
    baked as flat fills here (not vector geometry in main.ts) — they're a
    "flat 2D highlighter" over the real district shape where one matched
    (zone_boundaries), or a soft circular approximation where it didn't
    (FALLBACK_ZONE_RADIUS_DEG) — see build_admin2_zones. Both this texture
    and the country/admin1 vector lines in main.ts read from the exact
    same GeoJSON files, so they can't drift out of alignment; zone
    highlights are the one thing that's baked-only (no client vector
    equivalent), since they're a flat area fill, not an outline."""
    print(f"\nBaking heatmap texture ({TEXTURE_WIDTH}x{TEXTURE_HEIGHT})...")
    image = Image.new("RGB", (TEXTURE_WIDTH, TEXTURE_HEIGHT), GLOBE_SURFACE_COLOR)
    draw = ImageDraw.Draw(image)

    # Known limitation, not fixed: polygons that cross the antimeridian
    # (Russia, Fiji, a few Pacific nations) will draw a spurious
    # near-full-width band at this projection's wrap edge — a standard
    # equirectangular-rasterization artifact, same tradeoff every simple
    # lat/lng-to-pixel texture bake makes.

    # Country fills first (coarser, base layer)...
    for feature in country_features:
        record = countries.get(feature["properties"]["ISO_A3"])
        if record and record.get("areaPhase") is not None:
            draw_fill(draw, feature["geometry"], heat_color(record["areaPhase"]))
    # ...admin1 fills on top (finer, wherever matched)...
    for feature in admin1_features:
        record = admin1_records.get(feature["properties"]["shapeID"])
        if record and record.get("areaPhase") is not None:
            draw_fill(draw, feature["geometry"], heat_color(record["areaPhase"]))

    # ...starvation zone highlights on top of everything (most specific,
    # most severe layer — drawn last so it's never hidden underneath a
    # coarser fill).
    zone_boundary_by_id = {f["properties"]["zoneId"]: f for f in zone_boundaries}
    for zone in zones:
        boundary = zone_boundary_by_id.get(zone["id"])
        if boundary is not None:
            for ring in polygon_rings(boundary["geometry"]):
                draw_zone_highlight(draw, ring, zone["areaPhase"])
        else:
            ring = ellipse_ring(zone["lat"], zone["lng"], zone["fallbackRadiusDeg"])
            draw_zone_highlight(draw, ring, zone["areaPhase"])

    OUTPUT_TEXTURE.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_TEXTURE, optimize=True)
    print(f"Wrote {OUTPUT_TEXTURE} ({OUTPUT_TEXTURE.stat().st_size / 1_000_000:.1f} MB)")


def main() -> None:
    print("Reading source CSV (this takes a moment for admin1/admin2 rows)...")
    with SOURCE_CSV.open(encoding="utf-8-sig", newline="") as f:
        reader = list(csv.DictReader(f))

    country_geojson = json.loads(COUNTRY_GEOJSON.read_text(encoding="utf-8"))
    country_centroid_by_iso3: dict[str, tuple[float, float]] = {}
    country_name_by_iso3: dict[str, str] = {}
    for feature in country_geojson["features"]:
        iso3 = feature["properties"]["ISO_A3"]
        country_centroid_by_iso3[iso3] = feature_centroid(feature["geometry"])
        country_name_by_iso3[iso3] = feature["properties"]["NAME"]

    # --- Admin0 ---
    admin0_period_rows, _ = latest_current_rows(reader, "0")
    countries = build_admin0(admin0_period_rows)
    OUTPUT_ADMIN0_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_ADMIN0_JSON.write_text(
        json.dumps(
            {
                "source": "HDX HAPI - Food Security, Nutrition & Poverty: Food Security",
                "sourceUrl": "https://data.humdata.org/dataset/hdx-hapi-food-security",
                "classificationRule": "IPC-style 20% rule: an area is classified at the highest phase P where >=20% of the analyzed population is in phase P or worse.",
                "countries": dict(sorted(countries.items())),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(countries)} countries to {OUTPUT_ADMIN0_JSON}")

    # --- Admin1 ---
    admin1_period_rows, admin1_display_names = latest_current_rows(reader, "1")
    admin1_records, matched_features, unmatched, admin1_centroid_by_key = build_admin1(
        admin1_period_rows, admin1_display_names
    )

    OUTPUT_ADMIN1_GEOJSON.write_text(
        json.dumps({"type": "FeatureCollection", "features": matched_features}),
        encoding="utf-8",
    )
    OUTPUT_ADMIN1_JSON.write_text(
        json.dumps(
            {
                "source": "HDX HAPI - Food Security, Nutrition & Poverty: Food Security",
                "sourceUrl": "https://data.humdata.org/dataset/hdx-hapi-food-security",
                "boundarySource": "geoBoundaries.org (Open Database, CC BY 4.0 / Public Domain per-country)",
                "matchNote": "Joined to HDX admin1 names by normalized string match, not a shared ID scheme — some regions have no match, see build script console output.",
                "classificationRule": "IPC-style 20% rule: an area is classified at the highest phase P where >=20% of the analyzed population is in phase P or worse.",
                "regions": admin1_records,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    total_hdx_regions = sum(1 for _ in admin1_period_rows)
    dupe_count = len(matched_features) - len(admin1_records)
    print(
        f"\nWrote {len(admin1_records)}/{total_hdx_regions} matched admin1 regions "
        f"to {OUTPUT_ADMIN1_GEOJSON} and {OUTPUT_ADMIN1_JSON}"
        + (f" ({dupe_count} duplicate shapeID collisions deduped)" if dupe_count else "")
    )
    print(f"\n{len(unmatched)} unmatched admin1 regions:")
    for line in unmatched:
        print(f"  - {line}")

    # --- Admin2 starvation zones ---
    admin2_period_rows, admin2_display_names = latest_current_rows(reader, "2")
    zones, zone_boundaries = build_admin2_zones(
        admin2_period_rows, admin2_display_names, admin1_centroid_by_key, country_centroid_by_iso3, country_name_by_iso3
    )
    OUTPUT_ZONES_JSON.write_text(
        json.dumps(
            {
                "source": "HDX HAPI - Food Security, Nutrition & Poverty: Food Security",
                "sourceUrl": "https://data.humdata.org/dataset/hdx-hapi-food-security",
                "boundarySource": "geoBoundaries.org ADM2 where matched; admin1 or country centroid fallback otherwise (see each zone's locationSource)",
                "classificationRule": "IPC-style 20% rule: an area is classified at the highest phase P where >=20% of the analyzed population is in phase P or worse. Starvation zones are admin2 (district-level) areas classified Phase 4 (Emergency) or Phase 5 (Catastrophe/Famine).",
                "threshold": ZONE_PHASE_THRESHOLD,
                "zones": zones,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    OUTPUT_ZONE_BOUNDARIES_GEOJSON.write_text(
        json.dumps({"type": "FeatureCollection", "features": zone_boundaries}),
        encoding="utf-8",
    )
    print(
        f"\nWrote {len(zones)} starvation zones to {OUTPUT_ZONES_JSON} "
        f"({len(zone_boundaries)} with a matched real boundary, written to {OUTPUT_ZONE_BOUNDARIES_GEOJSON})"
    )

    # --- Bake the heatmap texture (country + admin1 fills, then zone highlights on top) ---
    bake_heatmap_texture(country_geojson["features"], countries, matched_features, admin1_records, zones, zone_boundaries)


if __name__ == "__main__":
    main()
