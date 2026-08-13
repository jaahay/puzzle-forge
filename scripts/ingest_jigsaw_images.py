from __future__ import annotations

import argparse
import hashlib
import io
import json
import platform
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


@dataclass(frozen=True)
class Artwork:
    asset_id: str
    object_id: int


# Together with the existing `wheat-field-cypresses` asset, these eleven works
# bring the bundled Jigsaw library to twelve images.
ARTWORKS = (
    Artwork("great-wave", 45434),
    Artwork("canal-in-venice", 437460),
    Artwork("gulf-stream", 11122),
    Artwork("cypresses", 437980),
    Artwork("roses", 436534),
    Artwork("view-of-toledo", 436575),
    Artwork("merced-river-yosemite", 10150),
    Artwork("canadian-rockies-lake-louise", 10149),
    Artwork("snowy-gorge", 56683),
    Artwork("carrara-marble-quarries", 12052),
    Artwork("self-portrait-dou", 436210),
)

DERIVATIVES = {
    "puzzle": {"max_dimension": 2048, "quality": 90},
    "preview": {"max_dimension": 1024, "quality": 86},
    "thumbnail": {"max_dimension": 384, "quality": 82},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Manually ingest verified public-domain Met artwork into the bundled "
            "Puzzle Forge Jigsaw image library."
        )
    )
    parser.add_argument(
        "--asset",
        action="append",
        choices=[artwork.asset_id for artwork in ARTWORKS],
        help="Ingest only the named configured asset. Repeat to select several.",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Validate Met records and print the plan without downloading image bytes.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Replace existing generated asset directories. Off by default.",
    )
    return parser.parse_args()


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": "puzzle-forge-artwork-ingestion/1"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def fetch_bytes(url: str) -> tuple[bytes, str]:
    request = urllib.request.Request(url, headers={"User-Agent": "puzzle-forge-artwork-ingestion/1"})
    with urllib.request.urlopen(request, timeout=120) as response:
        return response.read(), response.headers.get_content_type()


def validate_record(artwork: Artwork, record: dict) -> None:
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
        return normalized.convert("RGB"), "no embedded ICC profile; converted to RGB"

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


def main() -> int:
    args = parse_args()
    if not features.check("webp"):
        raise RuntimeError("This Pillow build does not include WebP support")

    repo_root = Path(__file__).resolve().parents[1]
    selected_ids = set(args.asset or [])
    selected = [
        artwork for artwork in ARTWORKS if not selected_ids or artwork.asset_id in selected_ids
    ]

    for artwork in selected:
        for destination in (
            repo_root / "public" / "jigsaw" / artwork.asset_id,
            repo_root / "assets" / "jigsaw" / artwork.asset_id,
        ):
            if destination.exists() and not args.overwrite:
                raise RuntimeError(
                    f"Target already exists: {destination}. Use --overwrite only when intentionally regenerating it."
                )

    print(f"Validating {len(selected)} Met records...")
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
