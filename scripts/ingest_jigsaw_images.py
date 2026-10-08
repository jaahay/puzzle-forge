from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import platform
import re
import shutil
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import unicodedata
import xml.etree.ElementTree as ET
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
ARTIC_OBJECT_API = "https://api.artic.edu/api/v1/artworks/{object_id}"
ARTIC_COPYRIGHT_POLICY = "https://api.artic.edu/docs/#copyright"
ARTIC_FIELDS = (
    "id",
    "title",
    "artist_display",
    "date_display",
    "medium_display",
    "dimensions",
    "main_reference_number",
    "image_id",
    "is_public_domain",
)
RIJKS_SEARCH_API = "https://data.rijksmuseum.nl/search/collection"
RIJKS_OAI_API = "https://data.rijksmuseum.nl/oai"
RIJKS_DATA_POLICY = "https://data.rijksmuseum.nl/policy/"
RIJKS_PUBLIC_RIGHTS = frozenset(
    {
        "http://creativecommons.org/publicdomain/mark/1.0/",
        "https://creativecommons.org/publicdomain/mark/1.0/",
        "http://creativecommons.org/publicdomain/zero/1.0/",
        "https://creativecommons.org/publicdomain/zero/1.0/",
    }
)
NGA_OPEN_DATA_RAW = "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data"
NGA_OPEN_DATA_REPO = "https://github.com/NationalGalleryOfArt/opendata"
NGA_OPEN_ACCESS_POLICY = "https://www.nga.gov/artworks/free-images-and-open-access"
_NGA_CSV_CACHE: dict[str, tuple[dict[str, str], ...]] = {}
SMITHSONIAN_OBJECT_URL = "https://www.si.edu/object/{record_id}"
SMITHSONIAN_CONTENT_API = (
    "https://api.si.edu/openaccess/api/v1.0/content/edanmdm:{record_id}"
)
SMITHSONIAN_PUBLIC_DEMO_KEY = "DEMO_KEY"
SMITHSONIAN_OPEN_ACCESS_POLICY = "https://www.si.edu/openaccess"
SMITHSONIAN_INSTITUTIONS = {
    "nasm": "National Air and Space Museum",
    "nmah": "National Museum of American History",
    "chndm": "Cooper Hewitt, Smithsonian Design Museum",
    "nmnheducation": "National Museum of Natural History",
    "nmnhpaleobiology": "National Museum of Natural History",
}
SOURCE_MANIFEST_PATH = Path("assets/jigsaw/sources.json")
ASSET_ID_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SUPPORTED_PROVIDERS = frozenset({"met", "artic", "rijksmuseum", "nga", "smithsonian"})


@dataclass(frozen=True)
class Artwork:
    asset_id: str
    provider: str
    source_id: int | str


@dataclass(frozen=True)
class SourceRecord:
    provider: str
    title: str | None
    creator: str | None
    date: str | None
    medium: str | None
    dimensions: str | None
    institution: str
    accession_number: str | None
    record_url: str
    api_record_url: str
    source_image_url: str
    rights_policy: str
    rights_policy_url: str
    rights_verification: str


