#!/usr/bin/env python3
"""
ConnectomeBench — Dataset Validator
=====================================
Validates locally existing FlyWire FAFB v783 files WITHOUT downloading anything.

Use this script to:
  - Check if data/raw/ files are intact
  - Print columns, shape, dtypes
  - Update the manifest with current metadata

Usage:
    python src/data/validate_local.py
"""

import json
import hashlib
import gzip
import pathlib
import datetime

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW_DIR = PROJECT_ROOT / "data" / "raw"
METADATA_DIR = PROJECT_ROOT / "data" / "metadata"
MANIFEST_PATH = METADATA_DIR / "fafb_v783_manifest.json"

EXPECTED_CONNECTIONS_COLS = {"pre_root_id", "post_root_id", "neuropil", "syn_count", "nt_type"}


def sha256_of_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def inspect_gz_csv(path: pathlib.Path) -> dict:
    """Read header and count rows without loading full file into memory."""
    columns = []
    n_rows = 0
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f):
            if i == 0:
                columns = [c.strip() for c in line.strip().split(",")]
            n_rows += 1
    return {
        "columns": columns,
        "n_rows_total": n_rows,
        "n_data_rows": n_rows - 1,
    }


def validate_file(path: pathlib.Path, product: str) -> dict:
    print(f"\n{'─' * 56}")
    print(f"  Product:  {product}")
    print(f"  File:     {path}")

    if not path.exists():
        print(f"  ✗ NOT FOUND")
        return {}

    size = path.stat().st_size
    size_human = f"{size / 1024 / 1024:.1f} MB"
    print(f"  Size:     {size_human} ({size:,} bytes)")

    print(f"  Computing SHA256...")
    file_hash = sha256_of_file(path)
    print(f"  SHA256:   {file_hash}")

    print(f"  Reading header & counting rows...")
    info = inspect_gz_csv(path)
    columns = info["columns"]
    n_data = info["n_data_rows"]

    print(f"  Columns ({len(columns)}): {columns}")
    print(f"  Data rows: {n_data:,}")

    # Column validation for connections_princeton
    if product == "connections_princeton":
        missing = EXPECTED_CONNECTIONS_COLS - set(columns)
        if missing:
            print(f"  [WARNING] Missing expected columns: {missing}")
        else:
            print(f"  ✓ All expected columns present: {EXPECTED_CONNECTIONS_COLS}")

    # Check for root_id column in cell types
    if product == "consolidated_cell_types":
        root_col = [c for c in columns if "root_id" in c.lower()]
        if root_col:
            print(f"  ✓ root_id column found: {root_col}")
        else:
            print(f"  [WARNING] No column matching 'root_id' found. Inspect manually.")

    return {
        "dataset": "FAFB",
        "version": "783",
        "source": "FlyWire / Codex",
        "data_product": product,
        "filename": path.name,
        "path": str(path),
        "url_base": f"https://codex.flywire.ai/api/download_resource?data_product={product}&dataset=fafb",
        "validated_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
        "size_bytes": size,
        "size_human": size_human,
        "sha256": file_hash,
        "row_count_raw": info["n_rows_total"],
        "data_row_count": n_data,
        "columns": columns,
        "note": "api_token NOT stored here — use CODEX_API_TOKEN env var",
    }


def main():
    print("=" * 64)
    print("ConnectomeBench — Local Dataset Validator")
    print("=" * 64)
    print(f"Raw dir: {RAW_DIR}")
    print(f"Files present:")

    raw_files = sorted(RAW_DIR.glob("*.csv.gz"))
    if not raw_files:
        print("  (none)")
    else:
        for f in raw_files:
            print(f"  {f.name}  ({f.stat().st_size / 1024 / 1024:.1f} MB)")

    manifest = {}
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH) as f:
            manifest = json.load(f)

    products_to_check = [
        ("connections_princeton", RAW_DIR / "connections_princeton.csv.gz"),
        ("consolidated_cell_types", RAW_DIR / "consolidated_cell_types.csv.gz"),
    ]

    for product, path in products_to_check:
        result = validate_file(path, product)
        if result:
            manifest[product] = result

    METADATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n{'=' * 64}")
    print(f"Manifest saved: {MANIFEST_PATH}")
    print(f"✓ No token stored.")
    print(f"✓ No raw files modified.")


if __name__ == "__main__":
    main()
