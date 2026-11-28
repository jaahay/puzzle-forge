#!/usr/bin/env python3
"""Compile authored clues; optionally inspect and verify the pinned WordNet archive."""
import argparse
import gzip
import hashlib
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets/lexicon"
EDITORIAL = ASSETS / "crossword"
OUTPUT = ROOT / "public/lexicon/crossword/mini-clues.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf8"))


def candidate_grid_form(expression):
    """Return a potential A-Z grid form without losing the natural expression."""
    if not re.fullmatch(r"[A-Za-z '\u2019-]+", expression):
        return None
    answer = re.sub(r"[ '\u2019-]", "", expression).upper()
    return answer if len(answer) >= 3 else None


def wordnet_rows():
    """Read exact source sense IDs without reconstructing them from spellings."""
    rows = []
    seen = set()
    for line in (EDITORIAL / "wordnet-clues.tsv").read_text(encoding="utf8").splitlines():
        answer, sense_id, meaning, topic, clue = line.split("|")
        if not re.fullmatch(r"[A-Z]{3,}", answer) or not sense_id.startswith("oewn-") or not all((meaning, topic, clue)):
            raise ValueError(f"Invalid WordNet editorial record: {answer}")
        if sense_id in seen:
            raise ValueError(f"Duplicate source sense: {sense_id}")
        seen.add(sense_id)
        rows.append((answer, sense_id, {"meaning": meaning, "topics": [topic], "clues": [clue]}))
    if not rows:
        raise ValueError("Empty WordNet editorial batch.")
    return rows


def compile_bank(rows):
    authored = read_json(EDITORIAL / "authored.json")
    for path in sorted(EDITORIAL.glob("authored-*.json")):
        authored.extend(read_json(path))
    bank = {record["answer"]: record for record in authored}
    if len(bank) != len(authored):
        raise ValueError("Duplicate authored answer.")
    for answer, _, sense in rows:
        record = bank.setdefault(answer, {"answer": answer, "senses": []})
        record["senses"].append(sense)
    for answer, record in bank.items():
        if not re.fullmatch(r"[A-Z]{3,}", answer) or not record["senses"]:
            raise ValueError(f"Malformed answer: {answer}")
        meanings = set()
        clues = set()
        for sense in record["senses"]:
            if "expression" in sense and candidate_grid_form(sense["expression"]) != answer:
                raise ValueError(f"Natural expression does not match grid form: {answer}")
            meaning = sense["meaning"]
            topics = sense["topics"]
            texts = sense["clues"]
            if (not isinstance(meaning, str) or not meaning.strip() or meaning != meaning.strip()
                    or meaning in meanings or not topics or not texts
                    or any(not isinstance(t, str) or not t or t != t.strip() for t in topics + texts)
                    or len(set(topics)) != len(topics) or len(set(texts)) != len(texts)
                    or clues.intersection(texts)):
                raise ValueError(f"Malformed or duplicate clue/sense: {answer}")
            meanings.add(meaning)
            clues.update(texts)
    return [
        {"answer": answer, "senses": [
            {"meaning": sense["meaning"], "topics": sense["topics"], "clues": sense["clues"]}
            for sense in bank[answer]["senses"]
        ]}
        for answer in sorted(bank)
    ]


