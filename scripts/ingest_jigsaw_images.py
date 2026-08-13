from __future__ import annotations

import argparse
import hashlib
import io
import json
import platform
import re
import shutil
import sys
import tempfile
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

try:
    import PIL
    from PIL import Image, ImageCms, ImageOps, features
except ImportError as exc:
    raise SystemExit(
        'Pillow is required. Install it with: python -m pip install "Pillow==12.3.0"'
    ) from exc


MET_OBJECT_API = "https://collectionapi.metmuseum.org/public/collection/v1/objects/{object_id}"
MET_OPEN_ACCESS_POLICY = "https://www.metmuseum.org/hubs/open-access"
SOURCE_MANIFEST_PATH = Path("assets/jigsaw/sources.json")
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass(frozen=True)
class Artwork:
    asset_id: str
    provider: str
    object_id: int


DERIVATIVES = {
    "puzzle": {"max_dimension": 2048, "quality": 90},
    "preview": {"max_dimension": 1024, "quality": 86},
    "thumbnail": {"max_dimension": 384, "quality": 82},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Manually ingest verified public-domain artwork into the bundled "
            "Puzzle Forge Jigsaw image library."
        )
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
        help="Process every artwork declared in assets/jigsaw/sources.json.",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Validate source records and print the plan without downloading image bytes.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing generated asset directories. Off by default.",
    )
    args = parser.parse_args()
    if args.all and args.asset_ids:
        parser.error("Use either --all or explicit ASSET_ID arguments, not both.")
    if not args.all and not args.asset_ids:
        parser.error("Specify one or more ASSET_ID arguments, or use --all.")
    return args


def load_artworks(repo_root: Path) -> tuple[Artwork, ...]:
    manifest_path = repo_root / SOURCE_MANIFEST_PATH
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise RuntimeError(f"Missing Jigsaw source manifest: {manifest_path}") from exc

    if manifest.get("schemaVersion") != 1:
        raise RuntimeError(
            f"Unsupported Jigsaw source manifest schemaVersion: {manifest.get('schemaVersion')!r}"
        )

    entries = manifest.get("artworks")
    if not isinstance(entries, list) or not entries:
        raise RuntimeError("Jigsaw source manifest must contain a non-empty artworks array")

    artworks: list[Artwork] = []
    seen_ids: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict):
            raise RuntimeError("Every Jigsaw source manifest entry must be an object")

        asset_id = entry.get("assetId")
        provider = entry.get("provider")
        object_id = entry.get("objectId")

        if not isinstance(asset_id, str) or not ASSET_ID_PATTERN.fullmatch(asset_id):
            raise RuntimeError(f"Invalid Jigsaw assetId in source manifest: {asset_id!r}")
        if asset_id in seen_ids:
            raise RuntimeError(f"Duplicate Jigsaw assetId in source manifest: {asset_id}")
        if provider != "met":
            raise RuntimeError(f"Unsupported Jigsaw source provider for {asset_id}: {provider!r}")
        if not isinstance(object_id, int) or object_id <= 0:
            raise RuntimeError(f"Invalid Met objectId for {asset_id}: {object_id!r}")

        seen_ids.add(asset_id)
        artworks.append(Artwork(asset_id=asset_id, provider=provider, object_id=object_id))

    return tuple(artworks)


def select_artworks(artworks: tuple[Artwork, ...], args: argparse.Namespace) -> list[Artwork]:
    if args.all:
        return list(artworks)

    by_id = {artwork.asset_id: artwork for artwork in artworks}
    unknown = [asset_id for asset_id in args.asset_ids if asset_id not in by_id]
    if unknown:
        raise RuntimeError(
            "Unknown Jigsaw asset id(s): " + ", ".join(unknown) + ". Check assets/jigsaw/sources.json."
        )

    requested = set(args.asset_ids)
    return [artwork for artwork in artworks if artwork.asset_id in requested]


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "puzzle-forge-artwork-ingestion/1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def fetch_bytes(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "puzzle-forge-artwork-ingestion/1"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read(), response.headers.get_content_type()