DERIVATIVES = {
    "puzzle": {"max_dimension": 2048, "quality": 90},
    "preview": {"max_dimension": 1024, "quality": 86},
    "thumbnail": {"max_dimension": 384, "quality": 82},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ingest verified public-domain artwork into the bundled Puzzle Forge image library."
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

        if not isinstance(asset_id, str) or not ASSET_ID_PATTERN.fullmatch(asset_id):
            raise RuntimeError(f"Invalid Jigsaw assetId in source manifest: {asset_id!r}")
        if asset_id in seen_ids:
            raise RuntimeError(f"Duplicate Jigsaw assetId in source manifest: {asset_id}")
        if provider not in SUPPORTED_PROVIDERS:
            raise RuntimeError(f"Unsupported Jigsaw source provider for {asset_id}: {provider!r}")

        if provider == "rijksmuseum":
            source_id = entry.get("objectNumber")
            if not isinstance(source_id, str) or not source_id.strip():
                raise RuntimeError(f"Invalid Rijksmuseum objectNumber for {asset_id}: {source_id!r}")
        elif provider == "smithsonian":
            source_id = entry.get("recordId")
            if (
                not isinstance(source_id, str)
                or not re.fullmatch(r"[a-z0-9]+_[A-Za-z0-9._-]+", source_id)
            ):
                raise RuntimeError(
                    f"Invalid Smithsonian recordId for {asset_id}: {source_id!r}"
                )
        else:
            source_id = entry.get("objectId")
            if not isinstance(source_id, int) or source_id <= 0:
                raise RuntimeError(f"Invalid {provider} objectId for {asset_id}: {source_id!r}")

        seen_ids.add(asset_id)
        artworks.append(Artwork(asset_id=asset_id, provider=provider, source_id=source_id))

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


def request_headers(provider: str) -> dict[str, str]:
    headers = {"User-Agent": "puzzle-forge-artwork-ingestion/2"}
    if provider == "artic":
        headers["AIC-User-Agent"] = "puzzle-forge (https://github.com/jaahay/puzzle-forge)"
    return headers


def fetch_json(url: str, provider: str) -> dict:
    request = urllib.request.Request(url, headers=request_headers(provider))
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"{provider} request failed with HTTP {exc.code}: {url}"
        ) from exc


def fetch_bytes(url: str, provider: str) -> tuple[bytes, str]:
    request = urllib.request.Request(url, headers=request_headers(provider))
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read(), response.headers.get_content_type()
    except urllib.error.HTTPError as exc:
        raise RuntimeError(
            f"{provider} request failed with HTTP {exc.code}: {url}"
        ) from exc


def resolve_linked_art_creator(record: dict) -> str | None:
    production = record.get("produced_by")
    if not isinstance(production, dict):
        return None
    for part in production.get("part", []):
        if not isinstance(part, dict):
            continue
        for actor in part.get("carried_out_by", []):
            if not isinstance(actor, dict):
                continue
            for notation in actor.get("notation", []):
                if (
                    isinstance(notation, dict)
                    and notation.get("@language") == "en"
                    and isinstance(notation.get("@value"), str)
                    and notation["@value"]
                ):
                    return notation["@value"]
            label = actor.get("_label")
            if isinstance(label, str) and label:
                return label
    return None


def rijks_data_uri(uri: str) -> str:
    prefix = "https://id.rijksmuseum.nl/"
    if not uri.startswith(prefix):
        raise RuntimeError(f"Unexpected Rijksmuseum persistent identifier: {uri}")
    return "https://data.rijksmuseum.nl/" + uri.removeprefix(prefix)


def first_linked_id(record: dict, field: str, label: str) -> str:
    values = record.get(field)
    if not isinstance(values, list):
        raise RuntimeError(f"Rijksmuseum {label} has no {field} links")
    for value in values:
        if isinstance(value, dict):
            linked_id = value.get("id")
            if isinstance(linked_id, str) and linked_id:
                return linked_id
    raise RuntimeError(f"Rijksmuseum {label} has no usable {field} link")


