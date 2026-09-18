#!/usr/bin/env python3
"""
ConnectomeBench — Codex Data Downloader
========================================
Downloads FlyWire FAFB v783 datasets from the official Codex portal.

Products downloaded:
  1. connections_princeton  (already may exist)
  2. consolidated_cell_types

Usage:
    export CODEX_API_TOKEN="your_token_here"
    python src/data/download_codex.py

Token source:
    Log in at https://codex.flywire.ai/
    Then visit: https://codex.flywire.ai/account
    Copy your API token from the Account page.

NEVER commit the token to Git.
NEVER hardcode the token in this script.
"""

import os
import sys
import json
import hashlib
import datetime
import pathlib
import urllib.request
import urllib.error

# ─── Configuration ────────────────────────────────────────────────────────────

DATASET = "fafb"
BASE_URL = "https://codex.flywire.ai"
DOWNLOAD_RESOURCE_ENDPOINT = f"{BASE_URL}/api/download_resource"

# Products we need for Phase 0 (dataset audit)
REQUIRED_PRODUCTS = [
    "connections_princeton",
    "consolidated_cell_types",
]

# Paths relative to project root
PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
RAW_DIR = PROJECT_ROOT / "data" / "raw"
METADATA_DIR = PROJECT_ROOT / "data" / "metadata"

MANIFEST_PATH = METADATA_DIR / "fafb_v783_manifest.json"

# ─── Helpers ──────────────────────────────────────────────────────────────────


def get_token() -> str:
    """Read CODEX_API_TOKEN from environment. Never from code."""
    token = os.environ.get("CODEX_API_TOKEN", "").strip()
    if not token:
        print(
            "\n[ERROR] CODEX_API_TOKEN is not set.\n"
            "\nTo obtain your token:\n"
            "  1. Sign in at https://codex.flywire.ai/\n"
            "  2. Go to https://codex.flywire.ai/account\n"
            "  3. Copy your API token\n"
            "  4. Run: export CODEX_API_TOKEN='<your_token>'\n"
            "  5. Then re-run this script.\n"
            "\nDO NOT commit the token to Git.\n"
        )
        sys.exit(1)
    return token


def sha256_of_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def file_size_human(path: pathlib.Path) -> str:
    size = path.stat().st_size
    for unit in ["B", "KB", "MB", "GB"]:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"


def count_lines_gz(path: pathlib.Path) -> int:
    """Count lines in a gzip CSV without loading it all into memory."""
    import gzip
    count = 0
    with gzip.open(path, "rb") as f:
        for _ in f:
            count += 1
    return count


def read_columns_gz(path: pathlib.Path) -> list[str]:
    """Read just the header line from a gzip CSV."""
    import gzip
    with gzip.open(path, "rt", encoding="utf-8", errors="replace") as f:
        header = f.readline().strip()
    return [c.strip() for c in header.split(",")]


def build_download_url(data_product: str, token: str) -> str:
    return (
        f"{DOWNLOAD_RESOURCE_ENDPOINT}"
        f"?data_product={data_product}"
        f"&dataset={DATASET}"
        f"&api_token={token}"
    )


def download_file(url: str, dest: pathlib.Path, token: str) -> None:
    """
    Stream-download a file from url to dest.
    The url already contains the token — do not log the url.
    """
    safe_url = url.split("&api_token=")[0] + "&api_token=***"
    print(f"  Downloading: {safe_url}")
    print(f"  Destination: {dest}")

    tmp_path = dest.with_suffix(".tmp")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ConnectomeBench/1.0"})
        with urllib.request.urlopen(req) as response, open(tmp_path, "wb") as out:
            total = response.headers.get("Content-Length")
            downloaded = 0
            while chunk := response.read(65536):
                out.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / int(total) * 100
                    print(f"\r  {pct:.1f}%  ({downloaded // 1024 // 1024} MB)", end="", flush=True)
        print()
        tmp_path.rename(dest)
        print(f"  ✓ Saved: {dest.name}")
    except urllib.error.HTTPError as e:
        if tmp_path.exists():
            tmp_path.unlink()
        print(f"\n[ERROR] HTTP {e.code}: {e.reason}")
        if e.code == 401:
            print("  → Token is missing or invalid.")
            print("  → Get yours from: https://codex.flywire.ai/account")
        elif e.code == 404:
            print(f"  → data_product '{url.split('data_product=')[1].split('&')[0]}' not found.")
            print("  → Check https://codex.flywire.ai/api/download?dataset=fafb for valid products.")
        sys.exit(1)
    except Exception as e:
        if tmp_path.exists():
            tmp_path.unlink()
        print(f"\n[ERROR] Download failed: {e}")
        sys.exit(1)


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r") as f:
            return json.load(f)
    return {}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  ✓ Manifest updated: {MANIFEST_PATH}")


