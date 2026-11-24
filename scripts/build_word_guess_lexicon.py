#!/usr/bin/env python3
"""Regenerate or verify reproducible Word Guess vocabularies and answer pools."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE_FILE = ROOT / "assets/lexicon/sources.json"
EDITORIAL_FILE = ROOT / "assets/lexicon/word-guess-curated.json"
ANSWERS_FILE = ROOT / "assets/lexicon/word-guess-answers.json"
PROVENANCE_FILE = ROOT / "assets/lexicon/provenance.json"
LENGTHS = range(4, 13)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf8"))


def encode(value) -> bytes:
    return (json.dumps(value, indent=2) + "\n").encode("utf8")


def sources():
    manifest = read_json(SOURCE_FILE)
    source = manifest["source"]
    if not re.fullmatch(r"https://raw\.githubusercontent\.com/en-wl/wordlist-diff/[0-9a-f]{40}/en_US\.txt", source["url"]):
        raise ValueError("Spelling source must be pinned to an immutable commit.")
    if not re.fullmatch(r"[0-9a-f]{40}", source["blobSha1"]) or not re.fullmatch(r"[0-9a-f]{64}", source["sha256"]):
        raise ValueError("Source digests missing.")
    editorial = read_json(EDITORIAL_FILE)
    if set(editorial) != {str(n) for n in LENGTHS}:
        raise ValueError("Incomplete editorial answer inventory.")
    for n in LENGTHS:
        words = editorial[str(n)]
        if not words or len(words) != len(set(words)) or any(not isinstance(w, str) or not re.fullmatch(r"[A-Z]+", w) or len(w) != n for w in words):
            raise ValueError(f"Invalid curated answers at length {n}.")
    exceptions = manifest["editorialSpellings"]
    if not isinstance(exceptions, list) or len(exceptions) != len(set(exceptions)):
        raise ValueError("Invalid spelling exceptions.")
    if any(not isinstance(w, str) or not re.fullmatch(r"[A-Z]{4,12}", w) for w in exceptions):
        raise ValueError("Malformed spelling exception.")
    fam = manifest["familiarity"]
    if fam["release"] != "words-v6" or not re.fullmatch(r"[0-9a-f]{40}", fam["commit"]):
        raise ValueError("Unpinned familiarity version.")
    if [b["tier"] for b in fam["bands"]] != ["everyday", "common"]:
        raise ValueError("Unexpected familiarity tiers.")
    tiers = []
    for band in fam["bands"]:
        path = ROOT / band["path"]
        if path.resolve().parent != (ROOT / "assets/lexicon/familiarity").resolve():
            raise ValueError("Familiarity source outside allowed directory.")
        data = path.read_bytes()
        if digest(data) != band["sha256"]:
            raise ValueError("Familiarity source digest mismatch.")
        blob = b"blob " + str(len(data)).encode("ascii") + b"\0" + data
        if hashlib.sha1(blob).hexdigest() != band["gitBlobSha1"]:
            raise ValueError("Familiarity Git blob digest mismatch.")
        parsed = json.loads(data)
        if parsed.get("version") != fam["release"] or not isinstance(parsed.get("words"), list) or not isinstance(parsed.get("flags"), dict):
            raise ValueError("Malformed familiarity data.")
        tiers.append(parsed)
    return manifest, editorial, tiers


def eligible_answers(editorial, tiers, dictionaries):
    flagged = {w.upper() for tier in tiers for w in tier["flags"]}
    answers = {}
    for n in LENGTHS:
        accepted = dictionaries[n]
        selected = set(editorial[str(n)])
        for tier in tiers:
            for word in tier["words"]:
                if (isinstance(word, str) and len(word) == n and re.fullmatch(r"[a-z]+", word)
                        and word.upper() not in flagged and word.upper() in accepted):
                    selected.add(word.upper())
        if not selected.issubset(accepted):
            raise ValueError(f"Answer absent from accepted words at length {n}.")
        answers[str(n)] = sorted(selected)
    return answers


def manifest_for(manifest, answers, dictionary_data):
    src = manifest["source"]
    return {
        "source": {"id": src["id"], "release": src["release"], "sha256": src["sha256"]},
        "answerPoolSha256": digest(encode(answers)),
        "editorialAnswersSha256": digest(EDITORIAL_FILE.read_bytes()),
        "familiaritySources": [{"tier": b["tier"], "sha256": b["sha256"]} for b in manifest["familiarity"]["bands"]],
        "answerFiles": {
            str(n): {
                "path": f"public/lexicon/word-guess/answers/{n}.txt",
                "words": len(answers[str(n)]),
                "bytes": len(("\n".join(answers[str(n)]) + "\n").encode("utf8")),
                "sha256": digest(("\n".join(answers[str(n)]) + "\n").encode("utf8")),
            } for n in LENGTHS
        },
        "files": {
            str(n): {
                "path": f"public/lexicon/word-guess/{n}.txt",
                "words": len(dictionary_data[n].decode("utf8").splitlines()),
                "bytes": len(dictionary_data[n]),
                "sha256": digest(dictionary_data[n]),
            } for n in LENGTHS
        },
    }


def verify():
    manifest, editorial, tiers = sources()
    dictionary_data = {}
    dictionaries = {}
    for n in LENGTHS:
        raw = (ROOT / f"public/lexicon/word-guess/{n}.txt").read_bytes()
        words = raw.decode("utf8").splitlines()
        if not words or words != sorted(set(words)) or any(not re.fullmatch(r"[A-Z]+", w) or len(w) != n for w in words):
            raise ValueError(f"Malformed compiled words at length {n}.")
        dictionary_data[n] = raw
        dictionaries[n] = set(words)
    if not set(manifest["editorialSpellings"]).issubset(set().union(*dictionaries.values())):
        raise ValueError("An editorial spelling exception is missing.")
    answers = eligible_answers(editorial, tiers, dictionaries)
    if ANSWERS_FILE.read_bytes() != encode(answers):
        raise ValueError("Answer pool does not match pinned familiarity sources.")
    for n in LENGTHS:
        compiled = ("\n".join(answers[str(n)]) + "\n").encode("utf8")
        if (ROOT / f"public/lexicon/word-guess/answers/{n}.txt").read_bytes() != compiled:
            raise ValueError(f"Compiled answer list mismatch at length {n}.")
    if read_json(PROVENANCE_FILE) != manifest_for(manifest, answers, dictionary_data):
        raise ValueError("Derived asset provenance or hashes do not match.")
    print("Verified nine Word Guess dictionaries and the derived familiar answer pool.")


def regenerate():
    manifest, editorial, tiers = sources()
    request = Request(manifest["source"]["url"], headers={"User-Agent": "puzzle-forge-lexicon-builder/1"})
    with urlopen(request, timeout=45) as response:
        raw = response.read()
    source = manifest["source"]
    if digest(raw) != source["sha256"]:
        raise ValueError("Spelling source SHA-256 mismatch.")
    blob = b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    if hashlib.sha1(blob).hexdigest() != source["blobSha1"]:
        raise ValueError("Spelling source Git blob mismatch.")
    dictionaries = {n: set() for n in LENGTHS}
    for word in raw.decode("utf8").splitlines():
        if re.fullmatch(r"[a-z]+", word) and 4 <= len(word) <= 12:
            dictionaries[len(word)].add(word.upper())
    for word in manifest["editorialSpellings"]:
        dictionaries[len(word)].add(word)
    answers = eligible_answers(editorial, tiers, dictionaries)
    compiled = {n: ("\n".join(sorted(dictionaries[n])) + "\n").encode("utf8") for n in LENGTHS}
    outputs = {ROOT / f"public/lexicon/word-guess/{n}.txt": compiled[n] for n in LENGTHS}
    outputs.update({ROOT / f"public/lexicon/word-guess/answers/{n}.txt": ("\n".join(answers[str(n)]) + "\n").encode("utf8") for n in LENGTHS})
    outputs[ANSWERS_FILE] = encode(answers)
    outputs[PROVENANCE_FILE] = encode(manifest_for(manifest, answers, compiled))
    for path, content in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
    verify()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    choices = parser.add_mutually_exclusive_group(required=True)
    choices.add_argument("--regenerate", action="store_true")
    choices.add_argument("--verify", action="store_true")
    arguments = parser.parse_args()
    regenerate() if arguments.regenerate else verify()