def resolve_met_source(artwork: Artwork) -> SourceRecord:
    if not isinstance(artwork.source_id, int):
        raise RuntimeError(f"Met source identifier must be an integer: {artwork.source_id!r}")
    api_url = MET_OBJECT_API.format(object_id=artwork.source_id)
    record = fetch_json(api_url, artwork.provider)

    if record.get("objectID") != artwork.source_id:
        raise RuntimeError(
            f"Met object mismatch for {artwork.asset_id}: expected {artwork.source_id}, "
            f"received {record.get('objectID')!r}"
        )
    if record.get("isPublicDomain") is not True:
        raise RuntimeError(f"Met object {artwork.source_id} is not marked public domain")
    if not record.get("primaryImage"):
        raise RuntimeError(f"Met object {artwork.source_id} has no downloadable primary image")
    if not record.get("objectURL"):
        raise RuntimeError(f"Met object {artwork.source_id} has no canonical object URL")

    return SourceRecord(
        provider=artwork.provider,
        title=record.get("title"),
        creator=record.get("artistDisplayName"),
        date=record.get("objectDate"),
        medium=record.get("medium"),
        dimensions=record.get("dimensions"),
        institution="The Metropolitan Museum of Art",
        accession_number=record.get("accessionNumber"),
        record_url=record["objectURL"],
        api_record_url=api_url,
        source_image_url=record["primaryImage"],
        rights_policy="The Met Open Access",
        rights_policy_url=MET_OPEN_ACCESS_POLICY,
        rights_verification=(
            f"The Met object API returned isPublicDomain=true for object {artwork.source_id}."
        ),
    )


def resolve_artic_source(artwork: Artwork) -> SourceRecord:
    if not isinstance(artwork.source_id, int):
        raise RuntimeError(f"Art Institute source identifier must be an integer: {artwork.source_id!r}")
    canonical_api_url = ARTIC_OBJECT_API.format(object_id=artwork.source_id)
    api_url = canonical_api_url + "?fields=" + ",".join(ARTIC_FIELDS)
    response = fetch_json(api_url, artwork.provider)
    record = response.get("data")
    config = response.get("config")

    if not isinstance(record, dict):
        raise RuntimeError(f"Art Institute artwork {artwork.source_id} returned no data object")
    if record.get("id") != artwork.source_id:
        raise RuntimeError(
            f"Art Institute object mismatch for {artwork.asset_id}: expected {artwork.source_id}, "
            f"received {record.get('id')!r}"
        )
    if record.get("is_public_domain") is not True:
        raise RuntimeError(f"Art Institute artwork {artwork.source_id} is not marked public domain")
    image_id = record.get("image_id")
    if not isinstance(image_id, str) or not image_id:
        raise RuntimeError(f"Art Institute artwork {artwork.source_id} has no downloadable primary image")
    if not isinstance(config, dict):
        raise RuntimeError(f"Art Institute artwork {artwork.source_id} returned no API config")
    iiif_url = config.get("iiif_url")
    if not isinstance(iiif_url, str) or not iiif_url.startswith("https://"):
        raise RuntimeError(f"Art Institute artwork {artwork.source_id} returned no HTTPS IIIF base URL")

    source_image_url = f"{iiif_url.rstrip('/')}/{image_id}/full/1686,/0/default.jpg"
    return SourceRecord(
        provider=artwork.provider,
        title=record.get("title"),
        creator=record.get("artist_display"),
        date=record.get("date_display"),
        medium=record.get("medium_display"),
        dimensions=record.get("dimensions"),
        institution="Art Institute of Chicago",
        accession_number=record.get("main_reference_number"),
        record_url=f"https://www.artic.edu/artworks/{artwork.source_id}",
        api_record_url=canonical_api_url,
        source_image_url=source_image_url,
        rights_policy="Art Institute of Chicago public-domain designation",
        rights_policy_url=ARTIC_COPYRIGHT_POLICY,
        rights_verification=(
            f"Art Institute API returned is_public_domain=true for artwork {artwork.source_id}."
        ),
    )