# ─── Main ─────────────────────────────────────────────────────────────────────


def main():
    print("=" * 64)
    print("ConnectomeBench — Codex Data Downloader")
    print(f"Dataset: FlyWire FAFB v783")
    print(f"Source:  {BASE_URL}")
    print("=" * 64)

    # Disk check
    import shutil
    total, used, free = shutil.disk_usage(str(RAW_DIR))
    free_gb = free / 1024**3
    print(f"\n[Disk] Free space: {free_gb:.1f} GB")
    if free_gb < 2.0:
        print("[WARNING] Less than 2 GB free. Downloads may fail.")

    token = get_token()
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    METADATA_DIR.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest()

    for product in REQUIRED_PRODUCTS:
        print(f"\n{'─' * 56}")
        print(f"Product: {product}")

        filename = f"{product}.csv.gz"
        dest = RAW_DIR / filename

        # ── Check if file already exists ──────────────────────────────
        if dest.exists():
            print(f"  File exists: {dest}")
            existing_hash = sha256_of_file(dest)
            print(f"  SHA256: {existing_hash}")

            # Check if manifest has a recorded hash for this product
            recorded = manifest.get(product, {}).get("sha256")
            if recorded and recorded != existing_hash:
                print(f"  [WARNING] Hash mismatch!")
                print(f"    Recorded: {recorded}")
                print(f"    Current:  {existing_hash}")
                print(f"  → File will NOT be overwritten automatically.")
                print(f"  → Delete {dest.name} manually if you want to re-download.")
                continue
            elif recorded and recorded == existing_hash:
                print(f"  ✓ Hash matches manifest — file is intact. Skipping download.")
            else:
                print(f"  ✓ File exists (no prior hash in manifest). Skipping download.")
                print(f"  → Will validate and record metadata.")
        else:
            # ── Download ──────────────────────────────────────────────
            url = build_download_url(product, token)
            download_file(url, dest, token)

        # ── Validate and record metadata ──────────────────────────────
        print(f"  Validating {dest.name} ...")
        file_hash = sha256_of_file(dest)
        size_bytes = dest.stat().st_size
        size_human = file_size_human(dest)

        try:
            columns = read_columns_gz(dest)
            print(f"  Columns ({len(columns)}): {columns}")
        except Exception as e:
            columns = []
            print(f"  [WARNING] Could not read columns: {e}")

        try:
            print(f"  Counting rows (may take a moment)...")
            n_rows = count_lines_gz(dest)
            n_data_rows = n_rows - 1  # subtract header
            print(f"  Rows (incl. header): {n_rows:,}")
            print(f"  Data rows:           {n_data_rows:,}")
        except Exception as e:
            n_rows = -1
            n_data_rows = -1
            print(f"  [WARNING] Could not count rows: {e}")

        # ── Update manifest (NO token stored) ─────────────────────────
        manifest[product] = {
            "dataset": "FAFB",
            "version": "783",
            "source": "FlyWire / Codex",
            "data_product": product,
            "filename": filename,
            "path": str(dest),
            "url_base": f"{DOWNLOAD_RESOURCE_ENDPOINT}?data_product={product}&dataset={DATASET}",
            "download_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "size_bytes": size_bytes,
            "size_human": size_human,
            "sha256": file_hash,
            "row_count_raw": n_rows,
            "data_row_count": n_data_rows,
            "columns": columns,
            "note": "api_token NOT stored here — use CODEX_API_TOKEN env var",
        }

        print(f"  ✓ {product}: SHA256={file_hash[:16]}...  Size={size_human}")
        save_manifest(manifest)

    # ── Final summary ──────────────────────────────────────────────────────────
    print(f"\n{'=' * 64}")
    print("FINAL SUMMARY")
    print(f"{'=' * 64}")
    print(f"Dataset:  FlyWire FAFB v783")
    print(f"Manifest: {MANIFEST_PATH}")
    print()

    for product, info in manifest.items():
        print(f"  [{product}]")
        print(f"    File:    {info['filename']}")
        print(f"    Size:    {info.get('size_human', 'unknown')}")
        print(f"    SHA256:  {info.get('sha256', 'unknown')[:32]}...")
        print(f"    Rows:    {info.get('data_row_count', '?'):,} (data rows)")
        print(f"    Columns: {info.get('columns', [])}")
        print()

    print("✓ No API token was saved to disk.")
    print("✓ Raw files were not overwritten if already intact.")
    print("✓ Next step: run notebooks/00_dataset_audit.ipynb")
    print()


if __name__ == "__main__":
    main()
