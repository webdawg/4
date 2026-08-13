#!/usr/bin/env python3
"""Derive per-country AND per-admin1 (state/province) food-security
snapshots from the HDX HAPI food security CSV
(source_data/hdx_hapi_food_security_global.csv) for use as globe heatmap
layers, at two granularities.

Source: HDX HAPI - Food Security, Nutrition & Poverty: Food Security
https://data.humdata.org/dataset/hdx-hapi-food-security

The source CSV (~78MB, ~425k rows) covers admin levels 0/1/2, several IPC
phase rows per period, and multiple time periods (current + projections)
per location. This script:

1. Country level (admin_level == 0): same as before — filters to
   "current" rows, keeps the latest reference period per country, writes
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

Downloaded boundary files are cached in source_data/admin1_raw/ so
re-running this script doesn't re-fetch anything unless that cache is
cleared.

3. Bakes a single raster heatmap texture (country + admin1 fills and
   boundary lines, equirectangular projection) to
   public/data/heatmap_texture.png. This used to be rendered as ~700 live
   3D polygon meshes in the browser (one ConicPolygonGeometry per country/
   admin1 region); that turned out to crash Chromium on at least one
   machine with older integrated graphics (SIGILL, "invalid opcode",
   confirmed via journalctl — see SPEC.md's "move heatmap rendering to a
   baked texture" update). Baking it into one texture at build time
   collapses those ~700 draw calls into 1. The app still needs the raw
   GeoJSON client-side for click-to-inspect (point-in-polygon lookup
   against the click coordinate, done in JS, not rendered).

Requires Pillow (`pip install pillow`) for the rasterization step only —
everything else in this script is standard library.

Outputs:
- public/data/food_security_current.json      (admin0, unchanged)
- public/data/admin1_boundaries.geojson        (merged, matched countries only)
- public/data/food_security_admin1.json        (keyed by boundary shapeID)
- public/data/heatmap_texture.png              (baked country+admin1 heatmap)

Re-run whenever source_data/hdx_hapi_food_security_global.csv is
refreshed:
    python3 scripts/build_food_security_data.py
"""

import csv
import json
import re
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE_CSV = ROOT / "source_data" / "hdx_hapi_food_security_global.csv"
ADMIN1_CACHE_DIR = ROOT / "source_data" / "admin1_raw"
COUNTRY_GEOJSON = ROOT / "public" / "data" / "ne_110m_admin_0_countries.geojson"
OUTPUT_ADMIN0_JSON = ROOT / "public" / "data" / "food_security_current.json"
OUTPUT_ADMIN1_GEOJSON = ROOT / "public" / "data" / "admin1_boundaries.geojson"
OUTPUT_ADMIN1_JSON = ROOT / "public" / "data" / "food_security_admin1.json"
OUTPUT_TEXTURE = ROOT / "public" / "data" / "heatmap_texture.png"

# Mirrors HEATMAP_COLOR_STOPS in src/main.ts (kept in sync by hand, not
# shared code — different languages). Boundary colors (cyan for country,
# pink for admin1) live only in main.ts now — this script no longer draws
# lines at all, see bake_heatmap_texture's docstring.
TEXTURE_WIDTH = 4096
TEXTURE_HEIGHT = 2048
GLOBE_SURFACE_COLOR = (11, 18, 32)  # 0x0b1220
HEATMAP_COLOR_STOPS = [
    (0.0, (22, 163, 74)),  # 0x16a34a
    (0.15, (234, 179, 8)),  # 0xeab308
    (0.3, (249, 115, 22)),  # 0xf97316
    (0.5, (220, 38, 38)),  # 0xdc2626
    (0.75, (127, 29, 29)),  # 0x7f1d1d
]

PHASE_LABELS = {
    "1": "Minimal",
    "2": "Stressed",
    "3": "Crisis",
    "4": "Emergency",
    "5": "Catastrophe/Famine",
}

GEOBOUNDARIES_API = "https://www.geoboundaries.org/api/current/gbOpen/{iso3}/ADM1/"

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