def resolve_rijksmuseum_source(artwork: Artwork) -> SourceRecord:
    if not isinstance(artwork.source_id, str):
        raise RuntimeError(f"Rijksmuseum source identifier must be an object number: {artwork.source_id!r}")
    object_number = artwork.source_id

    search_url = RIJKS_SEARCH_API + "?" + urllib.parse.urlencode({"objectNumber": object_number})

    oai_ns = "http://www.openarchives.org/OAI/2.0/"
    dc_ns = "http://purl.org/dc/elements/1.1/"
    dcterms_ns = "http://purl.org/dc/terms/"
    edm_ns = "http://www.europeana.eu/schemas/edm/"
    rdf_resource = "{http://www.w3.org/1999/02/22-rdf-syntax-ns#}resource"

    persistent_uri = None
    object_data_uri = None
    edm_root = None
    candidate_identifiers: list[list[str]] = []
    current_search_url: str | None = search_url

    while current_search_url and edm_root is None:
        search = fetch_json(current_search_url, artwork.provider)
        items = search.get("orderedItems")
        if not isinstance(items, list):
            raise RuntimeError(
                f"Rijksmuseum search returned invalid orderedItems for {object_number}"
            )

        for item in items:
            candidate_uri = item.get("id") if isinstance(item, dict) else None
            if not isinstance(candidate_uri, str):
                continue

            candidate_oai_url = RIJKS_OAI_API + "?" + urllib.parse.urlencode(
                {
                    "verb": "GetRecord",
                    "metadataPrefix": "edm",
                    "identifier": candidate_uri,
                }
            )
            candidate_bytes, _ = fetch_bytes(candidate_oai_url, artwork.provider)
            try:
                candidate_root = ET.fromstring(candidate_bytes)
            except ET.ParseError as exc:
                raise RuntimeError(
                    f"Could not parse Rijksmuseum EDM candidate for {object_number}"
                ) from exc

            error = candidate_root.find(f".//{{{oai_ns}}}error")
            if error is not None:
                continue

            identifiers = [
                element.text.strip()
                for element in candidate_root.findall(f".//{{{dc_ns}}}identifier")
                if isinstance(element.text, str) and element.text.strip()
            ]
            candidate_identifiers.append(identifiers)
            if object_number not in identifiers:
                continue

            persistent_uri = candidate_uri
            object_data_uri = rijks_data_uri(candidate_uri)
            edm_root = candidate_root
            break

        if edm_root is not None:
            break

        next_page = search.get("next")
        next_id = next_page.get("id") if isinstance(next_page, dict) else None
        current_search_url = next_id if isinstance(next_id, str) and next_id else None

    if persistent_uri is None or object_data_uri is None or edm_root is None:
        raise RuntimeError(
            f"Rijksmuseum search returned no exact object-number match for {object_number}; "
            f"candidate identifiers were {candidate_identifiers!r}"
        )

    rights_element = edm_root.find(f".//{{{edm_ns}}}rights")
    rights_uri = rights_element.get(rdf_resource) if rights_element is not None else None
    if rights_uri not in RIJKS_PUBLIC_RIGHTS:
        raise RuntimeError(
            f"Rijksmuseum object {object_number} is not marked Public Domain/CC0: {rights_uri!r}"
        )

    title_elements = edm_root.findall(f".//{{{dc_ns}}}title")
    title = None
    for element in title_elements:
        language = element.get("{http://www.w3.org/XML/1998/namespace}lang")
        if language == "en" and isinstance(element.text, str) and element.text.strip():
            title = element.text.strip()
            break
    if title is None:
        title = next(
            (
                element.text.strip()
                for element in title_elements
                if isinstance(element.text, str) and element.text.strip()
            ),
            None,
        )

    date_element = edm_root.find(f".//{{{dcterms_ns}}}created")
    date = date_element.text.strip() if date_element is not None and date_element.text else None
    medium_element = edm_root.find(f".//{{{dcterms_ns}}}medium")
    medium = medium_element.text.strip() if medium_element is not None and medium_element.text else None
    extent_element = edm_root.find(f".//{{{dcterms_ns}}}extent")
    dimensions = extent_element.text.strip() if extent_element is not None and extent_element.text else None

    object_record = fetch_json(object_data_uri + "?_profile=la-framed", artwork.provider)
    creator = resolve_linked_art_creator(object_record)
    if creator is None:
        creator_element = edm_root.find(f".//{{{dc_ns}}}creator")
        if (
            creator_element is not None
            and isinstance(creator_element.text, str)
            and creator_element.text.strip()
        ):
            creator = creator_element.text.strip()

    visual_item_uri = first_linked_id(object_record, "shows", f"object {object_number}")
    visual_item = fetch_json(
        rijks_data_uri(visual_item_uri) + "?_profile=la-framed",
        artwork.provider,
    )
    digital_object_uri = first_linked_id(
        visual_item,
        "digitally_shown_by",
        f"visual item for {object_number}",
    )
    digital_object_data_uri = rijks_data_uri(digital_object_uri)
    digital_object = fetch_json(
        digital_object_data_uri + "?_profile=la-framed",
        artwork.provider,
    )
    access_point = first_linked_id(
        digital_object,
        "access_point",
        f"digital object for {object_number}",
    )
    parsed_access = urllib.parse.urlparse(access_point)
    if parsed_access.scheme != "https" or parsed_access.netloc != "iiif.micr.io":
        raise RuntimeError(
            f"Rijksmuseum object {object_number} returned an unexpected IIIF access point: "
            f"{access_point}"
        )
    path_parts = [part for part in parsed_access.path.split("/") if part]
    if not path_parts:
        raise RuntimeError(f"Rijksmuseum object {object_number} returned no IIIF identifier")
    iiif_identifier = path_parts[0]
    iiif_base = f"https://iiif.micr.io/{iiif_identifier}"

    info = fetch_json(f"{iiif_base}/info.json", artwork.provider)
    source_width = info.get("width")
    source_height = info.get("height")
    if (
        not isinstance(source_width, int)
        or source_width <= 0
        or not isinstance(source_height, int)
        or source_height <= 0
    ):
        raise RuntimeError(f"Rijksmuseum object {object_number} returned invalid IIIF dimensions")
    size = "2048," if source_width >= source_height else ",2048"
    source_image_url = f"{iiif_base}/full/{size}/0/default.jpg"

    return SourceRecord(
        provider=artwork.provider,
        title=title,
        creator=creator,
        date=date,
        medium=medium,
        dimensions=dimensions,
        institution="Rijksmuseum",
        accession_number=object_number,
        record_url=persistent_uri,
        api_record_url=object_data_uri,
        source_image_url=source_image_url,
        rights_policy="Rijksmuseum Public Domain / CC0 open data",
        rights_policy_url=RIJKS_DATA_POLICY,
        rights_verification=(
            f"Rijksmuseum EDM metadata returned open rights URI {rights_uri} "
            f"for object {object_number}."
        ),
    )


