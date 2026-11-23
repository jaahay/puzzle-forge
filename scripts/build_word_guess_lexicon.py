#!/usr/bin/env python3
"""Rebuild or verify pinned ESDB/SCOWL Word Guess assets with no dependencies."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILE = ROOT / "assets/lexicon/sources.json"
ANSWERS_FILE = ROOT / "assets/lexicon/word-guess-answers.json"
PROVENANCE_FILE = ROOT / "assets/lexicon/provenance.json"
LENGTHS = range(4, 13)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validated_inputs():
    manifest = read_json(SOURCE_FILE)
    source = manifest["source"]
    if not re.fullmatch(r"https://raw\.githubusercontent\.com/en-wl/wordlist-diff/[0-9a-f]{40}/en_US\.txt", source["url"]):
        raise ValueError("The upstream source must be an immutable official GitHub commit.")
    if not re.fullmatch(r"[0-9a-f]{40}", source["blobSha1"]) or not re.fullmatch(r"[0-9a-f]{64}", source["sha256"]):
        raise ValueError("Pinned source hashes are missing.")
    answers = read_json(ANSWERS_FILE)
    if set(answers) != {str(n) for n in LENGTHS}:
        raise ValueError("Curated answer lengths are incomplete.")
    extensions = manifest["editorialSpellings"]
    if not isinstance(extensions, list) or len(extensions) != len(set(extensions)):
        raise ValueError("Invalid editorial spelling exceptions.")
    all_answers = []
    for length in LENGTHS:
        words = answers[str(length)]
        if not isinstance(words, list) or len(words) != len(set(words)):
            raise ValueError(f"Duplicate curated answers for {length}.")
        if not words or any(not isinstance(w, str) or re.fullmatch(r"[A-Z]+", w) is None or len(w) != length for w in words):
            raise ValueError(f"Malformed curated answers for {length}.")
        all_answers.extend(words)
    if any(word not in all_answers for word in extensions):
        raise ValueError("Editorial spelling exception is not an answer.")
    return manifest, answers


def build():
    manifest, answers = validated_inputs()
    source = manifest["source"]
    request = Request(source["url"], headers={"User-Agent": "puzzle-forge-lexicon-builder/1"})
    with urlopen(request, timeout=45) as response:
        raw = response.read()
    if sha256(raw) != source["sha256"]:
        raise ValueError("Upstream SHA-256 mismatch.")
    git_blob = b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    if hashlib.sha1(git_blob).hexdigest() != source["blobSha1"]:
        raise ValueError("Upstream Git blob SHA-1 mismatch.")
    words = [set() for _ in LENGTHS]
    for original in raw.decode("utf-8").splitlines():
        if re.fullmatch(r"[a-z]+", original) and 4 <= len(original) <= 12:
            words[len(original) - 4].add(original.upper())
    extensions = set(manifest["editorialSpellings"])
    for length in LENGTHS:
        for word in answers[str(length)]:
            if word not in words[length - 4] and word not in extensions:
                raise ValueError(f"Unapproved spelling exception: {word}")
            words[length - 4].add(word)
    provenance = {
        "source": {"id": source["id"], "release": source["release"], "sha256": source["sha256"]},
        "curatedAnswersSha256": sha256(ANSWERS_FILE.read_bytes()),
        "files": {},
    }
    for length in LENGTHS:
        path = f"public/lexicon/word-guess/{length}.txt"
        data = ("\n".join(sorted(words[length - 4])) + "\n").encode("utf-8")
        target = ROOT / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        provenance["files"][str(length)] = {
            "path": path, "words": len(words[length - 4]),
            "bytes": len(data), "sha256": sha256(data),
        }
    PROVENANCE_FILE.write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    print("Generated nine Word Guess lexicon assets from pinned ESDB source.")
    verify()


def verify():
    manifest, answers = validated_inputs()
    provenance = read_json(PROVENANCE_FILE)
    expected = manifest["source"]
    if provenance["source"] != {"id": expected["id"], "release": expected["release"], "sha256": expected["sha256"]}:
        raise ValueError("Provenance source does not match the manifest.")
    if provenance["curatedAnswersSha256"] != sha256(ANSWERS_FILE.read_bytes()):
        raise ValueError("Curated answer list changed without regeneration.")
    if set(provenance["files"]) != {str(n) for n in LENGTHS}:
        raise ValueError("Derived asset inventory is incomplete.")
    for length in LENGTHS:
        item = provenance["files"][str(length)]
        path = f"public/lexicon/word-guess/{length}.txt"
        if item["path"] != path:
            raise ValueError(f"Unexpected asset path: {path}")
        data = (ROOT / path).read_bytes()
        if item["bytes"] != len(data) or item["sha256"] != sha256(data):
            raise ValueError(f"Derived asset digest mismatch: {path}")
        decoded = data.decode("utf-8").splitlines()
        if not decoded or len(decoded) != item["words"] or decoded != sorted(set(decoded)):
            raise ValueError(f"Derived asset ordering or size invalid: {path}")
        if any(re.fullmatch(r"[A-Z]+", w) is None or len(w) != length for w in decoded):
            raise ValueError(f"Malformed words in {path}")
        if not set(answers[str(length)]).issubset(decoded):
            raise ValueError(f"Missing eligible answers in {path}")
    print("Verified nine Word Guess assets offline.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--regenerate", action="store_true", help="Fetch pinned source and replace generated assets.")
    group.add_argument("--verify", action="store_true", help="Verify committed assets without network access.")
    args = parser.parse_args()
    if args.regenerate:
        build()
    else:
        verify()