# --- Admin0 (country) snapshot, unchanged from the previous version ------


def build_admin0(rows_by_country_period: dict, all_rows: dict) -> dict:
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
    return countries


def latest_current_rows(reader_rows: list[dict], admin_level: str) -> dict:
    """Shared logic for admin0 and admin1: keep only "current" ipc_type
    rows, and for each location (admin0: location_code; admin1:
    location_code+admin1_name) keep only the single most recent
    reference_period_start."""
    latest_period_start: dict[str, str] = {}
    rows_by_key_period: dict[tuple, dict[str, dict]] = {}

    for row in reader_rows:
        if row["admin_level"] != admin_level or row["ipc_type"] != "current":
            continue
        if admin_level == "0":
            key = row["location_code"]
        else:
            name = row["admin1_name"] or row["provider_admin1_name"]
            if not name:
                continue
            key = (row["location_code"], name)
        period_start = row["reference_period_start"]
        current_latest = latest_period_start.get(key)
        if current_latest is not None and period_start < current_latest:
            continue
        if current_latest != period_start:
            rows_by_key_period.pop((key, current_latest or ""), None)
            latest_period_start[key] = period_start
        rows_by_key_period.setdefault((key, period_start), {})[row["ipc_phase"]] = row

    return rows_by_key_period


# --- Admin1 boundary fetch ------------------------------------------------


def fetch_admin1_boundary(iso3: str) -> list[dict] | None:
    cache_file = ADMIN1_CACHE_DIR / f"{iso3}.geojson"
    if cache_file.exists():
        return json.loads(cache_file.read_text(encoding="utf-8"))["features"]

    api_url = GEOBOUNDARIES_API.format(iso3=iso3)
    try:
        with urllib.request.urlopen(api_url, timeout=20) as resp:
            meta = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"  [{iso3}] ADM1 metadata fetch failed: {e}")
        return None

    download_url = meta.get("simplifiedGeometryGeoJSON") or meta.get("gjDownloadURL")
    if not download_url:
        print(f"  [{iso3}] no ADM1 boundary available from geoBoundaries")
        return None

    try:
        with urllib.request.urlopen(download_url, timeout=30) as resp:
            geojson = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError) as e:
        print(f"  [{iso3}] ADM1 geometry download failed: {e}")
        return None

    ADMIN1_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(geojson), encoding="utf-8")
    return geojson["features"]