def nga_csv_rows(table_name: str) -> tuple[dict[str, str], ...]:
    cached = _NGA_CSV_CACHE.get(table_name)
    if cached is not None:
        return cached

    url = f"{NGA_OPEN_DATA_RAW}/{table_name}.csv"
    payload, _ = fetch_bytes(url, "nga")
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise RuntimeError(f"NGA open-data table {table_name} is not UTF-8") from exc

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise RuntimeError(f"NGA open-data table {table_name} has no header")

    rows = tuple(
        {
            key.strip().lower(): (value or "").strip()
            for key, value in row.items()
            if key is not None
        }
        for row in reader
    )
    _NGA_CSV_CACHE[table_name] = rows
    return rows


def nga_required_int(value: str | None, label: str) -> int:
    try:
        parsed = int(value or "")
    except ValueError as exc:
        raise RuntimeError(f"NGA {label} is not an integer: {value!r}") from exc
    if parsed <= 0:
        raise RuntimeError(f"NGA {label} must be positive: {parsed}")
    return parsed


def nga_sort_int(value: str | None) -> int:
    try:
        return int(value or "")
    except ValueError:
        return sys.maxsize


def nga_record_url(object_id: int, title: str | None) -> str:
    normalized = unicodedata.normalize("NFKD", title or "")
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title).strip("-")
    return f"https://www.nga.gov/artworks/{object_id}" + (f"-{slug}" if slug else "")