def validate_record(artwork: Artwork, record: dict) -> None:
    if artwork.provider != "met":
        raise RuntimeError(f"Unsupported source provider: {artwork.provider}")
    if record.get("objectID") != artwork.object_id:
        raise RuntimeError(
            f"Met object mismatch for {artwork.asset_id}: expected {artwork.object_id}, "
            f"received {record.get('objectID')!r}"
        )
    if record.get("isPublicDomain") is not True:
        raise RuntimeError(f"Met object {artwork.object_id} is not marked public domain")
    if not record.get("primaryImage"):
        raise RuntimeError(f"Met object {artwork.object_id} has no downloadable primary image")
    if not record.get("objectURL"):
        raise RuntimeError(f"Met object {artwork.object_id} has no canonical object URL")


def to_srgb(opened: Image.Image) -> tuple[Image.Image, str]:
    icc_bytes = opened.info.get("icc_profile")
    normalized = ImageOps.exif_transpose(opened)
    if not icc_bytes:
        return normalized.convert("RGB"), "no embedded ICC profile; assumed sRGB after RGB conversion"

    try:
        source_profile = ImageCms.ImageCmsProfile(io.BytesIO(icc_bytes))
        srgb_profile = ImageCms.createProfile("sRGB")
        converted = ImageCms.profileToProfile(
            normalized,
            source_profile,
            srgb_profile,
            outputMode="RGB",
        )
        return converted, "embedded ICC profile converted to sRGB"
    except Exception as exc:
        raise RuntimeError(f"Could not convert embedded ICC profile to sRGB: {exc}") from exc