def inspect_archive(archive, manifest, rows, candidates):
    data = archive.read_bytes()
    source = manifest["wordnet"]
    if len(data) != source["bytes"] or hashlib.sha256(data).hexdigest() != source["sha256"]:
        raise ValueError("WordNet archive does not match pinned bytes.")
    # XML metadata and references come from the verified archive, never the network.
    entries = {}
    synsets = {}
    lexicons = []
    with gzip.open(archive, "rb") as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag == "LexicalEntry":
                lemma = element.find("Lemma")
                spelling = lemma.attrib["writtenForm"]
                answer = candidate_grid_form(spelling)
                for sense in element.findall("Sense"):
                    key = sense.attrib["id"]
                    if key in entries:
                        raise ValueError(f"Duplicate source sense ID: {key}")
                    entries[key] = {
                        "spelling": spelling,
                        "answer": answer,
                        "partOfSpeech": lemma.attrib["partOfSpeech"],
                        "synset": sense.attrib["synset"],
                        "relations": [dict(relation.attrib) for relation in sense.findall("SenseRelation")],
                    }
                element.clear()
            elif element.tag == "Synset":
                key = element.attrib["id"]
                if key in synsets:
                    raise ValueError(f"Duplicate source synset: {key}")
                synsets[key] = {
                    "definitions": [definition.text or "" for definition in element.findall("Definition")],
                    "examples": [example.text or "" for example in element.findall("Example")],
                    "relations": [dict(relation.attrib) for relation in element.findall("SynsetRelation")],
                }
                element.clear()
            elif element.tag == "Lexicon":
                lexicons.append(dict(element.attrib))
    if len(lexicons) != 1 or any(lexicons[0].get(k) != v for k, v in {
        "id": "oewn", "version": "2025", "language": "en",
        "license": "https://creativecommons.org/licenses/by/4.0",
    }.items()):
        raise ValueError("Unexpected WordNet lexicon metadata.")
    for answer, sense_id, _ in rows:
        record = entries.get(sense_id)
        if not record or record["answer"] != answer or record["synset"] not in synsets:
            raise ValueError(f"Unresolved or mismatched source sense: {answer} {sense_id}")

    familiarity = set()
    for band in manifest["familiarity"]["bands"]:
        path = ROOT / band["path"]
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != band["sha256"]:
            raise ValueError("Familiarity source digest mismatch.")
        familiarity.update(w.upper() for w in json.loads(raw)["words"] if isinstance(w, str))
    by_length = {}
    expressions_by_answer = {}
    for record in entries.values():
        answer = record["answer"]
        if answer is not None:
            by_length.setdefault(len(answer), []).append(record)
            expressions_by_answer.setdefault(answer, set()).add(record["spelling"])
    for length, senses in sorted(by_length.items()):
        words = {record["answer"] for record in senses}
        familiar_senses = [record for record in senses if record["spelling"].upper() in familiarity]
        guess_bank = ROOT / f"public/lexicon/word-guess/banks/{length}.json"
        accepted = set(read_json(guess_bank)["validGuesses"]) if guess_bank.is_file() else None
        summary = {
            "length": length, "spellings": len(words), "senses": len(senses),
            "familiarSpellings": len({record["answer"] for record in familiar_senses}),
            "familiarSenses": len(familiar_senses),
            "broadSpellingOverlap": len(words & accepted) if accepted is not None else None,
        }
        print(json.dumps(summary))
    print(json.dumps({
        "sourceSenses": len(entries),
        "candidateGridForms": len(expressions_by_answer),
        "gridFormsWithMultipleExpressions": sum(len(forms) > 1 for forms in expressions_by_answer.values()),
        "sensesWithoutGridForm": sum(record["answer"] is None for record in entries.values()),
    }))
    if candidates:
        # This is editorial evidence, not approved fill. Keep it outside public/.
        public = ROOT / "public"
        if candidates.resolve().is_relative_to(public.resolve()):
            raise ValueError("Do not publish raw WordNet evidence in public/.")
        with candidates.open("w", encoding="utf8", newline="\n") as stream:
            for sense_id, record in sorted(entries.items()):
                synset = synsets[record["synset"]]
                stream.write(json.dumps({
                    "senseId": sense_id, **record,
                    "familiar": record["spelling"].upper() in familiarity,
                    "definitions": synset["definitions"], "examples": synset["examples"],
                    "synsetRelations": synset["relations"],
                }, ensure_ascii=False) + "\n")
    print(f"Verified {len(rows)} source sense references against the pinned archive.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, help="Exact pinned OEWN XML gzip archive")
    parser.add_argument("--candidates", type=Path, help="Optional offline editorial evidence JSONL output")
    parser.add_argument("--verify", action="store_true", help="Check committed runtime asset without rewriting")
    args = parser.parse_args()
    if args.candidates and not args.archive:
        parser.error("--candidates requires --archive")
    manifest = read_json(ASSETS / "sources.json")
    rows = wordnet_rows()
    if args.archive:
        inspect_archive(args.archive, manifest, rows, args.candidates)
    corpus = compile_bank(rows)
    bank = [record for record in corpus if 3 <= len(record["answer"]) <= 5]
    print(f"{len(corpus)} distinct editorial grid forms across all lengths.")
    encoded = (json.dumps(bank, ensure_ascii=False, indent=2) + "\n").encode("utf8")
    if args.verify:
        if OUTPUT.read_bytes() != encoded:
            raise ValueError("Compiled Crossword asset differs; regenerate it.")
    else:
        OUTPUT.write_bytes(encoded)
    print(f"{len(bank)} answers, {sum(len(r['senses']) for r in bank)} senses, "
          f"{sum(len(s['clues']) for r in bank for s in r['senses'])} clues.")


if __name__ == "__main__":
    main()