def resolve_nga_source(artwork: Artwork) -> SourceRecord:
    if not isinstance(artwork.source_id, int):
        raise RuntimeError(
            f"National Gallery of Art source identifier must be an integer: {artwork.source_id!r}"
        )
    object_id = artwork.source_id
    object_key = str(object_id)

    object_rows = [
        row for row in nga_csv_rows("objects")
        if row.get("objectid") == object_key
    ]
    if len(object_rows) != 1:
        raise RuntimeError(
            f"NGA object {object_id} expected exactly one objects-table row; found {len(object_rows)}"
        )
    object_row = object_rows[0]

    image_rows = [
        row
        for row in nga_csv_rows("published_images")
        if row.get("depictstmsobjectid") == object_key
        and row.get("viewtype", "").lower() == "primary"
        and row.get("openaccess") == "1"
        and row.get("iiifurl")
    ]
    if not image_rows:
        raise RuntimeError(
            f"NGA object {object_id} has no primary published image with openaccess=1"
        )
    image_rows.sort(
        key=lambda row: (
            nga_sort_int(row.get("sequence")),
            row.get("uuid", ""),
        )
    )
    image_row = image_rows[0]

    iiif_base = image_row["iiifurl"].rstrip("/")
    parsed_iiif = urllib.parse.urlparse(iiif_base)
    if parsed_iiif.scheme != "https" or parsed_iiif.netloc != "api.nga.gov":
        raise RuntimeError(
            f"NGA object {object_id} returned an unexpected IIIF base URL: {iiif_base}"
        )
    if not parsed_iiif.path.startswith("/iiif/"):
        raise RuntimeError(
            f"NGA object {object_id} returned an unexpected IIIF path: {parsed_iiif.path}"
        )

    source_width = nga_required_int(image_row.get("width"), f"image width for object {object_id}")
    source_height = nga_required_int(image_row.get("height"), f"image height for object {object_id}")
    source_bound = min(2048, max(source_width, source_height))
    source_image_url = f"{iiif_base}/full/!{source_bound},{source_bound}/0/default.jpg"

    constituent_rows = {
        row.get("constituentid"): row
        for row in nga_csv_rows("constituents")
        if row.get("constituentid")
    }
    artist_relationships = [
        row
        for row in nga_csv_rows("objects_constituents")
        if row.get("objectid") == object_key
        and row.get("roletype", "").lower() == "artist"
    ]
    artist_relationships.sort(
        key=lambda row: (
            nga_sort_int(row.get("displayorder")),
            row.get("constituentid", ""),
        )
    )

    creator_names: list[str] = []
    for relationship in artist_relationships:
        constituent = constituent_rows.get(relationship.get("constituentid"))
        if not constituent:
            continue
        name = constituent.get("forwarddisplayname") or constituent.get("displayname")
        if name and name not in creator_names:
            creator_names.append(name)
    creator = "; ".join(creator_names) or None

    image_uuid = image_row.get("uuid")
    if not image_uuid:
        raise RuntimeError(f"NGA object {object_id} primary image has no persistent UUID")

    return SourceRecord(
        provider=artwork.provider,
        title=object_row.get("title") or None,
        creator=creator,
        date=object_row.get("displaydate") or None,
        medium=object_row.get("medium") or None,
        dimensions=object_row.get("dimensions") or None,
        institution="National Gallery of Art",
        accession_number=object_row.get("accessionnum") or None,
        record_url=nga_record_url(object_id, object_row.get("title")),
        api_record_url=NGA_OPEN_DATA_REPO,
        source_image_url=source_image_url,
        rights_policy="National Gallery of Art Open Access",
        rights_policy_url=NGA_OPEN_ACCESS_POLICY,
        rights_verification=(
            "NGA published_images returned openaccess=1 for primary image "
            f"{image_uuid} depicting object {object_id}."
        ),
    )


