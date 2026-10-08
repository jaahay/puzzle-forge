from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit(
        'Pillow is required. Install it with: python -m pip install "Pillow==12.3.0"'
    ) from exc


SOURCE_MANIFEST_PATH = Path("assets/jigsaw/sources.json")
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
EXPECTED_DERIVATIVES = ("puzzle", "preview", "thumbnail")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verify committed Puzzle Forge artwork derivatives against provenance."
    )
    parser.add_argument(
        "asset_ids",
        nargs="*",
        metavar="ASSET_ID",
        help="One or more asset ids declared in assets/jigsaw/sources.json.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Verify every artwork declared in assets/jigsaw/sources.json.",
    )
    args = parser.parse_args()
    if args.all and args.asset_ids:
        parser.error("Use either --all or explicit ASSET_ID arguments, not both.")
    if not args.all and not args.asset_ids:
        parser.error("Specify one or more ASSET_ID arguments, or use --all.")
    return args


def load_manifest_ids(repo_root: Path) -> tuple[str, ...]:
    manifest_path = repo_root / SOURCE_MANIFEST_PATH
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        raise RuntimeError(
            f"Unsupported artwork source manifest schemaVersion: {manifest.get('schemaVersion')!r}"
        )

    entries = manifest.get("artworks")
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("Artwork source manifest must contain a non-empty artworks array")

    asset_ids: list[str] = []
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise RuntimeError("Every artwork source manifest entry must be an object")
        asset_id = entry.get("assetId")
        if not isinstance(asset_id, str) or not ASSET_ID_PATTERN.fullmatch(asset_id):
            raise RuntimeError(f"Invalid artwork assetId in source manifest: {asset_id!r}")
        if asset_id in seen:
            raise RuntimeError(f"Duplicate artwork assetId in source manifest: {asset_id}")
        seen.add(asset_id)
        asset_ids.append(asset_id)
    return tuple(asset_ids)


def select_asset_ids(manifest_ids: tuple[str, ...], args: argparse.Namespace) -> list[str]:
    if args.all:
        return list(manifest_ids)

    known = set(manifest_ids)
    unknown = [asset_id for asset_id in args.asset_ids if asset_id not in known]
    if unknown:
        raise RuntimeError(
            "Unknown artwork asset id(s): "
            + ", ".join(unknown)
            + ". Check assets/jigsaw/sources.json."
        )

    selected: list[str] = []
    seen: set[str] = set()
    for asset_id in args.asset_ids:
        if asset_id in seen:
            raise RuntimeError(f"Duplicate requested artwork asset id: {asset_id}")
        seen.add(asset_id)
        selected.append(asset_id)
    return selected


def verify_asset(repo_root: Path, asset_id: str) -> None:
    provenance_path = repo_root / "assets" / "jigsaw" / asset_id / "provenance.json"
    try:
        provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Missing provenance for {asset_id}: {provenance_path}") from exc

    if provenance.get("schemaVersion") != 1:
        raise RuntimeError(f"{asset_id}: unsupported provenance schemaVersion")
    if provenance.get("assetId") != asset_id:
        raise RuntimeError(f"{asset_id}: provenance assetId mismatch")

    rights = provenance.get("rights")
    if not isinstance(rights, dict) or rights.get("isPublicDomain") is not True:
        raise RuntimeError(f"{asset_id}: provenance is not verified public domain")

    derivatives = provenance.get("derivatives")
    if not isinstance(derivatives, dict):
        raise RuntimeError(f"{asset_id}: provenance has no derivatives object")
    if set(derivatives) != set(EXPECTED_DERIVATIVES):
        raise RuntimeError(
            f"{asset_id}: expected derivatives {EXPECTED_DERIVATIVES}, "
            f"found {tuple(derivatives)}"
        )

    for name in EXPECTED_DERIVATIVES:
        metadata = derivatives[name]
        if not isinstance(metadata, dict):
            raise RuntimeError(f"{asset_id}/{name}: invalid derivative metadata")

        expected_path = f"/jigsaw/{asset_id}/{name}.webp"
        if metadata.get("path") != expected_path:
            raise RuntimeError(
                f"{asset_id}/{name}: expected path {expected_path!r}, "
                f"found {metadata.get('path')!r}"
            )

        path = repo_root / "public" / expected_path.lstrip("/")
        try:
            payload = path.read_bytes()
        except FileNotFoundError as exc:
            raise RuntimeError(f"{asset_id}/{name}: missing derivative {path}") from exc

        actual_sha256 = hashlib.sha256(payload).hexdigest()
        if actual_sha256 != metadata.get("sha256"):
            raise RuntimeError(f"{asset_id}/{name}: SHA-256 mismatch")
        if len(payload) != metadata.get("byteSize"):
            raise RuntimeError(f"{asset_id}/{name}: byte-size mismatch")

        with Image.open(path) as image:
            image.load()
            if image.format != "WEBP":
                raise RuntimeError(f"{asset_id}/{name}: expected WebP, found {image.format!r}")
            if image.size != (metadata.get("width"), metadata.get("height")):
                raise RuntimeError(
                    f"{asset_id}/{name}: dimension mismatch; "
                    f"expected {(metadata.get('width'), metadata.get('height'))}, "
                    f"found {image.size}"
                )


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    manifest_ids = load_manifest_ids(repo_root)
    selected = select_asset_ids(manifest_ids, args)

    for asset_id in selected:
        verify_asset(repo_root, asset_id)
        print(f"VERIFIED {asset_id}")

    print(f"Verified {len(selected)} artwork asset(s), {len(selected) * 3} WebP derivatives.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