def build_asset(
    artwork: Artwork,
    record: dict,
    staging_root: Path,
    retrieved_at: datetime,
) -> dict:
    source_url = record["primaryImage"]
    source_bytes, mime_type = fetch_bytes(source_url)
    source_sha256 = hashlib.sha256(source_bytes).hexdigest()

    public_dir = staging_root / "public" / "jigsaw" / artwork.asset_id
    provenance_dir = staging_root / "assets" / "jigsaw" / artwork.asset_id
    public_dir.mkdir(parents=True, exist_ok=True)
    provenance_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(io.BytesIO(source_bytes)) as opened:
        image, color_management = to_srgb(opened)
        source_width, source_height = image.size
        generated: dict[str, dict] = {}

        for name, recipe in DERIVATIVES.items():
            derivative = image.copy()
            derivative.thumbnail(
                (recipe["max_dimension"], recipe["max_dimension"]),
                Image.Resampling.LANCZOS,
            )
            output_path = public_dir / f"{name}.webp"
            derivative.save(
                output_path,
                format="WEBP",
                quality=recipe["quality"],
                method=6,
            )
            output_bytes = output_path.read_bytes()
            generated[name] = {
                "path": f"/jigsaw/{artwork.asset_id}/{name}.webp",
                "width": derivative.width,
                "height": derivative.height,
                "byteSize": len(output_bytes),
                "sha256": hashlib.sha256(output_bytes).hexdigest(),
                "recipe": {
                    "maxDimension": recipe["max_dimension"],
                    "resizeMode": "contain",
                    "resampling": "Lanczos",
                    "crop": "none",
                    "outputColorMode": "sRGB",
                    "format": "WebP",
                    "quality": recipe["quality"],
                    "method": 6,
                },
            }

    provenance = {
        "schemaVersion": 1,
        "assetId": artwork.asset_id,
        "assetRevision": 1,
        "work": {
            "title": record.get("title"),
            "creator": record.get("artistDisplayName"),
            "date": record.get("objectDate"),
            "medium": record.get("medium"),
            "dimensions": record.get("dimensions"),
        },
        "source": {
            "institution": "The Metropolitan Museum of Art",
            "objectId": artwork.object_id,
            "accessionNumber": record.get("accessionNumber"),
            "recordUrl": record.get("objectURL"),
            "apiRecordUrl": MET_OBJECT_API.format(object_id=artwork.object_id),
            "sourceImageUrl": source_url,
            "retrievedAt": retrieved_at.isoformat(),
            "mimeType": mime_type,
            "byteSize": len(source_bytes),
            "sha256": source_sha256,
            "width": source_width,
            "height": source_height,
        },
        "rights": {
            "isPublicDomain": True,
            "policy": "The Met Open Access",
            "policyUrl": MET_OPEN_ACCESS_POLICY,
            "verification": (
                f"The Met object API returned isPublicDomain=true for object {artwork.object_id}."
            ),
            "reviewedAt": retrieved_at.date().isoformat(),
        },
        "generation": {
            "pythonVersion": platform.python_version(),
            "encoder": "Pillow",
            "encoderVersion": PIL.__version__,
            "exifOrientation": "normalized",
            "colorManagement": color_management,
            "sourceColorConversion": "sRGB",
        },
        "derivatives": generated,
    }
    (provenance_dir / "provenance.json").write_text(
        json.dumps(provenance, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return provenance


def publish_asset(repo_root: Path, staging_root: Path, artwork: Artwork, overwrite: bool) -> None:
    pairs = (
        (
            staging_root / "public" / "jigsaw" / artwork.asset_id,
            repo_root / "public" / "jigsaw" / artwork.asset_id,
        ),
        (
            staging_root / "assets" / "jigsaw" / artwork.asset_id,
            repo_root / "assets" / "jigsaw" / artwork.asset_id,
        ),
    )
    for source, destination in pairs:
        if destination.exists():
            if not overwrite:
                raise RuntimeError(f"Refusing to overwrite existing directory: {destination}")
            shutil.rmtree(destination)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source, destination)


def ensure_targets_available(repo_root: Path, selected: list[Artwork], overwrite: bool) -> None:
    if overwrite:
        return

    for artwork in selected:
        for destination in (
            repo_root / "public" / "jigsaw" / artwork.asset_id,
            repo_root / "assets" / "jigsaw" / artwork.asset_id,
        ):
            if destination.exists():
                raise RuntimeError(
                    f"Target already exists: {destination}. Use --overwrite only when intentionally regenerating it."
                )


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    artworks = load_artworks(repo_root)
    selected = select_artworks(artworks, args)

    if not args.verify_only:
        if not features.check("webp"):
            raise RuntimeError("This Pillow build does not include WebP support")
        ensure_targets_available(repo_root, selected, args.overwrite)

    print(f"Validating {len(selected)} source records...")
    records: dict[str, dict] = {}
    for artwork in selected:
        api_url = MET_OBJECT_API.format(object_id=artwork.object_id)
        record = fetch_json(api_url)
        validate_record(artwork, record)
        records[artwork.asset_id] = record
        print(
            f"  OK {artwork.asset_id}: {record.get('artistDisplayName')} — {record.get('title')} "
            f"(Met {artwork.object_id})"
        )

    if args.verify_only:
        print("Verification complete; no image bytes were downloaded and no repository files were written.")
        return 0

    retrieved_at = datetime.now(timezone.utc)
    summaries: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="puzzle-forge-jigsaw-") as temporary:
        staging_root = Path(temporary)
        print(f"Downloading and generating {len(selected)} assets...")
        for artwork in selected:
            provenance = build_asset(
                artwork,
                records[artwork.asset_id],
                staging_root,
                retrieved_at,
            )
            summaries.append(provenance)
            print(f"  BUILT {artwork.asset_id}")

        print("Publishing generated files into the repository...")
        for artwork in selected:
            publish_asset(repo_root, staging_root, artwork, args.overwrite)
            print(f"  WROTE {artwork.asset_id}")

    print("\nGenerated assets:")
    for provenance in summaries:
        derivative = provenance["derivatives"]["puzzle"]
        print(
            f"  {provenance['assetId']}: {derivative['width']}x{derivative['height']} "
            f"puzzle WebP, sha256={derivative['sha256']}"
        )
    print("\nReview the new files with `git status` and `git diff -- assets/jigsaw` before committing.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