def smithsonian_freetext_value(
    content: dict,
    field: str,
    preferred_labels: tuple[str, ...] = (),
) -> str | None:
    freetext = content.get("freetext")
    if not isinstance(freetext, dict):
        return None
    entries = freetext.get(field)
    if not isinstance(entries, list):
        return None

    normalized_preferences = tuple(label.lower() for label in preferred_labels)
    for preferred in normalized_preferences:
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            label = entry.get("label")
            value = entry.get("content")
            if (
                isinstance(label, str)
                and preferred in label.lower()
                and isinstance(value, str)
                and value.strip()
            ):
                return value.strip()

    for entry in entries:
        if not isinstance(entry, dict):
            continue
        value = entry.get("content")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def resolve_smithsonian_source(artwork: Artwork) -> SourceRecord:
    if not isinstance(artwork.source_id, str):
        raise RuntimeError(
            f"Smithsonian source identifier must be a Record ID: {artwork.source_id!r}"
        )
    record_id = artwork.source_id
    unit_code = record_id.split("_", 1)[0].lower()

    encoded_record_id = urllib.parse.quote(record_id, safe="")
    api_record_url = SMITHSONIAN_CONTENT_API.format(record_id=encoded_record_id)
    request_url = api_record_url + "?" + urllib.parse.urlencode(
        {"api_key": SMITHSONIAN_PUBLIC_DEMO_KEY}
    )
    response = fetch_json(request_url, artwork.provider)
    record = response.get("response")
    if not isinstance(record, dict):
        raise RuntimeError(f"Smithsonian record {record_id} returned no response object")

    expected_api_id = f"edanmdm-{record_id}"
    if record.get("id") != expected_api_id:
        raise RuntimeError(
            f"Smithsonian record mismatch for {artwork.asset_id}: "
            f"expected {expected_api_id!r}, received {record.get('id')!r}"
        )
    if record.get("type") != "edanmdm":
        raise RuntimeError(
            f"Smithsonian record {record_id} is not an edanmdm collection object"
        )

    content = record.get("content")
    if not isinstance(content, dict):
        raise RuntimeError(f"Smithsonian record {record_id} returned no content object")
    descriptive = content.get("descriptiveNonRepeating")
    if not isinstance(descriptive, dict):
        raise RuntimeError(
            f"Smithsonian record {record_id} returned no descriptiveNonRepeating object"
        )
    if descriptive.get("record_ID") != record_id:
        raise RuntimeError(
            f"Smithsonian record payload did not identify requested Record ID {record_id}"
        )

    metadata_usage = descriptive.get("metadata_usage")
    if (
        not isinstance(metadata_usage, dict)
        or metadata_usage.get("access") != "CC0"
    ):
        raise RuntimeError(
            f"Smithsonian record {record_id} metadata is not marked CC0"
        )

    online_media = descriptive.get("online_media")
    media = online_media.get("media") if isinstance(online_media, dict) else None
    if not isinstance(media, list):
        raise RuntimeError(f"Smithsonian record {record_id} exposes no online media list")

    eligible_images: list[dict] = []
    for item in media:
        if not isinstance(item, dict) or item.get("type") != "Images":
            continue
        usage = item.get("usage")
        ids_id = item.get("idsId")
        if (
            isinstance(usage, dict)
            and usage.get("access") == "CC0"
            and isinstance(ids_id, str)
            and re.fullmatch(r"[A-Za-z0-9_.-]+", ids_id)
        ):
            eligible_images.append(item)

    if not eligible_images:
        raise RuntimeError(
            f"Smithsonian record {record_id} has no image with media-level usage.access=CC0"
        )

    selected_media = eligible_images[0]
    media_id = selected_media["idsId"]
    source_image_url = (
        "https://ids.si.edu/ids/deliveryService?"
        + urllib.parse.urlencode({"id": media_id, "max": "2048"})
    )

    institution = descriptive.get("data_source")
    if not isinstance(institution, str) or not institution.strip():
        institution = SMITHSONIAN_INSTITUTIONS.get(unit_code, "Smithsonian Institution")

    record_url = descriptive.get("record_link")
    if not isinstance(record_url, str) or not record_url.startswith("https://"):
        record_url = SMITHSONIAN_OBJECT_URL.format(record_id=encoded_record_id)

    creator = smithsonian_freetext_value(
        content,
        "name",
        (
            "maker",
            "manufacturer",
            "artist",
            "inventor",
            "patentee",
            "designed by",
            "created by",
        ),
    )
    date = smithsonian_freetext_value(content, "date")
    medium = smithsonian_freetext_value(
        content,
        "physicalDescription",
        ("medium", "materials", "physical description"),
    )
    dimensions = smithsonian_freetext_value(
        content,
        "physicalDescription",
        ("dimensions", "measurements"),
    )

    return SourceRecord(
        provider=artwork.provider,
        title=record.get("title") if isinstance(record.get("title"), str) else None,
        creator=creator,
        date=date,
        medium=medium,
        dimensions=dimensions,
        institution=institution.strip(),
        accession_number=record_id,
        record_url=record_url,
        api_record_url=api_record_url,
        source_image_url=source_image_url,
        rights_policy="Smithsonian Open Access",
        rights_policy_url=SMITHSONIAN_OPEN_ACCESS_POLICY,
        rights_verification=(
            f"Smithsonian Content API returned exact record {record_id}, metadata access=CC0, "
            f"and image media {media_id} with usage.access=CC0."
        ),
    )