def build_admin1(rows_by_key_period: dict) -> tuple[dict, list[dict], list[str]]:
    # Group HDX rows by country first.
    by_country: dict[str, dict[str, dict]] = {}
    for (key, period_start), phases in rows_by_key_period.items():
        loc, name = key
        by_country.setdefault(loc, {})[name] = (period_start, phases)

    admin1_records: dict[str, dict] = {}
    matched_features: list[dict] = []
    unmatched: list[str] = []

    countries = sorted(by_country.keys())
    for i, iso3 in enumerate(countries):
        print(f"[{i + 1}/{len(countries)}] {iso3}: fetching ADM1 boundary...")
        features = fetch_admin1_boundary(iso3)
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

            shape_id = feature["properties"]["shapeID"]
            admin1_records[shape_id] = {
                "locationCode": iso3,
                "name": hdx_name,
                "periodStart": period_start,
                "periodEnd": all_row["reference_period_end"],
                "populationAnalyzed": int(float(all_row["population_in_phase"])),
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
            country_matched += 1
        print(f"  matched {country_matched}/{len(by_country[iso3])} regions")

    return admin1_records, matched_features, unmatched


# --- Heatmap texture baking -----------------------------------------------


def heat_color(fraction: float) -> tuple[int, int, int]:
    """Same green->yellow->orange->red->maroon ramp + opacity formula the
    old live polygonCapColor accessor used in src/main.ts, but
    pre-composited over GLOBE_SURFACE_COLOR here instead of alpha-blended
    by the GPU at render time — same visual result, baked in advance."""
    t = max(0.0, min(1.0, fraction))
    lower, upper = HEATMAP_COLOR_STOPS[0], HEATMAP_COLOR_STOPS[-1]
    for i in range(len(HEATMAP_COLOR_STOPS) - 1):
        if HEATMAP_COLOR_STOPS[i][0] <= t <= HEATMAP_COLOR_STOPS[i + 1][0]:
            lower, upper = HEATMAP_COLOR_STOPS[i], HEATMAP_COLOR_STOPS[i + 1]
            break
    span = (upper[0] - lower[0]) or 1
    local_t = (t - lower[0]) / span
    color = tuple(lower[1][k] + (upper[1][k] - lower[1][k]) * local_t for k in range(3))
    opacity = 0.18 + t * 0.55
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


def polygon_rings(geometry: dict) -> list[list[list[float]]]:
    """Outer ring of every part of a Polygon/MultiPolygon — holes are
    ignored, same simplification already used elsewhere in this script
    (and in src/main.ts's centroid math) for these already-simplified
    boundary datasets."""
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    return [polygon[0] for polygon in polygons]


def draw_fill(draw: ImageDraw.ImageDraw, geometry: dict, color: tuple[int, int, int]) -> None:
    for ring in polygon_rings(geometry):
        points = [lnglat_to_px(lng, lat) for lng, lat in ring]
        draw.polygon(points, fill=color)


def bake_heatmap_texture(
    country_features: list[dict],
    countries: dict[str, dict],
    admin1_features: list[dict],
    admin1_records: dict[str, dict],
) -> None:
    """Fill color only — no boundary lines. Lines used to be baked in here
    too, but a rasterized 1px line at 4096x2048 reads as blurry once
    texture-filtered onto a sphere ("SVG-like crispness" was explicitly
    asked for). Boundaries are rendered as actual vector line geometry in
    src/main.ts instead (plain THREE.Line, not the extruded
    ConicPolygonGeometry that caused the Chromium crash — see SPEC.md).
    Both the texture here and the vector lines in main.ts read from the
    exact same GeoJSON files, so they can't drift out of alignment."""
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
        if record and record.get("phase3PlusFraction") is not None:
            draw_fill(draw, feature["geometry"], heat_color(record["phase3PlusFraction"]))
    # ...admin1 fills on top (finer, wherever matched).
    for feature in admin1_features:
        record = admin1_records.get(feature["properties"]["shapeID"])
        if record and record.get("phase3PlusFraction") is not None:
            draw_fill(draw, feature["geometry"], heat_color(record["phase3PlusFraction"]))

    OUTPUT_TEXTURE.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT_TEXTURE, optimize=True)
    print(f"Wrote {OUTPUT_TEXTURE} ({OUTPUT_TEXTURE.stat().st_size / 1_000_000:.1f} MB)")


def main() -> None:
    print("Reading source CSV (this takes a moment for admin1/admin2 rows)...")
    with SOURCE_CSV.open(encoding="utf-8-sig", newline="") as f:
        reader = list(csv.DictReader(f))

    # --- Admin0 ---
    admin0_period_rows = latest_current_rows(reader, "0")
    countries = build_admin0(admin0_period_rows, {})
    OUTPUT_ADMIN0_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_ADMIN0_JSON.write_text(
        json.dumps(
            {
                "source": "HDX HAPI - Food Security, Nutrition & Poverty: Food Security",
                "sourceUrl": "https://data.humdata.org/dataset/hdx-hapi-food-security",
                "countries": dict(sorted(countries.items())),
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(countries)} countries to {OUTPUT_ADMIN0_JSON}")

    # --- Admin1 ---
    admin1_period_rows = latest_current_rows(reader, "1")
    admin1_records, matched_features, unmatched = build_admin1(admin1_period_rows)

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
    print(f"\n{len(unmatched)} unmatched regions:")
    for line in unmatched:
        print(f"  - {line}")

    # --- Bake the heatmap texture ---
    country_geojson = json.loads(COUNTRY_GEOJSON.read_text(encoding="utf-8"))
    bake_heatmap_texture(country_geojson["features"], countries, matched_features, admin1_records)


if __name__ == "__main__":
    main()