def resolve_source_record(artwork: Artwork) -> SourceRecord:
    if artwork.provider == "met":
        return resolve_met_source(artwork)
    if artwork.provider == "artic":
        return resolve_artic_source(artwork)
    if artwork.provider == "rijksmuseum":
        return resolve_rijksmuseum_source(artwork)
    if artwork.provider == "nga":
        return resolve_nga_source(artwork)
    if artwork.provider == "smithsonian":
        return resolve_smithsonian_source(artwork)
    raise RuntimeError(f"Unsupported source provider: {artwork.provider}")


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
    record: SourceRecord,
    staging_root: Path,
    retrieved_at: datetime,
) -> dict:
    if record.provider == "artic":
        time.sleep(1)
    source_bytes, mime_type = fetch_bytes(record.source_image_url, record.provider)
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
            "title": record.title,
            "creator": record.creator,
            "date": record.date,
            "medium": record.medium,
            "dimensions": record.dimensions,
        },
        "source": {
            "institution": record.institution,
            "objectId": artwork.source_id,
            "accessionNumber": record.accession_number,
            "recordUrl": record.record_url,
            "apiRecordUrl": record.api_record_url,
            "sourceImageUrl": record.source_image_url,
            "retrievedAt": retrieved_at.isoformat(),
            "mimeType": mime_type,
            "byteSize": len(source_bytes),
            "sha256": source_sha256,
            "width": source_width,
            "height": source_height,
        },
        "rights": {
            "isPublicDomain": True,
            "policy": record.rights_policy,
            "policyUrl": record.rights_policy_url,
            "verification": record.rights_verification,
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


def provider_label(artwork: Artwork) -> str:
    return {
        "met": "Met",
        "artic": "ARTIC",
        "rijksmuseum": "Rijksmuseum",
        "nga": "NGA",
        "smithsonian": "Smithsonian",
    }[artwork.provider]


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
    records: dict[str, SourceRecord] = {}
    for artwork in selected:
        record = resolve_source_record(artwork)
        records[artwork.asset_id] = record
        print(
            f"  OK {artwork.asset_id}: {record.creator or 'Unknown creator'} — {record.title} "
            f"({provider_label(artwork)} {artwork.source_id})"
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
